'use client';

import { motion } from 'framer-motion';
import {
  Bike,
  Briefcase,
  Bus,
  Clock3,
  Dumbbell,
  Home,
  MapPin,
  Sparkles,
  TreePine,
  Users,
  type LucideIcon,
} from 'lucide-react';

import type { LocationPlaceMemoryPayload, LocationPointPayload, LocationSummaryPayload, LocationVisitPayload } from '@/lib/api';

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
  visits: LocationVisitPayload[];
  places: NormalizedPlace[];
  selectedDayPoints: LocationPointPayload[];
  rangeLabel: string;
  lastPointTimestamp: string | null;
  onSelectVisit?: (visit: LocationVisitPayload) => void;
  onSelectPlace?: (placeKey: string) => void;
}

const categoryMeta: Record<string, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  home: { label: 'Home', color: 'var(--color-primary)', bg: 'rgba(45, 106, 79, 0.12)', icon: Home },
  work: { label: 'Work', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', icon: Briefcase },
  gym: { label: 'Fitness', color: '#f4a261', bg: 'rgba(244, 162, 97, 0.14)', icon: Dumbbell },
  green_space: { label: 'Green space', color: '#52B788', bg: 'rgba(82, 183, 136, 0.14)', icon: TreePine },
  cafe: { label: 'Cafe', color: '#b7791f', bg: 'rgba(183, 121, 31, 0.12)', icon: MapPin },
  social: { label: 'Social', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.12)', icon: Users },
  errands: { label: 'Errands', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)', icon: Bike },
  transit: { label: 'Transit', color: '#f4a261', bg: 'rgba(244, 162, 97, 0.14)', icon: Bus },
  misc: { label: 'Other', color: 'var(--color-text-muted)', bg: 'var(--color-surface-2)', icon: MapPin },
};

