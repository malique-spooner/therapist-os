import { formatCost, getBudgetPercent, getBudgetStatus } from '@/lib/costCalculator';

describe('costCalculator', () => {
  it('formats pence as pounds', () => {
    expect(formatCost(0)).toBe('£0.00');
    expect(formatCost(245)).toBe('£2.45');
  });

  it('computes budget status and percent', () => {
    expect(getBudgetStatus(50, 100)).toBe('ok');
    expect(getBudgetStatus(80, 100)).toBe('warning');
    expect(getBudgetStatus(100, 100)).toBe('exceeded');
    expect(getBudgetPercent(81, 100)).toBe(81);
  });
});
