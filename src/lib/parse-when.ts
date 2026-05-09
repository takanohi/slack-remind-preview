/**
 * Parse a /remind "when" expression into the next firing Date.
 * Returns null if the expression isn't recognized.
 *
 * Supports the patterns produced by WhenInput plus the typical /remind
 * one-time examples:
 *   in N minutes/hours/days
 *   today [at TIME]
 *   tomorrow [at TIME]
 *   next <day>|week [at TIME]
 *   on <day> [at TIME]
 *   on <Month> <day> [at TIME]
 *   <day> <Month>            (e.g. "31 December")
 *   at TIME                  (today, or tomorrow if past)
 *   every day|weekday|<days> [at TIME]
 *   every other <day> [at TIME]                 (bi-weekly synonym)
 *   every <N> weeks on <day> [at TIME]          (N as digit or word: two..ten)
 *   <recurring pattern> starting [from|on] <date>   (e.g. "every Monday starting tomorrow")
 */
const NUMBER_WORDS: Record<string, number> = {
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};
const DAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

const DEFAULT_HOUR = 9;
const DEFAULT_MINUTE = 0;

export function parseFiringDate(when: string, now: Date = new Date()): Date | null {
  if (!when) return null;
  const s = when.toLowerCase().trim();

  // "<base> starting [from|on] <date>": parse the date as the floor, then
  // re-parse the base pattern relative to that floor. Subtract 1ms so the
  // floor moment itself counts as a valid firing time.
  const startingMatch = s.match(/^(.+?)\s+starting(?:\s+(?:from|on))?\s+(.+)$/);
  if (startingMatch) {
    const startingDate = parseFiringDate(startingMatch[2], now);
    if (!startingDate) return null;
    const adjustedNow = new Date(startingDate.getTime() - 1);
    return parseFiringDate(startingMatch[1], adjustedNow);
  }

  let m: RegExpMatchArray | null;

  // in N (minutes|hours|days)
  if ((m = s.match(/^in\s+(\d+)\s+(minute|hour|day)s?$/))) {
    const n = parseInt(m[1], 10);
    const unit = m[2];
    const d = new Date(now);
    if (unit === 'minute') d.setMinutes(d.getMinutes() + n);
    else if (unit === 'hour') d.setHours(d.getHours() + n);
    else d.setDate(d.getDate() + n);
    return d;
  }

  // tomorrow [at TIME]
  if ((m = s.match(/^tomorrow(?:\s+at\s+(.+))?$/))) {
    const [h, mm] = parseTime(m[1]);
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(h, mm, 0, 0);
    return d;
  }

  // today [at TIME]
  if ((m = s.match(/^today(?:\s+at\s+(.+))?$/))) {
    const [h, mm] = parseTime(m[1]);
    const d = new Date(now);
    d.setHours(h, mm, 0, 0);
    return d;
  }

  // next week
  if (s === 'next week') {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    d.setHours(DEFAULT_HOUR, DEFAULT_MINUTE, 0, 0);
    return d;
  }

  // next <day> [at TIME]
  if ((m = s.match(/^next\s+(\w+)(?:\s+at\s+(.+))?$/))) {
    const dayIdx = dayNameToIndex(m[1]);
    if (dayIdx < 0) return null;
    const [h, mm] = parseTime(m[2]);
    return findNextDayOccurrence(now, [dayIdx], h, mm, true);
  }

  // every other <day> [at TIME] (bi-weekly)
  if ((m = s.match(/^every\s+other\s+(\w+)(?:\s+at\s+(.+))?$/))) {
    const dayIdx = dayNameToIndex(m[1]);
    if (dayIdx < 0) return null;
    const [h, mm] = parseTime(m[2]);
    return findNextDayOccurrence(now, [dayIdx], h, mm);
  }

  // every <N> weeks on <day> [at TIME]
  if (
    (m = s.match(
      /^every\s+(\d+|two|three|four|five|six|seven|eight|nine|ten)\s+weeks?\s+on\s+(\w+)(?:\s+at\s+(.+))?$/,
    ))
  ) {
    const count = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : NUMBER_WORDS[m[1]];
    if (!count || count < 1) return null;
    const dayIdx = dayNameToIndex(m[2]);
    if (dayIdx < 0) return null;
    const [h, mm] = parseTime(m[3]);
    return findNextDayOccurrence(now, [dayIdx], h, mm);
  }

  // every X [at TIME] - recurring
  if ((m = s.match(/^every\s+(.+?)(?:\s+at\s+(.+))?$/i))) {
    const dayPart = m[1].trim();
    const [h, mm] = parseTime(m[2]);
    let dayIndices: number[] = [];
    if (dayPart === 'day') {
      dayIndices = [0, 1, 2, 3, 4, 5, 6];
    } else if (dayPart === 'weekday') {
      dayIndices = [1, 2, 3, 4, 5];
    } else {
      const dayList = parseDayList(dayPart);
      dayIndices = dayList.map(dayNameToIndex).filter((i) => i >= 0);
    }
    if (dayIndices.length === 0) return null;
    return findNextDayOccurrence(now, dayIndices, h, mm);
  }

  // on <Month> <day> [at TIME]
  if ((m = s.match(/^on\s+(\w+)\s+(\d{1,2})(?:\s+at\s+(.+))?$/))) {
    const monthIdx = MONTH_NAMES.indexOf(m[1]);
    if (monthIdx >= 0) {
      const day = parseInt(m[2], 10);
      const [h, mm] = parseTime(m[3]);
      const d = new Date(now);
      d.setMonth(monthIdx, day);
      d.setHours(h, mm, 0, 0);
      if (d < now) d.setFullYear(d.getFullYear() + 1);
      return d;
    }
  }

  // on <day> [at TIME]
  if ((m = s.match(/^on\s+(\w+)(?:\s+at\s+(.+))?$/))) {
    const dayIdx = dayNameToIndex(m[1]);
    if (dayIdx < 0) return null;
    const [h, mm] = parseTime(m[2]);
    return findNextDayOccurrence(now, [dayIdx], h, mm);
  }

  // <day> <Month>  (e.g. "31 December")
  if ((m = s.match(/^(\d{1,2})\s+(\w+)$/))) {
    const day = parseInt(m[1], 10);
    const monthIdx = MONTH_NAMES.indexOf(m[2]);
    if (monthIdx >= 0) {
      const d = new Date(now);
      d.setMonth(monthIdx, day);
      d.setHours(DEFAULT_HOUR, DEFAULT_MINUTE, 0, 0);
      if (d < now) d.setFullYear(d.getFullYear() + 1);
      return d;
    }
  }

  // at TIME
  if ((m = s.match(/^at\s+(.+)$/))) {
    const parsed = tryParseTime(m[1]);
    if (!parsed) return null;
    const d = new Date(now);
    d.setHours(parsed[0], parsed[1], 0, 0);
    if (d <= now) d.setDate(d.getDate() + 1);
    return d;
  }

  return null;
}

