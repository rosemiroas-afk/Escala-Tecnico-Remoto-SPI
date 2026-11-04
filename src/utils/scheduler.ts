import {
  Technician,
  TechnicianSchedule,
  OffRequest,
  GeneratorOptions,
  ShiftType
} from '../types';
import { extractWeekends, parseDateKey } from './dateUtils';

/**
 * Generate 6x1 schedule strictly matching the user's requirements:
 * 1. 60% Saturday / 40% Sunday off split per DDD region.
 * 2. 3-week rotation (3 weeks Pattern A, 3 weeks Pattern B).
 *    Pattern A: Work Sunday to Friday, Off Saturday.
 *    Pattern B: Work Monday to Saturday, Off Sunday.
 * 3. Guaranteed Double Weekend (FD: Sábado + Domingo) once per technician.
 * 4. Prevention of 7 consecutive work days with FC (Folga Compensada) between Mon-Thu.
 */
/**
 * Generate schedule supporting 6x1 or 5x2 regimes:
 * - 6x1: 6 days worked, 1 regular off day per week, guaranteed FD (Sat+Sun), max 6 consecutive work days.
 * - 5x2: 5 days worked, 2 off days per week (consecutive or distributed weekend pairs), max 5 consecutive work days.
 */
export function generateSchedule(
  technicians: Technician[],
  dates: string[],
  offRequests: OffRequest[] = [],
  options: GeneratorOptions
): Record<string, TechnicianSchedule> {
  const activeTechs = technicians.filter(t => t.active);
  const result: Record<string, TechnicianSchedule> = {};
  const weekends = extractWeekends(dates);
  const is5x2 = options.regime === '5x2';

  // 1. Initialize EVERY day as 'TB' (Dia Trabalhado).
  for (const tech of activeTechs) {
    result[tech.id] = {
      technicianId: tech.id,
      days: {}
    };
    for (const d of dates) {
      result[tech.id].days[d] = {
        date: d,
        shift: 'TB',
        manualOverride: false
      };
    }
  }

  if (weekends.length === 0) return result;

  // Group technicians by DDD
  const dddGroups: Record<number, Technician[]> = {};
  for (const tech of activeTechs) {
    if (!dddGroups[tech.ddd]) dddGroups[tech.ddd] = [];
    dddGroups[tech.ddd].push(tech);
  }

  // 2. Determine Subgroups for each DDD (Metade da equipe por DDD: 4 e 3, 2 e 1, 2 e 2)
  const techGroups: Record<string, number> = {}; // techId -> 1 or 2
  for (const dddStr of Object.keys(dddGroups)) {
    const techs = dddGroups[Number(dddStr)];
    // Metade da equipe por DDD: se tem 7 fica 4 e 3; se 3 fica 2 e 1; se 4 fica 2 e 2; se 6 fica 3 e 3
    const group1Count = Math.ceil(techs.length / 2);
    
    for (let i = 0; i < techs.length; i++) {
      techGroups[techs[i].id] = i < group1Count ? 1 : 2;
    }
  }

  if (is5x2) {
    // =========================================================================
    // REGIME 5x2 PERPÉTUO CLT: MODELAGEM EM 3 GRUPOS CÍCLICOS (4 SEMANAS)
    // 5 Dias Trabalhados (TB) e 2 Folgas Semanais (FD ou FG) de Segunda a Domingo
    // Siglas estritas:
    // - TB: Dia Trabalhado (5 dias por semana de Segunda a Domingo)
    // - FD: Folga Duplada (2 folgas consecutivas, ex: Sáb+Dom ou Seg+Ter)
    // - FG: Folga em Dias Distintos (folgas isoladas na semana, ex: Seg e Dom)
    // =========================================================================

    // 1. Divisão da equipe em 3 Grupos de Escala Proporcionais (Grupo 1, Grupo 2 e Grupo 3)
    // Se o número não for perfeitamente divisível por 3, a sobra vai preferencialmente para os Grupos 1 e 2
    let grupo1: Technician[] = [];
    let grupo2: Technician[] = [];
    let grupo3: Technician[] = [];

    if (options.balanceDDDCoverage) {
      // Distribui os técnicos de forma equilibrada por DDD entre os 3 Grupos (garantindo cobertura diária por DDD)
      let turn = 0;
      for (const dddStr of Object.keys(dddGroups).sort()) {
        const techs = dddGroups[Number(dddStr)];
        for (const t of techs) {
          if (turn % 3 === 0) {
            grupo1.push(t);
          } else if (turn % 3 === 1) {
            grupo2.push(t);
          } else {
            grupo3.push(t);
          }
          turn++;
        }
      }
    } else {
      // Divisão proporcional direta por lista ordenada
      const sortedTechs = [...activeTechs].sort((a, b) => a.name.localeCompare(b.name));
      const total = sortedTechs.length;
      const base = Math.floor(total / 3);
      const remainder = total % 3;

      const count1 = base + (remainder >= 1 ? 1 : 0);
      const count2 = base + (remainder === 2 ? 1 : 0);

      grupo1 = sortedTechs.slice(0, count1);
      grupo2 = sortedTechs.slice(count1, count1 + count2);
      grupo3 = sortedTechs.slice(count1 + count2);
    }

    const grupo1Ids = new Set(grupo1.map(t => t.id));
    const grupo2Ids = new Set(grupo2.map(t => t.id));
    const grupo3Ids = new Set(grupo3.map(t => t.id));

    // Helper to find the Monday date of the calendar week (Monday to Sunday)
    const getMondayKey = (dateStr: string): string => {
      const dt = parseDateKey(dateStr);
      const day = dt.getDay(); // 0 is Sunday, 1 is Monday, ... 6 is Saturday
      const diff = day === 0 ? 6 : day - 1;
      const monday = new Date(dt);
      monday.setDate(dt.getDate() - diff);
      const y = monday.getFullYear();
      const m = String(monday.getMonth() + 1).padStart(2, '0');
      const d = String(monday.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    // Ponto de ancoragem perpétuo (Semana A ancorada na primeira segunda de Novembro de 2026: 2026-11-02)
    const epochMonday = new Date(2026, 10, 2, 12, 0, 0);

    for (const d of dates) {
      const dt = parseDateKey(d);
      const dow = dt.getDay(); // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
      const mondayKey = getMondayKey(d);
      const mondayDate = parseDateKey(mondayKey);

      // Diferença em semanas em relação ao marco perpétuo
      const diffDays = Math.round((mondayDate.getTime() - epochMonday.getTime()) / (24 * 60 * 60 * 1000));
      const diffWeeks = Math.floor(diffDays / 7);
      // cycleIndex: 0 = Semana A, 1 = Semana B, 2 = Semana C, 3 = Semana D
      const cycleIndex = ((diffWeeks % 4) + 4) % 4;

      for (const tech of activeTechs) {
        const techSched = result[tech.id];
        if (!techSched || !techSched.days[d]) continue;

        if (grupo1Ids.has(tech.id)) {
          // [GRUPO 1]
          // Semana A (0): SEG[TB] | TER[TB] | QUA[TB] | QUI[TB] | SEX[TB] | SÁB[FD] | DOM[FD]
          // Semana B (1): SEG[TB] | TER[TB] | QUA[TB] | QUI[TB] | SEX[TB] | SÁB[FD] | DOM[FD]
          // Semana C (2): SEG[FD] | TER[FD] | QUA[TB] | QUI[TB] | SEX[TB] | SÁB[TB] | DOM[TB]
          // Semana D (3): SEG[FG] | TER[TB] | QUA[TB] | QUI[TB] | SEX[TB] | SÁB[TB] | DOM[FG]
          if (cycleIndex === 0 || cycleIndex === 1) {
            if (dow === 6 || dow === 0) {
              techSched.days[d] = { date: d, shift: 'FD', notes: 'Folga Dupla no FDS (Grupo 1)' };
            } else {
              techSched.days[d] = { date: d, shift: 'TB' };
            }
          } else if (cycleIndex === 2) {
            if (dow === 1 || dow === 2) {
              techSched.days[d] = { date: d, shift: 'FD', notes: 'Folga Dupla na semana Seg/Ter (Grupo 1)' };
            } else {
              techSched.days[d] = { date: d, shift: 'TB' };
            }
          } else {
            // cycleIndex === 3 (Semana D)
            if (dow === 1 || dow === 0) {
              techSched.days[d] = { date: d, shift: 'FG', notes: 'Folga em Dias Distintos Seg/Dom (Grupo 1)' };
            } else {
              techSched.days[d] = { date: d, shift: 'TB' };
            }
          }
        } else if (grupo2Ids.has(tech.id)) {
          // [GRUPO 2]
          // Semana A (0): SEG[FD] | TER[FD] | QUA[TB] | QUI[TB] | SEX[TB] | SÁB[TB] | DOM[TB]
          // Semana B (1): SEG[FG] | TER[TB] | QUA[TB] | QUI[TB] | SEX[TB] | SÁB[TB] | DOM[FG]
          // Semana C (2): SEG[TB] | TER[TB] | QUA[TB] | QUI[TB] | SEX[TB] | SÁB[FD] | DOM[FD]
          // Semana D (3): SEG[TB] | TER[TB] | QUA[TB] | QUI[TB] | SEX[TB] | SÁB[FD] | DOM[FD]
          if (cycleIndex === 0) {
            if (dow === 1 || dow === 2) {
              techSched.days[d] = { date: d, shift: 'FD', notes: 'Folga Dupla na semana Seg/Ter (Grupo 2)' };
            } else {
              techSched.days[d] = { date: d, shift: 'TB' };
            }
          } else if (cycleIndex === 1) {
            if (dow === 1 || dow === 0) {
              techSched.days[d] = { date: d, shift: 'FG', notes: 'Folga em Dias Distintos Seg/Dom (Grupo 2)' };
            } else {
              techSched.days[d] = { date: d, shift: 'TB' };
            }
          } else {
            // cycleIndex === 2 ou 3 (Semanas C e D)
            if (dow === 6 || dow === 0) {
              techSched.days[d] = { date: d, shift: 'FD', notes: 'Folga Dupla no FDS (Grupo 2)' };
            } else {
              techSched.days[d] = { date: d, shift: 'TB' };
            }
          }
        } else if (grupo3Ids.has(tech.id)) {
          // [GRUPO 3]
          // Semana A (0): SEG[FG] | TER[TB] | QUA[TB] | QUI[TB] | SEX[TB] | SÁB[TB] | DOM[FG] (transição após trabalhar o FDS)
          // Semana B (1): SEG[TB] | TER[TB] | QUA[TB] | QUI[TB] | SEX[TB] | SÁB[FD] | DOM[FD]
          // Semana C (2): SEG[TB] | TER[TB] | QUA[TB] | QUI[TB] | SEX[TB] | SÁB[FD] | DOM[FD]
          // Semana D (3): SEG[FD] | TER[FD] | QUA[TB] | QUI[TB] | SEX[TB] | SÁB[TB] | DOM[TB]
          if (cycleIndex === 0) {
            if (dow === 1 || dow === 0) {
              techSched.days[d] = { date: d, shift: 'FG', notes: 'Folga em Dias Distintos Seg/Dom (Grupo 3)' };
            } else {
              techSched.days[d] = { date: d, shift: 'TB' };
            }
          } else if (cycleIndex === 1 || cycleIndex === 2) {
            if (dow === 6 || dow === 0) {
              techSched.days[d] = { date: d, shift: 'FD', notes: 'Folga Dupla no FDS (Grupo 3)' };
            } else {
              techSched.days[d] = { date: d, shift: 'TB' };
            }
          } else {
            // cycleIndex === 3 (Semana D)
            if (dow === 1 || dow === 2) {
              techSched.days[d] = { date: d, shift: 'FD', notes: 'Folga Dupla na semana Seg/Ter (Grupo 3)' };
            } else {
              techSched.days[d] = { date: d, shift: 'TB' };
            }
          }
        }
      }
    }
  } else {
    // ==========================================
    // REGIME 6x1 LOGIC: 6 Dias Trabalhados / 1 Folga Semanal
    // ==========================================
    // 3. Assign Baseline Weekend Offs based on 3-week rotation
    for (const tech of activeTechs) {
      const techSched = result[tech.id];
      const group = techGroups[tech.id];

      for (let wkIdx = 0; wkIdx < weekends.length; wkIdx++) {
        const wk = weekends[wkIdx];
        const block = Math.floor(wkIdx / 3);
        const isPatternA = (block % 2 === 0) ? (group === 1) : (group === 2);

        if (isPatternA) {
          // Pattern A: Off Saturday, Work Sunday
          techSched.days[wk.saturday] = { date: wk.saturday, shift: 'FG', notes: 'Folga Regular (Sábado)' };
          techSched.days[wk.sunday] = { date: wk.sunday, shift: 'TB' };
        } else {
          // Pattern B: Work Saturday, Off Sunday
          techSched.days[wk.saturday] = { date: wk.saturday, shift: 'TB' };
          techSched.days[wk.sunday] = { date: wk.sunday, shift: 'FG', notes: 'Folga Regular (Domingo)' };
        }
      }
    }

    // 4. Assign ONE Guaranteed Double Weekend (FD) per Technician
    if (options.ensureDoubleWeekend) {
      let globalWkOffset = 0;
      for (const tech of activeTechs) {
        const techSched = result[tech.id];
        const targetWkIdx = globalWkOffset % weekends.length;
        globalWkOffset++;

        const wk = weekends[targetWkIdx];
        if (wk) {
          techSched.days[wk.saturday] = { date: wk.saturday, shift: 'FD', notes: 'Fim de Semana Duplado' };
          techSched.days[wk.sunday] = { date: wk.sunday, shift: 'FD', notes: 'Fim de Semana Duplado' };
        }
      }
    }

    // 5. Detection and Prevention of 7 Consecutive Days (FC)
    for (const tech of activeTechs) {
      const techSched = result[tech.id];
      let consecutiveWork = 0;
      
      for (let i = 0; i < dates.length; i++) {
        const d = dates[i];
        const shift = techSched.days[d].shift;
        
        if (shift === 'TB') {
          consecutiveWork++;
        } else {
          consecutiveWork = 0;
        }

        if (consecutiveWork >= 7) {
          let placedFC = false;
          for (let j = i; j >= Math.max(0, i - 6); j--) {
            const checkDate = dates[j];
            const dow = parseDateKey(checkDate).getDay();
            // dow 1=Mon, 2=Tue, 3=Wed, 4=Thu
            if (dow >= 1 && dow <= 4 && techSched.days[checkDate].shift === 'TB') {
              techSched.days[checkDate] = { 
                date: checkDate, 
                shift: 'FC', 
                notes: 'Folga Compensada (Prevenção 7 dias)' 
              };
              placedFC = true;
              consecutiveWork = i - j;
              break;
            }
          }
          
          if (!placedFC) {
            for (let j = i + 1; j < dates.length; j++) {
              const checkDate = dates[j];
              const dow = parseDateKey(checkDate).getDay();
              if (dow >= 1 && dow <= 4) {
                techSched.days[checkDate] = { 
                  date: checkDate, 
                  shift: 'FC', 
                  notes: 'Folga Compensada (Prevenção 7 dias)' 
                };
                break;
              }
            }
          }
        }
      }
    }
  }

  // 6. Process APPROVED Off Requests (both 'aprovado' and 'atendido')
  if (options.prioritizeOffRequests && offRequests.length > 0) {
    for (const req of offRequests) {
      if (req.status !== 'atendido' && req.status !== 'aprovado') continue;

      const techSched = result[req.technicianId];
      if (!techSched || !techSched.days[req.date]) continue;

      const reqDate = req.date;
      const dObj = parseDateKey(reqDate);
      const dow = dObj.getDay();

      // Convert the requested day to off:
      // If it's a weekday, FC (compensatória)
      // If weekend, FG (regular)
      const shiftType: ShiftType = (dow === 0 || dow === 6) ? 'FG' : 'FC';
      
      techSched.days[reqDate] = {
        date: reqDate,
        shift: shiftType,
        notes: req.notes.join(' | '),
        isOffRequestFulfilled: true
      };
    }
  }

  return result;
}

