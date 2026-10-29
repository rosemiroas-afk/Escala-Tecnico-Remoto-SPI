import {
  Technician,
  TechnicianSchedule,
  DaySchedule,
  OffRequest,
  GeneratorOptions
} from '../types';
import { extractWeekends, parseDateKey, isSaturday, isSunday } from './dateUtils';

/**
 * Generate a clean, balanced, legal 6x1 schedule for 2 months
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

  // Initialize schedule grid with all 'T' (Work)
  for (const tech of activeTechs) {
    result[tech.id] = {
      technicianId: tech.id,
      days: {}
    };
    for (const d of dates) {
      result[tech.id].days[d] = {
        date: d,
        shift: 'T',
        manualOverride: false
      };
    }
  }

  // Group technicians by DDD to ensure balanced regional coverage
  const dddGroups: Record<number, Technician[]> = {};
  for (const tech of activeTechs) {
    if (!dddGroups[tech.ddd]) dddGroups[tech.ddd] = [];
    dddGroups[tech.ddd].push(tech);
  }

  // 1. PIN CONFIRMED OFF REQUESTS (Highest user priority)
  if (options.prioritizeOffRequests && offRequests.length > 0) {
    for (const req of offRequests) {
      const techSched = result[req.technicianId];
      if (techSched && techSched.days[req.date]) {
        techSched.days[req.date] = {
          date: req.date,
          shift: 'F',
          notes: req.notes.join(' | '),
          isOffRequestFulfilled: true
        };
      }
    }
  }

  // 2. ASSIGN GUARANTEED DOUBLE WEEKENDS (Sábado + Domingo de folga)
  // Each person gets at least 1 double weekend, distributed so that no DDD has > 1 or 2 off on the same weekend.
  if (options.ensureDoubleWeekend && weekends.length > 0) {
    for (const dddStr of Object.keys(dddGroups)) {
      const ddd = Number(dddStr);
      const techsInDdd = dddGroups[ddd];
      const targetPerTech = Math.max(1, options.targetDoubleWeekendsPerTech);

      // Distribute weekends among techsInDdd
      // In a 2-month span, there are 8-9 weekends.
      // Spread them across available weekends
      let weekendOffset = (ddd * 2) % weekends.length;

      for (let round = 0; round < targetPerTech; round++) {
        for (let i = 0; i < techsInDdd.length; i++) {
          const tech = techsInDdd[i];
          const weekendIndex = (weekendOffset + i * 2 + round * 4) % weekends.length;
          const targetWk = weekends[weekendIndex];

          if (targetWk) {
            const techSched = result[tech.id];
            if (techSched) {
              techSched.days[targetWk.saturday] = {
                date: targetWk.saturday,
                shift: 'FD',
                notes: 'Folga Dupla (Fim de Semana)'
              };
              techSched.days[targetWk.sunday] = {
                date: targetWk.sunday,
                shift: 'FD',
                notes: 'Folga Dupla (Fim de Semana)'
              };
            }
          }
        }
      }
    }
  }

  // 3. GENERATE 6x1 PATTERN WITH ~2 INVERSIONS & MID-WEEK OFF DISTRIBUTION
  // For each technician, generate regular weekly offs.
  // Standard rhythm might rest on Sunday. Then invert to rest on Saturday or mid-week.
  // When an inversion occurs (e.g. tech works Sunday), insert a mid-week off (Ter, Qua, Qui)
  // to avoid exceeding 6 consecutive work days!
  // Mid-week offs are staggered per technician so people don't all take the same weekday off.
  for (const dddStr of Object.keys(dddGroups)) {
    const ddd = Number(dddStr);
    const techsInDdd = dddGroups[ddd];

    for (let techIndex = 0; techIndex < techsInDdd.length; techIndex++) {
      const tech = techsInDdd[techIndex];
      const techSched = result[tech.id];
      if (!techSched) continue;

      // Plan ~2 inversions across the 8-9 weeks
      // E.g. week 3 and week 6 are inversion weeks
      const inversionWeeks = new Set<number>([
        (techIndex % 4) + 2,
        ((techIndex + 2) % 4) + 6
      ]);

      // Preferred mid-week off day for this technician to prevent everyone resting on the same day:
      // tech 0 -> Terça (day 2)
      // tech 1 -> Quarta (day 3)
      // tech 2 -> Quinta (day 4)
      // tech 3 -> Terça (day 2), etc.
      const preferredMidWeekday = (techIndex % 3) + 2; // 2=Ter, 3=Qua, 4=Qui

      // Step week by week
      let currentDayIndex = 0;
      let weekNum = 1;

      while (currentDayIndex < dates.length) {
        // Find next 7-day chunk or remaining days
        const weekDates = dates.slice(currentDayIndex, currentDayIndex + 7);
        if (weekDates.length === 0) break;

        // Check if there's already an assigned off in this chunk (e.g. from requested off or double weekend)
        const hasExistingOff = weekDates.some(d => {
          const s = techSched.days[d]?.shift;
          return s === 'F' || s === 'FD';
        });

        if (!hasExistingOff) {
          const isInversion = inversionWeeks.has(weekNum);

          if (isInversion) {
            // Inversion mode: place rest on Saturday or on preferred mid-week day
            // Find Saturday in this week
            const satDate = weekDates.find(d => isSaturday(d));
            const midDate = weekDates.find(d => parseDateKey(d).getDay() === preferredMidWeekday);

            if (satDate && Math.random() > 0.4) {
              techSched.days[satDate] = {
                date: satDate,
                shift: 'F',
                notes: 'Inversão de Escala (Sábado Livre)'
              };
            } else if (midDate) {
              techSched.days[midDate] = {
                date: midDate,
                shift: 'F',
                notes: 'Folga Meio de Semana (Inversão)'
              };
            } else if (satDate) {
              techSched.days[satDate] = {
                date: satDate,
                shift: 'F',
                notes: 'Inversão de Escala'
              };
            }
          } else {
            // Standard 6x1: rest on Sunday (or Saturday if Sunday was work)
            const sunDate = weekDates.find(d => isSunday(d));
            const satDate = weekDates.find(d => isSaturday(d));

            if (sunDate) {
              techSched.days[sunDate] = {
                date: sunDate,
                shift: 'F',
                notes: 'Folga Semanal de Domingo'
              };
            } else if (satDate) {
              techSched.days[satDate] = {
                date: satDate,
                shift: 'F',
                notes: 'Folga Semanal'
              };
            }
          }
        }

        currentDayIndex += 7;
        weekNum++;
      }
    }
  }

  // 4. GUARANTEE ZERO CONSECUTIVE DAYS VIOLATIONS (> 6 WORK DAYS)
  // Crucial legal safety net: strictly ensure max consecutive work days <= 6.
  // If consecutive work days hits 6 and the 7th is 'T', insert an 'F'.
  // Pick the day that has the highest staffing in that technician's DDD to preserve service.
  for (const tech of activeTechs) {
    const techSched = result[tech.id];
    let streak = 0;

    for (let i = 0; i < dates.length; i++) {
      const dateKey = dates[i];
      const shift = techSched.days[dateKey]?.shift;
      const isOff = shift === 'F' || shift === 'FD' || shift === 'FE' || shift === 'LI' || shift === 'AT';

      if (isOff) {
        streak = 0;
      } else {
        streak++;
        if (streak > options.maxConsecutiveWorkDays) {
          // Rule violation imminent! Must insert an off day.
          // Look backwards within this streak to find the best candidate day to flip to 'F'
          let bestDateKey = dateKey;
          let bestCoverageCount = -1;

          // Check previous 3 days (e.g. Quarta, Quinta, Sexta)
          for (let offset = 0; offset <= 2; offset++) {
            const candidateIdx = i - offset;
            if (candidateIdx >= 0) {
              const candDate = dates[candidateIdx];
              // Don't overwrite existing off
              const candShift = techSched.days[candDate]?.shift;
              if (candShift === 'T') {
                // Count how many others in this DDD are working on candDate
                let workingCount = 0;
                for (const otherTech of (dddGroups[tech.ddd] || [])) {
                  if (otherTech.id !== tech.id) {
                    const oShift = result[otherTech.id]?.days[candDate]?.shift;
                    if (oShift === 'T' || !oShift) workingCount++;
                  }
                }
                if (workingCount > bestCoverageCount) {
                  bestCoverageCount = workingCount;
                  bestDateKey = candDate;
                }
              }
            }
          }

          // Convert chosen day to Off
          techSched.days[bestDateKey] = {
            date: bestDateKey,
            shift: 'F',
            notes: 'Folga Regulamentar (Limite 6x1 CLT)'
          };

          // Recalculate streak up to current index
          streak = 0;
          for (let j = 0; j <= i; j++) {
            const s = techSched.days[dates[j]]?.shift;
            if (s === 'F' || s === 'FD' || s === 'FE' || s === 'LI' || s === 'AT') {
              streak = 0;
            } else {
              streak++;
            }
          }
        }
      }
    }
  }

  // 5. REGIONAL BALANCE CHECK FOR WEEKENDS
  // Check that no weekend has 4 or 5 people off in DDD 13 (or >1 in DDD 14/15)
  for (const wk of weekends) {
    for (const dddStr of Object.keys(dddGroups)) {
      const ddd = Number(dddStr);
      const techsInDdd = dddGroups[ddd];
      const maxAllowedWeekendOffs = ddd === 13 ? 2 : (ddd === 19 ? 2 : 1);

      for (const dayKey of [wk.saturday, wk.sunday]) {
        const offTechs = techsInDdd.filter(t => {
          const s = result[t.id]?.days[dayKey]?.shift;
          return s === 'F' || s === 'FD';
        });

        if (offTechs.length > maxAllowedWeekendOffs) {
          // Adjust excess: convert some to working and move their off to mid-week
          const excess = offTechs.length - maxAllowedWeekendOffs;
          for (let e = 0; e < excess; e++) {
            const techToMove = offTechs[e];
            const techDays = result[techToMove.id].days;

            // Only move if it wasn't an explicitly requested day off
            const hasRequested = offRequests.some(r => r.technicianId === techToMove.id && r.date === dayKey);
            if (!hasRequested && techDays[dayKey].shift === 'F') {
              techDays[dayKey] = {
                date: dayKey,
                shift: 'T'
              };

              // Give a mid-week off earlier or later in the week
              const currentIdx = dates.indexOf(dayKey);
              for (let delta of [-3, -2, -4, 2, 3]) {
                const targetIdx = currentIdx + delta;
                if (targetIdx >= 0 && targetIdx < dates.length) {
                  const targetDate = dates[targetIdx];
                  if (!isSaturday(targetDate) && !isSunday(targetDate) && techDays[targetDate]?.shift === 'T') {
                    techDays[targetDate] = {
                      date: targetDate,
                      shift: 'F',
                      notes: 'Folga compensatória semanal'
                    };
                    break;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return result;
}
