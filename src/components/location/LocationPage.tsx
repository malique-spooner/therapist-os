'use client';

import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { motion } from 'framer-motion';
import { LocationMapCard } from './LocationMapCard';
import { LocationStory } from './LocationStory';
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
import { useSettingsStore } from '@/store/settings';

interface LocationPageProps {
  onBack: () => void;
  onSettings: () => void;
  onTalkAboutThis: (context: string) => void;
}

export function LocationPage({ onBack, onSettings, onTalkAboutThis }: LocationPageProps) {
  const dataMode = useSettingsStore((state) => state.dataMode);
  const relationshipsHydrated = useRelationshipsStore((state) => state.hydrated);
  const hydrateRelationships = useRelationshipsStore((state) => state.hydrateFromApi);
  const relationshipPeople = useRelationshipsStore((state) => state.people);
  const { data: summaries, isLoading, error, refetch } = useApiQuery(() => api.getLocationSummary('3-months'), [dataMode]);
  const { data: points } = useApiQuery(() => api.getLocation('3-months'), [dataMode]);
  const availableDates = useMemo(
    () =>
      Array.from(
        new Set([
          ...(summaries ?? []).map((day) => day.date),
          ...(points ?? []).map((point) => point.timestamp.slice(0, 10)),
        ]),
      ).sort(),
    [points, summaries],
  );
  const latestDate = availableDates[availableDates.length - 1] ?? APP_TODAY;
  const earliestDate = availableDates[0] ?? addDays(latestDate, -89);
  const [range, setRange] = useState<DateRangeValue>(() => ({
    startDate: latestDate,
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
  const selectedDayPoints = useMemo(
    () => (points ?? []).filter((point) => point.timestamp.slice(0, 10) === range.endDate),
    [points, range.endDate],
  );
  const selectedDay = useMemo(() => {
    const explicitSummary = (summaries ?? []).find((day) => day.date === range.endDate);
    if (explicitSummary) return explicitSummary;
    if (!selectedDayPoints.length) return null;

    const firstPoint = selectedDayPoints[0];
    const lastPoint = selectedDayPoints[selectedDayPoints.length - 1];
    const spanMinutes = Math.max(
      0,
      Math.round((new Date(lastPoint.timestamp).getTime() - new Date(firstPoint.timestamp).getTime()) / 60000),
    );
    const likelyOutdoorsMinutes = Math.min(spanMinutes, selectedDayPoints.length * 12);

    return {
      date: range.endDate,
      homeHours: 0,
      gymVisits: 0,
      socialVenueVisits: 0,
      newPlacesVisited: Math.max(selectedDayPoints.length - 1, 0),
      commuteDetected: selectedDayPoints.length >= 3,
      timeOutdoorsMinutes: likelyOutdoorsMinutes,
    };
  }, [range.endDate, selectedDayPoints, summaries]);
  const recentPoints = useMemo(
    () => (points ?? []).filter((point) => point.timestamp.slice(0, 10) >= range.startDate && point.timestamp.slice(0, 10) <= range.endDate).slice(-24),
    [points, range.endDate, range.startDate],
  );
  const spanDays = differenceInDays(range.startDate, range.endDate) + 1;
  const derivedPeriod: Period = spanDays <= 1 ? 'today' : spanDays <= 7 ? 'this-week' : spanDays <= 31 ? 'this-month' : '3-months';
  const activationCard = getLocationActivationCard(derivedPeriod);
  const insights = getLocationInsights(derivedPeriod);
  const showEmptyRealState = dataMode === 'real-only' && !isLoading && !chartDays.length && !recentPoints.length;

  useEffect(() => {
    if (!relationshipsHydrated) {
      void hydrateRelationships();
    }
  }, [hydrateRelationships, relationshipsHydrated]);

  useEffect(() => {
    void hydrateRelationships();
  }, [dataMode, hydrateRelationships]);

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
        {showEmptyRealState && (
          <RetryNotice
            message="Not enough real location data yet. OwnTracks or more recorded traces are needed before this page can tell a real story."
            onRetry={refetch}
            className="mx-4 mb-4 w-[calc(100%-2rem)]"
          />
        )}
        {!showEmptyRealState && (
          <>
            <LocationMapCard points={spanDays <= 1 ? selectedDayPoints : recentPoints} />
            <LocationStory today={selectedDay} points={recentPoints} />
            <LocationSummary today={selectedDay} />
            <CompanionTagger
              today={selectedDay}
              people={relationshipPeople}
              saved={companionLog}
              onSave={async (payload) => {
                const targetDate = selectedDay?.date ?? range.endDate;
                if (!targetDate) return;
                const next = await api.saveLocationCompanions(targetDate, payload);
                if (dataMode === 'real-only') {
                  setCompanionLog(next);
                }
                await refetchCompanionLog();
              }}
            />

            <motion.div
              className="mx-4 mb-4 rounded-[28px] p-5"
              style={{
                background:
                  'linear-gradient(180deg, color-mix(in srgb, var(--color-surface-2) 86%, white 14%) 0%, var(--color-surface-2) 100%)',
                border: '1px solid var(--color-border)',
              }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
                    Teach the map
                  </p>
                  <p className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                    The page gets smarter the more you correct it
                  </p>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                    Companion tags already help the app understand who was part of a place or route. Once OwnTracks is running consistently, repeated days will make it easier to recognise your real places, not just points on a map.
                  </p>
                </div>
                <div
                  className="min-w-[108px] rounded-[22px] px-3 py-3 text-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.62)' }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>
                    Feedback loop
                  </p>
                  <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                    trace
                  </p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                    tag
                  </p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>
                    remember
                  </p>
                </div>
              </div>
            </motion.div>

            <div className="px-4 pb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>Pattern read</p>
          <p className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
            What this day or range seems to be doing to you
          </p>
            </div>

            <motion.div
          className="mx-4 rounded-[28px] p-4 mb-4"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--color-surface-2) 88%, white 12%) 0%, var(--color-surface-2) 100%)',
            border: '1px solid var(--color-border)',
          }}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{activationCard.title}</p>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{activationCard.narrative}</p>
            </motion.div>

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
              {(dataMode === 'demo-only' ? insights : []).map((insight, index) => (
                <InsightCard key={insight.id} insight={insight} index={index} onTalkAboutThis={onTalkAboutThis} />
              ))}
            </div>

            <RecommendedActions period={derivedPeriod} />
          </>
        )}
      </div>
    </div>
  );
}
