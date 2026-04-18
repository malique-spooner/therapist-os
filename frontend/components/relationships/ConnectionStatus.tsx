'use client';

import { useRelationshipsStore } from '@/state/relationships';

interface ConnectionStatusProps {
  onSelectPerson: (id: string) => void;
}

export function ConnectionStatus({ onSelectPerson }: ConnectionStatusProps) {
  const overdue = useRelationshipsStore((state) => state.due);
  const people = useRelationshipsStore((state) => state.people);

  return (
    <div className="px-4 pb-4">
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Who&apos;s due a catch-up?</p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {!people.length && (
          <div
            className="flex-shrink-0 w-[220px] rounded-[24px] p-4"
            style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Waiting for real people</p>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>Due reminders start once you add relationships and log real interactions.</p>
          </div>
        )}
        {overdue.map(({ person, daysAgo }) => (
          <button
            key={person.id}
            onClick={() => onSelectPerson(person.id)}
            className="flex-shrink-0 w-[220px] rounded-[24px] p-4 text-left"
            style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid rgba(231,111,81,0.35)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold" style={{ backgroundColor: person.avatarColour, color: '#fff' }}>
                {person.name.slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{person.name}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Last contact: {daysAgo} days ago</p>
              </div>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-warning)' }}>Suggested: a low-friction catch-up this week</p>
          </button>
        ))}
        {!overdue.length && people.length > 0 && (
          <div
            className="flex-shrink-0 w-[220px] rounded-[24px] p-4"
            style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>You&apos;re up to date</p>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>No one is overdue for contact right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}
