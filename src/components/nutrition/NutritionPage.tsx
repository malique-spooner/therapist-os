'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { TopBar } from '@/components/navigation/TopBar';
import { NutritionLog } from './NutritionLog';
import { ScienceTip } from './ScienceTip';
import { NutritionCharts } from './NutritionCharts';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { getTodayScienceTip } from '@/lib/domainData';
import { api, type NutritionPayload } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { DateRangeControl, type DateRangeValue } from '@/components/ui/date-range-control';
import { APP_TODAY, addDays, clampIsoDate } from '@/lib/date';
import { RetryNotice } from '@/components/ui/retry-notice';
import { useSettingsStore } from '@/store/settings';

const insights = [
  {
    id: 'nutrition-1',
    category: 'Nutrition',
    categoryIcon: '🥣',
    lens: 'CBT' as const,
    narrative: 'On breakfast-skip days, mood runs lower by roughly 0.8 points in this profile. The pattern is less about willpower and more about physiology arriving before awareness catches up.',
    action: 'Lower the breakfast bar instead of aiming for a perfect meal.',
    domainId: 'nutrition',
    viewLabel: 'View Nutrition',
  },
  {
    id: 'nutrition-2',
    category: 'Nutrition',
    categoryIcon: '🍷',
    lens: 'Behaviourism' as const,
    narrative: 'Best sleep quality follows alcohol-free evenings. The correlation is consistent enough that it is worth treating alcohol as a sleep variable first and a mood variable second.',
    action: 'Choose one alcohol-free evening when recovery matters most.',
    domainId: 'nutrition',
    viewLabel: 'View Nutrition',
  },
  {
    id: 'nutrition-3',
    category: 'Nutrition',
    categoryIcon: '☕',
    lens: 'SDT' as const,
    narrative: 'Caffeine runs higher on stressed days, but late caffeine amplifies the same elevated cortisol state you are trying to soothe.',
    action: 'Keep the ritual if you want it, but move it earlier.',
    domainId: 'nutrition',
    viewLabel: 'View Nutrition',
  },
];

interface NutritionPageProps {
  onBack: () => void;
  onSettings: () => void;
  onTalkAboutThis: (context: string) => void;
}

