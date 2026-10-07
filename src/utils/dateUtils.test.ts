import { describe, it, expect } from 'vitest';
import {
  getWeekStart,
  getWeekEnd,
  getWeekDays,
  formatDateKey,
  formatDateDisplay,
  formatDateFull,
  getWeekKey,
  navigateWeek,
  areSameDay,
  getDayShortName,
  getDayNumber,
} from './dateUtils';

describe('dateUtils', () => {
  // Use local timezone date: August 18, 2026 12:00:00 (Tuesday)
  const mockDate = new Date(2026, 7, 18, 12, 0, 0); 

  it('getWeekStart should return Monday of the week', () => {
    const start = getWeekStart(mockDate);
    expect(start.getDay()).toBe(1); // Monday is 1
    expect(start.getDate()).toBe(17);
    expect(start.getMonth()).toBe(7);
  });

  it('getWeekEnd should return Sunday of the week', () => {
    const end = getWeekEnd(mockDate);
    expect(end.getDay()).toBe(0); // Sunday is 0
    expect(end.getDate()).toBe(23);
    expect(end.getMonth()).toBe(7);
  });

  it('getWeekDays should return an array of 7 consecutive days starting from the given day', () => {
    const start = getWeekStart(mockDate);
    const days = getWeekDays(start);
    expect(days).toHaveLength(7);
    expect(days[0].getDate()).toBe(17);
    expect(days[6].getDate()).toBe(23);
  });

  it('formatDateKey should return YYYY-MM-DD', () => {
    expect(formatDateKey(mockDate)).toBe('2026-08-18');
  });

  it('formatDateDisplay should return formatted string like Tue, Aug 18', () => {
    expect(formatDateDisplay(mockDate)).toBe('Tue, Aug 18');
  });

  it('formatDateFull should return formatted string like Tuesday, August 18, 2026', () => {
    expect(formatDateFull(mockDate)).toBe('Tuesday, August 18, 2026');
  });

  it('getWeekKey should return correct week key format', () => {
    expect(getWeekKey(mockDate)).toBe('2026-W34');
  });

  it('navigateWeek should correctly add or subtract a week', () => {
    const next = navigateWeek(mockDate, 'next');
    expect(next.getDate()).toBe(25);
    expect(next.getMonth()).toBe(7);

    const prev = navigateWeek(mockDate, 'prev');
    expect(prev.getDate()).toBe(11);
    expect(prev.getMonth()).toBe(7);
  });

  it('areSameDay should accurately compare dates', () => {
    const same = new Date(2026, 7, 18, 18, 0, 0);
    const diff = new Date(2026, 7, 19, 12, 0, 0);
    expect(areSameDay(mockDate, same)).toBe(true);
    expect(areSameDay(mockDate, diff)).toBe(false);
  });

  it('getDayShortName should return short day name', () => {
    expect(getDayShortName(mockDate)).toBe('Tue');
  });

  it('getDayNumber should return day number', () => {
    expect(getDayNumber(mockDate)).toBe('18');
  });
});
