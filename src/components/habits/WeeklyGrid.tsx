'use client';

import { HabitDef } from '@/data/habits';
import { motion } from 'framer-motion';
import { HabitHistoryDay } from '@/lib/api';
import { addDays } from '@/lib/date';

interface WeeklyGridProps {
  habits: HabitDef[];
  history: HabitHistoryDay[];
  weekStartDate: string;
}

const HABIT_SENTENCE_LABELS: Record<string, string> = {
  'racket-sport': 'play racket sports',
  'team-sport': 'play team sports',
  running: 'run',
  'passive-exercise': 'passive exercise',
  cad: 'practice CAD',
  'computer-science': 'study comp sci',
  audiobooks: 'audiobooks',
  'watch-episodes': 'watch episodes',
  'listen-music': 'listen music',
  facetime: 'FaceTime',
  irl: 'see people',
  post: 'post',
  cook: 'cook',
  clean: 'clean',
  journal: 'journal',
  'plan-week': 'plan week',
  'sleep-before-12': 'sleep <12',
  'wake-7am': 'wake 7am',
  'quit-snus': 'stay off snus',
  alcohol: 'stay off alcohol',
  weed: 'stay off weed',
  masturbate: 'avoid masturbating',
};

const BAD_HABIT_IDS = new Set(['quit-snus', 'smoke-limit', 'alcohol', 'weed', 'masturbate']);

function compactHabitLabel(habit: HabitDef) {
  const fromMap = HABIT_SENTENCE_LABELS[habit.id];
  if (fromMap) return fromMap;
  const sentence = habit.name.trim();
  if (sentence.startsWith('I will ')) {
    const rest = sentence.slice(7);
    const beforeBecause = rest.split(' because ')[0];
    return beforeBecause.length > 14 ? `${beforeBecause.slice(0, 14)}…` : beforeBecause;
  }
  return sentence.length > 14 ? `${sentence.slice(0, 14)}…` : sentence;
}

export function WeeklyGrid({ habits, history, weekStartDate }: WeeklyGridProps) {
  const historyByDate = new Map(history.map((day) => [day.date, day.values]));
  const visibleWeek = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStartDate, index);
    return {
      date,
      values: historyByDate.get(date) ?? {},
    };
  });

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 320 }}>
        {/* Day headers */}
        <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: '96px repeat(7, 1fr)' }}>
          <div />
          {visibleWeek.map((d, i) => {
            const date = new Date(d.date);
            const dow = ['S','M','T','W','T','F','S'][date.getDay()];
            const isToday = d.date === new Date().toISOString().slice(0, 10);
            return (
              <div key={i} className="text-center">
                <span className="text-xs font-medium" style={{ color: isToday ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                  {dow}
                </span>
                <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Habit rows */}
        {habits.map((habit) => {
          const key = habit.id;
          return (
            <div key={key} className="grid gap-1 mb-1" style={{ gridTemplateColumns: '96px repeat(7, 1fr)' }}>
              <div className="flex items-center pr-2">
                <span className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                  {habit.categoryIcon} {compactHabitLabel(habit)}
                </span>
              </div>
              {visibleWeek.map((day, i) => {
                const val = day.values[key];
                const done = typeof val === 'boolean' ? val : (val as number) > 0;
                const count = typeof val === 'number' ? val : 0;
                const isBad = BAD_HABIT_IDS.has(key);
                return (
                  <motion.div
                    key={i}
                    className="relative h-6 rounded-md"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.02 }}
                    style={{
                      backgroundColor: done ? (isBad ? 'rgba(180, 35, 24, 0.18)' : 'var(--color-accent)') : 'var(--color-surface-2)',
                      border: `1px solid ${done ? 'transparent' : 'var(--color-border)'}`,
                    }}
                    title={isBad ? `${day.date}: ${count} incidents` : `${day.date}: ${done ? '✓' : '✗'}`}
                  >
                    {isBad && count > 0 && (
                      <span
                        className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold"
                        style={{ color: '#b42318' }}
                      >
                        {count}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
