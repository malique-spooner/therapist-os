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

  const lastWeek = days.slice(-14, -7);
  const total = days.reduce((sum, day) => sum + day.totalSpend, 0);
  const dailyAverage = total / Math.max(days.length, 1);
  const lastTotal = lastWeek.reduce((sum, day) => sum + day.totalSpend, 0);
  const delta = Math.round(((total - lastTotal) / Math.max(lastTotal, 1)) * 100);
  const isSingleDay = days.length <= 1;
  const latest = days[days.length - 1];
  const categories: Array<[string, number]> = [
      ['Eating out', latest?.eatingOut ?? 0],
      ['Groceries', latest?.groceries ?? 0],
      ['Transport', latest?.transport ?? 0],
      ['Entertainment', latest?.entertainment ?? 0],
      ['Social', latest?.social ?? 0],
      ['Other', latest?.other ?? 0],
    ];
  const topCategory = categories.sort((a, b) => b[1] - a[1])[0];
  const bankCount = latest?.bankBreakdown?.length ?? 0;

  const items = isSingleDay
    ? [
        { label: 'Selected day', value: `£${total}`, helper: 'total spent' },
        { label: 'Top category', value: topCategory[0], helper: `£${topCategory[1]}` },
        { label: 'Banks in view', value: `${bankCount}`, helper: bankCount === 1 ? 'single bank' : 'multi-bank day' },
      ]
    : [
        { label: 'Selected range', value: `£${total}`, helper: 'total spent' },
        { label: 'Daily average', value: `£${Math.round(dailyAverage)}`, helper: 'within this range' },
        { label: 'vs recent 7 days', value: `${delta >= 0 ? '+' : ''}${delta}%`, helper: delta <= 0 ? 'lower spend' : 'higher spend' },
      ];

  void average;

  return (
    <div className="grid grid-cols-3 gap-3 px-4 pb-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-3xl p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{item.label}</p>
          <p className="text-xl font-semibold mt-2" style={{ color: 'var(--color-text)' }}>{item.value}</p>
          <p className="text-xs mt-2" style={{ color: item.label === 'vs recent 7 days' ? (delta <= 0 ? 'var(--color-success)' : 'var(--color-warning)') : 'var(--color-text-muted)' }}>{item.helper}</p>
        </div>
      ))}
    </div>
  );
}
