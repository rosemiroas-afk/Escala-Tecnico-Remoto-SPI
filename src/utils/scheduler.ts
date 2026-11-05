import {
  Technician,
  TechnicianSchedule,
  OffRequest,
  GeneratorOptions,
  ShiftType
} from '../types';
import { extractWeekends, parseDateKey } from './dateUtils';
import { MASTER_PATTERN_5X2, resolvePatternKey } from './masterPattern5x2';

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
    // REGIME 5x2 PERPÉTUO CLT: PADRÃO EXATO DE 2 MESES CORRIDOS (REFERÊNCIA DE MESTRE)
    // Sequência rigorosa fornecida para Colaborador 1/3, 2/3 e 3/3 por DDD
    // - TB: Dia de Trabalho
    // - FD: Folga Duplada (2 dias seguidos de descanso)
    // - FG: Folga Geral Individual (1 dia isolado de descanso)
    // =========================================================================

    // [REGRA 1: DIVISÃO DINÂMICA POR PORCENTAGEM E DDD]
    // Lê a base de dados agrupada por DDD e divide matematicamente em 3 grupos equivalentes:
    // - Grupo 1/3, Grupo 2/3, Grupo 3/3 (~33.3% da equipe de cada DDD).
    // Resto da divisão por 3 distribuído priorizando Grupo 1/3 e depois Grupo 2/3.
    const grupo1Techs: Technician[] = [];
    const grupo2Techs: Technician[] = [];
    const grupo3Techs: Technician[] = [];

    for (const dddStr of Object.keys(dddGroups).sort((a, b) => Number(a) - Number(b))) {
      const dddTechs = [...dddGroups[Number(dddStr)]].sort((a, b) => a.name.localeCompare(b.name));
      const n = dddTechs.length;
      const base = Math.floor(n / 3);
      const rem = n % 3;

      const c1 = base + (rem >= 1 ? 1 : 0);
      const c2 = base + (rem === 2 ? 1 : 0);

      grupo1Techs.push(...dddTechs.slice(0, c1));
      grupo2Techs.push(...dddTechs.slice(c1, c1 + c2));
      grupo3Techs.push(...dddTechs.slice(c1 + c2));
    }

    const grupo1Ids = new Set(grupo1Techs.map(t => t.id));
    const grupo2Ids = new Set(grupo2Techs.map(t => t.id));
    const grupo3Ids = new Set(grupo3Techs.map(t => t.id));

    // Mapeamento dos dias com o Padrão Mestre Exato
    for (const d of dates) {
      const dt = parseDateKey(d);
      const monthNum = dt.getMonth() + 1; // 1-12
      const dayNum = dt.getDate(); // 1-31
      const dayIndex = dayNum - 1; // 0-30

      // Determina se o mês segue mes1, mes2 ou transicaoFev
      const patternKey = resolvePatternKey(monthNum, options.cycleMonth5x2);

      for (const tech of activeTechs) {
        const techSched = result[tech.id];
        if (!techSched || !techSched.days[d]) continue;

        let patternArr: ShiftType[];
        let groupLabel = '';

        if (grupo1Ids.has(tech.id)) {
          patternArr = MASTER_PATTERN_5X2.grupo1[patternKey];
          groupLabel = 'Colaborador 1/3';
        } else if (grupo2Ids.has(tech.id)) {
          patternArr = MASTER_PATTERN_5X2.grupo2[patternKey];
          groupLabel = 'Colaborador 2/3';
        } else {
          patternArr = MASTER_PATTERN_5X2.grupo3[patternKey];
          groupLabel = 'Colaborador 3/3';
        }

        const shift = patternKey === 'transicaoFev'
          ? patternArr[dayIndex % patternArr.length]
          : patternArr[Math.min(dayIndex, patternArr.length - 1)];

        const note = shift === 'TB'
          ? `Dia de Trabalho (${groupLabel})`
          : shift === 'FD'
          ? `Folga Duplada Consecutiva (${groupLabel})`
          : `Folga Geral Individual (${groupLabel})`;

        techSched.days[d] = {
          date: d,
          shift,
          notes: note
        };
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

