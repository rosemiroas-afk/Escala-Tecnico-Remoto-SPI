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
    if (dayInfo && isOffShift(dayInfo.shift)) {
      result.push({
        technician: tech,
        date: targetDateStr,
        shiftType: dayInfo.shift,
        shiftLabel: dayInfo.shift === 'FD' ? 'Folga Duplada' : dayInfo.shift === 'FR' ? 'Férias' : dayInfo.shift === 'FN' ? 'Feriado Nacional' : dayInfo.shift === 'FB' ? 'Folga Banco' : 'Folga Regular'
      });
    }
  }

  return result;
}

export function generateWhatsAppReminderMessage(tech: Technician, dateStr: string, shiftLabel: string): string {
  const formattedDate = formatDisplayDate(dateStr);
  return `*ESCALA TÉCNICO REMOTO - AVISO DE FOLGA 24H*\n\nOlá *${tech.name}* (DDD ${tech.ddd}),\n\nPassando para lembrar que amanhã, *${formattedDate}*, você está de *${shiftLabel}* (${tech.shiftHours || 'Escala Normal'}).\n\nAproveite seu descanso e obrigado pela dedicação!\n\n_Equipe de Gestão de Escalas_`;
}