function getMeta(category: string) {
  return categoryMeta[category] ?? categoryMeta.misc;
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

function buildPointPath(points: Array<{ latitude: number; longitude: number }>) {
  if (points.length < 2) return '';
  const sampled = points.length > 10 ? points.filter((_, index) => index % Math.ceil(points.length / 10) === 0) : points;
  const latitudes = sampled.map((point) => point.latitude);
  const longitudes = sampled.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latRange = maxLat - minLat || 0.001;
  const lngRange = maxLng - minLng || 0.001;

  return sampled
    .map((point, index) => {
      const x = 28 + ((point.longitude - minLng) / lngRange) * 279;
      const y = 132 - ((point.latitude - minLat) / latRange) * 104;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
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

function TimeBreakdown({ visits }: { visits: LocationVisitPayload[] }) {
  const breakdown = buildCategoryBreakdown(visits);
  const totalMinutes = breakdown.reduce((sum, item) => sum + item.minutes, 0);
  const circumference = 2 * Math.PI * 42;
  let previousLength = 0;

  return (
    <div className="rounded-[30px] p-5" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <SectionLabel label="Time breakdown" action={totalMinutes ? formatMinutes(totalMinutes) : undefined} />
      <div className="flex items-center gap-5">
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
            <p className="text-2xl font-semibold leading-none" style={{ color: 'var(--color-text)' }}>{formatMinutes(totalMinutes || 0)}</p>
            <p className="mt-1 text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>tracked</p>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {breakdown.length ? breakdown.slice(0, 5).map((item) => (
            <div key={item.category} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.meta.color }} />
              <span className="min-w-0 flex-1 truncate text-sm" style={{ color: 'var(--color-text-muted)' }}>{item.meta.label}</span>
              <span className="text-sm font-semibold" style={{ color: item.meta.color }}>{item.percent}%</span>
            </div>
          )) : (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Once visits are derived, this will show how the selected day split across home, transit, social, work, and restorative places.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function VisitTimeline({ visits, onSelectVisit }: { visits: LocationVisitPayload[]; onSelectVisit?: (visit: LocationVisitPayload) => void }) {
  return (
    <div className="rounded-[30px] p-5" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <SectionLabel label="Your day's story" action={visits.length ? 'Full log' : undefined} />
      <div className="space-y-3">
        {visits.length ? visits.map((visit, index) => {
          const meta = getMeta(visit.category);
          const Icon = meta.icon;
          return (
            <motion.button
              key={visit.id}
              type="button"
              onClick={() => onSelectVisit?.(visit)}
              className="flex w-full gap-3 text-left"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05, ease: 'easeOut' }}
            >
              <div className="flex w-9 flex-shrink-0 flex-col items-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl" style={{ backgroundColor: meta.bg, color: meta.color }}>
                  <Icon size={16} />
                </div>
                {index < visits.length - 1 && <div className="mt-2 w-px flex-1" style={{ minHeight: 18, backgroundColor: 'var(--color-border)' }} />}
              </div>
              <div className="min-w-0 flex-1 rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold" style={{ color: 'var(--color-text)' }}>{visit.placeLabel}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: meta.color }}>{meta.label}</p>
                  </div>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                    {formatMinutes(visit.dwellMinutes)}
                  </span>
                </div>
                <p className="mt-2 truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {formatTime(visit.startTimestamp)} - {formatTime(visit.endTimestamp)} · {visit.highlight}
                </p>
              </div>
            </motion.button>
          );
        }) : (
          <div className="rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              No derived visits for this day yet. The same section will populate from the app’s OwnTracks/Postgres pipeline when points become visits.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MovementSummary({ visits, points }: { visits: LocationVisitPayload[]; points: LocationPointPayload[] }) {
  const path = buildPointPath(points.length ? points : visits);
  const places = visits.filter((visit, index, all) => all.findIndex((entry) => entry.placeKey === visit.placeKey) === index).slice(0, 4);

  return (
    <div className="overflow-hidden rounded-[30px] p-5" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <SectionLabel label="Movement map" action="Live data" />
      <div className="h-40 overflow-hidden rounded-[26px]" style={{ backgroundColor: 'rgba(8,17,31,0.94)' }}>
        <svg viewBox="0 0 335 160" className="h-full w-full">
          {[24, 66, 108, 150, 192, 234, 276, 318].map((x) => (
            <line key={`x-${x}`} x1={x} y1="0" x2={x} y2="160" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
          ))}
          {[28, 62, 96, 130].map((y) => (
            <line key={`y-${y}`} x1="0" y1={y} x2="335" y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
          ))}
          <path d="M-8 118 C42 94 78 104 124 72 C172 38 210 62 270 34 C292 24 318 24 348 18" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="9" strokeLinecap="round" />
          <path d="M42 -10 C54 30 76 66 124 94 C174 124 230 118 308 168" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="8" strokeLinecap="round" />
          {path && <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth="2.4" strokeDasharray="7 7" strokeLinecap="round" />}
          {places.map((visit, index) => {
            const meta = getMeta(visit.category);
            const x = 50 + index * 76;
            const y = index % 2 ? 62 : 108;
            return (
              <g key={visit.placeKey}>
                <circle cx={x} cy={y} r="13" fill={meta.color} opacity="0.24" />
                <circle cx={x} cy={y} r="5" fill={meta.color} />
                <text x={x} y={y - 18} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">
                  {visit.placeLabel.slice(0, 12)}
                </text>
              </g>
            );
          })}
          <rect x="14" y="122" width="112" height="24" rx="12" fill="rgba(255,255,255,0.10)" />
          <text x="28" y="138" fill="rgba(255,255,255,0.72)" fontSize="11" fontWeight="700">
            {points.length} points today
          </text>
        </svg>
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
      <div className="rounded-[30px] p-5" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
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

      <div className="rounded-[30px] p-5" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
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
  visits,
  places,
  selectedDayPoints,
  rangeLabel,
  lastPointTimestamp,
  onSelectVisit,
  onSelectPlace,
}: LocationStoryIntelligenceProps) {
  return (
    <motion.section
      className="space-y-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <TimeBreakdown visits={visits} />
      <VisitTimeline visits={visits} onSelectVisit={onSelectVisit} />
      <MovementSummary visits={visits} points={selectedDayPoints} />
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
