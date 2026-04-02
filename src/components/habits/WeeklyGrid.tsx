'use client';

import { HabitDay, HabitDef } from '@/data/habits';
import { motion } from 'framer-motion';
import { HabitHistoryDay } from '@/lib/api';

const HABIT_KEYS: (keyof Omit<HabitDay, 'date'>)[] = ['workout', 'sleep-midnight', 'budget', 'mood', 'social', 'meditation'];

interface WeeklyGridProps {
  habits: HabitDef[];
  history: HabitHistoryDay[];
}

export function WeeklyGrid({ habits, history }: WeeklyGridProps) {
  const lastTwoWeeks = history.slice(-14);

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 320 }}>
        {/* Day headers */}
        <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: '80px repeat(14, 1fr)' }}>
          <div />
          {lastTwoWeeks.map((d, i) => {
            const date = new Date(d.date);
            const dow = ['S','M','T','W','T','F','S'][date.getDay()];
            const isToday = d.date === new Date().toISOString().slice(0, 10);
            return (
              <div key={i} className="text-center">
                <span className="text-xs font-medium" style={{ color: isToday ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                  {dow}
                </span>
              </div>
            );
          })}
        </div>

        {/* Habit rows */}
        {HABIT_KEYS.map((key) => {
          const habit = habits.find(h => h.id === key);
          if (!habit) return null;
          return (
            <div key={key} className="grid gap-1 mb-1" style={{ gridTemplateColumns: '80px repeat(14, 1fr)' }}>
              <div className="flex items-center pr-2">
                <span className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                  {habit.categoryIcon} {habit.name.split(' ')[0]}
                </span>
              </div>
              {lastTwoWeeks.map((day, i) => {
                const val = day.values[key];
                const done = typeof val === 'boolean' ? val : (val as number) >= 5;
                return (
                  <motion.div
                    key={i}
                    className="h-6 rounded-md"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.02 }}
                    style={{ backgroundColor: done ? 'var(--color-accent)' : 'var(--color-surface-2)', border: `1px solid ${done ? 'transparent' : 'var(--color-border)'}` }}
                    title={`${day.date}: ${done ? '✓' : '✗'}`}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
