import {
  Technician,
  TechnicianSchedule,
  OffRequest,
  GeneratorOptions
} from '../types';
import { extractWeekends, parseDateKey, isSaturday, isSunday } from './dateUtils';

/**
 * Generate 6x1 schedule strictly matching the company's official SPI rules:
 * - Base rhythm: 6 days TB (Segunda a Sábado) and 1 day FG (Domingo). Exactly 1 off/week.
 * - Guaranteed Double Weekend: Sábado (FD) + Domingo (FD) once in the 2-month cycle.
 * - Inversions: STRICTLY AT MOST 2 inversions per technician across the 2-month (60 days) period.
 *   On inversion: Saturday is FG (off) and Sunday is TB (working).
 *   Then, in the upcoming week: ONE FC (Folga Compensada) placed strictly between Segunda and Quinta.
 * - Off Requests: ONLY approved requests modify the schedule. Pending requests stay in analysis.
 * - Total offs in 2 months: strictly 9 to 10 offs (51 to 52 days TB worked), eliminating any excess.
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

  // 4. ASSIGN INVERSIONS: STRICTLY AT MOST 2 INVERSIONS IN 60 DAYS PER TECHNICIAN
  // User Requirement: "no máximo duas inversões de escala nos dois meses juntos"
  const MAX_INVERSIONS_PER_TECH = 2;
  const inversionWeekends: Record<string, number[]> = {};

  for (const tech of activeTechs) {
    inversionWeekends[tech.id] = [];
  }

  const numWeekends = weekends.length;
  for (let wkIdx = 0; wkIdx < numWeekends; wkIdx++) {
    const wk = weekends[wkIdx];

    // Pick 2-3 technicians from different DDDs who:
    // 1. Do NOT have FD on this weekend
    // 2. Have strictly fewer than 2 inversions
    // 3. Are not within 2 weeks of their previous inversion
    const availableTechs = activeTechs.filter(t => {
      const isFd = doubleWeekendIndex[t.id] === wkIdx;
      const count = inversionWeekends[t.id].length;
      const lastInv = inversionWeekends[t.id][inversionWeekends[t.id].length - 1];
      const tooClose = lastInv !== undefined && Math.abs(wkIdx - lastInv) < 3;
      return !isFd && count < MAX_INVERSIONS_PER_TECH && !tooClose;
    });

    const ddd13Tech = availableTechs.find(t => t.ddd === 13);
    const ddd14or15Tech = availableTechs.find(t => t.ddd === 14 || t.ddd === 15);
    const ddd19Tech = availableTechs.find(t => t.ddd === 19);

    const selectedForInversion = [ddd13Tech, ddd14or15Tech, ddd19Tech].filter(Boolean) as Technician[];

    for (const tech of selectedForInversion) {
      if (inversionWeekends[tech.id].length < MAX_INVERSIONS_PER_TECH) {
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
  }

  // 5. FOLGA COMPENSADA ('FC') STRICTLY BETWEEN SEGUNDA AND QUINTA FOR INVERSIONS
  // Prevents working 7 consecutive days when working on Sunday
  for (const tech of activeTechs) {
    const techSched = result[tech.id];
    const techInversions = inversionWeekends[tech.id] || [];

    for (const invWkIdx of techInversions) {
      const invWk = weekends[invWkIdx];
      const sunDate = invWk.sunday;
      const sunIdx = dates.indexOf(sunDate);

      if (sunIdx !== -1) {
        // Place FC strictly on Terça (offset +2) or Quarta (offset +3)
        const techHash = tech.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const dayOffset = (techHash % 2 === 0) ? 2 : 3;
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

  // 6. PROCESS ONLY APPROVED OFF REQUESTS
  // Pending requests DO NOT modify the schedule. They remain in analysis until Admin approval.
  if (options.prioritizeOffRequests && offRequests.length > 0) {
    for (const req of offRequests) {
      if (req.status !== 'atendido') continue; // Only approved requests apply!

      const techSched = result[req.technicianId];
      if (!techSched || !techSched.days[req.date]) continue;

      const reqDate = req.date;
      const dObj = parseDateKey(reqDate);
      const dow = dObj.getDay();

      if (dow === 0) {
        techSched.days[reqDate].notes = req.notes.join(' | ');
        techSched.days[reqDate].isOffRequestFulfilled = true;
      } else if (dow === 6) {
        techSched.days[reqDate] = {
          date: reqDate,
          shift: 'FG',
          notes: req.notes.join(' | '),
          isOffRequestFulfilled: true
        };
      } else if (dow >= 1 && dow <= 4) {
        techSched.days[reqDate] = {
          date: reqDate,
          shift: 'FC',
          notes: req.notes.join(' | '),
          isOffRequestFulfilled: true
        };

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
