import {
  Technician,
  TechnicianSchedule,
  ValidationIssue,
  TechnicianStats,
  OffRequest
} from '../types';
import { DDD_INFO } from '../data/defaultTechnicians';
import { isSaturday, isSunday, extractWeekends, parseDateKey } from './dateUtils';

export interface AuditResult {
  isValid: boolean;
  score: number; // 0 to 100
  issues: ValidationIssue[];
  techStats: Record<string, TechnicianStats>;
  globalStats: {
    totalShifts: number;
    totalOffs: number;
    totalDoubleWeekends: number;
    totalViolations: number;
    criticalViolationsCount: number;
    requestsSatisfactionRate: number;
  };
}

export function isWorkingShift(shift?: string): boolean {
  return shift === 'TB' || shift === 'T';
}

export function isOffShift(shift?: string): boolean {
  if (!shift) return false;
  // Rule: All nomenclatures in the legend break the 7 consecutive work days,
  // with the sole exception of TB (Dia Trabalhado).
  return !isWorkingShift(shift);
}

export function validateSchedule(
  technicians: Technician[],
  schedules: Record<string, TechnicianSchedule>,
  dates: string[],
  offRequests: OffRequest[] = []
): AuditResult {
  const issues: ValidationIssue[] = [];
  const techStats: Record<string, TechnicianStats> = {};
  const activeTechs = technicians.filter(t => t.active);
  const weekends = extractWeekends(dates);

  let totalDoubleWeekendsAll = 0;
  let totalWorkDaysAll = 0;
  let totalOffsAll = 0;

  // 1. Validate each technician's individual schedule
  for (const tech of activeTechs) {
    const techSched = schedules[tech.id];
    let workDaysCount = 0;
    let offDaysCount = 0;
    let weekendOffsCount = 0;
    let doubleWeekendsCount = 0;
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    let inversionsCount = 0;

    if (techSched && techSched.days) {
      for (let i = 0; i < dates.length; i++) {
        const dateKey = dates[i];
        const day = techSched.days[dateKey];
        const shift = day ? day.shift : 'TB';

        const isOff = isOffShift(shift);

        if (isOff) {
          offDaysCount++;
          if (isSaturday(dateKey) || isSunday(dateKey)) {
            weekendOffsCount++;
          }

          if (currentConsecutive > maxConsecutive) {
            maxConsecutive = currentConsecutive;
          }
          currentConsecutive = 0;
        } else {
          // Working day (TB or FN)
          if (shift === 'TB' || shift === 'T') {
            workDaysCount++;
          }
          currentConsecutive++;
          if (currentConsecutive > maxConsecutive) {
            maxConsecutive = currentConsecutive;
          }

          // Check if reached 7 or more consecutive work days (CLT 6x1 violation)
          if (currentConsecutive > 6) {
            issues.push({
              id: `consecutive-${tech.id}-${dateKey}`,
              type: 'consecutive_days',
              severity: 'error',
              technicianId: tech.id,
              technicianName: tech.name,
              date: dateKey,
              ddd: tech.ddd,
              message: `${tech.name} atingiu ${currentConsecutive} dias seguidos de trabalho em ${dateKey} (limite máximo: 6 dias).`
            });
          }
        }
      }

      // Contagem de Folgas Dupladas:
      // 1) 2 dias seguidos com FD em qualquer dia da semana (ex: qui+sex, sex+sáb, sáb+dom, dom+seg)
      // 2) Finais de semana (Sáb + Dom) com folga mútua, com a regra estrita: Férias (FR / FE) NÃO contam como folga duplada!
      const countedDoubleDays = new Set<string>();

      // Passo 1: Reconhecer quaisquer 2 dias seguidos com 'FD' (Folga Duplada)
      for (let i = 0; i < dates.length - 1; i++) {
        const d1 = dates[i];
        const d2 = dates[i + 1];
        const shift1 = techSched.days[d1]?.shift;
        const shift2 = techSched.days[d2]?.shift;

        if (shift1 === 'FD' && shift2 === 'FD') {
          doubleWeekendsCount++;
          countedDoubleDays.add(d1);
          countedDoubleDays.add(d2);
          i++; // Avança para não contar o mesmo par duas vezes
        }
      }

      // Passo 2: Finais de semana (Sábado + Domingo) de folga (exceto FÉRIAS FR/FE e pares já computados)
      for (const wk of weekends) {
        const satShift = techSched.days[wk.saturday]?.shift;
        const sunShift = techSched.days[wk.sunday]?.shift;

        if ((satShift === 'FG' || satShift === 'F') && (sunShift === 'TB' || sunShift === 'T')) {
          inversionsCount++;
        }

        // FÉRIAS (FR ou FE) NUNCA devem ser computadas como folga duplada!
        const isSatVacation = satShift === 'FR' || satShift === 'FE';
        const isSunVacation = sunShift === 'FR' || sunShift === 'FE';
        if (isSatVacation || isSunVacation) {
          continue;
        }

        // Se o sábado ou domingo já foram contabilizados como par de FD, não duplicar
        if (countedDoubleDays.has(wk.saturday) || countedDoubleDays.has(wk.sunday)) {
          continue;
        }

        const isSatOff = isOffShift(satShift);
        const isSunOff = isOffShift(sunShift);

        if (isSatOff && isSunOff) {
          doubleWeekendsCount++;
          countedDoubleDays.add(wk.saturday);
          countedDoubleDays.add(wk.sunday);
        }
      }
    }

    totalDoubleWeekendsAll += doubleWeekendsCount;
    totalWorkDaysAll += workDaysCount;
    totalOffsAll += offDaysCount;

    // Check off requests for this tech: report strictly unresolved conflicts
    const techRequests = offRequests.filter(r => r.technicianId === tech.id);
    let fulfilled = 0;
    for (const req of techRequests) {
      const shift = techSched?.days[req.date]?.shift;
      if (isOffShift(shift)) {
        fulfilled++;
      } else {
        // Active unresolved conflict: technician has requested off but is scheduled to work TB
        issues.push({
          id: `unfulfilled-req-${req.id}`,
          type: 'unfulfilled_request',
          severity: 'error',
          technicianId: tech.id,
          technicianName: tech.name,
          date: req.date,
          ddd: tech.ddd,
          message: `Conflito de folga: ${tech.name} em ${req.date} (${req.reasonCategory}${req.notes.length > 0 ? `: ${req.notes.join(', ')}` : ''}) está escalado para trabalhar.`
        });
      }
    }

    techStats[tech.id] = {
      technicianId: tech.id,
      totalWorkDays: workDaysCount,
      totalOffDays: offDaysCount,
      doubleWeekendsCount,
      weekendDaysOff: weekendOffsCount,
      maxConsecutiveWorkDays: maxConsecutive,
      inversionsCount,
      requestsFulfilled: fulfilled,
      requestsTotal: techRequests.length
    };
  }

  // Calculate score strictly based on active violations (7 days failure and off conflicts)
  const errorCount = issues.length;
  let score = 100 - (errorCount * 25);
  if (score < 0) score = 0;

  const totalReqs = offRequests.length;
  const totalFulfilled = offRequests.filter(r => {
    const shift = schedules[r.technicianId]?.days[r.date]?.shift;
    return isOffShift(shift);
  }).length;

  return {
    isValid: errorCount === 0,
    score,
    issues,
    techStats,
    globalStats: {
      totalShifts: totalWorkDaysAll,
      totalOffs: totalOffsAll,
      totalDoubleWeekends: totalDoubleWeekendsAll,
      totalViolations: issues.length,
      criticalViolationsCount: errorCount,
      requestsSatisfactionRate: totalReqs > 0 ? Math.round((totalFulfilled / totalReqs) * 100) : 100
    }
  };
}
