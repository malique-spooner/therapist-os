'use client';

import { motion } from 'framer-motion';
import { Clock3, MapPinned, Smartphone, Users } from 'lucide-react';

import type { LocationRangeStatPayload } from '@/lib/api';

function formatRelativeTime(timestamp: string) {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMinutes = Math.max(0, Math.round((now - then) / 60000));

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatMetricLabel(label: string) {
  return label.replace(/_/g, ' ');
}

export function LocationLiveStatusCard({
  heroTitle,
  heroBody,
  lastPointTimestamp,
  pointCount,
  visitCount,
  placeCount,
  rangeStats,
}: {
  heroTitle: string;
  heroBody: string;
  lastPointTimestamp: string | null;
  pointCount: number;
  visitCount: number;
  placeCount: number;
  rangeStats: LocationRangeStatPayload[];
}) {
  const statusLabel = lastPointTimestamp ? `Last ping ${formatRelativeTime(lastPointTimestamp)}` : 'Waiting for phone';
  const statusDetail = lastPointTimestamp
    ? 'OwnTracks is posting into the app and the page is turning that into visits and places.'
    : 'OwnTracks has not sent a point into the app yet.';

  return (
    <motion.div
      className="rounded-[30px] p-5"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--color-surface-2) 88%, white 12%) 0%, var(--color-surface-2) 100%)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 16px 34px rgba(15, 23, 42, 0.06)',
      }}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
            Live phone feed
          </p>
          <p className="mt-2 text-[1.35rem] font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>
            {heroTitle}
          </p>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {heroBody}
          </p>
        </div>
        <div className="rounded-[24px] px-3 py-3" style={{ backgroundColor: 'rgba(82,183,136,0.12)', color: 'var(--color-primary)' }}>
          <Smartphone size={18} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[22px] p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <Clock3 size={15} style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>
              Status
            </p>
          </div>
          <p className="mt-2 text-base font-semibold" style={{ color: 'var(--color-text)' }}>
            {statusLabel}
          </p>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {statusDetail}
          </p>
        </div>

        <div className="rounded-[22px] p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <MapPinned size={15} style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>
              Location
            </p>
          </div>
          <p className="mt-2 text-base font-semibold" style={{ color: 'var(--color-text)' }}>
            {pointCount} pings
          </p>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {visitCount} visits and {placeCount} places are being built from the live trace.
          </p>
        </div>

        <div className="rounded-[22px] p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <Users size={15} style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>
              Meaning
            </p>
          </div>
          <p className="mt-2 text-base font-semibold" style={{ color: 'var(--color-text)' }}>
            Human-readable first
          </p>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            The app hides the database split and shows one live story instead.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {rangeStats.map((stat) => (
          <div key={stat.label} className="rounded-[20px] px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.6)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>
              {formatMetricLabel(stat.label)}
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {stat.value}
            </p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              {stat.detail}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
