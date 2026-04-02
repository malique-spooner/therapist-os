'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { LocationSummaryPayload } from '@/lib/api';
import type { Period } from '@/lib/mockDataUtils';

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-4 rounded-[28px] p-4 mb-3" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>{title}</p>
      <div style={{ width: '100%', height: 180 }}>{children}</div>
    </div>
  );
}

export function LocationCharts({ period, days }: { period: Period; days: LocationSummaryPayload[] }) {
  const data = days.map((day) => ({
    label: day.date.slice(5),
    timeOutHours: Number((day.timeOutdoorsMinutes / 60).toFixed(1)),
    diversity: day.newPlacesVisited + 1,
    routineStability: day.commuteDetected ? 7 : 5,
    novelty: day.newPlacesVisited,
    mood: Math.min(5, Math.max(1, 2 + day.socialVenueVisits + (day.timeOutdoorsMinutes >= 90 ? 1 : 0))),
  }));
  void period;

  return (
    <div className="pb-2">
      <ChartCard title="Time out of home over time">
        <ResponsiveContainer>
          <AreaChart data={data}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={30} />
            <Area type="monotone" dataKey="timeOutHours" stroke="var(--color-primary)" fill="var(--color-light)" fillOpacity={0.45} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Place diversity over time">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={24} />
            <Bar dataKey="diversity" fill="var(--color-accent)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Routine stability vs novelty">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={24} />
            <Line type="monotone" dataKey="routineStability" stroke="var(--color-primary)" strokeWidth={2.2} dot={false} />
            <Line type="monotone" dataKey="novelty" stroke="var(--color-warning)" strokeWidth={2.2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Mood vs leaving-home correlation">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={24} />
            <Line type="monotone" dataKey="timeOutHours" stroke="var(--color-accent)" strokeWidth={2.2} dot={false} />
            <Line type="monotone" dataKey="mood" stroke="var(--color-warning)" strokeWidth={2.2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
