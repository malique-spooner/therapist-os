import { getHealthForPeriod } from '@/data/health';
import { getFinanceForPeriod } from '@/data/finance';
import { habitsHistory } from '@/data/habits';

export type Period = 'this-week' | 'last-week' | 'this-month' | 'last-month' | '3-months';

export function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function getDashboardRings(period: Period) {
  const health = getHealthForPeriod(period);
  const finance = getFinanceForPeriod(period);

  const avgSteps = Math.round(avg(health.map((d) => d.steps)));
  const maxSteps = 12000;
  const stepsPercent = Math.min(100, Math.round((avgSteps / maxSteps) * 100));

  // Compare with previous equivalent period
  const prevHealth = getHealthForPeriod('last-week');
  const prevSteps = Math.round(avg(prevHealth.map((d) => d.steps)));
  const stepsTrend = prevSteps > 0 ? Math.round(((avgSteps - prevSteps) / prevSteps) * 100) : 0;

  const avgSleepQ = Math.round(avg(health.map((d) => d.sleepQuality)) * 10) / 10;
  const sleepPercent = Math.min(100, Math.round((avgSleepQ / 10) * 100));

  const totalSpend = Math.round(finance.reduce((a, d) => a + d.totalSpend, 0));
  const weeklyBudget = 350;
  const spendPercent = Math.min(100, Math.round((totalSpend / (weeklyBudget * (health.length / 7))) * 100));
  const spendTrend = period === 'this-week' ? -8 : 0;

  return [
    { label: 'Movement', value: avgSteps.toLocaleString(), unit: 'steps/day', percentage: stepsPercent, trend: `${stepsTrend >= 0 ? '+' : ''}${stepsTrend}% vs last week`, trendPositive: stepsTrend >= 0 },
    { label: 'Sleep Quality', value: avgSleepQ.toString(), unit: 'out of 10', percentage: sleepPercent, trend: '+0.4 vs last week', trendPositive: true },
    { label: 'Weekly Spend', value: `£${totalSpend}`, unit: `vs £${weeklyBudget} avg`, percentage: spendPercent, trend: `${spendTrend}% vs avg`, trendPositive: spendTrend <= 0 },
  ];
}

export function getWeeklyHabitCompletion(): number {
  const lastWeek = habitsHistory.slice(-7);
  let total = 0, completed = 0;
  for (const day of lastWeek) {
    for (const key of Object.keys(day.values)) {
      total++;
      const val = day.values[key];
      if (typeof val === 'boolean' ? val : val > 0) completed++;
    }
  }
  return Math.round((completed / total) * 100);
}
