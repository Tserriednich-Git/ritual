import type { SQLiteDatabase } from 'expo-sqlite';

import type { Completion } from '../../domain/types';
import type { CompletionRow, CountRow } from '../types';
import { isISODate } from '../mapping';

export async function listCompletions(db: SQLiteDatabase, habitId: string): Promise<Completion[]> {
  const rows = await db.getAllAsync<CompletionRow>(
    `SELECT id, habit_id, local_date, completed_at, note
       FROM completions
      WHERE habit_id = ?
      ORDER BY local_date ASC`,
    [habitId],
  );
  return rows
    .filter((row) => isISODate(row.local_date))
    .map((row) => ({
      id: String(row.id),
      habitId: row.habit_id,
      localDate: row.local_date,
      completedAt: row.completed_at,
      note: row.note,
    }));
}

/** Just the dates — the streak engine needs no more than this. */
export async function listCompletionDates(db: SQLiteDatabase, habitId: string): Promise<string[]> {
  const rows = await db.getAllAsync<{ local_date: string }>(
    'SELECT local_date FROM completions WHERE habit_id = ? ORDER BY local_date ASC',
    [habitId],
  );
  return rows.map((row) => row.local_date);
}

export async function listAllCompletionDates(db: SQLiteDatabase): Promise<Map<string, string[]>> {
  const rows = await db.getAllAsync<{ habit_id: string; local_date: string }>(
    'SELECT habit_id, local_date FROM completions ORDER BY habit_id, local_date',
  );
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const bucket = map.get(row.habit_id);
    if (bucket) bucket.push(row.local_date);
    else map.set(row.habit_id, [row.local_date]);
  }
  return map;
}

export async function isCompletedOn(
  db: SQLiteDatabase,
  habitId: string,
  localDate: string,
): Promise<boolean> {
  const row = await db.getFirstAsync<{ exists: number }>(
    'SELECT 1 AS exists FROM completions WHERE habit_id = ? AND local_date = ? LIMIT 1',
    [habitId, localDate],
  );
  return row !== null;
}

/**
 * `INSERT OR IGNORE` against the UNIQUE(habit_id, local_date) index makes this
 * idempotent, which matters because a double tap or a retried background task
 * must not create a second row for the same day.
 */
export async function complete(
  db: SQLiteDatabase,
  habitId: string,
  localDate: string,
  note = '',
  completedAt: number = Date.now(),
): Promise<{ changed: boolean }> {
  const result = await db.runAsync(
    `INSERT OR IGNORE INTO completions (habit_id, local_date, completed_at, note)
     VALUES (?, ?, ?, ?)`,
    [habitId, localDate, completedAt, note],
  );
  return { changed: result.changes > 0 };
}

export async function uncomplete(
  db: SQLiteDatabase,
  habitId: string,
  localDate: string,
): Promise<void> {
  await db.runAsync('DELETE FROM completions WHERE habit_id = ? AND local_date = ?', [
    habitId,
    localDate,
  ]);
}

export async function setNote(
  db: SQLiteDatabase,
  habitId: string,
  localDate: string,
  note: string,
): Promise<void> {
  await db.runAsync('UPDATE completions SET note = ? WHERE habit_id = ? AND local_date = ?', [
    note,
    habitId,
    localDate,
  ]);
}

/** Toggle returns the new state so the UI can animate without re-querying. */
export async function toggleCompletion(
  db: SQLiteDatabase,
  habitId: string,
  localDate: string,
  note = '',
): Promise<boolean> {
  if (await isCompletedOn(db, habitId, localDate)) {
    await uncomplete(db, habitId, localDate);
    return false;
  }
  await complete(db, habitId, localDate, note);
  return true;
}

export async function completionCounts(db: SQLiteDatabase): Promise<Map<string, number>> {
  const rows = await db.getAllAsync<CountRow>(
    'SELECT habit_id, COUNT(1) AS total FROM completions GROUP BY habit_id',
  );
  return new Map(rows.map((row) => [row.habit_id, row.total]));
}

export async function deleteCompletionsBefore(
  db: SQLiteDatabase,
  cutoffISO: string,
): Promise<number> {
  const result = await db.runAsync('DELETE FROM completions WHERE local_date < ?', [cutoffISO]);
  return result.changes;
}
