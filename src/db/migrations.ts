import type { SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_VERSION, SCHEMA_SQL } from './schema';

export type Migration = {
  version: number;
  sql: string;
};

/**
 * Append-only. Shipped migrations are never edited; a schema change means a new
 * entry and `DATABASE_VERSION + 1`.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: SCHEMA_SQL,
  },
];

export async function readUserVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/**
 * Runs whatever is missing between the stored `user_version` and
 * `DATABASE_VERSION`. Safe to call on every cold start.
 */
export async function runMigrations(db: SQLiteDatabase): Promise<{ from: number; to: number }> {
  const from = await readUserVersion(db);
  if (from > DATABASE_VERSION) {
    throw new Error(
      `Database is at version ${from}, but the app only knows up to ${DATABASE_VERSION}. ` +
        'Reinstall an older build or restore a backup from that version.',
    );
  }

  // PRAGMAs cannot run inside a transaction, so enable them beforehand.
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const pending = MIGRATIONS.filter((migration) => migration.version > from).sort(
    (a, b) => a.version - b.version,
  );

  for (const migration of pending) {
    // A deferred transaction, not an exclusive one: expo-sqlite implements
    // withExclusiveTransactionAsync only on native, and one connection per app
    // never contends with another writer.
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }

  return { from, to: DATABASE_VERSION };
}
