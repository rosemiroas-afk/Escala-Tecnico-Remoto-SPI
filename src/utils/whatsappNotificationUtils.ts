import { Technician, TechnicianSchedule, ShiftType } from '../types';
import { isOffShift } from './validator';
import { formatDisplayDate } from './dateUtils';

export interface ImpendingOffNotification {
  technician: Technician;
  date: string;
  shiftType: ShiftType;
  shiftLabel: string;
}

export function findImpendingOffs(
  technicians: Technician[],
  schedules: Record<string, TechnicianSchedule>,
  targetDateStr: string
): ImpendingOffNotification[] {
  const result: ImpendingOffNotification[] = [];

  for (const tech of technicians) {
    if (!tech.active) continue;
    const techSched = schedules[tech.id];
    if (!techSched || !techSched.days) continue;

    const dayInfo = techSched.days[targetDateStr];
    // Rule: Exclude technicians on vacation (FR) from 24h WhatsApp notification list
    if (dayInfo && isOffShift(dayInfo.shift)) {
      if (dayInfo.shift === 'FR' || dayInfo.shift === 'FE') {
        continue;
      }
      let label = 'Folga Regular';
      if (dayInfo.shift === 'FD') label = 'Folga Duplada';
      else if (dayInfo.shift === 'FN') label = 'Feriado Nacional';
      else if (dayInfo.shift === 'FB') label = 'Folga Banco';
      else if (dayInfo.shift === 'FP') label = 'Folga Parcial';
      else if (dayInfo.shift === 'FC') label = 'Folga Compensada';
      else if (dayInfo.shift === 'FM') label = 'Folga Municipal';
      else if (dayInfo.shift === 'LIC' || dayInfo.shift === 'LI') label = 'Licença / Afastado';
      else if (dayInfo.shift === 'A') label = 'Afastado';
      else if (dayInfo.shift === 'LP') label = 'Licença';
      else if (dayInfo.shift === 'TR') label = 'Treinamento';

      result.push({
        technician: tech,
        date: targetDateStr,
        shiftType: dayInfo.shift,
        shiftLabel: label
      });
    }
  }

  return result;
}

export function generateWhatsAppReminderMessage(tech: Technician, dateStr: string, shiftLabel: string): string {
  const formattedDate = formatDisplayDate(dateStr);
  return `*ESCALA TÉCNICO REMOTO - AVISO DE FOLGA 24H*\n\nOlá *${tech.name}* (DDD ${tech.ddd}),\n\nPassando para lembrar que amanhã, *${formattedDate}*, você está de *${shiftLabel}* (${tech.shiftHours || 'Escala Normal'}).\n\nAproveite seu descanso e obrigado pela dedicação!\n\n_Equipe de Gestão de Escalas_`;
}
