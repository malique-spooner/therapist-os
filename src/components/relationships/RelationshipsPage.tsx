'use client';

import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { RelationshipMap } from './RelationshipMap';
import { InteractionLogger } from './InteractionLogger';
import { ConnectionStatus } from './ConnectionStatus';
import { RelationshipInsights } from './RelationshipInsights';
import { ScienceCard } from './ScienceCard';
import { AddRelationshipSheet } from './AddRelationshipSheet';
import { SnapchatImportCard } from './SnapchatImportCard';
import { useRelationshipsStore } from '@/store/relationships';
import { api, type RelationshipImportPayload } from '@/lib/api';
import { DateRangeControl, type DateRangeValue } from '@/components/ui/date-range-control';
import { APP_TODAY, addDays, clampIsoDate } from '@/lib/date';

interface RelationshipsPageProps {
  onBack: () => void;
  onSettings: () => void;
  onTalkAboutThis: (context: string) => void;
}

export function RelationshipsPage({ onBack, onSettings, onTalkAboutThis }: RelationshipsPageProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [preselectedPersonId, setPreselectedPersonId] = useState<string | null>(null);
  const [imports, setImports] = useState<RelationshipImportPayload[]>([]);
  const hydrated = useRelationshipsStore((state) => state.hydrated);
  const hydrateFromApi = useRelationshipsStore((state) => state.hydrateFromApi);
  const people = useRelationshipsStore((state) => state.people);
  const interactions = useRelationshipsStore((state) => state.interactions);
  const availableDates = useMemo(() => interactions.map((interaction) => interaction.date).sort(), [interactions]);
  const latestDate = availableDates[availableDates.length - 1] ?? APP_TODAY;
  const earliestDate = availableDates[0] ?? addDays(latestDate, -89);
  const [selectedRange, setSelectedRange] = useState<DateRangeValue>({ startDate: latestDate, endDate: latestDate });

  useEffect(() => {
    if (!hydrated) {
      void hydrateFromApi();
    }
  }, [hydrateFromApi, hydrated]);

  useEffect(() => {
    setSelectedRange((current) => {
      const date = clampIsoDate(current.endDate, earliestDate, latestDate);
      return { startDate: date, endDate: date };
    });
  }, [earliestDate, latestDate]);

  useEffect(() => {
    let active = true;
    void api.getRelationshipImports().then((rows) => {
      if (!active) return;
      setImports(rows.filter((row) => row.source === 'snapchat_best_friends'));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar showBack onBack={onBack} onSettings={onSettings} title="Relationships" />
      <div className="flex-1 overflow-y-auto pb-6">
        <DateRangeControl
          mode="single"
          value={selectedRange}
          onChange={setSelectedRange}
          availableDates={availableDates}
          minDate={earliestDate}
          maxDate={latestDate}
        />
        <RelationshipMap onAdd={() => setSheetOpen(true)} />
        <SnapchatImportCard
          people={people}
          imports={imports}
          onImport={async (payload) => {
            const next = await api.importSnapchatBestFriendsScreenshot(payload);
            setImports((current) => [next, ...current]);
          }}
        />
        <InteractionLogger preselectedPersonId={preselectedPersonId} selectedDate={selectedRange.endDate} />
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
