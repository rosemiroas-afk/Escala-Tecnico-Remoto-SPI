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
export function generateSchedule(
  technicians: Technician[],
  dates: string[],
  offRequests: OffRequest[] = [],
  options: GeneratorOptions
): Record<string, TechnicianSchedule> {
  const activeTechs = technicians.filter(t => t.active);
  const result: Record<string, TechnicianSchedule> = {};
  const weekends = extractWeekends(dates);

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

  // 3. Assign Baseline Weekend Offs based on 3-week rotation
  for (const tech of activeTechs) {
    const techSched = result[tech.id];
    const group = techGroups[tech.id];

    for (let wkIdx = 0; wkIdx < weekends.length; wkIdx++) {
      const wk = weekends[wkIdx];
      // Rotation logic: group 1 and 2 are usually opposite
      // Every 3 weeks, swap patterns.
      // wkIdx 0,1,2 -> Pattern 1, Pattern 2
      // wkIdx 3,4,5 -> Pattern 2, Pattern 1
      // wkIdx 6,7,8 -> Pattern 1, Pattern 2
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
  const fdWeekends: Record<string, number> = {}; // techId -> wkIdx
  if (options.ensureDoubleWeekend) {
    let globalWkOffset = 0;
    for (const tech of activeTechs) {
      const techSched = result[tech.id];
      // Distribute FD across the 2 months
      const targetWkIdx = globalWkOffset % weekends.length;
      globalWkOffset++;
      fdWeekends[tech.id] = targetWkIdx;

      const wk = weekends[targetWkIdx];
      if (wk) {
        techSched.days[wk.saturday] = { date: wk.saturday, shift: 'FD', notes: 'Fim de Semana Duplado' };
        techSched.days[wk.sunday] = { date: wk.sunday, shift: 'FD', notes: 'Fim de Semana Duplado' };
      }
    }
  }

  // 5. Detection and Prevention of 7 Consecutive Days (FC)
  // We check for sequences of 7 TB and insert FC in Mon-Thu
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
        // Find a day between Monday and Thursday in the *current* or *previous* week of this sequence to place FC
        // Ideally, we look back from current day 'i' to find a weekday to convert to FC
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
            consecutiveWork = i - j; // Reset counter partially
            break;
          }
        }
        
        // If we couldn't find a weekday in the last 7 days (unlikely), force the next available weekday
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

  // 6. Process APPROVED Off Requests
  if (options.prioritizeOffRequests && offRequests.length > 0) {
    for (const req of offRequests) {
      if (req.status !== 'atendido') continue;

      const techSched = result[req.technicianId];
      if (!techSched || !techSched.days[req.date]) continue;

      const reqDate = req.date;
      const dObj = parseDateKey(reqDate);
      const dow = dObj.getDay();

      // Convert the requested day to off
      // If it's a weekday, we use FC (compensatory)
      // If it's a weekend, we use FG (regular)
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
