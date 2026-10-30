import { addDays } from '../date';
import {
  buildHeatmap,
  computeHabitStats,
  localDateFromEpoch,
  percentage,
  weekdayBreakdown,
} from '../stats';
import type { Frequency, Habit } from '../types';

const daily: Frequency = { kind: 'every_day' };
const weekly3: Frequency = { kind: 'times_per_week', target: 3 };
const monWedFri: Frequency = { kind: 'specific_days', days: [1, 3, 5] };

/** Local (not UTC) midnight — matches how createdAt is really stored. */
function epoch(y: number, m: number, d: number): number {
  return new Date(y, m - 1, d).getTime();
}

function days(from: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(from, i));
}

const habit = (
  frequency: Frequency,
  createdISO = '2026-03-01',
): Pick<Habit, 'frequency' | 'createdAt'> => {
  const [year = 1970, month = 1, day = 1] = createdISO.split('-').map(Number);
  return { frequency, createdAt: epoch(year, month, day) };
};

describe('localDateFromEpoch', () => {
  it('reads a timestamp in the local calendar, not UTC', () => {
    expect(localDateFromEpoch(epoch(2026, 3, 15))).toBe('2026-03-15');
    // 23:30 local must still be the 15th even where UTC has rolled over.
    expect(localDateFromEpoch(new Date(2026, 2, 15, 23, 30).getTime())).toBe('2026-03-15');
  });
});

describe('computeHabitStats', () => {
  it('measures consistency against the days the habit was actually due', () => {
    const stats = computeHabitStats(habit(daily), days('2026-03-01', 14), '2026-03-28');
    expect(stats.totalCompletions).toBe(14);
    expect(stats.consistency).toBeCloseTo(0.5, 5);
    expect(stats.lastCompletedDate).toBe('2026-03-14');
    expect(stats.streak).toEqual({ unit: 'day', current: 0, longest: 14 });
  });

  it('caps consistency at 1 when the user over-performs a quota', () => {
    const stats = computeHabitStats(habit(weekly3), days('2026-03-01', 20), '2026-03-28');
    // A 28-day window owes 4 weeks x 3 = 12 check-ins; 20 still reads as 100%.
    expect(stats.consistency).toBe(1);
    expect(stats.streak.unit).toBe('week');
  });

  it('reports a perfect month', () => {
    const stats = computeHabitStats(habit(daily), days('2026-03-01', 28), '2026-03-28');
    expect(stats.consistency).toBe(1);
    expect(stats.streak).toEqual({ unit: 'day', current: 28, longest: 28 });
  });

  it('never lets a timestamp from the future inflate the history', () => {
    const stats = computeHabitStats(habit(daily), ['2026-03-20', '2026-04-05'], '2026-03-28');
    expect(stats.totalCompletions).toBe(1);
    expect(stats.lastCompletedDate).toBe('2026-03-20');
  });

  it('survives a createdAt that is ahead of today', () => {
    // A wrong device clock must not blank out every stat.
    const stats = computeHabitStats(habit(daily, '2026-05-01'), ['2026-03-28'], '2026-03-28');
    expect(stats.streak.current).toBe(1);
    expect(stats.totalCompletions).toBe(1);
  });

  it('returns empty stats for a habit that has never been done', () => {
    const stats = computeHabitStats(habit(daily), [], '2026-03-28');
    expect(stats).toEqual({
      streak: { unit: 'day', current: 0, longest: 0 },
      totalCompletions: 0,
      consistency: 0,
      lastCompletedDate: null,
    });
  });
});

describe('buildHeatmap', () => {
  it('renders a week-aligned grid that ends today', () => {
    const cells = buildHeatmap(habit(daily), [], '2026-03-28', 2);
    expect(cells).toHaveLength(14);
    expect(cells[0]?.date).toBe('2026-03-15');
    expect(cells[13]?.date).toBe('2026-03-28');
  });

  it('starts at the creation day when the habit is younger than the grid', () => {
    const cells = buildHeatmap(habit(daily, '2026-03-25'), [], '2026-03-28', 2);
    expect(cells.map((cell) => cell.date)).toEqual([
      '2026-03-25',
      '2026-03-26',
      '2026-03-27',
      '2026-03-28',
    ]);
  });

  it('marks today with the highlight level', () => {
    const cells = buildHeatmap(habit(daily), ['2026-03-20', '2026-03-28'], '2026-03-28', 2);
    expect(cells.find((cell) => cell.date === '2026-03-20')?.level).toBe(1);
    expect(cells.find((cell) => cell.date === '2026-03-28')?.level).toBe(2);
    expect(cells.find((cell) => cell.date === '2026-03-21')?.level).toBe(0);
  });

  it('knows a non-due day from a missed day', () => {
    const cells = buildHeatmap(habit(monWedFri), [], '2026-03-28', 2);
    const sunday = cells.find((cell) => cell.date === '2026-03-22');
    const monday = cells.find((cell) => cell.date === '2026-03-23');
    expect(sunday?.due).toBe(false);
    expect(monday?.due).toBe(true);
  });
});

describe('weekdayBreakdown', () => {
  it('buckets completions by weekday over the window', () => {
    // 22 Mar 2026 is a Sunday, so the 7-day window covers each weekday once.
    const summary = weekdayBreakdown(habit(daily), ['2026-03-23', '2026-03-28'], '2026-03-28', 7);
    expect(summary).toHaveLength(7);
    expect(summary[1]).toEqual({ count: 1, due: 1, rate: 1 }); // Monday
    expect(summary[6]).toEqual({ count: 1, due: 1, rate: 1 }); // Saturday
    expect(summary[0]).toEqual({ count: 0, due: 1, rate: 0 }); // Sunday
  });

  it('only counts days the fixed-day habit was due', () => {
    const summary = weekdayBreakdown(habit(monWedFri), ['2026-03-23'], '2026-03-28', 7);
    expect(summary[2]).toEqual({ count: 0, due: 0, rate: 0 }); // Tuesday is not scheduled
    expect(summary.reduce((total, day) => total + day.due, 0)).toBe(3);
  });

  it('spreads a 12-week daily window evenly over the weekdays', () => {
    const summary = weekdayBreakdown(habit(daily), [], '2026-03-28', 84);
    expect(summary.reduce((total, day) => total + day.due, 0)).toBe(84);
    expect(summary.every((day) => day.due === 12)).toBe(true);
  });
});

describe('percentage', () => {
  it('rounds to a whole percent', () => {
    expect(percentage(0)).toBe('0%');
    expect(percentage(0.5)).toBe('50%');
    expect(percentage(1 / 3)).toBe('33%');
    expect(percentage(1)).toBe('100%');
  });
});
