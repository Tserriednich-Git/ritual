import { computeHabitStats } from '../../domain/stats';
import type { Habit, HabitWithProgress } from '../../domain/types';
import {
  selectDailyTotals,
  selectProgressSummary,
  selectRowFor,
  selectTodayRows,
  statsFor,
  type Snapshot,
} from '../selectors';

const TODAY = '2026-03-28';

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Read',
    description: '',
    color: 'teal',
    icon: '📚',
    frequency: { kind: 'every_day' },
    reminderTime: null,
    position: 0,
    createdAt: new Date(2026, 2, 1).getTime(),
    archivedAt: null,
    ...overrides,
  };
}

function snapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return { habits: [], completions: {}, today: TODAY, ...overrides };
}

describe('selectTodayRows', () => {
  it('drops archived habits and orders the rest by position', () => {
    const rows = selectTodayRows(
      snapshot({
        habits: [
          habit({ id: 'b', name: 'B', position: 1 }),
          habit({ id: 'gone', name: 'Gone', position: 0, archivedAt: 1 }),
          habit({ id: 'a', name: 'A', position: 2 }),
        ],
      }),
    );
    expect(rows.map((row) => row.habit.id)).toEqual(['b', 'a']);
  });

  it('flags today separately from the streak maths', () => {
    const rows = selectTodayRows(
      snapshot({ habits: [habit()], completions: { h1: ['2026-03-27', '2026-03-28'] } }),
    );
    expect(rows[0]).toMatchObject({ dueToday: true, completedToday: true });
    expect(rows[0]?.stats.streak.current).toBe(2);
  });

  it('keeps a fixed-day habit visible but not due on an off day', () => {
    // 28 Mar 2026 is a Saturday.
    const rows = selectTodayRows(
      snapshot({ habits: [habit({ frequency: { kind: 'specific_days', days: [1, 3] } })] }),
    );
    expect(rows[0]).toMatchObject({ dueToday: false, completedToday: false });
  });

  it('falls back to the real clock when the snapshot has no day', () => {
    const rows = selectTodayRows(snapshot({ habits: [habit()], today: '' }));
    expect(rows[0]?.stats).toBeDefined();
  });
});

describe('selectRowFor', () => {
  it('returns null for an unknown habit', () => {
    expect(selectRowFor(snapshot(), 'nope')).toBeNull();
  });

  it('treats a weekly quota as done for the whole week once the target is met', () => {
    const state = snapshot({
      habits: [habit({ frequency: { kind: 'times_per_week', target: 2 } })],
      completions: { h1: ['2026-03-23', '2026-03-25'] },
    });
    const row = selectRowFor(state, 'h1');
    expect(row?.completedToday).toBe(true); // neither date is today
    expect(selectTodayRows(state)[0]?.completedToday).toBe(false); // the Today card still shows the tap target
  });
});

describe('selectProgressSummary', () => {
  const running = habit({ id: 'a', name: 'A', frequency: { kind: 'every_day' } });
  const stalled = habit({ id: 'b', name: 'B', position: 1, frequency: { kind: 'every_day' } });
  const restDay = habit({
    id: 'c',
    name: 'C',
    position: 2,
    frequency: { kind: 'specific_days', days: [1] },
  });

  it('counts what is due against what is done', () => {
    const summary = selectProgressSummary(
      snapshot({
        habits: [running, stalled, restDay],
        completions: { a: ['2026-03-28'], b: [], c: [] },
      }),
    );
    expect(summary.dueToday).toBe(2);
    expect(summary.doneToday).toBe(1);
    expect(summary.completionRatio).toBeCloseTo(0.5, 5);
    expect(summary.totalCheckIns).toBe(1);
  });

  it('reports no ratio rather than dividing by zero on a rest day', () => {
    const summary = selectProgressSummary(
      snapshot({ habits: [restDay], completions: { c: ['2026-03-23'] } }),
    );
    expect(summary.dueToday).toBe(0);
    expect(summary.completionRatio).toBe(0);
  });

  it('surfaces the longest live streak, or null when everything is cold', () => {
    const state = snapshot({
      habits: [running, stalled],
      completions: { a: ['2026-03-20'], b: ['2026-03-26', '2026-03-27', '2026-03-28'] },
    });
    const best = selectProgressSummary(state).bestStreak as HabitWithProgress;
    expect(best.habit.id).toBe('b');
    expect(best.stats.streak.current).toBe(3);
    expect(selectProgressSummary(snapshot({ habits: [running] })).bestStreak).toBeNull();
  });
});

describe('selectDailyTotals', () => {
  it('walks oldest to newest across the window', () => {
    const totals = selectDailyTotals(snapshot({ habits: [habit()] }), 4);
    expect(totals.map((day) => day.date)).toEqual([
      '2026-03-25',
      '2026-03-26',
      '2026-03-27',
      '2026-03-28',
    ]);
  });

  it('counts due against done for each day', () => {
    const totals = selectDailyTotals(
      snapshot({ habits: [habit()], completions: { h1: ['2026-03-26'] } }),
      3,
    );
    expect(totals).toEqual([
      { date: '2026-03-26', done: 1, due: 1 },
      { date: '2026-03-27', done: 0, due: 1 },
      { date: '2026-03-28', done: 0, due: 1 },
    ]);
  });

  it('ignores archived habits', () => {
    const totals = selectDailyTotals(
      snapshot({ habits: [habit({ archivedAt: 1 })], completions: { h1: ['2026-03-28'] } }),
      2,
    );
    expect(totals[1]).toEqual({ date: '2026-03-28', done: 0, due: 0 });
  });
});

describe('statsFor', () => {
  it('agrees with the domain maths for the same inputs', () => {
    const h = habit();
    const state = snapshot({ completions: { h1: ['2026-03-28'] } });
    expect(statsFor(state, h)).toEqual(computeHabitStats(h, ['2026-03-28'], TODAY));
    expect(statsFor(state, h).lastCompletedDate).toBe('2026-03-28');
  });
});
