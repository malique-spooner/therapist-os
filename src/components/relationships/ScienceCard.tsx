'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const points = [
  'People with strong social connections live longer on average.',
  'Loneliness carries a mortality risk comparable to smoking heavily.',
  'Physical presence with someone trusted lowers cortisol quickly.',
  'Social isolation is one of the strongest predictors of depression relapse.',
  'Depth and presence matter more than having a huge number of contacts.',
];

export function ScienceCard() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-4 rounded-[28px] p-4 mb-6" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <button className="w-full flex items-center justify-between gap-3" onClick={() => setOpen((value) => !value)}>
        <div className="text-left">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Why relationships matter so much</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>The science behind connection, presence, and mood stability.</p>
        </div>
        <ChevronDown size={18} style={{ color: 'var(--color-text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
      </button>
      {open && (
        <div className="mt-4 space-y-2">
          {points.map((point) => (
            <p key={point} className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>• {point}</p>
          ))}
        </div>
      )}
    </div>
  );
}
