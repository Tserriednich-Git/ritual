import type { SQLiteDatabase } from 'expo-sqlite';

import type { Habit, HabitDraft } from '../../domain/types';
import { rowToHabit, serialiseFrequency } from '../mapping';
import type { HabitRow } from '../types';

export type ListOptions = { includeArchived?: boolean };

const SELECT_ALL = `
  SELECT id, name, description, color, icon, frequency_kind, frequency_target,
         frequency_days, reminder_time, position, created_at, archived_at
  FROM habits
`;

export async function listHabits(db: SQLiteDatabase, options: ListOptions = {}): Promise<Habit[]> {
  const sql = options.includeArchived
    ? `${SELECT_ALL} ORDER BY position ASC, created_at ASC`
    : `${SELECT_ALL} WHERE archived_at IS NULL ORDER BY position ASC, created_at ASC`;
  const rows = await db.getAllAsync<HabitRow>(sql);
  return rows.map(rowToHabit);
}

export async function getHabit(db: SQLiteDatabase, id: string): Promise<Habit | null> {
  const row = await db.getFirstAsync<HabitRow>(`${SELECT_ALL} WHERE id = ?`, [id]);
  return row ? rowToHabit(row) : null;
}

export async function countActiveHabits(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(1) AS total FROM habits WHERE archived_at IS NULL',
  );
  return row?.total ?? 0;
}

export async function nextPosition(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ max_position: number | null }>(
    'SELECT MAX(position) AS max_position FROM habits',
  );
  return (row?.max_position ?? -1) + 1;
}

export async function insertHabit(
  db: SQLiteDatabase,
  draft: HabitDraft,
  id: string,
  createdAt: number = Date.now(),
): Promise<Habit> {
  const frequency = serialiseFrequency(draft.frequency);
  const position = await nextPosition(db);
  await db.runAsync(
    `INSERT INTO habits (id, name, description, color, icon, frequency_kind, frequency_target,
                         frequency_days, reminder_time, position, created_at, archived_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [
      id,
      draft.name,
      draft.description,
      draft.color,
      draft.icon,
      frequency.kind,
      frequency.target,
      frequency.days,
      draft.reminderTime,
      position,
      createdAt,
    ],
  );
  const inserted = await getHabit(db, id);
  if (!inserted) throw new Error(`Habit ${id} vanished immediately after insert`);
  return inserted;
}

export async function updateHabit(db: SQLiteDatabase, habit: Habit): Promise<void> {
  const frequency = serialiseFrequency(habit.frequency);
  await db.runAsync(
    `UPDATE habits
       SET name = ?, description = ?, color = ?, icon = ?, frequency_kind = ?,
           frequency_target = ?, frequency_days = ?, reminder_time = ?, position = ?,
           archived_at = ?
     WHERE id = ?`,
    [
      habit.name,
      habit.description,
      habit.color,
      habit.icon,
      frequency.kind,
      frequency.target,
      frequency.days,
      habit.reminderTime,
      habit.position,
      habit.archivedAt,
      habit.id,
    ],
  );
}

/** Soft delete: keeps the completion history for the archive view. */
export async function archiveHabit(
  db: SQLiteDatabase,
  id: string,
  at: number = Date.now(),
): Promise<void> {
  await db.runAsync('UPDATE habits SET archived_at = ?, reminder_time = NULL WHERE id = ?', [
    at,
    id,
  ]);
}

export async function unarchiveHabit(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('UPDATE habits SET archived_at = NULL WHERE id = ?', [id]);
}

/** Hard delete; the FK is `ON DELETE CASCADE`, so completions go with it. */
export async function deleteHabit(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM habits WHERE id = ?', [id]);
}

export async function reorderHabits(db: SQLiteDatabase, orderedIds: string[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const [index, id] of orderedIds.entries()) {
      await db.runAsync('UPDATE habits SET position = ? WHERE id = ?', [index, id]);
    }
  });
}
