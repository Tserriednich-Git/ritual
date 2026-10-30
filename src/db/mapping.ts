import {
  COLOR_TOKENS,
  MAX_HABIT_NAME,
  type ColorToken,
  type Frequency,
  type Habit,
} from '../domain/types';
import { ISO_DATE_PATTERN, TIME_PATTERN, type Weekday } from '../domain/date';
import type { HabitRow } from './types';

/**
 * Row → domain mapping. Anything unparseable degrades to a value that keeps the
 * app running rather than throwing: one corrupt row should not take down the
 * whole screen.
 */

function parseColor(value: string): ColorToken {
  return (COLOR_TOKENS as readonly string[]).includes(value) ? (value as ColorToken) : 'violet';
}

function parseDays(value: string): Weekday[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((d): d is Weekday => typeof d === 'number' && d >= 0 && d <= 6);
  } catch {
    return [];
  }
}

export function parseFrequency(kind: string, target: number | null, daysJSON: string): Frequency {
  switch (kind) {
    case 'times_per_week': {
      const safeTarget =
        typeof target === 'number' ? Math.min(7, Math.max(1, Math.trunc(target))) : 3;
      return { kind: 'times_per_week', target: safeTarget };
    }
    case 'specific_days': {
      const days = parseDays(daysJSON);
      // A row with no days would never be due; demote it to a 1× weekly quota.
      return days.length > 0
        ? { kind: 'specific_days', days }
        : { kind: 'times_per_week', target: 1 };
    }
    case 'every_day':
    default:
      return { kind: 'every_day' };
  }
}

export function serialiseFrequency(frequency: Frequency): {
  kind: Frequency['kind'];
  target: number | null;
  days: string;
} {
  switch (frequency.kind) {
    case 'times_per_week':
      return { kind: frequency.kind, target: frequency.target, days: '[]' };
    case 'specific_days':
      return { kind: frequency.kind, target: null, days: JSON.stringify(frequency.days) };
    case 'every_day':
      return { kind: frequency.kind, target: null, days: '[]' };
  }
}

export function rowToHabit(row: HabitRow): Habit {
  const reminder = row.reminder_time;
  return {
    id: row.id,
    name: row.name.slice(0, MAX_HABIT_NAME),
    description: row.description ?? '',
    color: parseColor(row.color),
    icon: row.icon || '✅',
    frequency: parseFrequency(row.frequency_kind, row.frequency_target, row.frequency_days),
    reminderTime: reminder && TIME_PATTERN.test(reminder) ? reminder : null,
    position: row.position,
    createdAt: row.created_at,
    archivedAt: row.archived_at,
  };
}

export function isISODate(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE_PATTERN.test(value);
}
