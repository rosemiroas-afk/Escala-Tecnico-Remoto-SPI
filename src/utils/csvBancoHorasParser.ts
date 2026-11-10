import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { BancoHorasRecord } from '../types';
import { parseDateToIso } from './csvScheduleParser';

export interface ParseBancoHorasResult {
  records: BancoHorasRecord[];
  totalLines: number;
  validCount: number;
  errors: string[];
}

/**
 * Normaliza string de saldo em formato padronizado com sinal (+HH:MM ou -HH:MM)
 */
export function formatSaldoString(raw: string, forcedNegative?: boolean): string {
  if (!raw) return '00:00';
  const clean = String(raw).trim().replace(/^["']|["']$/g, '');
  if (!clean) return '00:00';

  const isNegative =
    forcedNegative ||
    clean.includes('-') ||
    clean.toLowerCase().includes('debito') ||
    clean.toLowerCase().includes('débito');

  const match = clean.match(/(\d+):(\d+)/);
  if (match) {
    const hours = Math.abs(parseInt(match[1], 10) || 0);
    const mins = Math.abs(parseInt(match[2], 10) || 0);
    const sign = isNegative ? '-' : '+';
    const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
    return `${sign}${formattedHours}:${String(mins).padStart(2, '0')}`;
  }

  const numericOnly = clean.replace(/[^0-9:.,-]/g, '').replace(',', '.');
  const floatVal = parseFloat(numericOnly);
  if (!isNaN(floatVal)) {
    const absVal = Math.abs(floatVal);
    const hours = Math.floor(absVal);
    const mins = Math.round((absVal - hours) * 60);
    const sign = isNegative || floatVal < 0 ? '-' : '+';
    const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
    return `${sign}${formattedHours}:${String(mins).padStart(2, '0')}`;
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
    matricula: String(row.matricula || row.id_usuario || row.colaborador_id || row.func_id || ''),
    nome_colaborador: String(row.nome_colaborador || row.nome || row.colaborador || row.nome_funcionario || row.name || ''),
    cargo: row.cargo || undefined,
    status: statusRaw || (descFinal.toUpperCase().includes('CREDITO') ? 'CRÉDITO' : 'DÉBITO'),
    descricao: descFinal,
    data_realizacao: row.data_realizacao || row.data || undefined,
    data_vencimento: row.data_vencimento || row.vencimento || undefined,
    saldo_a_compensar: saldoRaw,
    saldo_compensar: saldoRaw,
    a_vencer_em_dias: Number(row.a_vencer_em_dias ?? row.vencer_em_dias ?? row.dias_vencimento ?? row.dias_a_vencer ?? 0),
    created_at: row.created_at || row.updated_at,
    updated_at: row.updated_at
  };
}

/**
 * Comparador inteligente de nomes de colaboradores
 * Suporta abreviações do meio (ex: 'Ayrton Cesar S. Pereira' -> 'AYRTON CESAR DOS SANTOS PEREIRA')
 */
export function isCollaboratorNameMatch(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;
  const normA = normalizeName(nameA);
  const normB = normalizeName(nameB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  const stopWords = ['DE', 'DA', 'DO', 'DOS', 'DAS', 'E'];
  const tokensA = normA.split(' ').filter(t => t.length > 0 && !stopWords.includes(t));
  const tokensB = normB.split(' ').filter(t => t.length > 0 && !stopWords.includes(t));

  if (tokensA.length === 0 || tokensB.length === 0) return false;

  const firstA = tokensA[0];
  const firstB = tokensB[0];
  const lastA = tokensA[tokensA.length - 1];
  const lastB = tokensB[tokensB.length - 1];

  // Se o primeiro e o último nome batem exatamente
  if (firstA === firstB && lastA === lastB) {
    return true;
  }

  // Se o primeiro nome bate e há correspondência nas iniciais ou tokens do meio
  if (firstA === firstB) {
    const hasCommonMiddle = tokensA.slice(1).some(tA =>
      tokensB.slice(1).some(tB => tA === tB || (tA.length === 1 && tB.startsWith(tA)) || (tB.length === 1 && tA.startsWith(tB)))
    );
    if (hasCommonMiddle && (lastA === lastB || tokensB.includes(lastA) || tokensA.includes(lastB))) {
      return true;
    }
  }

  return false;
}

/**
 * Compatibilidade legada apontando para o motor central
 */
export const saldoToMinutes = (saldo: string, status?: string): number => hmToMin(saldo, status);
export const minutesToSaldo = (totalMinutes: number): string => formatHM(totalMinutes);

/**
 * PARSER DE PLANILHA / MATRIZ DE COLUNAS SEPARADAS (PADRÃO PLANILHA)
 * Mapeamento direto das colunas:
 * - Coluna 0 (ou 'FUNC_ID'): ID do funcionário
 * - Coluna 1 (ou 'NOME'): Nome do colaborador
 * - Coluna 2 (ou 'CARGO'): Cargo do colaborador
 * - Coluna 3 (ou 'STATUS'): Status do colaborador (ex: Ativo)
 * - Coluna 4 (ou 'DESCRICAO'): Descrição do lançamento (onde checaremos se contém 'DEBITO' ou 'CREDITO')
 * - Coluna 5 (ou 'DATA REALIZAÇÃO'): Data de realização
 * - Coluna 6 (ou 'DATA VENCIMENTO'): Data de vencimento
 * - Coluna 7 (ou 'SALDO A COMPENSAR'): Horário em formato HH:MM
 * - Coluna 8 (ou 'A_VENCER_EM_DIAS'): Dias a vencer
 */
export function parseMatrixToBancoHoras(rawMatrix: (string | number | any)[][]): ParseBancoHorasResult {
  if (!rawMatrix || rawMatrix.length === 0) {
    return {
      records: [],
      totalLines: 0,
      validCount: 0,
      errors: ['O arquivo de planilha está vazio.']
    };
  }

  // Limpa linhas em branco ou vazias
  const matrix = rawMatrix.filter(row => row && Array.isArray(row) && row.some(cell => String(cell ?? '').trim() !== ''));

  if (matrix.length === 0) {
    return {
      records: [],
      totalLines: 0,
      validCount: 0,
      errors: ['O arquivo de planilha não contém linhas válidas.']
    };
  }

  // Índices padrão conforme regra estrita do usuário:
  let funcIdIdx = 0;
  let nomeIdx = 1;
  let cargoIdx = 2;
  let statusIdx = 3;
  let descricaoIdx = 4;
  let dataRealizacaoIdx = 5;
  let dataVencimentoIdx = 6;
  let saldoIdx = 7;
  let aVencerDiasIdx = 8;

  let startIndex = 0;

  // Varre as primeiras 5 linhas para encontrar a linha de cabeçalho real
  for (let r = 0; r < Math.min(5, matrix.length); r++) {
    const rowCols = matrix[r].map(c => String(c ?? '').toLowerCase().trim());
    const isHeader = rowCols.some(c =>
      c.includes('func') ||
      c.includes('matricula') ||
      c.includes('matrícula') ||
      c.includes('id') ||
      c.includes('nome') ||
      c.includes('status') ||
      c.includes('descricao') ||
      c.includes('descrição') ||
      c.includes('saldo') ||
      c.includes('compensar') ||
      c.includes('vencer')
    );

    if (isHeader) {
      startIndex = r + 1;
      rowCols.forEach((col, idx) => {
        if (col.includes('func') || col.includes('matricula') || col.includes('matrícula') || col === 'id' || col.includes('id_colaborador')) {
          funcIdIdx = idx;
        } else if (col.includes('nome') || col.includes('colaborador') || col.includes('funcionario') || col.includes('funcionário')) {
          nomeIdx = idx;
        } else if (col.includes('cargo') || col.includes('funcao') || col.includes('função')) {
          cargoIdx = idx;
        } else if (col.includes('status') || col.includes('situacao') || col.includes('situação')) {
          statusIdx = idx;
        } else if (col.includes('descricao') || col.includes('descrição') || col.includes('motivo') || col.includes('lancamento') || col.includes('lançamento') || col.includes('obs')) {
          descricaoIdx = idx;
        } else if (col.includes('realizacao') || col.includes('realização') || (col.includes('data') && !col.includes('vencimento'))) {
          dataRealizacaoIdx = idx;
        } else if (col.includes('vencimento')) {
          dataVencimentoIdx = idx;
        } else if (col.includes('saldo') || col.includes('compensar') || col.includes('horas')) {
          saldoIdx = idx;
        } else if (col.includes('vencer') || col.includes('dias')) {
          aVencerDiasIdx = idx;
        }
      });
      break;
    }
  }

  const records: BancoHorasRecord[] = [];
  const errors: string[] = [];

  for (let i = startIndex; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.length < 2) continue;

    const rawFuncId = String(row[funcIdIdx] ?? row[0] ?? '').trim();
    const rawNome = String(row[nomeIdx] ?? row[1] ?? '').trim();
    const rawCargo = String(row[cargoIdx] ?? (row[2] !== undefined ? row[2] : '') ?? '').trim();
    const rawStatusAtivo = String(row[statusIdx] ?? (row[3] !== undefined ? row[3] : 'Ativo') ?? 'Ativo').trim();
    const rawDescricao = String(row[descricaoIdx] ?? (row[4] !== undefined ? row[4] : '') ?? '').trim();
    const rawDataRealizacao = String(row[dataRealizacaoIdx] ?? (row[5] !== undefined ? row[5] : '') ?? '').trim();
    const rawDataVencimento = String(row[dataVencimentoIdx] ?? (row[6] !== undefined ? row[6] : '') ?? '').trim();
    const rawSaldo = String(row[saldoIdx] ?? (row[7] !== undefined ? row[7] : '00:00') ?? '00:00').trim();
    const rawDias = String(row[aVencerDiasIdx] ?? (row[8] !== undefined ? row[8] : '0') ?? '0').trim();

    if (!rawNome && !rawFuncId) {
      continue;
    }

    // Descarta linhas repetidas de cabeçalho
    const isHeaderRow =
      rawNome.toLowerCase() === 'nome' ||
      rawNome.toLowerCase().includes('colaborador') ||
      rawFuncId.toLowerCase().includes('matricula') ||
      rawFuncId.toLowerCase().includes('matrícula') ||
      rawFuncId.toLowerCase().includes('func_id') ||
      rawSaldo.toLowerCase().includes('saldo') ||
      rawSaldo.toLowerCase().includes('compensar') ||
      rawDescricao.toLowerCase().includes('descricao') ||
      rawDescricao.toLowerCase().includes('descrição');
    if (isHeaderRow) {
      continue;
    }

    // REGRA DE OURO NA COLUNA 4 ('DESCRICAO'):
    // Checamos se contém 'DEBITO' ou 'CREDITO'
    const descUpper = rawDescricao.toUpperCase();
    const isDebito = descUpper.includes('DEBITO') || descUpper.includes('DÉBITO') || rawSaldo.startsWith('-');
    const isCredito = descUpper.includes('CREDITO') || descUpper.includes('CRÉDITO') || (!isDebito && (rawSaldo.startsWith('+') || !rawSaldo.startsWith('-')));

    const tipoFinal: 'DÉBITO' | 'CRÉDITO' = isDebito ? 'DÉBITO' : 'CRÉDITO';

    // Formatação precisa do saldo HH:MM respeitando o tipo
    const formattedSaldo = formatSaldoString(rawSaldo, isDebito);

    // Garante que a coluna 'descricao' contenha a palavra chave 'DEBITO' ou 'CREDITO'
    let finalDescricao = rawDescricao;
    if (isDebito && !descUpper.includes('DEBITO')) {
      finalDescricao = finalDescricao ? `${finalDescricao} - DÉBITO` : 'BANCO DE HORAS - DÉBITO';
    } else if (isCredito && !descUpper.includes('CREDITO')) {
      finalDescricao = finalDescricao ? `${finalDescricao} - CRÉDITO` : 'BANCO DE HORAS - CRÉDITO';
    }
    if (!finalDescricao) {
      finalDescricao = `BANCO DE HORAS - ${tipoFinal}`;
    }

    const isoRealizacao = parseDateToIso(rawDataRealizacao) || new Date().toISOString().slice(0, 10);
    const isoVencimento = parseDateToIso(rawDataVencimento) || undefined;

    let parsedDias = parseInt(rawDias.replace(/\D/g, ''), 10);
    if (isNaN(parsedDias)) {
      parsedDias = 0;
    }

    records.push({
      matricula: rawFuncId || `FUNC-${i}`,
      nome_colaborador: rawNome,
      cargo: rawCargo || (rawStatusAtivo !== 'Ativo' && rawStatusAtivo !== 'A' ? rawStatusAtivo : undefined),
      status: tipoFinal,
      descricao: finalDescricao,
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
    totalLines: matrix.length - startIndex,
    validCount: records.length,
    errors
  };
}

/**
 * Lê string de CSV utilizando PapaParse em modo matriz de colunas nativas (sem juntar em texto único)
 */
export function parseBancoHorasCsv(content: string): ParseBancoHorasResult {
  const cleanContent = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;

  // PapaParse mapeia o arquivo automaticamente como matriz de colunas separadas
  const parsed = Papa.parse<(string | number)[]>(cleanContent, {
    header: false,
    skipEmptyLines: 'greedy',
    delimiter: '', // auto-detecta: tabulação, ponto e vírgula, vírgula, pipe
    dynamicTyping: false
  });

  const matrix = parsed.data || [];
  return parseMatrixToBancoHoras(matrix);
}

/**
 * Lê qualquer arquivo (.csv, .xlsx, .xls, .tsv, .txt) diretamente como matriz de colunas
 */
export async function parseBancoHorasFile(file: File): Promise<ParseBancoHorasResult> {
  const fileName = file.name.toLowerCase();

  // Se for planilha binária do Excel (.xlsx ou .xls)
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as (string | number)[][];
      return parseMatrixToBancoHoras(matrix);
    } catch (err) {
      console.warn('Falha no parser binário XLSX, tentando ler como texto:', err);
    }
  }

  // Arquivo de texto CSV / TSV / TXT lido via PapaParse
  const text = await file.text();
  return parseBancoHorasCsv(text);
}
