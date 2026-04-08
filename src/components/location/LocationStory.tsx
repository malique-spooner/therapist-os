'use client';

import { motion } from 'framer-motion';

import type { LocationPointPayload, LocationSummaryPayload } from '@/lib/api';

function mapPoint(lat: number, lng: number, bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
  const x = ((lng - bounds.minLng) / Math.max(bounds.maxLng - bounds.minLng, 0.0015)) * 100;
  const y = 100 - ((lat - bounds.minLat) / Math.max(bounds.maxLat - bounds.minLat, 0.0015)) * 100;
  return {
    x: Number.isFinite(x) ? Math.min(96, Math.max(4, x)) : 50,
    y: Number.isFinite(y) ? Math.min(96, Math.max(4, y)) : 50,
  };
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes}m`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getRoutineType(today: LocationSummaryPayload | null) {
  if (!today) return 'mixed';
  if (today.timeOutdoorsMinutes < 45) return 'grounded';
  if (today.newPlacesVisited >= 3 || today.commuteDetected) return 'fragmented';
  if (today.timeOutdoorsMinutes >= 90 && today.socialVenueVisits > 0) return 'social';
  return 'steady';
}

function buildStory(today: LocationSummaryPayload | null, points: LocationPointPayload[]) {
  const routineType = getRoutineType(today);
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const middlePoint = points[Math.floor(points.length / 2)];
  const durationMinutes =
    firstPoint && lastPoint
      ? Math.max(0, Math.round((new Date(lastPoint.timestamp).getTime() - new Date(firstPoint.timestamp).getTime()) / 60000))
      : 0;

  const routeSummary =
    routineType === 'grounded'
      ? 'A quieter day with fewer transitions. This is the kind of route that can feel calming if it was intentional, or flattening if it happened by drift.'
      : routineType === 'fragmented'
        ? 'A high-switching day with multiple pivots. It reads like momentum, but it can also hide a lot of energy leakage between stops.'
        : routineType === 'social'
          ? 'A fuller day with outside time and social contact. This pattern usually supports mood best when the final stop feels regulating rather than draining.'
          : 'A fairly steady day with enough movement to create texture, without looking chaotic.';

  const chapters = [
    {
      label: 'Opening',
      time: firstPoint ? formatTime(firstPoint.timestamp) : 'No trace',
      title: firstPoint ? 'The day started moving here' : 'No location story yet',
      body: firstPoint
        ? `Your first recorded point landed around ${formatTime(firstPoint.timestamp)}. That usually matters more than total distance, because it sets the tone for the rest of the day.`
        : 'Once location data starts coming in, this page will turn into a day-by-day story rather than a blank route.',
    },
    {
      label: 'Middle',
      time: middlePoint ? formatTime(middlePoint.timestamp) : 'No trace',
      title: middlePoint ? 'This is where the day seems to settle' : 'Still waiting for a middle beat',
      body: middlePoint
        ? today?.newPlacesVisited
          ? `By the middle of the day, the pattern suggests ${today.newPlacesVisited + 1} places in rotation. That is useful context for understanding whether the day felt rich or scattered.`
          : 'The middle of the day looks stable, with relatively little switching between environments.'
        : 'A longer trace will let the app find the middle beat of the day and tell a clearer story.',
    },
    {
      label: 'Latest',
      time: lastPoint ? formatTime(lastPoint.timestamp) : 'No trace',
      title: lastPoint ? 'This is where the day currently ends' : 'No current endpoint',
      body: lastPoint
        ? `The latest recorded point is around ${formatTime(lastPoint.timestamp)}. That final environment often matters most for sleep, decompression, and how the day is remembered.`
        : 'The latest point will appear here once more location data arrives.',
    },
  ];

  const metrics = [
    {
      label: 'Story span',
      value: durationMinutes ? formatMinutes(durationMinutes) : 'Waiting',
      tone: 'var(--color-text)',
    },
    {
      label: 'Outside time',
      value: formatMinutes(today?.timeOutdoorsMinutes ?? 0),
      tone: 'var(--color-accent)',
    },
    {
      label: 'Places touched',
      value: `${(today?.newPlacesVisited ?? 0) + (today ? 1 : 0)}`,
      tone: 'var(--color-primary)',
    },
    {
      label: 'Pattern',
      value: routineType,
      tone: 'var(--color-warning)',
    },
  ];

  return { routeSummary, chapters, metrics, routineType };
}

export function LocationStory({ today, points }: { today: LocationSummaryPayload | null; points: LocationPointPayload[] }) {
  const story = buildStory(today, points);
  const bounds = {
    minLat: points.length ? Math.min(...points.map((point) => point.latitude)) : 51.501,
    maxLat: points.length ? Math.max(...points.map((point) => point.latitude)) : 51.522,
    minLng: points.length ? Math.min(...points.map((point) => point.longitude)) : -0.131,
    maxLng: points.length ? Math.max(...points.map((point) => point.longitude)) : -0.088,
  };
  const path = points
    .map((point) => {
      const mapped = mapPoint(point.latitude, point.longitude, bounds);
      return `${mapped.x},${mapped.y}`;
    })
    .join(' ');

  return (
    <div className="px-4 pb-4">
      <motion.div
        className="overflow-hidden rounded-[32px]"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(183,228,199,0.72) 0%, rgba(82,183,136,0.18) 34%, rgba(255,255,255,0) 60%), linear-gradient(180deg, color-mix(in srgb, var(--color-surface-2) 90%, white 10%) 0%, var(--color-surface-2) 100%)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 24px 48px rgba(15, 23, 42, 0.08)',
        }}
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <div className="p-5 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--color-text-muted)' }}>
                Day story
              </p>
              <h2 className="mt-2 text-[1.65rem] font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>
                Where your day actually went
              </h2>
              <p className="mt-2 max-w-[32rem] text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                {story.routeSummary}
              </p>
            </div>
            <span
              className="rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
              style={{ backgroundColor: 'rgba(255,255,255,0.72)', color: 'var(--color-text)' }}
            >
              {today?.date ?? 'No day'}
            </span>
          </div>
        </div>

        <div className="px-5 pb-5">
          <div
            className="rounded-[28px] p-4"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.48) 100%)',
              border: '1px solid rgba(255,255,255,0.7)',
            }}
          >
            <div className="grid gap-3 md:grid-cols-[1.35fr_0.95fr]">
              <div className="rounded-[24px] p-3" style={{ backgroundColor: 'rgba(255,255,255,0.54)' }}>
                <div className="flex items-center justify-between pb-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    Route pulse
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Start, midpoint, latest trace
                  </p>
                </div>
                <svg viewBox="0 0 100 100" className="h-56 w-full">
                  <defs>
                    <pattern id="location-story-grid" width="8" height="8" patternUnits="userSpaceOnUse">
                      <path d="M 8 0 L 0 0 0 8" fill="none" stroke="rgba(15,23,42,0.07)" strokeWidth="0.35" />
                    </pattern>
                    <linearGradient id="location-story-path" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--color-primary)" />
                      <stop offset="100%" stopColor="var(--color-warning)" />
                    </linearGradient>
                  </defs>
                  <rect width="100" height="100" fill="url(#location-story-grid)" rx="10" />
                  {path ? (
                    <>
                      <polyline
                        points={path}
                        fill="none"
                        stroke="url(#location-story-path)"
                        strokeWidth="2.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="160"
                        strokeDashoffset="160"
                      >
                        <animate attributeName="stroke-dashoffset" from="160" to="0" dur="1.25s" fill="freeze" />
                      </polyline>
                      {points.map((point, index) => {
                        const mapped = mapPoint(point.latitude, point.longitude, bounds);
                        const isKeyPoint =
                          index === 0 || index === points.length - 1 || index === Math.floor(points.length / 2);
                        return (
                          <g key={`${point.timestamp}-${index}`}>
                            {isKeyPoint ? (
                              <circle cx={mapped.x} cy={mapped.y} r="4.8" fill="rgba(82,183,136,0.14)">
                                <animate attributeName="r" values="3.6;4.8;3.6" dur="2.4s" repeatCount="indefinite" />
                              </circle>
                            ) : null}
                            <circle
                              cx={mapped.x}
                              cy={mapped.y}
                              r={isKeyPoint ? 2.5 : 1.7}
                              fill={index === points.length - 1 ? 'var(--color-warning)' : 'var(--color-accent)'}
                            />
                            {isKeyPoint ? (
                              <text x={mapped.x + 2.2} y={mapped.y - 2.4} fontSize="4.1" fill="var(--color-text)">
                                {index === 0 ? 'Start' : index === points.length - 1 ? 'Now' : 'Middle'}
                              </text>
                            ) : null}
                          </g>
                        );
                      })}
                    </>
                  ) : (
                    <text x="50" y="50" textAnchor="middle" fontSize="5" fill="var(--color-text-muted)">
                      Waiting for route data
                    </text>
                  )}
                </svg>
              </div>

              <div className="space-y-3">
                {story.metrics.map((metric, index) => (
                  <motion.div
                    key={metric.label}
                    className="rounded-[22px] p-4"
                    style={{ backgroundColor: 'rgba(255,255,255,0.54)' }}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 * index, duration: 0.35, ease: 'easeOut' }}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>
                      {metric.label}
                    </p>
                    <p className="mt-2 text-xl font-semibold capitalize" style={{ color: metric.tone }}>
                      {metric.value}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {story.chapters.map((chapter, index) => (
                <motion.div
                  key={chapter.label}
                  className="rounded-[24px] p-4"
                  style={{ backgroundColor: 'rgba(255,255,255,0.58)' }}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 * index, duration: 0.35, ease: 'easeOut' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>
                      {chapter.label}
                    </p>
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: 'rgba(82,183,136,0.12)', color: 'var(--color-primary)' }}>
                      {chapter.time}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    {chapter.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                    {chapter.body}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
