import { describe, it, expect } from 'vitest';
import {
  minutesToPercent,
  percentToMinutes,
  snapToGrid,
  formatMinutesToTime,
  formatDuration,
  calculateDuration,
  clampMinutes,
  START_HOUR,
  END_HOUR
} from './ganttMath';

describe('ganttMath', () => {
  it('minutesToPercent should calculate correct percentage', () => {
    // START_HOUR is 7.5, END_HOUR is 21 (total 13.5 hours = 810 minutes)
    // 7:30 AM (450 mins) is 0%
    expect(minutesToPercent(450, 7.5, 21)).toBe(0);
    // 2:15 PM (855 mins) is 50%
    expect(minutesToPercent(855, 7.5, 21)).toBe(50);
    // 9:00 PM (1260 mins) is 100%
    expect(minutesToPercent(1260, 7.5, 21)).toBe(100);
    // Out of bounds clamped
    expect(minutesToPercent(400, 7.5, 21)).toBe(0);
    expect(minutesToPercent(1300, 7.5, 21)).toBe(100);
  });

  it('percentToMinutes should correctly calculate minutes from percentage and snap to grid', () => {
    expect(percentToMinutes(0, 7.5, 21)).toBe(450);
    expect(percentToMinutes(50, 7.5, 21)).toBe(855); // 855 is evenly divisible by 15!
    expect(percentToMinutes(100, 7.5, 21)).toBe(1260);
  });

  it('snapToGrid should correctly snap minutes to given step', () => {
    expect(snapToGrid(485, 15)).toBe(480);
    expect(snapToGrid(490, 15)).toBe(495);
    expect(snapToGrid(500, 15)).toBe(495);
    expect(snapToGrid(505, 15)).toBe(510);
  });

  it('formatMinutesToTime should format to 12h and 24h formats correctly', () => {
    expect(formatMinutesToTime(480)).toBe('8:00 AM');
    expect(formatMinutesToTime(480, true)).toBe('08:00');

    expect(formatMinutesToTime(840)).toBe('2:00 PM');
    expect(formatMinutesToTime(840, true)).toBe('14:00');

    expect(formatMinutesToTime(720)).toBe('12:00 PM');
    expect(formatMinutesToTime(720, true)).toBe('12:00');
    
    expect(formatMinutesToTime(0)).toBe('12:00 AM');
    expect(formatMinutesToTime(0, true)).toBe('00:00');
  });

  it('formatDuration should format duration correctly', () => {
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(150)).toBe('2h 30m');
  });

  it('calculateDuration should return the difference in minutes', () => {
    expect(calculateDuration(480, 540)).toBe(60);
    expect(calculateDuration(540, 480)).toBe(0); // Should not be negative
  });

  it('clampMinutes should bound the minutes to the working hours', () => {
    expect(clampMinutes(400, 7.5, 21)).toBe(450);
    expect(clampMinutes(800, 7.5, 21)).toBe(800);
    expect(clampMinutes(1300, 7.5, 21)).toBe(1260);
  });
});
