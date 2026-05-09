/**
 * Pure helpers for formatting the recurring "when" expression that
 * WhenInput emits to its parent.
 */

export type DayOfWeek =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

export const ALL_DAYS: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export const WEEKDAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
];

const DAY_ORDER: Record<DayOfWeek, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function arraysEqualAsSets<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((x) => set.has(x));
}

function capitalize(d: DayOfWeek): string {
  return d.charAt(0).toUpperCase() + d.slice(1);
}

/**
 * Convert a list of selected days into Slack-flavored recurring syntax:
 *   []                          -> ''
 *   [Sun..Sat]                  -> 'every day'
 *   [Mon..Fri]                  -> 'every weekday'
 *   ['monday']                  -> 'every Monday'
 *   ['monday','wednesday']      -> 'every Monday and Wednesday'
 *   ['monday','wednesday','friday']
 *                               -> 'every Monday, Wednesday, and Friday'
 * Output respects the natural week order regardless of input order.
 */
export function formatDayPart(picked: DayOfWeek[]): string {
  if (picked.length === 0) return '';
  if (arraysEqualAsSets(picked, ALL_DAYS)) return 'every day';
  if (arraysEqualAsSets(picked, WEEKDAYS)) return 'every weekday';

  const sorted = [...picked].sort((a, b) => DAY_ORDER[a] - DAY_ORDER[b]);
  const names = sorted.map(capitalize);
  if (names.length === 1) return `every ${names[0]}`;
  if (names.length === 2) return `every ${names[0]} and ${names[1]}`;
  return `every ${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

/**
 * Convert a 24-hour HH:MM time string into Slack's natural-language form.
 *   '09:00' -> '9am'
 *   '13:00' -> '1pm'
 *   '00:00' -> '12am'
 *   '12:00' -> '12pm'
 *   '21:30' -> '9:30pm'
 *   ''      -> ''
 */
export function formatTimePart(t: string): string {
  if (!t) return '';
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr ?? '', 10);
  if (Number.isNaN(h)) return '';
  const m = parseInt(mStr ?? '0', 10) || 0;
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return m === 0 ? `${h}${ampm}` : `${h}:${m.toString().padStart(2, '0')}${ampm}`;
}
