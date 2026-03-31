export interface DayLocation {
  date: string;
  homeHours: number;
  gymVisit: boolean;
  socialVenueVisit: boolean;
  commuteDay: boolean;
  newPlaceVisit: boolean;
}

function seed(n: number) { const x = Math.sin(n) * 10000; return x - Math.floor(x); }

export const locationData: DayLocation[] = Array.from({ length: 90 }, (_, i) => {
  const date = new Date(2026, 0, 1);
  date.setDate(date.getDate() + i);
  const dateStr = date.toISOString().split('T')[0];
  const dow = date.getDay();
  const isWeekend = dow === 0 || dow === 6;
  const r = seed(i * 43 + 1);
  const r2 = seed(i * 47 + 2);
  const r3 = seed(i * 53 + 3);
  const r4 = seed(i * 59 + 4);
  const r5 = seed(i * 61 + 5);

  const gymVisit = r > (isWeekend ? 0.5 : 0.55);
  const socialVenueVisit = r2 > (isWeekend ? 0.4 : 0.72);
  const commuteDay = !isWeekend && r3 > 0.3;
  const newPlaceVisit = r4 > 0.85;
  const homeHours = socialVenueVisit ? Math.round(10 + r5 * 4) : Math.round(14 + r5 * 4);

  return { date: dateStr, homeHours, gymVisit, socialVenueVisit, commuteDay, newPlaceVisit };
});
