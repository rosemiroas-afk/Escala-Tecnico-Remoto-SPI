import { ShiftType } from '../types';
import { parseDateKey } from './dateUtils';

export interface MasterGroupPattern {
  name: string;
  fractionLabel: string;
  dezembro: ShiftType[];
  janeiro: ShiftType[];
  transicaoFev: ShiftType[];
  novembro: ShiftType[];
}

/**
 * ESCALA OFICIAL 5x2 POR FRAÇÕES DE EQUIPE (1/3, 2/3, 3/3)
 * Mapeamento rigoroso extraído diretamente da planilha oficial enviada pelo gestor:
 * - Colaborador 1/3 (1º Terço do DDD ~33,3%)
 * - Colaborador 2/3 (2º Terço do DDD ~33,3%)
 * - Colaborador 3/3 (3º Terço do DDD ~33,3%)
 * 
 * Nomenclatura:
 * - TB: Dia de Trabalho
 * - FD: Folga Duplada (2 dias consecutivos de descanso, ex: Sáb e Dom)
 * - FG: Folga Geral Individual (1 dia isolado de descanso)
 */

// Mapeamento EXATO dia a dia de 30/11/2026 a 07/02/2027 (70 dias corridos)
export const OFFICIAL_IMAGE_EXACT_MAP: Record<string, { grupo1: ShiftType; grupo2: ShiftType; grupo3: ShiftType }> = {
  // LINHA 1: 30/11 a 03/01 (Dezembro e bordas)
  '2026-11-30': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Seg
  '2026-12-01': { grupo1: 'TB', grupo2: 'FG', grupo3: 'TB' }, // Ter
  '2026-12-02': { grupo1: 'TB', grupo2: 'TB', grupo3: 'FG' }, // Qua
  '2026-12-03': { grupo1: 'TB', grupo2: 'FG', grupo3: 'TB' }, // Qui
  '2026-12-04': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Sex
  '2026-12-05': { grupo1: 'FD', grupo2: 'TB', grupo3: 'TB' }, // Sáb
  '2026-12-06': { grupo1: 'FD', grupo2: 'TB', grupo3: 'FG' }, // Dom

  '2026-12-07': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Seg
  '2026-12-08': { grupo1: 'FG', grupo2: 'TB', grupo3: 'TB' }, // Ter
  '2026-12-09': { grupo1: 'TB', grupo2: 'FG', grupo3: 'TB' }, // Qua
  '2026-12-10': { grupo1: 'FG', grupo2: 'TB', grupo3: 'TB' }, // Qui
  '2026-12-11': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Sex
  '2026-12-12': { grupo1: 'TB', grupo2: 'TB', grupo3: 'FD' }, // Sáb
  '2026-12-13': { grupo1: 'TB', grupo2: 'FG', grupo3: 'FD' }, // Dom

  '2026-12-14': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Seg
  '2026-12-15': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Ter
  '2026-12-16': { grupo1: 'FG', grupo2: 'TB', grupo3: 'FG' }, // Qua
  '2026-12-17': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Qui
  '2026-12-18': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Sex
  '2026-12-19': { grupo1: 'TB', grupo2: 'FD', grupo3: 'TB' }, // Sáb
  '2026-12-20': { grupo1: 'FG', grupo2: 'FD', grupo3: 'TB' }, // Dom

  '2026-12-21': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Seg
  '2026-12-22': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Ter
  '2026-12-23': { grupo1: 'TB', grupo2: 'FG', grupo3: 'FG' }, // Qua
  '2026-12-24': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Qui
  '2026-12-25': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Sex
  '2026-12-26': { grupo1: 'FD', grupo2: 'TB', grupo3: 'FG' }, // Sáb
  '2026-12-27': { grupo1: 'FD', grupo2: 'TB', grupo3: 'TB' }, // Dom

  '2026-12-28': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Seg
  '2026-12-29': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Ter
  '2026-12-30': { grupo1: 'FG', grupo2: 'FG', grupo3: 'TB' }, // Qua
  '2026-12-31': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Qui
  '2027-01-01': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Sex
  '2027-01-02': { grupo1: 'TB', grupo2: 'FG', grupo3: 'FD' }, // Sáb
  '2027-01-03': { grupo1: 'TB', grupo2: 'TB', grupo3: 'FD' }, // Dom

  // LINHA 2: 04/01 a 07/02 (Janeiro e Fevereiro)
  '2027-01-04': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Seg
  '2027-01-05': { grupo1: 'TB', grupo2: 'TB', grupo3: 'FG' }, // Ter
  '2027-01-06': { grupo1: 'FG', grupo2: 'TB', grupo3: 'TB' }, // Qua
  '2027-01-07': { grupo1: 'TB', grupo2: 'TB', grupo3: 'FG' }, // Qui
  '2027-01-08': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Sex
  '2027-01-09': { grupo1: 'FG', grupo2: 'FD', grupo3: 'TB' }, // Sáb
  '2027-01-10': { grupo1: 'TB', grupo2: 'FD', grupo3: 'TB' }, // Dom

  '2027-01-11': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Seg
  '2027-01-12': { grupo1: 'TB', grupo2: 'FG', grupo3: 'TB' }, // Ter
  '2027-01-13': { grupo1: 'TB', grupo2: 'TB', grupo3: 'FG' }, // Qua
  '2027-01-14': { grupo1: 'TB', grupo2: 'FG', grupo3: 'TB' }, // Qui
  '2027-01-15': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Sex
  '2027-01-16': { grupo1: 'FD', grupo2: 'TB', grupo3: 'TB' }, // Sáb
  '2027-01-17': { grupo1: 'FD', grupo2: 'TB', grupo3: 'FG' }, // Dom

  '2027-01-18': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Seg
  '2027-01-19': { grupo1: 'FG', grupo2: 'TB', grupo3: 'TB' }, // Ter
  '2027-01-20': { grupo1: 'TB', grupo2: 'FG', grupo3: 'TB' }, // Qua
  '2027-01-21': { grupo1: 'FG', grupo2: 'TB', grupo3: 'TB' }, // Qui
  '2027-01-22': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Sex
  '2027-01-23': { grupo1: 'TB', grupo2: 'TB', grupo3: 'FD' }, // Sáb
  '2027-01-24': { grupo1: 'TB', grupo2: 'FG', grupo3: 'FD' }, // Dom

  '2027-01-25': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Seg
  '2027-01-26': { grupo1: 'TB', grupo2: 'TB', grupo3: 'FG' }, // Ter
  '2027-01-27': { grupo1: 'FG', grupo2: 'TB', grupo3: 'TB' }, // Qua
  '2027-01-28': { grupo1: 'TB', grupo2: 'TB', grupo3: 'FG' }, // Qui
  '2027-01-29': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Sex
  '2027-01-30': { grupo1: 'TB', grupo2: 'FD', grupo3: 'TB' }, // Sáb
  '2027-01-31': { grupo1: 'FG', grupo2: 'FD', grupo3: 'TB' }, // Dom

  '2027-02-01': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Seg
  '2027-02-02': { grupo1: 'TB', grupo2: 'FG', grupo3: 'TB' }, // Ter
  '2027-02-03': { grupo1: 'TB', grupo2: 'TB', grupo3: 'FG' }, // Qua
  '2027-02-04': { grupo1: 'TB', grupo2: 'FG', grupo3: 'TB' }, // Qui
  '2027-02-05': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Sex
  '2027-02-06': { grupo1: 'FD', grupo2: 'TB', grupo3: 'TB' }, // Sáb
  '2027-02-07': { grupo1: 'FD', grupo2: 'TB', grupo3: 'FG' }  // Dom
};

