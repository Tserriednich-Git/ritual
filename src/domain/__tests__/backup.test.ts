import {
  BACKUP_SCHEMA,
  BACKUP_VERSION,
  buildBackupFile,
  parseBackup,
  serialiseBackup,
  toCompletionsCsv,
  type BackupFile,
} from '../backup';
import type { Completion, Habit } from '../types';

const habit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  name: 'Read',
  description: 'Ten pages.',
  color: 'teal',
  icon: '📚',
  frequency: { kind: 'times_per_week', target: 3 },
  reminderTime: '21:30',
  position: 0,
  createdAt: 1_770_000_000_000,
  archivedAt: null,
  ...overrides,
});

const completion = (
  habitId: string,
  localDate: string,
  id = `${habitId}-${localDate}`,
): Completion => ({
  id,
  habitId,
  localDate,
  completedAt: 1_770_000_000_000,
  note: '',
});

function backupJson(overrides: Record<string, unknown> = {}): string {
  const base = buildBackupFile(
    [habit()],
    [completion('h1', '2026-03-02')],
    {
      theme: 'dark',
      weekStartsOn: 1,
    },
    '2026-03-30T08:00:00.000Z',
  );
  return JSON.stringify({ ...base, ...overrides });
}

describe('round trip', () => {
  it('re-reads what it writes', () => {
    const file = buildBackupFile(
      [habit(), habit({ id: 'h2', name: 'Run', color: 'amber' })],
      [completion('h1', '2026-03-02'), completion('h2', '2026-03-03')],
      { theme: 'system', weekStartsOn: 0 },
      '2026-03-30T08:00:00.000Z',
    );
    const result = parseBackup(serialiseBackup(file));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.habits).toHaveLength(2);
    expect(result.backup.completions).toHaveLength(2);
    expect(result.backup.preferences).toEqual({ theme: 'system', weekStartsOn: 0 });
    expect(result.backup.exportedAt).toBe('2026-03-30T08:00:00.000Z');
  });
});

describe('parseBackup rejects unusable files', () => {
  it('reports malformed JSON instead of throwing', () => {
    const result = parseBackup('{ not json');
    expect(result).toEqual({
      ok: false,
      issues: [{ path: '$', message: 'File is not valid JSON.' }],
    });
  });

  it('rejects a non-object root, a foreign schema, and an unknown version', () => {
    expect(parseBackup('[]').ok).toBe(false);
    const schema = parseBackup(backupJson({ schema: 'other.app' }));
    expect(!schema.ok && schema.issues[0]?.path).toBe('$.schema');
    const version = parseBackup(backupJson({ version: 99 }));
    expect(!version.ok && version.issues[0]?.path).toBe('$.version');
  });

  it('rejects a file with no importable habits', () => {
    const result = parseBackup(backupJson({ habits: [], completions: [] }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path === '$.habits')).toBe(true);
    }
  });

  it('requires both array fields', () => {
    const missing = JSON.stringify({ schema: BACKUP_SCHEMA, version: BACKUP_VERSION, habits: [] });
    expect(parseBackup(missing).ok).toBe(false);
  });
});

