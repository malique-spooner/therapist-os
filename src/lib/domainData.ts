import { type InsightCard as LegacyInsightCard } from '@/data/insights';
import { checkInHistory, type DailyCheckIn } from '@/data/checkins';
import { financeData } from '@/data/finance';
import { healthData } from '@/data/health';
import { locationData, savedPlaces, type LocationDay, type SavedPlace } from '@/data/location';
import { musicData } from '@/data/music';
import { nutritionData, scienceTips } from '@/data/nutrition';
import { relationshipInteractions, relationshipPeople } from '@/data/relationships';
import { getWeeklyHabitCompletion, type Period } from '@/lib/mockDataUtils';
import { APP_TODAY, differenceInDays, getDayLabel } from '@/lib/date';

export interface DomainSnapshot {
  id: 'physical' | 'nutrition' | 'relationships' | 'finance' | 'consumption' | 'location';
  label: string;
  icon: string;
  value: string;
  helper: string;
}

export interface HeroInsight {
  headline: string;
  framework: 'CBT' | 'SDT' | 'Behaviourism';
}

export interface ExpandedInsight extends LegacyInsightCard {
  domainId: string;
  viewLabel: string;
}

export interface LocationPlaceSummary extends SavedPlace {
  tone: 'positive' | 'neutral' | 'draining';
  moodDelta: number;
}

export interface LocationAction {
  title: string;
  reason: string;
}

export interface LocationCorrelation {
  key: 'mood' | 'relationships' | 'finance' | 'sleep';
  summary: string;
  score: number;
}

