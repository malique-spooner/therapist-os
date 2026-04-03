'use client';

import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { LocationHero } from './LocationHero';
import { LocationSummary } from './LocationSummary';
import { LocationCharts } from './LocationCharts';
import { SignificantPlaces } from './SignificantPlaces';
import { RecommendedActions } from './RecommendedActions';
import { CompanionTagger } from './CompanionTagger';
import { getLocationActivationCard, getLocationInsights } from '@/lib/domainData';
import { InsightCard } from '@/components/dashboard/InsightCard';
import type { Period } from '@/lib/mockDataUtils';
import { api } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { RetryNotice } from '@/components/ui/retry-notice';
import { useRelationshipsStore } from '@/store/relationships';
import { DateRangeControl, type DateRangeValue } from '@/components/ui/date-range-control';
import { APP_TODAY, addDays, clampIsoDate, differenceInDays } from '@/lib/date';

interface LocationPageProps {
  onBack: () => void;
  onSettings: () => void;
  onTalkAboutThis: (context: string) => void;
}

export function LocationPage({ onBack, onSettings, onTalkAboutThis }: LocationPageProps) {
  const relationshipsHydrated = useRelationshipsStore((state) => state.hydrated);
  const hydrateRelationships = useRelationshipsStore((state) => state.hydrateFromApi);
  const relationshipPeople = useRelationshipsStore((state) => state.people);
  const { data: summaries, isLoading, error, refetch } = useApiQuery(() => api.getLocationSummary('3-months'), []);
  const { data: points } = useApiQuery(() => api.getLocation('3-months'), []);
  const availableDates = useMemo(() => (summaries ?? []).map((day) => day.date), [summaries]);
  const latestDate = availableDates[availableDates.length - 1] ?? APP_TODAY;
  const earliestDate = availableDates[0] ?? addDays(latestDate, -89);
  const [range, setRange] = useState<DateRangeValue>(() => ({
    startDate: addDays(latestDate, -6),
    endDate: latestDate,
  }));
  const { data: companionLog, refetch: refetchCompanionLog, setData: setCompanionLog } = useApiQuery(
    () => range.endDate ? api.getLocationCompanions(range.endDate) : Promise.resolve(null),
    [range.endDate],
  );

  useEffect(() => {
    setRange((current) => {
      const endDate = clampIsoDate(current.endDate, earliestDate, latestDate);
      const startDate = clampIsoDate(current.startDate, earliestDate, endDate);
      return { startDate, endDate };
    });
  }, [earliestDate, latestDate]);

  const chartDays = useMemo(
    () => (summaries ?? []).filter((day) => day.date >= range.startDate && day.date <= range.endDate),
    [range.endDate, range.startDate, summaries],
  );
  const selectedDay = useMemo(
    () => (summaries ?? []).find((day) => day.date === range.endDate) ?? null,
    [range.endDate, summaries],
  );
  const recentPoints = useMemo(
    () => (points ?? []).filter((point) => point.timestamp.slice(0, 10) >= range.startDate && point.timestamp.slice(0, 10) <= range.endDate).slice(-24),
    [points, range.endDate, range.startDate],
  );
  const derivedPeriod: Period = differenceInDays(range.startDate, range.endDate) + 1 <= 7 ? 'this-week' : differenceInDays(range.startDate, range.endDate) + 1 <= 31 ? 'this-month' : '3-months';
  const activationCard = getLocationActivationCard(derivedPeriod);
  const insights = getLocationInsights(derivedPeriod);

  useEffect(() => {
    if (!relationshipsHydrated) {
      void hydrateRelationships();
    }
  }, [hydrateRelationships, relationshipsHydrated]);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar showBack onBack={onBack} onSettings={onSettings} title="Location" />
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
        <LocationHero today={selectedDay} points={recentPoints} />
        <LocationSummary today={selectedDay} />
        <CompanionTagger
          today={selectedDay}
          people={relationshipPeople}
          saved={companionLog}
          onSave={async (payload) => {
            if (!selectedDay) return;
            const next = await api.saveLocationCompanions(selectedDay.date, payload);
            setCompanionLog(next);
            await refetchCompanionLog();
          }}
        />

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
          <LocationCharts period={derivedPeriod} days={chartDays} />
        )}
        <SignificantPlaces period={derivedPeriod} />

        <div className="px-4 pb-4 space-y-3">
          {insights.map((insight, index) => (
            <InsightCard key={insight.id} insight={insight} index={index} onTalkAboutThis={onTalkAboutThis} />
          ))}
        </div>

        <RecommendedActions period={derivedPeriod} />
      </div>
    </div>
  );
}
