import { todayISO, weekKey } from './date';
import { isScheduledOn, scheduledDays, weekKeysBetween } from './frequency';
import type { Frequency, Streak, StreakUnit } from './types';

export type { Streak, StreakUnit } from './types';

export const EMPTY_STREAK: Streak = { unit: 'day', current: 0, longest: 0 };

function longestRun(periods: string[], satisfied: (period: string) => boolean): number {
  let best = 0;
  let run = 0;
  for (const period of periods) {
    if (satisfied(period)) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}

/**
 * Backward scan from the newest period.
 * `gracePeriod` is the period the user is still inside (today, or the current
 * week) — leaving it empty must not break a streak that is still alive.
 */
function currentRun(
  periods: string[],
  satisfied: (period: string) => boolean,
  gracePeriod: string | null,
): number {
  let run = 0;
  for (let index = periods.length - 1; index >= 0; index -= 1) {
    const period = periods[index];
    if (period === undefined) continue;
    if (satisfied(period)) {
      run += 1;
      continue;
    }
    const isStillOpen = gracePeriod !== null && period === gracePeriod;
    if (isStillOpen && index === periods.length - 1) continue;
    break;
  }
  return run;
}

function dayStreak(
  frequency: Frequency,
  completions: Set<string>,
  startISO: string,
  today: string,
): Streak {
  const periods = scheduledDays(frequency, startISO, today);
  const satisfied = (iso: string) => completions.has(iso);
  return {
    unit: 'day',
    current: currentRun(periods, satisfied, today),
    longest: longestRun(periods, satisfied),
  };
}

function weekStreak(
  target: number,
  allCompletions: string[],
  startISO: string,
  today: string,
): Streak {
  const periods = weekKeysBetween(startISO, today);
  const satisfied = (key: string) =>
    allCompletions.filter((iso) => weekKey(iso) === key).length >= target;
  return {
    unit: 'week',
    current: currentRun(periods, satisfied, weekKey(today)),
    longest: longestRun(periods, satisfied),
  };
}

/**
 * @param completions every completion date for one habit, any order.
 * @param startISO first day the habit existed (its creation date).
 */
export function computeStreak(
  frequency: Frequency,
  completions: string[],
  startISO: string,
  today: string = todayISO(),
): Streak {
  const valid = completions.filter((iso) => iso >= startISO && iso <= today);

  if (frequency.kind === 'times_per_week') {
    return weekStreak(frequency.target, valid, startISO, today);
  }

  return dayStreak(frequency, new Set(valid), startISO, today);
}

export function frequencyUnit(frequency: Frequency): StreakUnit {
  return frequency.kind === 'times_per_week' ? 'week' : 'day';
}

/** Whether the habit already satisfies its obligation for `today`. */
export function isSatisfiedToday(
  frequency: Frequency,
  completions: string[],
  today: string = todayISO(),
): boolean {
  if (frequency.kind === 'times_per_week') {
    const key = weekKey(today);
    return completions.filter((iso) => weekKey(iso) === key).length >= frequency.target;
  }
  if (!isScheduledOn(frequency, today)) return false;
  return completions.includes(today);
}

export function streakLabel(streak: Streak): string {
  const n = streak.current;
  const noun = streak.unit === 'week' ? 'week' : 'day';
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}
