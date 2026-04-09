import { create } from 'zustand';
import type { DailyCheckIn } from '@/data/checkins';
import { APP_TODAY, isSameDay } from '@/lib/date';
import { api } from '@/lib/api';
import { useSettingsStore, type DataMode } from '@/store/settings';

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

export const useCheckInStore = create<CheckInState>()((set, get) => ({
  history: [],
  todayCheckIn: null,
  hydrated: false,
  hydrateFromApi: async () => {
    await get().applyDataMode(useSettingsStore.getState().dataMode);
  },
  applyDataMode: async () => {
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
      set({ history: [], todayCheckIn: null, hydrated: true });
    }
  },
  completeCheckIn: (checkIn) => {
    void api.saveCheckin(checkIn).catch(() => {});

    set((state) => {
      const nextEntry: DailyCheckIn = {
        date: APP_TODAY,
        timestamp: new Date(`${APP_TODAY}T08:00:00`).getTime(),
        ...checkIn,
      };
      const historyWithoutToday = state.history.filter((entry) => !isSameDay(entry.date, APP_TODAY));
      return {
        todayCheckIn: nextEntry,
        history: [...historyWithoutToday, nextEntry].sort((a, b) => a.timestamp - b.timestamp),
      };
    });
  },
  skipToday: () =>
    set((state) => ({
      todayCheckIn: state.todayCheckIn,
    })),
  hasCheckedInToday: () => {
    return Boolean(get().todayCheckIn);
  },
}));
