import type { Worklog } from '../db';
import { formatMinutesToTime, formatDuration, calculateDuration } from './ganttMath';

/**
 * Format worklogs for a specific date into Manage Engine-ready text.
 */
export function formatWorklogsForSDP(
  worklogs: Worklog[],
  date: string
): string {
  const sorted = [...worklogs].sort((a, b) => a.startTime - b.startTime);
  const totalMinutes = sorted.reduce(
    (sum, log) => sum + calculateDuration(log.startTime, log.endTime),
    0
  );

  const lines: string[] = [];
  lines.push('========================================');
  lines.push(`WORKLOG: ${date} (Total: ${formatDuration(totalMinutes)})`);
  lines.push('========================================');

  for (const log of sorted) {
    const duration = calculateDuration(log.startTime, log.endTime);
    const ticketPrefix = log.ticketId ? `[${log.ticketId}] ` : '';
    lines.push('');
    lines.push(`${ticketPrefix}${log.title}`);
    lines.push(
      `Time: ${formatMinutesToTime(log.startTime, true)} - ${formatMinutesToTime(
        log.endTime,
        true
      )} (${formatDuration(duration)})`
    );
    if (log.taskTitle || log.taskId) {
      lines.push(`Task: ${log.taskTitle || log.taskId}`);
    }
    if (log.description) {
      lines.push(`Notes: ${log.description}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format worklogs for a date range into Manage Engine-ready text.
 */
export function formatWeeklyWorklogsForSDP(
  worklogsByDate: Map<string, Worklog[]>
): string {
  const sections: string[] = [];
  const sortedDates = [...worklogsByDate.keys()].sort();

  let grandTotal = 0;

  for (const date of sortedDates) {
    const logs = worklogsByDate.get(date) ?? [];
    if (logs.length === 0) continue;
    sections.push(formatWorklogsForSDP(logs, date));
    grandTotal += logs.reduce(
      (sum, log) => sum + calculateDuration(log.startTime, log.endTime),
      0
    );
  }

  if (sections.length === 0) {
    return 'No worklogs to export.';
  }

  return `WEEKLY SUMMARY (Total: ${formatDuration(grandTotal)})\n\n${sections.join('\n\n')}`;
}

/**
 * Copy text to clipboard with fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try fallback first synchronously, because if we await the modern API and it fails,
  // we lose the synchronous user gesture context, which causes execCommand to be blocked.
  let fallbackSuccess = false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    fallbackSuccess = document.execCommand('copy');
    document.body.removeChild(textarea);
  } catch (e) {
    // Ignore error
  }
  
  if (fallbackSuccess) return true;

  // If fallback failed, try modern API (might work if permissions are granted)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  return false;
}
