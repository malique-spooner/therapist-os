'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Check } from 'lucide-react';
import { TopBar } from '@/components/navigation/TopBar';
import { HabitRow } from './HabitRow';
import { StreakCard } from './StreakCard';
import { WeeklyGrid } from './WeeklyGrid';
import { ProgressRing } from './ProgressRing';
import { api } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';

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
  const dateRail = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 5 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - 2 + index);
      const isToday = index === 2;
      return {
        id: date.toISOString(),
        weekday: date.toLocaleDateString('en-GB', { weekday: 'short' }),
        day: date.toLocaleDateString('en-GB', { day: '2-digit' }),
        isToday,
      };
    });
  }, []);
  const habits = data?.habits ?? [];
  const todayCompletions = data?.todayCompletions ?? {};
  const weeklyPct = data?.weeklyCompletion ?? 0;
  const completedToday = habits.filter((habit) => {
    const val = todayCompletions[habit.id];
    if (val === undefined || val === null) return false;
    return typeof val === 'boolean' ? val : Number(val) > 0;
  }).length;
  const todayPct = habits.length ? Math.round((completedToday / habits.length) * 100) : 0;

  const habitIdentities: Record<string, string> = {
    workout: 'Someone who shows up for their body',
    'sleep-midnight': 'A rested, well-restored person',
    budget: 'Someone who spends intentionally',
    mood: 'Someone who notices how they feel',
    water: 'Someone who looks after the basics',
    social: 'A connected person',
    meditation: 'Someone who returns to calm',
  };

  const habitEnergyScores: Record<string, number> = {
    workout: 98,
    'sleep-midnight': 93,
    budget: 84,
    mood: 88,
    water: 82,
    social: 90,
    meditation: 75,
  };

  async function setCompletion(habitId: string, value: boolean | number) {
    setData((current) => current ? {
      ...current,
      todayCompletions: { ...current.todayCompletions, [habitId]: value },
      history: current.history.map((day, index, arr) =>
        day.date === new Date().toISOString().slice(0, 10)
          ? { ...day, values: { ...day.values, [habitId]: value } }
          : index === arr.length - 1 && day.date !== new Date().toISOString().slice(0, 10)
            ? day
            : day
      ),
    } : current);
    try {
      await api.saveHabitLog(habitId, value);
      await refetch();
    } catch {
      await refetch();
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'radial-gradient(circle at top right, rgba(183,228,199,0.58) 0, rgba(183,228,199,0.58) 11%, transparent 11%), linear-gradient(180deg, var(--color-surface) 0%, #F7FBF8 100%)' }}>
      <TopBar
        onBack={() => {}}
        onSettings={onSettings}
        rightElement={
          <button
            onClick={() => setShowAddSheet(true)}
            className="h-10 px-4 rounded-full flex items-center justify-center gap-2 active:scale-90 transition-transform"
            style={{ backgroundColor: '#1F1F1F', color: '#fff', boxShadow: '0 14px 28px rgba(31,31,31,0.18)' }}
          >
            <Plus size={15} color="#fff" />
            <span className="text-sm font-semibold">Habits</span>
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-3">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{dateLabel}</p>
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-end justify-between gap-3">
            <div className="flex gap-4 overflow-x-auto pb-1">
              {dateRail.map((item) => (
                <div key={item.id} className="min-w-[74px] text-center">
                  <p className="text-sm" style={{ color: item.isToday ? '#252525' : 'var(--color-text-muted)' }}>{item.weekday}</p>
                  <p className="text-[2rem] font-semibold leading-none mt-1" style={{ color: item.isToday ? '#252525' : 'rgba(37,37,37,0.62)' }}>{item.day}</p>
                  {item.isToday && <div className="h-[2px] rounded-full mt-2" style={{ backgroundColor: '#252525' }} />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="rounded-[34px] p-5" style={{ backgroundColor: 'rgba(255,255,255,0.94)', border: '1px solid rgba(27,67,50,0.08)', boxShadow: '0 26px 60px rgba(27,67,50,0.08)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Today</p>
                <p className="text-3xl font-bold mt-0.5" style={{ color: '#252525' }}>
                  {completedToday}/{habits.length || 0}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>small steps completed</p>
              </div>
              <div className="flex gap-4">
                <ProgressRing percentage={todayPct} size={76} value={`${todayPct}%`} label="Today" color="#1F1F1F" />
                <ProgressRing percentage={weeklyPct} size={76} value={`${weeklyPct}%`} label="This week" color="#F5A623" />
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Identity habits</h2>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>One vote for the kind of person you want to become</p>
          </div>
          {isLoading && (
            <div className="space-y-2">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-32 rounded-[32px] animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.85)' }} />
              ))}
            </div>
          )}
          {!isLoading && error && (
            <button onClick={() => void refetch()} className="text-sm px-4 py-6 w-full rounded-[28px] text-left" style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: 'var(--color-text-muted)', border: '1px solid rgba(27,67,50,0.08)' }}>
              Could not load data. Tap to retry.
            </button>
          )}
          {!isLoading && !error && (
            <div className="space-y-2">
              {habits.map((habit) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  value={todayCompletions[habit.id] ?? undefined}
                  identityLabel={habitIdentities[habit.id]}
                  energyScore={habitEnergyScores[habit.id]}
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
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>Consistency map</h2>
          <div className="rounded-[30px] p-4" style={{ backgroundColor: 'rgba(255,255,255,0.94)', border: '1px solid rgba(27,67,50,0.08)', boxShadow: '0 24px 50px rgba(27,67,50,0.06)' }}>
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
