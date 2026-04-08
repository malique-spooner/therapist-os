'use client';

import { motion } from 'framer-motion';

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
  const mealsCompleted = ['breakfast', 'lunch', 'dinner'].filter((meal) => value.meals[meal as 'breakfast' | 'lunch' | 'dinner']).length;
  const dailyScore = Math.max(
    0,
    Math.min(
      100,
      mealsCompleted * 22 +
        value.foodQuality * 14 +
        (value.caffeine.lastBeforeNoon ? 10 : 0) +
        (value.alcohol.units === 0 ? 12 : value.alcohol.units <= 2 ? 6 : -8) -
        (value.meals.heavySnacking ? 10 : 0),
    ),
  );
  const guidance =
    mealsCompleted < 2
      ? 'The biggest lever today is simply getting enough structure into the day.'
      : !value.caffeine.lastBeforeNoon && value.caffeine.count > 0
        ? 'Food looks okay, but late caffeine is the easiest recovery risk on the board.'
        : value.alcohol.units >= 3
          ? 'The main cost tonight is likely to land in sleep quality rather than in the moment.'
          : value.foodQuality === 3
            ? 'This is the kind of day that usually supports steadier energy and mood.'
            : 'Small upgrades matter more than perfection here: one more proper meal or an earlier last drink is enough.';

  return (
    <div className="px-4 space-y-3 pb-4">
      <motion.div
        className="rounded-[30px] p-4 space-y-4"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(183,228,199,0.62) 0%, rgba(82,183,136,0.12) 34%, rgba(255,255,255,0) 60%), linear-gradient(180deg, color-mix(in srgb, var(--color-surface-2) 90%, white 10%) 0%, var(--color-surface-2) 100%)',
          border: '1px solid var(--color-border)',
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>{label} nutrition</p>
            <p className="text-2xl font-semibold mt-2" style={{ color: 'var(--color-text)' }}>{dailyScore}/100</p>
            <p className="text-sm mt-2 max-w-[24rem] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{guidance}</p>
          </div>
          <div className="rounded-[22px] px-3 py-3 min-w-[110px]" style={{ backgroundColor: 'rgba(255,255,255,0.62)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-muted)' }}>Meal anchors</p>
            <p className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-primary)' }}>{mealsCompleted}/3</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {value.meals.heavySnacking ? 'Snacking pressure high' : 'Snacking stable'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-[20px] px-3 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.58)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-muted)' }}>Quality</p>
            <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {value.foodQuality === 3 ? 'Whole-food leaning' : value.foodQuality === 2 ? 'Mixed day' : 'Processed-heavy'}
            </p>
          </div>
          <div className="rounded-[20px] px-3 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.58)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-muted)' }}>Caffeine</p>
            <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {value.caffeine.count} drink{value.caffeine.count === 1 ? '' : 's'}
            </p>
          </div>
          <div className="rounded-[20px] px-3 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.58)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-muted)' }}>Alcohol</p>
            <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {value.alcohol.units} unit{value.alcohol.units === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="rounded-[28px] p-4 space-y-3" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Meal structure</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Stable meal timing usually changes energy and mood faster than trying to optimize every ingredient.
        </p>
        <div className="space-y-2">
          <MealToggle label="Breakfast" active={value.meals.breakfast} onToggle={() => onToggleMeal('breakfast')} />
          <MealToggle label="Lunch" active={value.meals.lunch} onToggle={() => onToggleMeal('lunch')} />
          <MealToggle label="Dinner" active={value.meals.dinner} onToggle={() => onToggleMeal('dinner')} />
          <MealToggle label="Snacking heavily?" active={value.meals.heavySnacking} onToggle={() => onToggleMeal('heavySnacking')} />
        </div>
      </div>

      <div className="rounded-[28px] p-4 space-y-3" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Food quality</p>
        <FoodQualitySelector value={value.foodQuality} onChange={onFoodQualityChange} />
      </div>

      <div className="rounded-[28px] p-4 space-y-3" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Sleep disruptors</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          These matter less as moral judgments and more as variables that often show up in sleep, HRV, and next-day motivation.
        </p>
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
