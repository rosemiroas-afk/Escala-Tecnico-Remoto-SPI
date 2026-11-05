import { ShiftType } from '../types';

export interface MasterGroupPattern {
  name: string;
  fractionLabel: string;
  mes1: ShiftType[];
  mes2: ShiftType[];
  transicaoFev: ShiftType[];
}

/**
 * PADRÃO EXATO DE 2 MESES CORRIDOS (REFERÊNCIA DE MESTRE)
 * Fornecido rigorosamente pelo gestor de escalas:
 * - TB: Dia de Trabalho
 * - FD: Folga Duplada (2 dias seguidos de descanso)
 * - FG: Folga Geral Individual (1 dia isolado de descanso)
 */
export const MASTER_PATTERN_5X2: Record<'grupo1' | 'grupo2' | 'grupo3', MasterGroupPattern> = {
  // • COLABORADOR 1/3 (Mês 1 + Mês 2 Corridos):
  // - Mês 1 (31 dias): TB, TB, TB, TB, FD, FD, TB, FG, TB, FG, TB, TB, TB, TB, TB, FG, TB, TB, TB, FG, TB, TB, TB, TB, TB, FD, FD, TB, TB, TB, TB
  // - Mês 2 (31 dias): TB, TB, FG, TB, TB, FG, TB, TB, TB, TB, TB, FG, TB, TB, TB, TB, FD, FD, TB, FG, TB, FG, TB, TB, TB, TB, TB, TB, TB, FG, TB
  // - Transição Fev: FG, TB, FG, TB, TB, FD, FD
  grupo1: {
    name: 'Grupo 1/3',
    fractionLabel: '1º Terço do DDD (~33,3%)',
    mes1: [
      'TB', 'TB', 'TB', 'TB', 'FD', 'FD', 'TB', 'FG', 'TB', 'FG',
      'TB', 'TB', 'TB', 'TB', 'TB', 'FG', 'TB', 'TB', 'TB', 'FG',
      'TB', 'TB', 'TB', 'TB', 'TB', 'FD', 'FD', 'TB', 'TB', 'TB', 'TB'
    ],
    mes2: [
      'TB', 'TB', 'FG', 'TB', 'TB', 'FG', 'TB', 'TB', 'TB', 'TB',
      'TB', 'FG', 'TB', 'TB', 'TB', 'TB', 'FD', 'FD', 'TB', 'FG',
      'TB', 'FG', 'TB', 'TB', 'TB', 'TB', 'TB', 'TB', 'TB', 'FG', 'TB'
    ],
    transicaoFev: [
      'FG', 'TB', 'FG', 'TB', 'TB', 'FD', 'FD'
    ]
  },

  // • COLABORADOR 2/3 (Mês 1 + Mês 2 Corridos):
  // - Mês 1 (31 dias): TB, FG, TB, FG, TB, TB, TB, TB, TB, FG, TB, TB, TB, TB, TB, TB, TB, TB, FD, FD, TB, TB, TB, FG, TB, TB, TB, TB, TB, FG, TB
  // - Mês 2 (31 dias): TB, TB, TB, TB, FD, FD, TB, FG, TB, FG, TB, TB, TB, TB, TB, TB, TB, TB, FD, FD, TB, TB, TB, FG, TB, TB, TB, TB, TB, FG, TB
  // - Transição Fev: TB, TB, TB, TB, TB, FD, FD
  grupo2: {
    name: 'Grupo 2/3',
    fractionLabel: '2º Terço do DDD (~33,3%)',
    mes1: [
      'TB', 'FG', 'TB', 'FG', 'TB', 'TB', 'TB', 'TB', 'TB', 'FG',
      'TB', 'TB', 'TB', 'TB', 'TB', 'TB', 'TB', 'TB', 'FD', 'FD',
      'TB', 'TB', 'TB', 'FG', 'TB', 'TB', 'TB', 'TB', 'TB', 'FG', 'TB'
    ],
    mes2: [
      'TB', 'TB', 'TB', 'TB', 'FD', 'FD', 'TB', 'FG', 'TB', 'FG',
      'TB', 'TB', 'TB', 'TB', 'TB', 'TB', 'TB', 'TB', 'FD', 'FD',
      'TB', 'TB', 'TB', 'FG', 'TB', 'TB', 'TB', 'TB', 'TB', 'FG', 'TB'
    ],
    transicaoFev: [
      'TB', 'TB', 'TB', 'TB', 'TB', 'FD', 'FD'
    ]
  },

  // • COLABORADOR 3/3 (Mês 1 + Mês 2 Corridos):
  // - Mês 1 (31 dias): TB, TB, FG, TB, TB, TB, TB, TB, TB, FG, TB, TB, TB, FD, FD, TB, TB, TB, FG, TB, TB, TB, TB, TB, TB, TB, FG, TB, TB, TB, TB
  // - Mês 2 (31 dias): TB, FG, TB, FG, TB, TB, TB, TB, TB, FG, TB, TB, TB, TB, TB, FG, TB, TB, TB, TB, TB, TB, TB, FD, FD, TB, TB, FG, TB, TB, TB
  // - Transição Fev: TB, TB, TB, TB, TB, FD, FD
  grupo3: {
    name: 'Grupo 3/3',
    fractionLabel: '3º Terço do DDD (~33,3%)',
    mes1: [
      'TB', 'TB', 'FG', 'TB', 'TB', 'TB', 'TB', 'TB', 'TB', 'FG',
      'TB', 'TB', 'TB', 'FD', 'FD', 'TB', 'TB', 'TB', 'FG', 'TB',
      'TB', 'TB', 'TB', 'TB', 'TB', 'TB', 'FG', 'TB', 'TB', 'TB', 'TB'
    ],
    mes2: [
      'TB', 'FG', 'TB', 'FG', 'TB', 'TB', 'TB', 'TB', 'TB', 'FG',
      'TB', 'TB', 'TB', 'TB', 'TB', 'FG', 'TB', 'TB', 'TB', 'TB',
      'TB', 'TB', 'TB', 'FD', 'FD', 'TB', 'TB', 'FG', 'TB', 'TB', 'TB'
    ],
    transicaoFev: [
      'TB', 'TB', 'TB', 'TB', 'TB', 'FD', 'FD'
    ]
  }
};

/**
 * Resolve o padrão (mes1, mes2 ou transicaoFev) de acordo com o mês
 */
export function resolvePatternKey(
  monthNum: number, // 1-12
  forcedCycle?: 'mes_1' | 'mes_2' | 'transicao_fev' | 'auto'
): 'mes1' | 'mes2' | 'transicaoFev' {
  if (forcedCycle === 'mes_1') return 'mes1';
  if (forcedCycle === 'mes_2') return 'mes2';
  if (forcedCycle === 'transicao_fev') return 'transicaoFev';

  // Auto
  if (monthNum === 2) return 'transicaoFev';
  // Meses ímpares (Nov=11, Jan=1, Mar=3, Mai=5...) = Mês 1
  // Meses pares (Dez=12, Abr=4, Jun=6...) = Mês 2
  return monthNum % 2 !== 0 ? 'mes1' : 'mes2';
}

/**
 * Retorna as informações do próximo mês para exibir a prévia com fidelidade
 */
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
