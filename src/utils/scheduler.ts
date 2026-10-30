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

  // 2. Determine Subgroups for each DDD (60% Group 1, 40% Group 2)
  const techGroups: Record<string, number> = {}; // techId -> 1 or 2
  for (const dddStr of Object.keys(dddGroups)) {
    const techs = dddGroups[Number(dddStr)];
    const group1Count = Math.max(1, Math.round(techs.length * 0.6));
    
    for (let i = 0; i < techs.length; i++) {
      techGroups[techs[i].id] = i < group1Count ? 1 : 2;
    }
  }

  if (is5x2) {
    // ==========================================
    // REGIME 5x2 LOGIC: 5 Dias Trabalhados / 2 Folgas Semanais
    // ==========================================
    for (const tech of activeTechs) {
      const techSched = result[tech.id];
      const group = techGroups[tech.id];

      for (let wkIdx = 0; wkIdx < weekends.length; wkIdx++) {
        const wk = weekends[wkIdx];
        // Rotate every 2 weeks so all technicians alternate weekend coverage
        const isGroup1FullWeekend = (Math.floor(wkIdx / 2) % 2 === 0) ? (group === 1) : (group === 2);

        if (isGroup1FullWeekend) {
          // Both Saturday and Sunday OFF (FD: Fim de semana duplado completo)
          techSched.days[wk.saturday] = { date: wk.saturday, shift: 'FD', notes: 'Folga Dupla (5x2 Fim de Semana)' };
          techSched.days[wk.sunday] = { date: wk.sunday, shift: 'FD', notes: 'Folga Dupla (5x2 Fim de Semana)' };
        } else {
          // Off Sunday + Monday, or Friday + Saturday (2 consecutive off days to balance DDD)
          const satDateObj = parseDateKey(wk.saturday);
          
          if (group === 1) {
            // Sábado + Sexta (Folga Sáb + Sex)
            techSched.days[wk.saturday] = { date: wk.saturday, shift: 'FG', notes: 'Folga Fim de Semana (5x2)' };
            techSched.days[wk.sunday] = { date: wk.sunday, shift: 'TB' };
            // Find Friday before Saturday
            const friDate = new Date(satDateObj);
            friDate.setDate(satDateObj.getDate() - 1);
            const friKey = friDate.toISOString().slice(0, 10);
            if (techSched.days[friKey]) {
              techSched.days[friKey] = { date: friKey, shift: 'FC', notes: 'Folga Compensada (5x2 Sexta)' };
            }
          } else {
            // Domingo + Segunda (Folga Dom + Seg)
            techSched.days[wk.saturday] = { date: wk.saturday, shift: 'TB' };
            techSched.days[wk.sunday] = { date: wk.sunday, shift: 'FG', notes: 'Folga Fim de Semana (5x2)' };
            // Find Monday after Sunday
            const sunDateObj = parseDateKey(wk.sunday);
            const monDate = new Date(sunDateObj);
            monDate.setDate(sunDateObj.getDate() + 1);
            const monKey = monDate.toISOString().slice(0, 10);
            if (techSched.days[monKey]) {
              techSched.days[monKey] = { date: monKey, shift: 'FC', notes: 'Folga Compensada (5x2 Segunda)' };
            }
          }
        }
      }
    }

    // Ensure 5x2 never exceeds 5 consecutive work days
    for (const tech of activeTechs) {
      const techSched = result[tech.id];
      let consecutiveWork = 0;
      for (let i = 0; i < dates.length; i++) {
        const d = dates[i];
        const isOff = techSched.days[d].shift !== 'TB';
        if (isOff) {
          consecutiveWork = 0;
        } else {
          consecutiveWork++;
          if (consecutiveWork >= 6) {
            // Invert to FC
            techSched.days[d] = { date: d, shift: 'FC', notes: 'Folga Regulamentar (Limite 5x2)' };
            consecutiveWork = 0;
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

