export interface InsightCard {
  id: string;
  category: string;
  categoryIcon: string;
  lens: 'CBT' | 'SDT' | 'Behaviourism';
  narrative: string;
  action: string;
}

export interface WeekInsights {
  weekOf: string; // YYYY-MM-DD of Monday
  heroHeadline: string;
  heroFramework: 'CBT' | 'SDT' | 'Behaviourism';
  cards: InsightCard[];
}

export const weeklyInsights: WeekInsights[] = [
  {
    weekOf: '2026-01-05',
    heroHeadline: "Your energy tracked your social calendar this week. The days you moved most were the days you were with people.",
    heroFramework: 'SDT',
    cards: [
      { id: 'w1-1', category: 'Movement', categoryIcon: '🏃', lens: 'SDT', narrative: "You averaged 9,200 steps on days with social events — 34% higher than solo days. The presence of others seems to activate your motivation to move. This aligns with SDT's relatedness need: connection fuels energy.", action: "Plan one social walk or outdoor activity this week." },
      { id: 'w1-2', category: 'Sleep', categoryIcon: '🌙', lens: 'CBT', narrative: "Your sleep averaged 6.1 hours Monday–Wednesday, then recovered to 7.4 hours by the weekend. The mid-week dip correlates with late screen time. The thought 'just one more episode' is a classic automatic thought pattern.", action: "Set a 10:30pm phone-down reminder three nights this week." },
      { id: 'w1-3', category: 'Spending', categoryIcon: '💷', lens: 'Behaviourism', narrative: "Tuesday and Friday both had £55+ spending days — both aligned with social evenings. The connection, enjoyment, and belonging you got from those evenings is reinforcing the accompanying spend.", action: "Identify one free social activity to try next week." },
      { id: 'w1-4', category: 'Listening', categoryIcon: '🎵', lens: 'CBT', narrative: "Your music valence dropped to 0.28 on Wednesday — your lowest of the week. Your playlist that day was heavy on minor-key, slow tempo tracks. Music both reflects and shapes mood. This midweek dip appears consistently.", action: "Build a 'Wednesday energy' playlist with higher valence tracks." },
      { id: 'w1-5', category: 'Mind', categoryIcon: '🧠', lens: 'SDT', narrative: "You completed your mood check-in 5/7 days this week. On days you completed it, your reported mood averaged 0.8 points higher than days you skipped. The act of checking in seems to prompt self-awareness that raises your baseline.", action: "Treat the check-in as the first step, not a reflection of how you already feel." },
    ],
  },
  {
    weekOf: '2026-01-12',
    heroHeadline: "A recovery week. Your body slept more, spent less, and your mood arc flipped — low Monday, strong by Friday.",
    heroFramework: 'CBT',
    cards: [
      { id: 'w2-1', category: 'Sleep', categoryIcon: '🌙', lens: 'CBT', narrative: "Average sleep this week was 7.3 hours — your best in three weeks. Sleep before midnight on 4/7 nights. The automatic thought 'I can't sleep early' is contradicted by your own data — you did it four times.", action: "Challenge that belief. Keep Tuesday and Thursday before midnight." },
      { id: 'w2-2', category: 'Finance', categoryIcon: '💷', lens: 'Behaviourism', narrative: "You stayed within your daily budget 5/7 days. On the two exceptions, both involved spontaneous social plans rather than planned ones. Unplanned social spending is the main leak pattern.", action: "Set a 'spontaneous spend' limit of £20 for unplanned outings." },
      { id: 'w2-3', category: 'Movement', categoryIcon: '🏃', lens: 'SDT', narrative: "Three workouts this week. Your step count on workout days averaged 11,400 — nearly double your rest days. Your body clearly has capacity. The bottleneck is getting started, not endurance.", action: "Reduce the workout decision to one binary: shoes on or not." },
      { id: 'w2-4', category: 'Mood', categoryIcon: '🧠', lens: 'CBT', narrative: "Your mood went 5 → 5 → 6 → 7 → 7 → 8 → 8 across the week. This isn't random. It mirrors your sleep quality with a one-day lag. Better sleep tonight means better mood tomorrow.", action: "Use tonight's sleep as a deliberate mood investment." },
    ],
  },
  {
    weekOf: '2026-01-19',
    heroHeadline: "Three gym sessions, two late nights. Your habits are building — but sleep is still the variable that controls everything else.",
    heroFramework: 'Behaviourism',
    cards: [
      { id: 'w3-1', category: 'Movement', categoryIcon: '🏃', lens: 'Behaviourism', narrative: "You went to the gym Monday, Wednesday, and Friday — a genuine 3-day streak. The reward isn't just physical. Your step count on gym days runs higher for the full 24 hours. One good choice cascades into more good choices.", action: "Protect Monday's gym session — it sets the week's tone." },
      { id: 'w3-2', category: 'Sleep', categoryIcon: '🌙', lens: 'CBT', narrative: "Late nights Thursday (1:10am) and Saturday (12:45am) disrupted what had been a stronger sleep pattern. Both nights were preceded by high social activity. The pattern isn't random — connection is worth protecting but so is recovery.", action: "Decide in advance: which social nights are worth a late one?" },
      { id: 'w3-3', category: 'HRV', categoryIcon: '❤️', lens: 'SDT', narrative: "Your HRV averaged 51ms this week, up from 44ms in week one. This isn't noise — it reflects genuine cardiovascular adaptation. Your body is responding to the consistency you've been building.", action: "Note this. Fitness gains are slower than they feel — but they're real." },
      { id: 'w3-4', category: 'Spending', categoryIcon: '💷', lens: 'Behaviourism', narrative: "Total weekly spend: £268. Down from £312 last week. The reduction came entirely from eating out (£34 vs £68). You cooked at home three evenings this week — each a small override of the social dining habit.", action: "One more home cooking evening next week." },
    ],
  },
  {
    weekOf: '2026-03-23',
    heroHeadline: "Month three looks different. Your sleep is longer, your HRV is climbing, and your budget tracked green all week.",
    heroFramework: 'SDT',
    cards: [
      { id: 'w12-1', category: 'Progress', categoryIcon: '📈', lens: 'SDT', narrative: "Your sleep-before-midnight habit has gone from 38% compliance in January to 74% this week. This is what progressive improvement looks like: slow, uneven, but directional. Your autonomy over your evenings has genuinely increased.", action: "Acknowledge this. It took ten weeks and it happened." },
      { id: 'w12-2', category: 'Finance', categoryIcon: '💷', lens: 'Behaviourism', narrative: "Budget adhered to 6/7 days this week — your best run. The single miss was Saturday (social dinner, £72 total). Crucially, you made a conscious choice rather than an automatic one. That's the shift.", action: "Keep making it a choice rather than a default." },
      { id: 'w12-3', category: 'Sleep', categoryIcon: '🌙', lens: 'CBT', narrative: "Average sleep duration this week: 7.6 hours. In January, it was 6.2. The thought 'I'm just a bad sleeper' was a prediction that your behaviour has disproved. You are a person whose sleep has improved significantly.", action: "Update your self-narrative. The data supports it." },
      { id: 'w12-4', category: 'Movement', categoryIcon: '🏃', lens: 'SDT', narrative: "Four workouts this week. Your average daily steps are 9,800 — up from 7,400 in January. Movement has become a baseline, not an achievement. That's a meaningful identity shift.", action: "Notice it doesn't feel as hard as it used to. That's progress." },
    ],
  },
];

export function getInsightsForPeriod(period: string): WeekInsights[] {
  if (period === 'this-week' || period === 'last-week') return [weeklyInsights[weeklyInsights.length - 1]];
  if (period === 'this-month' || period === 'last-month') return weeklyInsights.slice(-4);
  return weeklyInsights;
}

export function getCurrentHeroInsight(): WeekInsights {
  return weeklyInsights[weeklyInsights.length - 1];
}
