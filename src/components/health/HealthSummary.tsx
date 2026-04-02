'use client';

import type { DayHealth } from '@/data/health';

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function TrendStat({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="flex-1 rounded-3xl p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p className="text-xl font-semibold mt-2" style={{ color: 'var(--color-text)' }}>{value}</p>
      <p className="text-xs mt-2" style={{ color: 'var(--color-accent)' }}>{helper}</p>
    </div>
  );
}

interface HealthSummaryProps {
  days: DayHealth[];
}

export function HealthSummary({ days }: HealthSummaryProps) {
  if (!days.length) {
    return (
      <div className="grid grid-cols-3 gap-3 px-4 pb-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 rounded-3xl animate-pulse" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }} />
        ))}
      </div>
    );
  }

  const latest = days[days.length - 1];
  const recent = days.slice(-7);

  return (
    <div className="grid grid-cols-3 gap-3 px-4 pb-4">
      <TrendStat label="Steps today" value={latest.steps.toLocaleString()} helper={`${Math.round(latest.steps - average(recent.map((day) => day.steps)))} vs 7-day avg`} />
      <TrendStat label="Sleep last night" value={`${latest.sleepDuration}h`} helper={`${(latest.sleepQuality - average(recent.map((day) => day.sleepQuality))).toFixed(1)} vs avg`} />
      <TrendStat label="HRV" value={`${latest.hrv}ms`} helper={`${Math.round(latest.hrv - average(recent.map((day) => day.hrv)))} vs 7-day avg`} />
    </div>
  );
}
