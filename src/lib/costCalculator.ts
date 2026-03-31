export function formatCost(pence: number): string {
  if (pence === 0) return '£0.00';
  return `£${(pence / 100).toFixed(2)}`;
}

export function getBudgetStatus(spent: number, limit: number): 'ok' | 'warning' | 'exceeded' {
  const pct = spent / limit;
  if (pct >= 1) return 'exceeded';
  if (pct >= 0.8) return 'warning';
  return 'ok';
}

export function getBudgetPercent(spent: number, limit: number): number {
  return Math.min(100, Math.round((spent / limit) * 100));
}
