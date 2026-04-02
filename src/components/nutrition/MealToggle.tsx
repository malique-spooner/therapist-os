'use client';

interface MealToggleProps {
  label: string;
  active: boolean;
  onToggle: () => void;
}

export function MealToggle({ label, active, onToggle }: MealToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-between rounded-2xl px-4 py-3 min-h-11"
      style={{ backgroundColor: active ? 'rgba(82,183,136,0.12)' : 'var(--color-surface)', border: `1px solid ${active ? 'var(--color-success)' : 'var(--color-border)'}` }}
    >
      <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{label}</span>
      <span className="text-sm" style={{ color: active ? 'var(--color-success)' : 'var(--color-text-muted)' }}>{active ? '✓' : 'Unlogged'}</span>
    </button>
  );
}
