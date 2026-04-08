export interface HabitDef {
  id: string;
  name: string;
  actionText?: string;
  whenText?: string;
  whyText?: string;
  habitMode?: string;
  cadenceType?: string;
  targetCount?: number;
  subLabel?: string;
  category: string;
  categoryIcon: string;
  type: 'boolean' | 'numeric' | 'scale';
  unit?: string;
  maxValue?: number;
  frequency: string;
}

export const HABITS: HabitDef[] = [
  { id: 'racket-sport', name: 'I will play racket sports three times a week because I am an athlete.', category: 'Movement', categoryIcon: '🎾', type: 'boolean', frequency: '3x per week' },
  { id: 'team-sport', name: 'I will play team sports once a week because I perform better when I compete with other people.', category: 'Movement', categoryIcon: '⚽', type: 'boolean', frequency: '1x per week' },
  { id: 'running', name: 'I will go for a run once a week because I want my body to stay sharp and capable.', category: 'Movement', categoryIcon: '🏃', type: 'boolean', frequency: '1x per week' },
  { id: 'passive-exercise', name: 'I will do passive exercise once a week because easy movement keeps my energy from collapsing.', category: 'Movement', categoryIcon: '🚲', type: 'boolean', frequency: '1x per week' },
  { id: 'cad', name: 'I will practice CAD twice a week because I want to keep building useful technical skills.', category: 'Learning', categoryIcon: '📐', type: 'boolean', frequency: '2x per week' },
  { id: 'computer-science', name: 'I will study computer science three times a week because I want to become exceptional at building things.', category: 'Learning', categoryIcon: '💻', type: 'boolean', frequency: '3x per week' },
  { id: 'read-pages', name: 'I will read 25 pages a week because I want my mind to keep compounding.', category: 'Learning', categoryIcon: '📚', type: 'numeric', unit: 'pages', frequency: '25 pages per week' },
  { id: 'audiobooks', name: 'I will listen to audiobooks during low-focus moments because I want to keep learning even when I am tired.', category: 'Learning', categoryIcon: '🎧', type: 'boolean', frequency: '6 per year' },
  { id: 'watch-episodes', name: 'I will watch a couple of episodes after my essentials are done because rest is better when it is chosen.', category: 'Media', categoryIcon: '📺', type: 'boolean', frequency: '2 per week' },
  { id: 'listen-music', name: 'I will listen to music when I need to shift my mood or focus because music helps me regulate my state.', category: 'Media', categoryIcon: '🎵', type: 'boolean', frequency: 'daily' },
  { id: 'facetime', name: 'I will FaceTime people after work or between plans because I want to keep close relationships active.', category: 'Social', categoryIcon: '📱', type: 'boolean', frequency: '5x per week' },
  { id: 'irl', name: 'I will see someone in real life once a week because real connection matters more than passive contact.', category: 'Social', categoryIcon: '🤝', type: 'boolean', frequency: '1x per week' },
  { id: 'post', name: 'I will post twice a week because I want to stay visible and expressive.', category: 'Social', categoryIcon: '🪄', type: 'boolean', frequency: '2 per week' },
  { id: 'cook', name: 'I will cook when I plan a home evening because feeding myself properly makes everything easier.', category: 'Home', categoryIcon: '🍳', type: 'boolean', frequency: 'biweekly' },
  { id: 'clean', name: 'I will clean my space every two weeks because a cleaner space makes me calmer and more capable.', category: 'Home', categoryIcon: '🧼', type: 'boolean', frequency: 'biweekly' },
  { id: 'journal', name: 'I will journal after I eat dinner because I want to record my thoughts clearly.', category: 'Mind', categoryIcon: '✍️', type: 'boolean', frequency: '1x per week' },
  { id: 'plan-week', name: 'I will plan the week on Sunday evening because I want the week to feel deliberate, not reactive.', category: 'Mind', categoryIcon: '🗓️', type: 'boolean', frequency: 'weekly' },
  { id: 'sleep-before-12', name: 'I will go to sleep before 12 because I want to live longer and recover better.', category: 'Sleep', categoryIcon: '🌙', type: 'boolean', frequency: '4x per week' },
  { id: 'wake-7am', name: 'I will wake up at 7am because I want my mornings to have structure.', category: 'Sleep', categoryIcon: '⏰', type: 'boolean', frequency: 'daily' },
  { id: 'smoke-limit', name: 'I will keep smoking under 1g a week because I do not want it quietly controlling my health.', category: 'Health', categoryIcon: '🌿', type: 'numeric', unit: 'g', frequency: '1g max per week' },
  { id: 'quit-snus', name: 'I will stay off snus because I do not want nicotine deciding my state.', category: 'Health', categoryIcon: '🚭', type: 'numeric', unit: 'pouches', frequency: 'daily' },
  { id: 'alcohol', name: 'I will stay off alcohol because I do not want it blunting my judgment and recovery.', category: 'Health', categoryIcon: '🍺', type: 'numeric', unit: 'units', frequency: 'as needed' },
  { id: 'weed', name: 'I will stay off weed because I do not want it fogging my drive and attention.', category: 'Health', categoryIcon: '🍃', type: 'numeric', unit: 'g', frequency: 'as needed' },
  { id: 'masturbate', name: 'I will avoid masturbating when I am escaping discomfort because I want my urges to feel deliberate, not automatic.', category: 'Mind', categoryIcon: '⚠️', type: 'numeric', unit: 'incidents', frequency: 'as needed' },
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
      'quit-snus': r7 > 0.7 ? 0 : r7 > 0.35 ? 1 : 2,
      alcohol: r2 > 0.78 ? 0 : isWeekend && r2 > 0.42 ? 1 : 0,
      weed: r4 > 0.72 ? 0 : r4 > 0.38 ? 1 : isWeekend && r4 > 0.24 ? 2 : 0,
      masturbate: r6 > 0.74 ? 0 : r6 > 0.38 ? 1 : 2,
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
