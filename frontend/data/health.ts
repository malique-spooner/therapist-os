// 90 days of daily health data (Jan 1 - Mar 31)
export interface DayHealth {
  date: string; // YYYY-MM-DD
  steps: number;
  sleepDuration: number; // hours
  sleepQuality: number; // 1-10
  hrv: number; // ms
  restingHR: number; // bpm
  hadWorkout: boolean;
}

function seed(n: number) {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export const healthData: DayHealth[] = Array.from({ length: 90 }, (_, i) => {
  const date = new Date(2026, 0, 1);
  date.setDate(date.getDate() + i);
  const dateStr = date.toISOString().split('T')[0];
  const dow = date.getDay(); // 0=Sun, 6=Sat
  const progressArc = i / 89; // 0 -> 1 over 90 days
  const r = seed(i * 7 + 1);
  const r2 = seed(i * 13 + 2);
  const r3 = seed(i * 17 + 3);
  const r4 = seed(i * 23 + 4);
  const r5 = seed(i * 31 + 5);

  // Sleep improves over time (arc)
  const baseSleep = lerp(6.2, 7.4, progressArc);
  const sleepDuration = Math.max(4.5, Math.min(8.5, baseSleep + (r - 0.5) * 2.2));
  
  // Sleep quality correlates with duration, improves with arc
  const baseQuality = lerp(6.0, 7.4, progressArc);
  const sleepQuality = Math.max(4, Math.min(9, Math.round(baseQuality + (r2 - 0.5) * 3)));

  // Steps: higher on workout days, higher mid-week, correlates with mood
  const isWeekend = dow === 0 || dow === 6;
  const hadWorkout = r3 > (isWeekend ? 0.55 : 0.45);
  const baseSteps = hadWorkout ? 11000 : 7000;
  const steps = Math.max(4000, Math.min(14000, Math.round(baseSteps + (r4 - 0.5) * 5000)));

  // HRV improves slightly over time
  const baseHRV = lerp(44, 52, progressArc);
  const hrv = Math.max(28, Math.min(72, Math.round(baseHRV + (r5 - 0.5) * 20)));

  // RHR improves (lower) over time
  const baseRHR = lerp(64, 58, progressArc);
  const restingHR = Math.max(52, Math.min(72, Math.round(baseRHR + (r - 0.5) * 8)));

  return { date: dateStr, steps, sleepDuration: Math.round(sleepDuration * 10) / 10, sleepQuality, hrv, restingHR, hadWorkout };
});

export function getHealthForPeriod(period: string): DayHealth[] {
  if (period === 'today') return healthData.slice(-1);
  let days = 7;
  if (period === 'last-week') { return healthData.slice(Math.max(0, healthData.length - 14), healthData.length - 7); }
  if (period === 'this-month') days = 31;
  if (period === 'last-month') { return healthData.slice(Math.max(0, healthData.length - 62), healthData.length - 31); }
  if (period === '3-months') days = 90;
  return healthData.slice(Math.max(0, healthData.length - days));
}