function parseTime(input: string | undefined): [number, number] {
  return tryParseTime(input) ?? [DEFAULT_HOUR, DEFAULT_MINUTE];
}

function tryParseTime(input: string | undefined): [number, number] | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  // "9am" / "9:30am" / "9pm" / "9:30pm"
  let m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (m) {
    let h = parseInt(m[1], 10);
    const mm = m[2] ? parseInt(m[2], 10) : 0;
    const ap = m[3];
    if (ap === 'pm' && h !== 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    return [h, mm];
  }
  // "21:00" 24h
  m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m) return [parseInt(m[1], 10), parseInt(m[2], 10)];
  return null;
}

function parseDayList(s: string): string[] {
  return s
    .replace(/,\s*and\s+/gi, ',')
    .replace(/\s+and\s+/gi, ',')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function dayNameToIndex(name: string): number {
  return DAY_NAMES.indexOf(name.toLowerCase());
}

function findNextDayOccurrence(
  now: Date,
  dayIndices: number[],
  hour: number,
  minute: number,
  skipToday = false,
): Date {
  const result = new Date(now);
  result.setHours(hour, minute, 0, 0);
  const todayIdx = result.getDay();

  if (!skipToday && dayIndices.includes(todayIdx) && result > now) {
    return result;
  }

  let bestOffset = 8;
  for (const idx of dayIndices) {
    let offset = (idx - todayIdx + 7) % 7;
    if (offset === 0) offset = 7;
    if (offset < bestOffset) bestOffset = offset;
  }
  result.setDate(result.getDate() + bestOffset);
  return result;
}

/**
 * Format a firing date relative to now, similar to Slack's timestamp display.
 */
const LOCALE = 'en-US';

export function formatFiringTime(d: Date, now: Date = new Date()): string {
  const time = d.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' });
  const dayDiff = Math.round(
    (startOfDay(d).getTime() - startOfDay(now).getTime()) / 86400000,
  );

  if (dayDiff === 0) return `Today at ${time}`;
  if (dayDiff === 1) return `Tomorrow at ${time}`;
  if (dayDiff > 1 && dayDiff < 7) {
    const weekday = d.toLocaleDateString(LOCALE, { weekday: 'long' });
    return `${weekday} at ${time}`;
  }
  const date = d.toLocaleDateString(LOCALE, { month: 'short', day: 'numeric' });
  return `${date} at ${time}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
