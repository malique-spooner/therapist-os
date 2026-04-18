'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import type { DayFinance } from '@/data/finance';

const colors = ['#2D6A4F', '#52B788', '#74C69D', '#95D5B2', '#B7E4C7', '#D8F3DC'];

interface SpendingDonutProps {
  days: DayFinance[];
}

export function SpendingDonut({ days }: SpendingDonutProps) {
  const windowDays = days.length <= 1 ? days : days.slice(-7);
  const totals = windowDays.reduce(
    (acc, day) => {
      acc[0].value += day.eatingOut;
      acc[1].value += day.groceries;
      acc[2].value += day.transport;
      acc[3].value += day.entertainment;
      acc[4].value += day.social;
      acc[5].value += day.other;
      return acc;
    },
    [
      { name: 'Eating Out', value: 0 },
      { name: 'Groceries', value: 0 },
      { name: 'Transport', value: 0 },
      { name: 'Entertainment', value: 0 },
      { name: 'Social', value: 0 },
      { name: 'Other', value: 0 },
    ]
  );

  return (
    <div className="mx-4 rounded-[28px] p-4 mb-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>{days.length <= 1 ? 'Selected day breakdown' : 'Recent category mix'}</p>
      <div className="grid grid-cols-[1.1fr,0.9fr] gap-3 items-center">
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={totals} dataKey="value" innerRadius={48} outerRadius={78} paddingAngle={2}>
                {totals.map((entry, index) => (
                  <Cell key={entry.name} fill={colors[index]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {totals.map((entry, index) => (
            <div key={entry.name} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[index] }} />
                <span style={{ color: 'var(--color-text)' }}>{entry.name}</span>
              </div>
              <span style={{ color: 'var(--color-text-muted)' }}>£{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