export function getPeriodDays(period: Period) {
  switch (period) {
    case 'today':
      return 1;
    case 'last-week':
    case 'this-week':
      return 7;
    case 'last-month':
    case 'this-month':
      return 31;
    default:
      return 90;
  }
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes}m`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function getLatestMood(checkIns: DailyCheckIn[] = checkInHistory) {
  return checkIns[checkIns.length - 1];
}

export function getCheckInPill(checkIns: DailyCheckIn[] = checkInHistory) {
  const latest = getLatestMood(checkIns);
  const completed = latest?.date === APP_TODAY;
  return completed
    ? { label: "Today's check-in ✓", tone: 'success' as const }
    : { label: 'Check in →', tone: 'warning' as const };
}

export function getDashboardSnapshots(): DomainSnapshot[] {
  const latestHealth = healthData[healthData.length - 1];
  const latestNutrition = nutritionData[nutritionData.length - 1];
  const latestFinance = financeData[financeData.length - 1];
  const latestMusic = musicData[musicData.length - 1];
  const latestLocation = locationData[locationData.length - 1];

  const lastMeaningful = relationshipInteractions.filter((entry) => entry.type === 'in_person' || entry.type === 'activity_together').slice(-1)[0];
  const daysAgo = lastMeaningful ? differenceInDays(lastMeaningful.date, APP_TODAY) : 0;

  return [
    { id: 'physical', label: 'Physical', icon: '⌚', value: `${latestHealth.steps.toLocaleString()} steps`, helper: `${latestHealth.sleepQuality}/10 sleep` },
    { id: 'nutrition', label: 'Nutrition', icon: '🥗', value: `${Number(latestNutrition.meals.breakfast) + Number(latestNutrition.meals.lunch) + Number(latestNutrition.meals.dinner)} of 3 meals`, helper: latestNutrition.foodQuality === 3 ? 'whole-food day' : latestNutrition.foodQuality === 2 ? 'mixed day' : 'processed-heavy' },
    { id: 'relationships', label: 'Relationships', icon: '🤝', value: `${daysAgo} days ago`, helper: 'last meaningful contact' },
    { id: 'finance', label: 'Finance', icon: '💷', value: `£${latestFinance.totalSpend}`, helper: 'today vs daily average' },
    { id: 'consumption', label: 'Consumption', icon: '🎵', value: `${Math.round(latestMusic.valence * 100)} valence`, helper: `${latestMusic.topGenre} this week` },
    { id: 'location', label: 'Location', icon: '📍', value: latestLocation.totalTimeOutMinutes ? `Outside ${formatMinutes(latestLocation.totalTimeOutMinutes)}` : 'Home-only day', helper: `${latestLocation.placesVisitedCount} places today` },
  ];
}

export function getWellbeingRings(period: Period, checkIns: DailyCheckIn[] = checkInHistory) {
  const days = getPeriodDays(period);
  const moods = checkIns.slice(-days);
  const health = healthData.slice(-days);
  const nutrition = nutritionData.slice(-days);
  const relationships = relationshipInteractions.filter((entry) => differenceInDays(entry.date, APP_TODAY) < days);
  const movement = avg(health.map((day) => Math.min(day.steps / 1200, 10)));
  const sleep = avg(health.map((day) => day.sleepQuality));
  const food = avg(nutrition.map((day) => day.foodQuality * 3.1));
  const connection = Math.min((relationships.length / Math.max(days, 1)) * 10, 10);
  const moodAvg = avg(moods.map((day) => day.emotionalState));
  const wellbeing = (movement + sleep + food + connection) / 4;
  const streak = getWeeklyHabitCompletion();

  return [
    {
      label: 'Mood Score',
      value: moodAvg.toFixed(1),
      unit: period === 'today' ? 'today' : 'recent avg',
      percentage: Math.round((moodAvg / 5) * 100),
      trend: `${moods[moods.length - 1]?.oneWord ?? 'steady'} baseline`,
      trendPositive: moodAvg >= 3.5,
    },
    {
      label: 'Wellbeing',
      value: wellbeing.toFixed(1),
      unit: 'out of 10',
      percentage: Math.round((wellbeing / 10) * 100),
      trend: sleep >= 7 ? 'recovery-led' : 'room to recover',
      trendPositive: wellbeing >= 6.8,
    },
    {
      label: 'Streak Score',
      value: `${streak}%`,
      unit: 'habit completion',
      percentage: streak,
      trend: streak >= 70 ? 'habit momentum' : 'rebuild rhythm',
      trendPositive: streak >= 70,
    },
  ];
}

export function getDashboardHeroInsight(checkIns: DailyCheckIn[] = checkInHistory): HeroInsight {
  const latestCheckIn = getLatestMood(checkIns);
  const lastMeaningful = relationshipInteractions.filter((entry) => entry.type === 'in_person' || entry.type === 'activity_together').slice(-1)[0];
  const daysAgo = lastMeaningful ? differenceInDays(lastMeaningful.date, APP_TODAY) : 0;
  const latestNutrition = nutritionData[nutritionData.length - 1];
  const withinBudgetDays = financeData.slice(-7).filter((day) => day.totalSpend < avg(financeData.map((entry) => entry.totalSpend))).length;

  if (latestCheckIn.emotionalState <= 2 && daysAgo >= 3) {
    return {
      headline: `Your mood is lower today and you have not had meaningful in-person contact for ${daysAgo} days. SDT suggests your relatedness need may be going unmet.`,
      framework: 'SDT',
    };
  }

  if (!latestNutrition.meals.breakfast) {
    return {
      headline: 'You slept well but skipped breakfast. In your data, low-nutrition mornings are followed by lower movement and flatter energy.',
      framework: 'CBT',
    };
  }

  return {
    headline: `You have stayed within budget ${withinBudgetDays} days in a row. Behaviourism would call this positive reinforcement turning into an identity-level habit.`,
    framework: 'Behaviourism',
  };
}

export function getDashboardInsights(checkIns: DailyCheckIn[] = checkInHistory): ExpandedInsight[] {
  const latestCheckIn = getLatestMood(checkIns);
  const inPersonWeek = relationshipInteractions.filter((entry) => differenceInDays(entry.date, APP_TODAY) < 7 && (entry.type === 'in_person' || entry.type === 'activity_together'));
  const breakfastMisses = nutritionData.slice(-14).filter((day) => !day.meals.breakfast).length;
  const lowValence = avg(musicData.slice(-5).map((day) => day.valence));
  const spendAverage = avg(financeData.slice(-7).map((day) => day.totalSpend));
  const todaySpend = financeData[financeData.length - 1].totalSpend;
  const latestHealth = healthData[healthData.length - 1];
  const locationCorrelation = getStrongestLocationCorrelation('this-week');

  const cards: ExpandedInsight[] = [
    {
      id: 'cross-relationships',
      category: 'Relationships',
      categoryIcon: '🤝',
      lens: 'SDT',
      narrative: `Weeks with three or more in-person interactions lift your mood by roughly 1.4 points in this mock profile. You are on ${inPersonWeek.length} this week, and the most present interactions are still your most regulating ones.`,
      action: 'Protect one real-world catch-up before the weekend.',
      domainId: 'relationships',
      viewLabel: 'View Relationships',
    },
    {
      id: 'nutrition-pattern',
      category: 'Nutrition',
      categoryIcon: '🥗',
      lens: 'CBT',
      narrative: `You skipped breakfast ${breakfastMisses} times in the last two weeks. Those days line up with lower mood and flatter energy, which is exactly the kind of hidden pattern CBT helps make visible.`,
      action: 'Choose a tiny breakfast default for low-energy mornings.',
      domainId: 'nutrition',
      viewLabel: 'View Nutrition',
    },
    {
      id: 'health-pattern',
      category: 'Physical Health',
      categoryIcon: '⌚',
      lens: 'Behaviourism',
      narrative: `Your HRV is ${latestHealth.hrv}ms today, and your movement stays higher on days that start with structure. Morning workouts still create the clearest upward cascade in the data.`,
      action: 'Treat the first active hour of the day as the keystone habit.',
      domainId: 'physical',
      viewLabel: 'View Physical Health',
    },
    {
      id: 'finance-pattern',
      category: 'Finance',
      categoryIcon: '💷',
      lens: 'Behaviourism',
      narrative: `Today’s spend is £${todaySpend} against a recent daily average of £${Math.round(spendAverage)}. Spending runs higher on social days in this dataset, but so does mood, which means the real question is alignment rather than restriction.`,
      action: 'Keep spending that supports connection intentional, not automatic.',
      domainId: 'finance',
      viewLabel: 'View Finance',
    },
    {
      id: 'consumption-pattern',
      category: 'Consumption',
      categoryIcon: '🎵',
      lens: 'CBT',
      narrative: `Your music valence is averaging ${lowValence.toFixed(2)} over the last five days, which is below baseline and tends to lead mood dips by a day or two. Consumption is acting like an early-warning signal here.`,
      action: 'Notice the shift early and add one higher-valence input on purpose.',
      domainId: 'consumption',
      viewLabel: 'View Consumption',
    },
    {
      id: 'location-pattern',
      category: 'Location',
      categoryIcon: '📍',
      lens: locationCorrelation.key === 'mood' ? 'Behaviourism' : locationCorrelation.key === 'relationships' ? 'SDT' : 'CBT',
      narrative: locationCorrelation.summary,
      action: 'Use place as a lever, not just background context.',
      domainId: 'location',
      viewLabel: 'View Location',
    },
    {
      id: 'mind-pattern',
      category: 'Mind',
      categoryIcon: '🧠',
      lens: 'SDT',
      narrative: `Today you checked in at mood ${latestCheckIn.emotionalState}/5 and energy ${latestCheckIn.energyLevel}/5. Framing that honestly gives the therapist context and gives you a clearer baseline to work from.`,
      action: 'Carry today’s check-in into a short AI reflection.',
      domainId: 'mind',
      viewLabel: 'View AI Therapist',
    },
  ];

  return cards.sort((a, b) => Number(b.id === 'cross-relationships' && latestCheckIn.emotionalState <= 2) - Number(a.id === 'cross-relationships' && latestCheckIn.emotionalState <= 2) || 0);
}

export function getTodayScienceTip() {
  return scienceTips[checkInHistory.length % scienceTips.length];
}

export function getRelationshipStatusCards() {
  return relationshipPeople
    .map((person) => {
      const last = relationshipInteractions.filter((entry) => entry.personIds.includes(person.id)).slice(-1)[0];
      const daysAgo = last ? differenceInDays(last.date, APP_TODAY) : person.desiredFrequencyDays + 1;
      return { person, last, daysAgo, overdue: daysAgo > person.desiredFrequencyDays };
    })
    .filter((entry) => entry.overdue)
    .sort((a, b) => b.daysAgo - a.daysAgo);
}

export function getGreetingLabel() {
  return getDayLabel(APP_TODAY, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function getLocationDays(period: Period) {
  return locationData.slice(-getPeriodDays(period));
}

export function getLocationToday() {
  return locationData[locationData.length - 1];
}

export function getLocationRoutineType(day: LocationDay) {
  if (day.totalTimeOutMinutes < 90 || day.placesVisitedCount <= 1) return 'isolated';
  if (day.placeTransitions >= 6 || day.noveltyScore >= 8) return 'overextended';
  if (day.routineStabilityScore >= 7 && day.noveltyScore <= 5) return 'restorative';
  return 'mixed';
}

export function getLocationSummary(period: Period) {
  const days = getLocationDays(period);
  const today = getLocationToday();
  const timeOutAvg = Math.round(avg(days.map((day) => day.totalTimeOutMinutes)));
  const diversityAvg = avg(days.map((day) => day.placesVisitedCount));
  const homeOnlyStreak = [...locationData].reverse().findIndex((day) => day.totalTimeOutMinutes > 0);
  return {
    today,
    averageTimeOut: timeOutAvg,
    averagePlaceDiversity: diversityAvg,
    currentHomeOnlyStreak: homeOnlyStreak === -1 ? locationData.length : homeOnlyStreak,
    activationState:
      timeOutAvg >= 220 ? 'activating'
      : timeOutAvg < 120 ? 'withdrawing'
      : 'steady',
  };
}

export function getLocationChartData(period: Period) {
  return getLocationDays(period).map((day, index) => ({
    label: day.date.slice(5),
    timeOutHours: Number((day.totalTimeOutMinutes / 60).toFixed(1)),
    diversity: day.placesVisitedCount,
    routineStability: day.routineStabilityScore,
    novelty: day.noveltyScore,
    mood: checkInHistory.slice(-getPeriodDays(period))[index]?.emotionalState ?? 3,
  }));
}

export function getSignificantPlaces(period: Period): LocationPlaceSummary[] {
  const periodDays = getLocationDays(period);
  return savedPlaces
    .filter((place) => place.category !== 'transit')
    .map((place) => {
      const visits = periodDays.flatMap((day) => day.visits.filter((visit) => visit.placeId === place.id));
      const moodScores = visits
        .map((visit) => {
          const dayIndex = locationData.findIndex((day) => day.date === new Date(visit.arrivalTimestamp).toISOString().split('T')[0]);
          return checkInHistory[dayIndex]?.emotionalState ?? 3;
        });
      const moodDelta = Number((avg(moodScores) - avg(checkInHistory.slice(-getPeriodDays(period)).map((day) => day.emotionalState))).toFixed(1));
      const tone: LocationPlaceSummary['tone'] = moodDelta > 0.3 ? 'positive' : moodDelta < -0.3 ? 'draining' : 'neutral';
      return {
        ...place,
        visitCount: visits.length,
        avgDwellMinutes: visits.length ? Math.round(avg(visits.map((visit) => visit.dwellMinutes))) : place.avgDwellMinutes,
        tone,
        moodDelta,
      };
    })
    .sort((a, b) => b.visitCount - a.visitCount)
    .slice(0, 5);
}

export function getLocationActivationCard(period: Period) {
  const summary = getLocationSummary(period);
  const baseline = avg(locationData.slice(-30).map((day) => day.totalTimeOutMinutes));
  if (summary.averageTimeOut >= baseline + 45) {
    return {
      title: 'Behavioral activation is present',
      narrative: `You are spending more time out of the house than your baseline for this period, and mood tends to lift when location variety increases without becoming chaotic.`,
    };
  }
  if (summary.averageTimeOut <= baseline - 45) {
    return {
      title: 'Behavioral withdrawal is creeping in',
      narrative: `Recent movement is lower than your baseline and the data shows that home-only stretches usually flatten mood and motivation after a day or two.`,
    };
  }
  return {
    title: 'Movement context is steady',
    narrative: `Your location pattern is close to baseline. The opportunity here is not dramatic change, but choosing one place or outing that predictably improves your state.`,
  };
}

export function getStrongestLocationCorrelation(period: Period): LocationCorrelation {
  const days = getLocationDays(period);
  const moodCorrelation = Math.abs(avg(days.filter((day) => day.totalTimeOutMinutes >= 180).map((day) => {
    const index = locationData.findIndex((entry) => entry.date === day.date);
    return checkInHistory[index]?.emotionalState ?? 3;
  })) - avg(days.filter((day) => day.totalTimeOutMinutes < 90).map((day) => {
    const index = locationData.findIndex((entry) => entry.date === day.date);
    return checkInHistory[index]?.emotionalState ?? 3;
  })));
  const relationshipCorrelation = Math.abs(avg(days.filter((day) => day.visits.some((visit) => visit.category === 'social')).map((day) => {
    const index = locationData.findIndex((entry) => entry.date === day.date);
    return checkInHistory[index]?.emotionalState ?? 3;
  })) - avg(days.filter((day) => !day.visits.some((visit) => visit.category === 'social')).map((day) => {
    const index = locationData.findIndex((entry) => entry.date === day.date);
    return checkInHistory[index]?.emotionalState ?? 3;
  })));
  const financeCorrelation = Math.abs(avg(days.filter((day) => day.visits.some((visit) => visit.category === 'social' || visit.category === 'cafe')).map((day) => {
    const index = locationData.findIndex((entry) => entry.date === day.date);
    return financeData[index]?.totalSpend ?? 0;
  })) - avg(days.filter((day) => !day.visits.some((visit) => visit.category === 'social' || visit.category === 'cafe')).map((day) => {
    const index = locationData.findIndex((entry) => entry.date === day.date);
    return financeData[index]?.totalSpend ?? 0;
  }))) / 10;
  const sleepCorrelation = Math.abs(avg(days.filter((day) => day.visits.some((visit) => visit.category === 'green_space' || visit.category === 'gym')).map((day) => {
    const index = locationData.findIndex((entry) => entry.date === day.date);
    return healthData[index]?.sleepQuality ?? 0;
  })) - avg(days.filter((day) => !day.visits.some((visit) => visit.category === 'green_space' || visit.category === 'gym')).map((day) => {
    const index = locationData.findIndex((entry) => entry.date === day.date);
    return healthData[index]?.sleepQuality ?? 0;
  })));

  const candidates: LocationCorrelation[] = [
    {
      key: 'mood',
      score: Number(moodCorrelation.toFixed(2)),
      summary: 'When you get out of the house for at least a few hours, mood and motivation run higher than on home-only or very low-transition days. The lift is strongest up to a point, then it plateaus.',
    },
    {
      key: 'relationships',
      score: Number(relationshipCorrelation.toFixed(2)),
      summary: 'The places where connection happens matter more than raw movement alone. Social or shared-activity locations consistently line up with better mood in this period.',
    },
    {
      key: 'finance',
      score: Number(financeCorrelation.toFixed(2)),
      summary: 'Certain places do cost more, especially social and cafe contexts, but they also tend to line up with better mood. The pattern here is about intentional trade-offs, not pure reduction.',
    },
    {
      key: 'sleep',
      score: Number(sleepCorrelation.toFixed(2)),
      summary: 'Days that include green space or movement-oriented places are followed by better recovery signals than home-only days in this window.',
    },
  ];

  return candidates.sort((a, b) => b.score - a.score)[0];
}

export function getLocationInsights(period: Period): ExpandedInsight[] {
  const days = getLocationDays(period);
  const strongest = getStrongestLocationCorrelation(period);
  const restorativePlace = getSignificantPlaces(period).find((place) => place.tone === 'positive');
  const drainingPlace = getSignificantPlaces(period).find((place) => place.tone === 'draining');
  const overextendedDays = days.filter((day) => getLocationRoutineType(day) === 'overextended').length;
  const isolatedDays = days.filter((day) => getLocationRoutineType(day) === 'isolated').length;

  const cards: ExpandedInsight[] = [
    {
      id: 'location-leading',
      category: 'Location',
      categoryIcon: '📍',
      lens: strongest.key === 'relationships' ? 'SDT' : strongest.key === 'finance' ? 'CBT' : 'Behaviourism',
      narrative: strongest.summary,
      action: 'Treat place as part of the intervention, not just the backdrop.',
      domainId: 'location',
      viewLabel: 'View Location',
    },
    {
      id: 'location-isolation',
      category: 'Location',
      categoryIcon: '🏠',
      lens: 'Behaviourism',
      narrative: `${isolatedDays} days in this window look like low-activation or home-only patterns. In this profile, repeated home-only stretches are usually followed by lower movement and flatter mood.`,
      action: 'Break the pattern with one low-friction outside block.',
      domainId: 'location',
      viewLabel: 'View Location',
    },
    {
      id: 'location-restorative',
      category: 'Location',
      categoryIcon: '🌿',
      lens: 'SDT',
      narrative: restorativePlace
        ? `${restorativePlace.label} is acting like a restorative place in the current data. Visits there line up with better mood and steadier energy than your baseline.`
        : 'A few place types, especially green space and movement-oriented settings, appear to regulate you better than staying static at home.',
      action: 'Return to the environments that reliably help rather than waiting to feel motivated first.',
      domainId: 'location',
      viewLabel: 'View Location',
    },
    {
      id: 'location-overextended',
      category: 'Location',
      categoryIcon: '🧭',
      lens: 'CBT',
      narrative: overextendedDays
        ? `${overextendedDays} days in this window were high-transition and fragmented. More movement is not always better; chaotic movement can read as activation while actually draining you.`
        : drainingPlace
          ? `${drainingPlace.label} looks more depleting than regulating in this period. The issue may be what that place demands of you rather than the place itself.`
          : 'Your better days are not the busiest ones. The useful pattern is moderate novelty with enough stability to recover.',
      action: 'Choose one intentional outing, not an overstuffed day.',
      domainId: 'location',
      viewLabel: 'View Location',
    },
  ];

  return cards;
}

export function getLocationActions(period: Period): LocationAction[] {
  const summary = getLocationSummary(period);
  const restorativePlace = getSignificantPlaces(period).find((place) => place.tone === 'positive');
  const actions: LocationAction[] = [];

  if (summary.currentHomeOnlyStreak >= 2) {
    actions.push({
      title: 'Break the home-only stretch',
      reason: 'A 15-minute outside block is enough to interrupt the withdrawal pattern in this profile.',
    });
  }

  if (restorativePlace) {
    actions.push({
      title: `Revisit ${restorativePlace.label}`,
      reason: 'That environment is one of your more reliably regulating places in the recent data.',
    });
  }

  if (summary.activationState !== 'activating') {
    actions.push({
      title: 'Work from a different place once this week',
      reason: 'Moderate novelty tends to help when routine starts flattening mood.',
    });
  }

  actions.push({
    title: 'Take a reset walk before your next low-energy block',
    reason: 'Short movement outside still looks more effective than waiting for motivation to return on its own.',
  });

  return actions.slice(0, 3);
}
