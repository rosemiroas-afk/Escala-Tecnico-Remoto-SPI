export type DDDNumber = 13 | 14 | 15 | 19 | number;

export type ShiftType =
  | 'FR' // Férias
  | 'FD' // Folga Duplada (Sábado e Domingo)
  | 'FC' // Folga Compensada (Segunda a Quinta)
  | 'FN' // Feriado Nacional
  | 'LIC' // Afastado
  | 'TB' // Dia Trabalhado (Trabalho Normal - Única que conta como dia trabalhado)
  | 'A' // Afastado
  | 'LP' // Licença
  | 'FB' // Folga Banco
  | 'TR' // Treinamento
  | 'FM' // Folga Municipal
  | 'FG' // Folga Regular (Sábado ou Domingo)
  // Backward compatibility:
  | 'T'
  | 'F'
  | 'FE'
  | 'LI'
  | 'AT';

export interface ShiftInfo {
  type: ShiftType;
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  badgeClass: string;
  description: string;
  isWork: boolean;
}

export const OFFICIAL_LEGEND_ITEMS: ShiftInfo[] = [
  {
    type: 'FR',
    label: 'Ferias',
    shortLabel: 'FR',
    color: '#ffffff',
    bgColor: '#2e7d32',
    textColor: '#ffffff',
    borderColor: '#1b5e20',
    badgeClass: 'bg-[#2e7d32] text-white border-[#1b5e20] font-black shadow-md',
    description: 'Férias Regulamentares',
    isWork: false
  },
  {
    type: 'FD',
    label: 'Folga Duplada',
    shortLabel: 'FD',
    color: '#ffffff',
    bgColor: '#d84315',
    textColor: '#ffffff',
    borderColor: '#bf360c',
    badgeClass: 'bg-[#d84315] text-white border-[#bf360c] font-black shadow-md ring-1 ring-white/20',
    description: 'Folga Duplada (Sábado e Domingo)',
    isWork: false
  },
  {
    type: 'FC',
    label: 'Folga Compensada',
    shortLabel: 'FC',
    color: '#ffffff',
    bgColor: '#455a64',
    textColor: '#ffffff',
    borderColor: '#263238',
    badgeClass: 'bg-[#455a64] text-white border-[#263238] font-black shadow-md',
    description: 'Folga Compensada',
    isWork: false
  },
  {
    type: 'FN',
    label: 'Feriado Nacional',
    shortLabel: 'FN',
    color: '#ffffff',
    bgColor: '#1565c0',
    textColor: '#ffffff',
    borderColor: '#0d47a1',
    badgeClass: 'bg-[#1565c0] text-white border-[#0d47a1] font-black shadow-md',
    description: 'Feriado Nacional',
    isWork: false
  },
  {
    type: 'LIC',
    label: 'Afastado',
    shortLabel: 'LIC',
    color: '#ffffff',
    bgColor: '#c62828',
    textColor: '#ffffff',
    borderColor: '#b71c1c',
    badgeClass: 'bg-[#c62828] text-white border-[#b71c1c] font-black shadow-md',
    description: 'Afastado (Licença médica/afastamento)',
    isWork: false
  },
  {
    type: 'TB',
    label: 'Dia Trabalhado',
    shortLabel: 'TB',
    color: '#0f172a',
    bgColor: '#ffffff',
    textColor: '#0f172a',
    borderColor: '#94a3b8',
    badgeClass: 'bg-white text-slate-900 border-slate-400 font-black shadow-sm',
    description: 'Dia de trabalho normal (Única que conta como dia trabalhado)',
    isWork: true
  },
  {
    type: 'A',
    label: 'Afastado',
    shortLabel: 'A',
    color: '#ffffff',
    bgColor: '#c62828',
    textColor: '#ffffff',
    borderColor: '#b71c1c',
    badgeClass: 'bg-[#c62828] text-white border-[#b71c1c] font-black shadow-md',
    description: 'Afastado',
    isWork: false
  },
  {
    type: 'LP',
    label: 'Licença',
    shortLabel: 'LP',
    color: '#ffffff',
    bgColor: '#4e342e',
    textColor: '#ffffff',
    borderColor: '#3e2723',
    badgeClass: 'bg-[#4e342e] text-white border-[#3e2723] font-black shadow-md',
    description: 'Licença',
    isWork: false
  },
  {
    type: 'FB',
    label: 'Folga Banco',
    shortLabel: 'FB',
    color: '#ffffff',
    bgColor: '#558b2f',
    textColor: '#ffffff',
    borderColor: '#33691e',
    badgeClass: 'bg-[#558b2f] text-white border-[#33691e] font-black shadow-md',
    description: 'Folga Banco de Horas',
    isWork: false
  },
  {
    type: 'TR',
    label: 'Treinamento',
    shortLabel: 'TR',
    color: '#ffffff',
    bgColor: '#d32f2f',
    textColor: '#ffffff',
    borderColor: '#b71c1c',
    badgeClass: 'bg-[#d32f2f] text-white border-[#b71c1c] font-black shadow-md',
    description: 'Treinamento e Capacitação',
    isWork: false
  },
  {
    type: 'FM',
    label: 'Folga Municipal',
    shortLabel: 'FM',
    color: '#ffffff',
    bgColor: '#0277bd',
    textColor: '#ffffff',
    borderColor: '#01579b',
    badgeClass: 'bg-[#0277bd] text-white border-[#01579b] font-black shadow-md',
    description: 'Folga / Feriado Municipal',
    isWork: false
  },
  {
    type: 'FG',
    label: 'Folga Regular',
    shortLabel: 'FG',
    color: '#ffffff',
    bgColor: '#f9a825',
    textColor: '#ffffff',
    borderColor: '#f57f17',
    badgeClass: 'bg-[#f9a825] text-white border-[#f57f17] font-black shadow-md ring-1 ring-white/20',
    description: 'Folga semanal regular (Sábado ou Domingo)',
    isWork: false
  }
];


