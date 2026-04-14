'use client';

import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { ValenceChart } from './ValenceChart';
import { SpotifyInsightsBoard } from './SpotifyInsightsBoard';
import { YouTubeSection } from './YouTubeSection';
import { ChromeSection } from './ChromeSection';
import type { Period } from '@/lib/mockDataUtils';
import { api } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { RetryNotice } from '@/components/ui/retry-notice';
import { DateRangeControl, type DateRangeValue } from '@/components/ui/date-range-control';
import { APP_TODAY, addDays, clampIsoDate, differenceInDays } from '@/lib/date';
import { useSettingsStore } from '@/store/settings';

interface ConsumptionPageProps {
  onBack: () => void;
  onSettings: () => void;
  onTalkAboutThis?: (context: string) => void;
}

function rangeFromLatest(latestDate: string, earliestDate: string): DateRangeValue {
  const endDate = clampIsoDate(latestDate, earliestDate, latestDate);
  const startDate = clampIsoDate(addDays(latestDate, -6), earliestDate, endDate);
  return { startDate, endDate };
}

function sumProviderMetric<T>(days: T[], pick: (day: T) => number | undefined | null) {
  return days.reduce((sum, day) => sum + Number(pick(day) ?? 0), 0);
}

export function ConsumptionPage({ onBack, onSettings }: ConsumptionPageProps) {
  const dataMode = useSettingsStore((state) => state.dataMode);
  const { data, error, refetch } = useApiQuery(() => api.getConsumption('3-months'), [dataMode]);
  const allDays = useMemo(() => data ?? [], [data]);
  const availableDates = useMemo(() => allDays.map((day) => day.date), [allDays]);
  const latestDate = availableDates[availableDates.length - 1] ?? APP_TODAY;
  const earliestDate = availableDates[0] ?? addDays(latestDate, -89);
  const [range, setRange] = useState<DateRangeValue>(() => rangeFromLatest(latestDate, earliestDate));

  useEffect(() => {
    if (!availableDates.length) return;
    setRange(rangeFromLatest(latestDate, earliestDate));
  }, [availableDates.length, earliestDate, latestDate]);

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
  const youtubeDays = useMemo(() => rangedDays.filter((day) => Boolean(day.providerBreakdown?.youtube)), [rangedDays]);
  const chromeDays = useMemo(() => rangedDays.filter((day) => Boolean(day.providerBreakdown?.chrome)), [rangedDays]);

  const spanDays = differenceInDays(range.startDate, range.endDate) + 1;
  const derivedPeriod: Period = spanDays <= 1 ? 'today' : spanDays <= 7 ? 'this-week' : spanDays <= 31 ? 'this-month' : '3-months';

  const spotifyHours = sumProviderMetric(spotifyDays, (day) => day.listeningHours);
  const spotifyActiveDays = spotifyDays.filter((day) => (day.listeningHours ?? 0) > 0).length;
  const youtubeWatchCount = sumProviderMetric(youtubeDays, (day) => day.providerBreakdown?.youtube?.watchCount);
  const youtubeSearchCount = sumProviderMetric(youtubeDays, (day) => day.providerBreakdown?.youtube?.searchCount);
  const chromeVisits = sumProviderMetric(chromeDays, (day) => day.providerBreakdown?.chrome?.visitCount);
  const chromeDomains = Array.from(
    new Set(chromeDays.flatMap((day) => day.providerBreakdown?.chrome?.topDomains?.map((item) => item.domain) ?? [])),
  ).length;
  const totalDaysWithMedia = new Set([
    ...spotifyDays.map((day) => day.date),
    ...youtubeDays.map((day) => day.date),
    ...chromeDays.map((day) => day.date),
  ]).size;

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar showBack onBack={onBack} onSettings={onSettings} title="Media" />
      <div className="flex-1 overflow-y-auto pb-6">
        {error && <RetryNotice onRetry={refetch} className="mx-4 mb-4 w-[calc(100%-2rem)]" />}

        <DateRangeControl
          value={range}
          onChange={setRange}
          availableDates={availableDates}
          minDate={earliestDate}
          maxDate={latestDate}
        />

        <div className="px-4 pb-4">
          <div
            className="rounded-[28px] p-4"
            style={{
              background: 'linear-gradient(135deg, rgba(58,134,255,0.12) 0%, rgba(82,183,136,0.12) 50%, rgba(244,211,94,0.12) 100%)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>
                  Last 7 days by default
                </p>
                <p className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                  Spotify, YouTube, and Chrome only
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  A wrapped-style view of what you listened to, watched, and browsed in the selected window.
                </p>
              </div>
              <div className="rounded-2xl px-3 py-2 text-right" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>
                  Days in view
                </p>
                <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  {spanDays}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 md:grid-cols-4">
              {[
                { label: 'Spotify hours', value: `${spotifyHours.toFixed(1)}h`, helper: `${spotifyActiveDays} active days` },
                { label: 'YouTube watches', value: `${youtubeWatchCount}`, helper: `${youtubeSearchCount} searches` },
                { label: 'Chrome visits', value: `${chromeVisits}`, helper: `${chromeDomains} unique domains` },
                { label: 'Media days', value: `${totalDaysWithMedia}`, helper: 'any provider activity' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>
                    {item.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {item.helper}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SpotifyInsightsBoard days={spotifyDays} />

        {spotifyDays.length > 0 && <ValenceChart period={derivedPeriod} days={spotifyDays} />}

        <YouTubeSection days={rangedDays} />
        <ChromeSection days={rangedDays} />
      </div>
    </div>
  );
}
