'use client';

import { motion } from 'framer-motion';

interface CheckInCompleteProps {
  onContinue: () => void;
}

export function CheckInComplete({ onContinue }: CheckInCompleteProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-4"
    >
      <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl" style={{ backgroundColor: 'var(--color-light)' }}>
        ✓
      </div>
      <div>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Baseline saved</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Your dashboard and therapist will use today&apos;s emotional baseline.
        </p>
      </div>
      <button
        onClick={onContinue}
        className="w-full h-12 rounded-2xl font-semibold"
        style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
      >
        Go to dashboard
      </button>
    </motion.div>
  );
}
