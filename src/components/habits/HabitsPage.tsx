'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Check } from 'lucide-react';
import { TopBar } from '@/components/navigation/TopBar';
import { HabitRow } from './HabitRow';
import { StreakCard } from './StreakCard';
import { WeeklyGrid } from './WeeklyGrid';
import { ProgressRing } from './ProgressRing';
import { api, type HabitsOverview } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { RetryNotice } from '@/components/ui/retry-notice';

interface HabitsPageProps {
  onSettings: () => void;
}

export function HabitsPage({ onSettings }: HabitsPageProps) {
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const { data, isLoading, error, setData, refetch } = useApiQuery(api.getHabits, []);

  const dateLabel = useMemo(
    () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
    []
  );
  const habits = data?.habits ?? [];
  const todayCompletions = data?.todayCompletions ?? {};
  const weeklyPct = data?.weeklyCompletion ?? 0;
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const completedToday = habits.filter((habit) => {
    const val = todayCompletions[habit.id];
    if (val === undefined || val === null) return false;
    return typeof val === 'boolean' ? val : Number(val) > 0;
  }).length;
  const todayPct = habits.length ? Math.round((completedToday / habits.length) * 100) : 0;

  function updateHistoryDay(
    history: NonNullable<HabitsOverview['history']>,
    habitId: string,
    value: boolean | number,
  ) {
    const existing = history.find((day) => day.date === todayKey);

    if (existing) {
      return history.map((day) => (
        day.date === todayKey
          ? { ...day, values: { ...day.values, [habitId]: value } }
          : day
      ));
    }

    return [
      ...history,
      {
        date: todayKey,
        values: { [habitId]: value },
      },
    ];
  }

  async function setCompletion(habitId: string, value: boolean | number) {
    setData((current) => current ? {
      ...current,
      todayCompletions: { ...current.todayCompletions, [habitId]: value },
      history: updateHistoryDay(current.history, habitId, value),
    } : current);
    try {
      await api.saveHabitLog(habitId, value);
      await refetch();
    } catch {
      await refetch();
    }
  }

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
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Habit Tracker</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{dateLabel}</p>
        </div>

        <div className="px-4 pb-3">
          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Today</p>
                <p className="text-3xl font-bold mt-0.5" style={{ color: 'var(--color-primary)' }}>
                  {completedToday}/{habits.length || 0}
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

        <div className="px-4 pb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Today&apos;s habits</h2>
          {isLoading && (
            <div className="space-y-2">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-16 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }} />
              ))}
            </div>
          )}
          {!isLoading && error && (
            <RetryNotice
              onRetry={refetch}
              className="text-sm px-4 py-6 w-full"
            />
          )}
          {!isLoading && !error && (
            <div className="space-y-2">
              {habits.map((habit) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  value={todayCompletions[habit.id] ?? undefined}
                  onChange={(val) => void setCompletion(habit.id, val)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pb-3">
          <StreakCard habits={habits} streaks={data?.streaks ?? {}} />
        </div>

        <div className="px-4 pb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>Last 2 Weeks</h2>
          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <WeeklyGrid habits={habits} history={data?.history ?? []} />
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
