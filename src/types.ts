export type DDDNumber = 13 | 14 | 15 | 19 | number;

export type ShiftType =
  | 'TB' // Dia Trabalhado (Trabalho)
  | 'FG' // Folga Regular (Sábado ou Domingo)
  | 'FD' // Folga Duplada (Sábado e Domingo)
  | 'FC' // Folga Compensada (Segunda a Quinta)
  | 'FN' // Feriado Nacional
  | 'FR' // Férias
  | 'LIC' // Afastado / Licença
  | 'LP' // Licença Pessoal
  | 'FB' // Folga Banco
  | 'TR' // Treinamento
  | 'FM' // Folga Municipal
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
  badgeClass: string;
  description: string;
}

export const SHIFT_TYPES: Record<string, ShiftInfo> = {
  TB: {
    type: 'TB',
    label: 'Dia Trabalhado',
    shortLabel: 'TB',
    color: '#059669',
    badgeClass: 'bg-emerald-100/90 text-emerald-900 border-emerald-300 font-semibold',
    description: 'Dia de trabalho normal'
  },
  T: {
    type: 'TB',
    label: 'Dia Trabalhado',
    shortLabel: 'TB',
    color: '#059669',
    badgeClass: 'bg-emerald-100/90 text-emerald-900 border-emerald-300 font-semibold',
    description: 'Dia de trabalho normal'
  },
  FG: {
    type: 'FG',
    label: 'Folga Regular',
    shortLabel: 'FG',
    color: '#ca8a04',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
    description: 'Folga semanal regular (Sábado ou Domingo)'
  },
  F: {
    type: 'FG',
    label: 'Folga Regular',
    shortLabel: 'FG',
    color: '#ca8a04',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
    description: 'Folga semanal regular'
  },
  FD: {
    type: 'FD',
    label: 'Folga Duplada',
    shortLabel: 'FD',
    color: '#ea580c',
    badgeClass: 'bg-orange-200 text-orange-900 border-orange-400 font-extrabold shadow-xs',
    description: 'Fim de semana duplado (Sáb + Dom)'
  },
  FC: {
    type: 'FC',
    label: 'Folga Compensada',
    shortLabel: 'FC',
    color: '#4f46e5',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold',
    description: 'Folga compensada por inversão (Segunda a Quinta)'
  },
  FN: {
    type: 'FN',
    label: 'Feriado Nacional',
    shortLabel: 'FN',
    color: '#0284c7',
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-300 font-bold',
    description: 'Feriado Nacional'
  },
  FR: {
    type: 'FR',
    label: 'Férias',
    shortLabel: 'FR',
    color: '#eab308',
    badgeClass: 'bg-yellow-100 text-yellow-900 border-yellow-300 font-bold',
    description: 'Período de férias regulamentares'
  },
  FE: {
    type: 'FR',
    label: 'Férias',
    shortLabel: 'FR',
    color: '#eab308',
    badgeClass: 'bg-yellow-100 text-yellow-900 border-yellow-300 font-bold',
    description: 'Férias'
  },
  LIC: {
    type: 'LIC',
    label: 'Afastado',
    shortLabel: 'LIC',
    color: '#64748b',
    badgeClass: 'bg-slate-200 text-slate-800 border-slate-300 font-bold',
    description: 'Afastamento'
  },
  LI: {
    type: 'LIC',
    label: 'Afastado',
    shortLabel: 'LIC',
    color: '#64748b',
    badgeClass: 'bg-slate-200 text-slate-800 border-slate-300 font-bold',
    description: 'Afastado'
  },
  LP: {
    type: 'LP',
    label: 'Licença',
    shortLabel: 'LP',
    color: '#64748b',
    badgeClass: 'bg-slate-200 text-slate-800 border-slate-300 font-bold',
    description: 'Licença'
  },
  FB: {
    type: 'FB',
    label: 'Folga Banco',
    shortLabel: 'FB',
    color: '#16a34a',
    badgeClass: 'bg-teal-100 text-teal-900 border-teal-300 font-bold',
    description: 'Folga Banco de Horas'
  },
  TR: {
    type: 'TR',
    label: 'Treinamento',
    shortLabel: 'TR',
    color: '#9333ea',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 font-bold',
    description: 'Treinamento e Capacitação'
  },
  FM: {
    type: 'FM',
    label: 'Folga Municipal',
    shortLabel: 'FM',
    color: '#2563eb',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 font-bold',
    description: 'Feriado / Folga Municipal'
  },
  AT: {
    type: 'LIC',
    label: 'Atestado',
    shortLabel: 'LIC',
    color: '#ef4444',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 font-bold',
    description: 'Atestado médico'
  }
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
  status: 'atendido' | 'parcial' | 'conflito' | 'pendente';
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
  ensureDoubleWeekend: boolean; // default true
  targetDoubleWeekendsPerTech: number; // default 1 or 2
  targetInversionsPerTech: number; // default 2
  maxConsecutiveWorkDays: number; // default 6 (CLT)
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
  isFirstLogin: boolean;
  technicianId?: string;
  ddd?: DDDNumber;
}
