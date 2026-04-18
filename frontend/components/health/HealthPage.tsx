'use client';

import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { HealthSummary } from './HealthSummary';
import { HealthCharts } from './HealthCharts';
import type { Period } from '@/lib/mockDataUtils';
import { api } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { RetryNotice } from '@/components/ui/retry-notice';
import { DateRangeControl, type DateRangeValue } from '@/components/ui/date-range-control';
import { APP_TODAY, addDays, clampIsoDate, differenceInDays } from '@/lib/date';
import { useSettingsStore } from '@/state/settings';

interface HealthPageProps {
  onBack: () => void;
  onSettings: () => void;
  onTalkAboutThis?: (context: string) => void;
}

export function HealthPage({ onBack, onSettings }: HealthPageProps) {
  const dataMode = useSettingsStore((state) => state.dataMode);
  const { data, isLoading, error, refetch } = useApiQuery(() => api.getHealth('3-months'), [dataMode]);
  const allDays = useMemo(() => data ?? [], [data]);
  const availableDates = useMemo(() => allDays.map((day) => day.date), [allDays]);
  const latestDate = availableDates[availableDates.length - 1] ?? APP_TODAY;
  const earliestDate = availableDates[0] ?? addDays(latestDate, -89);
  const [range, setRange] = useState<DateRangeValue>(() => ({
    startDate: latestDate,
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
  const spanDays = differenceInDays(range.startDate, range.endDate) + 1;
  const derivedPeriod: Period = spanDays <= 1 ? 'today' : spanDays <= 7 ? 'this-week' : spanDays <= 31 ? 'this-month' : '3-months';
  const showEmptyRealState = !isLoading && !days.length;

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
        {showEmptyRealState && (
          <RetryNotice
            message="Not enough health rows yet. Connect Garmin and sync data."
            onRetry={refetch}
            className="mx-4 mb-4 w-[calc(100%-2rem)]"
          />
        )}
        {!showEmptyRealState && (
          <>
            <HealthSummary days={days} />
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
