export interface DayMusic {
  date: string;
  listeningHours: number;
  valence: number; // 0-1, mood of music
  newDiscoveries: number;
  topGenre: string;
}

function seed(n: number) { const x = Math.sin(n) * 10000; return x - Math.floor(x); }

const genres = ['indie', 'hip-hop', 'electronic', 'pop', 'r&b', 'classical', 'jazz'];

export const musicData: DayMusic[] = Array.from({ length: 90 }, (_, i) => {
  const date = new Date(2026, 0, 1);
  date.setDate(date.getDate() + i);
  const dateStr = date.toISOString().split('T')[0];
  const dow = date.getDay();
  const r = seed(i * 67 + 1);
  const r2 = seed(i * 71 + 2);
  const r3 = seed(i * 73 + 3);
  const r4 = seed(i * 79 + 4);

  // Valence correlates with day of week (lower mid-week, higher Fri/Sat)
  const dayMoodOffset = dow === 5 || dow === 6 ? 0.15 : dow === 3 ? -0.12 : 0;
  const valence = Math.max(0.2, Math.min(0.9, 0.55 + dayMoodOffset + (r - 0.5) * 0.3));
  const listeningHours = Math.max(0.5, Math.min(4, 1.8 + (r2 - 0.5) * 2));
  const newDiscoveries = Math.floor(r3 * 4);
  const topGenre = genres[Math.floor(r4 * genres.length)];

  return { date: dateStr, listeningHours: Math.round(listeningHours * 10) / 10, valence: Math.round(valence * 100) / 100, newDiscoveries, topGenre };
});