export function NutritionPage({ onBack, onSettings, onTalkAboutThis }: NutritionPageProps) {
  const dataMode = useSettingsStore((state) => state.dataMode);
  const { data, error, refetch, setData } = useApiQuery(() => api.getNutrition('3-months'), [dataMode]);
  const history = useMemo(() => data ?? [], [data]);
  const availableDates = useMemo(() => history.map((day) => day.date), [history]);
  const latestDate = availableDates[availableDates.length - 1] ?? APP_TODAY;
  const earliestDate = availableDates[0] ?? addDays(latestDate, -89);
  const [selectedRange, setSelectedRange] = useState<DateRangeValue>({ startDate: latestDate, endDate: latestDate });

  useEffect(() => {
    setSelectedRange((current) => {
      const date = clampIsoDate(current.endDate, earliestDate, latestDate);
      return { startDate: date, endDate: date };
    });
  }, [earliestDate, latestDate]);

  const selectedDate = selectedRange.endDate;
  const selectedLog = useMemo<NutritionPayload>(() => (
    history.find((day) => day.date === selectedDate) ?? {
      date: selectedDate,
      meals: { breakfast: false, lunch: false, dinner: false, heavySnacking: false },
      foodQuality: 2,
      caffeine: { count: 0, lastBeforeNoon: true },
      alcohol: { units: 0 },
    }
  ), [history, selectedDate]);
  const visibleDays = useMemo(
    () => history.filter((day) => day.date >= addDays(selectedDate, -13) && day.date <= selectedDate),
    [history, selectedDate],
  );
  const showEmptyRealState = dataMode === 'real-only' && history.length === 0;
  const riskFlags = useMemo(() => {
    const flags: string[] = [];
    if (!selectedLog.meals.breakfast) flags.push('No breakfast logged');
    if (selectedLog.caffeine.count >= 3) flags.push('High caffeine load');
    if (selectedLog.caffeine.count > 0 && !selectedLog.caffeine.lastBeforeNoon) flags.push('Late caffeine');
    if (selectedLog.alcohol.units >= 3) flags.push('Alcohol likely to hit sleep');
    if (selectedLog.meals.heavySnacking) flags.push('Heavy snacking pressure');
    return flags;
  }, [selectedLog]);
  const recoveryFlags = useMemo(() => {
    const flags: string[] = [];
    if (selectedLog.meals.breakfast) flags.push('Breakfast anchor present');
    if (selectedLog.meals.lunch) flags.push('Midday fuel present');
    if (selectedLog.foodQuality === 3) flags.push('Whole-food leaning');
    if (selectedLog.caffeine.count === 0 || selectedLog.caffeine.lastBeforeNoon) flags.push('Caffeine timing protected');
    if (selectedLog.alcohol.units === 0) flags.push('Alcohol-free day');
    return flags;
  }, [selectedLog]);

  async function save(next: NutritionPayload) {
    if (dataMode === 'real-only') {
      setData((current) => {
        const rows = current ?? [];
        const existing = rows.some((row) => row.date === next.date);
        const updated = existing
          ? rows.map((row) => row.date === next.date ? next : row)
          : [...rows, next].sort((a, b) => a.date.localeCompare(b.date));
        return updated;
      });
    }
    try {
      await api.saveNutritionForDate(next.date, {
        meals: next.meals,
        foodQuality: next.foodQuality,
        caffeine: next.caffeine,
        alcohol: next.alcohol,
      });
      await refetch();
    } catch {
      await refetch();
    }
  }

  function updateSelected(mutator: (current: NutritionPayload) => NutritionPayload) {
    void save(mutator(selectedLog));
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar showBack onBack={onBack} onSettings={onSettings} title="Nutrition" />
      <div className="flex-1 overflow-y-auto pb-6">
        {error && (
          <RetryNotice onRetry={refetch} className="mx-4 mb-4 w-[calc(100%-2rem)]" />
        )}
        <DateRangeControl
          mode="single"
          value={selectedRange}
          onChange={setSelectedRange}
          availableDates={availableDates}
          minDate={earliestDate}
          maxDate={latestDate}
        />
        {showEmptyRealState && (
          <RetryNotice
            message="Not enough real nutrition data yet. Log a real day or switch to Demo mode."
            onRetry={refetch}
            className="mx-4 mb-4 w-[calc(100%-2rem)]"
          />
        )}
        {!showEmptyRealState && (
          <motion.div
            className="mx-4 mb-4 rounded-[28px] p-4"
            style={{
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--color-surface-2) 88%, white 12%) 0%, var(--color-surface-2) 100%)',
              border: '1px solid var(--color-border)',
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>Recovery supports</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recoveryFlags.length ? recoveryFlags.map((flag) => (
                    <span
                      key={flag}
                      className="rounded-full px-3 py-2 text-xs font-semibold"
                      style={{ backgroundColor: 'rgba(82,183,136,0.12)', color: 'var(--color-accent)' }}
                    >
                      {flag}
                    </span>
                  )) : (
                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Nothing strong logged yet.</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>Likely friction</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {riskFlags.length ? riskFlags.map((flag) => (
                    <span
                      key={flag}
                      className="rounded-full px-3 py-2 text-xs font-semibold"
                      style={{ backgroundColor: 'rgba(231,111,81,0.12)', color: 'var(--color-warning)' }}
                    >
                      {flag}
                    </span>
                  )) : (
                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No obvious recovery risks on the board.</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        <NutritionLog
          value={selectedLog}
          label={selectedDate === APP_TODAY ? 'Today' : 'Selected'}
          onToggleMeal={(meal) => updateSelected((current) => ({
            ...current,
            meals: { ...current.meals, [meal]: !current.meals[meal] },
          }))}
          onFoodQualityChange={(foodQuality) => updateSelected((current) => ({ ...current, foodQuality }))}
          onCaffeineCountChange={(count) => updateSelected((current) => ({
            ...current,
            caffeine: { ...current.caffeine, count, lastBeforeNoon: count === 0 ? true : current.caffeine.lastBeforeNoon },
          }))}
          onAlcoholChange={(units) => updateSelected((current) => ({
            ...current,
            alcohol: { units },
          }))}
          onTimingChange={(lastBeforeNoon) => updateSelected((current) => ({
            ...current,
            caffeine: { ...current.caffeine, lastBeforeNoon },
          }))}
        />
        {dataMode === 'demo-only' && <ScienceTip tip={getTodayScienceTip()} />}
        {!showEmptyRealState && (
          <>
            <NutritionCharts days={visibleDays} />
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
