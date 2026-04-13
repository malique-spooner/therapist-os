'use client';

import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { RelationshipMap } from './RelationshipMap';
import { InteractionLogger } from './InteractionLogger';
import { ConnectionStatus } from './ConnectionStatus';
import { ScienceCard } from './ScienceCard';
import { AddRelationshipSheet } from './AddRelationshipSheet';
import { SnapchatImportCard } from './SnapchatImportCard';
import { useRelationshipsStore } from '@/store/relationships';
import { api, type RelationshipImportPayload } from '@/lib/api';
import { DateRangeControl, type DateRangeValue } from '@/components/ui/date-range-control';
import { APP_TODAY, addDays, clampIsoDate } from '@/lib/date';
import { useSettingsStore } from '@/store/settings';

interface RelationshipsPageProps {
  onBack: () => void;
  onSettings: () => void;
  onTalkAboutThis: (context: string) => void;
}

export function RelationshipsPage({ onBack, onSettings }: RelationshipsPageProps) {
  const dataMode = useSettingsStore((state) => state.dataMode);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [preselectedPersonId, setPreselectedPersonId] = useState<string | null>(null);
  const [imports, setImports] = useState<RelationshipImportPayload[]>([]);
  const hydrated = useRelationshipsStore((state) => state.hydrated);
  const hydrateFromApi = useRelationshipsStore((state) => state.hydrateFromApi);
  const people = useRelationshipsStore((state) => state.people);
  const interactions = useRelationshipsStore((state) => state.interactions);
  const hasPeople = people.length > 0;
  const hasInteractions = interactions.length > 0;
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
    void hydrateFromApi();
  }, [dataMode, hydrateFromApi]);

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
  }, [dataMode]);
  const visibleImports = useMemo(
    () => imports.filter((row) => row.matchedPersonIds.some((id) => people.some((person) => person.id === id))),
    [imports, people],
  );
  const showEmptyRealState = hydrated && !hasPeople && !hasInteractions;

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
        {showEmptyRealState && (
          <div className="mx-4 mb-4 rounded-[24px] px-4 py-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Not enough real relationship data yet</p>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Add people, log interactions, or import message screenshots to build this view.
            </p>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="mt-4 rounded-2xl px-4 py-3 text-sm font-semibold"
              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
            >
              Add your first real person
            </button>
          </div>
        )}
        {!showEmptyRealState && <RelationshipMap onAdd={() => setSheetOpen(true)} />}
        <SnapchatImportCard
          people={people}
          imports={visibleImports}
          onImport={async (payload) => {
            const next = await api.importSnapchatBestFriendsScreenshot(payload);
            setImports((current) => [next, ...current]);
          }}
        />
        {hasPeople && <InteractionLogger preselectedPersonId={preselectedPersonId} selectedDate={selectedRange.endDate} />}
        {hasPeople && <ConnectionStatus onSelectPerson={setPreselectedPersonId} />}
        {(people.length > 0 || interactions.length > 0) && <ScienceCard />}
      </div>
      <AddRelationshipSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}
