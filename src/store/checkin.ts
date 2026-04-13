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
  completeCheckIn: (checkIn: Omit<DailyCheckIn, 'date' | 'timestamp'>, period?: CheckInPeriod) => void;
  skipToday: () => void;
  hasCompletedCurrentCheckIn: () => boolean;
}

export type CheckInPeriod = 'morning' | 'evening';

export function getCurrentCheckInPeriod(): CheckInPeriod {
  return new Date().getHours() < 12 ? 'morning' : 'evening';
}

function getCompletionKey(period: CheckInPeriod) {
  return `therapist-os-checkin-${APP_TODAY}-${period}`;
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
  completeCheckIn: (checkIn, period = getCurrentCheckInPeriod()) => {
    void api.saveCheckin(checkIn).catch(() => {});
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(getCompletionKey(period), '1');
    }

    set((state) => {
      const nextEntry: DailyCheckIn = {
        date: APP_TODAY,
        timestamp: new Date(`${APP_TODAY}T${period === 'morning' ? '08' : '20'}:00:00`).getTime(),
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
  hasCompletedCurrentCheckIn: () => {
    if (typeof window === 'undefined') return Boolean(get().todayCheckIn);
    return window.localStorage.getItem(getCompletionKey(getCurrentCheckInPeriod())) === '1';
  },
}));
