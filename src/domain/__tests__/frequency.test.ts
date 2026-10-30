import {
  completionsInWeek,
  expectedCompletions,
  frequencyLabel,
  isScheduledOn,
  scheduledDays,
  weekKeysBetween,
} from '../frequency';
import type { Frequency } from '../types';

const daily: Frequency = { kind: 'every_day' };
const threeTimes: Frequency = { kind: 'times_per_week', target: 3 };
const monWedFri: Frequency = { kind: 'specific_days', days: [1, 3, 5] };

// March 2026 starts on a Sunday, so the weekday maths below is easy to follow.
describe('isScheduledOn', () => {
  it('always expects a daily habit', () => {
    expect(isScheduledOn(daily, '2026-03-01')).toBe(true);
    expect(isScheduledOn(daily, '2026-03-08')).toBe(true);
  });

  it('only expects a fixed-day habit on its own weekdays', () => {
    expect(isScheduledOn(monWedFri, '2026-03-02')).toBe(true); // Monday
    expect(isScheduledOn(monWedFri, '2026-03-03')).toBe(false); // Tuesday
    expect(isScheduledOn(monWedFri, '2026-03-07')).toBe(false); // Saturday
  });

  it('treats every day as a fair chance for a weekly quota', () => {
    expect(isScheduledOn(threeTimes, '2026-03-03')).toBe(true);
  });
});

describe('scheduledDays', () => {
  it('lists the days inside an inclusive week', () => {
    expect(scheduledDays(monWedFri, '2026-03-01', '2026-03-07')).toEqual([
      '2026-03-02',
      '2026-03-04',
      '2026-03-06',
    ]);
  });

  it('is empty when the range runs backwards', () => {
    expect(scheduledDays(daily, '2026-03-07', '2026-03-01')).toEqual([]);
  });
});

describe('expectedCompletions', () => {
  it('counts calendar days for a daily habit', () => {
    expect(expectedCompletions(daily, '2026-03-01', '2026-03-10')).toBe(10);
  });

  it('counts only the selected weekdays across a month', () => {
    // Mon 2/9/16/23/30, Wed 4/11/18/25, Fri 6/13/20/27.
    expect(expectedCompletions(monWedFri, '2026-03-01', '2026-03-31')).toBe(13);
  });

  it('pro-rates a weekly quota so a partial week cannot owe more than a target', () => {
    expect(expectedCompletions(threeTimes, '2026-03-01', '2026-03-14')).toBe(6); // 14 days = 2 whole weeks
    expect(expectedCompletions(threeTimes, '2026-03-01', '2026-03-08')).toBe(4); // 8 days = 1 week + 1
    expect(expectedCompletions(threeTimes, '2026-03-01', '2026-03-02')).toBe(2); // 2 days only
    expect(
      expectedCompletions({ kind: 'times_per_week', target: 7 }, '2026-03-01', '2026-03-02'),
    ).toBe(2);
  });

  it('returns nothing for an inverted range', () => {
    expect(expectedCompletions(daily, '2026-03-05', '2026-03-01')).toBe(0);
  });
});

describe('completionsInWeek', () => {
  it('bounds the count to the ISO week containing the anchor day', () => {
    const completions = ['2026-03-01', '2026-03-02', '2026-03-04', '2026-03-08', '2026-03-09'];
    // Anchor Wednesday 4 Mar → week Mon 2 Mar … Sun 8 Mar.
    expect(completionsInWeek(completions, '2026-03-04')).toBe(3);
    expect(completionsInWeek(completions, '2026-03-09')).toBe(1);
  });

  it('honours a Sunday-start week', () => {
    const completions = ['2026-03-01', '2026-03-02', '2026-03-07'];
    expect(completionsInWeek(completions, '2026-03-04', 1)).toBe(2);
    expect(completionsInWeek(completions, '2026-03-04', 0)).toBe(3);
  });
});

describe('weekKeysBetween', () => {
  it('returns one key for a range inside a single week', () => {
    expect(weekKeysBetween('2026-03-01', '2026-03-01')).toEqual(['2026-W09']);
    expect(weekKeysBetween('2026-03-02', '2026-03-08')).toEqual(['2026-W10']);
  });

  it('walks oldest first across week boundaries', () => {
    expect(weekKeysBetween('2026-03-02', '2026-03-16')).toEqual([
      '2026-W10',
      '2026-W11',
      '2026-W12',
    ]);
  });

  it('keeps a year-end week in the ISO year that owns it', () => {
    expect(weekKeysBetween('2026-12-29', '2027-01-03')).toEqual(['2026-W53']);
  });
});

describe('frequencyLabel', () => {
  it('reads differently for each frequency kind', () => {
    expect(frequencyLabel(daily)).toBe('Every day');
    expect(frequencyLabel(threeTimes)).toBe('3× per week');
    expect(frequencyLabel({ kind: 'specific_days', days: [1] })).toBe('1 fixed day');
    expect(frequencyLabel(monWedFri)).toBe('3 fixed days');
  });
});
