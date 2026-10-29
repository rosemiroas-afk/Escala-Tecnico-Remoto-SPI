import * as XLSX from 'xlsx';
import { Technician, TechnicianSchedule, OffRequest, SchedulePeriod } from '../types';
import { formatDisplayDate, parseDateKey, isSaturday, isSunday, extractWeekends, MONTHS_PT } from './dateUtils';
import { validateSchedule } from './validator';

export function exportScheduleToExcel(
  technicians: Technician[],
  schedules: Record<string, TechnicianSchedule>,
  dates: string[],
  period: SchedulePeriod,
  offRequests: OffRequest[]
) {
  const wb = XLSX.utils.book_new();
  const audit = validateSchedule(technicians, schedules, dates, offRequests);

  // 1. Matriz de Escala Sheet
  const header = ['DDD', 'Técnico', 'Telefone', ...dates.map(d => formatDisplayDate(d)), 'Dias Trabalhados', 'Total Folgas', 'Fins de Semana Duplados'];
  const rows: any[][] = [header];

  const sortedTechs = [...technicians].sort((a, b) => a.ddd - b.ddd || a.name.localeCompare(b.name));

  for (const tech of sortedTechs) {
    const techSched = schedules[tech.id];
    const stats = audit.techStats[tech.id] || {
      totalWorkDays: 0,
      totalOffDays: 0,
      doubleWeekendsCount: 0
    };

    const rowData: any[] = [
      `DDD ${tech.ddd}`,
      tech.name,
      tech.phone || '-'
    ];

    for (const d of dates) {
      const shift = techSched?.days[d]?.shift || 'T';
      rowData.push(shift);
    }

    rowData.push(stats.totalWorkDays);
    rowData.push(stats.totalOffDays);
    rowData.push(stats.doubleWeekendsCount);

    rows.push(rowData);
  }

  // Summary row at bottom for daily coverage
  const dailyWorkCountRow: any[] = ['RESUMO', 'Técnicos Trabalhando', '-'];
  const dailyOffCountRow: any[] = ['RESUMO', 'Técnicos Folgando', '-'];

  for (const d of dates) {
    let working = 0;
    let off = 0;
    for (const tech of sortedTechs) {
      const shift = schedules[tech.id]?.days[d]?.shift || 'T';
      if (shift === 'T') working++;
      else off++;
    }
    dailyWorkCountRow.push(working);
    dailyOffCountRow.push(off);
  }
  rows.push(dailyWorkCountRow);
  rows.push(dailyOffCountRow);

  const wsEscala = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, wsEscala, 'Escala 6x1 Bimestral');

  // 2. Pedidos de Folga Sheet
  const reqHeader = ['Técnico', 'DDD', 'Data', 'Motivo', 'Observações', 'Prioridade', 'Status'];
  const reqRows: any[][] = [reqHeader];

  for (const req of offRequests) {
    const tech = technicians.find(t => t.id === req.technicianId);
    reqRows.push([
      tech ? tech.name : 'Desconhecido',
      tech ? `DDD ${tech.ddd}` : '-',
      formatDisplayDate(req.date),
      req.reasonCategory.toUpperCase(),
      req.notes.join('; '),
      req.priority.toUpperCase(),
      schedules[req.technicianId]?.days[req.date]?.shift === 'F' ? 'ATENDIDO' : 'NÃO ATENDIDO'
    ]);
  }

  const wsRequests = XLSX.utils.aoa_to_sheet(reqRows);
  XLSX.utils.book_append_sheet(wb, wsRequests, 'Solicitações de Folga');

  // Write file
  const fileName = `Escala_6x1_${period.name.replace(/\s+/g, '_')}_DDD13_14_15_19.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function generateIndividualWhatsAppMessage(
  tech: Technician,
  schedule: TechnicianSchedule,
  dates: string[],
  period: SchedulePeriod,
  offRequests: OffRequest[]
): string {
  const techRequests = offRequests.filter(r => r.technicianId === tech.id);
  const weekends = extractWeekends(dates);

  const offDays: string[] = [];
  const doubleWeekends: string[] = [];

  for (const d of dates) {
    const shift = schedule?.days[d]?.shift;
    if (shift === 'F' || shift === 'FD') {
      offDays.push(formatDisplayDate(d));
    }
  }

  for (const wk of weekends) {
    const sat = schedule?.days[wk.saturday]?.shift;
    const sun = schedule?.days[wk.sunday]?.shift;
    if ((sat === 'F' || sat === 'FD') && (sun === 'F' || sun === 'FD')) {
      doubleWeekends.push(`${formatDisplayDate(wk.saturday)} e ${formatDisplayDate(wk.sunday)}`);
    }
  }

  let msg = `📅 *ESCALA DE TRABALHO 6x1*\n`;
  msg += `👤 *Técnico:* ${tech.name}\n`;
  msg += `📍 *Região:* DDD ${tech.ddd}\n`;
  msg += `🗓️ *Período:* ${period.name}\n\n`;

  msg += `⭐ *SEU FIM DE SEMANA DUPLADO (Sábado + Domingo LIVRES):*\n`;
  if (doubleWeekends.length > 0) {
    doubleWeekends.forEach(dw => {
      msg += `  🎉 *${dw}*\n`;
    });
  } else {
    msg += `  (Ajuste pendente com a supervisão)\n`;
  }

  msg += `\n🏖️ *TODAS AS SUAS FOLGAS NO BIMESTRE (${offDays.length} folgas):*\n`;
  offDays.forEach(f => {
    msg += `  • ${f}\n`;
  });

  if (techRequests.length > 0) {
    msg += `\n📝 *Pedidos de Folga Registrados:*\n`;
    techRequests.forEach(req => {
      const isGranted = schedule?.days[req.date]?.shift === 'F' || schedule?.days[req.date]?.shift === 'FD';
      msg += `  ${isGranted ? '✅' : '⚠️'} ${formatDisplayDate(req.date)}: ${req.notes.join(', ')} (${isGranted ? 'Atendido' : 'Em análise'})\n`;
    });
  }

  msg += `\n_Escala gerada em conformidade com o descanso semanal 6x1._`;
  return msg;
}

export function generateTeamGroupWhatsAppSummary(
  technicians: Technician[],
  schedules: Record<string, TechnicianSchedule>,
  dates: string[],
  period: SchedulePeriod
): string {
  const weekends = extractWeekends(dates);

  let msg = `📋 *ESCALA GERAL 6x1 - ${period.name.toUpperCase()}*\n`;
  msg += `👥 Equipes DDD 13, 14, 15 e 19\n\n`;
  msg += `🏖️ *DISTRIBUIÇÃO DOS FINAIS DE SEMANA DUPLADOS (Sáb + Dom):*\n`;

  for (const wk of weekends) {
    msg += `\n*Fim de Semana: ${formatDisplayDate(wk.saturday)} & ${formatDisplayDate(wk.sunday)}*\n`;
    const offTechs: Technician[] = [];
    for (const tech of technicians) {
      const sat = schedules[tech.id]?.days[wk.saturday]?.shift;
      const sun = schedules[tech.id]?.days[wk.sunday]?.shift;
      if ((sat === 'F' || sat === 'FD') && (sun === 'F' || sun === 'FD')) {
        offTechs.push(tech);
      }
    }

    if (offTechs.length === 0) {
      msg += `  • Nenhuma folga dupla programada\n`;
    } else {
      offTechs.forEach(t => {
        msg += `  • [DDD ${t.ddd}] ${t.name}\n`;
      });
    }
  }

  msg += `\n*Totais:* ${technicians.length} técnicos escalados | Escala 6x1 validada.`;
  return msg;
}
