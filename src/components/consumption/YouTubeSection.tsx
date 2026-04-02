'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { ConsumptionPayload } from '@/lib/api';

interface YouTubeSectionProps {
  days: ConsumptionPayload[];
}

export function YouTubeSection({ days }: YouTubeSectionProps) {
  const week = days.slice(-7);
  const avg = days.length ? days.reduce((sum, day) => sum + day.listeningHours, 0) / days.length : 0;
  const total = week.reduce((sum, day) => sum + day.listeningHours, 0);
  const breakdown = [
    { label: 'Discovery', value: week.reduce((sum, day) => sum + day.newDiscoveries, 0) },
    { label: 'Energy', value: Number((week.reduce((sum, day) => sum + (day.averageEnergy ?? 0), 0) / Math.max(week.length, 1) * 10).toFixed(1)) },
    { label: 'Danceability', value: Number((week.reduce((sum, day) => sum + (day.averageDanceability ?? 0), 0) / Math.max(week.length, 1) * 10).toFixed(1)) },
    { label: 'Genres', value: new Set(week.flatMap((day) => day.topGenres)).size },
  ];

  return (
    <div className="mx-4 rounded-[28px] p-4 mb-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Screen time</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{total.toFixed(1)}h this week vs {avg.toFixed(1)}h average</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(231,111,81,0.12)', color: 'var(--color-warning)' }}>
          YouTube detail is still lightweight here while Spotify powers the richer part of this page
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
