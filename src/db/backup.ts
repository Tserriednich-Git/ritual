import { File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  BACKUP_VERSION,
  serialiseBackup,
  toCompletionsCsv,
  type BackupFile,
  type BackupPreferences,
} from '../domain/backup';
import { serialiseFrequency } from './mapping';
import { listCompletions, listCompletionDates } from './repositories/completionRepository';
import { getTheme, getWeekStartsOn } from './repositories/preferenceRepository';
import { listHabits } from './repositories/habitRepository';

const EXPORT_DIR_NAME = 'exports';

/** Assemble a full backup from the live database. */
export async function collectBackup(db: SQLiteDatabase): Promise<BackupFile> {
  const habits = await listHabits(db, { includeArchived: true });
  const completions = (
    await Promise.all(habits.map((habit) => listCompletions(db, habit.id)))
  ).flat();
  const preferences: BackupPreferences = {
    theme: await getTheme(db),
    weekStartsOn: await getWeekStartsOn(db),
  };
  return {
    schema: 'ritual.backup',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    habits,
    completions,
    preferences,
  };
}

export async function collectCsv(db: SQLiteDatabase): Promise<string> {
  const habits = await listHabits(db, { includeArchived: true });
  const datesByHabit = new Map<string, string[]>();
  const notesByHabit = new Map<string, Map<string, string>>();
  for (const habit of habits) {
    datesByHabit.set(habit.id, await listCompletionDates(db, habit.id));
    const notes = new Map<string, string>();
    for (const completion of await listCompletions(db, habit.id)) {
      if (completion.note) notes.set(completion.localDate, completion.note);
    }
    notesByHabit.set(habit.id, notes);
  }
  return toCompletionsCsv(habits, datesByHabit, notesByHabit);
}

function timestampSlug(date = new Date()): string {
  return date.toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

/**
 * Writes into the app's own document directory and hands the file to the OS
 * preview/share sheet. Nothing is uploaded anywhere.
 */
export function writeExportFile(name: string, contents: string): Promise<File> {
  const target = new File(Paths.document, `${EXPORT_DIR_NAME}/${name}`);
  target.create({ overwrite: true, intermediates: true });
  return target.write(contents).then(() => target);
}

export async function exportJsonFile(db: SQLiteDatabase): Promise<File> {
  const backup = await collectBackup(db);
  return writeExportFile(`ritual-backup-${timestampSlug()}.json`, serialiseBackup(backup));
}

export async function exportCsvFile(db: SQLiteDatabase): Promise<File> {
  const csv = await collectCsv(db);
  return writeExportFile(`ritual-checkins-${timestampSlug()}.csv`, csv);
}

export function previewExport(file: File, title: string): Promise<void> {
  return file.preview({ title });
}

/**
 * Restores a parsed backup.
 * `replace` wipes current data first; `merge` keeps existing rows and only adds
 * what is missing (habit ids are authoritative, so re-importing the same backup
 * twice is a no-op).
 */
export async function applyBackup(
  db: SQLiteDatabase,
  backup: BackupFile,
  mode: 'merge' | 'replace',
): Promise<{ habits: number; completions: number }> {
  await db.withTransactionAsync(async () => {
    if (mode === 'replace') {
      await db.runAsync('DELETE FROM completions');
      await db.runAsync('DELETE FROM habits');
    }

    for (const habit of backup.habits) {
      const frequency = serialiseFrequency(habit.frequency);
      await db.runAsync(
        `INSERT INTO habits (id, name, description, color, icon, frequency_kind, frequency_target,
                             frequency_days, reminder_time, position, created_at, archived_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name, description = excluded.description, color = excluded.color,
           icon = excluded.icon, frequency_kind = excluded.frequency_kind,
           frequency_target = excluded.frequency_target, frequency_days = excluded.frequency_days,
           reminder_time = excluded.reminder_time, position = excluded.position,
           created_at = excluded.created_at, archived_at = excluded.archived_at`,
        [
          habit.id,
          habit.name,
          habit.description,
          habit.color,
          habit.icon,
          frequency.kind,
          frequency.target,
          frequency.days,
          habit.reminderTime,
          habit.position,
          habit.createdAt,
          habit.archivedAt,
        ],
      );
    }

    for (const completion of backup.completions) {
      await db.runAsync(
        `INSERT INTO completions (habit_id, local_date, completed_at, note)
         VALUES (?, ?, ?, ?) ON CONFLICT(habit_id, local_date) DO NOTHING`,
        [completion.habitId, completion.localDate, completion.completedAt, completion.note],
      );
    }

    await db.runAsync(
      `INSERT INTO preferences (key, value) VALUES ('theme', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [backup.preferences.theme],
    );
    await db.runAsync(
      `INSERT INTO preferences (key, value) VALUES ('weekStartsOn', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [String(backup.preferences.weekStartsOn)],
    );
  });

  return { habits: backup.habits.length, completions: backup.completions.length };
}
