import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type AIProviderId = 'local-qwen';
export type DataMode = 'mixed' | 'real-only' | 'demo-only';

interface SettingsState {
  theme: Theme;
  textSize: 'small' | 'medium' | 'large';
  activeProvider: AIProviderId;
  dataMode: DataMode;
  budgetEnabled: boolean;
  budgetLimit: number; // in pence
  budgetSpent: number; // in pence
  autoSwitchAtLimit: boolean;
  disableAtLimit: boolean;
  frameworks: {
    cbt: boolean;
    sdt: boolean;
    behaviourism: boolean;
  };
  setTheme: (theme: Theme) => void;
  setTextSize: (size: 'small' | 'medium' | 'large') => void;
  setActiveProvider: (id: AIProviderId) => void;
  setDataMode: (mode: DataMode) => void;
  setBudgetEnabled: (v: boolean) => void;
  setBudgetLimit: (pence: number) => void;
  setBudgetSpent: (pence: number) => void;
  addBudgetSpent: (pence: number) => void;
  resetBudget: () => void;
  setAutoSwitch: (v: boolean) => void;
  setDisableAtLimit: (v: boolean) => void;
  hydrateBudget: (payload: { limitPence: number; spentPence: number; autoSwitchAt80: boolean; disablePaidAtLimit: boolean }) => void;
  toggleFramework: (fw: 'cbt' | 'sdt' | 'behaviourism') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      textSize: 'medium',
      activeProvider: 'local-qwen',
      dataMode: 'mixed',
      budgetEnabled: true,
      budgetLimit: 1000, // £10.00 in pence
      budgetSpent: 240,  // £2.40 pre-populated for demo
      autoSwitchAtLimit: true,
      disableAtLimit: true,
      frameworks: { cbt: true, sdt: true, behaviourism: true },

      setTheme: (theme) => set({ theme }),
      setTextSize: (textSize) => set({ textSize }),
      setActiveProvider: (activeProvider) => set({ activeProvider }),
      setDataMode: (dataMode) => set({ dataMode }),
      setBudgetEnabled: (budgetEnabled) => set({ budgetEnabled }),
      setBudgetLimit: (budgetLimit) => set({ budgetLimit }),
      setBudgetSpent: (budgetSpent) => set({ budgetSpent }),
      addBudgetSpent: (pence) => set((s) => ({ budgetSpent: s.budgetSpent + pence })),
      resetBudget: () => set({ budgetSpent: 0 }),
      setAutoSwitch: (autoSwitchAtLimit) => set({ autoSwitchAtLimit }),
      setDisableAtLimit: (disableAtLimit) => set({ disableAtLimit }),
      hydrateBudget: ({ limitPence, spentPence, autoSwitchAt80, disablePaidAtLimit }) =>
        set({
          budgetLimit: limitPence,
          budgetSpent: spentPence,
          autoSwitchAtLimit: autoSwitchAt80,
          disableAtLimit: disablePaidAtLimit,
        }),
      toggleFramework: (fw) =>
        set((s) => ({ frameworks: { ...s.frameworks, [fw]: !s.frameworks[fw] } })),
    }),
    { name: 'therapist-os-settings' }
  )
);
