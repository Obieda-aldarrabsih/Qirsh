import { describe, it, expect } from 'vitest';
import {
  parseMonth,
  getMonthDateRange,
  getPreviousMonth,
  getNextMonth,
  getLastNMonths,
  getTodayInTimezone,
  MonthError,
} from '../../src/lib/months.js';

describe('Months & Timezone unit tests', () => {
  it('parses valid YYYY-MM month strings', () => {
    expect(parseMonth('2026-10')).toEqual({ year: 2026, month: 10 });
    expect(parseMonth('2025-01')).toEqual({ year: 2025, month: 1 });
  });

  it('rejects invalid month strings', () => {
    expect(() => parseMonth('2026-13')).toThrow(MonthError);
    expect(() => parseMonth('2026-00')).toThrow(MonthError);
    expect(() => parseMonth('2026/10')).toThrow(MonthError);
    expect(() => parseMonth('invalid')).toThrow(MonthError);
  });

  it('computes exact month date ranges [startDate, endDate)', () => {
    const oct = getMonthDateRange('2026-10');
    expect(oct.startDate).toBe('2026-10-01');
    expect(oct.endDate).toBe('2026-11-01');

    // Year turnover
    const dec = getMonthDateRange('2026-12');
    expect(dec.startDate).toBe('2026-12-01');
    expect(dec.endDate).toBe('2027-01-01');
  });

  it('computes previous and next months correctly across years', () => {
    expect(getPreviousMonth('2026-10')).toBe('2026-09');
    expect(getPreviousMonth('2026-01')).toBe('2025-12');
    expect(getNextMonth('2026-10')).toBe('2026-11');
    expect(getNextMonth('2026-12')).toBe('2027-01');
  });

  it('generates N months trend series', () => {
    const list = getLastNMonths(4, '2026-10');
    expect(list).toEqual(['2026-07', '2026-08', '2026-09', '2026-10']);
  });

  it('correctly handles timezone boundaries (Asia/Amman late night expense stays in October)', () => {
    // 31 October 2026 at 23:30 Amman time is UTC 20:30 (Amman is UTC+3)
    const lateNightAmman = new Date('2026-10-31T20:30:00Z');
    const localDate = getTodayInTimezone('Asia/Amman', lateNightAmman);
    expect(localDate).toBe('2026-10-31');

    // Ensure it falls within October range
    const octRange = getMonthDateRange('2026-10');
    expect(localDate >= octRange.startDate && localDate < octRange.endDate).toBe(true);

    // 1 November at 00:30 Amman time is UTC 21:30 of previous day
    const pastMidnightAmman = new Date('2026-10-31T21:30:00Z');
    const novDate = getTodayInTimezone('Asia/Amman', pastMidnightAmman);
    expect(novDate).toBe('2026-11-01');
    expect(novDate >= octRange.startDate && novDate < octRange.endDate).toBe(false);
  });
});
