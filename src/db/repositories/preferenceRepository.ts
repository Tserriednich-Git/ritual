import type { SQLiteDatabase } from 'expo-sqlite';

export type ThemePreference = 'system' | 'light' | 'dark';
export type WeekStartPreference = 0 | 1;

const KEY_THEME = 'theme';
const KEY_WEEK_START = 'weekStartsOn';
const KEY_ONBOARDING = 'onboardingCompletedAt';

export async function getPreference(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM preferences WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

export async function setPreference(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO preferences (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

export async function getTheme(db: SQLiteDatabase): Promise<ThemePreference> {
  const value = await getPreference(db, KEY_THEME);
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function setTheme(db: SQLiteDatabase, theme: ThemePreference): Promise<void> {
  return setPreference(db, KEY_THEME, theme);
}

export async function getWeekStartsOn(db: SQLiteDatabase): Promise<WeekStartPreference> {
  return (await getPreference(db, KEY_WEEK_START)) === '0' ? 0 : 1;
}

export function setWeekStartsOn(db: SQLiteDatabase, value: WeekStartPreference): Promise<void> {
  return setPreference(db, KEY_WEEK_START, String(value));
}

export async function hasCompletedOnboarding(db: SQLiteDatabase): Promise<boolean> {
  return (await getPreference(db, KEY_ONBOARDING)) !== null;
}

export function markOnboardingComplete(db: SQLiteDatabase, at: number = Date.now()): Promise<void> {
  return setPreference(db, KEY_ONBOARDING, String(at));
}
