/**
 * Workspace Calendar & Month boundary handling.
 * Date string format: YYYY-MM-DD
 * Month string format: YYYY-MM
 * 
 * An expense occurred_on is a calendar date chosen in the workspace's timezone,
 * never converted back and forth through UTC instants to prevent shifting
 * late-night expenses across month boundaries.
 */

export class MonthError extends Error {
  constructor(public readonly code: string, message: string, public readonly statusCode: number = 400) {
    super(message);
    this.name = 'MonthError';
  }
}

/**
 * Validates and parses a month string in YYYY-MM format.
 */
export function parseMonth(monthStr: string): { year: number; month: number } {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthStr)) {
    throw new MonthError('INVALID_MONTH_FORMAT', `Invalid month format '${monthStr}'. Expected YYYY-MM.`);
  }
  const [yearStr, monthNumStr] = monthStr.split('-');
  return {
    year: parseInt(yearStr, 10),
    month: parseInt(monthNumStr, 10),
  };
}

/**
 * Returns date range for a given month [startDate, endDate) where endDate is the 1st of the next month.
 * Example:
 *   "2026-10" -> { startDate: "2026-10-01", endDate: "2026-11-01" }
 *   "2026-12" -> { startDate: "2026-12-01", endDate: "2027-01-01" }
 */
export function getMonthDateRange(monthStr: string): { startDate: string; endDate: string } {
  const { year, month } = parseMonth(monthStr);

  const startMonthStr = String(month).padStart(2, '0');
  const startDate = `${year}-${startMonthStr}-01`;

  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const endMonthStr = String(nextMonth).padStart(2, '0');
  const endDate = `${nextYear}-${endMonthStr}-01`;

  return { startDate, endDate };
}

/**
 * Returns the previous month in YYYY-MM format.
 * Example:
 *   "2026-10" -> "2026-09"
 *   "2026-01" -> "2025-12"
 */
export function getPreviousMonth(monthStr: string): string {
  const { year, month } = parseMonth(monthStr);
  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}

/**
 * Returns the next month in YYYY-MM format.
 */
export function getNextMonth(monthStr: string): string {
  const { year, month } = parseMonth(monthStr);
  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

/**
 * Returns an array of YYYY-MM strings for the past N months up to and including toMonth.
 * Example: getLastNMonths(3, "2026-10") -> ["2026-08", "2026-09", "2026-10"]
 */
export function getLastNMonths(count: number, toMonth?: string): string[] {
  if (count <= 0 || !Number.isInteger(count)) {
    throw new MonthError('INVALID_COUNT', 'Count must be a positive integer.');
  }

  const endMonth = toMonth || getTodayInTimezone('Asia/Amman').substring(0, 7);
  const months: string[] = [endMonth];

  let current = endMonth;
  for (let i = 1; i < count; i++) {
    current = getPreviousMonth(current);
    months.unshift(current);
  }

  return months;
}

/**
 * Converts a Date object or current instant to a YYYY-MM-DD calendar date in the specified IANA timezone.
 * Defaults to Asia/Amman.
 */
export function getTodayInTimezone(timezone: string = 'Asia/Amman', date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date); // en-CA gives YYYY-MM-DD format
  } catch {
    // Fallback if invalid timezone passed
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Amman',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  }
}
