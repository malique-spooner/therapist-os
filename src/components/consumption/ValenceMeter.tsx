'use client';

import type { ConsumptionPayload } from '@/lib/api';

interface ValenceMeterProps {
  days: ConsumptionPayload[];
  providerLabel?: string;
}

export function ValenceMeter({ days, providerLabel = 'Spotify' }: ValenceMeterProps) {
  if (!days.length) {
    return <div className="mx-4 h-64 rounded-[28px] animate-pulse mb-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }} />;
  }

  const selectedWindow = days;
  const avgValence = selectedWindow.length ? selectedWindow.reduce((sum, day) => sum + (day.averageValence ?? 0), 0) / selectedWindow.length : 0;
  const lastWeek = days.slice(-14, -7);
  const previous = lastWeek.length ? lastWeek.reduce((sum, day) => sum + (day.averageValence ?? 0), 0) / lastWeek.length : 0;
  const trend = avgValence - previous;
  const latest = selectedWindow[selectedWindow.length - 1];
  const topGenre = latest?.topGenres?.[0] ?? 'Mixed';
  const isSingleDay = days.length <= 1;

  return (
    <div className="mx-4 rounded-[28px] p-5 mb-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>{providerLabel} as mood mirror</p>
      <div className="rounded-[28px] p-6 text-center" style={{ background: 'linear-gradient(135deg, #3A86FF 0%, #52B788 50%, #F4D35E 100%)' }}>
        <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.8)' }}>{isSingleDay ? 'Selected day valence' : 'Selected window valence'}</p>
        <p className="text-4xl font-semibold mt-3 text-white">{avgValence.toFixed(2)}</p>
        <p className="text-sm mt-2 text-white/80">{trend >= 0 ? '+' : ''}{trend.toFixed(2)} vs recent 7-day baseline</p>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Hours listened</p>
          <p className="text-lg font-semibold mt-1" style={{ color: 'var(--color-text)' }}>{selectedWindow.reduce((sum, day) => sum + day.listeningHours, 0).toFixed(1)}h</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Top genre</p>
          <p className="text-lg font-semibold mt-1" style={{ color: 'var(--color-text)' }}>{topGenre}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Discoveries</p>
          <p className="text-lg font-semibold mt-1" style={{ color: 'var(--color-text)' }}>{selectedWindow.reduce((sum, day) => sum + day.newDiscoveries, 0)}</p>
        </div>
      </div>
    </div>
  );
}
