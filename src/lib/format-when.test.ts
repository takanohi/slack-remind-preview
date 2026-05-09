import { describe, expect, it } from 'vitest';
import {
  ALL_DAYS,
  WEEKDAYS,
  arraysEqualAsSets,
  formatDayPart,
  formatTimePart,
  type DayOfWeek,
} from './format-when';

describe('arraysEqualAsSets', () => {
  it('returns true for empty arrays', () => {
    expect(arraysEqualAsSets([], [])).toBe(true);
  });

  it('returns true for identical arrays', () => {
    expect(arraysEqualAsSets([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it('returns true regardless of order', () => {
    expect(arraysEqualAsSets([1, 2, 3], [3, 1, 2])).toBe(true);
  });

  it('returns false for different lengths', () => {
    expect(arraysEqualAsSets([1, 2], [1, 2, 3])).toBe(false);
  });

  it('returns false for different elements', () => {
    expect(arraysEqualAsSets([1, 2, 3], [1, 2, 4])).toBe(false);
  });

  it('handles strings (DayOfWeek)', () => {
    expect(arraysEqualAsSets<DayOfWeek>(['monday', 'friday'], ['friday', 'monday'])).toBe(true);
  });
});

describe('formatDayPart', () => {
  it('returns empty string for no selection', () => {
    expect(formatDayPart([])).toBe('');
  });

  it('returns "every day" when all 7 days selected', () => {
    expect(formatDayPart(ALL_DAYS)).toBe('every day');
  });

  it('returns "every weekday" for Mon-Fri', () => {
    expect(formatDayPart(WEEKDAYS)).toBe('every weekday');
  });

  it('normalizes weekdays preset regardless of input order', () => {
    const shuffled: DayOfWeek[] = ['friday', 'monday', 'wednesday', 'tuesday', 'thursday'];
    expect(formatDayPart(shuffled)).toBe('every weekday');
  });

  it('formats single day as "every Monday"', () => {
    expect(formatDayPart(['monday'])).toBe('every Monday');
  });

  it('formats two days as "every X and Y"', () => {
    expect(formatDayPart(['monday', 'wednesday'])).toBe('every Monday and Wednesday');
  });

  it('preserves week order even if input is reversed', () => {
    expect(formatDayPart(['wednesday', 'monday'])).toBe('every Monday and Wednesday');
  });

  it('formats three+ days with Oxford comma', () => {
    expect(formatDayPart(['monday', 'wednesday', 'friday'])).toBe(
      'every Monday, Wednesday, and Friday',
    );
  });

  it('formats four days with Oxford comma', () => {
    expect(formatDayPart(['monday', 'tuesday', 'thursday', 'saturday'])).toBe(
      'every Monday, Tuesday, Thursday, and Saturday',
    );
  });

  it('returns "every Sunday" alone', () => {
    expect(formatDayPart(['sunday'])).toBe('every Sunday');
  });

  it('formats Sat+Sun as "every Sunday and Saturday" (week-ordered)', () => {
    expect(formatDayPart(['saturday', 'sunday'])).toBe('every Sunday and Saturday');
  });
});

describe('formatTimePart', () => {
  it('returns empty for empty input', () => {
    expect(formatTimePart('')).toBe('');
  });

  it('returns empty for non-numeric input', () => {
    expect(formatTimePart('abc')).toBe('');
  });

  it('formats "09:00" as "9am"', () => {
    expect(formatTimePart('09:00')).toBe('9am');
  });

  it('formats "13:00" as "1pm"', () => {
    expect(formatTimePart('13:00')).toBe('1pm');
  });

  it('formats midnight "00:00" as "12am"', () => {
    expect(formatTimePart('00:00')).toBe('12am');
  });

  it('formats noon "12:00" as "12pm"', () => {
    expect(formatTimePart('12:00')).toBe('12pm');
  });

  it('formats "21:30" as "9:30pm" with minutes', () => {
    expect(formatTimePart('21:30')).toBe('9:30pm');
  });

  it('formats "08:05" with zero-padded minutes "8:05am"', () => {
    expect(formatTimePart('08:05')).toBe('8:05am');
  });

  it('drops minutes when zero', () => {
    expect(formatTimePart('17:00')).toBe('5pm');
  });

  it('handles missing minute portion gracefully', () => {
    expect(formatTimePart('9')).toBe('9am');
  });
});
