'use client';

import { ResponsiveContainer, Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import type { DayHealth } from '@/data/health';
import type { Period } from '@/lib/mockDataUtils';

function chartData(days: DayHealth[]) {
  return days.map((day) => ({
    label: day.date.slice(5),
    sleepQuality: day.sleepQuality,
    steps: Math.round(day.steps / 1000),
    hrv: day.hrv,
  }));
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[28px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>{title}</p>
      <div style={{ width: '100%', height: 200 }}>{children}</div>
    </div>
  );
}

export function HealthCharts({ period, days }: { period: Period; days: DayHealth[] }) {
  const data = chartData(days);
  void period;

  return (
    <div className="px-4 space-y-3 pb-4">
      <ChartCard title="Sleep quality">
        <ResponsiveContainer>
          <AreaChart data={data}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={24} />
            <Area type="monotone" dataKey="sleepQuality" stroke="var(--color-accent)" fill="var(--color-light)" fillOpacity={0.35} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Daily steps">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={24} />
            <Line type="monotone" dataKey="steps" stroke="var(--color-accent)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="HRV trend">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={24} />
            <Line type="monotone" dataKey="hrv" stroke="var(--color-accent)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
