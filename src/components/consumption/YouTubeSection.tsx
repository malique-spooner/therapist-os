'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { ConsumptionPayload } from '@/lib/api';

interface YouTubeSectionProps {
  days: ConsumptionPayload[];
}

export function YouTubeSection({ days }: YouTubeSectionProps) {
  if (!days.length) {
    return (
      <div className="mx-4 rounded-[28px] p-5 mb-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>YouTube</p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          No YouTube data is available in this range yet.
        </p>
      </div>
    );
  }

  const windowDays = days;
  const entries = windowDays.map((day) => day.providerBreakdown?.youtube).filter(Boolean);
  const avg = entries.length ? entries.reduce((sum, day) => sum + (day?.totalHours ?? 0), 0) / entries.length : 0;
  const total = entries.reduce((sum, day) => sum + (day?.totalHours ?? 0), 0);
  const isSingleDay = days.length <= 1;
  const breakdown = [
    { label: 'Educational', value: Number(entries.reduce((sum, day) => sum + (day?.educational ?? 0), 0).toFixed(1)) },
    { label: 'Entertainment', value: Number(entries.reduce((sum, day) => sum + (day?.entertainment ?? 0), 0).toFixed(1)) },
    { label: 'Music', value: Number(entries.reduce((sum, day) => sum + (day?.music ?? 0), 0).toFixed(1)) },
    { label: 'Other', value: Number(entries.reduce((sum, day) => sum + (day?.other ?? 0), 0).toFixed(1)) },
  ];

  return (
    <div className="mx-4 rounded-[28px] p-4 mb-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>YouTube watch pattern</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{total.toFixed(1)}h in {isSingleDay ? 'the selected day' : 'this selected range'} vs {avg.toFixed(1)}h daily average</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(82,183,136,0.12)', color: 'var(--color-primary)' }}>
          Provider view
        </span>
      </div>
      <div style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer>
          <BarChart data={breakdown} layout="vertical">
            <CartesianGrid horizontal={false} stroke="var(--color-border)" />
            <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={80} />
            <Bar dataKey="value" fill="var(--color-accent)" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
