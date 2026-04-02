export const APP_TODAY = '2026-03-31';
export const APP_START = '2026-01-01';

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
