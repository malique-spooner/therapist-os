import { healthData } from '@/data/health';
import { getDateRange, parseIsoDate } from '@/lib/date';

export interface NutritionDay {
  date: string;
  meals: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
    heavySnacking: boolean;
  };
  foodQuality: 1 | 2 | 3;
  caffeine: {
    count: number;
    lastBeforeNoon: boolean;
  };
  alcohol: {
    units: number;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function seed(n: number) {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}

const dates = getDateRange(90);

export const scienceTips = [
  'Skipping breakfast raises cortisol by early afternoon, which can make anxiety feel louder than it really is.',
  'Caffeine after noon can reduce deep sleep even when you fall asleep easily.',
  'Alcohol often looks relaxing at night but fragments the second half of sleep.',
  'Whole foods support steadier blood sugar, which usually means steadier energy.',
  'Regular meals reduce the chance that stress gets misread by the body as hunger.',
  'Protein earlier in the day tends to stabilise attention and motivation.',
  'Your gut microbiome is shaped by diversity, not perfection.',
  'A small breakfast beats a perfect breakfast you never eat.',
  'Late caffeine and low HRV often travel together in real-world data.',
  'Food quality matters, but meal timing often explains mood dips more quickly.',
  'Hydration affects concentration more than most people expect.',
  'Processed food is not moral failure; it is just noisier data for mood stability.',
  'Consistent lunches are one of the easiest ways to reduce afternoon crashes.',
  'Alcohol-free evenings usually show up first in sleep quality before they show up in mood.',
];

export const nutritionData: NutritionDay[] = dates.map((date, index) => {
  const health = healthData[index];
  const nextHealth = healthData[Math.min(index + 1, healthData.length - 1)] ?? health;
  const day = parseIsoDate(date).getUTCDay();
  const isWeekend = day === 0 || day === 6;
  const r = seed(index * 29 + 3);
  const progressArc = index / 89;
  const breakfast = isWeekend ? r > 0.4 : r > 0.23;
  const lunch = r > 0.12;
  const dinner = true;
  const heavySnacking = !breakfast && r > 0.45;

  const alcoholUnitsBase = isWeekend ? (r > 0.45 ? 2 + Math.round(r * 2) : 0) : (r > 0.82 ? 1 + Math.round(r * 2) : 0);
  const alcoholUnits = clamp(alcoholUnitsBase, 0, 4);
  const caffeineCount = clamp(Math.round(1.2 + (7.1 - health.sleepDuration) + (r - 0.5) * 1.4), 0, 4);
  const lastBeforeNoon = caffeineCount === 0 ? true : r > 0.35;

  let quality = 2 + (breakfast ? 1 : 0) + (lunch ? 0.5 : -0.5) + (isWeekend ? -0.7 : 0) + progressArc * 0.75 + (r - 0.5) * 0.9;
  if (alcoholUnits >= 3) quality -= 0.5;
  if (!lastBeforeNoon) quality -= 0.25;
  if (nextHealth.sleepQuality <= 6) quality -= 0.1;

  const foodQuality = clamp(Math.round(quality), 1, 3) as 1 | 2 | 3;

  return {
    date,
    meals: {
      breakfast,
      lunch,
      dinner,
      heavySnacking,
    },
    foodQuality,
    caffeine: {
      count: caffeineCount,
      lastBeforeNoon,
    },
    alcohol: {
      units: alcoholUnits,
    },
  };
});

export function getNutritionForPeriod(days: number) {
  return nutritionData.slice(-days);
}