// Sequência explícita de Novembro 2026 (01/11 a 30/11) sincronizada com o rodízio
const NOVEMBRO_2026_MAP: Record<string, { grupo1: ShiftType; grupo2: ShiftType; grupo3: ShiftType }> = {
  '2026-11-01': { grupo1: 'TB', grupo2: 'FD', grupo3: 'TB' }, // Dom
  '2026-11-02': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Seg
  '2026-11-03': { grupo1: 'FG', grupo2: 'TB', grupo3: 'TB' }, // Ter
  '2026-11-04': { grupo1: 'TB', grupo2: 'FG', grupo3: 'TB' }, // Qua
  '2026-11-05': { grupo1: 'FG', grupo2: 'TB', grupo3: 'TB' }, // Qui
  '2026-11-06': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Sex
  '2026-11-07': { grupo1: 'TB', grupo2: 'TB', grupo3: 'FD' }, // Sáb
  '2026-11-08': { grupo1: 'TB', grupo2: 'TB', grupo3: 'FD' }, // Dom

  '2026-11-09': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Seg
  '2026-11-10': { grupo1: 'TB', grupo2: 'FG', grupo3: 'TB' }, // Ter
  '2026-11-11': { grupo1: 'TB', grupo2: 'TB', grupo3: 'FG' }, // Qua
  '2026-11-12': { grupo1: 'TB', grupo2: 'FG', grupo3: 'TB' }, // Qui
  '2026-11-13': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Sex
  '2026-11-14': { grupo1: 'FD', grupo2: 'TB', grupo3: 'TB' }, // Sáb
  '2026-11-15': { grupo1: 'FD', grupo2: 'TB', grupo3: 'FG' }, // Dom

  '2026-11-16': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Seg
  '2026-11-17': { grupo1: 'TB', grupo2: 'TB', grupo3: 'FG' }, // Ter
  '2026-11-18': { grupo1: 'FG', grupo2: 'TB', grupo3: 'TB' }, // Qua
  '2026-11-19': { grupo1: 'TB', grupo2: 'TB', grupo3: 'FG' }, // Qui
  '2026-11-20': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Sex
  '2026-11-21': { grupo1: 'TB', grupo2: 'FD', grupo3: 'TB' }, // Sáb
  '2026-11-22': { grupo1: 'FG', grupo2: 'FD', grupo3: 'TB' }, // Dom

  '2026-11-23': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Seg
  '2026-11-24': { grupo1: 'FG', grupo2: 'TB', grupo3: 'TB' }, // Ter
  '2026-11-25': { grupo1: 'TB', grupo2: 'FG', grupo3: 'TB' }, // Qua
  '2026-11-26': { grupo1: 'FG', grupo2: 'TB', grupo3: 'TB' }, // Qui
  '2026-11-27': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }, // Sex
  '2026-11-28': { grupo1: 'TB', grupo2: 'TB', grupo3: 'FD' }, // Sáb
  '2026-11-29': { grupo1: 'TB', grupo2: 'TB', grupo3: 'FD' }, // Dom
  '2026-11-30': { grupo1: 'TB', grupo2: 'TB', grupo3: 'TB' }  // Seg
};

