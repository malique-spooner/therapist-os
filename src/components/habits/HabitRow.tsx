'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { HabitDef } from '@/data/habits';
import { useEffect, useRef, useState } from 'react';

interface HabitRowProps {
  habit: HabitDef;
  value: boolean | number | undefined;
  onChange: (value: boolean | number) => void;
  compact?: boolean;
  identityLabel?: string;
  energyScore?: number;
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

export function HabitRow({ habit, value, onChange, compact = false, identityLabel, energyScore }: HabitRowProps) {
  const [justCompleted, setJustCompleted] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    holdTimerRef.current = null;
    holdIntervalRef.current = null;
    setIsHolding(false);
    setHoldProgress(0);
  }

  function startHold() {
    if (habit.type !== 'boolean' || isDone) return;
    clearHold();
    setIsHolding(true);
    const startedAt = Date.now();
    holdIntervalRef.current = setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / 550);
      setHoldProgress(progress);
    }, 16);
    holdTimerRef.current = setTimeout(() => {
      handleToggle();
      clearHold();
    }, 550);
  }

  useEffect(() => () => clearHold(), []);

  if (compact) {
    return (
      <motion.div
        className="flex items-center gap-3 px-4 py-3.5 rounded-[24px] transition-colors"
        style={{
          backgroundColor: isDone ? 'rgba(82,183,136,0.08)' : 'var(--color-surface)',
          border: `1px solid ${isDone ? 'rgba(82,183,136,0.22)' : 'var(--color-border)'}`,
          boxShadow: '0 14px 30px rgba(27, 67, 50, 0.06)',
        }}
        layout
      >
        <span className="text-2xl w-10 text-center flex-shrink-0">{habit.categoryIcon}</span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{habit.name}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{identityLabel ?? habit.subLabel ?? habit.category}</p>
        </div>

        {habit.type === 'boolean' && (
          <button onClick={handleToggle} className="relative w-9 h-9 flex-shrink-0 flex items-center justify-center" aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}>
            <Particles active={justCompleted} />
            <motion.div
              className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
              animate={{
                backgroundColor: isDone ? 'var(--color-success)' : 'transparent',
                borderColor: isDone ? 'var(--color-success)' : 'var(--color-border)',
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
            <span className="text-sm font-semibold min-w-8 text-right" style={{ color: 'var(--color-text)' }}>{Number(value || 0).toFixed(1)}</span>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="rounded-[40px] px-6 py-6 transition-colors"
      style={{
        backgroundColor: 'rgba(255,255,255,0.94)',
        border: `1px solid ${isDone ? 'rgba(82,183,136,0.22)' : 'rgba(27,67,50,0.08)'}`,
        boxShadow: isDone ? '0 28px 60px rgba(82, 183, 136, 0.14)' : '0 28px 60px rgba(27, 67, 50, 0.08)',
      }}
      layout
      onPointerDown={startHold}
      onPointerUp={clearHold}
      onPointerLeave={clearHold}
      onPointerCancel={clearHold}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="px-4 py-1.5 rounded-full text-xs font-semibold" style={{ backgroundColor: '#F4F1EA', color: 'var(--color-text-muted)' }}>
          {habit.categoryIcon} {habit.category}
        </div>
        {typeof energyScore === 'number' && (
          <div
            className="w-[76px] h-[88px] rounded-[26px] flex flex-col items-center justify-center text-center"
            style={{
              background: energyScore >= 90
                ? 'linear-gradient(180deg, #FFD77A 0%, #FFBE46 100%)'
                : energyScore >= 80
                  ? 'linear-gradient(180deg, #FFBE73 0%, #FF9638 100%)'
                  : 'linear-gradient(180deg, #FFA45D 0%, #FF6E1A 100%)',
              color: energyScore >= 80 ? '#1B1B1B' : '#fff',
              boxShadow: '0 18px 34px rgba(255, 173, 77, 0.26)',
            }}
          >
            <span className="text-lg leading-none">⚡</span>
            <span className="text-2xl font-bold mt-2 leading-none">{energyScore}</span>
          </div>
        )}
      </div>

      <div className="mt-5">
        <p
          className="text-[2.15rem] leading-[1.02] font-display"
          style={{ color: 'var(--color-text)' }}
        >
          {habit.name}
        </p>
        <p className="text-sm mt-6" style={{ color: 'var(--color-text-muted)' }}>I want to become</p>
        <p
          className="text-[2.05rem] leading-[1.05] mt-2 font-display"
          style={{ color: 'var(--color-text)' }}
        >
          {identityLabel ?? habit.subLabel ?? habit.category}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="min-w-[148px]">
          <div className="px-3 py-1.5 rounded-full text-xs font-medium inline-flex" style={{ backgroundColor: isDone ? 'rgba(82,183,136,0.12)' : '#F4F1EA', color: isDone ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
            {isDone ? 'Completed today' : isHolding ? 'Keep holding...' : 'Hold to complete'}
          </div>
          {!isDone && (
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#EFE8DB' }}>
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${holdProgress * 100}%`, backgroundColor: '#1F1F1F' }}
              />
            </div>
          )}
        </div>

        {habit.type === 'boolean' && (
          <div
            className="relative min-w-[132px] h-12 px-4 rounded-full flex items-center justify-center gap-2"
            aria-label={isDone ? 'Completed' : 'Hold to complete'}
            style={{ backgroundColor: isDone ? 'var(--color-success)' : '#1F1F1F', color: '#fff' }}
          >
            <Particles active={justCompleted} />
            {isDone && <Check size={16} color="#fff" strokeWidth={3} />}
            <span className="text-sm font-semibold">{isDone ? 'Done' : 'Press + hold'}</span>
          </div>
        )}

        {habit.type === 'scale' && (
          <div className="flex items-center gap-2">
            {[3, 5, 7, 9].map((v) => (
              <button
                key={v}
                onClick={() => onChange(v)}
                className="w-10 h-10 rounded-full text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: value === v ? '#1F1F1F' : '#F4F1EA',
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
            <button onClick={() => onChange(Math.max(0, (Number(value) || 0) - 0.5))} className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: '#F4F1EA', color: 'var(--color-text)' }}>−</button>
            <span className="text-sm font-semibold w-12 text-center" style={{ color: 'var(--color-text)' }}>{(Number(value) || 0).toFixed(1)}L</span>
            <button onClick={() => onChange(Math.min(4, (Number(value) || 0) + 0.5))} className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: '#1F1F1F', color: '#fff' }}>+</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
