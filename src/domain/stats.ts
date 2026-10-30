import { addDays, enumerateDays, fromISODate, toDate, todayISO, weekdayOf } from './date';
import { expectedCompletions, isScheduledOn } from './frequency';
import { computeStreak } from './streak';
import type { Habit, HabitStats } from './types';

const CONSISTENCY_WINDOW_DAYS = 28;

/** Epoch millis interpreted in the device's local calendar, never in UTC. */
export function localDateFromEpoch(ms: number): string {
  return toDate(new Date(ms));
}

/**
 * Single source of truth for the numbers shown across the app. Takes plain
 * completion dates so it can be called from screens and tests alike.
 */
export function computeHabitStats(
  habit: Pick<Habit, 'frequency' | 'createdAt'>,
  completionDates: string[],
  today: string = todayISO(),
): HabitStats {
  const startISO = clampToToday(localDateFromEpoch(habit.createdAt), today);
  const streak = computeStreak(habit.frequency, completionDates, startISO, today);

  const windowStart = addDays(today, -(CONSISTENCY_WINDOW_DAYS - 1));
  const inWindow = completionDates.filter((iso) => withinWindow(iso, windowStart, today));
  const expected = expectedCompletions(habit.frequency, windowStart, today);
  const consistency = expected === 0 ? 0 : Math.min(1, inWindow.length / expected);

  const sorted = [...completionDates].filter((iso) => iso <= today).sort();
  const last = sorted[sorted.length - 1];

  return {
    streak: {
      unit: streak.unit,
      current: streak.current,
      longest: Math.max(streak.longest, streak.current),
    },
    totalCompletions: sorted.length,
    consistency,
    lastCompletedDate: last ?? null,
  };
}

function clampToToday(iso: string, today: string): string {
  // A future createdAt (wrong device clock) must not erase the whole history.
  try {
    fromISODate(iso);
  } catch {
    return today;
  }
  return iso > today ? today : iso;
}

function withinWindow(iso: string, fromISO: string, toISO: string): boolean {
  return iso >= fromISO && iso <= toISO;
}

export type HeatCell = {
  date: string;
  due: boolean;
  completed: boolean;
  /** 0 = not done, 1 = done, 2 = done and it is today (drives the highlight ring). */
  level: 0 | 1 | 2;
};

/** Flattened week-aligned grid, oldest day first. */
export function buildHeatmap(
  habit: Pick<Habit, 'frequency' | 'createdAt'>,
  completionDates: string[],
  today: string = todayISO(),
  columns = 18,
): HeatCell[] {
  const startISO = addDays(today, -(columns * 7 - 1));
  const created = localDateFromEpoch(habit.createdAt);
  const from = created > startISO ? created : startISO;
  const done = new Set(completionDates);

  return enumerateDays(from, today).map((date) => {
    const completed = done.has(date);
    return {
      date,
      due: isScheduledOn(habit.frequency, date),
      completed,
      level: completed ? (date === today ? 2 : 1) : 0,
    };
  });
}

export type WeekdaySummary = {
  /** Completions recorded on this weekday over the trailing window. */
  count: number;
  due: number;
  rate: number;
};

export function weekdayBreakdown(
  habit: Pick<Habit, 'frequency' | 'createdAt'>,
  completionDates: string[],
  today: string = todayISO(),
  windowDays = 84,
): WeekdaySummary[] {
  const startISO = addDays(today, -(windowDays - 1));
  const done = new Set(completionDates);
  const counts = new Array<number>(7).fill(0);
  const dueCounts = new Array<number>(7).fill(0);

  for (const date of enumerateDays(startISO, today)) {
    if (!isScheduledOn(habit.frequency, date)) continue;
    const slot = weekdayOf(date);
    dueCounts[slot] = (dueCounts[slot] ?? 0) + 1;
    if (done.has(date)) counts[slot] = (counts[slot] ?? 0) + 1;
  }

  return counts.map((count, index) => {
    const expected = dueCounts[index] ?? 0;
    return { count, due: expected, rate: expected === 0 ? 0 : count / expected };
  });
}

export function percentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}
