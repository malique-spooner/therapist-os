'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/store/settings';
import { formatCost, getBudgetPercent, getBudgetStatus } from '@/lib/costCalculator';

export function BudgetWidget() {
  const { budgetEnabled, budgetLimit, budgetSpent, autoSwitchAtLimit, disableAtLimit,
    setBudgetEnabled, setBudgetLimit, setAutoSwitch, setDisableAtLimit, resetBudget } = useSettingsStore();
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitInput, setLimitInput] = useState((budgetLimit / 100).toFixed(0));

  const pct = getBudgetPercent(budgetSpent, budgetLimit);
  const status = getBudgetStatus(budgetSpent, budgetLimit);
  const barColor = status === 'exceeded' ? 'var(--color-warning)' : status === 'warning' ? '#F59E0B' : 'var(--color-accent)';

  return (
    <div className="rounded-2xl p-4 space-y-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Monthly budget limit</span>
        <Switch checked={budgetEnabled} onCheckedChange={setBudgetEnabled} />
      </div>

      {budgetEnabled && (
        <>
          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
              <span>{formatCost(budgetSpent)} used</span>
              <span>of {formatCost(budgetLimit)} limit</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: barColor }}
              />
            </div>
            {status !== 'ok' && (
              <p className="text-xs mt-1.5" style={{ color: barColor }}>
                {status === 'exceeded' ? '⚠ Monthly limit reached' : `⚠ ${pct}% of limit used`}
              </p>
            )}
          </div>

          {/* Edit limit */}
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Limit:</span>
            {editingLimit ? (
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>£</span>
                <input
                  type="number"
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  className="w-20 text-sm px-2 py-1 rounded-lg border"
                  style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  inputMode="numeric"
                />
                <button
                  onClick={() => { setBudgetLimit(Math.round(parseFloat(limitInput || '10') * 100)); setEditingLimit(false); }}
                  className="text-sm font-medium px-3 py-1 rounded-lg"
                  style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
                >
                  Save
                </button>
              </div>
            ) : (
              <button onClick={() => setEditingLimit(true)} className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
                {formatCost(budgetLimit)} — Edit
              </button>
            )}
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--color-text)' }}>Auto-switch to free at 80%</span>
              <Switch checked={autoSwitchAtLimit} onCheckedChange={setAutoSwitch} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--color-text)' }}>Disable paid AI at limit</span>
              <Switch checked={disableAtLimit} onCheckedChange={setDisableAtLimit} />
            </div>
          </div>

          {/* Reset (for testing) */}
          <button
            onClick={resetBudget}
            className="text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Reset month (test)
          </button>
        </>
      )}
    </div>
  );
}
