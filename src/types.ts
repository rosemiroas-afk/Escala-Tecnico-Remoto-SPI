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
    color: '#385723',
    bgColor: '#e2efda',
    textColor: '#274e13',
    borderColor: '#c5e0b4',
    badgeClass: 'bg-[#e2efda] text-[#274e13] border-[#c5e0b4] font-bold',
    description: 'Férias Regulamentares',
    isWork: false
  },
  {
    type: 'FD',
    label: 'Folga Duplada',
    shortLabel: 'FD',
    color: '#c65911',
    bgColor: '#fce4d6',
    textColor: '#c65911',
    borderColor: '#f8cbad',
    badgeClass: 'bg-[#fce4d6] text-[#c65911] border-[#f8cbad] font-black shadow-xs',
    description: 'Folga Duplada (Sábado e Domingo)',
    isWork: false
  },
  {
    type: 'FC',
    label: 'Folga Compensada',
    shortLabel: 'FC',
    color: '#333333',
    bgColor: '#d9d9d9',
    textColor: '#333333',
    borderColor: '#bfbfbf',
    badgeClass: 'bg-[#d9d9d9] text-[#333333] border-[#bfbfbf] font-bold',
    description: 'Folga Compensada',
    isWork: false
  },
  {
    type: 'FN',
    label: 'Feriado Nacional',
    shortLabel: 'FN',
    color: '#1f4e78',
    bgColor: '#bdd7ee',
    textColor: '#1f4e78',
    borderColor: '#9bc2e6',
    badgeClass: 'bg-[#bdd7ee] text-[#1f4e78] border-[#9bc2e6] font-bold',
    description: 'Feriado Nacional',
    isWork: false
  },
  {
    type: 'LIC',
    label: 'Afastado',
    shortLabel: 'LIC',
    color: '#c00000',
    bgColor: '#fce4d6',
    textColor: '#c00000',
    borderColor: '#f4b084',
    badgeClass: 'bg-[#fce4d6] text-[#c00000] border-[#f4b084] font-bold',
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
    borderColor: '#cbd5e1',
    badgeClass: 'bg-white text-slate-900 border-slate-300 font-bold shadow-xs',
    description: 'Dia de trabalho normal (Única que conta como dia trabalhado)',
    isWork: true
  },
  {
    type: 'A',
    label: 'Afastado',
    shortLabel: 'A',
    color: '#900000',
    bgColor: '#f8cbcd',
    textColor: '#900000',
    borderColor: '#ea9999',
    badgeClass: 'bg-[#f8cbcd] text-[#900000] border-[#ea9999] font-bold',
    description: 'Afastado',
    isWork: false
  },
  {
    type: 'LP',
    label: 'Licença',
    shortLabel: 'LP',
    color: '#594a38',
    bgColor: '#e2dcd2',
    textColor: '#594a38',
    borderColor: '#c9bfae',
    badgeClass: 'bg-[#e2dcd2] text-[#594a38] border-[#c9bfae] font-bold',
    description: 'Licença',
    isWork: false
  },
  {
    type: 'FB',
    label: 'Folga Banco',
    shortLabel: 'FB',
    color: '#274e13',
    bgColor: '#a9d08e',
    textColor: '#274e13',
    borderColor: '#70ad47',
    badgeClass: 'bg-[#a9d08e] text-[#274e13] border-[#70ad47] font-bold',
    description: 'Folga Banco de Horas',
    isWork: false
  },
  {
    type: 'TR',
    label: 'Treinamento',
    shortLabel: 'TR',
    color: '#ffffff',
    bgColor: '#c00000',
    textColor: '#ffffff',
    borderColor: '#900000',
    badgeClass: 'bg-[#c00000] text-white border-[#900000] font-bold',
    description: 'Treinamento e Capacitação',
    isWork: false
  },
  {
    type: 'FM',
    label: 'Folga Municipal',
    shortLabel: 'FM',
    color: '#ffffff',
    bgColor: '#1f4e78',
    textColor: '#ffffff',
    borderColor: '#16365c',
    badgeClass: 'bg-[#1f4e78] text-white border-[#16365c] font-bold',
    description: 'Folga / Feriado Municipal',
    isWork: false
  },
  {
    type: 'FG',
    label: 'Folga Regular',
    shortLabel: 'FG',
    color: '#7f6000',
    bgColor: '#fff2cc',
    textColor: '#7f6000',
    borderColor: '#ffe599',
    badgeClass: 'bg-[#fff2cc] text-[#7f6000] border-[#ffe599] font-bold',
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

