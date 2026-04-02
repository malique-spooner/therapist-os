'use client';

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { DayFinance } from '@/data/finance';
import type { Period } from '@/lib/mockDataUtils';

export function DailySpendChart({ period, days }: { period: Period; days: DayFinance[] }) {
  const data = days.map((day) => ({
    label: day.date.slice(5),
    spend: day.totalSpend,
  }));
  const average = data.length ? data.reduce((sum, day) => sum + day.spend, 0) / data.length : 0;
  void period;

  return (
    <div className="mx-4 rounded-[28px] p-4 mb-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Daily spend</p>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={28} />
            <ReferenceLine y={average} stroke="#E76F51" strokeDasharray="4 4" />
            <Bar dataKey="spend" fill="var(--color-accent)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
