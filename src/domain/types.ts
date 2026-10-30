import type { Weekday } from './date';

export type HabitId = string;

/** Tokens rather than raw hex values so themes and stored rows stay decoupled. */
export type ColorToken = 'violet' | 'teal' | 'amber' | 'rose' | 'sky' | 'lime';

/**
 * How often a habit expects a check-in. This is the axis that makes streak
 * maths interesting: a "3× per week" habit should not lose its streak just
 * because the user skipped a Tuesday.
 */
export type Frequency =
  | { kind: 'every_day' }
  | { kind: 'times_per_week'; target: number }
  | { kind: 'specific_days'; days: Weekday[] };

export type Habit = {
  id: HabitId;
  name: string;
  description: string;
  color: ColorToken;
  icon: string;
  frequency: Frequency;
  /** 'HH:MM' local, or null when reminders are off. */
  reminderTime: string | null;
  /** Ordering key shown on the Today screen. */
  position: number;
  createdAt: number;
  /** Non-null means soft-deleted; history is preserved for stats. */
  archivedAt: number | null;
};

export type Completion = {
  id: string;
  habitId: HabitId;
  /** Local calendar day, 'YYYY-MM-DD'. Unique per habit. */
  localDate: string;
  completedAt: number;
  note: string;
};

/** Draft shape used by the editor before an id/createdAt exist. */
export type HabitDraft = {
  name: string;
  description: string;
  color: ColorToken;
  icon: string;
  frequency: Frequency;
  reminderTime: string | null;
};

/**
 * A streak is a run of consecutive *due periods* that were satisfied.
 * Daily and fixed-day habits measure periods in days; a weekly quota measures
 * them in weeks, so its "streak of 6" means six weeks on target.
 */
export type StreakUnit = 'day' | 'week';

export type Streak = {
  unit: StreakUnit;
  current: number;
  longest: number;
};

export type HabitStats = {
  streak: Streak;
  totalCompletions: number;
  /** Completions in the trailing 28 days divided by days the habit was due. */
  consistency: number;
  lastCompletedDate: string | null;
};

export type HabitWithProgress = {
  habit: Habit;
  completedToday: boolean;
  dueToday: boolean;
  stats: HabitStats;
};

export const COLOR_TOKENS: ColorToken[] = ['violet', 'teal', 'amber', 'rose', 'sky', 'lime'];

export const HABIT_ICONS = [
  '✅',
  '💧',
  '🏃',
  '📚',
  '🧘',
  '😴',
  '🥗',
  '✍️',
  '🎸',
  '🚲',
  '🧠',
  '☀️',
] as const;

export type HabitIcon = (typeof HABIT_ICONS)[number];

export const MAX_HABIT_NAME = 48;
export const MAX_HABIT_DESCRIPTION = 140;
export const MAX_COMPLETION_NOTE = 140;
export const ACTIVE_HABIT_LIMIT = 24;
export const MIN_TARGET_PER_WEEK = 1;
export const MAX_TARGET_PER_WEEK = 7;

export function isColorToken(value: string): value is ColorToken {
  return (COLOR_TOKENS as string[]).includes(value);
}

export function timesPerWeek(frequency: Frequency): number | null {
  return frequency.kind === 'times_per_week' ? frequency.target : null;
}