describe('parseBackup repairs partial data', () => {
  it('drops broken habits but keeps the rest', () => {
    const result = parseBackup(
      JSON.stringify({
        schema: BACKUP_SCHEMA,
        version: BACKUP_VERSION,
        habits: [habit(), { id: 'bad' }, habit({ id: 'h3', name: 'Run' })],
        completions: [completion('h1', '2026-03-02'), completion('h3', '2026-03-04')],
        preferences: { theme: 'light', weekStartsOn: 0 },
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.habits.map((h) => h.id)).toEqual(['h1', 'h3']);
    expect(result.backup.completions).toHaveLength(2);
    expect(result.issues).toEqual([{ path: '$.habits[1]', message: expect.any(String) }]);
  });

  it('discards completions that point at a habit the file does not contain', () => {
    const result = parseBackup(
      JSON.stringify({
        schema: BACKUP_SCHEMA,
        version: BACKUP_VERSION,
        habits: [habit()],
        completions: [completion('h1', '2026-03-02'), completion('ghost', '2026-03-03')],
        preferences: {},
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.completions).toHaveLength(1);
    expect(result.issues[0]?.path).toBe('$.completions[1]');
  });

  it('collapses duplicate day rows so the UNIQUE index can hold them', () => {
    const result = parseBackup(
      JSON.stringify({
        schema: BACKUP_SCHEMA,
        version: BACKUP_VERSION,
        habits: [habit()],
        completions: [
          completion('h1', '2026-03-02', 'a'),
          completion('h1', '2026-03-02', 'b'),
          completion('h1', '2026-03-03', 'c'),
        ],
        preferences: {},
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.completions.map((c) => c.id)).toEqual(['a', 'c']);
  });

  it('rejects a completion with an impossible date', () => {
    const result = parseBackup(
      JSON.stringify({
        schema: BACKUP_SCHEMA,
        version: BACKUP_VERSION,
        habits: [habit()],
        completions: [completion('h1', '2026-02-30')],
        preferences: {},
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.completions).toHaveLength(0);
  });

  it('falls back to safe defaults for unknown colours, times and frequencies', () => {
    // Written as raw JSON because a hostile file is not type-checked on the way in.
    const result = parseBackup(
      JSON.stringify({
        schema: BACKUP_SCHEMA,
        version: BACKUP_VERSION,
        habits: [
          { ...habit(), color: 'chartreuse', reminderTime: '9pm' },
          { ...habit(), id: 'h2', frequency: { kind: 'nonsense' } },
        ],
        completions: [],
        preferences: { theme: 'neon', weekStartsOn: 7 },
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [first] = result.backup.habits;
    expect(result.backup.habits).toHaveLength(1);
    expect(first?.color).toBe('violet');
    expect(first?.reminderTime).toBeNull();
    expect(result.backup.preferences).toEqual({ theme: 'system', weekStartsOn: 1 });
  });

  it('truncates oversized text instead of rejecting the row', () => {
    const result = parseBackup(
      JSON.stringify({
        schema: BACKUP_SCHEMA,
        version: BACKUP_VERSION,
        habits: [habit({ name: 'x'.repeat(200), description: 'y'.repeat(500) })],
        completions: [],
        preferences: {},
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.habits[0]?.name.length).toBe(48);
    expect(result.backup.habits[0]?.description.length).toBe(140);
  });

  it('coerces a fractional weekly target rather than failing the import', () => {
    const result = parseBackup(
      JSON.stringify({
        schema: BACKUP_SCHEMA,
        version: BACKUP_VERSION,
        habits: [habit({ frequency: { kind: 'times_per_week', target: 2.7 } })],
        completions: [],
        preferences: {},
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.habits[0]?.frequency).toEqual({ kind: 'times_per_week', target: 2 });
  });
});

describe('toCompletionsCsv', () => {
  it('writes one row per check-in with a stable header', () => {
    const csv = toCompletionsCsv([habit()], new Map([['h1', ['2026-03-02', '2026-03-04']]]));
    const lines = csv.trimEnd().split('\r\n');
    expect(lines[0]).toBe('habit,icon,frequency,day,note');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('Read,📚,3x/week,2026-03-02,');
  });

  it('quotes cells that would otherwise break the grid', () => {
    const csv = toCompletionsCsv(
      [habit({ name: 'Floss, "gently"' })],
      new Map([['h1', ['2026-03-02']]]),
      new Map([['h1', new Map([['2026-03-02', 'saw blood\nagain']])]]),
    );
    expect(csv).toContain('"Floss, ""gently"""');
    expect(csv).toContain('"saw blood\nagain"');
  });

  it('labels each frequency kind differently and skips orphan ids', () => {
    const csv = toCompletionsCsv(
      [
        habit({ id: 'a', frequency: { kind: 'every_day' } }),
        habit({ id: 'b', frequency: { kind: 'specific_days', days: [1, 3] } }),
      ],
      new Map([
        ['a', ['2026-03-02']],
        ['b', ['2026-03-02']],
        ['missing', ['2026-03-02']],
      ]),
    );
    expect(csv).toContain(',daily,');
    expect(csv).toContain(',2d/week,');
    expect(csv.trimEnd().split('\r\n')).toHaveLength(3);
  });
});

describe('buildBackupFile', () => {
  it('stamps the schema and version the importer expects', () => {
    const file: BackupFile = buildBackupFile([habit()], [], { theme: 'system', weekStartsOn: 1 });
    expect(file.schema).toBe(BACKUP_SCHEMA);
    expect(file.version).toBe(BACKUP_VERSION);
    expect(typeof file.exportedAt).toBe('string');
  });
});
