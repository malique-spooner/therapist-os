'use client';

import { motion } from 'framer-motion';

interface PageIndicatorProps {
  total: number;
  current: number;
  onDotClick: (index: number) => void;
}

export function PageIndicator({ total, current, onDotClick }: PageIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {Array.from({ length: total }, (_, i) => (
        <motion.button
          key={i}
          onClick={() => onDotClick(i)}
          className="rounded-full cursor-pointer"
          style={{ backgroundColor: i === current ? 'var(--color-primary)' : 'transparent', borderWidth: 2, borderColor: i === current ? 'var(--color-primary)' : 'var(--color-border)', borderStyle: 'solid' }}
          animate={{
            width: i === current ? 20 : 8,
            height: 8,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          aria-label={`Go to page ${i + 1}`}
        />
      ))}
    </div>
  );
}
