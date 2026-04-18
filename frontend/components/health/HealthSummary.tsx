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
  const isSingleDay = days.length === 1;
  const avgSteps = Math.round(average(recent.map((day) => day.steps)));
  const avgSleep = average(recent.map((day) => day.sleepDuration));
  const avgHrv = Math.round(average(recent.map((day) => day.hrv)));
  const workoutDays = days.filter((day) => day.hadWorkout).length;
  const bestSleepDay = [...days].sort((a, b) => b.sleepQuality - a.sleepQuality)[0];

  if (isSingleDay) {
    return (
      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        <TrendStat label="Steps" value={latest.steps.toLocaleString()} helper={`${latest.steps - avgSteps >= 0 ? '+' : ''}${latest.steps - avgSteps} vs recent average`} />
        <TrendStat label="Sleep" value={`${latest.sleepDuration}h`} helper={`quality ${latest.sleepQuality}/10`} />
        <TrendStat label="HRV" value={`${latest.hrv}ms`} helper={`${latest.hrv - avgHrv >= 0 ? '+' : ''}${latest.hrv - avgHrv} vs recent average`} />
        <TrendStat label="Workout" value={latest.hadWorkout ? 'Yes' : 'Rest'} helper={latest.hadWorkout ? 'movement recorded' : 'recovery day'} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-4 pb-4">
      <TrendStat label="Average steps" value={avgSteps.toLocaleString()} helper={`${workoutDays} workout ${workoutDays === 1 ? 'day' : 'days'} in range`} />
      <TrendStat label="Average sleep" value={`${avgSleep.toFixed(1)}h`} helper={`${average(recent.map((day) => day.sleepQuality)).toFixed(1)}/10 average quality`} />
      <TrendStat label="Average HRV" value={`${avgHrv}ms`} helper={`${Math.round(average(days.map((day) => day.restingHR)))} bpm average resting HR`} />
      <TrendStat label="Best sleep day" value={bestSleepDay.date.slice(5)} helper={`${bestSleepDay.sleepQuality}/10 quality`} />
    </div>
  );
}
