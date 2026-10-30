/**
 * Civil-date utilities.
 *
 * Ritual stores check-ins as `YYYY-MM-DD` strings in the user's *local* calendar
 * day. Everything here operates on that string form and on integer day numbers
 * derived from UTC, so DST transitions and time-zone offsets can never shift a
 * completion into the wrong day.
 */

export const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
export const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const MS_PER_DAY = 86_400_000;

export type CivilDate = { year: number; month: number; day: number };

export function toISODate({ year, month, day }: CivilDate): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}`;
}

export function fromISODate(iso: string): CivilDate {
  const match = ISO_DATE_PATTERN.exec(iso);
  if (!match) {
    throw new RangeError(`Not a valid YYYY-MM-DD date: "${iso}"`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Reject things like 2026-02-30 by round-tripping through Date.UTC.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new RangeError(`Not a real calendar date: "${iso}"`);
  }
  return { year, month, day };
}

export function isValidISODate(iso: string): boolean {
  try {
    fromISODate(iso);
    return true;
  } catch {
    return false;
  }
}

export function fromDate(date: Date): CivilDate {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

/** Local calendar day of a Date instance. */
export function toDate(date: Date): string {
  return toISODate(fromDate(date));
}

/** Today in the device's local calendar. Injectable clock keeps tests deterministic. */
export function todayISO(now: Date = new Date()): string {
  return toISODate(fromDate(now));
}

/** Integer day index (days since 1970-01-01). DST-safe because it uses UTC parts. */
export function dayNumber(iso: string): number {
  const { year, month, day } = fromISODate(iso);
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

export function isoFromDayNumber(n: number): string {
  const probe = new Date(n * MS_PER_DAY);
  return toISODate({
    year: probe.getUTCFullYear(),
    month: probe.getUTCMonth() + 1,
    day: probe.getUTCDate(),
  });
}

export function addDays(iso: string, delta: number): string {
  return isoFromDayNumber(dayNumber(iso) + delta);
}

/** Positive when `b` is later than `a`. */
export function diffDays(a: string, b: string): number {
  return dayNumber(b) - dayNumber(a);
}

export function isBefore(a: string, b: string): boolean {
  return dayNumber(a) < dayNumber(b);
}

export function clampISO(iso: string, minISO: string, maxISO: string): string {
  if (isBefore(iso, minISO)) return minISO;
  if (isBefore(maxISO, iso)) return maxISO;
  return iso;
}

/**
 * Monday-based start of week by default, matching the ISO definition.
 * `weekStartsOn`: 0 = Sunday … 6 = Saturday.
 */
export function startOfWeekISO(iso: string, weekStartsOn = 1): string {
  const { year, month, day } = fromISODate(iso);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const offset = (weekday - weekStartsOn + 7) % 7;
  return addDays(iso, -offset);
}

/**
 * ISO 8601 week: weeks start Monday, and week 1 is the week containing the
 * first Thursday of the year. The Thursday of a week pins its ISO year, which
 * is why 2026-01-01 belongs to 2026-W01 but 2027-01-01 belongs to 2026-W53.
 */
export function isoWeek(iso: string): { isoYear: number; week: number } {
  const thursday = dayNumber(iso) - ((weekdayOf(iso) + 6) % 7) + 3;
  const isoYear = fromISODate(isoFromDayNumber(thursday)).year;
  const jan1 = new Date(Date.UTC(isoYear, 0, 1));
  const firstThursday =
    Math.floor(Date.UTC(isoYear, 0, 1) / MS_PER_DAY) + ((4 - jan1.getUTCDay() + 7) % 7);
  return { isoYear, week: 1 + Math.floor((thursday - firstThursday) / 7) };
}

export function weekKey(iso: string): string {
  const { isoYear, week } = isoWeek(iso);
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function weekdayOf(iso: string): Weekday {
  const { year, month, day } = fromISODate(iso);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() as Weekday;
}

const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const weekdayShortNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function weekdayLabel(iso: string, locale = 'en'): string {
  const index = weekdayOf(iso);
  const fallback = WEEKDAY_LABELS[index] ?? '';
  try {
    return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
      new Date(dayNumber(iso) * MS_PER_DAY),
    );
  } catch {
    return fallback.slice(0, 3);
  }
}

/** Human-friendly relative label used in headers. Degrades to the raw date. */
export function friendlyDateLabel(iso: string, today = todayISO(), locale = 'en'): string {
  const delta = diffDays(today, iso);
  if (delta === 0) return 'Today';
  if (delta === -1) return 'Yesterday';
  if (delta === 1) return 'Tomorrow';
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(
      new Date(dayNumber(iso) * MS_PER_DAY),
    );
  } catch {
    return iso;
  }
}

export type TimeOfDay = { hour: number; minute: number };

export function parseTime(value: string): TimeOfDay | null {
  const match = TIME_PATTERN.exec(value.trim());
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export function formatTime({ hour, minute }: TimeOfDay, locale = 'en'): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      // The instant below is a stand-in for a wall clock, so it must be read back in UTC.
      timeZone: 'UTC',
      hour12: !locale.startsWith('en'),
    }).format(new Date(Date.UTC(1970, 0, 1, hour, minute)));
  } catch {
    return `${pad(hour)}:${pad(minute)}`;
  }
}

/** Inclusive list of days from `fromISO` to `toISO`. */
export function enumerateDays(fromISO: string, toISO: string): string[] {
  const total = diffDays(fromISO, toISO);
  if (total < 0) return [];
  return Array.from({ length: total + 1 }, (_, i) => addDays(fromISO, i));
}
