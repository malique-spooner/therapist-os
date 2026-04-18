'use client';

import { motion } from 'framer-motion';

import type { LocationPointPayload } from '@/lib/api';

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function projectPoints(points: LocationPointPayload[]) {
  if (!points.length) return [];
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latRange = Math.max(maxLat - minLat, 0.0015);
  const lngRange = Math.max(maxLng - minLng, 0.0015);

  return points.map((point) => {
    const x = 8 + ((point.longitude - minLng) / lngRange) * 84;
    const y = 92 - ((point.latitude - minLat) / latRange) * 84;
    return {
      ...point,
      x: Number.isFinite(x) ? x : 50,
      y: Number.isFinite(y) ? y : 50,
    };
  });
}

function summariseStops(points: LocationPointPayload[]) {
  if (!points.length) return [];
  const stops: Array<{ label: string; time: string; detail: string }> = [];
  const keyIndexes = Array.from(new Set([0, Math.floor(points.length / 2), points.length - 1])).sort((a, b) => a - b);
  keyIndexes.forEach((index, position) => {
    const point = points[index];
    if (!point) return;
    stops.push({
      label: position === 0 ? 'Start' : position === keyIndexes.length - 1 ? 'Latest' : 'Middle',
      time: formatTime(point.timestamp),
      detail: `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`,
    });
  });
  return stops;
}

export function LocationMapCard({ points }: { points: LocationPointPayload[] }) {
  const projected = projectPoints(points);
  const path = projected.map((point) => `${point.x},${point.y}`).join(' ');
  const stops = summariseStops(points);

  return (
    <div className="px-4 pb-4">
      <motion.div
        className="rounded-[32px] p-5"
        style={{
          backgroundColor: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
        }}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
              Trace map
            </p>
            <p className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              The actual route for this day or range
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              This map is drawn directly from your saved coordinates, so it still works even when the higher-level story summary is sparse.
            </p>
          </div>
          <span className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: 'rgba(82,183,136,0.12)', color: 'var(--color-primary)' }}>
            {points.length} pings
          </span>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_0.95fr]">
          <div
            className="rounded-[28px] p-3"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.5) 100%)',
              border: '1px solid rgba(255,255,255,0.85)',
            }}
          >
            <svg viewBox="0 0 100 100" className="h-72 w-full">
              <defs>
                <pattern id="location-map-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(15,23,42,0.06)" strokeWidth="0.35" />
                </pattern>
                <linearGradient id="location-map-path" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--color-primary)" />
                  <stop offset="100%" stopColor="var(--color-warning)" />
                </linearGradient>
              </defs>
              <rect x="1" y="1" width="98" height="98" rx="9" fill="url(#location-map-grid)" stroke="rgba(15,23,42,0.06)" />
              {path ? (
                <>
                  <polyline
                    points={path}
                    fill="none"
                    stroke="url(#location-map-path)"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {projected.map((point, index) => {
                    const isStart = index === 0;
                    const isEnd = index === projected.length - 1;
                    return (
                      <g key={`${point.timestamp}-${index}`}>
                        {(isStart || isEnd) && (
                          <circle cx={point.x} cy={point.y} r="4.8" fill={isStart ? 'rgba(82,183,136,0.16)' : 'rgba(231,111,81,0.16)'} />
                        )}
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={isStart || isEnd ? 2.6 : 1.7}
                          fill={isEnd ? 'var(--color-warning)' : isStart ? 'var(--color-primary)' : 'var(--color-accent)'}
                        />
                        {(isStart || isEnd) && (
                          <text x={point.x + 2.4} y={point.y - 2.4} fontSize="4" fill="var(--color-text)">
                            {isStart ? 'Start' : 'Latest'}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </>
              ) : (
                <text x="50" y="50" textAnchor="middle" fontSize="5" fill="var(--color-text-muted)">
                  Waiting for map data
                </text>
              )}
            </svg>
          </div>

          <div className="space-y-3">
            {stops.length ? (
              stops.map((stop) => (
                <div
                  key={`${stop.label}-${stop.time}`}
                  className="rounded-[24px] p-4"
                  style={{ backgroundColor: 'rgba(255,255,255,0.62)' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>
                      {stop.label}
                    </p>
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: 'rgba(82,183,136,0.12)', color: 'var(--color-primary)' }}>
                      {stop.time}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {stop.detail}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] p-4" style={{ backgroundColor: 'rgba(255,255,255,0.62)' }}>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  No location points have been recorded in this range yet, so there’s nothing meaningful to map.
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
