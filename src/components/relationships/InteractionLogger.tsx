'use client';

import { useState } from 'react';
import { useRelationshipsStore } from '@/store/relationships';

const interactionTypes = [
  { id: 'in_person' as const, label: 'In person 🤝' },
  { id: 'phone' as const, label: 'Phone call 📞' },
  { id: 'video' as const, label: 'Video call 💻' },
  { id: 'message' as const, label: 'Message exchange 💬' },
  { id: 'activity_together' as const, label: 'Did something together 🎯' },
];

interface InteractionLoggerProps {
  preselectedPersonId?: string | null;
  selectedDate: string;
}

export function InteractionLogger({ preselectedPersonId, selectedDate }: InteractionLoggerProps) {
  const people = useRelationshipsStore((state) => state.people);
  const interactions = useRelationshipsStore((state) => state.interactions);
  const addInteraction = useRelationshipsStore((state) => state.addInteraction);
  const deleteInteraction = useRelationshipsStore((state) => state.deleteInteraction);
  const [selectedPeople, setSelectedPeople] = useState<string[]>(preselectedPersonId ? [preselectedPersonId] : []);
  const [selectedType, setSelectedType] = useState<typeof interactionTypes[number]['id']>('in_person');
  const [presenceScore, setPresenceScore] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [feelingWord, setFeelingWord] = useState('');

  function togglePerson(id: string) {
    setSelectedPeople((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  }

  function submit() {
    if (!selectedPeople.length) return;
    addInteraction({
      date: selectedDate,
      personIds: selectedPeople,
      type: selectedType,
      presenceScore,
      feelingWord: feelingWord.trim() || undefined,
    });
    setFeelingWord('');
    setPresenceScore(4);
  }

  const recent = [...interactions].filter((interaction) => interaction.date === selectedDate).slice(-5).reverse();
  const hasPeople = people.length > 0;

  return (
    <div className="px-4 pb-4 space-y-3">
      <div className="rounded-[28px] p-4 space-y-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Recent interactions</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Quick log for the selected day</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Who did you connect with?</p>
          {!hasPeople && (
            <p className="text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Add at least one real person first, then you can log interactions for the selected day.
            </p>
          )}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {people.map((person) => {
              const active = selectedPeople.includes(person.id);
              return (
                <button
                  key={person.id}
                  onClick={() => togglePerson(person.id)}
                  className="flex-shrink-0 rounded-2xl px-3 py-2 min-h-11"
                  style={{ backgroundColor: active ? 'var(--color-primary)' : 'var(--color-surface)', color: active ? '#fff' : 'var(--color-text)', border: `1px solid ${active ? 'transparent' : 'var(--color-border)'}` }}
                >
                  {person.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>How did you connect?</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {interactionTypes.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedType(item.id)}
                className="flex-shrink-0 rounded-2xl px-3 py-2 min-h-11"
                style={{ backgroundColor: selectedType === item.id ? 'var(--color-primary)' : 'var(--color-surface)', color: selectedType === item.id ? '#fff' : 'var(--color-text)', border: `1px solid ${selectedType === item.id ? 'transparent' : 'var(--color-border)'}` }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>How present were you?</p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Distracted</span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  onClick={() => setPresenceScore(score as 1 | 2 | 3 | 4 | 5)}
                  className="w-10 h-10 rounded-full"
                  style={{ backgroundColor: presenceScore >= score ? 'var(--color-primary)' : 'var(--color-surface)', color: presenceScore >= score ? '#fff' : 'var(--color-text-muted)', border: `1px solid ${presenceScore >= score ? 'transparent' : 'var(--color-border)'}` }}
                >
                  {score}
                </button>
              ))}
            </div>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Fully there</span>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>One word for how it felt?</p>
          <input
            value={feelingWord}
            onChange={(event) => setFeelingWord(event.target.value)}
            placeholder="easy, grounding, awkward..."
            className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          />
        </div>

        <button
          onClick={submit}
          disabled={!selectedPeople.length || !hasPeople}
          className="w-full rounded-2xl h-12 font-semibold"
          style={{ backgroundColor: selectedPeople.length && hasPeople ? 'var(--color-primary)' : 'var(--color-border)', color: selectedPeople.length && hasPeople ? '#fff' : 'var(--color-text-muted)' }}
        >
          Log interaction
        </button>
      </div>

      <div className="rounded-[28px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Last 5 logs</p>
        <div className="space-y-2">
          {recent.map((interaction) => (
            <div key={interaction.id} className="rounded-2xl px-3 py-3 flex items-center justify-between gap-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  {interaction.personIds.map((id) => people.find((person) => person.id === id)?.name ?? id).join(', ')}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{interaction.type.replaceAll('_', ' ')} · presence {interaction.presenceScore}/5</p>
              </div>
              <button onClick={() => deleteInteraction(interaction.id)} className="text-xs" style={{ color: 'var(--color-warning)' }}>
                Delete
              </button>
            </div>
          ))}
          {!recent.length && (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No relationship logs on this day yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
