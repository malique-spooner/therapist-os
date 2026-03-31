export interface HabitDef {
  id: string;
  name: string;
  subLabel?: string;
  category: string;
  categoryIcon: string;
  type: 'boolean' | 'numeric' | 'scale';
  unit?: string;
  maxValue?: number;
  frequency: 'daily' | 'weekdays' | 'weekends';
}

export const HABITS: HabitDef[] = [
  { id: 'workout', name: 'Morning workout', subLabel: 'movement', category: 'Movement', categoryIcon: '🏃', type: 'boolean', frequency: 'daily' },
  { id: 'sleep-midnight', name: 'Sleep before midnight', subLabel: 'sleep hygiene', category: 'Sleep', categoryIcon: '🌙', type: 'boolean', frequency: 'daily' },
  { id: 'budget', name: 'Stayed within daily budget', subLabel: 'finance', category: 'Finance', categoryIcon: '💷', type: 'boolean', frequency: 'daily' },
  { id: 'mood', name: 'Mood check-in', subLabel: 'how are you feeling?', category: 'Mind', categoryIcon: '🧠', type: 'scale', maxValue: 10, frequency: 'daily' },
  { id: 'water', name: 'Water intake', subLabel: 'stay hydrated', category: 'Nutrition', categoryIcon: '💧', type: 'numeric', unit: 'litres', frequency: 'daily' },
  { id: 'social', name: 'Social interaction', subLabel: 'meaningful connection', category: 'Social', categoryIcon: '🤝', type: 'boolean', frequency: 'daily' },
  { id: 'meditation', name: 'Meditation / breathing', subLabel: 'mindfulness', category: 'Mind', categoryIcon: '🧘', type: 'boolean', frequency: 'daily' },
];

export interface HabitDay {
  date: string;
  workout: boolean;
  'sleep-midnight': boolean;
  budget: boolean;
  mood: number; // 1-10
  water: number; // litres
  social: boolean;
  meditation: boolean;
}

function seed(n: number) { const x = Math.sin(n) * 10000; return x - Math.floor(x); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

export const habitsHistory: HabitDay[] = Array.from({ length: 90 }, (_, i) => {
  const date = new Date(2026, 0, 1);
  date.setDate(date.getDate() + i);
  const dateStr = date.toISOString().split('T')[0];
  const dow = date.getDay();
  const isWeekend = dow === 0 || dow === 6;
  const progressArc = i / 89;
  const r = seed(i * 101 + 1);
  const r2 = seed(i * 103 + 2);
  const r3 = seed(i * 107 + 3);
  const r4 = seed(i * 109 + 4);
  const r5 = seed(i * 113 + 5);
  const r6 = seed(i * 127 + 6);
  const r7 = seed(i * 131 + 7);

  // Workout correlates with good mood
  const workout = r > 0.45;

  // Sleep before midnight improves over time
  const sleepMidnight = r2 > lerp(0.55, 0.3, progressArc);

  // Budget adherence improves in month 3, drops on weekends with social
  const hasSocial = r3 > (isWeekend ? 0.4 : 0.7);
  const budgetBase = lerp(0.55, 0.35, progressArc);
  const budget = isWeekend && hasSocial ? r4 > 0.65 : r4 > budgetBase;

  // Mood: dips mid-week, higher when workout done, correlates with music valence
  const midWeekDip = (dow === 2 || dow === 3) ? -0.8 : 0;
  const workoutBoost = workout ? 0.7 : 0;
  const baseMood = 6.5 + midWeekDip + workoutBoost + (r5 - 0.5) * 3;
  const mood = Math.max(3, Math.min(9, Math.round(baseMood)));

  const water = Math.round((1.5 + r6 * 1.2) * 10) / 10;
  const social = hasSocial;
  const meditation = r7 > 0.5;

  return { date: dateStr, workout, 'sleep-midnight': sleepMidnight, budget, mood, water, social, meditation };
});

export function getStreakForHabit(habitId: keyof Omit<HabitDay, 'date'>): number {
  let streak = 0;
  for (let i = habitsHistory.length - 1; i >= 0; i--) {
    const val = habitsHistory[i][habitId];
    const done = typeof val === 'boolean' ? val : (val as number) > 0;
    if (done) streak++;
    else break;
  }
  return streak;
}

export function getLongestStreak(habitId: keyof Omit<HabitDay, 'date'>): number {
  let longest = 0;
  let current = 0;
  for (const day of habitsHistory) {
    const val = day[habitId];
    const done = typeof val === 'boolean' ? val : (val as number) > 0;
    if (done) { current++; longest = Math.max(longest, current); }
    else current = 0;
  }
  return longest;
}
