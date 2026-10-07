import { describe, it, expect } from 'vitest';
import { detectConflicts, findAllConflicts, findAvailableGap } from './conflicts';
import type { Worklog } from '../db';

describe('conflicts', () => {
  const createMockWorklog = (id: number, startTime: number, endTime: number): Worklog => ({
    id,
    uuid: `uuid-${id}`,
    date: '2026-08-18',
    startTime,
    endTime,
    title: 'Test',
    description: 'Test',
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  const existingLogs = [
    createMockWorklog(1, 480, 540), // 8:00 AM - 9:00 AM
    createMockWorklog(2, 600, 660), // 10:00 AM - 11:00 AM
    createMockWorklog(3, 720, 780), // 12:00 PM - 1:00 PM
  ];

  it('detectConflicts should find overlapping worklogs', () => {
    // Exact overlap
    let conflicts = detectConflicts(600, 660, existingLogs);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].log.id).toBe(2);

    // Partial overlap (end)
    conflicts = detectConflicts(510, 570, existingLogs);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].log.id).toBe(1);

    // Partial overlap (start)
    conflicts = detectConflicts(630, 690, existingLogs);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].log.id).toBe(2);

    // Completely encompassing
    conflicts = detectConflicts(450, 800, existingLogs);
    expect(conflicts).toHaveLength(3);

    // No overlap
    conflicts = detectConflicts(540, 600, existingLogs);
    expect(conflicts).toHaveLength(0);
  });

  it('detectConflicts should ignore the excluded ID', () => {
    const conflicts = detectConflicts(600, 660, existingLogs, 2);
    expect(conflicts).toHaveLength(0);
  });

  it('findAllConflicts should find all pairwise conflicts in a list', () => {
    const logsWithConflicts = [
      ...existingLogs,
      createMockWorklog(4, 510, 570), // Overlaps with 1
      createMockWorklog(5, 530, 630), // Overlaps with 1, 4, 2
    ];

    const conflictMap = findAllConflicts(logsWithConflicts);
    expect(conflictMap.get(1)).toContain(4);
    expect(conflictMap.get(1)).toContain(5);
    expect(conflictMap.get(2)).toContain(5);
    expect(conflictMap.get(4)).toContain(1);
    expect(conflictMap.get(4)).toContain(5);
    expect(conflictMap.get(5)).toContain(1);
    expect(conflictMap.get(5)).toContain(4);
    expect(conflictMap.get(5)).toContain(2);
    expect(conflictMap.get(3)).toBeUndefined(); // No conflicts for 3
  });

  it('findAvailableGap should find the first gap of required duration', () => {
    // Gap between 1 (ends 540) and 2 (starts 600) is 60 mins
    let gap = findAvailableGap(480, 30, existingLogs);
    expect(gap).toEqual({ start: 540, end: 570 });

    // Gap between 2 (ends 660) and 3 (starts 720) is 60 mins
    gap = findAvailableGap(600, 60, existingLogs);
    expect(gap).toEqual({ start: 660, end: 720 });

    // Gap after 3 (ends 780)
    gap = findAvailableGap(780, 120, existingLogs);
    expect(gap).toEqual({ start: 780, end: 900 });

    // If starting in the middle of a gap
    gap = findAvailableGap(550, 45, existingLogs);
    expect(gap).toEqual({ start: 550, end: 595 });
  });

  it('findAvailableGap should return null if no gap is found before end of day', () => {
    const gap = findAvailableGap(780, 500, existingLogs, 800); // end of day is 800 (13:20)
    expect(gap).toBeNull();
  });
});
