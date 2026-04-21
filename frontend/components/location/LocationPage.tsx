'use client';

import { useEffect, useMemo, useState } from 'react';
import { Settings2 } from 'lucide-react';

import { TopBar } from '@/components/navigation/TopBar';
import { DateRangeControl, type DateRangeValue } from '@/components/ui/date-range-control';
import { RetryNotice } from '@/components/ui/retry-notice';
import { api, type LocationIntelligencePayload } from '@/lib/api';
import { addDays, APP_TODAY, clampIsoDate, getDayLabel } from '@/lib/date';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useSettingsStore } from '@/state/settings';

import { LocationStoryIntelligence } from './LocationStoryIntelligence';
import { LocationSettingsDrawer } from './LocationSettingsDrawer';

interface LocationPageProps {
  onBack: () => void;
  onSettings: () => void;
  onTalkAboutThis: (context: string) => void;
}

type PlaceTone = 'positive' | 'neutral' | 'draining';

function fallbackExperience(mode: 'real-only'): LocationIntelligencePayload {
  return {
    mode,
    hasRealMapData: false,
    heroTitle: 'Place is acting like a nervous-system signal',
    heroBody: 'Once your phone starts sending traces, this page turns them into visits, places, and a weekly story.',
    summaries: [],
    selectedDay: null,
    points: [],
    selectedDayPoints: [],
    timeline: [],
    visits: [],
    places: [],
    recapScenes: [],
    rangeStats: [],
  };
}

export function LocationPage({ onBack, onSettings }: LocationPageProps) {
  void onSettings;
  const dataMode = useSettingsStore((state) => state.dataMode);
  const [showLocationSettings, setShowLocationSettings] = useState(false);
  const [range, setRange] = useState<DateRangeValue>(() => ({
    startDate: APP_TODAY,
    endDate: APP_TODAY,
  }));

  const { data: summaryData } = useApiQuery(
    () => api.getLocationSummary('12months'),
    [dataMode],
  );

  const { data: runtimeOptions } = useApiQuery(
    () => api.getAiRuntimeOptions(),
    [dataMode],
  );

  const { data: intelligenceData, isLoading, error, refetch } = useApiQuery(
    () => api.getLocationIntelligence({ startDate: range.startDate, endDate: range.endDate, date: range.endDate }),
    [dataMode, range.startDate, range.endDate],
  );

  useEffect(() => {
    const intelligence = intelligenceData ?? fallbackExperience(dataMode);
    const summaries = summaryData ?? intelligence.summaries;
    const availableDates = Array.from(
      new Set([
        ...summaries.map((day) => day.date),
        ...intelligence.points.map((point) => point.timestamp.slice(0, 10)),
      ]),
    ).sort();
    const latestDate = availableDates[availableDates.length - 1] ?? APP_TODAY;
    const earliestDate = availableDates[0] ?? addDays(latestDate, -89);

    setRange((current) => ({
      endDate: clampIsoDate(current.endDate, earliestDate, latestDate),
      startDate: clampIsoDate(current.startDate, earliestDate, clampIsoDate(current.endDate, earliestDate, latestDate)),
    }));
  }, [dataMode, intelligenceData, summaryData]);

  const availableDates = useMemo(
    () =>
      Array.from(
        new Set([
          ...(summaryData ?? (intelligenceData ?? fallbackExperience(dataMode)).summaries).map((day) => day.date),
          ...((intelligenceData ?? fallbackExperience(dataMode)).points).map((point) => point.timestamp.slice(0, 10)),
        ]),
      ).sort(),
    [dataMode, intelligenceData, summaryData],
  );

  const latestDate = availableDates[availableDates.length - 1] ?? APP_TODAY;
  const earliestDate = availableDates[0] ?? addDays(latestDate, -89);

  const experience = useMemo(() => {
    const intelligence = intelligenceData ?? fallbackExperience(dataMode);
    return {
      ...intelligence,
      places: intelligence.places.map((place) => ({
        ...place,
        key: place.placeKey,
        label: place.label ?? place.suggestedLabel ?? 'Place',
        suggestedLabel: place.suggestedLabel ?? place.label ?? 'Place',
        category: place.category ?? 'misc',
        latitude: place.latitude ?? 51.5074,
        longitude: place.longitude ?? -0.1278,
        visitCount: place.visitCount ?? 0,
        totalMinutes: place.totalMinutes ?? 0,
        averageDwellMinutes: place.averageDwellMinutes ?? 0,
        lastVisited: place.lastVisited ?? place.lastSeenAt ?? `${range.endDate}T00:00:00`,
        tone: (place.tone as PlaceTone | null) ?? 'neutral',
        insight: place.insight ?? 'This place is still building a richer story.',
        confidenceScore: place.confidenceScore ?? 0,
        historyCount: place.historyCount ?? 0,
        status: place.status ?? 'active',
      })),
    };
  }, [dataMode, intelligenceData, range.endDate]);

  const lastPointTimestamp = experience.points[experience.points.length - 1]?.timestamp ?? null;
  const showEmptyRealState = !isLoading && !experience.hasRealMapData;
  const rangeLabel = range.startDate === range.endDate
    ? getDayLabel(range.endDate, { weekday: 'short', day: 'numeric', month: 'short' })
    : `${getDayLabel(range.startDate, { day: 'numeric', month: 'short' })} - ${getDayLabel(range.endDate, { day: 'numeric', month: 'short' })}`;

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar
        showBack
        onBack={onBack}
        title="Location"
        rightElement={(
          <button onClick={() => setShowLocationSettings(true)} className="rounded-xl p-2 active:scale-95 transition-transform" aria-label="Location settings">
            <Settings2 size={18} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        )}
      />

      <div className="flex-1 overflow-y-auto pb-10">
        {error && (
          <RetryNotice onRetry={refetch} className="mx-4 mb-4 mt-4 w-[calc(100%-2rem)]" />
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
            message="Not enough real location data yet. Finish the OwnTracks phone publish flow, then teach Home and Work in Location settings."
            onRetry={refetch}
            className="mx-4 mb-4 w-[calc(100%-2rem)]"
          />
        )}

        <div className="space-y-4 px-4">
          <LocationStoryIntelligence
            selectedDay={experience.selectedDay}
            timeline={experience.timeline}
            visits={experience.visits}
            places={experience.places}
            selectedDayPoints={experience.selectedDayPoints}
            rangeLabel={rangeLabel}
            lastPointTimestamp={lastPointTimestamp}
            googleMapsApiKey={runtimeOptions?.googleMapsApiKey ?? null}
            onTimelineTagged={refetch}
          />
        </div>
      </div>

      <LocationSettingsDrawer
        open={showLocationSettings}
        onClose={() => setShowLocationSettings(false)}
        onSaved={refetch}
      />
    </div>
  );
}
