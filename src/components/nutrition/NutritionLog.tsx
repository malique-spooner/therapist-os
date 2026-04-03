'use client';

import { MealToggle } from './MealToggle';
import { FoodQualitySelector } from './FoodQualitySelector';
import { SubstanceLogger } from './SubstanceLogger';
import type { NutritionDay } from '@/data/nutrition';

interface NutritionLogProps {
  value: NutritionDay;
  onToggleMeal: (meal: 'breakfast' | 'lunch' | 'dinner' | 'heavySnacking') => void;
  onFoodQualityChange: (value: 1 | 2 | 3) => void;
  onCaffeineCountChange: (count: number) => void;
  onAlcoholChange: (units: number) => void;
  onTimingChange: (lastBeforeNoon: boolean) => void;
  label?: string;
}

export function NutritionLog({
  value,
  onToggleMeal,
  onFoodQualityChange,
  onCaffeineCountChange,
  onAlcoholChange,
  onTimingChange,
  label = 'Today',
}: NutritionLogProps) {

  return (
    <div className="px-4 space-y-3 pb-4">
      <div className="rounded-[28px] p-4 space-y-3" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{label}&apos;s Nutrition</p>
        <div className="space-y-2">
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Meals</p>
          <MealToggle label="Breakfast" active={value.meals.breakfast} onToggle={() => onToggleMeal('breakfast')} />
          <MealToggle label="Lunch" active={value.meals.lunch} onToggle={() => onToggleMeal('lunch')} />
          <MealToggle label="Dinner" active={value.meals.dinner} onToggle={() => onToggleMeal('dinner')} />
          <MealToggle label="Snacking heavily?" active={value.meals.heavySnacking} onToggle={() => onToggleMeal('heavySnacking')} />
        </div>
      </div>

      <div className="rounded-[28px] p-4 space-y-3" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>How did you eat?</p>
        <FoodQualitySelector value={value.foodQuality} onChange={onFoodQualityChange} />
      </div>

      <div className="rounded-[28px] p-4 space-y-3" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Caffeine &amp; Alcohol</p>
        <SubstanceLogger
          caffeineCount={value.caffeine.count}
          alcoholUnits={value.alcohol.units}
          lastBeforeNoon={value.caffeine.lastBeforeNoon}
          onCaffeineCountChange={onCaffeineCountChange}
          onAlcoholChange={onAlcoholChange}
          onTimingChange={onTimingChange}
        />
      </div>
    </div>
  );
}
