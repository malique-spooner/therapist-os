'use client';

import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '@/state/settings';
import { getBudgetStatus, formatCost } from '@/lib/costCalculator';
import { useState } from 'react';

export function BudgetBanner() {
  const { budgetEnabled, budgetSpent, budgetLimit } = useSettingsStore();
  const [dismissed, setDismissed] = useState(false);

  if (!budgetEnabled || dismissed) return null;
  const status = getBudgetStatus(budgetSpent, budgetLimit);
  if (status === 'ok') return null;

  const isExceeded = status === 'exceeded';
  const bgColor = isExceeded ? '#FEF2F2' : '#FFFBEB';
  const textColor = isExceeded ? '#DC2626' : '#D97706';
  const borderColor = isExceeded ? '#FECACA' : '#FDE68A';

  return (
    <AnimatePresence>
      <motion.div
        className="mx-4 mb-3 px-3 py-2.5 rounded-xl flex items-center gap-2"
        style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
      >
        <AlertTriangle size={14} style={{ color: textColor, flexShrink: 0 }} />
        <p className="text-xs flex-1" style={{ color: textColor }}>
          {isExceeded
            ? `Monthly AI budget exceeded (${formatCost(budgetSpent)} / ${formatCost(budgetLimit)}). Switched to free tier.`
            : `80% of monthly AI budget used — ${formatCost(budgetLimit - budgetSpent)} remaining.`
          }
        </p>
        <button onClick={() => setDismissed(true)}>
          <X size={12} style={{ color: textColor }} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
