'use client';

export function ScienceTip({ tip }: { tip: string }) {
  return (
    <div className="mx-4 rounded-[24px] p-4 mb-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-light)' }}>
          🧠
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Today&apos;s science tip</p>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{tip}</p>
        </div>
      </div>
    </div>
  );
}
