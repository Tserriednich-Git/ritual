import {
  MAX_HABIT_DESCRIPTION,
  MAX_HABIT_NAME,
  type ColorToken,
  type Frequency,
  type HabitDraft,
} from '../types';
import { duplicateNameCheck, validateFrequency, validateHabit } from '../validation';

const validDraft: HabitDraft = {
  name: 'Read',
  description: 'Ten pages before bed.',
  color: 'teal',
  icon: '📚',
  frequency: { kind: 'times_per_week', target: 3 },
  reminderTime: '21:30',
};

const field = (errors: { field: string }[]) => errors.map((error) => error.field);

describe('validateHabit', () => {
  it('accepts a well-formed draft and trims its text', () => {
    const result = validateHabit({ ...validDraft, name: '  Read  ' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.draft.name).toBe('Read');
  });

  it('rejects a blank name', () => {
    const result = validateHabit({ ...validDraft, name: '   ' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(field(result.errors)).toContain('name');
  });

  it('rejects an over-long name and description', () => {
    const result = validateHabit({
      ...validDraft,
      name: 'n'.repeat(MAX_HABIT_NAME + 1),
      description: 'd'.repeat(MAX_HABIT_DESCRIPTION + 1),
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(field(result.errors)).toEqual(expect.arrayContaining(['name', 'description']));
  });

  it('only accepts known colour tokens', () => {
    // Untrusted input can carry any string, so the cast mirrors a real import.
    expect(validateHabit({ ...validDraft, color: 'chartreuse' as unknown as ColorToken }).ok).toBe(
      false,
    );
    expect(validateHabit({ ...validDraft, color: 'lime' }).ok).toBe(true);
  });

  it('requires an icon', () => {
    expect(validateHabit({ ...validDraft, icon: '  ' }).ok).toBe(false);
  });

  it('treats an empty reminder as off rather than malformed', () => {
    expect(validateHabit({ ...validDraft, reminderTime: null }).ok).toBe(true);
    expect(validateHabit({ ...validDraft, reminderTime: undefined }).ok).toBe(true);
    expect(validateHabit({ ...validDraft, reminderTime: '' }).ok).toBe(false);
  });

  it('requires a 24-hour reminder time', () => {
    expect(validateHabit({ ...validDraft, reminderTime: '9pm' }).ok).toBe(false);
    expect(validateHabit({ ...validDraft, reminderTime: '07:30' }).ok).toBe(true);
  });

  it('reports every problem at once so the form can highlight all fields', () => {
    const result = validateHabit({
      name: '',
      color: 'nope' as unknown as ColorToken,
      icon: '',
      frequency: undefined,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(3);
      expect(field(result.errors)).toEqual(
        expect.arrayContaining(['name', 'color', 'icon', 'frequency']),
      );
    }
  });
});

describe('validateFrequency', () => {
  const check = (frequency?: Frequency) => validateFrequency(frequency);

  it('accepts every-day habits unconditionally', () => {
    expect(check({ kind: 'every_day' })).toBeNull();
  });

  it('bounds a weekly target between 1 and 7 integers', () => {
    expect(check({ kind: 'times_per_week', target: 1 })).toBeNull();
    expect(check({ kind: 'times_per_week', target: 7 })).toBeNull();
    expect(check({ kind: 'times_per_week', target: 0 })).not.toBeNull();
    expect(check({ kind: 'times_per_week', target: 8 })).not.toBeNull();
    expect(check({ kind: 'times_per_week', target: 2.5 })).not.toBeNull();
  });

  it('needs at least one unique, in-range weekday', () => {
    expect(check({ kind: 'specific_days', days: [0, 6] })).toBeNull();
    expect(check({ kind: 'specific_days', days: [] })).not.toBeNull();
    expect(check({ kind: 'specific_days', days: [3, 3] })).not.toBeNull();
    expect(check({ kind: 'specific_days', days: [7 as never] })).not.toBeNull();
    expect(check({ kind: 'specific_days', days: [-1 as never] })).not.toBeNull();
  });

  it('fails when nothing has been chosen yet', () => {
    expect(check(undefined)).not.toBeNull();
  });
});

describe('duplicateNameCheck', () => {
  it('compares names case- and whitespace-insensitively', () => {
    expect(duplicateNameCheck(['Read'], '  read ')).not.toBeNull();
    expect(duplicateNameCheck(['Read'], 'Run')).toBeNull();
  });

  it('lets a habit keep its own name while editing', () => {
    expect(duplicateNameCheck(['Read', 'Run'], 'Read', 'Read')).toBeNull();
    expect(duplicateNameCheck(['Read', 'Run'], 'Run', 'Read')).not.toBeNull();
  });
});
