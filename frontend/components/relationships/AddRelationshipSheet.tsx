'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRelationshipsStore } from '@/state/relationships';

interface AddRelationshipSheetProps {
  open: boolean;
  onClose: () => void;
}

export function AddRelationshipSheet({ open, onClose }: AddRelationshipSheetProps) {
  const addPerson = useRelationshipsStore((state) => state.addPerson);
  const [name, setName] = useState('');
  const [type, setType] = useState<'partner' | 'family' | 'close_friend' | 'friend' | 'colleague' | 'other'>('friend');
  const [tier, setTier] = useState<'inner' | 'middle' | 'outer'>('middle');
  const [frequency, setFrequency] = useState(7);

  function submit() {
    if (!name.trim()) return;
    addPerson({
      name: name.trim(),
      type,
      tier,
      desiredFrequencyDays: frequency,
    });
    setName('');
    onClose();
  }

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
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] p-4"
            style={{ backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
          >
            <div className="space-y-4">
              <div>
                <p className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>Add relationship</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Map the people you want Therapist OS to coach around.</p>
              </div>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name"
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              />
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['partner', 'Partner'],
                  ['family', 'Family'],
                  ['close_friend', 'Close Friend'],
                  ['friend', 'Friend'],
                  ['colleague', 'Colleague'],
                  ['other', 'Other'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setType(value as typeof type)}
                    className="rounded-2xl px-3 py-3 text-sm"
                    style={{ backgroundColor: type === value ? 'var(--color-primary)' : 'var(--color-surface-2)', color: type === value ? '#fff' : 'var(--color-text)' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {[
                  ['inner', 'Inner'],
                  ['middle', 'Middle'],
                  ['outer', 'Outer'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setTier(value as typeof tier)}
                    className="flex-1 rounded-2xl px-3 py-3 text-sm"
                    style={{ backgroundColor: tier === value ? 'var(--color-primary)' : 'var(--color-surface-2)', color: tier === value ? '#fff' : 'var(--color-text)' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {[
                  [1, 'Daily'],
                  [7, 'Weekly'],
                  [14, 'Fortnightly'],
                  [30, 'Monthly'],
                ].map(([value, label]) => (
                  <button
                    key={label}
                    onClick={() => setFrequency(Number(value))}
                    className="flex-1 rounded-2xl px-3 py-3 text-sm"
                    style={{ backgroundColor: frequency === value ? 'var(--color-primary)' : 'var(--color-surface-2)', color: frequency === value ? '#fff' : 'var(--color-text)' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={submit}
                className="w-full rounded-2xl h-12 font-semibold"
                style={{ backgroundColor: name.trim() ? 'var(--color-primary)' : 'var(--color-border)', color: name.trim() ? '#fff' : 'var(--color-text-muted)' }}
              >
                Save relationship
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
