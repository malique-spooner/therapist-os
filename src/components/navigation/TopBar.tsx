'use client';

import { Settings, ArrowLeft } from 'lucide-react';

interface TopBarProps {
  showBack?: boolean;
  onBack?: () => void;
  onSettings?: () => void;
  rightElement?: React.ReactNode;
  title?: string;
}

export function TopBar({ showBack, onBack, onSettings, rightElement, title }: TopBarProps) {
  return (
    <div
      className="flex items-center justify-between px-4 h-14 safe-top"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center" style={{ minWidth: 80 }}>
        {showBack ? (
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl active:scale-95 transition-transform" aria-label="Back">
            <ArrowLeft size={20} style={{ color: 'var(--color-primary)' }} />
          </button>
        ) : (
          <button onClick={onBack} className="active:opacity-70 transition-opacity">
            <span className="text-xs font-semibold tracking-tight whitespace-nowrap" style={{ color: 'var(--color-primary)' }}>
              Therapist OS
            </span>
          </button>
        )}
      </div>

      {title && (
        <span className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
          {title}
        </span>
      )}

      <div className="w-10 flex items-center justify-end">
        {rightElement ?? (
          onSettings && (
            <button onClick={onSettings} className="p-2 -mr-2 rounded-xl active:scale-95 transition-transform" aria-label="Settings">
              <Settings size={20} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          )
        )}
      </div>
    </div>
  );
}
