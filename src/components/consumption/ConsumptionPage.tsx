'use client';

import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { ValenceMeter } from './ValenceMeter';
import { ValenceChart } from './ValenceChart';
import { YouTubeSection } from './YouTubeSection';
import { InsightCard } from '@/components/dashboard/InsightCard';
import type { Period } from '@/lib/mockDataUtils';
import { api } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { RetryNotice } from '@/components/ui/retry-notice';
import { DateRangeControl, type DateRangeValue } from '@/components/ui/date-range-control';
import { APP_TODAY, addDays, clampIsoDate, differenceInDays } from '@/lib/date';

const insights = [
  {
    id: 'consumption-1',
    category: 'Consumption',
    categoryIcon: '🎵',
    lens: 'CBT' as const,
    narrative: 'Music valence has shifted lower this week relative to baseline, and in this profile that tends to lead mood dips by one to two days.',
    action: 'Treat lower-valence listening as signal, not just background.',
    domainId: 'consumption',
    viewLabel: 'View Consumption',
  },
  {
    id: 'consumption-2',
    category: 'Consumption',
    categoryIcon: '✨',
    lens: 'SDT' as const,
    narrative: 'Days with new music discoveries line up with higher mood on average. Novelty-seeking looks energising here rather than destabilising.',
    action: 'Keep a small discovery ritual when motivation feels flat.',
    domainId: 'consumption',
    viewLabel: 'View Consumption',
  },
  {
    id: 'consumption-3',
    category: 'Consumption',
    categoryIcon: '▶️',
    lens: 'Behaviourism' as const,
    narrative: 'Long entertainment-viewing evenings correlate with lower motivation the next day. The immediate reward is real, but the after-effect is visible too.',
    action: 'Choose one watch-stop cue before passive viewing begins.',
    domainId: 'consumption',
    viewLabel: 'View Consumption',
  },
];

interface ConsumptionPageProps {
  onBack: () => void;
  onSettings: () => void;
  onTalkAboutThis: (context: string) => void;
}

export function ConsumptionPage({ onBack, onSettings, onTalkAboutThis }: ConsumptionPageProps) {
  const { data, isLoading, error, refetch } = useApiQuery(() => api.getConsumption('3-months'), []);
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
      <TopBar showBack onBack={onBack} onSettings={onSettings} title="Consumption" />
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
        <ValenceMeter days={days} />
        {isLoading && !days.length ? (
          <>
            <div className="mx-4 h-72 rounded-[28px] animate-pulse mb-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }} />
            <div className="mx-4 h-64 rounded-[28px] animate-pulse mb-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }} />
          </>
        ) : (
          <>
            <ValenceChart period={derivedPeriod} days={days} />
            <YouTubeSection days={days} />
          </>
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
