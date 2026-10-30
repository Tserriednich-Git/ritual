import { addDays, diffDays, enumerateDays, startOfWeekISO, weekKey, weekdayOf } from './date';
import type { Frequency } from './types';

/**
 * Whether the frequency asks for a check-in on this calendar day.
 * `times_per_week` intentionally returns true for every day: the obligation is
 * a weekly quota, not a daily one, so any day is a valid chance to hit it.
 */
export function isScheduledOn(frequency: Frequency, iso: string): boolean {
  switch (frequency.kind) {
    case 'every_day':
      return true;
    case 'specific_days':
      return frequency.days.includes(weekdayOf(iso));
    case 'times_per_week':
      return true;
  }
}

/** Scheduled days inside an inclusive range. */
export function scheduledDays(frequency: Frequency, fromISO: string, toISO: string): string[] {
  return enumerateDays(fromISO, toISO).filter((iso) => isScheduledOn(frequency, iso));
}

/**
 * How many check-ins the frequency owes over an inclusive range.
 *
 * For a weekly quota the range is split into whole weeks plus a remainder; the
 * remainder can contribute at most `target`, never more than one week's worth.
 */
export function expectedCompletions(frequency: Frequency, fromISO: string, toISO: string): number {
  const span = diffDays(fromISO, toISO) + 1;
  if (span <= 0) return 0;

  switch (frequency.kind) {
    case 'every_day':
      return span;
    case 'specific_days':
      return scheduledDays(frequency, fromISO, toISO).length;
    case 'times_per_week': {
      const wholeWeeks = Math.floor(span / 7);
      const remainder = span % 7;
      return wholeWeeks * frequency.target + Math.min(remainder, frequency.target);
    }
  }
}

export function completionsInWeek(
  completions: string[],
  anyDayOfWeek: string,
  weekStartsOn = 1,
): number {
  const start = startOfWeekISO(anyDayOfWeek, weekStartsOn);
  const end = addDays(start, 6);
  return completions.filter((iso) => diffDays(start, iso) >= 0 && diffDays(iso, end) >= 0).length;
}

/** Distinct ISO week keys spanned by an inclusive range, oldest first. */
export function weekKeysBetween(fromISO: string, toISO: string): string[] {
  const keys: string[] = [];
  const lastWeek = weekKey(toISO);
  let cursor = startOfWeekISO(fromISO);
  while (weekKey(cursor) !== lastWeek) {
    keys.push(weekKey(cursor));
    cursor = addDays(cursor, 7);
    if (keys.length > 2000) break; // hard stop against corrupt input
  }
  const tail = weekKey(cursor);
  if (!keys.includes(tail)) keys.push(tail);
  return keys;
}

export function frequencyLabel(frequency: Frequency): string {
  switch (frequency.kind) {
    case 'every_day':
      return 'Every day';
    case 'specific_days':
      return `${frequency.days.length} fixed day${frequency.days.length === 1 ? '' : 's'}`;
    case 'times_per_week':
      return `${frequency.target}× per week`;
  }
}
