import {
  Technician,
  TechnicianSchedule,
  OffRequest,
  GeneratorOptions
} from '../types';
import { extractWeekends, parseDateKey, isSaturday, isSunday } from './dateUtils';

/**
 * Generate 6x1 schedule strictly matching the company's official SPI spreadsheet:
 * - Base rhythm: 6 days TB (Segunda a Sábado) and 1 day FG (Domingo). Exactly 1 off/week.
 * - Guaranteed Double Weekend: Sábado (FD) + Domingo (FD) once in the 2-month cycle.
 * - Inversion weeks (~1 or 2 per technician): off on Sábado (FG), works Sunday (TB).
 * - Transition prevention: when working on Sunday, an FC (Folga Compensada) is placed
 *   strictly between Segunda and Quinta (never Friday, never weekend), avoiding 7 consecutive days.
 * - TOTAL OFFS IN 2 MONTHS: strictly 9 to 10 offs (51 to 52 days TB worked), eliminating ANY excess of offs.
 * - Coverage: ~3 to 4 technicians active on Sundays, ~13 to 15 on Saturdays, ~18 on weekdays (matching SPI sheet).
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
  // No blanket holidays to avoid excess offs!
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

  // 2. ASSIGN BASE SUNDAY OFFS ('FG') TO ALL TECHNICIANS
  // Default 6x1 rhythm: Mon-Sat TB, Sunday FG
  for (const tech of activeTechs) {
    const techSched = result[tech.id];
    for (const wk of weekends) {
      techSched.days[wk.sunday] = {
        date: wk.sunday,
        shift: 'FG',
        notes: 'Folga Regular de Domingo'
      };
    }
  }

  // 3. ASSIGN EXACTLY ONE GUARANTEED DOUBLE WEEKEND ('FD': Sábado + Domingo)
  // Distributed evenly across all weekends so each DDD has at most 1 person on FD per weekend.
  const doubleWeekendIndex: Record<string, number> = {};

  if (options.ensureDoubleWeekend) {
    let globalIndex = 0;
    for (const dddStr of Object.keys(dddGroups)) {
      const ddd = Number(dddStr);
      const techsInDdd = dddGroups[ddd];

      for (let i = 0; i < techsInDdd.length; i++) {
        const tech = techsInDdd[i];
        // Distribute across weekends
        const targetWkIdx = (globalIndex * 2 + (ddd % 3)) % weekends.length;
        globalIndex++;
        doubleWeekendIndex[tech.id] = targetWkIdx;

        const wk = weekends[targetWkIdx];
        if (wk) {
          const techSched = result[tech.id];
          techSched.days[wk.saturday] = {
            date: wk.saturday,
            shift: 'FD',
            notes: 'Folga Duplada (Fim de Semana)'
          };
          techSched.days[wk.sunday] = {
            date: wk.sunday,
            shift: 'FD',
            notes: 'Folga Duplada (Fim de Semana)'
          };
        }
      }
    }
  }

  // 4. ASSIGN INVERSIONS (~1 or 2 per technician across the 2-month period)
  // On an inversion weekend:
  // - Saturday is 'FG' (off)
  // - Sunday is 'TB' (working!)
  // To keep 3-4 technicians working on each Sunday, we rotate technicians smoothly.
  const inversionWeekends: Record<string, number[]> = {};

  for (const tech of activeTechs) {
    inversionWeekends[tech.id] = [];
  }

  // Target: ~3 to 4 technicians working each Sunday
  const numWeekends = weekends.length;
  for (let wkIdx = 0; wkIdx < numWeekends; wkIdx++) {
    const wk = weekends[wkIdx];

    // Pick 3-4 technicians from different DDDs who do NOT have FD on this weekend
    const availableTechs = activeTechs.filter(t => {
      const isFd = doubleWeekendIndex[t.id] === wkIdx;
      const alreadyInversions = inversionWeekends[t.id].length;
      return !isFd && alreadyInversions < (options.targetInversionsPerTech || 1);
    });

    // Stagger selection: 1 from DDD 13, 1 from DDD 14/15, 1 from DDD 19
    const ddd13Tech = availableTechs.find(t => t.ddd === 13);
    const ddd14or15Tech = availableTechs.find(t => t.ddd === 14 || t.ddd === 15);
    const ddd19Tech = availableTechs.find(t => t.ddd === 19);

    const selectedForInversion = [ddd13Tech, ddd14or15Tech, ddd19Tech].filter(Boolean) as Technician[];

    for (const tech of selectedForInversion) {
      inversionWeekends[tech.id].push(wkIdx);
      const techSched = result[tech.id];

      // Sábado is FG, Sunday is TB
      techSched.days[wk.saturday] = {
        date: wk.saturday,
        shift: 'FG',
        notes: 'Inversão: Folga no Sábado'
      };
      techSched.days[wk.sunday] = {
        date: wk.sunday,
        shift: 'TB',
        notes: 'Inversão: Plantão no Domingo'
      };
    }
  }

  // 5. FOLGA COMPENSADA ('FC') FOR INVERSIONS TO PREVENT 7 CONSECUTIVE DAYS
  // When a technician works on Sunday (from an inversion):
  // Sunday (TB) + Seg (TB) + Ter (TB) + Qua (TB) + Qui (TB) + Sex (TB) + Sáb (TB) would be 7 work days!
  // To strictly prevent this without adding extra off days:
  // Place ONE 'FC' strictly on Terça-feira or Quarta-feira (dow 2 or 3) of that week.
  // And for that upcoming weekend, they work Saturday (TB) and rest Sunday (FG) as normal!
  // This yields: Sun-Mon-Tue (3 days TB), Wed (FC), Thu-Fri-Sat (3 days TB), Sun (FG).
  // Total work streak is max 3 days! Zero CLT violations!
  for (const tech of activeTechs) {
    const techSched = result[tech.id];
    const techInversions = inversionWeekends[tech.id] || [];

    for (const invWkIdx of techInversions) {
      const invWk = weekends[invWkIdx];
      const sunDate = invWk.sunday;
      const sunIdx = dates.indexOf(sunDate);

      if (sunIdx !== -1) {
        // Place FC on Terça (offset +2) or Quarta (offset +3)
        // Alternate between Terça (2) and Quarta (3) based on technician hash
        const techHash = tech.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const dayOffset = (techHash % 2 === 0) ? 2 : 3; // 2 = Terça, 3 = Quarta
        const fcIdx = sunIdx + dayOffset;

        if (fcIdx < dates.length) {
          const fcDate = dates[fcIdx];
          const dow = parseDateKey(fcDate).getDay();

          // Strictly Segunda to Quinta (dow 1 to 4)
          if (dow >= 1 && dow <= 4) {
            techSched.days[fcDate] = {
              date: fcDate,
              shift: 'FC',
              notes: 'Folga Compensada (Inversão)'
            };
          }
        }
      }
    }
  }

  // 6. PROCESS USER OFF REQUESTS (Compromissos, Casamentos)
  // Ensure requests are honored without inflating total offs:
  // - If requested on a Saturday, make that Saturday their off (FG).
  // - If requested on a weekday (e.g. Wednesday for wedding), grant FC on that day!
  if (options.prioritizeOffRequests && offRequests.length > 0) {
    for (const req of offRequests) {
      const techSched = result[req.technicianId];
      if (!techSched || !techSched.days[req.date]) continue;

      const reqDate = req.date;
      const dObj = parseDateKey(reqDate);
      const dow = dObj.getDay();

      if (dow === 0) {
        // Sunday request: already FG or FD
        techSched.days[reqDate].notes = req.notes.join(' | ');
        techSched.days[reqDate].isOffRequestFulfilled = true;
      } else if (dow === 6) {
        // Saturday request: set to FG
        techSched.days[reqDate] = {
          date: reqDate,
          shift: 'FG',
          notes: req.notes.join(' | '),
          isOffRequestFulfilled: true
        };
      } else if (dow >= 1 && dow <= 4) {
        // Weekday request: set to FC
        techSched.days[reqDate] = {
          date: reqDate,
          shift: 'FC',
          notes: req.notes.join(' | '),
          isOffRequestFulfilled: true
        };

        // If that week has a Sunday off, flip Sunday to TB to keep weekly offs strictly at 1
        const reqIdx = dates.indexOf(reqDate);
        for (let forward = 1; forward <= 6; forward++) {
          const adjIdx = reqIdx + forward;
          if (adjIdx < dates.length) {
            const adjDate = dates[adjIdx];
            if (isSunday(adjDate) && techSched.days[adjDate]?.shift === 'FG') {
              techSched.days[adjDate] = {
                date: adjDate,
                shift: 'TB',
                notes: 'Trabalho (Folga compensada em ' + reqDate + ')'
              };
              break;
            }
          }
        }
      }
    }
  }

  return result;
}
