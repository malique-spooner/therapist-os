'use client';

import { DataRing } from './DataRing';
import { getWellbeingRings } from '@/lib/domainData';
import type { Period } from '@/lib/mockDataUtils';
import type { DailyCheckIn } from '@/data/checkins';

const ringColors = ['var(--color-primary)', 'var(--color-accent)', '#F59E0B'];

export function WellbeingRings({ period, checkIns }: { period: Period; checkIns?: DailyCheckIn[] }) {
  const rings = getWellbeingRings(period, checkIns);

  return (
    <div className="px-4 pb-4">
      <div className="rounded-[28px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-start justify-around gap-2">
          {rings.map((ring, index) => (
            <DataRing key={ring.label} {...ring} color={ringColors[index]} delay={index * 0.08} />
          ))}
        </div>
      </div>
    </div>
  );
}
