'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { RelationshipMap } from './RelationshipMap';
import { InteractionLogger } from './InteractionLogger';
import { ConnectionStatus } from './ConnectionStatus';
import { RelationshipInsights } from './RelationshipInsights';
import { ScienceCard } from './ScienceCard';
import { AddRelationshipSheet } from './AddRelationshipSheet';
import { useRelationshipsStore } from '@/store/relationships';

interface RelationshipsPageProps {
  onBack: () => void;
  onSettings: () => void;
  onTalkAboutThis: (context: string) => void;
}

export function RelationshipsPage({ onBack, onSettings, onTalkAboutThis }: RelationshipsPageProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [preselectedPersonId, setPreselectedPersonId] = useState<string | null>(null);
  const hydrated = useRelationshipsStore((state) => state.hydrated);
  const hydrateFromApi = useRelationshipsStore((state) => state.hydrateFromApi);

  useEffect(() => {
    if (!hydrated) {
      void hydrateFromApi();
    }
  }, [hydrateFromApi, hydrated]);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar showBack onBack={onBack} onSettings={onSettings} title="Relationships" />
      <div className="flex-1 overflow-y-auto pb-6">
        <RelationshipMap onAdd={() => setSheetOpen(true)} />
        <InteractionLogger preselectedPersonId={preselectedPersonId} />
        <ConnectionStatus onSelectPerson={setPreselectedPersonId} />
        <div className="px-4 pb-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>What your connections show</p>
        </div>
        <RelationshipInsights onTalkAboutThis={onTalkAboutThis} />
        <ScienceCard />
      </div>
      <AddRelationshipSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}
