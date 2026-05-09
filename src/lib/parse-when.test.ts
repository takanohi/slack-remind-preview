import { describe, expect, it } from 'vitest';
import { formatFiringTime, parseFiringDate } from './parse-when';

// Fixed reference point: Saturday, May 9 2026 at 12:00 noon
const NOW = new Date(2026, 4, 9, 12, 0, 0); // month is 0-indexed

describe('parseFiringDate', () => {
  describe('invalid input', () => {
    it('returns null for empty string', () => {
      expect(parseFiringDate('', NOW)).toBeNull();
    });

    it('returns null for unrecognized text', () => {
      expect(parseFiringDate('something random', NOW)).toBeNull();
    });

    it('returns null for impossible month-day combinations', () => {
      expect(parseFiringDate('on February 31', NOW)).toBeNull();
      expect(parseFiringDate('February 31', NOW)).toBeNull();
      expect(parseFiringDate('31 February', NOW)).toBeNull();
    });
  });

  describe('relative ("in N units")', () => {
    it('parses "in 30 minutes"', () => {
      const d = parseFiringDate('in 30 minutes', NOW)!;
      expect(d.getTime()).toBe(NOW.getTime() + 30 * 60 * 1000);
    });

    it('parses "in 2 hours"', () => {
      const d = parseFiringDate('in 2 hours', NOW)!;
      expect(d.getTime()).toBe(NOW.getTime() + 2 * 60 * 60 * 1000);
    });

    it('parses "in 3 days"', () => {
      const d = parseFiringDate('in 3 days', NOW)!;
      expect(d.getDate()).toBe(NOW.getDate() + 3);
    });

    it('handles singular form "in 1 minute"', () => {
      const d = parseFiringDate('in 1 minute', NOW)!;
      expect(d.getTime()).toBe(NOW.getTime() + 60 * 1000);
    });
  });

  describe('today / tomorrow', () => {
    it('parses "tomorrow" with default 9am', () => {
      const d = parseFiringDate('tomorrow', NOW)!;
      expect(d.getDate()).toBe(NOW.getDate() + 1);
      expect(d.getHours()).toBe(9);
      expect(d.getMinutes()).toBe(0);
    });

    it('parses "tomorrow at 10am"', () => {
      const d = parseFiringDate('tomorrow at 10am', NOW)!;
      expect(d.getDate()).toBe(NOW.getDate() + 1);
      expect(d.getHours()).toBe(10);
    });

    it('parses "today at 5pm"', () => {
      const d = parseFiringDate('today at 5pm', NOW)!;
      expect(d.getDate()).toBe(NOW.getDate());
      expect(d.getHours()).toBe(17);
    });

    it('parses "today at 5:30pm"', () => {
      const d = parseFiringDate('today at 5:30pm', NOW)!;
      expect(d.getHours()).toBe(17);
      expect(d.getMinutes()).toBe(30);
    });
  });

  describe('next', () => {
    it('parses "next week"', () => {
      const d = parseFiringDate('next week', NOW)!;
      expect(d.getDate()).toBe(NOW.getDate() + 7);
      expect(d.getHours()).toBe(9);
    });

    it('parses "next Monday at 9am"', () => {
      const d = parseFiringDate('next Monday at 9am', NOW)!;
      expect(d.getDay()).toBe(1); // Monday
      expect(d.getHours()).toBe(9);
      // NOW is Saturday → next Monday is 2 days away
      expect(d.getDate()).toBe(NOW.getDate() + 2);
    });

    it('skips today even if today matches the day', () => {
      // NOW is Saturday → "next Saturday" should be 7 days away, not today
      const d = parseFiringDate('next Saturday at 9am', NOW)!;
      expect(d.getDate()).toBe(NOW.getDate() + 7);
    });
  });

  describe('on <day>', () => {
    it('parses "on Monday"', () => {
      const d = parseFiringDate('on Monday', NOW)!;
      expect(d.getDay()).toBe(1);
      expect(d.getHours()).toBe(9);
    });

    it('parses "on Friday at 5pm"', () => {
      const d = parseFiringDate('on Friday at 5pm', NOW)!;
      expect(d.getDay()).toBe(5);
      expect(d.getHours()).toBe(17);
    });
  });

  describe('on <Month> <day>', () => {
    it('parses "on March 15"', () => {
      const d = parseFiringDate('on March 15', NOW)!;
      expect(d.getMonth()).toBe(2);
      expect(d.getDate()).toBe(15);
    });

    it('parses "March 15" without the "on" prefix', () => {
      const d = parseFiringDate('March 15', NOW)!;
      expect(d.getMonth()).toBe(2);
      expect(d.getDate()).toBe(15);
    });

    it('rolls into next year if date already passed', () => {
      const d = parseFiringDate('on January 1', NOW)!;
      expect(d.getMonth()).toBe(0);
      expect(d.getFullYear()).toBe(NOW.getFullYear() + 1);
    });

    it('parses "on April 3 at 10:30am"', () => {
      const d = parseFiringDate('on April 3 at 10:30am', NOW)!;
      expect(d.getMonth()).toBe(3);
      expect(d.getDate()).toBe(3);
      expect(d.getHours()).toBe(10);
      expect(d.getMinutes()).toBe(30);
    });
  });

  describe('<day> <Month>', () => {
    it('parses "31 December"', () => {
      const d = parseFiringDate('31 December', NOW)!;
      expect(d.getMonth()).toBe(11);
      expect(d.getDate()).toBe(31);
    });
  });

  describe('at <time>', () => {
    it('schedules today if time is in the future', () => {
      // NOW is 12:00, "at 5pm" = today at 17:00
      const d = parseFiringDate('at 5pm', NOW)!;
      expect(d.getDate()).toBe(NOW.getDate());
      expect(d.getHours()).toBe(17);
    });

    it('schedules tomorrow if time has passed', () => {
      // NOW is 12:00, "at 9am" = next 9am = tomorrow
      const d = parseFiringDate('at 9am', NOW)!;
      expect(d.getDate()).toBe(NOW.getDate() + 1);
      expect(d.getHours()).toBe(9);
    });

    it('returns null without recognizable time', () => {
      expect(parseFiringDate('at noon', NOW)).toBeNull();
    });

    it('returns null for out-of-range times', () => {
      expect(parseFiringDate('at 99:99', NOW)).toBeNull();
      expect(parseFiringDate('at 13pm', NOW)).toBeNull();
      expect(parseFiringDate('at 24:00', NOW)).toBeNull();
    });
  });

  describe('every (recurring)', () => {
    it('parses "every Monday at 9am" → next Monday', () => {
      const d = parseFiringDate('every Monday at 9am', NOW)!;
      expect(d.getDay()).toBe(1);
      expect(d.getHours()).toBe(9);
    });

    it('parses "every weekday at 5pm" → next weekday at 5pm', () => {
      const d = parseFiringDate('every weekday at 5pm', NOW)!;
      expect([1, 2, 3, 4, 5]).toContain(d.getDay());
      expect(d.getHours()).toBe(17);
    });

    it('parses "every day"', () => {
      const d = parseFiringDate('every day', NOW)!;
      expect(d.getHours()).toBe(9);
      // Either today (if 9am hasn't passed) or tomorrow
      const dayDiff = d.getDate() - NOW.getDate();
      expect([0, 1]).toContain(dayDiff);
    });

    it('parses "every Monday and Wednesday at 9am" → soonest of the two', () => {
      const d = parseFiringDate('every Monday and Wednesday at 9am', NOW)!;
      // From Saturday: Monday is 2 days, Wednesday is 4 days → Monday wins
      expect(d.getDay()).toBe(1);
    });

    it('parses Oxford comma "every Monday, Wednesday, and Friday at 9am"', () => {
      const d = parseFiringDate(
        'every Monday, Wednesday, and Friday at 9am',
        NOW,
      )!;
      expect([1, 3, 5]).toContain(d.getDay());
    });

    it('returns null with no recognizable days', () => {
      expect(parseFiringDate('every nonsense at 9am', NOW)).toBeNull();
    });
  });

  describe('every other / every N weeks', () => {
    it('parses "every other Monday" as next Monday at default 9am', () => {
      const d = parseFiringDate('every other Monday', NOW)!;
      expect(d.getDay()).toBe(1);
      expect(d.getHours()).toBe(9);
    });

    it('parses "every other Friday at 5pm"', () => {
      const d = parseFiringDate('every other Friday at 5pm', NOW)!;
      expect(d.getDay()).toBe(5);
      expect(d.getHours()).toBe(17);
    });

    it('parses "every 2 weeks on Friday"', () => {
      const d = parseFiringDate('every 2 weeks on Friday', NOW)!;
      expect(d.getDay()).toBe(5);
      expect(d.getHours()).toBe(9);
    });

    it('parses "every 4 weeks on Tuesday at 3pm"', () => {
      const d = parseFiringDate('every 4 weeks on Tuesday at 3pm', NOW)!;
      expect(d.getDay()).toBe(2);
      expect(d.getHours()).toBe(15);
    });

    it('parses word-form "every two weeks on Friday at 5pm"', () => {
      const d = parseFiringDate('every two weeks on Friday at 5pm', NOW)!;
      expect(d.getDay()).toBe(5);
      expect(d.getHours()).toBe(17);
    });

    it('combines with starting clause', () => {
      const d = parseFiringDate(
        'every 4 weeks on Tuesday at 3pm starting next Tuesday',
        NOW,
      )!;
      expect(d.getDay()).toBe(2);
      expect(d.getHours()).toBe(15);
    });
  });

  describe('starting clause', () => {
    it('parses "every Monday at 9am starting tomorrow" → next Mon on/after tomorrow', () => {
      const d = parseFiringDate('every Monday at 9am starting tomorrow', NOW)!;
      expect(d.getDay()).toBe(1);
      expect(d.getHours()).toBe(9);
      // NOW = Sat May 9; tomorrow = Sun May 10; next Mon on/after = Mon May 11
      expect(d.getDate()).toBe(11);
    });

    it('accepts "starting from" form', () => {
      const d = parseFiringDate(
        'every weekday at 5pm starting from next Monday',
        NOW,
      )!;
      expect([1, 2, 3, 4, 5]).toContain(d.getDay());
      expect(d.getHours()).toBe(17);
    });

    it('accepts "starting on" form', () => {
      const d = parseFiringDate('every Tuesday starting on next Tuesday', NOW)!;
      expect(d.getDay()).toBe(2);
    });

    it('accepts month-day input in the starting clause', () => {
      const d = parseFiringDate('every Monday at 9am starting on March 15', NOW)!;
      expect(d.getFullYear()).toBe(2027);
      expect(d.getMonth()).toBe(2);
      expect(d.getDate()).toBe(15);
      expect(d.getDay()).toBe(1);
      expect(d.getHours()).toBe(9);
    });

    it('treats the starting moment itself as valid', () => {
      // starting = next Monday 9am, pattern = every Monday at 9am → first
      // firing should be on that exact next Monday 9am, not skip a week
      const d = parseFiringDate(
        'every Monday at 9am starting next Monday',
        NOW,
      )!;
      expect(d.getDay()).toBe(1);
      expect(d.getDate()).toBe(11); // next Mon, not the one a week later
      expect(d.getHours()).toBe(9);
    });

    it('returns null when the starting date is unparseable', () => {
      expect(parseFiringDate('every Monday starting blah', NOW)).toBeNull();
    });
  });

  describe('time variants', () => {
    it('handles 12am as midnight (00:00)', () => {
      const d = parseFiringDate('today at 12am', NOW)!;
      expect(d.getHours()).toBe(0);
    });

    it('handles 12pm as noon (12:00)', () => {
      const d = parseFiringDate('today at 12pm', NOW)!;
      expect(d.getHours()).toBe(12);
    });

    it('handles 24-hour format "21:00"', () => {
      const d = parseFiringDate('today at 21:00', NOW)!;
      expect(d.getHours()).toBe(21);
      expect(d.getMinutes()).toBe(0);
    });

    it('handles 9pm correctly', () => {
      const d = parseFiringDate('today at 9pm', NOW)!;
      expect(d.getHours()).toBe(21);
    });

    it('rejects invalid explicit times even when the pattern itself is valid', () => {
      expect(parseFiringDate('today at 25:00', NOW)).toBeNull();
      expect(parseFiringDate('tomorrow at 9:99am', NOW)).toBeNull();
      expect(parseFiringDate('every Monday at 61pm', NOW)).toBeNull();
    });
  });
});

describe('formatFiringTime', () => {
  const SAT_NOON = new Date(2026, 4, 9, 12, 0, 0); // Saturday May 9, 2026

  it('returns "Today at HH:MM" for same day', () => {
    const d = new Date(2026, 4, 9, 15, 30, 0);
    expect(formatFiringTime(d, SAT_NOON)).toMatch(/^Today at /);
  });

  it('returns "Tomorrow at HH:MM" for next day', () => {
    const d = new Date(2026, 4, 10, 9, 0, 0);
    expect(formatFiringTime(d, SAT_NOON)).toMatch(/^Tomorrow at /);
  });

  it('returns weekday name for date within next 7 days', () => {
    const d = new Date(2026, 4, 12, 9, 0, 0); // Tuesday
    expect(formatFiringTime(d, SAT_NOON)).toMatch(/^Tuesday at /);
  });

  it('returns "Mon DD" for far-future dates', () => {
    const d = new Date(2026, 7, 15, 9, 0, 0); // Aug 15
    expect(formatFiringTime(d, SAT_NOON)).toMatch(/^Aug 15 at /);
  });
});
