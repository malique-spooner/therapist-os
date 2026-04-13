'use client';

import { useEffect, useMemo, useState } from 'react';

import { TopBar } from '@/components/navigation/TopBar';
import { api, type DataSourceActivityItemPayload, type DataSourceActivityPayload } from '@/lib/api';

type ActivityMode = 'real-only';

interface SyncActivityPageProps {
  initialMode: ActivityMode;
  onBack: () => void;
}

function relativeLabel(timestamp: string | null | undefined) {
  if (!timestamp) return 'Never';
  const deltaSeconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (deltaSeconds < 60) return 'just now';
  const minutes = Math.floor(deltaSeconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function absoluteLabel(timestamp: string | null | undefined) {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Never';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function modeCopy() {
  return {
    title: 'Real data',
    description: 'Sparse sections mean that source has not written rows yet.',
    accent: 'var(--color-success)',
  };
}

function SourceActivityCard({ item }: { item: DataSourceActivityItemPayload }) {
  const lastAttempt = item.recentAttempts[0];
  const hasRows = item.recordsAvailable > 0;
  const statusLabel = item.syncBlocked
    ? 'Cooldown'
    : ['garmin', 'instagram', 'snapchat', 'youtube', 'chrome'].includes(item.id) && item.available
      ? 'Import folder set'
      : item.id === 'owntracks' && item.available && !item.connected
        ? 'Waiting for phone'
        : item.lastSyncStatus === 'failed'
          ? 'Sync failed'
      : item.lastSyncStatus === 'automatic-only'
        ? 'Auto only'
        : item.connected
          ? 'Connected'
          : item.available
            ? 'Ready'
            : 'Needs setup';

  return (
    <div className="rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-xl leading-none">{item.icon}</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{item.name}</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.category}</p>
          </div>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
          style={{
            backgroundColor: item.connected && item.lastSyncStatus !== 'failed' ? 'rgba(82, 183, 136, 0.14)' : 'var(--color-surface)',
            color: item.connected && item.lastSyncStatus !== 'failed' ? 'var(--color-success)' : 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
          }}
        >
          {statusLabel}
        </span>
      </div>

      <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        {item.id === 'owntracks' && item.available && !hasRows
          ? 'OwnTracks credentials are saved, but no successful phone publish has written real location data yet. Send a manual publish from the phone to confirm the pipeline.'
          : hasRows
          ? `Latest saved data reaches ${item.latestDataDate ?? 'the current range'} and this source currently has ${item.recordsAvailable} stored row${item.recordsAvailable === 1 ? '' : 's'}.`
          : 'No stored rows yet in this dataset. The connection may still be set up correctly, but nothing has been written here yet.'}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Rows</p>
          <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{item.recordsAvailable}</p>
        </div>
        <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Latest Data</p>
          <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{item.latestDataDate ?? 'None'}</p>
        </div>
        <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Last Collected</p>
          <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{relativeLabel(item.lastCollectedAt)}</p>
          <p className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{absoluteLabel(item.lastCollectedAt)}</p>
        </div>
        <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Last Attempt</p>
          <p className="mt-1 text-sm font-semibold capitalize" style={{ color: 'var(--color-text)' }}>
            {lastAttempt ? `${lastAttempt.status} - ${relativeLabel(lastAttempt.attemptedAt)}` : 'None'}
          </p>
          <p className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{lastAttempt ? absoluteLabel(lastAttempt.attemptedAt) : 'No recorded attempts yet'}</p>
        </div>
      </div>

      {(item.syncGuardMessage || item.lastError) && (
        <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--color-warning)' }}>
          {item.syncGuardMessage ?? item.lastError}
        </p>
      )}

      {item.recentAttempts.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Recent Activity</p>
          {item.recentAttempts.slice(0, 4).map((attempt) => (
            <div key={attempt.id} className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold capitalize" style={{ color: 'var(--color-text)' }}>
                    {attempt.status}
                    {typeof attempt.rowsSynced === 'number' ? ` - ${attempt.rowsSynced} row${attempt.rowsSynced === 1 ? '' : 's'}` : ''}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {relativeLabel(attempt.attemptedAt)} - {attempt.trigger}
                    {attempt.dataMode ? ` - ${attempt.dataMode}` : ''}
                  </p>
                </div>
              </div>
              {attempt.detail && (
                <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {attempt.detail}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SyncActivityPage({ initialMode, onBack }: SyncActivityPageProps) {
  const [mode] = useState<ActivityMode>(initialMode);
  const [payload, setPayload] = useState<DataSourceActivityPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void api.getDataSourceActivity(mode).then((next) => {
      if (!active) return;
      setPayload(next);
      setError(null);
      setLoading(false);
    }).catch((err) => {
      if (!active) return;
      setError(err instanceof Error ? err.message : 'Could not load sync activity.');
      setLoading(false);
    });
    return () => { active = false; };
  }, [mode]);

  const items = useMemo(() => payload?.items ?? [], [payload]);
  const copy = useMemo(() => modeCopy(), []);
  const totalRows = useMemo(() => items.reduce((sum, item) => sum + item.recordsAvailable, 0), [items]);
  const activeSources = useMemo(() => items.filter((item) => item.recordsAvailable > 0).length, [items]);
  const blockedSources = useMemo(() => items.filter((item) => item.syncBlocked).length, [items]);
  const latestRefresh = useMemo(() => {
    const timestamps = items
      .map((item) => item.lastCollectedAt)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return timestamps[0] ?? null;
  }, [items]);

  return (
    <div className="h-full overflow-y-auto bg-[var(--color-surface)]">
      <TopBar showBack onBack={onBack} title="Sync Activity" />
      <div className="px-4 py-4 space-y-4">
        <div className="rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Connection Activity Log</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: copy.accent }}>{copy.title}</p>
            </div>
            {payload && (
              <div className="rounded-2xl px-3 py-2 text-right" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Last refresh</p>
                <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{relativeLabel(payload.generatedAt)}</p>
              </div>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {copy.description}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[24px] px-4 py-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Rows in view</p>
            <p className="mt-1 text-xl font-semibold" style={{ color: 'var(--color-text)' }}>{totalRows}</p>
          </div>
          <div className="rounded-[24px] px-4 py-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Sources with data</p>
            <p className="mt-1 text-xl font-semibold" style={{ color: 'var(--color-text)' }}>{activeSources}/{items.length || 0}</p>
          </div>
          <div className="rounded-[24px] px-4 py-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Latest collected</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{relativeLabel(latestRefresh)}</p>
            <p className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{absoluteLabel(latestRefresh)}</p>
          </div>
          <div className="rounded-[24px] px-4 py-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Blocked sources</p>
            <p className="mt-1 text-xl font-semibold" style={{ color: 'var(--color-text)' }}>{blockedSources}</p>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(208, 0, 0, 0.08)', color: 'var(--color-warning)' }}>
            {error}
          </div>
        )}

        {loading && items.length === 0 && (
          <div className="rounded-[24px] px-4 py-5 text-sm" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
            Loading connection activity...
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-[24px] px-4 py-5 text-sm leading-relaxed" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
            No connection records are available yet. Once sources are initialized, their sync history and dataset freshness will show up here.
          </div>
        )}

        <div className="space-y-4">
          {items.map((item) => (
            <SourceActivityCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
