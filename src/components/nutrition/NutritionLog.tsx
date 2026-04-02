'use client';

import { MealToggle } from './MealToggle';
import { FoodQualitySelector } from './FoodQualitySelector';
import { SubstanceLogger } from './SubstanceLogger';
import { useNutritionStore } from '@/store/nutrition';

export function NutritionLog() {
  const { todayLog, toggleMeal, setFoodQuality, setCaffeineCount, setAlcoholUnits, setCaffeineTiming } = useNutritionStore();

  return (
    <div className="px-4 space-y-3 pb-4">
      <div className="rounded-[28px] p-4 space-y-3" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Today&apos;s Nutrition</p>
        <div className="space-y-2">
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Meals today</p>
          <MealToggle label="Breakfast" active={todayLog.meals.breakfast} onToggle={() => toggleMeal('breakfast')} />
          <MealToggle label="Lunch" active={todayLog.meals.lunch} onToggle={() => toggleMeal('lunch')} />
          <MealToggle label="Dinner" active={todayLog.meals.dinner} onToggle={() => toggleMeal('dinner')} />
          <MealToggle label="Snacking heavily today?" active={todayLog.meals.heavySnacking} onToggle={() => toggleMeal('heavySnacking')} />
        </div>
      </div>

      <div className="rounded-[28px] p-4 space-y-3" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>How did you eat today?</p>
        <FoodQualitySelector value={todayLog.foodQuality} onChange={setFoodQuality} />
      </div>

      <div className="rounded-[28px] p-4 space-y-3" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Caffeine &amp; Alcohol</p>
        <SubstanceLogger
          caffeineCount={todayLog.caffeine.count}
          alcoholUnits={todayLog.alcohol.units}
          lastBeforeNoon={todayLog.caffeine.lastBeforeNoon}
          onCaffeineCountChange={setCaffeineCount}
          onAlcoholChange={setAlcoholUnits}
          onTimingChange={setCaffeineTiming}
        />
      </div>
    </div>
  );
}
