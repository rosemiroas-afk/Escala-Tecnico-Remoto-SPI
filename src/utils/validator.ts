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

    // Track weekly rest day pattern to detect inversions
    let previousRestDayOfWeek: number | null = null;

    if (techSched && techSched.days) {
      for (let i = 0; i < dates.length; i++) {
        const dateKey = dates[i];
        const day = techSched.days[dateKey];
        const shift = day ? day.shift : 'T';

        const isOff = shift === 'F' || shift === 'FD' || shift === 'FE' || shift === 'LI' || shift === 'AT';

        if (isOff) {
          offDaysCount++;
          if (isSaturday(dateKey) || isSunday(dateKey)) {
            weekendOffsCount++;
          }

          // Check if this rest day shifted from previous rhythm
          const dObj = parseDateKey(dateKey);
          const dow = dObj.getDay();
          if (previousRestDayOfWeek !== null && previousRestDayOfWeek !== dow) {
            inversionsCount++;
          }
          previousRestDayOfWeek = dow;

          // Check consecutive streak ended
          if (currentConsecutive > maxConsecutive) {
            maxConsecutive = currentConsecutive;
          }
          currentConsecutive = 0;
        } else {
          // Working day
          workDaysCount++;
          currentConsecutive++;
          if (currentConsecutive > maxConsecutive) {
            maxConsecutive = currentConsecutive;
          }

          // Check if exceeded legal limit of 6 consecutive work days (CLT 6x1 limit)
          if (currentConsecutive > 6) {
            issues.push({
              id: `consecutive-${tech.id}-${dateKey}`,
              type: 'consecutive_days',
              severity: 'error',
              technicianId: tech.id,
              technicianName: tech.name,
              date: dateKey,
              ddd: tech.ddd,
              message: `${tech.name} atingiu ${currentConsecutive} dias seguidos de trabalho em ${dateKey}.`,
              suggestion: `Inserir uma folga no meio da semana ou ajustar para folga duplada no fim de semana.`
            });
          }
        }
      }

      // Check double weekends (strictly Sábado + Domingo)
      for (const wk of weekends) {
        const satShift = techSched.days[wk.saturday]?.shift;
        const sunShift = techSched.days[wk.sunday]?.shift;
        const isSatOff = satShift === 'F' || satShift === 'FD';
        const isSunOff = sunShift === 'F' || sunShift === 'FD';

        if (isSatOff && isSunOff) {
          doubleWeekendsCount++;
        }
      }

      // Check unwanted Friday + Saturday double off
      for (let i = 0; i < dates.length - 1; i++) {
        const d1 = dates[i];
        const d2 = dates[i + 1];
        const dow1 = parseDateKey(d1).getDay();
        const dow2 = parseDateKey(d2).getDay();

        if (dow1 === 5 && dow2 === 6) { // Friday and Saturday
          const s1 = techSched.days[d1]?.shift;
          const s2 = techSched.days[d2]?.shift;
          const isOff1 = s1 === 'F' || s1 === 'FD';
          const isOff2 = s2 === 'F' || s2 === 'FD';

          if (isOff1 && isOff2) {
            issues.push({
              id: `unwanted-fri-sat-${tech.id}-${d1}`,
              type: 'excessive_offs',
              severity: 'warning',
              technicianId: tech.id,
              technicianName: tech.name,
              date: d1,
              ddd: tech.ddd,
              message: `${tech.name} possui folga dupla em Sexta (${d1}) e Sábado (${d2}).`,
              suggestion: `Mover a folga compensatória para Segunda a Quinta. Folgas duplas devem ser exclusivamente Sábado e Domingo.`
            });
          }
        }
      }
    }

    totalDoubleWeekendsAll += doubleWeekendsCount;
    totalWorkDaysAll += workDaysCount;
    totalOffsAll += offDaysCount;

    // Check mandatory rule: at least 1 double weekend in 2 months
    if (doubleWeekendsCount === 0) {
      issues.push({
        id: `missing-dw-${tech.id}`,
        type: 'missing_double_weekend',
        severity: 'error',
        technicianId: tech.id,
        technicianName: tech.name,
        ddd: tech.ddd,
        message: `${tech.name} não possui nenhum final de semana duplado (Sáb + Dom) no período de 2 meses.`,
        suggestion: `Garantir ao menos 1 fim de semana completo de folga para ${tech.name}.`
      });
    }

    // Check off requests for this tech
    const techRequests = offRequests.filter(r => r.technicianId === tech.id);
    let fulfilled = 0;
    for (const req of techRequests) {
      const shift = techSched?.days[req.date]?.shift;
      if (shift === 'F' || shift === 'FD') {
        fulfilled++;
      } else {
        issues.push({
          id: `unfulfilled-req-${req.id}`,
          type: 'unfulfilled_request',
          severity: req.priority === 'alta' ? 'error' : 'warning',
          technicianId: tech.id,
          technicianName: tech.name,
          date: req.date,
          ddd: tech.ddd,
          message: `Pedido de folga de ${tech.name} em ${req.date} (${req.reasonCategory}: ${req.notes.join(', ')}) não foi atendido.`,
          suggestion: `Trocar a folga semanal para o dia solicitado.`
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

  // 2. Validate Daily Coverage per DDD (ensure team is not short-staffed or excessive offs)
  const ddds = [13, 14, 15, 19];
  for (const ddd of ddds) {
    const dddTechs = activeTechs.filter(t => t.ddd === ddd);
    const minRequired = DDD_INFO[ddd]?.minStaff ?? Math.max(1, Math.ceil(dddTechs.length * 0.6));

    for (const dateKey of dates) {
      let workingInDDD = 0;
      let offInDDD = 0;

      for (const tech of dddTechs) {
        const shift = schedules[tech.id]?.days[dateKey]?.shift;
        if (shift === 'T' || !shift) {
          workingInDDD++;
        } else {
          offInDDD++;
        }
      }

      // Check understaffing
      if (workingInDDD < minRequired) {
        issues.push({
          id: `understaffed-${ddd}-${dateKey}`,
          type: 'ddd_understaffed',
          severity: 'warning',
          ddd: ddd,
          date: dateKey,
          message: `DDD ${ddd} com cobertura baixa em ${dateKey}: apenas ${workingInDDD} técnico(s) ativo(s) (Mínimo sugerido: ${minRequired}).`,
          suggestion: `Revezar a folga de um técnico do DDD ${ddd} para outro dia.`
        });
      }

      // Check excessive offs on weekend (User: "Não pode ter quatro ou cinco pessoas no mesmo final de semana folgando")
      if ((isSaturday(dateKey) || isSunday(dateKey)) && offInDDD >= 4) {
        issues.push({
          id: `excessive-offs-${ddd}-${dateKey}`,
          type: 'excessive_offs',
          severity: 'error',
          ddd: ddd,
          date: dateKey,
          message: `DDD ${ddd} possui ${offInDDD} pessoas de folga simultaneamente no fim de semana em ${dateKey}.`,
          suggestion: `Redistribuir as folgas de fim de semana para outros finais de semana.`
        });
      }
    }
  }

  // Global score calculation
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  let score = 100 - (errorCount * 15) - (warningCount * 3);
  if (score < 0) score = 0;

  const totalReqs = offRequests.length;
  const totalFulfilled = offRequests.filter(r => {
    const shift = schedules[r.technicianId]?.days[r.date]?.shift;
    return shift === 'F' || shift === 'FD';
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
