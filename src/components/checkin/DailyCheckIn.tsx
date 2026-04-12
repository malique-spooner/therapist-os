'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckInComplete } from './CheckInComplete';
import { CheckInQuestion } from './CheckInQuestion';
import { useCheckInStore } from '@/store/checkin';

interface DailyCheckInProps {
  onComplete: () => void;
  isEvening?: boolean;
}

const emotionOptions = [
  { value: 1 as const, emoji: '😔', label: 'Low' },
  { value: 2 as const, emoji: '😕', label: 'Below Average' },
  { value: 3 as const, emoji: '😐', label: 'Neutral' },
  { value: 4 as const, emoji: '🙂', label: 'Good' },
  { value: 5 as const, emoji: '😊', label: 'Great' },
];

const energyOptions = [
  { value: 1 as const, emoji: '😴', label: 'Exhausted' },
  { value: 2 as const, emoji: '🥱', label: 'Tired' },
  { value: 3 as const, emoji: '😌', label: 'Okay' },
  { value: 4 as const, emoji: '😃', label: 'Energised' },
  { value: 5 as const, emoji: '🤩', label: 'Buzzing' },
];

const eveningReflectionOptions = [
  { value: 1 as const, emoji: '😞', label: 'Rough Day' },
  { value: 2 as const, emoji: '😕', label: 'Challenging' },
  { value: 3 as const, emoji: '😐', label: 'Neutral' },
  { value: 4 as const, emoji: '🙂', label: 'Good Day' },
  { value: 5 as const, emoji: '😊', label: 'Great Day' },
];

export function DailyCheckIn({ onComplete }: DailyCheckInProps) {
  const completeCheckIn = useCheckInStore((state) => state.completeCheckIn);
  const [emotionalState, setEmotionalState] = useState<1 | 2 | 3 | 4 | 5 | undefined>();
  const [energyLevel, setEnergyLevel] = useState<1 | 2 | 3 | 4 | 5 | undefined>();
  const [oneWord, setOneWord] = useState('');
  const [showComplete, setShowComplete] = useState(false);

  const canStart = Boolean(emotionalState);
  const q2Visible = Boolean(emotionalState);
  const q3Visible = Boolean(energyLevel);

  const description = useMemo(() => {
    if (!emotionalState) return 'A quick emotional baseline to start the session.';
    if (!energyLevel) return 'You’ve named the feeling. Now let’s get a read on your energy.';
    return 'Optional, but helpful when you want one extra bit of context for the day.';
  }, [emotionalState, energyLevel]);

  function handleSubmit() {
    if (isEvening) {
      if (!eveningReflection) return;
      completeCheckIn({
        type: 'evening',
        eveningReflection,
        timestamp: Date.now(),
      });
    } else {
      if (!emotionalState || !energyLevel) return;
      completeCheckIn({
        type: 'morning',
        emotionalState,
        energyLevel,
        timestamp: Date.now(),
      });
    }
    setShowComplete(true);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-5" style={{ background: 'linear-gradient(180deg, rgba(183,228,199,0.35) 0%, var(--color-surface) 42%)' }}>
      <div className="w-full max-w-md rounded-[32px] p-6 space-y-6 card-shadow" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="text-center space-y-2">
          <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: 'var(--color-light)', color: 'var(--color-dark)' }}>
            Daily emotional check-in
          </span>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>Start with how you feel</h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{description}</p>
        </div>

        <AnimatePresence mode="wait">
          {showComplete ? (
            <CheckInComplete onContinue={onComplete} />
          ) : (
            <motion.div key="questions" className="space-y-6">
              <CheckInQuestion
                visible
                title="How are you feeling right now?"
                options={emotionOptions}
                selected={emotionalState}
                onSelect={setEmotionalState}
              />

              <CheckInQuestion
                visible={q2Visible}
                title="What’s your energy like?"
                options={energyOptions}
                selected={energyLevel}
                onSelect={setEnergyLevel}
              />

              <CheckInQuestion
                visible={q3Visible}
                title="One word for today?"
                subtitle="Optional"
              >
                <div className="space-y-3">
                  <input
                    value={oneWord}
                    onChange={(event) => setOneWord(event.target.value)}
                    placeholder="anxious, hopeful, distracted..."
                    className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                    style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <button
                    onClick={() => setOneWord('')}
                    className="text-sm underline-offset-4 underline"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Skip
                  </button>
                </div>
              </CheckInQuestion>

              <button
                onClick={handleSubmit}
                disabled={!canStart}
                className="w-full h-[52px] rounded-xl font-semibold transition-opacity"
                style={{ backgroundColor: canStart ? 'var(--color-primary)' : 'var(--color-border)', color: canStart ? '#fff' : 'var(--color-text-muted)' }}
              >
                Start my day
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
