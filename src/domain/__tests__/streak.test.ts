import { computeStreak, frequencyUnit, isSatisfiedToday, streakLabel } from '../streak';
import type { Frequency } from '../types';

const daily: Frequency = { kind: 'every_day' };
const weekly3: Frequency = { kind: 'times_per_week', target: 3 };
const monWedFri: Frequency = { kind: 'specific_days', days: [1, 3, 5] };

function days(from: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(`${from}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

describe('day streaks', () => {
  it('counts consecutive scheduled days ending today', () => {
    const today = '2026-03-10';
    const streak = computeStreak(daily, days('2026-03-06', 5), '2026-03-01', today);
    expect(streak).toEqual({ unit: 'day', current: 5, longest: 5 });
  });

  it('gives today a grace period instead of breaking the run', () => {
    // Yesterday and the days before are done; today simply has not happened yet.
    const streak = computeStreak(daily, days('2026-03-05', 5), '2026-03-01', '2026-03-10');
    expect(streak.current).toBe(5);
  });

  it('breaks the run on a missed day and keeps the longest', () => {
    const completions = [...days('2026-03-01', 3), ...days('2026-03-07', 3)];
    const streak = computeStreak(daily, completions, '2026-03-01', '2026-03-09');
    expect(streak.current).toBe(3);
    expect(streak.longest).toBe(3);
  });

  it('stays alive on a day the habit is not due', () => {
    // Sunday 29 Mar: nothing was expected, so the run must not be treated as broken.
    const streak = computeStreak(
      monWedFri,
      ['2026-03-23', '2026-03-25', '2026-03-27'],
      '2026-03-01',
      '2026-03-29',
    );
    expect(streak.current).toBe(3);
  });

  it('ignores days before the habit existed', () => {
    const streak = computeStreak(daily, ['2026-02-01', '2026-02-02'], '2026-03-01', '2026-03-01');
    expect(streak).toEqual({ unit: 'day', current: 0, longest: 0 });
  });

  it('does not punish a fixed-day habit for the weekend', () => {
    // Fri 13 and Mon 16 are consecutive *scheduled* days; Sat/Sun are not due.
    const streak = computeStreak(
      monWedFri,
      ['2026-03-13', '2026-03-16'],
      '2026-03-01',
      '2026-03-16',
    );
    expect(streak.current).toBe(2);
  });

  it('resumes from the last scheduled day only when nothing was skipped', () => {
    // Mon 2, Wed 4, Fri 6 then a gap at Mon 9; today is Wed 11.
    const streak = computeStreak(
      monWedFri,
      ['2026-03-02', '2026-03-04', '2026-03-06', '2026-03-11'],
      '2026-03-01',
      '2026-03-11',
    );
    expect(streak.current).toBe(1);
    expect(streak.longest).toBe(3);
  });
});

describe('week streaks', () => {
  it('measures a weekly quota in weeks, not days', () => {
    const completions = [
      '2026-03-02',
      '2026-03-04',
      '2026-03-06', // W10 — on target
      '2026-03-09',
      '2026-03-11',
      '2026-03-13', // W11 — on target
      '2026-03-16',
      '2026-03-18', // W12 — two in, still open
    ];
    const streak = computeStreak(weekly3, completions, '2026-03-02', '2026-03-18');
    expect(streak.unit).toBe('week');
    expect(streak.current).toBe(2);
    expect(streak.longest).toBe(2);
  });

  it('drops the streak when a whole week misses the target', () => {
    const completions = [
      '2026-03-01', // W09 — only one, below target
      '2026-03-09',
      '2026-03-11',
      '2026-03-13',
    ];
    const streak = computeStreak(weekly3, completions, '2026-03-01', '2026-03-13');
    expect(streak.current).toBe(1);
    expect(streak.longest).toBe(1);
  });

  it('never counts a completion landed in the next week backwards', () => {
    // Two weeks on target, then a two-week blank run, then one late check-in.
    const completions = [
      '2026-03-02',
      '2026-03-04',
      '2026-03-06',
      '2026-03-09',
      '2026-03-11',
      '2026-03-13',
      '2026-03-30',
    ];
    const streak = computeStreak(weekly3, completions, '2026-03-02', '2026-03-30');
    expect(streak.current).toBe(0);
    expect(streak.longest).toBe(2);
  });
});

describe('isSatisfiedToday', () => {
  it('reads a daily habit as done only when today itself is checked', () => {
    expect(isSatisfiedToday(daily, ['2026-03-10'], '2026-03-10')).toBe(true);
    expect(isSatisfiedToday(daily, ['2026-03-09'], '2026-03-10')).toBe(false);
  });

  it('reports a non-due day for a fixed-day habit as unsatisfied', () => {
    // Sunday is not in the plan, so the Today card should not show it as pending.
    expect(isSatisfiedToday(monWedFri, ['2026-03-15'], '2026-03-15')).toBe(false);
  });

  it('satisfies a quota as soon as the week reaches the target', () => {
    expect(isSatisfiedToday(weekly3, ['2026-03-16', '2026-03-18'], '2026-03-18')).toBe(false);
    expect(
      isSatisfiedToday(weekly3, ['2026-03-16', '2026-03-18', '2026-03-19'], '2026-03-19'),
    ).toBe(true);
    // Last week's three do not carry over.
    expect(
      isSatisfiedToday(weekly3, ['2026-03-02', '2026-03-04', '2026-03-06'], '2026-03-18'),
    ).toBe(false);
  });
});

describe('labels and units', () => {
  it('derives the streak unit from the frequency', () => {
    expect(frequencyUnit(daily)).toBe('day');
    expect(frequencyUnit(monWedFri)).toBe('day');
    expect(frequencyUnit(weekly3)).toBe('week');
  });

  it('pluralises correctly', () => {
    expect(streakLabel({ unit: 'day', current: 1, longest: 1 })).toBe('1 day');
    expect(streakLabel({ unit: 'day', current: 7, longest: 7 })).toBe('7 days');
    expect(streakLabel({ unit: 'week', current: 1, longest: 1 })).toBe('1 week');
    expect(streakLabel({ unit: 'week', current: 6, longest: 6 })).toBe('6 weeks');
    expect(streakLabel({ unit: 'day', current: 0, longest: 4 })).toBe('0 days');
  });
});
