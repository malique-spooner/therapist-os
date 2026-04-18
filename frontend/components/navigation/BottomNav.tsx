'use client';

import { motion } from 'framer-motion';
import { Brain, Coins, HeartPulse, Home, MapPinned, MessageCircleHeart, Music4, Repeat2, Users2 } from 'lucide-react';

interface BottomNavProps {
  current: 'dashboard' | 'health' | 'therapist' | 'habits' | 'relationships' | 'finance' | 'consumption' | 'location' | 'brain';
  onNavigate: (page: 'dashboard' | 'health' | 'therapist' | 'habits' | 'relationships' | 'finance' | 'consumption' | 'location' | 'brain') => void;
}

const items = [
  { id: 'dashboard' as const, label: 'Home', icon: Home },
  { id: 'health' as const, label: 'Health', icon: HeartPulse },
  { id: 'therapist' as const, label: 'Mind', icon: MessageCircleHeart },
  { id: 'habits' as const, label: 'Habits', icon: Repeat2 },
  { id: 'relationships' as const, label: 'People', icon: Users2 },
  { id: 'finance' as const, label: 'Money', icon: Coins },
  { id: 'consumption' as const, label: 'Media', icon: Music4 },
  { id: 'location' as const, label: 'Places', icon: MapPinned },
  { id: 'brain' as const, label: 'Brain', icon: Brain },
];

export function BottomNav({ current, onNavigate }: BottomNavProps) {
  return (
    <div
      style={{
        borderTop: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex gap-1 overflow-x-auto px-2 py-2 no-select">
        {items.map((item) => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              whileTap={{ scale: 0.96 }}
              animate={{ y: active ? -2 : 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              className="relative min-h-11 min-w-[76px] rounded-[22px] flex-shrink-0 flex flex-col items-center justify-center gap-1 px-3 py-2"
              style={{
                color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                backgroundColor: active ? 'var(--color-surface-2)' : 'transparent',
                border: active ? '1px solid var(--color-border)' : '1px solid transparent',
              }}
            >
              <motion.div
                className="relative z-10 flex flex-col items-center justify-center gap-1"
                animate={{ scale: active ? 1.02 : 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 24 }}
              >
                <motion.div
                  animate={{ rotate: 0, scale: active ? 1.03 : 1 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <Icon size={18} />
                </motion.div>
                <span className="text-[11px] font-medium">{item.label}</span>
              </motion.div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
