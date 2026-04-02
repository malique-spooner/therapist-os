'use client';

import { HeartPulse, Home, MessageCircleHeart, MoreHorizontal, Repeat2 } from 'lucide-react';

interface BottomNavProps {
  current: 'dashboard' | 'health' | 'therapist' | 'habits';
  onNavigate: (page: 'dashboard' | 'health' | 'therapist' | 'habits') => void;
  onMore: () => void;
}

const items = [
  { id: 'dashboard' as const, label: 'Home', icon: Home },
  { id: 'health' as const, label: 'Health', icon: HeartPulse },
  { id: 'therapist' as const, label: 'Mind', icon: MessageCircleHeart },
  { id: 'habits' as const, label: 'Habits', icon: Repeat2 },
];

export function BottomNav({ current, onNavigate, onMore }: BottomNavProps) {
  return (
    <div style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="min-h-11 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
              style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
            >
              <Icon size={18} />
              <span className="text-[11px] font-medium">{item.label}</span>
            </button>
          );
        })}

        <button
          onClick={onMore}
          className="min-h-11 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <MoreHorizontal size={18} />
          <span className="text-[11px] font-medium">More</span>
        </button>
      </div>
    </div>
  );
}
