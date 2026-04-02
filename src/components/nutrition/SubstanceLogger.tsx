'use client';

interface SubstanceLoggerProps {
  caffeineCount: number;
  alcoholUnits: number;
  lastBeforeNoon: boolean;
  onCaffeineCountChange: (count: number) => void;
  onAlcoholChange: (units: number) => void;
  onTimingChange: (value: boolean) => void;
}

function Stepper({ label, value, onChange, suffix }: { label: string; value: number; onChange: (value: number) => void; suffix: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{label}</span>
        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{value >= 4 ? '4+' : value} {suffix}</span>
      </div>
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4].map((count) => (
          <button
            key={count}
            onClick={() => onChange(count)}
            className="flex-1 rounded-2xl py-2 min-h-11"
            style={{ backgroundColor: value === count ? 'var(--color-primary)' : 'var(--color-surface)', color: value === count ? '#fff' : 'var(--color-text)', border: `1px solid ${value === count ? 'transparent' : 'var(--color-border)'}` }}
          >
            {count === 4 ? '4+' : count}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SubstanceLogger(props: SubstanceLoggerProps) {
  return (
    <div className="space-y-4">
      <Stepper label="Caffeine" value={props.caffeineCount} onChange={props.onCaffeineCountChange} suffix="drinks" />
      {props.caffeineCount > 0 && (
        <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Last drink before noon?</span>
          <div className="flex gap-2">
            {[
              { label: 'Yes', value: true },
              { label: 'No', value: false },
            ].map((option) => (
              <button
                key={option.label}
                onClick={() => props.onTimingChange(option.value)}
                className="rounded-xl px-3 py-2 text-sm min-h-11"
                style={{ backgroundColor: props.lastBeforeNoon === option.value ? 'var(--color-primary)' : 'var(--color-surface-2)', color: props.lastBeforeNoon === option.value ? '#fff' : 'var(--color-text)' }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <Stepper label="Alcohol" value={props.alcoholUnits} onChange={props.onAlcoholChange} suffix="units" />
    </div>
  );
}
