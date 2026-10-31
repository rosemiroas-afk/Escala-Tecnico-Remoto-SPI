import { ShiftType } from '../types';

export interface ParsedScheduleRow {
  date: string; // YYYY-MM-DD
  name: string;
  ddd?: number;
  shiftHours?: string;
  status: ShiftType;
}

export interface ParseResult {
  rows: ParsedScheduleRow[];
  totalLines: number;
  validRowsCount: number;
  uniqueNames: string[];
  errors: string[];
}

export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseDateToIso(raw: string): string | null {
  if (!raw) return null;
  const clean = raw.trim().replace(/^["']|["']$/g, '');

  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(clean)) {
    const [y, m, d] = clean.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Format: DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(clean)) {
    const parts = clean.split(/[/-]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }

  // Format: DD/MM/YY or DD-MM-YY
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2}$/.test(clean)) {
    const parts = clean.split(/[/-]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = `20${parts[2]}`;
    return `${year}-${month}-${day}`;
  }

  return null;
}

export function normalizeShiftCode(raw: string): ShiftType {
  const clean = raw.trim().toUpperCase().replace(/^["']|["']$/g, '');
  if (clean === 'T') return 'TB';
  if (clean === 'F') return 'FG';
  if (clean === 'FE') return 'FR';
  if (clean === 'LI') return 'LIC';
  if (clean === 'AT') return 'A';

  const validCodes: ShiftType[] = ['TB', 'FG', 'FD', 'FR', 'FN', 'FB', 'FC', 'LIC', 'A', 'LP', 'TR', 'FM'];
  if (validCodes.includes(clean as ShiftType)) {
    return clean as ShiftType;
  }

  return clean ? (clean as ShiftType) : 'TB';
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
 * Parses structured long CSV/text schedule with pattern:
 * Data, Nome, DDD, Escala (Horário), Status
 */
export function parseScheduleLongCsv(content: string): ParseResult {
  // Strip UTF-8 BOM if present
  const cleanContent = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
  const rawLines = cleanContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  if (rawLines.length === 0) {
    return {
      rows: [],
      totalLines: 0,
      validRowsCount: 0,
      uniqueNames: [],
      errors: ['O arquivo selecionado está vazio.']
    };
  }

  const delimiter = detectDelimiter(rawLines);
  const rows: ParsedScheduleRow[] = [];
  const errors: string[] = [];
  const uniqueNamesSet = new Set<string>();

  let dataColIdx = 0;
  let nomeColIdx = 1;
  let dddColIdx = 2;
  let escalaColIdx = 3;
  let statusColIdx = 4;

  let startIndex = 0;
  const firstLineCols = parseCsvLine(rawLines[0], delimiter).map(c => c.toLowerCase());

  // Check if first row is header
  const isHeader = firstLineCols.some(c =>
    c.includes('data') ||
    c.includes('nome') ||
    c.includes('status') ||
    c.includes('colaborador') ||
    c.includes('escala')
  );

  if (isHeader) {
    startIndex = 1;
    firstLineCols.forEach((col, idx) => {
      if (col.includes('data') || col.includes('date')) dataColIdx = idx;
      else if (col.includes('nome') || col.includes('tecnico') || col.includes('colaborador')) nomeColIdx = idx;
      else if (col.includes('ddd') || col.includes('regiao')) dddColIdx = idx;
      else if (col.includes('escala') || col.includes('horario') || col.includes('turno')) {
        // If status isn't matched yet and column is just 'status', statusColIdx wins
        if (!col.includes('status')) escalaColIdx = idx;
      }
      if (col.includes('status') || col.includes('legenda')) statusColIdx = idx;
    });
  }

  for (let i = startIndex; i < rawLines.length; i++) {
    const line = rawLines[i];
    const cols = parseCsvLine(line, delimiter);
    if (cols.length < 2) continue;

    let rawDate = cols[dataColIdx] ?? '';
    let rawNome = cols[nomeColIdx] ?? '';
    let rawDdd = cols[dddColIdx] ?? '';
    let rawEscala = cols[escalaColIdx] ?? '';
    let rawStatus = cols[statusColIdx] ?? '';

    // Smart fallback if indices didn't match perfectly (e.g. 4 columns without DDD)
    if (!parseDateToIso(rawDate)) {
      // Find the column that has a valid date
      const foundDateIdx = cols.findIndex(c => parseDateToIso(c) !== null);
      if (foundDateIdx !== -1) {
        rawDate = cols[foundDateIdx];
        // Guess other columns
        const remaining = cols.filter((_, idx) => idx !== foundDateIdx);
        if (remaining.length >= 1) rawNome = remaining[0];
        if (remaining.length >= 2) {
          // Last column is usually status
          rawStatus = remaining[remaining.length - 1];
        }
      }
    }

    const isoDate = parseDateToIso(rawDate);
    if (!isoDate) {
      errors.push(`Linha ${i + 1}: Data inválida "${rawDate}"`);
      continue;
    }

    const cleanNome = rawNome.trim().replace(/^["']|["']$/g, '').toUpperCase();
    if (!cleanNome) {
      errors.push(`Linha ${i + 1}: Nome do colaborador não informado`);
      continue;
    }

    const cleanStatus = normalizeShiftCode(rawStatus);

    let parsedDdd: number | undefined;
    const dddDigits = rawDdd.replace(/\D/g, '');
    if (dddDigits) {
      const d = parseInt(dddDigits, 10);
      if (!isNaN(d)) parsedDdd = d;
    }

    const cleanEscala = rawEscala ? rawEscala.trim().replace(/^["']|["']$/g, '') : undefined;

    rows.push({
      date: isoDate,
      name: cleanNome,
      ddd: parsedDdd,
      shiftHours: cleanEscala,
      status: cleanStatus
    });

    uniqueNamesSet.add(cleanNome);
  }

  return {
    rows,
    totalLines: rawLines.length - startIndex,
    validRowsCount: rows.length,
    uniqueNames: Array.from(uniqueNamesSet),
    errors
  };
}
