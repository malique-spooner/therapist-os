'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Check } from 'lucide-react';
import { TopBar } from '@/components/navigation/TopBar';
import { HabitRow } from './HabitRow';
import { StreakCard } from './StreakCard';
import { WeeklyGrid } from './WeeklyGrid';
import { ProgressRing } from './ProgressRing';
import { HABITS } from '@/data/habits';
import { useHabitsStore } from '@/store/habits';
import { getWeeklyHabitCompletion } from '@/lib/mockDataUtils';

interface HabitsPageProps {
  onSettings: () => void;
}

const today = new Date('2026-03-31');
const dateLabel = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

export function HabitsPage({ onSettings }: HabitsPageProps) {
  const { todayCompletions, setCompletion } = useHabitsStore();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');

  const weeklyPct = getWeeklyHabitCompletion();

  // Count completions for today
  const completedToday = HABITS.filter(h => {
    const val = todayCompletions[h.id];
    if (val === undefined) return false;
    return typeof val === 'boolean' ? val : (val as number) > 0;
  }).length;
  const todayPct = Math.round((completedToday / HABITS.length) * 100);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar
        onBack={() => {}}
        onSettings={onSettings}
        rightElement={
          <button
            onClick={() => setShowAddSheet(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus size={16} color="#fff" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Habit Tracker</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{dateLabel}</p>
        </div>

        {/* Today progress + weekly ring */}
        <div className="px-4 pb-3">
          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Today</p>
                <p className="text-3xl font-bold mt-0.5" style={{ color: 'var(--color-primary)' }}>
                  {completedToday}/{HABITS.length}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>habits completed</p>
              </div>
              <div className="flex gap-4">
                <ProgressRing percentage={todayPct} size={72} value={`${todayPct}%`} label="Today" color="var(--color-primary)" />
                <ProgressRing percentage={weeklyPct} size={72} value={`${weeklyPct}%`} label="This week" color="var(--color-accent)" />
              </div>
            </div>
          </div>
        </div>

        {/* Today's habits */}
        <div className="px-4 pb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Today&apos;s habits</h2>
          <div className="space-y-2">
            {HABITS.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                value={todayCompletions[habit.id]}
                onChange={(val) => setCompletion(habit.id, val)}
              />
            ))}
          </div>
        </div>

        {/* Streak cards */}
        <div className="px-4 pb-3">
          <StreakCard />
        </div>

        {/* 2-week grid */}
        <div className="px-4 pb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>Last 2 Weeks</h2>
          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <WeeklyGrid />
          </div>
        </div>
      </div>

      {/* Add Habit Sheet */}
      <AnimatePresence>
        {showAddSheet && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddSheet(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-6"
              style={{ backgroundColor: 'var(--color-surface)', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Add New Habit</h3>
                <button onClick={() => setShowAddSheet(false)} className="p-1 rounded-full" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <X size={18} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              </div>
              <label className="text-sm font-medium block mb-2" style={{ color: 'var(--color-text)' }}>Habit name</label>
              <input
                type="text"
                placeholder="e.g. No phone before 8am"
                value={newHabitName}
                onChange={e => setNewHabitName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                autoFocus
              />
              <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
                Custom habits available in Phase 2 with full backend support.
              </p>
              <button
                className="w-full mt-4 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
                style={{ backgroundColor: newHabitName.trim() ? 'var(--color-primary)' : 'var(--color-border)', color: newHabitName.trim() ? '#fff' : 'var(--color-text-muted)' }}
                onClick={() => { if (newHabitName.trim()) { setNewHabitName(''); setShowAddSheet(false); } }}
              >
                <Check size={16} /> Add Habit
              </button>
              <div className="h-safe-bottom" style={{ height: 'env(safe-area-inset-bottom, 16px)' }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
