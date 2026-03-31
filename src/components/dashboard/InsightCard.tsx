'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { InsightCard as InsightCardData } from '@/data/insights';

interface InsightCardProps {
  insight: InsightCardData;
  index: number;
  onTalkAboutThis: (context: string) => void;
}

const lensColors: Record<string, { bg: string; text: string }> = {
  CBT: { bg: '#EEF4FF', text: '#5B8DEF' },
  SDT: { bg: '#ECFDF5', text: '#059669' },
  Behaviourism: { bg: '#FFFBEB', text: '#D97706' },
};

export function InsightCard({ insight, index, onTalkAboutThis }: InsightCardProps) {
  const colors = lensColors[insight.lens] ?? lensColors.CBT;

  return (
    <motion.div
      className="rounded-2xl p-4"
      style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: 'easeOut' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{insight.categoryIcon}</span>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{insight.category}</span>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full ml-auto"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {insight.lens}
        </span>
      </div>

      <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-text)' }}>
        {insight.narrative}
      </p>

      <div className="pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>This week</p>
        <p className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>{insight.action}</p>
      </div>

      <button
        onClick={() => onTalkAboutThis(insight.narrative)}
        className="flex items-center gap-1 text-xs font-medium mt-3 active:opacity-70 transition-opacity"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Explore with AI <ArrowRight size={12} />
      </button>
    </motion.div>
  );
}
