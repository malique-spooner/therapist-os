'use client';

import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { HealthSummary } from './HealthSummary';
import { HealthCharts } from './HealthCharts';
import { WellbeingRings } from '@/components/dashboard/WellbeingRings';
import { InsightCard } from '@/components/dashboard/InsightCard';
import type { Period } from '@/lib/mockDataUtils';
import { api } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { RetryNotice } from '@/components/ui/retry-notice';
import { DateRangeControl, type DateRangeValue } from '@/components/ui/date-range-control';
import { APP_TODAY, addDays, clampIsoDate, differenceInDays } from '@/lib/date';

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
  const { data, isLoading, error, refetch } = useApiQuery(() => api.getHealth('3-months'), []);
  const allDays = useMemo(() => data ?? [], [data]);
  const availableDates = useMemo(() => allDays.map((day) => day.date), [allDays]);
  const latestDate = availableDates[availableDates.length - 1] ?? APP_TODAY;
  const earliestDate = availableDates[0] ?? addDays(latestDate, -89);
  const [range, setRange] = useState<DateRangeValue>(() => ({
    startDate: addDays(latestDate, -6),
    endDate: latestDate,
  }));

  useEffect(() => {
    setRange((current) => {
      const endDate = clampIsoDate(current.endDate, earliestDate, latestDate);
      const startDate = clampIsoDate(current.startDate, earliestDate, endDate);
      return { startDate, endDate };
    });
  }, [earliestDate, latestDate]);

  const days = useMemo(
    () => allDays.filter((day) => day.date >= range.startDate && day.date <= range.endDate),
    [allDays, range.endDate, range.startDate],
  );
  const derivedPeriod: Period = differenceInDays(range.startDate, range.endDate) + 1 <= 7 ? 'this-week' : differenceInDays(range.startDate, range.endDate) + 1 <= 31 ? 'this-month' : '3-months';

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar showBack onBack={onBack} onSettings={onSettings} title="Physical Health" />
      <div className="flex-1 overflow-y-auto pb-6">
        {error && (
          <RetryNotice onRetry={refetch} className="mx-4 mb-4 w-[calc(100%-2rem)]" />
        )}
        <DateRangeControl
          value={range}
          onChange={setRange}
          availableDates={availableDates}
          minDate={earliestDate}
          maxDate={latestDate}
        />
        <HealthSummary days={days} />
        <WellbeingRings period={derivedPeriod} />
        {isLoading && !days.length ? (
          <div className="px-4 space-y-3 pb-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-64 rounded-[28px] animate-pulse" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }} />
            ))}
          </div>
        ) : (
          <HealthCharts period={derivedPeriod} days={days} />
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
