import { BancoHorasRecord } from '../types';
import { parseDateToIso } from './csvScheduleParser';

export interface ParseBancoHorasResult {
  records: BancoHorasRecord[];
  totalLines: number;
  validCount: number;
  errors: string[];
}

function detectDelimiter(lines: string[]): string {
  let semicolonCount = 0;
  let commaCount = 0;
  let tabCount = 0;

  for (const line of lines.slice(0, 15)) {
    semicolonCount += (line.match(/;/g) || []).length;
    commaCount += (line.match(/,/g) || []).length;
    tabCount += (line.match(/\t/g) || []).length;
  }

  if (tabCount > semicolonCount && tabCount > commaCount) return '\t';
  if (semicolonCount >= commaCount && semicolonCount > 0) return ';';
  return ',';
}

function parseCsvLine(line: string, delimiter: string): string[] {
  if (!line.includes('"')) {
    return line.split(delimiter).map(s => s.trim());
  }

  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === delimiter && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * Normalizes saldo a compensar string into formatted HH:MM or sign + HH:MM
 */
export function formatSaldoString(raw: string): string {
  if (!raw) return '00:00';
  const clean = raw.trim().replace(/^["']|["']$/g, '');
  if (!clean) return '00:00';

  const isNegative = clean.includes('-') || clean.toLowerCase().includes('debito') || clean.toLowerCase().includes('débito');
  const numericOnly = clean.replace(/[^0-9:.,]/g, '');

  if (numericOnly.includes(':')) {
    const parts = numericOnly.split(':');
    const hours = Math.abs(parseInt(parts[0], 10) || 0);
    const mins = Math.abs(parseInt(parts[1], 10) || 0);
    const sign = isNegative ? '-' : '+';
    return `${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  const floatVal = parseFloat(numericOnly.replace(',', '.'));
  if (!isNaN(floatVal)) {
    const absVal = Math.abs(floatVal);
    const hours = Math.floor(absVal);
    const mins = Math.round((absVal - hours) * 60);
    const sign = isNegative || floatVal < 0 ? '-' : '+';
    return `${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  return clean;
}

/**
 * Parses time string like "+08:30" or "-02:15" into total minutes integer
 */
export function saldoToMinutes(saldo: string): number {
  if (!saldo) return 0;
  const clean = saldo.trim();
  const isNegative = clean.startsWith('-') || clean.toLowerCase().includes('debito') || clean.toLowerCase().includes('débito');

  const match = clean.match(/(\d+):(\d+)/);
  if (match) {
    const hrs = parseInt(match[1], 10) || 0;
    const mins = parseInt(match[2], 10) || 0;
    const total = hrs * 60 + mins;
    return isNegative ? -total : total;
  }

  const floatVal = parseFloat(clean.replace(',', '.'));
  if (!isNaN(floatVal)) {
    return Math.round(floatVal * 60);
  }

  return 0;
}

/**
 * Converts total minutes integer to "+HH:MM" or "-HH:MM" format
 */
export function minutesToSaldo(totalMinutes: number): string {
  const isNegative = totalMinutes < 0;
  const absMins = Math.abs(totalMinutes);
  const hrs = Math.floor(absMins / 60);
  const mins = absMins % 60;
  const sign = isNegative ? '-' : '+';
  return `${sign}${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function parseBancoHorasCsv(content: string): ParseBancoHorasResult {
  const cleanContent = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
  const rawLines = cleanContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  if (rawLines.length === 0) {
    return {
      records: [],
      totalLines: 0,
      validCount: 0,
      errors: ['O arquivo selecionado está vazio.']
    };
  }

  const delimiter = detectDelimiter(rawLines);
  const records: BancoHorasRecord[] = [];
  const errors: string[] = [];

  let matriculaIdx = 0;
  let nomeIdx = 1;
  let cargoIdx = 2;
  let statusIdx = 3;
  let descricaoIdx = 4;
  let dataRealizacaoIdx = 5;
  let dataVencimentoIdx = 6;
  let saldoIdx = 7;
  let aVencerDiasIdx = 8;

  let startIndex = 0;
  const firstLineCols = parseCsvLine(rawLines[0], delimiter).map(c => c.toLowerCase().trim());

  const isHeader = firstLineCols.some(c =>
    c.includes('matricula') ||
    c.includes('matrícula') ||
    c.includes('nome') ||
    c.includes('status') ||
    c.includes('saldo') ||
    c.includes('vencer')
  );

  if (isHeader) {
    startIndex = 1;
    firstLineCols.forEach((col, idx) => {
      if (col.includes('matricula') || col.includes('matrícula') || col.includes('id_colaborador')) matriculaIdx = idx;
      else if (col.includes('nome') || col.includes('colaborador') || col.includes('funcionario')) nomeIdx = idx;
      else if (col.includes('cargo') || col.includes('funcao')) cargoIdx = idx;
      else if (col.includes('status') || col.includes('tipo')) statusIdx = idx;
      else if (col.includes('descricao') || col.includes('descrição') || col.includes('motivo') || col.includes('obs')) descricaoIdx = idx;
      else if (col.includes('realizacao') || col.includes('realização') || (col.includes('data') && !col.includes('vencimento'))) dataRealizacaoIdx = idx;
      else if (col.includes('vencimento')) dataVencimentoIdx = idx;
      else if (col.includes('saldo') || col.includes('compensar') || col.includes('horas')) saldoIdx = idx;
      else if (col.includes('vencer') || col.includes('dias')) aVencerDiasIdx = idx;
    });
  }

  for (let i = startIndex; i < rawLines.length; i++) {
    const line = rawLines[i];
    const cols = parseCsvLine(line, delimiter);
    if (cols.length < 2) continue;

    const rawMatricula = cols[matriculaIdx] ?? (cols[0] || `MAT-${i}`);
    const rawNome = cols[nomeIdx] ?? cols[1] ?? '';
    const rawCargo = cols[cargoIdx] ?? '';
    const rawStatus = cols[statusIdx] ?? 'DÉBITO';
    const rawDescricao = cols[descricaoIdx] ?? '';
    const rawDataRealizacao = cols[dataRealizacaoIdx] ?? '';
    const rawDataVencimento = cols[dataVencimentoIdx] ?? '';
    const rawSaldo = cols[saldoIdx] ?? '00:00';
    const rawAVencerDias = cols[aVencerDiasIdx] ?? '0';

    if (!rawNome.trim() && !rawMatricula.trim()) {
      errors.push(`Linha ${i + 1}: Colaborador não identificado`);
      continue;
    }

    const isoRealizacao = parseDateToIso(rawDataRealizacao) || new Date().toISOString().slice(0, 10);
    const isoVencimento = parseDateToIso(rawDataVencimento) || undefined;
    const formattedSaldo = formatSaldoString(rawSaldo);

    let parsedDias = parseInt(rawAVencerDias.replace(/\D/g, ''), 10);
    if (isNaN(parsedDias)) {
      parsedDias = 0;
    }

    records.push({
      matricula: rawMatricula.trim(),
      nome_colaborador: rawNome.trim(),
      cargo: rawCargo.trim() || undefined,
      status: rawStatus.trim().toUpperCase(),
      descricao: rawDescricao.trim() || undefined,
      data_realizacao: isoRealizacao,
      data_vencimento: isoVencimento,
      saldo_a_compensar: formattedSaldo,
      a_vencer_em_dias: parsedDias,
      created_at: new Date().toISOString()
    });
  }

  return {
    records,
    totalLines: rawLines.length - startIndex,
    validCount: records.length,
    errors
  };
}
