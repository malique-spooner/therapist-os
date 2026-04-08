'use client';

import { motion } from 'framer-motion';

import { getLocationActions } from '@/lib/domainData';
import type { Period } from '@/lib/mockDataUtils';

export function RecommendedActions({ period }: { period: Period }) {
  const actions = getLocationActions(period);

  return (
    <div className="px-4 pb-6">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>Next move</p>
        <p className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Use the story to change the next day</p>
      </div>
      <div className="space-y-3">
        {actions.map((action, index) => (
          <motion.div
            key={action.title}
            className="rounded-[26px] p-4"
            style={{
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--color-surface-2) 88%, white 12%) 0%, var(--color-surface-2) 100%)',
              border: '1px solid var(--color-border)',
            }}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.05 * index, duration: 0.28, ease: 'easeOut' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>{action.title}</p>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{action.reason}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
