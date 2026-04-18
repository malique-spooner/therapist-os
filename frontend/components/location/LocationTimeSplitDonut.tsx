'use client';

import { motion } from 'framer-motion';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

import type { LocationVisitPayload } from '@/lib/api';

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes}m`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

const colors = ['#2D6A4F', '#52B788', '#74C69D', '#95D5B2', '#B7E4C7', '#D8F3DC'];

function aggregateVisits(visits: LocationVisitPayload[]) {
  const totals = visits.reduce<Record<string, { label: string; minutes: number; tone: string }>>((acc, visit) => {
    const existing = acc[visit.placeKey];
    if (existing) {
      existing.minutes += visit.dwellMinutes;
      return acc;
    }
    acc[visit.placeKey] = { label: visit.placeLabel, minutes: visit.dwellMinutes, tone: visit.tone };
    return acc;
  }, {});

  const ranked = Object.entries(totals)
    .map(([placeKey, value]) => ({ placeKey, ...value }))
    .sort((a, b) => b.minutes - a.minutes);

  const top = ranked.slice(0, 5);
  const otherMinutes = ranked.slice(5).reduce((sum, item) => sum + item.minutes, 0);
  const data = otherMinutes
    ? [...top, { placeKey: 'other', label: 'Other', minutes: otherMinutes, tone: 'neutral' }]
    : top;

  return {
    data,
    totalMinutes: data.reduce((sum, item) => sum + item.minutes, 0),
  };
}

export function LocationTimeSplitDonut({ visits }: { visits: LocationVisitPayload[] }) {
  const { data, totalMinutes } = aggregateVisits(visits);
  const hasData = totalMinutes > 0;
  const leader = data[0];

  return (
    <motion.div
      className="rounded-[30px] p-5"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--color-surface-2) 88%, white 12%) 0%, var(--color-surface-2) 100%)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 16px 34px rgba(15, 23, 42, 0.06)',
      }}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
        Time split
      </p>
      <p className="mt-2 text-[1.35rem] font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>
        Where the selected day went
      </p>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        This groups the day by visit dwell time, so you can see which places actually took your time.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="minutes" innerRadius={58} outerRadius={82} paddingAngle={2} stroke="none">
                {data.map((entry, index) => (
                  <Cell key={entry.placeKey} fill={colors[index % colors.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          {hasData ? (
            <>
              <div className="rounded-[22px] p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>
                  Biggest slice
                </p>
                <p className="mt-2 text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                  {leader?.label ?? 'Other'}
                </p>
                <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {formatMinutes(leader?.minutes ?? 0)} of {formatMinutes(totalMinutes)} total
                </p>
              </div>
              <div className="space-y-2">
                {data.map((entry, index) => {
                  const share = totalMinutes ? Math.round((entry.minutes / totalMinutes) * 100) : 0;
                  return (
                    <div key={entry.placeKey} className="flex items-center justify-between gap-3 rounded-[18px] px-3 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.62)' }}>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{entry.label}</span>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                        {formatMinutes(entry.minutes)} · {share}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="rounded-[22px] p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                No visits yet
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                Once the phone sends a few more points, this chart will show the places that took the most time.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
