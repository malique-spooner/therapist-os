'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { HabitDef } from '@/data/habits';
import { useEffect, useRef, useState } from 'react';

interface HabitRowProps {
  habit: HabitDef;
  value: boolean | number | undefined;
  onChange: (value: boolean | number) => void;
}

function Particles({ active }: { active: boolean }) {
  const particles = [
    { tx: '-16px', ty: '-16px' },
    { tx: '16px', ty: '-16px' },
    { tx: '-20px', ty: '0px' },
    { tx: '20px', ty: '0px' },
  ];
  return (
    <AnimatePresence>
      {active && particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
          style={{ backgroundColor: 'var(--color-accent)', left: '50%', top: '50%', translateX: '-50%', translateY: '-50%' }}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{ opacity: 0, x: p.tx, y: p.ty, scale: 0 }}
          transition={{ duration: 0.4, delay: i * 0.03 }}
        />
      ))}
    </AnimatePresence>
  );
}

export function HabitRow({ habit, value, onChange }: HabitRowProps) {
  const [justCompleted, setJustCompleted] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDone = habit.type === 'boolean'
    ? value === true
    : typeof value === 'number' && value > 0;

  function handleToggle() {
    if (habit.type === 'boolean') {
      const next = !value;
      onChange(next);
      if (next) { setJustCompleted(true); setTimeout(() => setJustCompleted(false), 500); }
    }
  }

  function clearHold() {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
    setIsHolding(false);
  }

  function startHold() {
    if (habit.type !== 'boolean' || isDone) return;
    clearHold();
    setIsHolding(true);
    holdTimerRef.current = setTimeout(() => {
      handleToggle();
      clearHold();
    }, 550);
  }

  useEffect(() => () => clearHold(), []);

  return (
    <motion.div
      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors"
      style={{
        backgroundColor: isDone ? 'rgba(82,183,136,0.08)' : 'var(--color-surface-2)',
        border: `1px solid ${isDone ? 'rgba(82,183,136,0.25)' : 'var(--color-border)'}`,
      }}
      layout
      onPointerDown={startHold}
      onPointerUp={clearHold}
      onPointerLeave={clearHold}
      onPointerCancel={clearHold}
    >
      <span className="text-2xl w-10 text-center flex-shrink-0">{habit.categoryIcon}</span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{habit.name}</p>
        {habit.subLabel && (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{habit.subLabel}</p>
        )}
      </div>

      {habit.type === 'boolean' && (
        <button
          onPointerDown={startHold}
          onPointerUp={clearHold}
          onPointerLeave={clearHold}
          onPointerCancel={clearHold}
          className="relative w-8 h-8 flex-shrink-0 flex items-center justify-center"
          aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
        >
          <Particles active={justCompleted} />
          <motion.div
            className="w-7 h-7 rounded-full border-2 flex items-center justify-center"
            animate={{
              backgroundColor: isDone ? 'var(--color-success)' : 'transparent',
              borderColor: isDone ? 'var(--color-success)' : isHolding ? 'var(--color-primary)' : 'var(--color-border)',
              scale: justCompleted ? [1, 1.2, 1] : 1,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <AnimatePresence>
              {isDone && (
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
                  <Check size={14} color="#fff" strokeWidth={3} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </button>
      )}

      {habit.type === 'scale' && (
        <div className="flex items-center gap-1">
          {[3, 5, 7, 9].map((v) => (
            <button
              key={v}
              onClick={() => onChange(v)}
              className="w-8 h-8 rounded-full text-xs font-semibold transition-colors"
              style={{
                backgroundColor: value === v ? 'var(--color-primary)' : 'var(--color-border)',
                color: value === v ? '#fff' : 'var(--color-text-muted)',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {habit.type === 'numeric' && (
        <div className="flex items-center gap-2">
          <button onClick={() => onChange(Math.max(0, (Number(value) || 0) - 0.5))} className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text)' }}>−</button>
          <span className="text-sm font-semibold w-10 text-center" style={{ color: 'var(--color-text)' }}>{(Number(value) || 0).toFixed(1)}L</span>
          <button onClick={() => onChange(Math.min(4, (Number(value) || 0) + 0.5))} className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}>+</button>
        </div>
      )}
    </motion.div>
  );
}
