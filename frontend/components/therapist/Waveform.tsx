'use client';


import { motion } from 'framer-motion';

interface WaveformProps {
  isActive: boolean;
  mode: 'listening' | 'speaking' | 'idle';
}

export function Waveform({ isActive, mode }: WaveformProps) {
  const bars = 28;
  const color = mode === 'listening' ? 'var(--color-warning)' : mode === 'speaking' ? 'var(--color-primary)' : 'var(--color-border)';

  return (
    <div className="flex items-center justify-center gap-0.5" style={{ height: 32 }}>
      {Array.from({ length: bars }, (_, i) => {
        return (
          <motion.div
            key={i}
            className="rounded-full"
            style={{ width: 3, backgroundColor: color }}
            animate={isActive ? {
              height: [4, Math.random() * 24 + 8, 4],
            } : {
              height: 4,
            }}
            transition={isActive ? {
              duration: 0.5 + Math.random() * 0.5,
              repeat: Infinity,
              repeatType: 'mirror',
              delay: (i / bars) * 0.3,
              ease: 'easeInOut',
            } : { duration: 0.2 }}
          />
        );
      })}
    </div>
  );
}
