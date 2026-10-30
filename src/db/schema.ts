/** Bumping this requires a matching entry in `migrations.ts`. */
export const DATABASE_NAME = 'ritual.db';
export const DATABASE_VERSION = 1;

/**
 * Static DDL only. `execAsync` performs no parameter escaping, so every value
 * in this file is a literal and every user-supplied value goes through
 * `runAsync` with bound parameters.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS habits (
  id                TEXT    PRIMARY KEY NOT NULL,
  name              TEXT    NOT NULL,
  description       TEXT    NOT NULL DEFAULT '',
  color             TEXT    NOT NULL DEFAULT 'violet',
  icon              TEXT    NOT NULL DEFAULT '✅',
  frequency_kind    TEXT    NOT NULL,
  frequency_target  INTEGER,
  frequency_days    TEXT    NOT NULL DEFAULT '[]',
  reminder_time     TEXT,
  position          REAL    NOT NULL DEFAULT 0,
  created_at        INTEGER NOT NULL,
  archived_at       INTEGER,
  CHECK (frequency_kind IN ('every_day', 'times_per_week', 'specific_days')),
  CHECK (length(name) BETWEEN 1 AND 48),
  CHECK (reminder_time IS NULL OR length(reminder_time) = 5)
);

CREATE TABLE IF NOT EXISTS completions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id     TEXT    NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  local_date   TEXT    NOT NULL,
  completed_at INTEGER NOT NULL,
  note         TEXT    NOT NULL DEFAULT '',
  UNIQUE (habit_id, local_date),
  CHECK (length(local_date) = 10)
);

CREATE INDEX IF NOT EXISTS idx_habits_position ON habits (position);
CREATE INDEX IF NOT EXISTS idx_habits_active ON habits (archived_at);
CREATE INDEX IF NOT EXISTS idx_completions_habit_date ON completions (habit_id, local_date);

CREATE TABLE IF NOT EXISTS preferences (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;
