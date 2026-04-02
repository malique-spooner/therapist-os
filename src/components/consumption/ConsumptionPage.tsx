'use client';

import { useState } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { ValenceMeter } from './ValenceMeter';
import { ValenceChart } from './ValenceChart';
import { YouTubeSection } from './YouTubeSection';
import { InsightCard } from '@/components/dashboard/InsightCard';
import type { Period } from '@/lib/mockDataUtils';
import { api } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { RetryNotice } from '@/components/ui/retry-notice';

const periods: { label: string; value: Period }[] = [
  { label: 'This Week', value: 'this-week' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'This Month', value: 'this-month' },
  { label: 'Last Month', value: 'last-month' },
];

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
  const [period, setPeriod] = useState<Period>('this-week');
  const { data, isLoading, error, refetch } = useApiQuery(() => api.getConsumption(period), [period]);
  const days = data ?? [];

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar showBack onBack={onBack} onSettings={onSettings} title="Consumption" />
      <div className="flex-1 overflow-y-auto pb-6">
        {error && (
          <RetryNotice onRetry={refetch} className="mx-4 mb-4 w-[calc(100%-2rem)]" />
        )}
        <ValenceMeter days={days} />
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
          <>
            <div className="mx-4 h-72 rounded-[28px] animate-pulse mb-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }} />
            <div className="mx-4 h-64 rounded-[28px] animate-pulse mb-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }} />
          </>
        ) : (
          <>
            <ValenceChart period={period} days={days} />
            <YouTubeSection days={days} />
          </>
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
