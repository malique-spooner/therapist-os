'use client';

import { useState } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { HealthSummary } from './HealthSummary';
import { HealthCharts } from './HealthCharts';
import { WellbeingRings } from '@/components/dashboard/WellbeingRings';
import { InsightCard } from '@/components/dashboard/InsightCard';
import type { Period } from '@/lib/mockDataUtils';
import { api } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { RetryNotice } from '@/components/ui/retry-notice';

const periods: { label: string; value: Period }[] = [
  { label: 'This Week', value: 'this-week' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'This Month', value: 'this-month' },
  { label: 'Last Month', value: 'last-month' },
  { label: '3 Months', value: '3-months' },
];

const insights = [
  {
    id: 'health-1',
    category: 'Physical Health',
    categoryIcon: '⌚',
    lens: 'CBT' as const,
    narrative: 'Your HRV peaks on days after you sleep before midnight, averaging around 12ms higher than late-night equivalents in this profile.',
    action: 'Use bedtime as the recovery lever, not just total sleep time.',
    domainId: 'physical',
    viewLabel: 'View Physical Health',
  },
  {
    id: 'health-2',
    category: 'Physical Health',
    categoryIcon: '🏃',
    lens: 'Behaviourism' as const,
    narrative: 'You move meaningfully more on days that include a morning workout, even after accounting for the workout itself. The first active choice shapes the rest of the day.',
    action: 'Keep one simple morning movement cue visible.',
    domainId: 'physical',
    viewLabel: 'View Physical Health',
  },
  {
    id: 'health-3',
    category: 'Physical Health',
    categoryIcon: '❤️',
    lens: 'SDT' as const,
    narrative: 'Recovery improves most when movement, sleep timing, and autonomy line up together. This page is strongest when it is treated as a reflection, not a scoreboard.',
    action: 'Notice the combination days, not just the isolated metrics.',
    domainId: 'physical',
    viewLabel: 'View Physical Health',
  },
];

interface HealthPageProps {
  onBack: () => void;
  onSettings: () => void;
  onTalkAboutThis: (context: string) => void;
}

export function HealthPage({ onBack, onSettings, onTalkAboutThis }: HealthPageProps) {
  const [period, setPeriod] = useState<Period>('this-week');
  const { data, isLoading, error, refetch } = useApiQuery(() => api.getHealth(period), [period]);
  const days = data ?? [];

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar showBack onBack={onBack} onSettings={onSettings} title="Physical Health" />
      <div className="flex-1 overflow-y-auto pb-6">
        {error && (
          <RetryNotice onRetry={refetch} className="mx-4 mb-4 w-[calc(100%-2rem)]" />
        )}
        <HealthSummary days={days} />
        <div className="px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {periods.map((item) => (
              <button
                key={item.value}
                onClick={() => setPeriod(item.value)}
                className="flex-shrink-0 rounded-full px-3 py-1.5 text-sm font-medium"
                style={{ backgroundColor: period === item.value ? 'var(--color-primary)' : 'var(--color-surface-2)', color: period === item.value ? '#fff' : 'var(--color-text-muted)', border: `1px solid ${period === item.value ? 'transparent' : 'var(--color-border)'}` }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <WellbeingRings period={period} />
        {isLoading && !days.length ? (
          <div className="px-4 space-y-3 pb-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-64 rounded-[28px] animate-pulse" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }} />
            ))}
          </div>
        ) : (
          <HealthCharts period={period} days={days} />
        )}
        <div className="px-4 space-y-3">
          {insights.map((insight, index) => (
            <InsightCard key={insight.id} insight={insight} index={index} onTalkAboutThis={onTalkAboutThis} />
          ))}
        </div>
      </div>
    </div>
  );
}
