'use client';

import type { LocationPointPayload, LocationSummaryPayload } from '@/lib/api';

function mapPoint(lat: number, lng: number) {
  const minLat = 51.501;
  const maxLat = 51.522;
  const minLng = -0.131;
  const maxLng = -0.088;
  const x = ((lng - minLng) / (maxLng - minLng)) * 100;
  const y = 100 - ((lat - minLat) / (maxLat - minLat)) * 100;
  return { x, y };
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes}m`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

interface LocationHeroProps {
  today: LocationSummaryPayload | null;
  points: LocationPointPayload[];
}

function getRoutineType(today: LocationSummaryPayload | null) {
  if (!today) return 'mixed';
  if (today.timeOutdoorsMinutes < 45) return 'isolated';
  if (today.newPlacesVisited >= 3 || today.commuteDetected) return 'overextended';
  if (today.timeOutdoorsMinutes >= 90 && today.socialVenueVisits > 0) return 'restorative';
  return 'mixed';
}

export function LocationHero({ today, points }: LocationHeroProps) {
  const path = points.map((point) => {
    const mapped = mapPoint(point.latitude, point.longitude);
    return `${mapped.x},${mapped.y}`;
  }).join(' ');
  const routineType = getRoutineType(today);
  const context =
    routineType === 'isolated'
      ? 'Today reads as a low-activation day so far. Home is dominating the pattern, which usually means mood needs a gentle interruption rather than more pressure.'
      : routineType === 'overextended'
        ? 'Today is active, but also fragmented. The goal is not more movement now, it is a steadier environment before you burn through your energy.'
        : routineType === 'restorative'
          ? 'Today’s movement pattern looks restorative: enough structure, enough outside time, and not too much fragmentation.'
          : 'Today looks mixed. There is enough movement for activation, but the best next step is choosing one regulating place rather than adding noise.';

  return (
    <div className="mx-4 rounded-[28px] overflow-hidden mb-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Today&apos;s movement context</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {formatMinutes(today?.timeOutdoorsMinutes ?? 0)} outdoors · {(today?.newPlacesVisited ?? 0) + 1} places · {today?.socialVenueVisits ?? 0} social stops
            </p>
          </div>
          <span className="px-2 py-1 rounded-full text-xs font-semibold capitalize" style={{ backgroundColor: 'rgba(82,183,136,0.12)', color: 'var(--color-primary)' }}>
            {routineType}
          </span>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="rounded-[24px] p-3" style={{ background: 'linear-gradient(180deg, rgba(183,228,199,0.5) 0%, rgba(82,183,136,0.08) 100%)' }}>
          <svg viewBox="0 0 100 100" className="w-full h-40">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(33,37,41,0.08)" strokeWidth="0.3" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" rx="8" />
            <polyline points={path} fill="none" stroke="var(--color-primary)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((point, index) => {
              const mapped = mapPoint(point.latitude, point.longitude);
              return (
                <g key={`${point.timestamp}-${index}`}>
                  <circle cx={mapped.x} cy={mapped.y} r={index === 0 || index === points.length - 1 ? 2.8 : 1.8} fill={index === points.length - 1 ? 'var(--color-warning)' : 'var(--color-accent)'} />
                  {index === 0 || index === points.length - 1 || index === Math.floor(points.length / 2) ? (
                    <text x={mapped.x + 2} y={mapped.y - 2} fontSize="4.2" fill="var(--color-text)">{index === 0 ? 'Start' : index === points.length - 1 ? 'Now' : 'Mid'}</text>
                  ) : null}
                </g>
              );
            })}
          </svg>
          <p className="text-sm leading-relaxed mt-3" style={{ color: 'var(--color-text)' }}>{context}</p>
        </div>
      </div>
    </div>
  );
}
