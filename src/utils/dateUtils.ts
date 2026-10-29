export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const WEEKDAY_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
export const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Format a Date object to YYYY-MM-DD in local time
 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse YYYY-MM-DD into a local Date object without timezone shifting
 */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0); // Noon to avoid DST edge cases
}

/**
 * Check if a date string is Saturday or Sunday
 */
export function isWeekend(dateKey: string): boolean {
  const date = parseDateKey(dateKey);
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

export function isSaturday(dateKey: string): boolean {
  return parseDateKey(dateKey).getDay() === 6;
}

export function isSunday(dateKey: string): boolean {
  return parseDateKey(dateKey).getDay() === 0;
}

/**
 * Format date for display: "05/11 (Qua)"
 */
export function formatDisplayDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const dayName = WEEKDAY_SHORT[date.getDay()];
  return `${d}/${m} (${dayName})`;
}

/**
 * Format date in full PT: "Quarta, 05 de Novembro"
 */
export function formatFullDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const d = date.getDate();
  const m = MONTHS_PT[date.getMonth()];
  const dayName = WEEKDAY_FULL[date.getDay()];
  return `${dayName}, ${d} de ${m}`;
}

/**
 * Generate all dates for a 2-month period starting at startYear and startMonth (0-11)
 */
export function generateDateRange(startYear: number, startMonth: number, durationMonths = 2): string[] {
  const dates: string[] = [];
  const start = new Date(startYear, startMonth, 1);
  const end = new Date(startYear, startMonth + durationMonths, 0); // Last day of the durationMonths-th month

  const current = new Date(start);
  while (current <= end) {
    dates.push(formatDateKey(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Get all weekend pairs (Saturday + Sunday) in the date range
 */
export interface WeekendPair {
  id: string; // e.g. "wk-2026-11-07"
  saturday: string;
  sunday: string;
  weekIndex: number;
  label: string;
}

export function extractWeekends(dates: string[]): WeekendPair[] {
  const weekends: WeekendPair[] = [];
  let currentSat: string | null = null;
  let weekIdx = 1;

  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    if (isSaturday(d)) {
      currentSat = d;
    } else if (isSunday(d) && currentSat) {
      const satDate = parseDateKey(currentSat);
      const sunDate = parseDateKey(d);
      // Ensure they are consecutive
      if (sunDate.getTime() - satDate.getTime() <= 86400000 * 1.5) {
        weekends.push({
          id: `weekend-${currentSat}`,
          saturday: currentSat,
          sunday: d,
          weekIndex: weekIdx++,
          label: `${formatDisplayDate(currentSat)} & ${formatDisplayDate(d)}`
        });
      }
      currentSat = null;
    }
  }

  return weekends;
}
