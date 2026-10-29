export type DDDNumber = 13 | 14 | 15 | 19 | number;

export type ShiftType = 'T' | 'F' | 'FD' | 'FE' | 'LI' | 'AT';

export interface ShiftInfo {
  type: ShiftType;
  label: string;
  color: string;
  badgeClass: string;
  description: string;
}

export const SHIFT_TYPES: Record<ShiftType, ShiftInfo> = {
  T: {
    type: 'T',
    label: 'Trabalho',
    color: '#059669', // Emerald
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Dia de trabalho normal'
  },
  F: {
    type: 'F',
    label: 'Folga',
    color: '#3b82f6', // Blue
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Folga semanal regular'
  },
  FD: {
    type: 'FD',
    label: 'Folga Dupla',
    color: '#8b5cf6', // Violet
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 font-semibold',
    description: 'Fim de semana duplado (Sáb + Dom)'
  },
  FE: {
    type: 'FE',
    label: 'Férias',
    color: '#eab308', // Amber
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Período de férias regulamentares'
  },
  LI: {
    type: 'LI',
    label: 'Licença',
    color: '#64748b', // Slate
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    description: 'Licença / Afastamento'
  },
  AT: {
    type: 'AT',
    label: 'Atestado',
    color: '#ef4444', // Red
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Atestado médico'
  }
};

export interface Technician {
  id: string;
  name: string;
  ddd: DDDNumber;
  active: boolean;
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

