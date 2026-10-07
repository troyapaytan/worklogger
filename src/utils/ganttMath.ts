// ===== Gantt Math & Grid Engine =====

export const START_HOUR = 7.5; // 7:30 AM
export const END_HOUR = 21;    // 9:00 PM
export const SNAP_MINUTES = 15;
export const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

/**
 * Convert minutes-from-midnight to percentage position within the timeline.
 */
export function minutesToPercent(
  minutes: number,
  startHour = START_HOUR,
  endHour = END_HOUR
): number {
  const totalMinutes = (endHour - startHour) * 60;
  const offset = minutes - startHour * 60;
  return Math.max(0, Math.min(100, (offset / totalMinutes) * 100));
}

/**
 * Convert a percentage position to snapped minutes from midnight.
 */
export function percentToMinutes(
  percent: number,
  startHour = START_HOUR,
  endHour = END_HOUR
): number {
  const totalMinutes = (endHour - startHour) * 60;
  const rawMinutes = (percent / 100) * totalMinutes + startHour * 60;
  return snapToGrid(rawMinutes);
}

/**
 * Convert pointer X position to snapped minutes from midnight.
 */
export function pointerPosToMinutes(
  clientX: number,
  containerRect: DOMRect,
  startHour = START_HOUR,
  endHour = END_HOUR
): number {
  const relativeX = clientX - containerRect.left;
  const percent = (relativeX / containerRect.width) * 100;
  return percentToMinutes(percent, startHour, endHour);
}

/**
 * Snap minutes to the nearest grid step.
 */
export function snapToGrid(
  minutes: number,
  step = SNAP_MINUTES
): number {
  return Math.round(minutes / step) * step;
}

/**
 * Format minutes from midnight to display string (e.g., "09:30 AM").
 */
export function formatMinutesToTime(minutes: number, use24h = false): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (use24h) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format a duration in minutes to a readable string (e.g., "2h 30m").
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Calculate the duration between two times in minutes.
 */
export function calculateDuration(startTime: number, endTime: number): number {
  return Math.max(0, endTime - startTime);
}

/**
 * Generate an array of hour markers for the timeline header.
 */
export function getHourMarkers(
  startHour = START_HOUR,
  endHour = END_HOUR,
  use24h = false
): { hour: number; label: string; percent: number }[] {
  const markers = [];
  const firstHour = Math.ceil(startHour);
  const lastHour = Math.floor(endHour);
  for (let h = firstHour; h <= lastHour; h++) {
    markers.push({
      hour: h,
      label: formatMinutesToTime(h * 60, use24h),
      percent: minutesToPercent(h * 60, startHour, endHour),
    });
  }
  return markers;
}

/**
 * Clamp minutes to the valid timeline range.
 */
export function clampMinutes(
  minutes: number,
  startHour = START_HOUR,
  endHour = END_HOUR
): number {
  return Math.max(startHour * 60, Math.min(endHour * 60, minutes));
}
