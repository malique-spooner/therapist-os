'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { NutritionLog } from './NutritionLog';
import { ScienceTip } from './ScienceTip';
import { NutritionCharts } from './NutritionCharts';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { getTodayScienceTip } from '@/lib/domainData';
import type { Period } from '@/lib/mockDataUtils';
import { useNutritionStore } from '@/store/nutrition';

const periods: { label: string; value: Period }[] = [
  { label: 'This Week', value: 'this-week' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'This Month', value: 'this-month' },
  { label: 'Last Month', value: 'last-month' },
];

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
  const [period, setPeriod] = useState<Period>('this-week');
  const history = useNutritionStore((state) => state.history);
  const hydrated = useNutritionStore((state) => state.hydrated);
  const hydrateFromApi = useNutritionStore((state) => state.hydrateFromApi);

  useEffect(() => {
    if (!hydrated) {
      void hydrateFromApi();
    }
  }, [hydrateFromApi, hydrated]);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar showBack onBack={onBack} onSettings={onSettings} title="Nutrition" />
      <div className="flex-1 overflow-y-auto pb-6">
        <NutritionLog />
        <ScienceTip tip={getTodayScienceTip()} />
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
        <NutritionCharts period={period} days={history} />
        <div className="px-4 space-y-3">
          {insights.map((insight, index) => (
            <InsightCard key={insight.id} insight={insight} index={index} onTalkAboutThis={onTalkAboutThis} />
          ))}
        </div>
      </div>
    </div>
  );
}
