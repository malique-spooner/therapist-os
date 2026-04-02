'use client';

interface FoodQualitySelectorProps {
  value: 1 | 2 | 3;
  onChange: (value: 1 | 2 | 3) => void;
}

const options = [
  { value: 3 as const, label: '🥦 Mostly whole foods' },
  { value: 2 as const, label: '🍽️ Mixed' },
  { value: 1 as const, label: '🍟 Mostly processed' },
];

export function FoodQualitySelector({ value, onChange }: FoodQualitySelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className="flex-1 rounded-2xl px-3 py-3 text-sm font-medium min-h-11"
              style={{ backgroundColor: active ? 'var(--color-primary)' : 'var(--color-surface)', color: active ? '#fff' : 'var(--color-text)', border: `1px solid ${active ? 'transparent' : 'var(--color-border)'}` }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Whole foods = stable blood sugar = more stable mood.</p>
    </div>
  );
}
