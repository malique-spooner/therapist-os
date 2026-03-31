import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HabitCompletion {
  habitId: string;
  value: boolean | number; // boolean for yes/no, number for numeric/scale
  completedAt: string; // ISO date string
}

interface HabitsState {
  todayCompletions: Record<string, boolean | number>;
  setCompletion: (habitId: string, value: boolean | number) => void;
  resetToday: () => void;
}

export const useHabitsStore = create<HabitsState>()(
  persist(
    (set) => ({
      todayCompletions: {},
      setCompletion: (habitId, value) =>
        set((s) => ({ todayCompletions: { ...s.todayCompletions, [habitId]: value } })),
      resetToday: () => set({ todayCompletions: {} }),
    }),
    { name: 'therapist-os-habits-today' }
  )
);
