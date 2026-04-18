'use client';

import { motion } from 'framer-motion';
import type { DayHealth } from '@/data/health';
import type { Period } from '@/lib/mockDataUtils';

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clampPercent(value: number, max: number) {
  if (!max) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function formatDayLabel(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
  });
}

function chartData(days: DayHealth[]) {
  return days.map((day) => ({
    ...day,
    shortLabel: formatDayLabel(day.date),
    stepsK: day.steps / 1000,
  }));
}

function Sparkline({
  values,
  stroke,
  fill,
}: {
  values: number[];
  stroke: string;
  fill?: string;
}) {
  if (!values.length) return null;

  const width = 300;
  const height = 90;
  const padding = 10;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((value, index) => {
    const x = padding + (index / Math.max(1, values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const areaPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${width - padding},${height - padding}`,
  ].join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24 overflow-visible">
      {fill ? <polygon points={areaPoints} fill={fill} /> : null}
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MetricCard({
  label,
  value,
  helper,
  accent,
  values,
}: {
  label: string;
  value: string;
  helper: string;
  accent: string;
  values: number[];
}) {
  return (
    <motion.div
      className="rounded-[30px] p-5"
      style={{
        backgroundColor: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06)',
      }}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
          <p className="text-[30px] font-semibold mt-2 leading-none" style={{ color: 'var(--color-text)' }}>{value}</p>
        </div>
        <div className="w-3 h-3 rounded-full mt-1" style={{ backgroundColor: accent }} />
      </div>
      <div className="mt-4">
        <Sparkline values={values} stroke={accent} fill={`${accent}22`} />
      </div>
      <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{helper}</p>
    </motion.div>
  );
}

function DayStrip({
  title,
  subtitle,
  values,
  labels,
  accent,
  formatter,
}: {
  title: string;
  subtitle: string;
  values: number[];
  labels: string[];
  accent: string;
  formatter: (value: number) => string;
}) {
  const max = Math.max(...values, 1);

  return (
    <motion.div
      className="rounded-[30px] p-5"
      style={{
        backgroundColor: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06)',
      }}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-muted)' }}>{title}</p>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</p>
        </div>
        <p className="text-lg font-semibold" style={{ color: accent }}>{formatter(values[values.length - 1] ?? 0)}</p>
      </div>

      <div className="grid grid-cols-7 gap-2 items-end h-40">
        {values.map((value, index) => (
          <div key={`${labels[index]}-${value}`} className="flex flex-col items-center justify-end h-full gap-3">
            <div className="flex-1 flex items-end w-full">
              <div
                className="w-full rounded-[18px] transition-all"
                style={{
                  height: `${Math.max(10, clampPercent(value, max))}%`,
                  background: `linear-gradient(180deg, ${accent} 0%, color-mix(in srgb, ${accent} 72%, white 28%) 100%)`,
                  opacity: index === values.length - 1 ? 1 : 0.74,
                }}
              />
            </div>
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{labels[index]}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function RecoveryPanel({ days }: { days: DayHealth[] }) {
  const latest = days[days.length - 1];
  const baselineSleep = average(days.map((day) => day.sleepDuration));
  const baselineHrv = average(days.map((day) => day.hrv));
  const sleepDelta = latest.sleepDuration - baselineSleep;
  const hrvDelta = latest.hrv - baselineHrv;

  const items = [
    {
      label: 'Sleep vs baseline',
      value: `${sleepDelta >= 0 ? '+' : ''}${sleepDelta.toFixed(1)}h`,
      helper: `Baseline ${baselineSleep.toFixed(1)}h`,
    },
    {
      label: 'HRV vs baseline',
      value: `${hrvDelta >= 0 ? '+' : ''}${Math.round(hrvDelta)}ms`,
      helper: `Baseline ${Math.round(baselineHrv)}ms`,
    },
    {
      label: 'Workout rhythm',
      value: `${days.filter((day) => day.hadWorkout).length}/${days.length}`,
      helper: 'days with logged training',
    },
  ];

  return (
    <motion.div
      className="rounded-[30px] p-5"
      style={{
        backgroundColor: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06)',
      }}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-muted)' }}>Recovery</p>
      <div className="grid grid-cols-3 gap-3 mt-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface)' }}>
            <p className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{item.label}</p>
            <p className="text-xl font-semibold mt-2" style={{ color: 'var(--color-text)' }}>{item.value}</p>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>{item.helper}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function HealthCharts({ period, days }: { period: Period; days: DayHealth[] }) {
  const data = chartData(days);
  void period;

  if (!data.length) return null;

  const latest = data[data.length - 1];

  if (data.length === 1) {
    return (
      <div className="px-4 space-y-3 pb-4">
        <MetricCard
          label="Steps"
          value={latest.steps.toLocaleString()}
          helper={`${latest.hadWorkout ? 'Workout logged' : 'No workout logged'} on this selected day.`}
          accent="#FF5A36"
          values={[latest.steps]}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <MetricCard
            label="Sleep"
            value={`${latest.sleepDuration.toFixed(1)}h`}
            helper={`Sleep quality ${latest.sleepQuality}/10`}
            accent="#4F7CFF"
            values={[latest.sleepDuration]}
          />
          <MetricCard
            label="Recovery"
            value={`${latest.hrv} ms`}
            helper={`Resting heart rate ${latest.restingHR} bpm`}
            accent="#2FBF71"
            values={[latest.hrv]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-3 pb-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <MetricCard
          label="Steps"
          value={`${Math.round(average(data.map((day) => day.steps))).toLocaleString()}`}
          helper={`${latest.steps.toLocaleString()} on the latest day`}
          accent="#FF5A36"
          values={data.map((day) => day.steps)}
        />
        <MetricCard
          label="Sleep"
          value={`${average(data.map((day) => day.sleepDuration)).toFixed(1)}h`}
          helper={`Latest sleep quality ${latest.sleepQuality}/10`}
          accent="#4F7CFF"
          values={data.map((day) => day.sleepDuration)}
        />
      </div>

      <DayStrip
        title="Move"
        subtitle="Daily steps across the selected range"
        values={data.map((day) => day.steps)}
        labels={data.map((day) => day.shortLabel)}
        accent="#FF5A36"
        formatter={(value) => `${Math.round(value / 1000)}k`}
      />

      <DayStrip
        title="Sleep quality"
        subtitle="A cleaner daily read, more like a health app than a dashboard"
        values={data.map((day) => day.sleepQuality)}
        labels={data.map((day) => day.shortLabel)}
        accent="#4F7CFF"
        formatter={(value) => `${value.toFixed(1)}/10`}
      />

      <RecoveryPanel days={data} />
    </div>
  );
}
