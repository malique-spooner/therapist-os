'use client';

import { useState } from 'react';
import { Brain } from 'lucide-react';

import { TopBar } from '@/components/navigation/TopBar';
import { HeroCard } from './HeroCard';
import { DataRing } from './DataRing';
import { InsightCard } from './InsightCard';
import { TodaySnapshot } from './TodaySnapshot';
import { type Period } from '@/lib/mockDataUtils';
import { api } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { RetryNotice } from '@/components/ui/retry-notice';


const PERIODS: { label: string; value: Period }[] = [
  { label: 'This week', value: 'this-week' },
  { label: 'Last week', value: 'last-week' },
  { label: 'This month', value: 'this-month' },
  { label: '3 months', value: '3-months' },
];

const ringColors = ['var(--color-primary)', 'var(--color-accent)', '#F59E0B'];

interface DashboardPageProps {
  onSettings: () => void;
  onOpenBrain?: () => void;
  onNavigateToTherapist: (context?: string) => void;
  onOpenDomain?: (page: 'health' | 'nutrition' | 'relationships' | 'finance' | 'consumption' | 'location') => void;
}

export function DashboardPage({ onSettings, onOpenBrain, onNavigateToTherapist, onOpenDomain }: DashboardPageProps) {
  const [period, setPeriod] = useState<Period>('this-week');
  const { data, isLoading, error, refetch } = useApiQuery(() => api.getDashboard(period), [period]);
  const rings = data?.rings ?? [];
  const heroInsight = data?.heroInsight;
  const allCards = data?.insights ?? [];

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar
        onBack={() => {}}
        onSettings={onSettings}
        leftElement={
          <button
            onClick={onOpenBrain}
            className="flex items-center gap-2 -ml-1 rounded-2xl px-2 py-1.5 active:scale-95 transition-transform"
            aria-label="Open Brain"
          >
            <div className="w-8 h-8 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-light)' }}>
              <Brain size={16} style={{ color: 'var(--color-dark)' }} />
            </div>
            <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>Brain</span>
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        {/* Greeting */}
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{data?.greeting ?? 'Good morning'}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{data?.dateLabel ?? new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        {onOpenDomain && <TodaySnapshot onSelect={onOpenDomain} />}

        {/* Period filter */}
        <div className="px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto no-select pb-1">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                style={{
                  backgroundColor: period === p.value ? 'var(--color-primary)' : 'var(--color-surface-2)',
                  color: period === p.value ? '#fff' : 'var(--color-text-muted)',
                  border: `1px solid ${period === p.value ? 'transparent' : 'var(--color-border)'}`,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hero insight card */}
        <div className="pb-4">
          {isLoading && <div className="mx-4 h-40 rounded-3xl animate-pulse" style={{ backgroundColor: 'var(--color-surface-2)' }} />}
          {!isLoading && error && (
            <RetryNotice onRetry={refetch} className="mx-4 w-[calc(100%-2rem)] p-5" />
          )}
          {!isLoading && !error && heroInsight && <HeroCard insight={heroInsight} onTalkAboutThis={onNavigateToTherapist} />}
        </div>

        {/* Data rings */}
        <div className="px-4 pb-4">
          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-muted)' }}>
              {PERIODS.find(p => p.value === period)?.label} overview
            </h2>
            <div className="flex items-start justify-around">
              {(isLoading ? [{ label: '', value: '', unit: '', percentage: 0, trend: '', trendPositive: true }, { label: '', value: '', unit: '', percentage: 0, trend: '', trendPositive: true }, { label: '', value: '', unit: '', percentage: 0, trend: '', trendPositive: true }] : rings).map((ring, i) => (
                <DataRing
                  key={`${ring.label}-${i}`}
                  {...ring}
                  color={ringColors[i]}
                  delay={i * 0.1}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Mini charts row */}
        <div className="px-4 pb-4">
          <div className="flex gap-3 overflow-x-auto no-select pb-1">
            {(data?.miniTrends ?? []).map((trend) => (
              <MiniTrend
                key={trend.label}
                label={trend.label}
                data={trend.data}
                color={trend.label === 'Sleep' ? 'var(--color-primary)' : trend.label === 'Steps' ? 'var(--color-accent)' : '#F59E0B'}
                unit={trend.unit}
                latest={trend.latest}
                invertTrend={trend.invertTrend}
              />
            ))}
          </div>
        </div>

        {/* Insight cards feed */}
        <div className="px-4 pb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
            Insights
          </h2>
          <div className="space-y-3">
            {allCards.map((card, i) => (
              <InsightCard
                key={card.id}
                insight={card}
                index={i}
                onTalkAboutThis={onNavigateToTherapist}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MiniTrendProps {
  label: string;
  data: number[];
  color: string;
  unit: string;
  latest: string;
  invertTrend?: boolean;
}

function MiniTrend({ label, data, color, unit, latest, invertTrend }: MiniTrendProps) {
  if (!data.length) {
    return (
      <div className="flex-shrink-0 rounded-2xl p-3 animate-pulse" style={{ width: 130, backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', height: 92 }} />
    );
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 36;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const up = last > prev;
  const trendGood = invertTrend ? !up : up;

  return (
    <div className="flex-shrink-0 rounded-2xl p-3" style={{ width: 130, backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{latest}{unit === '£' ? '' : unit}</span>
      </div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-xs mt-1" style={{ color: trendGood ? 'var(--color-success)' : 'var(--color-warning)' }}>
        {trendGood ? '↑' : '↓'} 14-day trend
      </p>
    </div>
  );
}
