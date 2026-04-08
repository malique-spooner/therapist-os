'use client';

import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { FinanceSummary } from './FinanceSummary';
import { SpendingDonut } from './SpendingDonut';
import { DailySpendChart } from './DailySpendChart';
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
    id: 'finance-1',
    category: 'Finance',
    categoryIcon: '💷',
    lens: 'CBT' as const,
    narrative: 'Entertainment spending spikes after poor sleep in this profile. The data suggests the purchase is often trying to solve a depleted state, not genuine desire.',
    action: 'Pause for a state check before comfort spending on tired days.',
    domainId: 'finance',
    viewLabel: 'View Finance',
  },
  {
    id: 'finance-2',
    category: 'Finance',
    categoryIcon: '🤝',
    lens: 'SDT' as const,
    narrative: 'Social outings cost more, but they also align with higher mood and stronger connection. Not all spending above baseline is misaligned spending.',
    action: 'Differentiate nourishing spending from numbing spending.',
    domainId: 'finance',
    viewLabel: 'View Finance',
  },
  {
    id: 'finance-3',
    category: 'Finance',
    categoryIcon: '📈',
    lens: 'Behaviourism' as const,
    narrative: 'Recent budget adherence is stronger than it was six weeks ago. Repetition is turning a conscious rule into a more automatic pattern.',
    action: 'Keep the cue-reward loop visible while it is still consolidating.',
    domainId: 'finance',
    viewLabel: 'View Finance',
  },
];

interface FinancePageProps {
  onBack: () => void;
  onSettings: () => void;
  onTalkAboutThis: (context: string) => void;
}

export function FinancePage({ onBack, onSettings, onTalkAboutThis }: FinancePageProps) {
  const dataMode = useSettingsStore((state) => state.dataMode);
  const { data, isLoading, error, refetch } = useApiQuery(() => api.getFinance('3-months'), [dataMode]);
  const allDays = useMemo(() => data ?? [], [data]);
  const availableDates = useMemo(() => allDays.map((day) => day.date), [allDays]);
  const latestDate = availableDates[availableDates.length - 1] ?? APP_TODAY;
  const earliestDate = availableDates[0] ?? addDays(latestDate, -89);
  const [range, setRange] = useState<DateRangeValue>(() => ({
    startDate: latestDate,
    endDate: latestDate,
  }));
  const [selectedBank, setSelectedBank] = useState<string>('all');

  useEffect(() => {
    setRange((current) => {
      const endDate = clampIsoDate(current.endDate, earliestDate, latestDate);
      const startDate = clampIsoDate(current.startDate, earliestDate, endDate);
      return { startDate, endDate };
    });
  }, [earliestDate, latestDate]);

  const days = useMemo(
    () =>
      allDays
        .filter((day) => day.date >= range.startDate && day.date <= range.endDate)
        .map((day) => {
          if (selectedBank === 'all') return day;
          const bank = day.bankBreakdown?.find((item) => item.name === selectedBank);
          if (!bank) return null;
          return {
            date: day.date,
            totalSpend: bank.totalSpend,
            eatingOut: bank.eatingOut,
            groceries: bank.groceries,
            transport: bank.transport,
            entertainment: bank.entertainment,
            social: bank.social,
            other: bank.other,
            bankBreakdown: [bank],
          };
        })
        .filter((day): day is NonNullable<typeof day> => Boolean(day)),
    [allDays, range.endDate, range.startDate, selectedBank],
  );
  const availableBanks = useMemo(
    () => Array.from(new Set(allDays.flatMap((day) => day.bankBreakdown?.map((item) => item.name) ?? []))).sort(),
    [allDays],
  );

  useEffect(() => {
    if (selectedBank !== 'all' && !availableBanks.includes(selectedBank)) {
      setSelectedBank('all');
    }
  }, [availableBanks, selectedBank]);

  const spanDays = differenceInDays(range.startDate, range.endDate) + 1;
  const derivedPeriod: Period = spanDays <= 1 ? 'today' : spanDays <= 7 ? 'this-week' : spanDays <= 31 ? 'this-month' : '3-months';
  const showEmptyRealState = dataMode === 'real-only' && !isLoading && !days.length;

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar showBack onBack={onBack} onSettings={onSettings} title="Finance" />
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
        {availableBanks.length > 0 && (
          <div className="px-4 pb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>
              Bank filter
            </p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {['all', ...availableBanks].map((bank) => {
                const active = selectedBank === bank;
                return (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => setSelectedBank(bank)}
                    className="shrink-0 rounded-full px-3 py-2 text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: active ? 'var(--color-primary)' : 'var(--color-surface-2)',
                      color: active ? 'white' : 'var(--color-text)',
                      border: active ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                    }}
                  >
                    {bank === 'all' ? 'All banks' : bank}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {showEmptyRealState && (
          <RetryNotice
            message={selectedBank === 'all' ? 'Not enough real finance data yet. Finish syncing a bank source or switch to Demo mode.' : `No finance data for ${selectedBank} in this range yet.`}
            onRetry={refetch}
            className="mx-4 mb-4 w-[calc(100%-2rem)]"
          />
        )}
        {!showEmptyRealState && (
          <>
            <FinanceSummary days={days} />
            <SpendingDonut days={days} />
            {isLoading && !days.length ? (
              <div className="mx-4 h-72 rounded-[28px] animate-pulse" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }} />
            ) : (
              <DailySpendChart period={derivedPeriod} days={days} />
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
