import {
  ACTIVE_HABIT_LIMIT,
  COLOR_TOKENS,
  HABIT_ICONS,
  MAX_COMPLETION_NOTE,
  MAX_HABIT_DESCRIPTION,
  MAX_HABIT_NAME,
  MAX_TARGET_PER_WEEK,
  MIN_TARGET_PER_WEEK,
  isColorToken,
  timesPerWeek,
  type Frequency,
} from '../types';

describe('colour tokens', () => {
  it('only recognises the tokens the palette actually ships', () => {
    expect(isColorToken('violet')).toBe(true);
    expect(isColorToken('lime')).toBe(true);
    expect(isColorToken('chartreuse')).toBe(false);
    expect(isColorToken('')).toBe(false);
  });

  it('lists every token it accepts', () => {
    for (const token of COLOR_TOKENS) {
      expect(isColorToken(token)).toBe(true);
    }
  });
});

describe('timesPerWeek', () => {
  it('reads the quota off a weekly frequency', () => {
    const weekly: Frequency = { kind: 'times_per_week', target: 4 };
    expect(timesPerWeek(weekly)).toBe(4);
  });

  it('is null whenever the obligation is not a quota', () => {
    expect(timesPerWeek({ kind: 'every_day' })).toBeNull();
    expect(timesPerWeek({ kind: 'specific_days', days: [1] })).toBeNull();
  });
});

describe('limits', () => {
  it('keeps the editor bounds sensible', () => {
    expect(MIN_TARGET_PER_WEEK).toBe(1);
    expect(MAX_TARGET_PER_WEEK).toBe(7);
    expect(MAX_HABIT_NAME).toBeGreaterThan(0);
    expect(MAX_HABIT_DESCRIPTION).toBeGreaterThan(MAX_HABIT_NAME);
    expect(MAX_COMPLETION_NOTE).toBe(MAX_HABIT_DESCRIPTION);
    expect(ACTIVE_HABIT_LIMIT).toBe(24);
  });

  it('offers a distinct icon per picker slot', () => {
    expect(new Set(HABIT_ICONS).size).toBe(HABIT_ICONS.length);
    expect(HABIT_ICONS.length).toBeGreaterThan(6);
  });
});
