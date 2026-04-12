'use client';

import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { ValenceChart } from './ValenceChart';
import { SpotifyInsightsBoard } from './SpotifyInsightsBoard';
import { YouTubeSection } from './YouTubeSection';
import { InsightCard } from '@/components/dashboard/InsightCard';
import type { Period } from '@/lib/mockDataUtils';
import { api } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { RetryNotice } from '@/components/ui/retry-notice';
import { DateRangeControl, type DateRangeValue } from '@/components/ui/date-range-control';
import { APP_TODAY, addDays, clampIsoDate, differenceInDays } from '@/lib/date';
import { useSettingsStore } from '@/store/settings';

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
  const dataMode = useSettingsStore((state) => state.dataMode);
  const { data, isLoading, error, refetch } = useApiQuery(() => api.getConsumption('3-months'), [dataMode]);
  const allDays = useMemo(() => data ?? [], [data]);
  const availableDates = useMemo(() => allDays.map((day) => day.date), [allDays]);
  const latestDate = availableDates[availableDates.length - 1] ?? APP_TODAY;
  const earliestDate = availableDates[0] ?? addDays(latestDate, -89);
  const [range, setRange] = useState<DateRangeValue>(() => ({
    startDate: latestDate,
    endDate: latestDate,
  }));
  const [selectedProvider, setSelectedProvider] = useState<'all' | 'spotify' | 'youtube'>('all');

  useEffect(() => {
    setRange((current) => {
      const endDate = clampIsoDate(current.endDate, earliestDate, latestDate);
      const startDate = clampIsoDate(current.startDate, earliestDate, endDate);
      return { startDate, endDate };
    });
  }, [earliestDate, latestDate]);

  const rangedDays = useMemo(
    () => allDays.filter((day) => day.date >= range.startDate && day.date <= range.endDate),
    [allDays, range.endDate, range.startDate],
  );
  const spotifyDays = useMemo(
    () =>
      rangedDays
        .map((day) => {
          const spotify = day.providerBreakdown?.spotify;
          if (!spotify) return null;
          return {
            ...day,
            listeningHours: spotify.listeningHours,
            averageValence: spotify.averageValence,
            averageEnergy: spotify.averageEnergy,
            averageDanceability: spotify.averageDanceability,
            newDiscoveries: spotify.newDiscoveries,
            topGenres: spotify.topGenres ?? day.topGenres ?? [],
            topTracks: spotify.topTracks ?? day.topTracks ?? [],
          };
        })
        .filter((day): day is NonNullable<typeof day> => Boolean(day)),
    [rangedDays],
  );
  const youtubeDays = useMemo(
    () =>
      rangedDays.filter((day) => Boolean(day.providerBreakdown?.youtube)),
    [rangedDays],
  );
  const availableProviders = useMemo(() => {
    const providers = new Set<'spotify' | 'youtube'>();
    rangedDays.forEach((day) => {
      if (day.providerBreakdown?.spotify) providers.add('spotify');
      if (day.providerBreakdown?.youtube) providers.add('youtube');
    });
    return Array.from(providers);
  }, [rangedDays]);
  const mediaDays = selectedProvider === 'youtube' ? youtubeDays : selectedProvider === 'spotify' ? spotifyDays : rangedDays;
  const spanDays = differenceInDays(range.startDate, range.endDate) + 1;
  const derivedPeriod: Period = spanDays <= 1 ? 'today' : spanDays <= 7 ? 'this-week' : spanDays <= 31 ? 'this-month' : '3-months';
  const showEmptyRealState = dataMode === 'real-only' && !isLoading && !mediaDays.length;

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
        {availableProviders.length > 0 && (
          <div className="px-4 pb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>
              Media provider
            </p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {(['all', ...availableProviders] as Array<'all' | 'spotify' | 'youtube'>).map((provider) => {
                const active = selectedProvider === provider;
                return (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => setSelectedProvider(provider)}
                    className="shrink-0 rounded-full px-3 py-2 text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: active ? 'var(--color-primary)' : 'var(--color-surface-2)',
                      color: active ? 'white' : 'var(--color-text)',
                      border: active ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                    }}
                  >
                    {provider === 'all' ? 'All media' : provider === 'spotify' ? 'Spotify' : 'YouTube'}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {showEmptyRealState && (
          <RetryNotice
            message={
              selectedProvider === 'youtube'
                ? 'YouTube data is not connected yet for this range. Switch providers or the Demo sandbox for now.'
                : selectedProvider === 'spotify'
                  ? 'Spotify data is not connected yet for this range. Switch providers or the Demo sandbox for now.'
                  : 'Not enough rows in the Real database yet for this range. Connect Spotify or YouTube, or switch to the Demo sandbox.'
            }
            onRetry={refetch}
            className="mx-4 mb-4 w-[calc(100%-2rem)]"
          />
        )}
        {!showEmptyRealState && (
          <>
            {(selectedProvider === 'all' || selectedProvider === 'spotify') && <SpotifyInsightsBoard days={spotifyDays} />}
            {isLoading && !mediaDays.length ? (
              <>
                <div className="mx-4 h-72 rounded-[28px] animate-pulse mb-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }} />
                <div className="mx-4 h-64 rounded-[28px] animate-pulse mb-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }} />
              </>
            ) : (
              <>
                {(selectedProvider === 'all' || selectedProvider === 'spotify') && <ValenceChart period={derivedPeriod} days={spotifyDays} />}
                {(selectedProvider === 'all' || selectedProvider === 'youtube') && <YouTubeSection days={youtubeDays} />}
              </>
            )}
            <div className="px-4 space-y-3">
              {(dataMode === 'demo-only' ? insights : []).map((insight, index) => (
                <InsightCard key={insight.id} insight={insight} index={index} onTalkAboutThis={onTalkAboutThis} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
