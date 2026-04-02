import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nutritionData, type NutritionDay } from '@/data/nutrition';
import { APP_TODAY } from '@/lib/date';
import { api } from '@/lib/api';

interface NutritionState {
  history: NutritionDay[];
  todayLog: NutritionDay;
  hydrated: boolean;
  hydrateFromApi: () => Promise<void>;
  toggleMeal: (meal: 'breakfast' | 'lunch' | 'dinner' | 'heavySnacking') => void;
  setFoodQuality: (value: 1 | 2 | 3) => void;
  setCaffeineCount: (count: number) => void;
  setCaffeineTiming: (lastBeforeNoon: boolean) => void;
  setAlcoholUnits: (units: number) => void;
}

const fallbackToday = nutritionData[nutritionData.length - 1];

export const useNutritionStore = create<NutritionState>()(
  persist(
    (set) => ({
      history: nutritionData,
      todayLog: { ...fallbackToday, date: APP_TODAY },
      hydrated: false,
      hydrateFromApi: async () => {
        const [history, todayLog] = await Promise.all([
          api.getNutrition('3-months'),
          api.getTodayNutrition(),
        ]);
        set({ history, todayLog, hydrated: true });
      },
      toggleMeal: (meal) =>
        set((state) => {
          const next = {
            ...state.todayLog,
            meals: {
              ...state.todayLog.meals,
              [meal]: !state.todayLog.meals[meal],
            },
          };
          void api.updateTodayNutrition({
            meals: next.meals,
            foodQuality: next.foodQuality,
            caffeine: next.caffeine,
            alcohol: next.alcohol,
          }).catch(() => {});
          return { todayLog: next };
        }),
      setFoodQuality: (foodQuality) =>
        set((state) => {
          const next = { ...state.todayLog, foodQuality };
          void api.updateTodayNutrition({
            meals: next.meals,
            foodQuality: next.foodQuality,
            caffeine: next.caffeine,
            alcohol: next.alcohol,
          }).catch(() => {});
          return { todayLog: next };
        }),
      setCaffeineCount: (count) =>
        set((state) => {
          const next = {
            ...state.todayLog,
            caffeine: {
              ...state.todayLog.caffeine,
              count,
              lastBeforeNoon: count === 0 ? true : state.todayLog.caffeine.lastBeforeNoon,
            },
          };
          void api.updateTodayNutrition({
            meals: next.meals,
            foodQuality: next.foodQuality,
            caffeine: next.caffeine,
            alcohol: next.alcohol,
          }).catch(() => {});
          return { todayLog: next };
        }),
      setCaffeineTiming: (lastBeforeNoon) =>
        set((state) => {
          const next = {
            ...state.todayLog,
            caffeine: {
              ...state.todayLog.caffeine,
              lastBeforeNoon,
            },
          };
          void api.updateTodayNutrition({
            meals: next.meals,
            foodQuality: next.foodQuality,
            caffeine: next.caffeine,
            alcohol: next.alcohol,
          }).catch(() => {});
          return { todayLog: next };
        }),
      setAlcoholUnits: (units) =>
        set((state) => {
          const next = {
            ...state.todayLog,
            alcohol: {
              units,
            },
          };
          void api.updateTodayNutrition({
            meals: next.meals,
            foodQuality: next.foodQuality,
            caffeine: next.caffeine,
            alcohol: next.alcohol,
          }).catch(() => {});
          return { todayLog: next };
        }),
    }),
    {
      name: 'therapist-os-nutrition',
      partialize: (state) => ({ history: state.history, todayLog: state.todayLog }),
    }
  )
);
