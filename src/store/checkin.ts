import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { checkInHistory, type DailyCheckIn } from '@/data/checkins';
import { APP_TODAY, isSameDay } from '@/lib/date';
import { api } from '@/lib/api';
import type { DataMode } from '@/store/settings';

interface CheckInState {
  history: DailyCheckIn[];
  todayCheckIn: DailyCheckIn | null;
  hydrated: boolean;
  hydrateFromApi: () => Promise<void>;
  applyDataMode: (mode: DataMode) => Promise<void>;
  completeCheckIn: (checkIn: Omit<DailyCheckIn, 'date' | 'timestamp'>) => void;
  skipToday: () => void;
  hasCheckedInToday: () => boolean;
}

function getDemoCheckIns() {
  return {
    history: checkInHistory,
    todayCheckIn: checkInHistory.find((entry) => isSameDay(entry.date, APP_TODAY)) ?? null,
  };
}

export const useCheckInStore = create<CheckInState>()(
  persist(
    (set, get) => ({
      history: checkInHistory,
      todayCheckIn: null,
      hydrated: false,
      hydrateFromApi: async () => {
        await get().applyDataMode('mixed');
      },
      applyDataMode: async (mode) => {
        if (mode === 'demo-only') {
          set({ ...getDemoCheckIns(), hydrated: true });
          return;
        }

        try {
          const [history, today] = await Promise.all([
            api.getCheckins('3-months'),
            api.getTodayCheckin(),
          ]);
          set({
            history,
            todayCheckIn: today,
            hydrated: true,
          });
        } catch {
          if (mode === 'real-only') {
            set({ history: [], todayCheckIn: null, hydrated: true });
            return;
          }
          set({ ...getDemoCheckIns(), hydrated: true });
        }
      },
      completeCheckIn: (checkIn) =>
        set((state) => {
          const nextEntry: DailyCheckIn = {
            date: APP_TODAY,
            timestamp: new Date(`${APP_TODAY}T08:00:00`).getTime(),
            ...checkIn,
          };
          void api.saveCheckin(checkIn).catch(() => {});
          const historyWithoutToday = state.history.filter((entry) => !isSameDay(entry.date, APP_TODAY));
          return {
            todayCheckIn: nextEntry,
            history: [...historyWithoutToday, nextEntry].sort((a, b) => a.timestamp - b.timestamp),
          };
        }),
      skipToday: () =>
        set((state) => ({
          todayCheckIn: state.todayCheckIn,
        })),
      hasCheckedInToday: () => {
        return Boolean(get().todayCheckIn);
      },
    }),
    {
      name: 'therapist-os-checkin',
      partialize: (state) => ({ history: state.history, todayCheckIn: state.todayCheckIn }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const todayFromHistory = state.history.find((entry) => isSameDay(entry.date, APP_TODAY)) ?? null;
        if (todayFromHistory) {
          state.todayCheckIn = todayFromHistory;
        }
      },
    }
  )
);
