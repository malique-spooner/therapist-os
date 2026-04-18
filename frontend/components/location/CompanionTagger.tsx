'use client';

import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import type { LocationCompanionPayload, LocationSummaryPayload } from '@/lib/api';
import type { RelationshipPerson } from '@/data/relationships';

interface CompanionTaggerProps {
  today: LocationSummaryPayload | null;
  people: RelationshipPerson[];
  saved: LocationCompanionPayload | null;
  onSave: (payload: { personIds: string[]; contextLabel?: string | null; note?: string | null }) => Promise<void>;
}

const CONTEXT_OPTIONS = ['Solo reset', 'Social outing', 'Work / commute', 'Family time', 'Exercise'] as const;

export function CompanionTagger({ today, people, saved, onSave }: CompanionTaggerProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [contextLabel, setContextLabel] = useState<string>('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedIds(saved?.personIds ?? []);
    setContextLabel(saved?.contextLabel ?? '');
    setNote(saved?.note ?? '');
  }, [saved]);

  const selectedPeople = useMemo(
    () => people.filter((person) => selectedIds.includes(person.id)),
    [people, selectedIds],
  );

  if (!today) return null;

  function togglePerson(personId: string) {
    setSelectedIds((current) =>
      current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId]
    );
  }

  return (
    <div className="px-4 pb-4">
      <motion.div
        className="rounded-[30px] p-4"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--color-surface-2) 90%, white 10%) 0%, var(--color-surface-2) 100%)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 14px 30px rgba(15, 23, 42, 0.05)',
        }}
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>Relationship context</p>
            <p className="text-lg font-semibold mt-2" style={{ color: 'var(--color-text)' }}>Who shaped this day with you?</p>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Tagging companions makes the location story far more useful. It helps the app separate solo reset time from social energy, family time, work friction, and shared routines.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>
            {today.date}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {people.map((person) => {
            const selected = selectedIds.includes(person.id);
            return (
              <button
                key={person.id}
                onClick={() => togglePerson(person.id)}
                className="px-3 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  backgroundColor: selected ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: selected ? '#fff' : 'var(--color-text-muted)',
                  border: `1px solid ${selected ? 'transparent' : 'var(--color-border)'}`,
                  boxShadow: selected ? '0 10px 18px rgba(46, 125, 50, 0.16)' : 'none',
                }}
              >
                {person.name}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {CONTEXT_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => setContextLabel(option)}
              className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: contextLabel === option ? 'rgba(82,183,136,0.14)' : 'var(--color-surface)',
                color: contextLabel === option ? 'var(--color-accent)' : 'var(--color-text-muted)',
                border: `1px solid ${contextLabel === option ? 'rgba(82,183,136,0.2)' : 'var(--color-border)'}`,
              }}
            >
              {option}
            </button>
          ))}
        </div>

        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional note about the outing, context, or how it felt"
          rows={3}
          className="w-full mt-4 rounded-2xl px-3 py-3 text-sm resize-none outline-none"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        />

        {selectedPeople.length > 0 && (
          <div className="mt-3 rounded-[20px] px-3 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>
              Tagged people
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text)' }}>
              {selectedPeople.map((person) => person.name).join(', ')}
            </p>
          </div>
        )}

        <button
          onClick={async () => {
            setSaving(true);
            try {
              await onSave({
                personIds: selectedIds,
                contextLabel: contextLabel || null,
                note: note.trim() || null,
              });
            } finally {
              setSaving(false);
            }
          }}
          className="mt-4 w-full h-11 rounded-2xl font-semibold"
          style={{ backgroundColor: 'var(--color-dark)', color: '#fff' }}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save location tags'}
        </button>
      </motion.div>
    </div>
  );
}
