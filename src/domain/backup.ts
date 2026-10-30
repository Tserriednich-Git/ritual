import { isValidISODate, TIME_PATTERN } from './date';
import { COLOR_TOKENS, MAX_HABIT_DESCRIPTION, MAX_HABIT_NAME } from './types';
import type { ColorToken, Completion, Frequency, Habit } from './types';
import type { Weekday } from './date';

export const BACKUP_SCHEMA = 'ritual.backup' as const;
export const BACKUP_VERSION = 1 as const;

export type BackupPreferences = {
  theme: 'system' | 'light' | 'dark';
  weekStartsOn: 0 | 1;
};

export type BackupFile = {
  schema: typeof BACKUP_SCHEMA;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  habits: Habit[];
  completions: Completion[];
  preferences: BackupPreferences;
};

export type BackupIssue = { path: string; message: string };

export type ParseResult =
  { ok: true; backup: BackupFile; issues: BackupIssue[] } | { ok: false; issues: BackupIssue[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseFrequency(value: unknown): Frequency | null {
  if (!isRecord(value)) return null;
  switch (value.kind) {
    case 'every_day':
      return { kind: 'every_day' };
    case 'times_per_week': {
      const target = asNumber(value.target);
      if (target === null || target < 1 || target > 7) {
        return null;
      }
      return { kind: 'times_per_week', target: Math.trunc(target) };
    }
    case 'specific_days': {
      if (!Array.isArray(value.days)) return null;
      const days = value.days.filter(
        (d): d is Weekday => typeof d === 'number' && d >= 0 && d <= 6,
      );
      if (days.length === 0) return null;
      return { kind: 'specific_days', days };
    }
    default:
      return null;
  }
}

function parseHabit(value: unknown): Habit | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  const name = asString(value.name);
  const frequency = parseFrequency(value.frequency);
  const createdAt = asNumber(value.createdAt);
  if (!id || !name || !frequency || createdAt === null) return null;

  const color = asString(value.color);
  const reminder = asString(value.reminderTime);

  return {
    id,
    name: name.slice(0, MAX_HABIT_NAME),
    description: (asString(value.description) ?? '').slice(0, MAX_HABIT_DESCRIPTION),
    color:
      color && (COLOR_TOKENS as readonly string[]).includes(color)
        ? (color as ColorToken)
        : 'violet',
    icon: asString(value.icon) ?? '✅',
    frequency,
    reminderTime: reminder && TIME_PATTERN.test(reminder) ? reminder : null,
    position: asNumber(value.position) ?? 0,
    createdAt,
    archivedAt: asNumber(value.archivedAt),
  };
}

function parseCompletion(value: unknown, habitIds: Set<string>): Completion | null {
  if (!isRecord(value)) return null;
  const habitId = asString(value.habitId);
  const localDate = asString(value.localDate);
  if (!habitId || !habitIds.has(habitId) || !localDate || !isValidISODate(localDate)) return null;
  return {
    id: asString(value.id) ?? `${habitId}-${localDate}`,
    habitId,
    localDate,
    completedAt: asNumber(value.completedAt) ?? Date.now(),
    note: (asString(value.note) ?? '').slice(0, MAX_HABIT_DESCRIPTION),
  };
}

/**
 * Parses untrusted JSON. Unknown or malformed entries are dropped rather than
 * rejected, and reported as issues: a partially valid backup should still
 * recover most of a user's history.
 */
export function parseBackup(raw: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, issues: [{ path: '$', message: 'File is not valid JSON.' }] };
  }

  if (!isRecord(json))
    return { ok: false, issues: [{ path: '$', message: 'Backup root must be an object.' }] };
  if (json.schema !== BACKUP_SCHEMA) {
    return { ok: false, issues: [{ path: '$.schema', message: `Expected "${BACKUP_SCHEMA}".` }] };
  }
  const version = asNumber(json.version);
  if (version !== BACKUP_VERSION) {
    return {
      ok: false,
      issues: [{ path: '$.version', message: `Unsupported backup version ${version}.` }],
    };
  }
  if (!Array.isArray(json.habits) || !Array.isArray(json.completions)) {
    return {
      ok: false,
      issues: [{ path: '$', message: 'Backup must contain habits and completions arrays.' }],
    };
  }

  const issues: BackupIssue[] = [];
  const habits: Habit[] = [];
  json.habits.forEach((entry, index) => {
    const habit = parseHabit(entry);
    if (!habit)
      issues.push({
        path: `$.habits[${index}]`,
        message: 'Ignored: missing id, name, frequency or createdAt.',
      });
    else habits.push(habit);
  });

  const habitIds = new Set(habits.map((habit) => habit.id));
  const completions: Completion[] = [];
  const seen = new Set<string>();
  json.completions.forEach((entry, index) => {
    const completion = parseCompletion(entry, habitIds);
    if (!completion) {
      issues.push({
        path: `$.completions[${index}]`,
        message: 'Ignored: unknown habit or invalid date.',
      });
      return;
    }
    const key = `${completion.habitId}|${completion.localDate}`;
    if (seen.has(key)) return; // UNIQUE(habit_id, local_date)
    seen.add(key);
    completions.push(completion);
  });

  const prefs = isRecord(json.preferences) ? json.preferences : {};
  const theme = asString(prefs.theme);
  const weekStart = asNumber(prefs.weekStartsOn);
  const preferences: BackupPreferences = {
    theme: theme === 'light' || theme === 'dark' ? theme : 'system',
    weekStartsOn: weekStart === 0 ? 0 : 1,
  };

  if (habits.length === 0) {
    return {
      ok: false,
      issues: [...issues, { path: '$.habits', message: 'No importable habits.' }],
    };
  }

  return {
    ok: true,
    issues,
    backup: {
      schema: BACKUP_SCHEMA,
      version: BACKUP_VERSION,
      exportedAt: asString(json.exportedAt) ?? new Date().toISOString(),
      habits,
      completions,
      preferences,
    },
  };
}

function csvCell(value: string): string {
  const needsQuotes = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

/** One row per check-in — the shape a user can pivot in any spreadsheet app. */
export function toCompletionsCsv(
  habits: Habit[],
  completionsByHabit: Map<string, string[]>,
  notesByHabit?: Map<string, Map<string, string>>,
): string {
  const header = ['habit', 'icon', 'frequency', 'day', 'note'];
  const lines = [header.join(',')];
  const byName = new Map(habits.map((habit) => [habit.id, habit]));

  for (const [habitId, dates] of completionsByHabit) {
    const habit = byName.get(habitId);
    if (!habit) continue;
    const frequency =
      habit.frequency.kind === 'times_per_week'
        ? `${habit.frequency.target}x/week`
        : habit.frequency.kind === 'specific_days'
          ? `${habit.frequency.days.length}d/week`
          : 'daily';
    const habitNotes = notesByHabit?.get(habitId);
    for (const day of dates) {
      lines.push(
        [
          csvCell(habit.name),
          csvCell(habit.icon),
          csvCell(frequency),
          csvCell(day),
          csvCell(habitNotes?.get(day) ?? ''),
        ].join(','),
      );
    }
  }

  return `${lines.join('\r\n')}\r\n`;
}

export function buildBackupFile(
  habits: Habit[],
  completions: Completion[],
  preferences: BackupPreferences,
  exportedAt: string = new Date().toISOString(),
): BackupFile {
  return {
    schema: BACKUP_SCHEMA,
    version: BACKUP_VERSION,
    exportedAt,
    habits,
    completions,
    preferences,
  };
}

export function serialiseBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}
