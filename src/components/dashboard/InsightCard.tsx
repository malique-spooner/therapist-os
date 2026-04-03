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
      className="relative overflow-hidden rounded-2xl p-4"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--color-surface-2) 88%, white 12%) 0%, var(--color-surface-2) 100%)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 14px 30px rgba(15, 23, 42, 0.06)',
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -3 }}
    >
      <motion.div
        className="absolute pointer-events-none inset-x-6 top-0 h-16 rounded-b-[28px]"
        style={{ background: `linear-gradient(180deg, ${colors.bg} 0%, rgba(255,255,255,0) 100%)`, opacity: 0.9 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.9 }}
        transition={{ delay: index * 0.06 + 0.1, duration: 0.4 }}
      />
      <div className="relative flex items-center gap-2 mb-2">
        <span className="text-xl">{insight.categoryIcon}</span>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{insight.category}</span>
        <motion.span
          className="text-xs font-medium px-2 py-0.5 rounded-full ml-auto"
          style={{ backgroundColor: colors.bg, color: colors.text }}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.06 + 0.14, duration: 0.25 }}
        >
          {insight.lens}
        </motion.span>
      </div>

      <p className="relative text-sm leading-relaxed mb-3" style={{ color: 'var(--color-text)' }}>
        {insight.narrative}
      </p>

      <motion.div
        className="relative pt-3"
        style={{ borderTop: '1px solid var(--color-border)' }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06 + 0.18, duration: 0.28 }}
      >
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>This week</p>
        <p className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>{insight.action}</p>
      </motion.div>

      <motion.button
        onClick={() => onTalkAboutThis(insight.narrative)}
        className="flex items-center gap-1 text-xs font-medium mt-3 active:opacity-70 transition-opacity"
        style={{ color: 'var(--color-text-muted)' }}
        whileTap={{ scale: 0.98 }}
        whileHover={{ x: 2 }}
      >
        Explore with AI <ArrowRight size={12} />
      </motion.button>
    </motion.div>
  );
}
