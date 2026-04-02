'use client';

import { getLocationActions } from '@/lib/domainData';
import type { Period } from '@/lib/mockDataUtils';

export function RecommendedActions({ period }: { period: Period }) {
  const actions = getLocationActions(period);

  return (
    <div className="px-4 pb-6">
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Recommended actions</p>
      <div className="space-y-3">
        {actions.map((action) => (
          <div key={action.title} className="rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>{action.title}</p>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{action.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
