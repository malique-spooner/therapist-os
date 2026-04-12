'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface DomainMenuProps {
  open: boolean;
  onClose: () => void;
  onSelect: (page: 'relationships' | 'finance' | 'consumption' | 'location') => void;
}

const items = [
  { id: 'relationships' as const, label: 'Relationships', icon: '🤝', description: 'Your people, interactions, coaching' },
  { id: 'finance' as const, label: 'Finance', icon: '💷', description: 'Spending patterns and emotional triggers' },
  { id: 'consumption' as const, label: 'Consumption', icon: '🎵', description: 'Music, YouTube, mood mirror' },
  { id: 'location' as const, label: 'Location', icon: '📍', description: 'Movement context, routines, restorative places' },
];

export function DomainMenu({ open, onClose, onSelect }: DomainMenuProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0,0,0,0.28)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-label="Close domain menu"
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] px-4 pt-4 pb-6"
            style={{ backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
          >
            <div className="flex items-center justify-between pb-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>More domains</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Open a deeper view from the home hub.</p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-surface-2)' }}
                aria-label="Close"
              >
                <X size={18} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelect(item.id);
                    onClose();
                  }}
                  className="w-full rounded-3xl p-4 text-left active:scale-[0.99] transition-transform"
                  style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl" style={{ backgroundColor: 'var(--color-light)' }}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{item.label}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{item.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
