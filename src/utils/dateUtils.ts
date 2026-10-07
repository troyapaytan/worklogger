import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  format,
  isToday,
  getISOWeek,
  getYear,
  parseISO,
  isSameDay,
} from 'date-fns';

/**
 * Get the Monday of the week containing the given date.
 */
export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

/**
 * Get the Sunday of the week containing the given date.
 */
export function getWeekEnd(date: Date): Date {
  return endOfWeek(date, { weekStartsOn: 1 });
}

/**
 * Get all 7 days of a week as Date objects (Monday–Sunday).
 */
export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/**
 * Get formatted date string (YYYY-MM-DD) for database queries.
 */
export function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Format date for display (e.g., "Mon, Aug 18").
 */
export function formatDateDisplay(date: Date): string {
  return format(date, 'EEE, MMM d');
}

/**
 * Format date for full display (e.g., "Monday, August 18, 2026").
 */
export function formatDateFull(date: Date): string {
  return format(date, 'EEEE, MMMM d, yyyy');
}

/**
 * Get ISO week key (e.g., "2026-W34").
 */
export function getWeekKey(date: Date): string {
  const week = getISOWeek(date);
  const year = getYear(date);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

/**
 * Get week range label (e.g., "Aug 18 – Aug 24, 2026").
 */
export function getWeekRangeLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const startMonth = format(weekStart, 'MMM d');
  const endMonth = format(weekEnd, 'MMM d, yyyy');
  return `${startMonth} – ${endMonth}`;
}

/**
 * Navigate weeks.
 */
export function navigateWeek(
  current: Date,
  direction: 'prev' | 'next'
): Date {
  return direction === 'next' ? addWeeks(current, 1) : subWeeks(current, 1);
}

/**
 * Check if a date string is today.
 */
export function isDateToday(dateStr: string): boolean {
  return isToday(parseISO(dateStr));
}

/**
 * Check if two dates are the same day.
 */
export function areSameDay(a: Date, b: Date): boolean {
  return isSameDay(a, b);
}

/**
 * Get the short day name (Mon, Tue, etc.).
 */
export function getDayShortName(date: Date): string {
  return format(date, 'EEE');
}

/**
 * Get the day number.
 */
export function getDayNumber(date: Date): string {
  return format(date, 'd');
}
