export interface DayCalendar {
  date: string;
  workHours: number;
  socialEvents: number;
  gymScheduled: boolean;
  freeTimeHours: number;
}

function seed(n: number) { const x = Math.sin(n) * 10000; return x - Math.floor(x); }

export const calendarData: DayCalendar[] = Array.from({ length: 90 }, (_, i) => {
  const date = new Date(2026, 0, 1);
  date.setDate(date.getDate() + i);
  const dateStr = date.toISOString().split('T')[0];
  const dow = date.getDay();
  const isWeekend = dow === 0 || dow === 6;
  const r = seed(i * 83 + 1);
  const r2 = seed(i * 89 + 2);
  const r3 = seed(i * 97 + 3);

  const workHours = isWeekend ? 0 : Math.round(6 + r * 4);
  const socialEvents = Math.floor(r2 * (isWeekend ? 3 : 2));
  const gymScheduled = r3 > 0.5;
  const freeTimeHours = Math.max(1, Math.round(6 - workHours * 0.3 + r * 4));

  return { date: dateStr, workHours, socialEvents, gymScheduled, freeTimeHours };
});
