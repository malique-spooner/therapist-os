'use client';

import type { ConsumptionPayload } from '@/lib/api';

interface YouTubeSectionProps {
  days: ConsumptionPayload[];
}

function sum(values: Array<number | undefined | null>) {
  return values.reduce<number>((total, value) => total + Number(value ?? 0), 0);
}

export function YouTubeSection({ days }: YouTubeSectionProps) {
  const youtubeDays = days.map((day) => day.providerBreakdown?.youtube).filter(Boolean);

  if (!youtubeDays.length) {
    return (
      <div className="mx-4 mb-4 rounded-[28px] p-5" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>YouTube</p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          No YouTube activity appears in this window yet.
        </p>
      </div>
    );
  }

  const watchCount = sum(youtubeDays.map((day) => day?.watchCount));
  const searchCount = sum(youtubeDays.map((day) => day?.searchCount));
  const subscriptionCount = sum(youtubeDays.map((day) => day?.subscriptionCount));
  const topChannels = Array.from(
    new Map(
      youtubeDays.flatMap((day) => day?.topChannels ?? []).map((item) => [item.name, item.count] as const),
    ),
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 5);
  const topSearches = Array.from(
    new Map(
      youtubeDays.flatMap((day) => day?.topSearches ?? []).map((item) => [item.query, item.count] as const),
    ),
  )
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count || a.query.localeCompare(b.query))
    .slice(0, 5);
  const topVideos = Array.from(
    new Map(
      youtubeDays.flatMap((day) => day?.topVideos ?? []).map((item) => [`${item.title}__${item.channel}`, item.count] as const),
    ),
  )
    .map(([key, count]) => {
      const [title, channel] = key.split('__');
      return { title, channel, count };
    })
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, 5);

  return (
    <div className="mx-4 mb-4 rounded-[28px] p-5" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>YouTube</p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            Watch history, searches, and subscriptions from the selected window.
          </p>
        </div>
        <div className="rounded-2xl px-3 py-2 text-right" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Watch count</p>
          <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{watchCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        {[
          { label: 'Watch events', value: watchCount },
          { label: 'Searches', value: searchCount },
          { label: 'Subscriptions', value: subscriptionCount },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>{item.label}</p>
            <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 mt-4 lg:grid-cols-2">
        <div className="rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Top channels</p>
          <div className="mt-3 space-y-2">
            {topChannels.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3">
                <p className="truncate text-sm" style={{ color: 'var(--color-text)' }}>{item.name}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.count}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Top searches</p>
          <div className="mt-3 space-y-2">
            {topSearches.map((item) => (
              <div key={item.query} className="flex items-center justify-between gap-3">
                <p className="truncate text-sm" style={{ color: 'var(--color-text)' }}>{item.query}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Top videos</p>
        <div className="mt-3 space-y-2">
          {topVideos.map((item) => (
            <div key={`${item.title}__${item.channel}`} className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{item.title}</p>
                  <p className="truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.channel}</p>
                </div>
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{item.count}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