// Padrões Cíclicos Semanais (Segunda a Domingo)
const CYCLE_WEEKS: Record<'semanaA' | 'semanaB' | 'semanaC', ShiftType[]> = {
  // Semana A: FDS Livre (Folga Sábado e Domingo)
  semanaA: ['TB', 'TB', 'TB', 'TB', 'TB', 'FD', 'FD'],
  // Semana B: Meio de Semana 1 (Folga Terça e Quinta)
  semanaB: ['TB', 'FG', 'TB', 'FG', 'TB', 'TB', 'TB'],
  // Semana C: Meio de Semana 2 (Folga Quarta e Domingo)
  semanaC: ['TB', 'TB', 'FG', 'TB', 'TB', 'TB', 'FG']
};

/**
 * Retorna o turno (TB, FD, FG) para um dia específico e para a fração do colaborador (1/3, 2/3, 3/3).
 * Prioridade:
 * 1. Mapeamento exato da imagem enviada pelo usuário (30/11/2026 a 07/02/2027)
 * 2. Mapeamento explícito de Novembro 2026
 * 3. Projeção perpétua de 3 semanas cíclicas por Monday-to-Sunday block
 */
export function getShiftFromMasterPattern(
  dateStr: string,
  groupKey: 'grupo1' | 'grupo2' | 'grupo3'
): ShiftType {
  // 1. Checa o mapa exato da imagem do usuário
  if (OFFICIAL_IMAGE_EXACT_MAP[dateStr]) {
    return OFFICIAL_IMAGE_EXACT_MAP[dateStr][groupKey];
  }

  // 2. Checa Novembro 2026
  if (NOVEMBRO_2026_MAP[dateStr]) {
    return NOVEMBRO_2026_MAP[dateStr][groupKey];
  }

  // 3. Projeção perpétua matemática:
  // Usa como âncora a Segunda-feira 30/11/2026 (epochAnchor = dia 0)
  const dt = parseDateKey(dateStr);
  const anchor = new Date(2026, 10, 30); // 30 Nov 2026
  const diffDays = Math.round((dt.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24));
  
  // Semana (Seg-Dom) relativa à âncora
  const weekIndex = Math.floor(diffDays / 7);
  // Dia da semana de 0 (Segunda) a 6 (Domingo)
  const dayOfWeek = (dt.getDay() + 6) % 7;

  // Ciclo tri-semanal de rodízio:
  // Na Semana 0 (30/11): grupo1=SemanaA, grupo2=SemanaB, grupo3=SemanaC
  const groupOffset = groupKey === 'grupo1' ? 0 : groupKey === 'grupo2' ? 1 : 2;
  const cycleWeekNumber = (((weekIndex + groupOffset) % 3) + 3) % 3;

  const weekPattern = cycleWeekNumber === 0
    ? CYCLE_WEEKS.semanaA
    : cycleWeekNumber === 1
    ? CYCLE_WEEKS.semanaB
    : CYCLE_WEEKS.semanaC;

  return weekPattern[dayOfWeek] || 'TB';
}

