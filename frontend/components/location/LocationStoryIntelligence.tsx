'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronDown,
  Briefcase,
  Bus,
  Clock3,
  Dumbbell,
  Home,
  MapPin,
  Sparkles,
  TreePine,
  Users,
  Search,
  type LucideIcon,
} from 'lucide-react';

import { api, type LocationPlaceMemoryPayload, type LocationPointPayload, type LocationSummaryPayload, type LocationTimelinePayload, type LocationVisitPayload } from '@/lib/api';
import { GoogleMapCanvas } from './GoogleMapCanvas';

interface NormalizedPlace extends LocationPlaceMemoryPayload {
  key: string;
  label: string;
  category: string;
  totalMinutes: number;
  visitCount: number;
  averageDwellMinutes: number;
  tone: 'positive' | 'neutral' | 'draining';
}

interface LocationStoryIntelligenceProps {
  selectedDay: LocationSummaryPayload | null | undefined;
  timeline: LocationTimelinePayload[];
  visits: LocationVisitPayload[];
  places: NormalizedPlace[];
  selectedDayPoints: LocationPointPayload[];
  rangeLabel: string;
  lastPointTimestamp: string | null;
  googleMapsApiKey?: string | null;
  onSelectVisit?: (visit: LocationVisitPayload) => void;
  onSelectPlace?: (placeKey: string) => void;
  onTimelineTagged?: () => void;
}

const categoryMeta: Record<string, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  home: { label: 'Home', color: 'var(--color-primary)', bg: 'rgba(45, 106, 79, 0.12)', icon: Home },
  work: { label: 'Work', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', icon: Briefcase },
  gym: { label: 'Fitness', color: '#f4a261', bg: 'rgba(244, 162, 97, 0.14)', icon: Dumbbell },
  green_space: { label: 'Green space', color: '#52B788', bg: 'rgba(82, 183, 136, 0.14)', icon: TreePine },
  cafe: { label: 'Cafe', color: '#b7791f', bg: 'rgba(183, 121, 31, 0.12)', icon: MapPin },
  social: { label: 'Social', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.12)', icon: Users },
  unknown_place: { label: 'Unknown place', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)', icon: Search },
  misc: { label: 'Other', color: 'var(--color-text-muted)', bg: 'var(--color-surface-2)', icon: MapPin },
  other: { label: 'Other', color: 'var(--color-text-muted)', bg: 'var(--color-surface-2)', icon: MapPin },
};

const movementMeta: Record<string, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  walking: { label: 'Walk', color: 'var(--color-primary)', bg: 'rgba(45, 106, 79, 0.12)', icon: MapPin },
  travel: { label: 'Travel', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', icon: Bus },
};

function getMeta(category: string) {
  return categoryMeta[category] ?? categoryMeta.misc;
}

