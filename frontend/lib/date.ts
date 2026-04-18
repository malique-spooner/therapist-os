function londonIsoToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export const APP_TODAY = londonIsoToday();
export const APP_START = addDays(APP_TODAY, -89);

export function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function parseIsoDate(value: string): Date {
  return new Date(`${value}T12:00:00Z`);
}

export function addDays(value: string, days: number): string {
  const date = parseIsoDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

export function differenceInDays(from: string, to: string): number {
  const fromDate = parseIsoDate(from);
  const toDate = parseIsoDate(to);
  return Math.round((toDate.getTime() - fromDate.getTime()) / 86400000);
}

export function getDateRange(length: number, endDate = APP_TODAY): string[] {
  const end = parseIsoDate(endDate);
  return Array.from({ length }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - (length - 1 - index));
    return toIsoDate(date);
  });
}

export function getDayLabel(value: string, options?: Intl.DateTimeFormatOptions) {
  return parseIsoDate(value).toLocaleDateString('en-GB', options);
}

export function isSameDay(a?: string, b?: string) {
  return Boolean(a && b && a === b);
}

export function clampIsoDate(value: string, min: string, max: string) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function formatRangeLabel(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return getDayLabel(endDate, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  return `${getDayLabel(startDate, { day: 'numeric', month: 'short' })} - ${getDayLabel(endDate, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function getPeriodDateRange(period: string): { start: string; end: string } {
  const today = londonIsoToday();
  switch (period) {
    case 'today':
      return { start: today, end: today };
    case 'last-week':
      return { start: addDays(today, -14), end: today };
    case 'last-month':
      return { start: addDays(today, -62), end: today };
    case 'this-month':
      return { start: addDays(today, -31), end: today };
    case '3-months':
      return { start: addDays(today, -90), end: today };
    default:
      return { start: addDays(today, -7), end: today };
  }
}