/**
 * Estrutura para os cards visuais da interface (Dezembro, Janeiro, Fev, Nov)
 */
const getMonthArray = (year: number, monthIndex: number, group: 'grupo1' | 'grupo2' | 'grupo3'): ShiftType[] => {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const res: ShiftType[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    res.push(getShiftFromMasterPattern(dStr, group));
  }
  return res;
};

export const MASTER_PATTERN_5X2: Record<'grupo1' | 'grupo2' | 'grupo3', MasterGroupPattern> = {
  grupo1: {
    name: 'Colaborador 1/3',
    fractionLabel: '1º Terço do DDD (~33,3%)',
    dezembro: getMonthArray(2026, 11, 'grupo1'),
    janeiro: getMonthArray(2027, 0, 'grupo1'),
    transicaoFev: [
      getShiftFromMasterPattern('2027-02-01', 'grupo1'),
      getShiftFromMasterPattern('2027-02-02', 'grupo1'),
      getShiftFromMasterPattern('2027-02-03', 'grupo1'),
      getShiftFromMasterPattern('2027-02-04', 'grupo1'),
      getShiftFromMasterPattern('2027-02-05', 'grupo1'),
      getShiftFromMasterPattern('2027-02-06', 'grupo1'),
      getShiftFromMasterPattern('2027-02-07', 'grupo1')
    ],
    novembro: getMonthArray(2026, 10, 'grupo1')
  },
  grupo2: {
    name: 'Colaborador 2/3',
    fractionLabel: '2º Terço do DDD (~33,3%)',
    dezembro: getMonthArray(2026, 11, 'grupo2'),
    janeiro: getMonthArray(2027, 0, 'grupo2'),
    transicaoFev: [
      getShiftFromMasterPattern('2027-02-01', 'grupo2'),
      getShiftFromMasterPattern('2027-02-02', 'grupo2'),
      getShiftFromMasterPattern('2027-02-03', 'grupo2'),
      getShiftFromMasterPattern('2027-02-04', 'grupo2'),
      getShiftFromMasterPattern('2027-02-05', 'grupo2'),
      getShiftFromMasterPattern('2027-02-06', 'grupo2'),
      getShiftFromMasterPattern('2027-02-07', 'grupo2')
    ],
    novembro: getMonthArray(2026, 10, 'grupo2')
  },
  grupo3: {
    name: 'Colaborador 3/3',
    fractionLabel: '3º Terço do DDD (~33,3%)',
    dezembro: getMonthArray(2026, 11, 'grupo3'),
    janeiro: getMonthArray(2027, 0, 'grupo3'),
    transicaoFev: [
      getShiftFromMasterPattern('2027-02-01', 'grupo3'),
      getShiftFromMasterPattern('2027-02-02', 'grupo3'),
      getShiftFromMasterPattern('2027-02-03', 'grupo3'),
      getShiftFromMasterPattern('2027-02-04', 'grupo3'),
      getShiftFromMasterPattern('2027-02-05', 'grupo3'),
      getShiftFromMasterPattern('2027-02-06', 'grupo3'),
      getShiftFromMasterPattern('2027-02-07', 'grupo3')
    ],
    novembro: getMonthArray(2026, 10, 'grupo3')
  }
};

export function resolvePatternKey(
  monthNum: number,
  forcedCycle?: 'dezembro' | 'janeiro' | 'transicao_fev' | 'novembro' | 'auto'
): 'dezembro' | 'janeiro' | 'transicaoFev' | 'novembro' {
  if (forcedCycle === 'dezembro') return 'dezembro';
  if (forcedCycle === 'janeiro') return 'janeiro';
  if (forcedCycle === 'transicao_fev') return 'transicaoFev';
  if (forcedCycle === 'novembro') return 'novembro';

  if (monthNum === 11) return 'novembro';
  if (monthNum === 12) return 'dezembro';
  if (monthNum === 1) return 'janeiro';
  if (monthNum === 2) return 'transicaoFev';
  return monthNum % 2 !== 0 ? 'novembro' : 'dezembro';
}

export function getNextMonthInfo(year: number, monthIndex: number) {
  const nextMonthIndex = (monthIndex + 1) % 12;
  const nextYear = monthIndex === 11 ? year + 1 : year;
  const nextMonthNum = nextMonthIndex + 1;
  const nextPatternKey = resolvePatternKey(nextMonthNum);
  return {
    year: nextYear,
    monthIndex: nextMonthIndex,
    monthNum: nextMonthNum,
    patternKey: nextPatternKey
  };
}
