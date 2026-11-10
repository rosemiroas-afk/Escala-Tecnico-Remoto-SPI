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
 * Converte o formato 'HH:MM' (da coluna saldo_compensar/saldo_a_compensar) para minutos inteiros.
 * Se o registro/descrição for do tipo 'DEBITO', o valor em minutos é tratado como negativo.
 * Se for 'CREDITO', é tratado como positivo.
 */
export function hmToMin(valorString: string, statusOrDescricao?: string): number {
  if (!valorString) return 0;
  const clean = String(valorString).trim();
  if (!clean) return 0;

  const descUpper = (statusOrDescricao || '').toUpperCase().trim();
  const isDebito = descUpper.includes('DEBITO') || descUpper.includes('DÉBITO');
  const isCredito = descUpper.includes('CREDITO') || descUpper.includes('CRÉDITO');

  const startsWithMinus = clean.startsWith('-');
  const startsWithPlus = clean.startsWith('+');

  const match = clean.match(/(\d+):(\d+)/);
  let absMinutes = 0;

  if (match) {
    const hrs = parseInt(match[1], 10) || 0;
    const mins = parseInt(match[2], 10) || 0;
    absMinutes = hrs * 60 + mins;
  } else {
    const numericOnly = clean.replace(/[^0-9.,-]/g, '').replace(',', '.');
    const floatVal = parseFloat(numericOnly);
    if (!isNaN(floatVal)) {
      absMinutes = Math.round(Math.abs(floatVal) * 60);
    }
  }

  if (isDebito) {
    return -absMinutes;
  }
  if (isCredito) {
    return absMinutes;
  }
  if (startsWithMinus || clean.includes('-')) {
    return -absMinutes;
  }
  if (startsWithPlus) {
    return absMinutes;
  }

  return absMinutes;
}

/**
 * REGRA DE OURO DO SISTEMA:
 * Ao ler as linhas da tabela 'banco_horas' no Supabase:
 * - Se 'descricao' tiver a palavra 'DEBITO', converte 'saldo_compensar' para minutos e classifica como DÉBITO.
 * - Se 'descricao' tiver a palavra 'CREDITO', converte 'saldo_compensar' para minutos e classifica como CRÉDITO.
 */
export function parseBancoHorasRowMinutes(row: {
  descricao?: string;
  saldo_compensar?: string;
  saldo_a_compensar?: string;
  status?: string;
}): { minutos: number; isDebito: boolean; isCredito: boolean } {
  const descRaw = String(row.descricao || '').toUpperCase();
  const statusRaw = String(row.status || '').toUpperCase();
  const fullText = `${descRaw} ${statusRaw}`.trim();

  const valorStr = String(row.saldo_compensar || row.saldo_a_compensar || '00:00').trim();
  const match = valorStr.match(/(\d+):(\d+)/);
  let absMinutes = 0;

  if (match) {
    const hrs = parseInt(match[1], 10) || 0;
    const mins = parseInt(match[2], 10) || 0;
    absMinutes = hrs * 60 + mins;
  } else {
    const numericOnly = valorStr.replace(/[^0-9.,-]/g, '').replace(',', '.');
    const floatVal = parseFloat(numericOnly);
    if (!isNaN(floatVal)) {
      absMinutes = Math.round(Math.abs(floatVal) * 60);
    }
  }

  // 1. Se 'descricao' tiver 'DEBITO'
  if (fullText.includes('DEBITO') || fullText.includes('DÉBITO')) {
    return { minutos: absMinutes, isDebito: true, isCredito: false };
  }

  // 2. Se 'descricao' tiver 'CREDITO'
  if (fullText.includes('CREDITO') || fullText.includes('CRÉDITO')) {
    return { minutos: absMinutes, isDebito: false, isCredito: true };
  }

  // Fallback seguro baseado no sinal do saldo
  const isNegative = valorStr.startsWith('-');
  return {
    minutos: absMinutes,
    isDebito: isNegative,
    isCredito: !isNegative
  };
}

