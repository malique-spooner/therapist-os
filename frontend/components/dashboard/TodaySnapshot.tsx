'use client';

import { motion } from 'framer-motion';
import { getDashboardSnapshots } from '@/lib/domainData';

interface TodaySnapshotProps {
  onSelect: (page: 'health' | 'relationships' | 'finance' | 'consumption' | 'location') => void;
}

const routeMap = {
  physical: 'health',
  relationships: 'relationships',
  finance: 'finance',
  consumption: 'consumption',
  location: 'location',
} as const;

export function TodaySnapshot({ onSelect }: TodaySnapshotProps) {
  const cards = getDashboardSnapshots();

  return (
    <div className="px-4 pb-4">
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1">
        {cards.map((card, index) => (
          <motion.button
            key={card.id}
            onClick={() => onSelect(routeMap[card.id])}
            className="snap-center flex-shrink-0 w-[138px] rounded-3xl p-4 text-left"
            style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-9 h-9 rounded-2xl flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--color-light)' }}>
                {card.icon}
              </span>
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{card.label}</span>
            </div>
            <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>{card.value}</p>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{card.helper}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
