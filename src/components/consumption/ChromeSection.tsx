'use client';

import type { ConsumptionPayload } from '@/lib/api';

interface ChromeSectionProps {
  days: ConsumptionPayload[];
}

function sum(values: Array<number | undefined | null>) {
  return values.reduce<number>((total, value) => total + Number(value ?? 0), 0);
}

export function ChromeSection({ days }: ChromeSectionProps) {
  const chromeDays = days.map((day) => day.providerBreakdown?.chrome).filter(Boolean);

  if (!chromeDays.length) {
    return (
      <div className="mx-4 mb-4 rounded-[28px] p-5" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Chrome</p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          No browser history appears in this window yet.
        </p>
      </div>
    );
  }

  const visitCount = sum(chromeDays.map((day) => day?.visitCount));
  const bookmarks = sum(chromeDays.map((day) => day?.bookmarks));
  const uniqueDomains = Array.from(
    new Set(chromeDays.flatMap((day) => day?.topDomains?.map((item) => item.domain) ?? [])),
  ).length;
  const topDomains = Array.from(
    new Map(chromeDays.flatMap((day) => day?.topDomains ?? []).map((item) => [item.domain, item.count] as const)),
  )
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))
    .slice(0, 5);
  const topPages = Array.from(
    new Map(chromeDays.flatMap((day) => day?.topPages ?? []).map((item) => [`${item.title}__${item.url}`, item.count] as const)),
  )
    .map(([key, count]) => {
      const [title, url] = key.split('__');
      return { title, url, count };
    })
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, 5);

  return (
    <div className="mx-4 mb-4 rounded-[28px] p-5" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Chrome</p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            Browser trail, domain habits, and saved pages from the selected window.
          </p>
        </div>
        <div className="rounded-2xl px-3 py-2 text-right" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Visits</p>
          <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{visitCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        {[
          { label: 'Visits', value: visitCount },
          { label: 'Unique domains', value: uniqueDomains },
          { label: 'Bookmarks', value: bookmarks },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>{item.label}</p>
            <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 mt-4 lg:grid-cols-2">
        <div className="rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Top domains</p>
          <div className="mt-3 space-y-2">
            {topDomains.map((item) => (
              <div key={item.domain} className="flex items-center justify-between gap-3">
                <p className="truncate text-sm" style={{ color: 'var(--color-text)' }}>{item.domain}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.count}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Top pages</p>
          <div className="mt-3 space-y-2">
            {topPages.map((item) => (
              <div key={`${item.title}__${item.url}`} className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{item.title || item.url}</p>
                <p className="truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.url}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
