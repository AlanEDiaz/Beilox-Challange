import type { Departure } from '../pages/search/search.page';

const SPANISH_MONTHS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

/** Short Spanish month as the results page prints it ("dic" for 12). */
export function shortMonth(date: Departure): string {
  return SPANISH_MONTHS[Number(date.month) - 1] ?? '';
}

/** Date tab label as a regex, e.g. /^16 dic/i. */
export function dateTabLabel(date: Departure): RegExp {
  return new RegExp(`^${Number(date.day)} ${shortMonth(date)}`, 'i');
}

/** Same month, `days` later. Callers keep inside the month: no calendar rollover on purpose. */
export function addDaysWithinMonth(date: Departure, days: number): Departure {
  return { ...date, day: String(Number(date.day) + days).padStart(2, '0') };
}
