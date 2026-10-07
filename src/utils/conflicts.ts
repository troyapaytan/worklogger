import type { Worklog } from '../db';

export interface ConflictInfo {
  log: Worklog;
  overlapStart: number;
  overlapEnd: number;
  overlapMinutes: number;
}

/**
 * Detect overlapping worklogs for a candidate time interval on a specific day.
 *
 * Two intervals [S1, E1] and [S2, E2] overlap iff max(S1, S2) < min(E1, E2).
 */
export function detectConflicts(
  candidateStart: number,
  candidateEnd: number,
  existingLogs: Worklog[],
  excludeId?: number
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];

  for (const log of existingLogs) {
    if (excludeId !== undefined && log.id === excludeId) continue;

    const overlapStart = Math.max(candidateStart, log.startTime);
    const overlapEnd = Math.min(candidateEnd, log.endTime);

    if (overlapStart < overlapEnd) {
      conflicts.push({
        log,
        overlapStart,
        overlapEnd,
        overlapMinutes: overlapEnd - overlapStart,
      });
    }
  }

  return conflicts;
}

/**
 * Find all pairwise conflicts within a list of worklogs for a single day.
 * Returns a map of worklog id → list of conflicting worklog ids.
 */
export function findAllConflicts(
  logs: Worklog[]
): Map<number, number[]> {
  const conflictMap = new Map<number, number[]>();

  for (let i = 0; i < logs.length; i++) {
    for (let j = i + 1; j < logs.length; j++) {
      const a = logs[i];
      const b = logs[j];

      const overlapStart = Math.max(a.startTime, b.startTime);
      const overlapEnd = Math.min(a.endTime, b.endTime);

      if (overlapStart < overlapEnd) {
        if (!conflictMap.has(a.id!)) conflictMap.set(a.id!, []);
        if (!conflictMap.has(b.id!)) conflictMap.set(b.id!, []);
        conflictMap.get(a.id!)!.push(b.id!);
        conflictMap.get(b.id!)!.push(a.id!);
      }
    }
  }

  return conflictMap;
}

/**
 * Find the first available gap of the given duration after startMinutes.
 * Returns null if no gap is found within the day.
 */
export function findAvailableGap(
  startMinutes: number,
  durationMinutes: number,
  existingLogs: Worklog[],
  endOfDay: number = 20 * 60
): { start: number; end: number } | null {
  const sorted = [...existingLogs].sort((a, b) => a.startTime - b.startTime);
  let cursor = startMinutes;

  for (const log of sorted) {
    if (cursor + durationMinutes <= log.startTime) {
      return { start: cursor, end: cursor + durationMinutes };
    }
    cursor = Math.max(cursor, log.endTime);
  }

  if (cursor + durationMinutes <= endOfDay) {
    return { start: cursor, end: cursor + durationMinutes };
  }

  return null;
}
