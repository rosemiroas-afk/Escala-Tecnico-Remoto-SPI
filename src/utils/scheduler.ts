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
 * - 60% Saturday / 40% Sunday team split per DDD region.
 * - Inversions every ~3 weeks (at most 2 inversions per technician across the 2-month / 60 days period).
 * - Guaranteed Double Weekend (FD: Sábado + Domingo) once in the 2-month cycle per technician.
 * - 7-day consecutive work guard: FC (Folga Compensada) placed between Segunda and Quinta, unless an FD or approved off request breaks the sequence.
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

  // 4. ASSIGN INVERSIONS (~60% Saturday / 40% Sunday ratio per DDD, every ~3 weeks / max 2 per tech)
  const MAX_INVERSIONS_PER_TECH = 2;
  const inversionWeekends: Record<string, number[]> = {};

  for (const tech of activeTechs) {
    inversionWeekends[tech.id] = [];
  }

  const numWeekends = weekends.length;
  // Inversion target weeks (e.g. around week 3 and week 6 if 9 weeks)
  const targetInvWkIndices = [Math.floor(numWeekends * 0.33), Math.floor(numWeekends * 0.75)].filter(idx => idx < numWeekends);

  for (const wkIdx of targetInvWkIndices) {
    const wk = weekends[wkIdx];
    if (!wk) continue;

    for (const dddStr of Object.keys(dddGroups)) {
      const techsInDdd = dddGroups[Number(dddStr)];
      // ~60% of techs in this DDD get inversion on this weekend
      const countForDdd = Math.max(1, Math.round(techsInDdd.length * 0.6));

      let assignedCount = 0;
      for (const tech of techsInDdd) {
        if (assignedCount >= countForDdd) break;
        const isFd = doubleWeekendIndex[tech.id] === wkIdx;
        const invCount = inversionWeekends[tech.id].length;

        if (!isFd && invCount < MAX_INVERSIONS_PER_TECH) {
          inversionWeekends[tech.id].push(wkIdx);
          assignedCount++;
          const techSched = result[tech.id];

          // Sábado is FG, Sunday is TB
          techSched.days[wk.saturday] = {
            date: wk.saturday,
            shift: 'FG',
            notes: 'Inversão 60/40: Folga no Sábado'
          };
          techSched.days[wk.sunday] = {
            date: wk.sunday,
            shift: 'TB',
            notes: 'Inversão 60/40: Plantão no Domingo'
          };
        }
      }
    }
  }

  // 5. FOLGA COMPENSADA ('FC') STRICTLY BETWEEN SEGUNDA AND QUINTA FOR INVERSIONS
  // Rule: If an FD occurs in the same week, use FD instead of adding FC.
  for (const tech of activeTechs) {
    const techSched = result[tech.id];
    const techInversions = inversionWeekends[tech.id] || [];
    const fdWkIdx = doubleWeekendIndex[tech.id];

    for (const invWkIdx of techInversions) {
      // If FD is on the same weekend or adjacent, FD breaks the consecutive days already
      if (fdWkIdx !== undefined && Math.abs(fdWkIdx - invWkIdx) <= 1) continue;

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

          if (dow >= 1 && dow <= 4) {
            techSched.days[fcDate] = {
              date: fcDate,
              shift: 'FC',
              notes: 'Folga Compensada (Prevenção 7 dias)'
            };
          }
        }
      }
    }
  }

  // 6. PROCESS ONLY APPROVED OFF REQUESTS
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
