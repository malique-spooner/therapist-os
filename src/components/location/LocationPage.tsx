'use client';

import { useState } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { LocationHero } from './LocationHero';
import { LocationSummary } from './LocationSummary';
import { LocationCharts } from './LocationCharts';
import { SignificantPlaces } from './SignificantPlaces';
import { RecommendedActions } from './RecommendedActions';
import { getLocationActivationCard, getLocationInsights } from '@/lib/domainData';
import { InsightCard } from '@/components/dashboard/InsightCard';
import type { Period } from '@/lib/mockDataUtils';
import { api } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';

const periods: { label: string; value: Period }[] = [
  { label: 'This Week', value: 'this-week' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'This Month', value: 'this-month' },
  { label: 'Last Month', value: 'last-month' },
];

interface LocationPageProps {
  onBack: () => void;
  onSettings: () => void;
  onTalkAboutThis: (context: string) => void;
}

export function LocationPage({ onBack, onSettings, onTalkAboutThis }: LocationPageProps) {
  const [period, setPeriod] = useState<Period>('this-week');
  const { data: summaries, isLoading, error, refetch } = useApiQuery(() => api.getLocationSummary(period), [period]);
  const { data: today } = useApiQuery(() => api.getLocationToday(), []);
  const { data: points } = useApiQuery(() => api.getLocation(period), [period]);
  const activationCard = getLocationActivationCard(period);
  const insights = getLocationInsights(period);
  const chartDays = summaries ?? [];
  const recentPoints = (points ?? []).slice(-24);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar showBack onBack={onBack} onSettings={onSettings} title="Location" />
      <div className="flex-1 overflow-y-auto pb-6">
        {error && (
          <button onClick={() => void refetch()} className="mx-4 mb-4 w-[calc(100%-2rem)] rounded-3xl p-4 text-left" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
            Could not load data. Tap to retry.
          </button>
        )}
        <LocationHero today={today ?? null} points={recentPoints} />
        <LocationSummary today={today ?? null} />

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

        <div className="mx-4 rounded-[28px] p-4 mb-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{activationCard.title}</p>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{activationCard.narrative}</p>
        </div>

        {isLoading && !chartDays.length ? (
          <div className="pb-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="mx-4 h-60 rounded-[28px] animate-pulse mb-3" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }} />
            ))}
          </div>
        ) : (
          <LocationCharts period={period} days={chartDays} />
        )}
        <SignificantPlaces period={period} />

        <div className="px-4 pb-4 space-y-3">
          {insights.map((insight, index) => (
            <InsightCard key={insight.id} insight={insight} index={index} onTalkAboutThis={onTalkAboutThis} />
          ))}
        </div>

        <RecommendedActions period={period} />
      </div>
    </div>
  );
}
