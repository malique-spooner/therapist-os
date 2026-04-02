'use client';

import { AnimatePresence, motion } from 'framer-motion';

interface Option<T extends number | string> {
  value: T;
  label: string;
  emoji?: string;
}

interface CheckInQuestionProps<T extends number | string> {
  visible: boolean;
  title: string;
  subtitle?: string;
  options?: Option<T>[];
  selected?: T;
  onSelect?: (value: T) => void;
  children?: React.ReactNode;
}

export function CheckInQuestion<T extends number | string>({
  visible,
  title,
  subtitle,
  options,
  selected,
  onSelect,
  children,
}: CheckInQuestionProps<T>) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="space-y-4"
        >
          <div className="text-center">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>{title}</h2>
            {subtitle && <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</p>}
          </div>

          {options ? (
            <div className="grid grid-cols-5 gap-2">
              {options.map((option) => {
                const active = selected === option.value;
                return (
                  <button
                    key={String(option.value)}
                    onClick={() => onSelect?.(option.value)}
                    className="rounded-3xl px-2 py-4 min-h-24 flex flex-col items-center justify-center gap-2 text-center active:scale-95 transition-transform"
                    style={{
                      backgroundColor: active ? 'var(--color-primary)' : 'var(--color-surface-2)',
                      color: active ? '#fff' : 'var(--color-text)',
                      border: `1px solid ${active ? 'transparent' : 'var(--color-border)'}`,
                      transform: active ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    {option.emoji && <span className="text-2xl">{option.emoji}</span>}
                    <span className="text-[11px] font-medium leading-tight">{option.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            children
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
