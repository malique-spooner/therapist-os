export interface HabitDef {
  id: string;
  name: string;
  subLabel?: string;
  category: string;
  categoryIcon: string;
  type: 'boolean' | 'numeric' | 'scale';
  unit?: string;
  maxValue?: number;
  frequency: string;
}

export const HABITS: HabitDef[] = [
  { id: 'racket-sport', name: 'Racket sport', subLabel: '1x per week', category: 'Movement', categoryIcon: '🎾', type: 'boolean', frequency: '1x per week' },
  { id: 'team-sport', name: 'Team sport', subLabel: '1x per week', category: 'Movement', categoryIcon: '⚽', type: 'boolean', frequency: '1x per week' },
  { id: 'running', name: 'Running', subLabel: '1x per week', category: 'Movement', categoryIcon: '🏃', type: 'boolean', frequency: '1x per week' },
  { id: 'passive-exercise', name: 'Passive exercise (cycling)', subLabel: '1x per week', category: 'Movement', categoryIcon: '🚲', type: 'boolean', frequency: '1x per week' },
  { id: 'cad', name: 'CAD', subLabel: '2x per week', category: 'Learning', categoryIcon: '📐', type: 'boolean', frequency: '2x per week' },
  { id: 'computer-science', name: 'Computer Science', subLabel: '3x per week', category: 'Learning', categoryIcon: '💻', type: 'boolean', frequency: '3x per week' },
  { id: 'read-pages', name: 'Read 25 pages', subLabel: 'per week', category: 'Learning', categoryIcon: '📚', type: 'numeric', unit: 'pages', frequency: '25 pages per week' },
  { id: 'audiobooks', name: 'Listen to 6 audiobooks', subLabel: 'per year', category: 'Learning', categoryIcon: '🎧', type: 'boolean', frequency: '6 per year' },
  { id: 'watch-episodes', name: 'Watch 2 episodes', subLabel: 'per week', category: 'Media', categoryIcon: '📺', type: 'boolean', frequency: '2 per week' },
  { id: 'listen-music', name: 'Listen to music', subLabel: 'stay connected to sound', category: 'Media', categoryIcon: '🎵', type: 'boolean', frequency: 'daily' },
  { id: 'facetime', name: 'FaceTime', subLabel: '5x per week', category: 'Social', categoryIcon: '📱', type: 'boolean', frequency: '5x per week' },
  { id: 'irl', name: 'IRL', subLabel: '1x per week', category: 'Social', categoryIcon: '🤝', type: 'boolean', frequency: '1x per week' },
  { id: 'post', name: 'Post', subLabel: '2 per week', category: 'Social', categoryIcon: '🪄', type: 'boolean', frequency: '2 per week' },
  { id: 'cook', name: 'Cook', subLabel: '1x biweekly', category: 'Home', categoryIcon: '🍳', type: 'boolean', frequency: 'biweekly' },
  { id: 'clean', name: 'Clean', subLabel: '1x biweekly', category: 'Home', categoryIcon: '🧼', type: 'boolean', frequency: 'biweekly' },
  { id: 'journal', name: 'Journal', subLabel: '1x per week', category: 'Mind', categoryIcon: '✍️', type: 'boolean', frequency: '1x per week' },
  { id: 'plan-week', name: 'Plan week ahead', subLabel: 'weekly reset', category: 'Mind', categoryIcon: '🗓️', type: 'boolean', frequency: 'weekly' },
  { id: 'sleep-before-12', name: 'Sleep before 12', subLabel: '4x per week', category: 'Sleep', categoryIcon: '🌙', type: 'boolean', frequency: '4x per week' },
  { id: 'wake-7am', name: 'Wake up at 7am', subLabel: 'morning anchor', category: 'Sleep', categoryIcon: '⏰', type: 'boolean', frequency: 'daily' },
  { id: 'smoke-limit', name: 'Smoke 1g max', subLabel: 'per week', category: 'Health', categoryIcon: '🌿', type: 'numeric', unit: 'g', frequency: '1g max per week' },
  { id: 'quit-snus', name: 'Quit Snus', subLabel: 'stay off it', category: 'Health', categoryIcon: '🚭', type: 'boolean', frequency: 'daily' },
];

export interface HabitDay {
  date: string;
  values: Record<string, boolean | number>;
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

  const hasSocial = r3 > (isWeekend ? 0.4 : 0.7);
  const readPages = Math.max(0, Math.round((r5 > 0.58 ? 8 + r6 * 18 : r6 * 5)));
  const smokeGrams = Math.round((r7 > 0.88 ? 0.3 + r2 * 0.4 : r7 > 0.7 ? 0.1 + r2 * 0.15 : 0) * 10) / 10;

  return {
    date: dateStr,
    values: {
      'racket-sport': isWeekend && r > 0.76,
      'team-sport': !isWeekend && r2 > 0.9,
      running: !isWeekend && r3 > 0.82,
      'passive-exercise': isWeekend ? r4 > 0.62 : r4 > 0.88,
      cad: !isWeekend && r5 > 0.72,
      'computer-science': !isWeekend && r6 > 0.58,
      'read-pages': readPages,
      audiobooks: r7 > 0.68,
      'watch-episodes': isWeekend ? r2 > 0.45 : r2 > 0.78,
      'listen-music': r3 > 0.22,
      facetime: r4 > (isWeekend ? 0.48 : 0.62),
      irl: hasSocial,
      post: r5 > 0.7,
      cook: (i % 14) === 3,
      clean: (i % 14) === 10,
      journal: r6 > 0.78,
      'plan-week': dow === 0,
      'sleep-before-12': r > lerp(0.62, 0.42, progressArc),
      'wake-7am': !isWeekend ? r2 > 0.35 : r2 > 0.74,
      'smoke-limit': smokeGrams,
      'quit-snus': r7 > 0.14,
    },
  };
});

export function getStreakForHabit(habitId: string): number {
  let streak = 0;
  for (let i = habitsHistory.length - 1; i >= 0; i--) {
    const val = habitsHistory[i].values[habitId];
    const done = typeof val === 'boolean' ? val : (val as number) > 0;
    if (done) streak++;
    else break;
  }
  return streak;
}

export function getLongestStreak(habitId: string): number {
  let longest = 0;
  let current = 0;
  for (const day of habitsHistory) {
    const val = day.values[habitId];
    const done = typeof val === 'boolean' ? val : (val as number) > 0;
    if (done) { current++; longest = Math.max(longest, current); }
    else current = 0;
  }
  return longest;
}
