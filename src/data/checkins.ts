import { healthData } from '@/data/health';
import { musicData, youtubeData } from '@/data/music';
import { relationshipInteractions } from '@/data/relationships';
import { APP_TODAY, addDays, getDateRange, parseIsoDate } from '@/lib/date';

export interface DailyCheckIn {
  date: string;
  timestamp: number;
  emotionalState: 1 | 2 | 3 | 4 | 5;
  energyLevel: 1 | 2 | 3 | 4 | 5;
  oneWord?: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function seed(n: number) {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}

const dates = getDateRange(90, addDays(APP_TODAY, -1));
const oneWordPool = ['tired', 'okay', 'hopeful', 'anxious', 'good', 'stressed', 'calm'];

function getInteractionCountForDate(date: string) {
  return relationshipInteractions.filter((interaction) => interaction.date === date).length;
}

function getRecentInPersonWindow(index: number) {
  const windowDates = dates.slice(Math.max(0, index - 6), index + 1);
  return relationshipInteractions.filter((interaction) => windowDates.includes(interaction.date) && (interaction.type === 'in_person' || interaction.type === 'activity_together')).length;
}

export const checkInHistory: DailyCheckIn[] = dates.map((date, index) => {
  const health = healthData[index];
  const music = musicData[index];
  const youtube = youtubeData[index];
  const day = parseIsoDate(date).getUTCDay();
  const isMonday = day === 1;
  const isFriday = day === 5;
  const relationshipBoost = getRecentInPersonWindow(index) >= 3 ? 0.7 : 0;
  const sameDayConnections = getInteractionCountForDate(date) > 0 ? 0.2 : -0.2;
  const entertainmentPenalty = youtube.entertainment > 2.5 ? -0.2 : 0;
  const musicLead = music.valence < 0.42 ? -0.45 : music.valence > 0.62 ? 0.35 : 0;
  const sleepEffect = (health.sleepQuality - 6.5) * 0.24;
  const recoveryBoost = health.sleepQuality >= 7 && health.steps >= 7500 ? 0.35 : 0;
  const mondayBias = isMonday ? -0.9 : 0;
  const fridayBias = isFriday ? 0.7 : 0;
  const random = (seed(index * 37 + 2) - 0.5) * 0.7;

  const mood = clamp(Math.round(3.2 + relationshipBoost + sameDayConnections + entertainmentPenalty + musicLead + sleepEffect + recoveryBoost + mondayBias + fridayBias + random), 1, 5) as 1 | 2 | 3 | 4 | 5;

  const energyBase = 3 + (health.sleepDuration - 6.8) * 0.55 + Math.min(health.steps / 12000, 1) * 0.45 + (music.valence - 0.5) * 0.8 + (seed(index * 41 + 5) - 0.5) * 0.5;
  const energyLevel = clamp(Math.round(energyBase), 1, 5) as 1 | 2 | 3 | 4 | 5;
  const oneWord = seed(index * 43 + 1) > 0.4 ? oneWordPool[(index + mood + energyLevel) % oneWordPool.length] : undefined;

  return {
    date,
    timestamp: parseIsoDate(date).getTime() + 8 * 3600000,
    emotionalState: mood,
    energyLevel,
    oneWord,
  };
});

export function getCheckInsForPeriod(days: number) {
  return checkInHistory.slice(-days);
}
