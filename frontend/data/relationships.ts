import { financeData } from '@/data/finance';
import { APP_TODAY, differenceInDays, getDateRange, parseIsoDate } from '@/lib/date';

export interface RelationshipPerson {
  id: string;
  name: string;
  type: 'partner' | 'family' | 'close_friend' | 'friend' | 'colleague' | 'other';
  tier: 'inner' | 'middle' | 'outer';
  desiredFrequencyDays: number;
  avatarColour: string;
}

export interface RelationshipInteraction {
  id: string;
  date: string;
  timestamp: number;
  personIds: string[];
  type: 'in_person' | 'phone' | 'video' | 'message' | 'activity_together';
  presenceScore: 1 | 2 | 3 | 4 | 5;
  feelingWord?: string;
}

function seed(n: number) {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}

export const relationshipPeople: RelationshipPerson[] = [
  { id: 'alex', name: 'Alex', type: 'close_friend', tier: 'inner', desiredFrequencyDays: 7, avatarColour: '#2D6A4F' },
  { id: 'mum', name: 'Mum', type: 'family', tier: 'inner', desiredFrequencyDays: 7, avatarColour: '#40916C' },
  { id: 'jamie', name: 'Jamie', type: 'close_friend', tier: 'middle', desiredFrequencyDays: 14, avatarColour: '#52B788' },
  { id: 'priya', name: 'Priya', type: 'friend', tier: 'middle', desiredFrequencyDays: 30, avatarColour: '#74C69D' },
  { id: 'dan', name: 'Dan', type: 'colleague', tier: 'outer', desiredFrequencyDays: 30, avatarColour: '#95D5B2' },
  { id: 'sarah', name: 'Sarah', type: 'close_friend', tier: 'inner', desiredFrequencyDays: 7, avatarColour: '#1B4332' },
];

const relationshipWords = ['good', 'grounded', 'seen', 'warm', 'easy', 'supported', 'light'];
const dates = getDateRange(90);

const generatedInteractions = dates.flatMap((date, index) => {
  const spend = financeData[index];
  const r = seed(index * 31 + 7);
  const interactions: RelationshipInteraction[] = [];
  const day = parseIsoDate(date).getUTCDay();
  const isWeekend = day === 0 || day === 6;
  const higherSocialDay = spend.social > 12 || spend.eatingOut > 28;

  if ((index > 55 ? r > 0.2 : r > 0.35) || higherSocialDay) {
    const alexType = higherSocialDay || isWeekend ? 'in_person' : 'phone';
    interactions.push({
      id: `interaction-${date}-alex`,
      date,
      timestamp: parseIsoDate(date).getTime() + 18 * 3600000,
      personIds: ['alex'],
      type: alexType,
      presenceScore: alexType === 'in_person' ? 5 : 4,
      feelingWord: relationshipWords[index % relationshipWords.length],
    });
  }

  if (r > 0.52) {
    interactions.push({
      id: `interaction-${date}-mum`,
      date,
      timestamp: parseIsoDate(date).getTime() + 12 * 3600000,
      personIds: ['mum'],
      type: isWeekend ? 'phone' : 'message',
      presenceScore: isWeekend ? 4 : 3,
      feelingWord: r > 0.78 ? 'steady' : undefined,
    });
  }

  if (r > 0.67) {
    interactions.push({
      id: `interaction-${date}-jamie`,
      date,
      timestamp: parseIsoDate(date).getTime() + 19 * 3600000,
      personIds: ['jamie'],
      type: higherSocialDay ? 'activity_together' : 'message',
      presenceScore: higherSocialDay ? 4 : 2,
    });
  }

  if (r > 0.8) {
    interactions.push({
      id: `interaction-${date}-sarah`,
      date,
      timestamp: parseIsoDate(date).getTime() + 20 * 3600000,
      personIds: ['sarah'],
      type: higherSocialDay ? 'in_person' : 'video',
      presenceScore: higherSocialDay ? 5 : 3,
      feelingWord: higherSocialDay ? 'reset' : undefined,
    });
  }

  if (r > 0.88) {
    interactions.push({
      id: `interaction-${date}-priya`,
      date,
      timestamp: parseIsoDate(date).getTime() + 17 * 3600000,
      personIds: ['priya'],
      type: 'message',
      presenceScore: 2,
    });
  }

  if (r > 0.92 && day >= 1 && day <= 5) {
    interactions.push({
      id: `interaction-${date}-dan`,
      date,
      timestamp: parseIsoDate(date).getTime() + 13 * 3600000,
      personIds: ['dan'],
      type: 'video',
      presenceScore: 2,
    });
  }

  return interactions;
});

export const relationshipInteractions: RelationshipInteraction[] = generatedInteractions
  .sort((a, b) => a.timestamp - b.timestamp);

export function getRelationshipForPeriod(days: number) {
  return relationshipInteractions.filter((interaction) => differenceInDays(interaction.date, APP_TODAY) < days);
}
