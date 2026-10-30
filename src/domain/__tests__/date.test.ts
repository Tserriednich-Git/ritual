import {
  addDays,
  clampISO,
  dayNumber,
  diffDays,
  enumerateDays,
  formatTime,
  fromDate,
  friendlyDateLabel,
  fromISODate,
  isBefore,
  isValidISODate,
  isoFromDayNumber,
  isoWeek,
  parseTime,
  startOfWeekISO,
  toDate,
  todayISO,
  toISODate,
  weekKey,
  weekdayLabel,
  weekdayOf,
} from '../date';

describe('civil date maths', () => {
  it('round-trips a valid date', () => {
    expect(fromISODate('2026-02-28')).toEqual({ year: 2026, month: 2, day: 28 });
    expect(isValidISODate('2026-02-28')).toBe(true);
  });

  it('rejects impossible calendar days rather than silently rolling over', () => {
    // new Date(UTC, 2026, 1, 30) would quietly become 2 March.
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate('2026-2-8')).toBe(false);
    expect(() => fromISODate('nonsense')).toThrow(RangeError);
  });

  it('accepts a leap day only in leap years', () => {
    expect(isValidISODate('2024-02-29')).toBe(true);
    expect(isValidISODate('2026-02-29')).toBe(false);
  });

  it('adds days across a DST boundary without slipping', () => {
    // European summer time starts on 2026-03-29 in most of the EU.
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('crosses a year boundary by day count, not by month arithmetic', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(diffDays('2026-12-31', '2027-01-01')).toBe(1);
    expect(diffDays('2027-01-01', '2026-12-31')).toBe(-1);
  });

  it('keeps dayNumber monotonic', () => {
    expect(dayNumber('2026-03-02') - dayNumber('2026-03-01')).toBe(1);
    expect(dayNumber('2026-03-30') - dayNumber('2026-03-28')).toBe(2);
  });

  it('enumerates an inclusive range', () => {
    expect(enumerateDays('2026-03-01', '2026-03-03')).toEqual([
      '2026-03-01',
      '2026-03-02',
      '2026-03-03',
    ]);
    expect(enumerateDays('2026-03-03', '2026-03-01')).toEqual([]);
  });

  it('derives today from local components, not the UTC instant', () => {
    // 23:30 local on the 15th is still the 15th even though UTC may say the 16th.
    const lateEvening = new Date(2026, 2, 15, 23, 30, 0);
    expect(todayISO(lateEvening)).toBe('2026-03-15');
    expect(toDate(lateEvening)).toBe('2026-03-15');
  });

  it('reports weekday numbers as JS does (Sunday = 0)', () => {
    expect(weekdayOf('2026-03-01')).toBe(0);
    expect(weekdayOf('2026-03-02')).toBe(1);
  });

  it('starts the week on the requested weekday', () => {
    expect(startOfWeekISO('2026-03-05', 1)).toBe('2026-03-02');
    expect(startOfWeekISO('2026-03-05', 0)).toBe('2026-03-01');
    expect(startOfWeekISO('2026-03-01', 1)).toBe('2026-02-23');
  });
});

describe('ISO week numbering', () => {
  it('places the first days of 2026 and 2027 in the right ISO years', () => {
    expect(isoWeek('2026-01-01')).toEqual({ isoYear: 2026, week: 1 });
    expect(weekKey('2026-01-01')).toBe('2026-W01');
    // 2026 starts on a Thursday, so it has 53 ISO weeks and 1 Jan 2027 is still in 2026.
    expect(weekKey('2027-01-01')).toBe('2026-W53');
    expect(weekKey('2026-12-28')).toBe('2026-W53');
  });

  it('agrees across a whole week', () => {
    const week = [
      '2026-03-02',
      '2026-03-03',
      '2026-03-04',
      '2026-03-05',
      '2026-03-06',
      '2026-03-07',
      '2026-03-08',
    ];
    expect(new Set(week.map(weekKey)).size).toBe(1);
  });
});

describe('time of day', () => {
  it('parses only zero-padded 24-hour times', () => {
    expect(parseTime('07:30')).toEqual({ hour: 7, minute: 30 });
    expect(parseTime('23:59')).toEqual({ hour: 23, minute: 59 });
    expect(parseTime('7:30')).toBeNull();
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('12:60')).toBeNull();
    expect(parseTime('')).toBeNull();
  });

  it('formats a wall clock without shifting it into the host time zone', () => {
    // Regression: the UTC stand-in used to be rendered in local time, which
    // moved the displayed hour by the machine's offset from UTC.
    expect(formatTime({ hour: 6, minute: 5 })).toMatch(/0?6:05/);
    expect(formatTime({ hour: 23, minute: 0 })).toMatch(/(23|11):00/);
  });
});

describe('friendly labels', () => {
  it('uses relative words for the days around today', () => {
    expect(friendlyDateLabel('2026-03-15', '2026-03-15')).toBe('Today');
    expect(friendlyDateLabel('2026-03-14', '2026-03-15')).toBe('Yesterday');
    expect(friendlyDateLabel('2026-03-16', '2026-03-15')).toBe('Tomorrow');
  });

  it('formats a dated label through Intl when the host has ICU', () => {
    expect(friendlyDateLabel('2026-03-20', '2026-03-15')).toMatch(/Mar/i);
    expect(weekdayLabel('2026-03-16')).toMatch(/mon/i);
  });
});

describe('clamping and ordering', () => {
  it('orders days', () => {
    expect(isBefore('2026-03-01', '2026-03-02')).toBe(true);
    expect(isBefore('2026-03-02', '2026-03-01')).toBe(false);
    expect(isBefore('2026-03-01', '2026-03-01')).toBe(false);
  });

  it('pins a date inside a window', () => {
    expect(clampISO('2026-02-01', '2026-03-01', '2026-03-31')).toBe('2026-03-01');
    expect(clampISO('2026-04-30', '2026-03-01', '2026-03-31')).toBe('2026-03-31');
    expect(clampISO('2026-03-15', '2026-03-01', '2026-03-31')).toBe('2026-03-15');
  });

  it('round-trips through the day index', () => {
    for (const iso of ['2026-01-01', '2026-02-28', '2026-12-31', '2028-02-29']) {
      expect(isoFromDayNumber(dayNumber(iso))).toBe(iso);
    }
  });

  it('builds a civil date from local parts', () => {
    expect(fromDate(new Date(2026, 2, 15, 23, 30))).toEqual({ year: 2026, month: 3, day: 15 });
    expect(toISODate({ year: 2026, month: 3, day: 5 })).toBe('2026-03-05');
    expect(toISODate({ year: 1999, month: 12, day: 31 })).toBe('1999-12-31');
  });
});

describe('a host without full Intl support', () => {
  // Some Hermes Android builds throw from Intl; the labels must degrade, not crash.
  it('falls back to fixed English strings', () => {
    const dateTimeFormat = jest.spyOn(Intl, 'DateTimeFormat').mockImplementation((() => {
      throw new RangeError('ICU unavailable');
    }) as () => Intl.DateTimeFormat);
    try {
      expect(weekdayLabel('2026-03-16')).toBe('Mon');
      expect(friendlyDateLabel('2026-03-20', '2026-03-15')).toBe('2026-03-20');
      expect(formatTime({ hour: 6, minute: 5 })).toBe('06:05');
    } finally {
      dateTimeFormat.mockRestore();
    }
  });
});
