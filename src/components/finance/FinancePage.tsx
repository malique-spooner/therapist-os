'use client';

import { useState } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { FinanceSummary } from './FinanceSummary';
import { SpendingDonut } from './SpendingDonut';
import { DailySpendChart } from './DailySpendChart';
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
  const [period, setPeriod] = useState<Period>('this-week');
  const { data, isLoading, error, refetch } = useApiQuery(() => api.getFinance(period), [period]);
  const days = data ?? [];

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar showBack onBack={onBack} onSettings={onSettings} title="Finance" />
      <div className="flex-1 overflow-y-auto pb-6">
        {error && (
          <button onClick={() => void refetch()} className="mx-4 mb-4 w-[calc(100%-2rem)] rounded-3xl p-4 text-left" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
            Could not load data. Tap to retry.
          </button>
        )}
        <FinanceSummary days={days} />
        <SpendingDonut days={days} />
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
        {isLoading && !days.length ? (
          <div className="mx-4 h-72 rounded-[28px] animate-pulse" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }} />
        ) : (
          <DailySpendChart period={period} days={days} />
        )}
        <div className="px-4 space-y-3">
          {insights.map((insight, index) => (
            <InsightCard key={insight.id} insight={insight} index={index} onTalkAboutThis={onTalkAboutThis} />
          ))}
        </div>
      </div>
    </div>
  );
}
