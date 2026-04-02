import { useSettingsStore } from '@/store/settings';

describe('settings store', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      theme: 'system',
      textSize: 'medium',
      activeProvider: 'claude-sonnet',
      budgetEnabled: true,
      budgetLimit: 1000,
      budgetSpent: 240,
      autoSwitchAtLimit: true,
      disableAtLimit: true,
      frameworks: { cbt: true, sdt: true, behaviourism: true },
    });
  });

  it('hydrates budget values from the backend', () => {
    useSettingsStore.getState().hydrateBudget({
      limitPence: 2500,
      spentPence: 750,
      autoSwitchAt80: false,
      disablePaidAtLimit: false,
    });

    const state = useSettingsStore.getState();
    expect(state.budgetLimit).toBe(2500);
    expect(state.budgetSpent).toBe(750);
    expect(state.autoSwitchAtLimit).toBe(false);
    expect(state.disableAtLimit).toBe(false);
  });
});
