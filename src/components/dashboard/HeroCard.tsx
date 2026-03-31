'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { WeekInsights } from '@/data/insights';

interface HeroCardProps {
  insight: WeekInsights;
  onTalkAboutThis: (context: string) => void;
}

const frameworkColors: Record<string, string> = {
  CBT: '#5B8DEF',
  SDT: '#52B788',
  Behaviourism: '#F59E0B',
};

export function HeroCard({ insight, onTalkAboutThis }: HeroCardProps) {
  return (
    <motion.div
      className="mx-4 rounded-3xl p-5 overflow-hidden relative"
      style={{ background: 'linear-gradient(135deg, var(--color-dark) 0%, var(--color-primary) 100%)' }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10" style={{ backgroundColor: 'var(--color-light)' }} />
      <div className="absolute -bottom-6 -left-4 w-24 h-24 rounded-full opacity-10" style={{ backgroundColor: 'var(--color-light)' }} />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: frameworkColors[insight.heroFramework] + '33', color: frameworkColors[insight.heroFramework] }}
          >
            {insight.heroFramework}
          </span>
          <span className="text-xs opacity-60" style={{ color: '#fff' }}>This week&apos;s insight</span>
        </div>

        <p className="text-base font-medium leading-snug mb-4" style={{ color: '#fff' }}>
          &ldquo;{insight.heroHeadline}&rdquo;
        </p>

        <button
          onClick={() => onTalkAboutThis(insight.heroHeadline)}
          className="flex items-center gap-1.5 text-sm font-semibold active:opacity-70 transition-opacity"
          style={{ color: 'var(--color-light)' }}
        >
          Talk about this <ArrowRight size={14} strokeWidth={2} />
        </button>
      </div>
    </motion.div>
  );
}
