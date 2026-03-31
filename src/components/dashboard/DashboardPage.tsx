'use client';

import { useState } from 'react';

import { TopBar } from '@/components/navigation/TopBar';
import { HeroCard } from './HeroCard';
import { DataRing } from './DataRing';
import { InsightCard } from './InsightCard';
import { getCurrentHeroInsight, getInsightsForPeriod } from '@/data/insights';
import { getDashboardRings, type Period } from '@/lib/mockDataUtils';
import { healthData } from '@/data/health';
import { financeData } from '@/data/finance';


const PERIODS: { label: string; value: Period }[] = [
  { label: 'This week', value: 'this-week' },
  { label: 'Last week', value: 'last-week' },
  { label: 'This month', value: 'this-month' },
  { label: '3 months', value: '3-months' },
];

const ringColors = ['var(--color-primary)', 'var(--color-accent)', '#F59E0B'];

interface DashboardPageProps {
  onSettings: () => void;
  onNavigateToTherapist: (context?: string) => void;
}

export function DashboardPage({ onSettings, onNavigateToTherapist }: DashboardPageProps) {
  const [period, setPeriod] = useState<Period>('this-week');
  const rings = getDashboardRings(period);
  const heroInsight = getCurrentHeroInsight();
  const weekInsights = getInsightsForPeriod(period);
  const allCards = weekInsights.flatMap(w => w.cards);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar onBack={() => {}} onSettings={onSettings} />

      <div className="flex-1 overflow-y-auto">
        {/* Greeting */}
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Good morning</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Tuesday, 31 March 2026</p>
        </div>

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
          <HeroCard insight={heroInsight} onTalkAboutThis={onNavigateToTherapist} />
        </div>

        {/* Data rings */}
        <div className="px-4 pb-4">
          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-muted)' }}>
              {PERIODS.find(p => p.value === period)?.label} overview
            </h2>
            <div className="flex items-start justify-around">
              {rings.map((ring, i) => (
                <DataRing
                  key={ring.label}
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
            <MiniTrend
              label="Sleep"
              data={healthData.slice(-14).map(d => d.sleepQuality)}
              color="var(--color-primary)"
              unit="/10"
              latest={healthData[healthData.length - 1].sleepQuality.toString()}
            />
            <MiniTrend
              label="Steps"
              data={healthData.slice(-14).map(d => d.steps / 1000)}
              color="var(--color-accent)"
              unit="k"
              latest={(healthData[healthData.length - 1].steps / 1000).toFixed(1)}
            />
            <MiniTrend
              label="Spend"
              data={financeData.slice(-14).map(d => d.totalSpend)}
              color="#F59E0B"
              unit="£"
              latest={`£${financeData[financeData.length - 1].totalSpend}`}
              invertTrend
            />
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