export const SHIFT_TYPES: Record<string, ShiftInfo> = {
  FR: OFFICIAL_LEGEND_ITEMS[0],
  FD: OFFICIAL_LEGEND_ITEMS[1],
  FC: OFFICIAL_LEGEND_ITEMS[2],
  FN: OFFICIAL_LEGEND_ITEMS[3],
  LIC: OFFICIAL_LEGEND_ITEMS[4],
  TB: OFFICIAL_LEGEND_ITEMS[5],
  A: OFFICIAL_LEGEND_ITEMS[6],
  LP: OFFICIAL_LEGEND_ITEMS[7],
  FB: OFFICIAL_LEGEND_ITEMS[8],
  TR: OFFICIAL_LEGEND_ITEMS[9],
  FM: OFFICIAL_LEGEND_ITEMS[10],
  FG: OFFICIAL_LEGEND_ITEMS[11],

  // Compatibility aliases
  T: OFFICIAL_LEGEND_ITEMS[5],
  F: OFFICIAL_LEGEND_ITEMS[11],
  FE: OFFICIAL_LEGEND_ITEMS[0],
  LI: OFFICIAL_LEGEND_ITEMS[4],
  AT: OFFICIAL_LEGEND_ITEMS[6]
};

export interface Technician {
  id: string;
  name: string;
  ddd: DDDNumber;
  active: boolean;
  shiftHours?: string; // e.g. "08:00 AS 16:20", "13:00 AS 21:20"
  phone?: string;
  notes?: string;
  customColor?: string;
}

export interface OffRequest {
  id: string;
  technicianId: string;
  date: string; // YYYY-MM-DD
  reasonCategory: 'casamento' | 'medico' | 'aniversario' | 'pessoal' | 'outro';
  notes: string[]; // N observações para o mesmo dia
  priority: 'alta' | 'media' | 'baixa';
  createdAt: string;
  status: 'pendente' | 'aprovado' | 'atendido' | 'recusado' | 'parcial' | 'conflito';
}

export interface DaySchedule {
  date: string; // YYYY-MM-DD
  shift: ShiftType;
  manualOverride?: boolean;
  notes?: string;
  isOffRequestFulfilled?: boolean;
}

export interface TechnicianSchedule {
  technicianId: string;
  days: Record<string, DaySchedule>; // date -> DaySchedule
}

export interface SchedulePeriod {
  id: string;
  name: string;
  startMonth: number; // 0-11
  startYear: number;
  durationMonths: number; // 2
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  regime?: '6x1' | '5x2';
  createdAt: string;
  updatedAt: string;
}

export interface ValidationIssue {
  id: string;
  type: 'consecutive_days' | 'missing_double_weekend' | 'excessive_offs' | 'unfulfilled_request' | 'ddd_understaffed';
  severity: 'error' | 'warning' | 'info';
  technicianId?: string;
  technicianName?: string;
  date?: string;
  ddd?: DDDNumber;
  message: string;
  suggestion?: string;
}

export interface TechnicianStats {
  technicianId: string;
  totalWorkDays: number;
  totalOffDays: number;
  doubleWeekendsCount: number;
  weekendDaysOff: number; // Total de Sábados e Domingos de folga
  maxConsecutiveWorkDays: number;
  inversionsCount: number;
  requestsFulfilled: number;
  requestsTotal: number;
}

export interface DDDStats {
  ddd: DDDNumber;
  technicianCount: number;
  avgDailyCoverage: number;
  minDailyCoverage: number;
  criticalDays: string[]; // dates with too few technicians
}

export interface GeneratorOptions {
  regime?: '6x1' | '5x2'; // default '6x1'
  ensureDoubleWeekend: boolean; // default true
  targetDoubleWeekendsPerTech: number; // default 1 or 2
  targetInversionsPerTech: number; // default 2
  maxConsecutiveWorkDays: number; // default 6 (CLT 6x1) or 5 (5x2)
  prioritizeOffRequests: boolean; // default true
  balanceDDDCoverage: boolean; // default true
  randomSeed?: number;
}

export type UserRole = 'admin' | 'technician';

export interface AppUser {
  id: string; // 'admin' or technicianId
  name: string;
  role: UserRole;
  pin: string; // default '1234'
  primeiro_acesso?: boolean;
  isFirstLogin?: boolean;
  technicianId?: string;
  ddd?: DDDNumber;
}

