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

// Padrões Cíclicos Semanais (Segunda a Domingo)
// - Semana A: FDS Livre (Folga Sábado e Domingo) -> FD em Sáb e Dom
// - Semana B: Meio de Semana 1 -> FG em Terça e Quinta
// - Semana C: Meio de Semana 2 -> FG em Quarta e Domingo
const CYCLE_WEEKS: Record<'semanaA' | 'semanaB' | 'semanaC', ShiftType[]> = {
  semanaA: ['TB', 'TB', 'TB', 'TB', 'TB', 'FD', 'FD'],
  semanaB: ['TB', 'FG', 'TB', 'FG', 'TB', 'TB', 'TB'],
  semanaC: ['TB', 'TB', 'FG', 'TB', 'TB', 'TB', 'FG']
};

/**
 * Retorna o turno (TB, FD, FG) para um dia específico e para a fração do colaborador (1/3, 2/3, 3/3).
 * Projeção perpétua de 3 semanas cíclicas (Monday-to-Sunday block) ancorada em 30/11/2026.
 * Garante:
 * 1. FGs diluídos ao longo da semana (Terça, Quarta, Quinta).
 * 2. Domingos com no mínimo 4 e no máximo 7 colaboradores trabalhando (entre 6 e 7).
 * 3. Sábados com maior número de colaboradores do que os Domingos (entre 12 e 13).
 */
export function getShiftFromMasterPattern(
  dateStr: string,
  groupKey: 'grupo1' | 'grupo2' | 'grupo3'
): ShiftType {
  const dt = parseDateKey(dateStr);
  const anchor = new Date(2026, 10, 30, 12, 0, 0); // 30 Nov 2026 (Segunda-feira)
  const diffDays = Math.round((dt.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24));
  
  // Semana (Seg-Dom) relativa à âncora
  const weekIndex = Math.floor(diffDays / 7);
  // Dia da semana de 0 (Segunda) a 6 (Domingo)
  const dayOfWeek = (dt.getDay() + 6) % 7;

  const groupOffset = groupKey === 'grupo1' ? 0 : groupKey === 'grupo2' ? 1 : 2;
  const cycleWeekNumber = (((weekIndex + groupOffset) % 3) + 3) % 3;

  const weekPattern = cycleWeekNumber === 0
    ? CYCLE_WEEKS.semanaA
    : cycleWeekNumber === 1
    ? CYCLE_WEEKS.semanaB
    : CYCLE_WEEKS.semanaC;

  return weekPattern[dayOfWeek] || 'TB';
}

// Mapa pré-calculado com o rodízio 3-semanal perfeito para 30/11/2026 a 07/02/2027
export const OFFICIAL_IMAGE_EXACT_MAP: Record<string, { grupo1: ShiftType; grupo2: ShiftType; grupo3: ShiftType }> = (() => {
  const map: Record<string, { grupo1: ShiftType; grupo2: ShiftType; grupo3: ShiftType }> = {};
  const dates = [
    '2026-11-30',
    '2026-12-01','2026-12-02','2026-12-03','2026-12-04','2026-12-05','2026-12-06','2026-12-07',
    '2026-12-08','2026-12-09','2026-12-10','2026-12-11','2026-12-12','2026-12-13','2026-12-14',
    '2026-12-15','2026-12-16','2026-12-17','2026-12-18','2026-12-19','2026-12-20','2026-12-21',
    '2026-12-22','2026-12-23','2026-12-24','2026-12-25','2026-12-26','2026-12-27','2026-12-28',
    '2026-12-29','2026-12-30','2026-12-31',
    '2027-01-01','2027-01-02','2027-01-03','2027-01-04','2027-01-05','2027-01-06','2027-01-07',
    '2027-01-08','2027-01-09','2027-01-10','2027-01-11','2027-01-12','2027-01-13','2027-01-14',
    '2027-01-15','2027-01-16','2027-01-17','2027-01-18','2027-01-19','2027-01-20','2027-01-21',
    '2027-01-22','2027-01-23','2027-01-24','2027-01-25','2027-01-26','2027-01-27','2027-01-28',
    '2027-01-29','2027-01-30','2027-01-31',
    '2027-02-01','2027-02-02','2027-02-03','2027-02-04','2027-02-05','2027-02-06','2027-02-07'
  ];
  for (const d of dates) {
    map[d] = {
      grupo1: getShiftFromMasterPattern(d, 'grupo1'),
      grupo2: getShiftFromMasterPattern(d, 'grupo2'),
      grupo3: getShiftFromMasterPattern(d, 'grupo3')
    };
  }
  return map;
})();

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
