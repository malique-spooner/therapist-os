'use client';

import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { checkInHistory } from '@/data/checkins';
import type { ConsumptionPayload } from '@/lib/api';
import type { Period } from '@/lib/mockDataUtils';

export function ValenceChart({ period, days }: { period: Period; days: ConsumptionPayload[] }) {
  const music = days;
  const moods = checkInHistory.slice(-days.length);
  const data = music.map((day, index) => ({
    label: day.date.slice(5),
    valence: Number((((day.averageValence ?? 0) * 5)).toFixed(2)),
    mood: moods[index]?.emotionalState ?? 3,
  }));
  void period;

  return (
    <div className="mx-4 rounded-[28px] p-4 mb-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Valence over time</p>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <AreaChart data={data}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={24} />
            <Area type="monotone" dataKey="valence" stroke="#52B788" fill="#B7E4C7" fillOpacity={0.4} strokeWidth={2} />
            <Line type="monotone" dataKey="mood" stroke="#E76F51" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
