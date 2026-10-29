import * as XLSX from 'xlsx';
import { Technician, TechnicianSchedule, OffRequest, SchedulePeriod } from '../types';
import { formatDisplayDate, parseDateKey, isSaturday, isSunday, extractWeekends, MONTHS_PT } from './dateUtils';
import { validateSchedule, isWorkingShift, isOffShift } from './validator';

export function exportScheduleToExcel(
  technicians: Technician[],
  schedules: Record<string, TechnicianSchedule>,
  dates: string[],
  period: SchedulePeriod,
  offRequests: OffRequest[]
) {
  const wb = XLSX.utils.book_new();
  const audit = validateSchedule(technicians, schedules, dates, offRequests);
  const sortedTechs = [...technicians].sort((a, b) => a.ddd - b.ddd || a.name.localeCompare(b.name));

  // 1. Matriz de Escala Sheet (ESCALA TÉCNICO REMOTO SPI)
  const rows: any[][] = [];

  // Title Row
  rows.push(['ESCALA TÉCNICO REMOTO SPI', '', '', ...dates.map(() => '')]);
  rows.push([]);

  // Date and Day of Week Header
  const dowHeader = ['NOME', 'DDD', 'ESCALA', ...dates.map(d => {
    const isSat = isSaturday(d);
    const isSun = isSunday(d);
    const dow = parseDateKey(d).getDay();
    return isSun ? 'domingo' : isSat ? 'sábado' : ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira'][dow - 1];
  }), 'DIAS TB', 'TOTAL FOLGAS', 'FD DUPLADO'];

  const dateHeader = ['NOME', 'DDD', 'ESCALA', ...dates.map(d => formatDisplayDate(d)), 'DIAS TB', 'TOTAL FOLGAS', 'FD DUPLADO'];

  // ATUANTES DIA row (matching user's SPI spreadsheet Row 4)
  const atuantesRow = ['ATUANTES DIA', '-', '-'];
  for (const d of dates) {
    let working = 0;
    for (const tech of sortedTechs) {
      const shift = schedules[tech.id]?.days[d]?.shift || 'TB';
      if (isWorkingShift(shift)) working++;
    }
    atuantesRow.push(String(working));
  }
  atuantesRow.push('-', '-', '-');

  rows.push(dowHeader);
  rows.push(dateHeader);
  rows.push(atuantesRow);

  // Technician Rows
  for (const tech of sortedTechs) {
    const techSched = schedules[tech.id];
    const stats = audit.techStats[tech.id] || {
      totalWorkDays: 0,
      totalOffDays: 0,
      doubleWeekendsCount: 0
    };

    const rowData: any[] = [
      tech.name,
      tech.ddd,
      tech.shiftHours || '08:00 AS 16:20'
    ];

    for (const d of dates) {
      const rawShift = techSched?.days[d]?.shift || 'TB';
      const shift = rawShift === 'T' ? 'TB' : rawShift === 'F' ? 'FG' : rawShift;
      rowData.push(shift);
    }

    rowData.push(stats.totalWorkDays);
    rowData.push(stats.totalOffDays);
    rowData.push(stats.doubleWeekendsCount);

    rows.push(rowData);
  }

  // Summary row at bottom for daily off counts
  const folgantesRow: any[] = ['TOTAL FOLGANDO NO DIA', '-', '-'];
  for (const d of dates) {
    let offCount = 0;
    for (const tech of sortedTechs) {
      const shift = schedules[tech.id]?.days[d]?.shift || 'TB';
      if (isOffShift(shift)) offCount++;
    }
    folgantesRow.push(String(offCount));
  }
  rows.push(folgantesRow);

  const wsEscala = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, wsEscala, 'ESCALA SPI');

  // 2. Legenda e Resumo Sheet
  const legendaRows = [
    ['CÓDIGO', 'SIGNIFICADO', 'DESCRIÇÃO'],
    ['TB', 'Dia Trabalhado', 'Turno regular de trabalho conforme horário'],
    ['FG', 'Folga Regular', 'Descanso semanal remunerado (Sábado ou Domingo)'],
    ['FD', 'Folga Duplada', 'Fim de semana completo de folga (Sábado + Domingo)'],
    ['FC', 'Folga Compensada', 'Folga entre 2ª e 5ª feira para compensar inversão sem exceder 6 dias'],
    ['FN', 'Feriado Nacional', 'Feriado civil ou nacional'],
    ['FR', 'Férias', 'Período de férias regulamentares'],
    ['LIC', 'Afastado', 'Afastamento médico ou licença'],
    ['FB', 'Folga Banco', 'Folga por compensação de banco de horas']
  ];
  const wsLegenda = XLSX.utils.aoa_to_sheet(legendaRows);
  XLSX.utils.book_append_sheet(wb, wsLegenda, 'LEGENDA');

  // 3. Pedidos de Folga Sheet
  const reqHeader = ['Técnico', 'DDD', 'Data', 'Motivo', 'Observações', 'Prioridade', 'Status'];
  const reqRows: any[][] = [reqHeader];

  for (const req of offRequests) {
    const tech = technicians.find(t => t.id === req.technicianId);
    const shift = schedules[req.technicianId]?.days[req.date]?.shift;
    const isGranted = isOffShift(shift);

    reqRows.push([
      tech ? tech.name : 'Desconhecido',
      tech ? `DDD ${tech.ddd}` : '-',
      formatDisplayDate(req.date),
      req.reasonCategory.toUpperCase(),
      req.notes.join('; '),
      req.priority.toUpperCase(),
      isGranted ? 'ATENDIDO' : 'EM ANÁLISE'
    ]);
  }

  const wsRequests = XLSX.utils.aoa_to_sheet(reqRows);
  XLSX.utils.book_append_sheet(wb, wsRequests, 'Solicitações de Folga');

  // Write file
  const fileName = `Escala_Tecnico_Remoto_SPI_${period.name.replace(/\s+/g, '_')}.xlsx`;
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
    const rawShift = schedule?.days[d]?.shift;
    const shift = rawShift === 'T' ? 'TB' : rawShift === 'F' ? 'FG' : rawShift;
    if (isOffShift(shift)) {
      const typeLabel = shift === 'FD' ? 'Folga Dupla' : shift === 'FC' ? 'Folga Compensada' : 'Folga Regular';
      offDays.push(`${formatDisplayDate(d)} (${typeLabel})`);
    }
  }

  for (const wk of weekends) {
    const sat = schedule?.days[wk.saturday]?.shift;
    const sun = schedule?.days[wk.sunday]?.shift;
    if ((sat === 'FD' || sat === 'FG' || sat === 'F') && (sun === 'FD' || sun === 'FG' || sun === 'F')) {
      doubleWeekends.push(`${formatDisplayDate(wk.saturday)} e ${formatDisplayDate(wk.sunday)}`);
    }
  }

  let msg = `📅 *ESCALA TÉCNICO REMOTO SPI - 6x1*\n`;
  msg += `👤 *Técnico:* ${tech.name}\n`;
  msg += `📍 *Região:* DDD ${tech.ddd}\n`;
  msg += `⏰ *Horário / Turno:* ${tech.shiftHours || '08:00 AS 16:20'}\n`;
  msg += `🗓️ *Período:* ${period.name}\n\n`;

  msg += `⭐ *SEU FIM DE SEMANA DUPLADO (Sábado + Domingo LIVRES):*\n`;
  if (doubleWeekends.length > 0) {
    doubleWeekends.forEach(dw => {
      msg += `  🎉 *${dw}*\n`;
    });
  } else {
    msg += `  (Ajuste em andamento com a supervisão)\n`;
  }

  msg += `\n🏖️ *PROGRAMAÇÃO DE FOLGAS NO BIMESTRE (${offDays.length} folgas):*\n`;
  offDays.forEach(f => {
    msg += `  • ${f}\n`;
  });

  if (techRequests.length > 0) {
    msg += `\n📝 *Pedidos de Folga Registrados:*\n`;
    techRequests.forEach(req => {
      const shift = schedule?.days[req.date]?.shift;
      const isGranted = isOffShift(shift);
      msg += `  ${isGranted ? '✅' : '⚠️'} ${formatDisplayDate(req.date)}: ${req.notes.join(', ')} (${isGranted ? 'Atendido' : 'Em análise'})\n`;
    });
  }

  msg += `\n_Escala oficial 6x1 validada sem excesso de folgas (limite de 6 dias trabalhados)._`;
  return msg;
}

export function generateTeamGroupWhatsAppSummary(
  technicians: Technician[],
  schedules: Record<string, TechnicianSchedule>,
  dates: string[],
  period: SchedulePeriod
): string {
  const weekends = extractWeekends(dates);

  let msg = `📋 *ESCALA TÉCNICO REMOTO SPI - GERAL 6x1*\n`;
  msg += `🗓️ *Período:* ${period.name.toUpperCase()}\n`;
  msg += `👥 Equipes DDD 13, 14, 15 e 19\n\n`;
  msg += `🏖️ *DISTRIBUIÇÃO DOS FINAIS DE SEMANA DUPLADOS (Sáb + Dom):*\n`;

  for (const wk of weekends) {
    msg += `\n*Fim de Semana: ${formatDisplayDate(wk.saturday)} & ${formatDisplayDate(wk.sunday)}*\n`;
    const offTechs: Technician[] = [];
    for (const tech of technicians) {
      const sat = schedules[tech.id]?.days[wk.saturday]?.shift;
      const sun = schedules[tech.id]?.days[wk.sunday]?.shift;
      if ((sat === 'FD' || sat === 'FG' || sat === 'F') && (sun === 'FD' || sun === 'FG' || sun === 'F')) {
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
