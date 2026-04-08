'use client';

import { motion } from 'framer-motion';

import type { LocationSummaryPayload } from '@/lib/api';

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes}m`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

interface LocationSummaryProps {
  today: LocationSummaryPayload | null;
}

function getRoutineType(today: LocationSummaryPayload | null) {
  if (!today) return 'mixed';
  if (today.timeOutdoorsMinutes < 45) return 'isolated';
  if (today.newPlacesVisited >= 3 || today.commuteDetected) return 'overextended';
  if (today.timeOutdoorsMinutes >= 90 && today.socialVenueVisits > 0) return 'restorative';
  return 'mixed';
}

export function LocationSummary({ today }: LocationSummaryProps) {
  const cards = [
    {
      label: 'Outside time',
      value: formatMinutes(today?.timeOutdoorsMinutes ?? 0),
      context: 'Exposure to light, movement, and novelty',
    },
    {
      label: 'Places held',
      value: `${(today?.newPlacesVisited ?? 0) + 1}`,
      context: 'How many settings shaped the day',
    },
    {
      label: 'Social stops',
      value: `${today?.socialVenueVisits ?? 0}`,
      context: 'Places likely to carry interpersonal energy',
    },
    {
      label: 'Pattern',
      value: getRoutineType(today),
      context: today?.commuteDetected ? 'A commute-shaped day was detected' : 'No strong commute pattern showed up',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 px-4 pb-4 md:grid-cols-2">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          className="rounded-[26px] p-4"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--color-surface-2) 88%, white 12%) 0%, var(--color-surface-2) 100%)',
            border: '1px solid var(--color-border)',
          }}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ delay: 0.05 * index, duration: 0.28, ease: 'easeOut' }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>
            {card.label}
          </p>
          <p className="mt-2 text-xl font-semibold capitalize" style={{ color: 'var(--color-text)' }}>
            {card.value}
          </p>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {card.context}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
