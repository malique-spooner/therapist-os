import { financeData } from '@/data/finance';
import { healthData } from '@/data/health';
import { getDateRange, parseIsoDate } from '@/lib/date';

export interface DayMusic {
  date: string;
  valence: number;
  hoursListened: number;
  topGenre: 'Indie' | 'Ambient' | 'Pop' | 'Electronic' | 'Soul';
  newDiscoveries: number;
}

export interface DayYouTube {
  date: string;
  totalHours: number;
  educational: number;
  entertainment: number;
  music: number;
  other: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function seed(n: number) {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}

const genres: DayMusic['topGenre'][] = ['Indie', 'Ambient', 'Pop', 'Electronic', 'Soul'];
const dates = getDateRange(90);

export const musicData: DayMusic[] = dates.map((date, index) => {
  const health = healthData[index];
  const spend = financeData[index];
  const leadSleep = healthData[Math.min(index + 1, healthData.length - 1)]?.sleepQuality ?? health.sleepQuality;
  const r = seed(index * 17 + 4);
  const baseline = 0.56 + (index / 89) * 0.05;
  const sleepLift = (leadSleep - 6.8) * 0.05;
  const weekendLift = [0, 6].includes(parseIsoDate(date).getUTCDay()) ? 0.04 : 0;
  const spendDrop = spend.entertainment > 18 ? -0.06 : 0;
  const valence = clamp(Number((baseline + sleepLift + weekendLift + spendDrop + (r - 0.5) * 0.18).toFixed(2)), 0.2, 0.86);
  const hoursListened = Number(clamp(1.2 + (1 - valence) * 2.1 + r * 1.8, 0.8, 4.9).toFixed(1));
  const newDiscoveries = Math.round(clamp((valence > 0.6 ? 2 : 1) + r * 3, 0, 5));
  const topGenre = genres[(index + Math.round(valence * 10)) % genres.length];

  return { date, valence, hoursListened, topGenre, newDiscoveries };
});

export const youtubeData: DayYouTube[] = dates.map((date, index) => {
  const music = musicData[index];
  const r = seed(index * 23 + 9);
  const entertainment = Number(clamp(0.7 + (0.55 - music.valence) * 3 + r * 1.1, 0.3, 3.8).toFixed(1));
  const educational = Number(clamp(0.6 + (music.valence - 0.45) * 1.2 + r * 0.7, 0.2, 2.2).toFixed(1));
  const musicHours = Number(clamp(0.2 + r * 0.7, 0.1, 0.9).toFixed(1));
  const other = Number(clamp(0.15 + r * 0.5, 0.1, 0.8).toFixed(1));
  const totalHours = Number((entertainment + educational + musicHours + other).toFixed(1));

  return {
    date,
    totalHours,
    educational,
    entertainment,
    music: musicHours,
    other,
  };
});

export function getMusicForPeriod(days: number) {
  return musicData.slice(-days);
}

export function getYouTubeForPeriod(days: number) {
  return youtubeData.slice(-days);
}
