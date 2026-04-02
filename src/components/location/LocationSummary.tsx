'use client';

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
    { label: 'Time out', value: formatMinutes(today?.timeOutdoorsMinutes ?? 0) },
    { label: 'Places', value: `${(today?.newPlacesVisited ?? 0) + 1}` },
    { label: 'Gym visits', value: `${today?.gymVisits ?? 0}` },
    { label: 'Routine type', value: getRoutineType(today) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 px-4 pb-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{card.label}</p>
          <p className="text-lg font-semibold mt-2 capitalize" style={{ color: 'var(--color-text)' }}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
