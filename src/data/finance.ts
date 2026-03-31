export interface DayFinance {
  date: string;
  totalSpend: number; // £
  eatingOut: number;
  groceries: number;
  transport: number;
  entertainment: number;
  social: number;
  other: number;
}

function seed(n: number) { const x = Math.sin(n) * 10000; return x - Math.floor(x); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

export const financeData: DayFinance[] = Array.from({ length: 90 }, (_, i) => {
  const date = new Date(2026, 0, 1);
  date.setDate(date.getDate() + i);
  const dateStr = date.toISOString().split('T')[0];
  const dow = date.getDay();
  const progressArc = i / 89;
  const isWeekend = dow === 0 || dow === 6;
  const r = seed(i * 11 + 1);
  const r2 = seed(i * 19 + 2);
  const r3 = seed(i * 29 + 3);
  const r4 = seed(i * 37 + 4);
  const r5 = seed(i * 41 + 5);

  // Budget improves in month 3 (arc)
  const budgetMultiplier = lerp(1.15, 0.9, progressArc);
  
  // Social evenings on some evenings — weekends more likely
  const hasSocialEvening = r > (isWeekend ? 0.45 : 0.75);
  
  const eatingOut = hasSocialEvening
    ? Math.round((25 + r2 * 40) * budgetMultiplier)
    : Math.round(r2 * 20 * budgetMultiplier);
  const groceries = Math.round(10 + r3 * 25);
  const transport = Math.round(4 + r4 * 12);
  const entertainment = hasSocialEvening ? Math.round(r5 * 30) : Math.round(r5 * 12);
  const social = hasSocialEvening ? Math.round(10 + r * 25) : 0;
  const other = Math.round(r2 * 15);
  const totalSpend = eatingOut + groceries + transport + entertainment + social + other;

  return { date: dateStr, totalSpend, eatingOut, groceries, transport, entertainment, social, other };
});

export function getFinanceForPeriod(period: string): DayFinance[] {
  if (period === 'last-week') return financeData.slice(Math.max(0, financeData.length - 14), financeData.length - 7);
  if (period === 'last-month') return financeData.slice(Math.max(0, financeData.length - 62), financeData.length - 31);
  const days = period === 'this-month' ? 31 : period === '3-months' ? 90 : 7;
  return financeData.slice(Math.max(0, financeData.length - days));
}