function getMovementMeta(movementType: string | null | undefined) {
  return movementMeta[movementType ?? 'travel'] ?? movementMeta.travel;
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes}m`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatSince(timestamp: string | null) {
  if (!timestamp) return 'Waiting for phone data';
  return `Last point ${new Date(timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

function buildCategoryBreakdown(visits: LocationVisitPayload[]) {
  const totalMinutes = visits.reduce((sum, visit) => sum + visit.dwellMinutes, 0);
  const buckets = visits.reduce<Record<string, number>>((acc, visit) => {
    acc[visit.category] = (acc[visit.category] ?? 0) + visit.dwellMinutes;
    return acc;
  }, {});

  return Object.entries(buckets)
    .map(([category, minutes]) => ({
      category,
      minutes,
      percent: totalMinutes ? Math.round((minutes / totalMinutes) * 100) : 0,
      meta: getMeta(category),
    }))
    .sort((a, b) => b.minutes - a.minutes);
}

function SectionLabel({ label, action }: { label: string; action?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </p>
      {action && (
        <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
          {action}
        </span>
      )}
    </div>
  );
}

function TimeBreakdown({ timeline, visits }: { timeline: LocationTimelinePayload[]; visits: LocationVisitPayload[] }) {
  const effectiveTimeline = timeline.length
    ? timeline
    : visits.map((visit) => ({
      id: visit.id,
      rowId: visit.id,
      kind: 'visit' as const,
      label: visit.placeLabel,
      startTimestamp: visit.startTimestamp,
      endTimestamp: visit.endTimestamp,
      durationMinutes: visit.dwellMinutes,
      category: visit.category,
    }));
  const placeMinutes = effectiveTimeline.filter((row) => row.kind === 'visit').reduce((sum, row) => sum + row.durationMinutes, 0);
  const movementMinutes = effectiveTimeline.filter((row) => row.kind === 'movement').reduce((sum, row) => sum + row.durationMinutes, 0);
  const breakdown = buildCategoryBreakdown(visits);
  const totalMinutes = breakdown.reduce((sum, item) => sum + item.minutes, 0);
  const trackedMinutes = effectiveTimeline.reduce((sum, row) => sum + row.durationMinutes, 0);
  const circumference = 2 * Math.PI * 42;
  let previousLength = 0;

  return (
    <div className="rounded-[30px] p-5" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <SectionLabel label="Time breakdown" action={trackedMinutes ? formatMinutes(trackedMinutes) : undefined} />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative h-[112px] w-[112px] flex-shrink-0">
          <svg viewBox="0 0 110 110" className="h-full w-full">
            <circle cx="55" cy="55" r="42" stroke="var(--color-border)" strokeWidth="12" fill="none" />
            {breakdown.map((item, index) => {
              const segmentLength = totalMinutes ? (item.minutes / totalMinutes) * circumference : 0;
              const dashoffset = circumference - previousLength;
              previousLength += segmentLength;
              return (
                <motion.circle
                  key={item.category}
                  cx="55"
                  cy="55"
                  r="42"
                  stroke={item.meta.color}
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: dashoffset }}
                  transition={{ duration: 0.55, delay: index * 0.08, ease: 'easeOut' }}
                  transform="rotate(-90 55 55)"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-semibold leading-none" style={{ color: 'var(--color-text)' }}>{formatMinutes(trackedMinutes || 0)}</p>
            <p className="mt-1 text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>tracked</p>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2 rounded-2xl px-3 py-2" style={{ backgroundColor: 'var(--color-surface)' }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
            <span className="min-w-0 flex-1 truncate text-sm" style={{ color: 'var(--color-text-muted)' }}>Places</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>{formatMinutes(placeMinutes)}</span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl px-3 py-2" style={{ backgroundColor: 'var(--color-surface)' }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#f4a261' }} />
            <span className="min-w-0 flex-1 truncate text-sm" style={{ color: 'var(--color-text-muted)' }}>Movement</span>
            <span className="text-sm font-semibold" style={{ color: '#f4a261' }}>{formatMinutes(movementMinutes)}</span>
          </div>
          {breakdown.length ? breakdown.slice(0, 5).map((item) => (
            <div key={item.category} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.meta.color }} />
              <span className="min-w-0 flex-1 truncate text-sm" style={{ color: 'var(--color-text-muted)' }}>{item.meta.label}</span>
              <span className="text-sm font-semibold" style={{ color: item.meta.color }}>{item.percent}%</span>
            </div>
          )) : (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Once visits are derived, this will show how the selected day split across home, work, social, movement, and unknown places.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineRows({
  timeline,
  googleMapsApiKey,
  onTimelineTagged,
}: {
  timeline: LocationTimelinePayload[];
  googleMapsApiKey?: string | null;
  onTimelineTagged?: () => void;
}) {
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  async function tagRow(row: LocationTimelinePayload, value: string) {
    setSavingRow(row.rowId);
    try {
      const payload = row.kind === 'visit'
        ? { category: value }
        : { movementType: value };
      await api.tagLocationTimelineRow(
        row.rowId,
        payload,
      );
      onTimelineTagged?.();
    } finally {
      setSavingRow(null);
    }
  }

  return (
    <div className="rounded-[30px] p-5" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <SectionLabel label="Your day's story" action={timeline.length ? 'Full log' : undefined} />
      <div className="space-y-3">
        {timeline.length ? timeline.map((row, index) => {
          const isMovement = row.kind === 'movement';
          const meta = isMovement ? getMovementMeta(row.movementType) : getMeta(row.category ?? 'misc');
          const Icon = meta.icon;
          return (
            <motion.div
              key={row.rowId}
              className="flex w-full gap-3 text-left"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05, ease: 'easeOut' }}
            >
              <div className="flex w-9 flex-shrink-0 flex-col items-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl" style={{ backgroundColor: meta.bg, color: meta.color }}>
                  <Icon size={16} />
                </div>
                {index < timeline.length - 1 && <div className="mt-2 w-px flex-1" style={{ minHeight: 18, backgroundColor: 'var(--color-border)' }} />}
              </div>
              <div className="min-w-0 flex-1 rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface)', border: row.isLowConfidence ? '1px solid rgba(244, 162, 97, 0.48)' : '1px solid var(--color-border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold" style={{ color: 'var(--color-text)' }}>{row.label}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: meta.color }}>{meta.label}</p>
                      {row.isLowConfidence && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ backgroundColor: 'rgba(244, 162, 97, 0.14)', color: '#f4a261' }}>
                          Unsure
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                    {formatMinutes(row.durationMinutes)}
                  </span>
                </div>
                <p className="mt-2 truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {formatTime(row.startTimestamp)} - {formatTime(row.endTimestamp)} · {isMovement ? `${Math.round(row.distanceMetres ?? 0)}m travelled` : row.highlight}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(isMovement
                    ? [
                      ['walking', 'Walk'],
                      ['travel', 'Travel'],
                    ]
                    : [
                      ['home', 'Home'],
                      ['work', 'Work'],
                      ['unknown_place', 'Unknown place'],
                    ]
                  ).map(([value, label]) => {
                    const active = isMovement
                      ? row.movementType === value || (value === 'travel' && row.movementType !== 'walking')
                      : row.category === value;
                    return (
                      <button
                        key={`${row.rowId}-${value}`}
                        type="button"
                        disabled={savingRow === row.rowId}
                        onClick={() => tagRow(row, value)}
                        className="min-h-8 rounded-full px-3 text-[11px] font-semibold transition active:scale-95 disabled:opacity-60"
                        style={{
                          backgroundColor: active ? meta.bg : 'var(--color-surface-2)',
                          border: `1px solid ${active ? meta.color : 'var(--color-border)'}`,
                          color: active ? meta.color : 'var(--color-text-muted)',
                        }}
                    >
                      {label}
                    </button>
                  );
                })}
                  <button
                    type="button"
                    onClick={() => setExpandedRowId((current) => (current === row.rowId ? null : row.rowId))}
                    className="ml-auto inline-flex min-h-8 items-center gap-1 rounded-full px-3 text-[11px] font-semibold"
                    style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
                  >
                    Map
                    <ChevronDown size={12} style={{ transform: expandedRowId === row.rowId ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                  </button>
                </div>
                {expandedRowId === row.rowId && (
                  <div className="mt-4 overflow-hidden rounded-[24px] border" style={{ borderColor: 'var(--color-border)' }}>
                    <TimelineRowMap row={row} apiKey={googleMapsApiKey ?? null} />
                  </div>
                )}
              </div>
            </motion.div>
          );
        }) : (
          <div className="rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              No derived timeline for this day yet. The same section will populate from OwnTracks/Postgres when points become places and movement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineRowMap({ row, apiKey }: { row: LocationTimelinePayload; apiKey?: string | null }) {
  const focusPoint = row.kind === 'movement'
    ? {
        latitude: row.startLatitude ?? row.endLatitude ?? row.latitude ?? 51.5074,
        longitude: row.startLongitude ?? row.endLongitude ?? row.longitude ?? -0.1278,
        label: row.label,
      }
    : {
        latitude: row.latitude ?? 51.5074,
        longitude: row.longitude ?? -0.1278,
        label: row.placeLabel ?? row.label,
      };
  const points = row.kind === 'movement' && row.startLatitude != null && row.startLongitude != null && row.endLatitude != null && row.endLongitude != null
    ? [
        { latitude: row.startLatitude, longitude: row.startLongitude },
        { latitude: row.endLatitude, longitude: row.endLongitude },
      ] as LocationPointPayload[]
    : [];

  return (
    <div className="h-56">
      <GoogleMapCanvas
        apiKey={apiKey}
        points={points}
        places={[]}
        focusPoint={focusPoint}
      />
    </div>
  );
}

function MovementSummary({ timeline }: { timeline: LocationTimelinePayload[] }) {
  const movementTotals = timeline.filter((row) => row.kind === 'movement').reduce<Record<string, number>>((acc, row) => {
    const key = ['cycling', 'transit', 'unknown_movement'].includes(String(row.movementType)) ? 'travel' : (row.movementType ?? 'travel');
    acc[key] = (acc[key] ?? 0) + row.durationMinutes;
    return acc;
  }, {});

  return (
    <div className="rounded-[30px] p-5" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <SectionLabel label="Movement summary" action="Live data" />
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {(['walking', 'travel'] as const).map((type) => {
          const meta = getMovementMeta(type);
          return (
            <div key={type} className="rounded-2xl px-3 py-2" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-[11px] font-semibold" style={{ color: meta.color }}>{meta.label}</p>
              <p className="mt-0.5 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{formatMinutes(movementTotals[type] ?? 0)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopPlaces({ places, onSelectPlace }: { places: NormalizedPlace[]; onSelectPlace?: (placeKey: string) => void }) {
  const ranked = [...places].sort((a, b) => b.totalMinutes - a.totalMinutes).slice(0, 3);
  const total = ranked.reduce((sum, place) => sum + place.totalMinutes, 0);

  return (
    <div className="rounded-[30px] p-5" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <SectionLabel label="Top places" action={ranked.length ? 'All places' : undefined} />
      <div className="overflow-hidden rounded-[24px]" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        {ranked.length ? ranked.map((place, index) => {
          const meta = getMeta(place.category);
          const Icon = meta.icon;
          const percent = total ? Math.max(6, Math.round((place.totalMinutes / total) * 100)) : 0;
          return (
            <button
              key={place.key}
              type="button"
              onClick={() => onSelectPlace?.(place.key)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
              style={{ borderBottom: index === ranked.length - 1 ? 'none' : '1px solid var(--color-border)' }}
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: meta.bg, color: meta.color }}>
                <Icon size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{place.label}</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: meta.color }} />
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold" style={{ color: meta.color }}>{formatMinutes(place.totalMinutes)}</p>
                <p className="mt-0.5 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{place.visitCount} visits</p>
              </div>
            </button>
          );
        }) : (
          <div className="p-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>No learned places yet.</div>
        )}
      </div>
    </div>
  );
}

function InsightsAndStatus({
  selectedDay,
  visits,
  places,
  points,
  rangeLabel,
  lastPointTimestamp,
}: Pick<LocationStoryIntelligenceProps, 'selectedDay' | 'visits' | 'places' | 'selectedDayPoints' | 'rangeLabel' | 'lastPointTimestamp'> & {
  points: LocationPointPayload[];
}) {
  const longestVisit = [...visits].sort((a, b) => b.dwellMinutes - a.dwellMinutes)[0];
  const outsideMinutes = selectedDay?.timeOutdoorsMinutes ?? visits.filter((visit) => visit.category !== 'home').reduce((sum, visit) => sum + visit.dwellMinutes, 0);
  const positivePlace = places.find((place) => place.tone === 'positive' && place.category !== 'home');

  const insights = [
    {
      icon: Clock3,
      title: outsideMinutes ? 'Time outside home' : 'Waiting for movement signal',
      subtitle: rangeLabel,
      value: outsideMinutes ? formatMinutes(outsideMinutes) : '0m',
      color: 'var(--color-primary)',
    },
    {
      icon: Sparkles,
      title: longestVisit ? `Longest session - ${longestVisit.placeLabel}` : 'Longest session pending',
      subtitle: longestVisit ? `${formatTime(longestVisit.startTimestamp)} - ${formatTime(longestVisit.endTimestamp)}` : 'Needs derived visits',
      value: longestVisit ? formatMinutes(longestVisit.dwellMinutes) : '-',
      color: '#f4a261',
    },
    {
      icon: MapPin,
      title: positivePlace ? 'Most regulating place' : `${places.length || visits.length} places recognised`,
      subtitle: positivePlace?.insight ?? 'Place memory is still learning',
      value: positivePlace?.label ?? String(places.length || visits.length),
      color: '#0ea5e9',
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-[30px] p-4 sm:p-5" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <SectionLabel label="Insights" />
        <div className="space-y-3">
          {insights.map((insight) => {
            const Icon = insight.icon;
            return (
              <div key={insight.title} className="flex items-center gap-3 rounded-[24px] p-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--color-surface-2)', color: insight.color }}>
                  <Icon size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{insight.title}</p>
                  <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>{insight.subtitle}</p>
                </div>
                <p className="max-w-[92px] truncate text-sm font-semibold" style={{ color: insight.color }}>{insight.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[30px] p-4 sm:p-5" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <SectionLabel label="Tracking status" />
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Location feed</p>
          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(82, 183, 136, 0.14)', color: 'var(--color-accent)' }}>
            ● {points.length ? 'Live' : 'Waiting'}
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(8, points.length * 4))}%`, backgroundColor: 'var(--color-accent)' }} />
        </div>
        <p className="mt-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {formatSince(lastPointTimestamp)} · {points.length} selected-day points · {visits.length} derived visits
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {['OwnTracks', 'Postgres', 'Place memory'].map((tag) => (
            <span key={tag} className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LocationStoryIntelligence({
  selectedDay,
  timeline,
  visits,
  places,
  selectedDayPoints,
  rangeLabel,
  lastPointTimestamp,
  googleMapsApiKey,
  onSelectPlace,
  onTimelineTagged,
}: LocationStoryIntelligenceProps) {
  return (
    <motion.section
      className="space-y-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <TimeBreakdown timeline={timeline} visits={visits} />
      <TimelineRows timeline={timeline} googleMapsApiKey={googleMapsApiKey} onTimelineTagged={onTimelineTagged} />
      <MovementSummary timeline={timeline} />
      <InsightsAndStatus
        selectedDay={selectedDay}
        visits={visits}
        places={places}
        selectedDayPoints={selectedDayPoints}
        points={selectedDayPoints}
        rangeLabel={rangeLabel}
        lastPointTimestamp={lastPointTimestamp}
      />
      <TopPlaces places={places} onSelectPlace={onSelectPlace} />
    </motion.section>
  );
}