/**
 * Converte minutos inteiros de volta para o formato '[+|-]HH:MM'.
 * Exemplo: Se o saldo for negativo (-17194 min) -> '-286:34'
 *          Se o saldo for positivo (+765 min)   -> '+12:45'
 *          Se o saldo for zero                  -> '00:00'
 */
export function formatHM(minutosTotais: number): string {
  if (isNaN(minutosTotais) || minutosTotais === 0) {
    return '00:00';
  }

  const isNegative = minutosTotais < 0;
  const absMins = Math.abs(Math.round(minutosTotais));
  const hours = Math.floor(absMins / 60);
  const remainingMins = absMins % 60;

  const sign = isNegative ? '-' : '+';
  const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
  const formattedMins = String(remainingMins).padStart(2, '0');

  return `${sign}${formattedHours}:${formattedMins}`;
}

/**
 * Normaliza qualquer linha vinda da tabela 'banco_horas' do Supabase garantindo
 * a presença das colunas 'descricao' e 'saldo_compensar' devidamente indexadas.
 */
export function normalizeBancoHorasRecord(row: any): BancoHorasRecord {
  const descRaw = String(row.descricao || row.motivo || row.description || '').trim();
  const statusRaw = String(row.status || '').trim().toUpperCase();
  const saldoRaw = String(row.saldo_compensar || row.saldo_a_compensar || row.saldo || row.saldo_horas || '00:00').trim();

  let descFinal = descRaw;
  if (!descFinal) {
    descFinal = statusRaw ? `BANCO DE HORAS - ${statusRaw}` : 'BANCO DE HORAS';
  } else if (!descFinal.toUpperCase().includes('DEBITO') && !descFinal.toUpperCase().includes('CREDITO')) {
    if (statusRaw) {
      descFinal = `${descFinal} (${statusRaw})`;
    }
  }

  return {
    id: row.id ? String(row.id) : undefined,
    matricula: String(row.matricula || row.id_usuario || row.colaborador_id || ''),
    nome_colaborador: String(row.nome_colaborador || row.nome || row.colaborador || row.nome_funcionario || row.name || ''),
    cargo: row.cargo || undefined,
    status: statusRaw || (descFinal.toUpperCase().includes('CREDITO') ? 'CRÉDITO' : 'DÉBITO'),
    descricao: descFinal,
    data_realizacao: row.data_realizacao || row.data || undefined,
    data_vencimento: row.data_vencimento || row.vencimento || undefined,
    saldo_a_compensar: saldoRaw,
    saldo_compensar: saldoRaw,
    a_vencer_em_dias: Number(row.a_vencer_em_dias ?? row.vencer_em_dias ?? row.dias_vencimento ?? row.dias_a_vencer ?? 0),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

/**
 * Compatibilidade legada apontando para o motor central
 */
export const saldoToMinutes = (saldo: string, status?: string): number => hmToMin(saldo, status);
export const minutesToSaldo = (totalMinutes: number): string => formatHM(totalMinutes);





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

    const statusUpper = rawStatus.trim().toUpperCase();
    let descIndexed = rawDescricao.trim();
    if (!descIndexed) {
      descIndexed = `BANCO DE HORAS - ${statusUpper}`;
    } else {
      const descUp = descIndexed.toUpperCase();
      if (!descUp.includes('DEBITO') && !descUp.includes('CREDITO')) {
        descIndexed = `${descIndexed} (${statusUpper})`;
      }
    }

    records.push({
      matricula: rawMatricula.trim(),
      nome_colaborador: rawNome.trim(),
      cargo: rawCargo.trim() || undefined,
      status: statusUpper,
      descricao: descIndexed,
      data_realizacao: isoRealizacao,
      data_vencimento: isoVencimento,
      saldo_a_compensar: formattedSaldo,
      saldo_compensar: formattedSaldo,
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
