import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type AIProviderId = 'gemini-flash' | 'gemini-pro' | 'claude-haiku' | 'claude-sonnet' | 'groq-llama';

interface SettingsState {
  theme: Theme;
  textSize: 'small' | 'medium' | 'large';
  activeProvider: AIProviderId;
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
  setBudgetEnabled: (v: boolean) => void;
  setBudgetLimit: (pence: number) => void;
  addBudgetSpent: (pence: number) => void;
  resetBudget: () => void;
  setAutoSwitch: (v: boolean) => void;
  setDisableAtLimit: (v: boolean) => void;
  toggleFramework: (fw: 'cbt' | 'sdt' | 'behaviourism') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      textSize: 'medium',
      activeProvider: 'claude-sonnet',
      budgetEnabled: true,
      budgetLimit: 1000, // £10.00 in pence
      budgetSpent: 240,  // £2.40 pre-populated for demo
      autoSwitchAtLimit: true,
      disableAtLimit: true,
      frameworks: { cbt: true, sdt: true, behaviourism: true },

      setTheme: (theme) => set({ theme }),
      setTextSize: (textSize) => set({ textSize }),
      setActiveProvider: (activeProvider) => set({ activeProvider }),
      setBudgetEnabled: (budgetEnabled) => set({ budgetEnabled }),
      setBudgetLimit: (budgetLimit) => set({ budgetLimit }),
      addBudgetSpent: (pence) => set((s) => ({ budgetSpent: s.budgetSpent + pence })),
      resetBudget: () => set({ budgetSpent: 0 }),
      setAutoSwitch: (autoSwitchAtLimit) => set({ autoSwitchAtLimit }),
      setDisableAtLimit: (disableAtLimit) => set({ disableAtLimit }),
      toggleFramework: (fw) =>
        set((s) => ({ frameworks: { ...s.frameworks, [fw]: !s.frameworks[fw] } })),
    }),
    { name: 'therapist-os-settings' }
  )
);
