'use client';

import { motion } from 'framer-motion';

import { getSignificantPlaces } from '@/lib/domainData';
import type { Period } from '@/lib/mockDataUtils';

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes}m`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

const toneLabels = {
  positive: 'supports mood',
  neutral: 'mixed effect',
  draining: 'can be depleting',
} as const;

export function SignificantPlaces({ period }: { period: Period }) {
  const places = getSignificantPlaces(period);

  return (
    <div className="px-4 pb-4">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>Place memory</p>
        <p className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Places that keep showing up in the story</p>
      </div>
      <div className="space-y-3">
        {places.map((place, index) => (
          <motion.div
            key={place.id}
            className="rounded-[28px] p-4"
            style={{
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--color-surface-2) 88%, white 12%) 0%, var(--color-surface-2) 100%)',
              border: '1px solid var(--color-border)',
            }}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ delay: 0.06 * index, duration: 0.32, ease: 'easeOut' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{place.label}</p>
                <p className="text-xs mt-1 capitalize" style={{ color: 'var(--color-text-muted)' }}>{place.category.replace('_', ' ')}</p>
              </div>
              <span
                className="px-2 py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: place.tone === 'positive' ? 'rgba(82,183,136,0.12)' : place.tone === 'draining' ? 'rgba(231,111,81,0.12)' : 'rgba(108,117,125,0.12)',
                  color: place.tone === 'positive' ? 'var(--color-accent)' : place.tone === 'draining' ? 'var(--color-warning)' : 'var(--color-text-muted)',
                }}
              >
                {toneLabels[place.tone]}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              {place.tone === 'positive'
                ? 'This place looks regulating in the recent pattern and is worth deliberately keeping in rotation.'
                : place.tone === 'draining'
                  ? 'This place may not be bad in itself, but it is currently associated with more depletion than recovery.'
                  : 'This place appears frequently, but the effect looks mixed and probably depends on why you were there.'}
            </p>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div>
                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Visit frequency</p>
                <p className="text-sm font-semibold mt-1" style={{ color: 'var(--color-text)' }}>{place.visitCount}</p>
              </div>
              <div>
                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Avg dwell</p>
                <p className="text-sm font-semibold mt-1" style={{ color: 'var(--color-text)' }}>{formatMinutes(place.avgDwellMinutes)}</p>
              </div>
              <div>
                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Mood delta</p>
                <p className="text-sm font-semibold mt-1" style={{ color: place.moodDelta > 0 ? 'var(--color-accent)' : place.moodDelta < 0 ? 'var(--color-warning)' : 'var(--color-text)' }}>
                  {place.moodDelta > 0 ? '+' : ''}{place.moodDelta}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
