import {
  Technician,
  TechnicianSchedule,
  OffRequest,
  GeneratorOptions
} from '../types';
import { extractWeekends, parseDateKey, isSaturday, isSunday } from './dateUtils';

/**
 * Generate a clean, balanced, legal 6x1 schedule for 2 months according to exact company rules:
 * 1. Default shift is fixed from Segunda a Sábado (6 days work), with regular off on Domingo.
 * 2. Regular offs are strictly on Domingo or Sábado (never mid-week unless compensating for 7th day).
 * 3. Guaranteed double weekend off (Sáb + Dom) for every technician during the 2-month period.
 * 4. Double offs are EXCLUSIVELY Sábado + Domingo. Never Friday + Saturday!
 * 5. Scale inversions (~2 in 2 months) where tech rests on Sábado and works Domingo:
 *    A compensatory day off MUST be placed strictly between Segunda and Quinta (never Sexta!)
 *    to prevent 7 consecutive work days and prevent accidental Friday+Saturday double offs.
 * 6. Staggered compensatory offs across team members so people don't take off on the same day.
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

  // Initialize all days to 'T' (Work: Segunda a Sábado default)
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

  // Group by DDD for balanced regional coverage
  const dddGroups: Record<number, Technician[]> = {};
  for (const tech of activeTechs) {
    if (!dddGroups[tech.ddd]) dddGroups[tech.ddd] = [];
    dddGroups[tech.ddd].push(tech);
  }

  // 1. PIN CONFIRMED OFF REQUESTS (Personal requests like wedding, medical)
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

  // 2. ASSIGN GUARANTEED DOUBLE WEEKENDS (Sábado + Domingo EXCLUSIVAMENTE)
  // Well distributed across weekends: no more than 1 or 2 technicians per DDD per weekend.
  if (options.ensureDoubleWeekend && weekends.length > 0) {
    for (const dddStr of Object.keys(dddGroups)) {
      const ddd = Number(dddStr);
      const techsInDdd = dddGroups[ddd];
      const targetPerTech = Math.max(1, options.targetDoubleWeekendsPerTech);

      // Offset starting weekend by DDD to avoid statewide collisions
      let weekendOffset = (ddd * 2) % weekends.length;

      for (let round = 0; round < targetPerTech; round++) {
        for (let i = 0; i < techsInDdd.length; i++) {
          const tech = techsInDdd[i];
          // Spread across available weekends
          const weekendIndex = (weekendOffset + i * 2 + round * 4) % weekends.length;
          const targetWk = weekends[weekendIndex];

          if (targetWk) {
            const techSched = result[tech.id];
            if (techSched) {
              techSched.days[targetWk.saturday] = {
                date: targetWk.saturday,
                shift: 'FD',
                notes: 'Folga Dupla (Sáb + Dom)'
              };
              techSched.days[targetWk.sunday] = {
                date: targetWk.sunday,
                shift: 'FD',
                notes: 'Folga Dupla (Sáb + Dom)'
              };
            }
          }
        }
      }
    }
  }

  // 3. GENERATE REGULAR WEEKLY SHIFTS & STRICT INVERSIONS
  // Rule:
  // - Fixed rhythm: Segunda a Sábado work, Domingo off.
  // - Inversions: technician rests on Sábado and works Domingo.
  // - Whenever working Domingo, a compensatory off is placed between Segunda and Quinta (1 to 4).
  // - NEVER on Sexta (5), so they never have Friday+Saturday off!
  // - NEVER mid-week on normal weeks (normal weeks rest Domingo or Sábado).
  for (const dddStr of Object.keys(dddGroups)) {
    const ddd = Number(dddStr);
    const techsInDdd = dddGroups[ddd];

    for (let techIndex = 0; techIndex < techsInDdd.length; techIndex++) {
      const tech = techsInDdd[techIndex];
      const techSched = result[tech.id];
      if (!techSched) continue;

      // Plan ~2 inversion weeks per tech across the 8-9 weeks
      const inversionWeeks = new Set<number>([
        (techIndex % 4) + 2,
        ((techIndex + 2) % 4) + 6
      ]);

      // Compensatory day for this technician: STRICTLY Segunda (1), Terça (2), Quarta (3) ou Quinta (4).
      // NEVER Sexta (5), NEVER weekend!
      const allowedCompensatoryDays = [1, 2, 3, 4]; // Seg, Ter, Qua, Qui
      const preferredCompDay = allowedCompensatoryDays[techIndex % allowedCompensatoryDays.length];

      let currentDayIndex = 0;
      let weekNum = 1;

      while (currentDayIndex < dates.length) {
        const weekDates = dates.slice(currentDayIndex, currentDayIndex + 7);
        if (weekDates.length === 0) break;

        const hasDoubleWeekend = weekDates.some(d => techSched.days[d]?.shift === 'FD');
        const hasManualOff = weekDates.some(d => techSched.days[d]?.isOffRequestFulfilled);

        if (!hasDoubleWeekend && !hasManualOff) {
          const isInversion = inversionWeeks.has(weekNum);

          if (isInversion) {
            // INVERSION WEEK:
            // 1. Off on Saturday
            const satDate = weekDates.find(d => isSaturday(d));
            if (satDate && techSched.days[satDate].shift === 'T') {
              techSched.days[satDate] = {
                date: satDate,
                shift: 'F',
                notes: 'Inversão: Folga no Sábado'
              };
            }

            // 2. Compensatory day off STRICTLY between Segunda and Quinta
            // to compensate working on Sunday / preventing 7-day streak
            const compDate = weekDates.find(d => {
              const dow = parseDateKey(d).getDay();
              return dow === preferredCompDay;
            }) || weekDates.find(d => {
              const dow = parseDateKey(d).getDay();
              return dow >= 1 && dow <= 4; // strictly Mon to Thu
            });

            if (compDate && techSched.days[compDate].shift === 'T') {
              techSched.days[compDate] = {
                date: compDate,
                shift: 'F',
                notes: 'Folga Compensatória (Segunda a Quinta)'
              };
            }
          } else {
            // REGULAR WEEK:
            // Work Segunda a Sábado -> Off strictly on Domingo!
            const sunDate = weekDates.find(d => isSunday(d));
            if (sunDate && techSched.days[sunDate].shift === 'T') {
              techSched.days[sunDate] = {
                date: sunDate,
                shift: 'F',
                notes: 'Folga Regular de Domingo'
              };
            }
          }
        }

        currentDayIndex += 7;
        weekNum++;
      }
    }
  }

  // 4. GUARANTEE STRICT 6-DAY CONSECUTIVE LIMIT (CLT 6x1)
  // If consecutive work days hits 7:
  // Insert a compensatory off STRICTLY on Segunda, Terça, Quarta ou Quinta (dow 1 to 4).
  // NEVER on Sexta (5), Sábado (6) or Domingo (0)!
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
          // Rule violation: streak reached 7!
          // Find a candidate day within this streak that is STRICTLY Segunda, Terça, Quarta ou Quinta (dow 1, 2, 3, 4)
          let bestDateKey: string | null = null;
          let bestCoverageCount = -1;

          for (let offset = 0; offset < streak; offset++) {
            const candidateIdx = i - offset;
            if (candidateIdx >= 0) {
              const candDate = dates[candidateIdx];
              const dow = parseDateKey(candDate).getDay();

              // Strictly Segunda a Quinta (1 to 4)
              if (dow >= 1 && dow <= 4 && techSched.days[candDate]?.shift === 'T') {
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

          if (bestDateKey) {
            techSched.days[bestDateKey] = {
              date: bestDateKey,
              shift: 'F',
              notes: 'Folga Compensatória (Segunda a Quinta - 6x1)'
            };
          }

          // Recalculate streak
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
  // Ensure no weekend has 4 or 5 people off at the same time in DDD 13 (or >1 in DDD 14/15)
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
          const excess = offTechs.length - maxAllowedWeekendOffs;
          for (let e = 0; e < excess; e++) {
            const techToMove = offTechs[e];
            const techDays = result[techToMove.id].days;

            const hasRequested = offRequests.some(r => r.technicianId === techToMove.id && r.date === dayKey);
            if (!hasRequested && techDays[dayKey].shift === 'F') {
              techDays[dayKey] = {
                date: dayKey,
                shift: 'T'
              };

              // Give a compensatory off strictly between Segunda and Quinta
              const currentIdx = dates.indexOf(dayKey);
              for (let delta of [-3, -4, -5, 2, 3]) {
                const targetIdx = currentIdx + delta;
                if (targetIdx >= 0 && targetIdx < dates.length) {
                  const targetDate = dates[targetIdx];
                  const dow = parseDateKey(targetDate).getDay();
                  if (dow >= 1 && dow <= 4 && techDays[targetDate]?.shift === 'T') {
                    techDays[targetDate] = {
                      date: targetDate,
                      shift: 'F',
                      notes: 'Folga compensatória (Segunda a Quinta)'
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
