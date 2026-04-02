'use client';

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
      <div className="rounded-[28px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Who were you with?</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Add people to this location day so the brain can connect places, relationships, and mood more accurately.
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
                className="px-3 py-2 rounded-full text-sm font-medium transition-colors"
                style={{
                  backgroundColor: selected ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: selected ? '#fff' : 'var(--color-text-muted)',
                  border: `1px solid ${selected ? 'transparent' : 'var(--color-border)'}`,
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
          <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
            Tagged: {selectedPeople.map((person) => person.name).join(', ')}
          </p>
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
      </div>
    </div>
  );
}
