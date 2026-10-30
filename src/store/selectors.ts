import { addDays, todayISO } from '../domain/date';
import { isSatisfiedToday } from '../domain/streak';
import { computeHabitStats } from '../domain/stats';
import { isScheduledOn } from '../domain/frequency';
import type { Habit, HabitStats, HabitWithProgress } from '../domain/types';
import type { State } from './useRitualStore';

export type DayRow = HabitWithProgress;

/**
 * Selectors take a narrow snapshot instead of the whole store, so screens can
 * subscribe to three primitives and memoise the derivation without a fresh
 * object identity on every render.
 */
export type Snapshot = Pick<State, 'habits' | 'completions' | 'today'>;

function datesFor(state: Snapshot, habitId: string): string[] {
  return state.completions[habitId] ?? [];
}

/** The Today list: everything due or already done, ordered by position. */
export function selectTodayRows(state: Snapshot): DayRow[] {
  const today = state.today || todayISO();
  return state.habits
    .filter((habit) => habit.archivedAt === null)
    .sort((a, b) => a.position - b.position)
    .map((habit) => {
      const dates = datesFor(state, habit.id);
      return {
        habit,
        dueToday: isScheduledOn(habit.frequency, today),
        completedToday: dates.includes(today),
        stats: computeHabitStats(habit, dates, today),
      };
    });
}

export function selectRowFor(state: Snapshot, habitId: string): HabitWithProgress | null {
  const habit = state.habits.find((candidate) => candidate.id === habitId);
  if (!habit) return null;
  const dates = datesFor(state, habit.id);
  return {
    habit,
    dueToday: isScheduledOn(habit.frequency, state.today),
    completedToday: isSatisfiedToday(habit.frequency, dates, state.today),
    stats: computeHabitStats(habit, dates, state.today),
  };
}

export type ProgressSummary = {
  dueToday: number;
  doneToday: number;
  /** 0 when nothing is due today. */
  completionRatio: number;
  bestStreak: HabitWithProgress | null;
  totalCheckIns: number;
};

export function selectProgressSummary(state: Snapshot): ProgressSummary {
  const rows = selectTodayRows(state).filter((row) => row.dueToday || row.completedToday);
  const due = rows.filter((row) => row.dueToday);
  const done = rows.filter((row) => row.completedToday);
  const withStreaks = rows.filter((row) => row.stats.streak.current > 0);
  const best = withStreaks.reduce<HabitWithProgress | null>(
    (leader, row) =>
      leader === null || row.stats.streak.current > leader.stats.streak.current ? row : leader,
    null,
  );

  return {
    dueToday: due.length,
    doneToday: done.length,
    completionRatio: due.length === 0 ? 0 : done.length / due.length,
    bestStreak: best,
    totalCheckIns: Object.values(state.completions).reduce((sum, dates) => sum + dates.length, 0),
  };
}

/** Last `count` days of overall completion, oldest first — drives the sparkline. */
export function selectDailyTotals(
  state: Snapshot,
  count = 30,
): { date: string; done: number; due: number }[] {
  const today = state.today || todayISO();
  const active = state.habits.filter((habit) => habit.archivedAt === null);
  return Array.from({ length: count }, (_, index) => {
    const date = addDays(today, -(count - 1 - index));
    let done = 0;
    let due = 0;
    for (const habit of active) {
      if (isScheduledOn(habit.frequency, date)) due += 1;
      if (datesFor(state, habit.id).includes(date)) done += 1;
    }
    return { date, done, due };
  });
}

export function statsFor(state: Snapshot, habit: Habit): HabitStats {
  return computeHabitStats(habit, datesFor(state, habit.id), state.today);
}
