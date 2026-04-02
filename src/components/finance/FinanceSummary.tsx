'use client';

import type { DayFinance } from '@/data/finance';

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

interface FinanceSummaryProps {
  days: DayFinance[];
}

export function FinanceSummary({ days }: FinanceSummaryProps) {
  if (!days.length) {
    return (
      <div className="grid grid-cols-3 gap-3 px-4 pb-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 rounded-3xl animate-pulse" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }} />
        ))}
      </div>
    );
  }

  const week = days.slice(-7);
  const lastWeek = days.slice(-14, -7);
  const total = week.reduce((sum, day) => sum + day.totalSpend, 0);
  const dailyAverage = total / week.length;
  const lastTotal = lastWeek.reduce((sum, day) => sum + day.totalSpend, 0);
  const delta = Math.round(((total - lastTotal) / Math.max(lastTotal, 1)) * 100);

  const items = [
    { label: 'This week', value: `£${total}`, helper: 'total spent' },
    { label: 'Daily average', value: `£${Math.round(dailyAverage)}`, helper: 'recent baseline' },
    { label: 'vs last week', value: `${delta >= 0 ? '+' : ''}${delta}%`, helper: delta <= 0 ? 'lower spend' : 'higher spend' },
  ];

  void average;

  return (
    <div className="grid grid-cols-3 gap-3 px-4 pb-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-3xl p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{item.label}</p>
          <p className="text-xl font-semibold mt-2" style={{ color: 'var(--color-text)' }}>{item.value}</p>
          <p className="text-xs mt-2" style={{ color: item.label === 'vs last week' ? (delta <= 0 ? 'var(--color-success)' : 'var(--color-warning)') : 'var(--color-text-muted)' }}>{item.helper}</p>
        </div>
      ))}
    </div>
  );
}
