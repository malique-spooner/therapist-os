import React from 'react';
import { render, screen } from '@testing-library/react';

import { BudgetBanner } from '@/components/therapist/BudgetBanner';
import { useSettingsStore } from '@/store/settings';

describe('BudgetBanner', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      theme: 'system',
      textSize: 'medium',
      activeProvider: 'local-qwen',
      budgetEnabled: true,
      budgetLimit: 1000,
      budgetSpent: 850,
      autoSwitchAtLimit: true,
      disableAtLimit: true,
      frameworks: { cbt: true, sdt: true, behaviourism: true },
    });
  });

  it('shows a warning when the budget is over 80 percent', () => {
    render(<BudgetBanner />);
    expect(screen.getByText(/80% of monthly AI budget used/i)).toBeInTheDocument();
  });
});
