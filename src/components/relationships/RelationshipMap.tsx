'use client';

import { useRelationshipsStore } from '@/store/relationships';

interface RelationshipMapProps {
  onAdd: () => void;
}

export function RelationshipMap({ onAdd }: RelationshipMapProps) {
  const people = useRelationshipsStore((state) => state.people);

  return (
    <div className="px-4 pb-4">
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Your people</p>
      {!people.length && (
        <div className="rounded-[24px] p-4 mb-3" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>No people added yet</p>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            Real mode now starts empty here on purpose. Add someone once and the relationships side of the app can start learning from actual contact, not placeholders.
          </p>
        </div>
      )}
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        {people.map((person) => (
          <div key={person.id} className="snap-center flex-shrink-0 text-center w-20">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-lg font-semibold mx-auto" style={{ backgroundColor: person.avatarColour, color: '#fff' }}>
              {person.name.slice(0, 2)}
            </div>
            <p className="text-sm font-medium mt-2" style={{ color: 'var(--color-text)' }}>{person.name}</p>
            <p className="text-[11px] mt-1 leading-tight" style={{ color: 'var(--color-text-muted)' }}>{person.type.replace('_', ' ')}</p>
          </div>
        ))}
        <button
          onClick={onAdd}
          className="snap-center flex-shrink-0 text-center w-20"
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mx-auto" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px dashed var(--color-border)', color: 'var(--color-primary)' }}>
            +
          </div>
          <p className="text-sm font-medium mt-2" style={{ color: 'var(--color-text)' }}>Add</p>
          <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>relationship</p>
        </button>
      </div>
    </div>
  );
}
