'use client';

import { motion } from 'framer-motion';
import { Flame, Trophy } from 'lucide-react';
import { HabitDef } from '@/data/habits';

interface StreakCardProps {
  habits: HabitDef[];
  streaks: Record<string, { streak: number; longest: number }>;
}

export function StreakCard({ habits, streaks }: StreakCardProps) {
  const topHabits = habits.slice(0, 4).map((habit) => ({
    ...habit,
    streak: streaks[habit.id]?.streak ?? 0,
    longest: streaks[habit.id]?.longest ?? 0,
  })).sort((a, b) => b.streak - a.streak);

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Flame size={16} style={{ color: '#F59E0B' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Current Streaks</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {topHabits.map((h, i) => (
          <motion.div
            key={h.id}
            className="rounded-xl p-3"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg">{h.categoryIcon}</span>
              {h.streak >= h.longest && h.streak > 0 && (
                <Trophy size={12} style={{ color: '#F59E0B' }} />
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold" style={{ color: h.streak > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                {h.streak}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>days</span>
            </div>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>{h.name.split(' ')[0]}</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>best: {h.longest}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
