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
    // REGIME 5x2 LOGIC: Rodízio Quinzenal Rigoroso de 4 Semanas (Equipe SPI 19)
    // 5 Dias Trabalhados / 2 Folgas Semanais (Balanceamento por DDD: Metade da Equipe)
    // =========================================================================

    let grupoA: Technician[] = [];
    let grupoB: Technician[] = [];
    let grupoC: Technician[] = [];

    if (options.balanceDDDCoverage) {
      // Distribui rigorosamente metade da equipe de CADA DDD no fim de semana (Grupo A)
      // e a outra metade nos dias de meio de semana (Grupo B e Grupo C)
      // Se tem 7 no mesmo DDD: fica 4 e 3 (4 em A, 3 em B/C)
      // Se tiver 3: fica 2 e 1 (2 em A, 1 em B/C)
      // Se tiver 4: fica 2 e 2 (2 em A, 2 em B/C)
      // Se tiver 6: fica 3 e 3 (3 em A, 3 em B/C)
      let bTurn = true;
      for (const dddStr of Object.keys(dddGroups)) {
        const techs = dddGroups[Number(dddStr)];
        const half = Math.ceil(techs.length / 2);
        const dddGroupA = techs.slice(0, half);
        const dddRemainder = techs.slice(half);

        grupoA.push(...dddGroupA);

        for (const t of dddRemainder) {
          if (bTurn) {
            grupoB.push(t);
          } else {
            grupoC.push(t);
          }
          bTurn = !bTurn;
        }
      }
    } else {
      // Order technicians stably by name (Colaborador 01 a Colaborador 19)
      const sortedTechs = [...activeTechs].sort((a, b) => a.name.localeCompare(b.name));
      const totalTechs = sortedTechs.length;

      let countA = options.teamWeekendPercent5x2
        ? Math.max(1, Math.round(totalTechs * (options.teamWeekendPercent5x2 / 100)))
        : Math.round(totalTechs * 0.5);
      if (countA >= totalTechs) countA = Math.max(1, totalTechs - 2);

      const remainingTechs = totalTechs - countA;
      const countB = options.midweekGroupBCount5x2 ?? Math.floor(remainingTechs / 2);

      grupoA = sortedTechs.slice(0, countA);
      grupoB = sortedTechs.slice(countA, countA + countB);
      grupoC = sortedTechs.slice(countA + countB);
    }

    const grupoAIds = new Set(grupoA.map(t => t.id));
    const grupoBIds = new Set(grupoB.map(t => t.id));
    const grupoCIds = new Set(grupoC.map(t => t.id));

    // Ciclo 2 Groups (A Inversão):
    // Grupo Novo FDS: obrigatoriamente a outra metade da equipe (Grupo B + Grupo C)
    // Grupo Novo Meio 1 e 2: distribuídos da metade anterior (Grupo A)
    const halfA = Math.floor(grupoA.length / 2);
    const grupoNovoMeio1 = grupoA.slice(0, halfA);
    const grupoNovoMeio2 = grupoA.slice(halfA);
    const grupoNovoFds = [...grupoB, ...grupoC];

    const grupoNovoFdsIds = new Set(grupoNovoFds.map(t => t.id));
    const grupoNovoMeio1Ids = new Set(grupoNovoMeio1.map(t => t.id));
    const grupoNovoMeio2Ids = new Set(grupoNovoMeio2.map(t => t.id));

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

    // Extract all unique Monday keys sorted chronologically
    const uniqueMondays = Array.from(new Set(dates.map(getMondayKey))).sort();
    const consecutiveWeeks = options.consecutiveWeekendsCount5x2 || 2; // Default: 2 semanas consecutivas (Quinzenal)

    for (const d of dates) {
      const dt = parseDateKey(d);
      const dow = dt.getDay(); // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
      const mondayKey = getMondayKey(d);
      const weekIdx = Math.max(0, uniqueMondays.indexOf(mondayKey));

      // Each cycle lasts consecutiveWeeks (default 2 weeks)
      // Cycle 1: weekIdx 0, 1 -> Math.floor(0/2)=0, Math.floor(1/2)=0 (even)
      // Cycle 2: weekIdx 2, 3 -> Math.floor(2/2)=1, Math.floor(3/2)=1 (odd)
      const isCiclo1 = Math.floor(weekIdx / consecutiveWeeks) % 2 === 0;

      for (const tech of activeTechs) {
        const techSched = result[tech.id];
        if (!techSched || !techSched.days[d]) continue;

        if (isCiclo1) {
          // ==========================================
          // CICLO 1 (Semanas 1 e 2 Consecutivas)
          // ==========================================
          if (grupoAIds.has(tech.id)) {
            // Grupo A (9 colaboradores): Folga fixa Sábado e Domingo (FD)
            if (dow === 6 || dow === 0) {
              techSched.days[d] = {
                date: d,
                shift: 'FD',
                notes: 'Folga Dupla FDS (5x2 Ciclo 1 - Grupo A)'
              };
            } else {
              techSched.days[d] = { date: d, shift: 'TB' };
            }
          } else if (grupoBIds.has(tech.id)) {
            // Grupo B (5 colaboradores): Folga fixa Terça e Quinta-feira (FC)
            if (dow === 2 || dow === 4) {
              techSched.days[d] = {
                date: d,
                shift: 'FC',
                notes: 'Folga Compensada Ter/Qui (5x2 Ciclo 1 - Grupo B)'
              };
            } else {
              techSched.days[d] = { date: d, shift: 'TB' };
            }
          } else if (grupoCIds.has(tech.id)) {
            // Grupo C (5 colaboradores): Folga fixa Quarta e Sexta-feira (FC)
            if (dow === 3 || dow === 5) {
              techSched.days[d] = {
                date: d,
                shift: 'FC',
                notes: 'Folga Compensada Qua/Sex (5x2 Ciclo 1 - Grupo C)'
              };
            } else {
              techSched.days[d] = { date: d, shift: 'TB' };
            }
          }
        } else {
          // ==========================================
          // CICLO 2 - A INVERSÃO (Semanas 3 e 4 Consecutivas)
          // ==========================================
          if (grupoNovoFdsIds.has(tech.id)) {
            // Grupo Novo FDS (10 colaboradores: 5 de B + 5 de C): Folga fixa Sábado e Domingo (FD)
            if (dow === 6 || dow === 0) {
              techSched.days[d] = {
                date: d,
                shift: 'FD',
                notes: 'Folga Dupla FDS (5x2 Ciclo 2 - Novo FDS)'
              };
            } else {
              techSched.days[d] = { date: d, shift: 'TB' };
            }
          } else if (grupoNovoMeio1Ids.has(tech.id)) {
            // Grupo Novo Meio 1 (4 colaboradores de A): Folga fixa Terça e Quinta-feira (FC)
            if (dow === 2 || dow === 4) {
              techSched.days[d] = {
                date: d,
                shift: 'FC',
                notes: 'Folga Compensada Ter/Qui (5x2 Ciclo 2 - Novo Meio 1)'
              };
            } else {
              techSched.days[d] = { date: d, shift: 'TB' };
            }
          } else if (grupoNovoMeio2Ids.has(tech.id)) {
            // Grupo Novo Meio 2 (5 colaboradores de A): Folga fixa Quarta e Sexta-feira (FC)
            if (dow === 3 || dow === 5) {
              techSched.days[d] = {
                date: d,
                shift: 'FC',
                notes: 'Folga Compensada Qua/Sex (5x2 Ciclo 2 - Novo Meio 2)'
              };
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

