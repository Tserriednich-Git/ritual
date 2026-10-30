import type { Frequency } from '../../domain/types';
import type { HabitRow } from '../types';
import { isISODate, parseFrequency, rowToHabit, serialiseFrequency } from '../mapping';

const baseRow: HabitRow = {
  id: 'h1',
  name: 'Read',
  description: 'Ten pages.',
  color: 'teal',
  icon: '📚',
  frequency_kind: 'every_day',
  frequency_target: null,
  frequency_days: '[]',
  reminder_time: '21:30',
  position: 2,
  created_at: 1_770_000_000_000,
  archived_at: null,
};

describe('frequency serialisation', () => {
  it('round-trips every frequency kind through the row columns', () => {
    const cases: Frequency[] = [
      { kind: 'every_day' },
      { kind: 'times_per_week', target: 4 },
      { kind: 'specific_days', days: [1, 3, 5] },
    ];
    for (const frequency of cases) {
      const columns = serialiseFrequency(frequency);
      expect(parseFrequency(columns.kind, columns.target, columns.days)).toEqual(frequency);
    }
  });

  it('clamps a weekly target back into the legal range', () => {
    expect(parseFrequency('times_per_week', 0, '[]')).toEqual({
      kind: 'times_per_week',
      target: 1,
    });
    expect(parseFrequency('times_per_week', 99, '[]')).toEqual({
      kind: 'times_per_week',
      target: 7,
    });
    expect(parseFrequency('times_per_week', 3.7, '[]')).toEqual({
      kind: 'times_per_week',
      target: 3,
    });
    expect(parseFrequency('times_per_week', null, '[]')).toEqual({
      kind: 'times_per_week',
      target: 3,
    });
  });

  it('keeps only in-range weekday numbers', () => {
    expect(parseFrequency('specific_days', null, '[1,3,9,-2,"4"]')).toEqual({
      kind: 'specific_days',
      days: [1, 3],
    });
  });

  it('demotes an empty or unparseable day list to a 1× weekly quota', () => {
    // A habit that is never due would silently disappear from the Today screen.
    const demoted = { kind: 'times_per_week', target: 1 };
    expect(parseFrequency('specific_days', null, '[]')).toEqual(demoted);
    expect(parseFrequency('specific_days', null, 'not json')).toEqual(demoted);
    expect(parseFrequency('specific_days', null, '{"a":1}')).toEqual(demoted);
  });

  it('falls back to every_day for an unknown kind', () => {
    expect(parseFrequency('monthly', null, '[]')).toEqual({ kind: 'every_day' });
  });
});

describe('rowToHabit', () => {
  it('maps a healthy row onto the domain shape', () => {
    expect(rowToHabit(baseRow)).toEqual({
      id: 'h1',
      name: 'Read',
      description: 'Ten pages.',
      color: 'teal',
      icon: '📚',
      frequency: { kind: 'every_day' },
      reminderTime: '21:30',
      position: 2,
      createdAt: 1_770_000_000_000,
      archivedAt: null,
    });
  });

  it('substitutes safe values instead of throwing on bad data', () => {
    const habit = rowToHabit({
      ...baseRow,
      color: 'chartreuse',
      icon: '',
      reminder_time: '9pm',
      description: '',
    });
    expect(habit.color).toBe('violet');
    expect(habit.icon).toBe('✅');
    expect(habit.reminderTime).toBeNull();
  });

  it('truncates a name that outgrew the column', () => {
    expect(rowToHabit({ ...baseRow, name: 'x'.repeat(200) }).name).toHaveLength(48);
  });
});

describe('isISODate', () => {
  it('accepts the shape the completions table stores', () => {
    expect(isISODate('2026-03-28')).toBe(true);
  });

  it('rejects anything that is not a padded calendar string', () => {
    expect(isISODate('2026-3-28')).toBe(false);
    expect(isISODate('2026-03-28T00:00:00Z')).toBe(false);
    expect(isISODate('')).toBe(false);
    expect(isISODate(null)).toBe(false);
    expect(isISODate(20260328)).toBe(false);
  });
});
