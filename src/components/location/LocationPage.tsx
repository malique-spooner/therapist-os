'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Camera,
  Clock3,
  Compass,
  Map,
  MapPinned,
  Play,
  Users,
} from 'lucide-react';

import { TopBar } from '@/components/navigation/TopBar';
import { DateRangeControl, type DateRangeValue } from '@/components/ui/date-range-control';
import { RetryNotice } from '@/components/ui/retry-notice';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { api, type LocationIntelligencePayload, type LocationPlaceHistoryPayload } from '@/lib/api';
import { addDays, APP_TODAY, clampIsoDate, getDayLabel } from '@/lib/date';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useRelationshipsStore } from '@/store/relationships';
import { useSettingsStore } from '@/store/settings';
import { GoogleMapCanvas } from './GoogleMapCanvas';

interface LocationPageProps {
  onBack: () => void;
  onSettings: () => void;
  onTalkAboutThis: (context: string) => void;
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes}m`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function timeRange(startTimestamp: string, endTimestamp: string) {
  const start = new Date(startTimestamp);
  const end = new Date(endTimestamp);
  return `${start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

function categoryLabel(category: string) {
  return category.replace(/_/g, ' ');
}

type PlaceTone = 'positive' | 'neutral' | 'draining';

function toneChip(tone: PlaceTone) {
  if (tone === 'positive') return { label: 'Regulating', color: 'rgba(244, 162, 97, 0.16)', text: '#f4a261' };
  if (tone === 'draining') return { label: 'Demanding', color: 'rgba(239, 68, 68, 0.16)', text: '#ef4444' };
  return { label: 'Mixed', color: 'rgba(255,255,255,0.12)', text: 'rgba(255,255,255,0.82)' };
}

function fallbackExperience(mode: 'demo-only' | 'real-only'): LocationIntelligencePayload {
  return {
    mode,
    hasRealMapData: false,
    heroTitle: 'Place is acting like a nervous-system signal',
    heroBody: 'Once your phone starts sending traces, this page turns them into visits, places, and a weekly story.',
    summaries: [],
    selectedDay: null,
    points: [],
    selectedDayPoints: [],
    visits: [],
    places: [],
    recapScenes: [],
    rangeStats: [],
  };
}

export function LocationPage({ onBack, onSettings, onTalkAboutThis }: LocationPageProps) {
  const dataMode = useSettingsStore((state) => state.dataMode);
  const relationshipsHydrated = useRelationshipsStore((state) => state.hydrated);
  const hydrateRelationships = useRelationshipsStore((state) => state.hydrateFromApi);
  const relationshipPeople = useRelationshipsStore((state) => state.people);

  const [placeDrafts, setPlaceDrafts] = useState<Record<string, { label?: string; tone?: PlaceTone }>>({});
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMode, setDetailMode] = useState<'visit' | 'place'>('visit');
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [selectedPlaceKey, setSelectedPlaceKey] = useState<string | null>(null);
  const [range, setRange] = useState<DateRangeValue>(() => ({
    startDate: APP_TODAY,
    endDate: APP_TODAY,
  }));
  const [companionDraft, setCompanionDraft] = useState<{ personIds: string[]; contextLabel: string; note: string }>({
    personIds: [],
    contextLabel: '',
    note: '',
  });
  const [savingCompanion, setSavingCompanion] = useState(false);
  const [recapPlaying, setRecapPlaying] = useState(false);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);

  const { data: runtimeOptions } = useApiQuery(() => api.getAiRuntimeOptions(), []);
  const { data: intelligenceData, isLoading, error, refetch } = useApiQuery(
    () => api.getLocationIntelligence({ startDate: range.startDate, endDate: range.endDate, date: range.endDate }),
    [dataMode, range.startDate, range.endDate],
  );
  const { data: companionLog, refetch: refetchCompanionLog, setData: setCompanionLog } = useApiQuery(
    () => (range.endDate ? api.getLocationCompanions(range.endDate) : Promise.resolve(null)),
    [range.endDate],
  );
  const { data: placeHistory, refetch: refetchPlaceHistory } = useApiQuery<LocationPlaceHistoryPayload[]>(
    () => (selectedPlaceKey ? api.getLocationPlaceHistory(selectedPlaceKey) : Promise.resolve([])),
    [selectedPlaceKey, dataMode],
  );

  useEffect(() => {
    if (!relationshipsHydrated) {
      void hydrateRelationships();
    }
  }, [hydrateRelationships, relationshipsHydrated]);

  useEffect(() => {
    const intelligence = intelligenceData ?? fallbackExperience(dataMode);
    const availableDates = Array.from(
      new Set([
        ...intelligence.summaries.map((day) => day.date),
        ...intelligence.points.map((point) => point.timestamp.slice(0, 10)),
      ]),
    ).sort();
    const latestDate = availableDates[availableDates.length - 1] ?? APP_TODAY;
    const earliestDate = availableDates[0] ?? addDays(latestDate, -89);
    setRange((current) => ({
      endDate: clampIsoDate(current.endDate, earliestDate, latestDate),
      startDate: clampIsoDate(current.startDate, earliestDate, clampIsoDate(current.endDate, earliestDate, latestDate)),
    }));
  }, [dataMode, intelligenceData]);

  useEffect(() => {
    setCompanionDraft({
      personIds: companionLog?.personIds ?? [],
      contextLabel: companionLog?.contextLabel ?? '',
      note: companionLog?.note ?? '',
    });
  }, [companionLog]);

  const availableDates = useMemo(
    () =>
      Array.from(
        new Set([
          ...((intelligenceData ?? fallbackExperience(dataMode)).summaries).map((day) => day.date),
          ...((intelligenceData ?? fallbackExperience(dataMode)).points).map((point) => point.timestamp.slice(0, 10)),
        ]),
      ).sort(),
    [dataMode, intelligenceData],
  );
  const latestDate = availableDates[availableDates.length - 1] ?? APP_TODAY;
  const earliestDate = availableDates[0] ?? addDays(latestDate, -89);
  const googleMapsApiKey = runtimeOptions?.googleMapsApiKey ?? null;

  const experience = useMemo(
    () => {
      const intelligence = intelligenceData ?? fallbackExperience(dataMode);
      return {
        ...intelligence,
        places: intelligence.places.map((place) => ({
          ...place,
          key: place.placeKey,
          label: place.label ?? place.suggestedLabel ?? 'Place',
          suggestedLabel: place.suggestedLabel ?? place.label ?? 'Place',
          category: place.category ?? 'misc',
          latitude: place.latitude ?? 51.5074,
          longitude: place.longitude ?? -0.1278,
          visitCount: place.visitCount ?? 0,
          totalMinutes: place.totalMinutes ?? 0,
          averageDwellMinutes: place.averageDwellMinutes ?? 0,
          lastVisited: place.lastVisited ?? place.lastSeenAt ?? `${range.endDate}T00:00:00`,
          tone: (place.tone as PlaceTone | null) ?? 'neutral',
          insight: place.insight ?? 'This place is still building a richer story.',
          confidenceScore: place.confidenceScore ?? 0,
          historyCount: place.historyCount ?? 0,
          status: place.status ?? 'active',
        })),
      };
    },
    [dataMode, intelligenceData, range.endDate],
  );

  const selectedVisit = experience.visits.find((visit) => visit.id === selectedVisitId) ?? experience.visits[0] ?? null;
  const selectedPlace =
    experience.places.find((place) => place.key === selectedPlaceKey)
    ?? (selectedVisit ? experience.places.find((place) => place.key === selectedVisit.placeKey) : null)
    ?? experience.places[0]
    ?? null;
  const nearestMergeTarget = useMemo(() => {
    if (!selectedPlace) return null;
    return experience.places
      .filter((place) => place.key !== selectedPlace.key && place.status === 'active')
      .sort((a, b) => {
        const aDistance = Math.abs(a.latitude - selectedPlace.latitude) + Math.abs(a.longitude - selectedPlace.longitude);
        const bDistance = Math.abs(b.latitude - selectedPlace.latitude) + Math.abs(b.longitude - selectedPlace.longitude);
        return aDistance - bDistance;
      })[0] ?? null;
  }, [experience.places, selectedPlace]);
  const activeScene = experience.recapScenes[activeSceneIndex] ?? null;
  const showEmptyRealState = dataMode === 'real-only' && !isLoading && !experience.hasRealMapData;

  useEffect(() => {
    if (!selectedVisitId && experience.visits[0]) {
      setSelectedVisitId(experience.visits[0].id);
    }
    if (!selectedPlaceKey && experience.places[0]) {
      setSelectedPlaceKey(experience.places[0].key);
    }
  }, [experience.places, experience.visits, selectedPlaceKey, selectedVisitId]);

  useEffect(() => {
    if (!recapPlaying || experience.recapScenes.length <= 1) return;
    const timeout = window.setTimeout(() => {
      setActiveSceneIndex((current) => (current + 1) % experience.recapScenes.length);
    }, 3600);
    return () => window.clearTimeout(timeout);
  }, [activeSceneIndex, experience.recapScenes.length, recapPlaying]);

  useEffect(() => {
    if (activeSceneIndex < experience.recapScenes.length) return;
    setActiveSceneIndex(0);
  }, [activeSceneIndex, experience.recapScenes.length]);

  async function saveCompanionContext() {
    setSavingCompanion(true);
    try {
      const next = await api.saveLocationCompanions(range.endDate, {
        personIds: companionDraft.personIds,
        contextLabel: companionDraft.contextLabel || null,
        note: companionDraft.note || null,
      });
      if (dataMode === 'real-only') {
        setCompanionLog(next);
      }
      await refetchCompanionLog();
      await refetch();
    } finally {
      setSavingCompanion(false);
    }
  }

  async function updatePlaceOverride(placeKey: string, patch: { label?: string; tone?: PlaceTone }) {
    const next = {
      ...placeDrafts[placeKey],
      ...patch,
    };
    setPlaceDrafts((current) => ({
      ...current,
      [placeKey]: next,
    }));
    await api.saveLocationPlace(placeKey, {
      label: next.label ?? null,
      tone: next.tone ?? null,
      category: null,
      note: null,
    });
    await refetch();
    await refetchPlaceHistory();
  }

  async function mergeSelectedPlace() {
    if (!selectedPlace || !nearestMergeTarget) return;
    await api.mergeLocationPlace(selectedPlace.key, nearestMergeTarget.key);
    setDetailOpen(false);
    await refetch();
    await refetchPlaceHistory();
  }

  async function splitSelectedPlace() {
    if (!selectedPlace) return;
    const newPlaceKey = `${selectedPlace.key}-split-${Date.now().toString(36)}`;
    const label = `${(placeDrafts[selectedPlace.key]?.label ?? selectedPlace.label).trim() || selectedPlace.suggestedLabel} Alt`;
    await api.splitLocationPlace(selectedPlace.key, newPlaceKey, label);
    await refetch();
    await refetchPlaceHistory();
  }

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--color-surface)' }}>
      <TopBar
        showBack
        onBack={onBack}
        onSettings={onSettings}
        title="Location"
        rightElement={(
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setRecapPlaying((current) => !current);
                setActiveSceneIndex(0);
              }}
              className="rounded-2xl px-3 py-2 text-xs font-semibold"
              style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text)' }}
            >
              {recapPlaying ? 'Pause recap' : 'Replay week'}
            </button>
            <button onClick={onSettings} className="p-2 rounded-xl active:scale-95 transition-transform" aria-label="Settings">
              <Compass size={18} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          </div>
        )}
      />

      <div className="flex-1 overflow-y-auto pb-10">
        {error && (
          <RetryNotice onRetry={refetch} className="mx-4 mb-4 mt-4 w-[calc(100%-2rem)]" />
        )}

        <div className="pt-2">
          <motion.div
            className="relative overflow-hidden"
            style={{
              backgroundColor: '#08111f',
            }}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div className="relative h-[70vh] min-h-[520px]">
              <GoogleMapCanvas
                apiKey={googleMapsApiKey}
                points={experience.selectedDayPoints.length ? experience.selectedDayPoints : experience.points.slice(-90)}
                places={experience.places}
                highlightedPlaceKey={selectedPlace?.key ?? null}
                activeScene={recapPlaying ? activeScene : null}
                onPlaceSelect={(placeKey) => {
                  setSelectedPlaceKey(placeKey);
                  setDetailMode('place');
                  setDetailOpen(true);
                }}
                className="rounded-none border-0"
              />

              <button
                type="button"
                onClick={() => selectedPlace && setDetailOpen(true)}
                className="absolute bottom-4 left-4 rounded-2xl px-3 py-2 text-xs font-semibold"
                style={{ backgroundColor: 'rgba(8,17,31,0.72)', color: '#fff', backdropFilter: 'blur(12px)' }}
              >
                {recapPlaying && activeScene ? activeScene.title : 'Tap a place for details'}
              </button>
            </div>

            {!googleMapsApiKey && (
              <div className="mt-3 rounded-[24px] border px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.82)' }}>
                Add a Google Maps browser API key in Settings to unlock the live map canvas and future cinematic recaps.
              </div>
            )}
          </motion.div>
        </div>

        <DateRangeControl
          value={range}
          onChange={setRange}
          availableDates={availableDates}
          minDate={earliestDate}
          maxDate={latestDate}
        />

        {showEmptyRealState && (
          <RetryNotice
            message="Not enough real location data yet. Finish the OwnTracks phone publish flow and this page will turn it into visits, places, and a weekly map story."
            onRetry={refetch}
            className="mx-4 mb-4 w-[calc(100%-2rem)]"
          />
        )}

        <div className="space-y-4 px-4">
          <motion.section
            className="rounded-[30px] p-5"
            style={{
              background:
                'linear-gradient(160deg, rgba(247, 249, 252, 0.96) 0%, rgba(229, 236, 246, 0.9) 100%)',
              border: '1px solid var(--color-border)',
            }}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>Weekly cinematic recap</p>
                <p className="mt-2 text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Your week as a guided flyover</p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  The recap layer turns the selected window into a short map story: home rhythm, the most meaningful stop, and the place most worth keeping in rotation.
                </p>
              </div>
              <div className="rounded-[24px] px-3 py-3" style={{ backgroundColor: 'rgba(15,23,42,0.92)', color: '#fff' }}>
                <Camera size={18} />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="default"
                className="rounded-2xl px-4"
                onClick={() => {
                  setRecapPlaying(true);
                  setActiveSceneIndex(0);
                }}
                disabled={!experience.recapScenes.length}
              >
                <Play className="mr-1 size-4" />
                Play recap
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl px-4"
                onClick={() => setRecapPlaying(false)}
              >
                <Map className="mr-1 size-4" />
                Back to live map
              </Button>
            </div>

            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {experience.recapScenes.map((scene, index) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => {
                    setRecapPlaying(true);
                    setActiveSceneIndex(index);
                  }}
                  className="min-w-[240px] rounded-[24px] p-4 text-left"
                  style={{
                    backgroundColor: index === activeSceneIndex && recapPlaying ? 'rgba(15,23,42,0.95)' : 'var(--color-surface)',
                    color: index === activeSceneIndex && recapPlaying ? '#fff' : 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: index === activeSceneIndex && recapPlaying ? 'rgba(255,255,255,0.62)' : 'var(--color-text-muted)' }}>
                    Scene {index + 1}
                  </p>
                  <p className="mt-2 text-base font-semibold">{scene.title}</p>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: index === activeSceneIndex && recapPlaying ? 'rgba(255,255,255,0.78)' : 'var(--color-text-muted)' }}>
                    {scene.description}
                  </p>
                </button>
              ))}
              {!experience.recapScenes.length && (
                <div className="min-w-[240px] rounded-[24px] border p-4 text-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                  Once a week of traces and place memory exists, this rail fills with guided flyover scenes.
                </div>
              )}
            </div>
          </motion.section>

          <motion.section
            className="rounded-[30px] p-5"
            style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>Smart places</p>
                <p className="mt-2 text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Editable place memory</p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  The page groups repeated traces into candidate places. Rename them, teach the tone, and the story gets sharper.
                </p>
              </div>
              <div className="rounded-[24px] px-3 py-3" style={{ backgroundColor: 'rgba(244, 162, 97, 0.14)', color: '#f4a261' }}>
                <MapPinned size={18} />
              </div>
            </div>

            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {experience.places.map((place) => {
                const chip = toneChip(place.tone);
                return (
                  <button
                    key={place.key}
                    type="button"
                    onClick={() => {
                      setSelectedPlaceKey(place.key);
                      setDetailMode('place');
                      setDetailOpen(true);
                    }}
                    className="min-w-[240px] rounded-[26px] p-4 text-left"
                    style={{
                      backgroundColor: selectedPlace?.key === place.key ? 'rgba(15,23,42,0.94)' : 'var(--color-surface)',
                      color: selectedPlace?.key === place.key ? '#fff' : 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold">{place.label}</p>
                        <p className="mt-1 text-xs capitalize" style={{ color: selectedPlace?.key === place.key ? 'rgba(255,255,255,0.65)' : 'var(--color-text-muted)' }}>
                          {categoryLabel(place.category)}
                        </p>
                      </div>
                      <span className="rounded-full px-2 py-1 text-[11px] font-semibold" style={{ backgroundColor: chip.color, color: chip.text }}>
                        {chip.label}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[11px]" style={{ color: selectedPlace?.key === place.key ? 'rgba(255,255,255,0.55)' : 'var(--color-text-muted)' }}>Visits</p>
                        <p className="mt-1 text-sm font-semibold">{place.visitCount}</p>
                      </div>
                      <div>
                        <p className="text-[11px]" style={{ color: selectedPlace?.key === place.key ? 'rgba(255,255,255,0.55)' : 'var(--color-text-muted)' }}>Avg dwell</p>
                        <p className="mt-1 text-sm font-semibold">{formatMinutes(place.averageDwellMinutes)}</p>
                      </div>
                      <div>
                        <p className="text-[11px]" style={{ color: selectedPlace?.key === place.key ? 'rgba(255,255,255,0.55)' : 'var(--color-text-muted)' }}>Last seen</p>
                        <p className="mt-1 text-sm font-semibold">{getDayLabel(place.lastVisited.slice(0, 10), { day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed" style={{ color: selectedPlace?.key === place.key ? 'rgba(255,255,255,0.78)' : 'var(--color-text-muted)' }}>
                      {place.insight}
                    </p>
                  </button>
                );
              })}
            </div>
          </motion.section>

          <motion.section
            className="rounded-[30px] p-5"
            style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>Visit timeline</p>
                <p className="mt-2 text-xl font-semibold" style={{ color: 'var(--color-text)' }}>What the selected day actually looked like</p>
              </div>
              <div className="rounded-[24px] px-3 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.75)', color: 'var(--color-dark)' }}>
                <Clock3 size={18} />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {experience.visits.length ? experience.visits.map((visit) => {
                const chip = toneChip(visit.tone);
                return (
                  <button
                    key={visit.id}
                    type="button"
                    onClick={() => {
                      setSelectedVisitId(visit.id);
                      setSelectedPlaceKey(visit.placeKey);
                      setDetailMode('visit');
                      setDetailOpen(true);
                    }}
                    className="w-full rounded-[24px] p-4 text-left"
                    style={{
                      backgroundColor: selectedVisit?.id === visit.id ? 'rgba(15,23,42,0.94)' : 'var(--color-surface)',
                      color: selectedVisit?.id === visit.id ? '#fff' : 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold">{visit.placeLabel}</p>
                        <p className="mt-1 text-xs" style={{ color: selectedVisit?.id === visit.id ? 'rgba(255,255,255,0.65)' : 'var(--color-text-muted)' }}>
                          {timeRange(visit.startTimestamp, visit.endTimestamp)} . {formatMinutes(visit.dwellMinutes)} . {categoryLabel(visit.category)}
                        </p>
                      </div>
                      <span className="rounded-full px-2 py-1 text-[11px] font-semibold" style={{ backgroundColor: chip.color, color: chip.text }}>
                        {chip.label}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: selectedVisit?.id === visit.id ? 'rgba(255,255,255,0.8)' : 'var(--color-text-muted)' }}>
                      {visit.highlight}
                    </p>
                  </button>
                );
              }) : (
                <div className="rounded-[24px] border px-4 py-5 text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                  No visits have been derived yet for this day. Once traces arrive, the timeline will rebuild itself into stops, dwell, and likely places.
                </div>
              )}
            </div>
          </motion.section>

          <motion.section
            className="rounded-[30px] p-5"
            style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>Therapy overlay</p>
                <p className="mt-2 text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Place, people, and meaning</p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  Companion tagging remains the meaning layer. It teaches the map whether this was solo recovery, shared energy, work friction, or something else.
                </p>
              </div>
              <div className="rounded-[24px] px-3 py-3" style={{ backgroundColor: 'rgba(130, 204, 221, 0.16)', color: '#0ea5e9' }}>
                <Users size={18} />
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                {companionDraft.contextLabel || 'No explicit context saved for this day yet'}
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                {companionDraft.note || 'Tag who was there and what the day meant. That meaning carries into place memory and weekly recap scenes.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(relationshipPeople.length ? relationshipPeople : []).slice(0, 8).map((person) => {
                  const selected = companionDraft.personIds.includes(person.id);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => {
                        setCompanionDraft((current) => ({
                          ...current,
                          personIds: selected
                            ? current.personIds.filter((id) => id !== person.id)
                            : [...current.personIds, person.id],
                        }));
                      }}
                      className="rounded-full px-3 py-2 text-xs font-semibold"
                      style={{
                        backgroundColor: selected ? 'rgba(244, 162, 97, 0.14)' : 'var(--color-surface-2)',
                        color: selected ? '#f4a261' : 'var(--color-text)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {person.name}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input
                  value={companionDraft.contextLabel}
                  onChange={(event) => setCompanionDraft((current) => ({ ...current, contextLabel: event.target.value }))}
                  placeholder="football, family time, solo reset..."
                  className="h-12 rounded-2xl border px-4 text-sm outline-none"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text)' }}
                />
                <Button
                  className="h-12 rounded-2xl"
                  onClick={() => void saveCompanionContext()}
                  disabled={savingCompanion}
                >
                  {savingCompanion ? 'Saving...' : 'Save day meaning'}
                </Button>
              </div>
              <textarea
                value={companionDraft.note}
                onChange={(event) => setCompanionDraft((current) => ({ ...current, note: event.target.value }))}
                placeholder="What made this place or outing important?"
                className="mt-3 min-h-[112px] w-full rounded-[22px] border px-4 py-3 text-sm outline-none"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text)' }}
              />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={() => onTalkAboutThis(experience.heroBody)}
                className="rounded-[24px] p-4 text-left"
                style={{ backgroundColor: 'rgba(255,255,255,0.78)', border: '1px solid var(--color-border)' }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Talk about this</p>
                <p className="mt-2 text-base font-semibold" style={{ color: 'var(--color-text)' }}>Use location in therapy</p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  Send the current place narrative straight into the therapist page.
                </p>
              </button>
              <div className="rounded-[24px] p-4" style={{ backgroundColor: 'rgba(255,255,255,0.78)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Highlight</p>
                <p className="mt-2 text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                  {experience.places.find((place) => place.tone === 'positive' && place.key !== 'home')?.label ?? 'Still learning your regulating places'}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  The page is trying to separate places that steady you from places that simply happen often.
                </p>
              </div>
              <div className="rounded-[24px] p-4" style={{ backgroundColor: 'rgba(255,255,255,0.78)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Next unlock</p>
                <p className="mt-2 text-base font-semibold" style={{ color: 'var(--color-text)' }}>Photorealistic 3D recap scenes</p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  The weekly story scaffolding is here. The next layer is flying those scenes cinematically once the map stack is fully in place.
                </p>
              </div>
            </div>
          </motion.section>
        </div>
      </div>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[88vh] overflow-y-auto rounded-t-[32px] border-0 px-0 pb-0"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <SheetHeader className="px-5 pt-5 pb-2">
            <SheetTitle className="text-lg" style={{ color: 'var(--color-text)' }}>
              {detailMode === 'visit' ? selectedVisit?.placeLabel ?? 'Visit detail' : selectedPlace?.label ?? 'Place detail'}
            </SheetTitle>
            <SheetDescription style={{ color: 'var(--color-text-muted)' }}>
              {detailMode === 'visit'
                ? 'Inspect the stop, attach meaning, and teach the system what this visit was.'
                : 'Rename the place, tune its emotional tone, and improve the weekly story.'}
            </SheetDescription>
          </SheetHeader>

          <div className="px-5 pb-6">
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setDetailMode('visit')}
                className="rounded-2xl px-4 py-3 text-left"
                style={{
                  backgroundColor: detailMode === 'visit' ? 'var(--color-dark)' : 'var(--color-surface-2)',
                  color: detailMode === 'visit' ? '#fff' : 'var(--color-text)',
                }}
              >
                <p className="text-sm font-semibold">Visit</p>
                <p className="mt-1 text-xs" style={{ color: detailMode === 'visit' ? 'rgba(255,255,255,0.72)' : 'var(--color-text-muted)' }}>
                  Time block, dwell, context
                </p>
              </button>
              <button
                type="button"
                onClick={() => setDetailMode('place')}
                className="rounded-2xl px-4 py-3 text-left"
                style={{
                  backgroundColor: detailMode === 'place' ? 'var(--color-dark)' : 'var(--color-surface-2)',
                  color: detailMode === 'place' ? '#fff' : 'var(--color-text)',
                }}
              >
                <p className="text-sm font-semibold">Place</p>
                <p className="mt-1 text-xs" style={{ color: detailMode === 'place' ? 'rgba(255,255,255,0.72)' : 'var(--color-text-muted)' }}>
                  Rename and teach tone
                </p>
              </button>
            </div>

            {detailMode === 'visit' && selectedVisit && (
              <div className="mt-4 space-y-4">
                <div className="rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Visit window</p>
                  <p className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{timeRange(selectedVisit.startTimestamp, selectedVisit.endTimestamp)}</p>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                    {formatMinutes(selectedVisit.dwellMinutes)} at {selectedVisit.placeLabel}. {selectedVisit.highlight}
                  </p>
                </div>

                <div className="rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Companion context for the day</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {relationshipPeople.map((person) => {
                      const selected = companionDraft.personIds.includes(person.id);
                      return (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => setCompanionDraft((current) => ({
                            ...current,
                            personIds: selected
                              ? current.personIds.filter((id) => id !== person.id)
                              : [...current.personIds, person.id],
                          }))}
                          className="rounded-full px-3 py-2 text-xs font-semibold"
                          style={{
                            backgroundColor: selected ? 'rgba(244, 162, 97, 0.14)' : 'var(--color-surface)',
                            color: selected ? '#f4a261' : 'var(--color-text)',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          {person.name}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    value={companionDraft.contextLabel}
                    onChange={(event) => setCompanionDraft((current) => ({ ...current, contextLabel: event.target.value }))}
                    placeholder="shared training, family time, decompression..."
                    className="mt-4 h-12 w-full rounded-2xl border px-4 text-sm outline-none"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                  />
                  <textarea
                    value={companionDraft.note}
                    onChange={(event) => setCompanionDraft((current) => ({ ...current, note: event.target.value }))}
                    placeholder="Why did this visit matter?"
                    className="mt-3 min-h-[108px] w-full rounded-[22px] border px-4 py-3 text-sm outline-none"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                  />
                  <Button className="mt-3 h-11 w-full rounded-2xl" onClick={() => void saveCompanionContext()} disabled={savingCompanion}>
                    {savingCompanion ? 'Saving...' : 'Save visit meaning'}
                  </Button>
                </div>
              </div>
            )}

            {detailMode === 'place' && selectedPlace && (
              <div className="mt-4 space-y-4">
                <div className="rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Rename this place</p>
                  <input
                    value={placeDrafts[selectedPlace.key]?.label ?? selectedPlace.label}
                    onChange={(event) => {
                      setPlaceDrafts((current) => ({
                        ...current,
                        [selectedPlace.key]: {
                          ...current[selectedPlace.key],
                          label: event.target.value,
                        },
                      }));
                    }}
                    placeholder={selectedPlace.suggestedLabel}
                    className="mt-3 h-12 w-full rounded-2xl border px-4 text-sm outline-none"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                  />
                  <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Suggested label: {selectedPlace.suggestedLabel}
                  </p>
                  <Button
                    className="mt-3 h-11 w-full rounded-2xl"
                    onClick={() => void updatePlaceOverride(selectedPlace.key, { label: placeDrafts[selectedPlace.key]?.label ?? selectedPlace.label })}
                  >
                    Save place name
                  </Button>
                </div>

                <div className="rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Teach the tone</p>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {([
                      ['positive', 'Regulating'],
                      ['neutral', 'Mixed'],
                      ['draining', 'Demanding'],
                    ] as const).map(([value, label]) => {
                      const active = (placeDrafts[selectedPlace.key]?.tone ?? selectedPlace.tone) === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => void updatePlaceOverride(selectedPlace.key, { tone: value })}
                          className="rounded-2xl px-3 py-3 text-sm font-semibold"
                          style={{
                            backgroundColor: active ? 'var(--color-dark)' : 'var(--color-surface)',
                            color: active ? '#fff' : 'var(--color-text)',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                    {selectedPlace.insight}
                  </p>
                </div>

                <div className="rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Confidence and cluster controls</p>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface)' }}>
                      <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Confidence</p>
                      <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{Math.round((selectedPlace.confidenceScore ?? 0) * 100)}%</p>
                    </div>
                    <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface)' }}>
                      <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Status</p>
                      <p className="mt-1 text-sm font-semibold capitalize" style={{ color: 'var(--color-text)' }}>{selectedPlace.status}</p>
                    </div>
                    <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface)' }}>
                      <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>History</p>
                      <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{selectedPlace.historyCount}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Button variant="outline" className="h-11 rounded-2xl" onClick={() => void splitSelectedPlace()}>
                      Split cluster
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 rounded-2xl"
                      onClick={() => void mergeSelectedPlace()}
                      disabled={!nearestMergeTarget}
                    >
                      {nearestMergeTarget ? `Merge into ${nearestMergeTarget.label}` : 'No merge target'}
                    </Button>
                  </div>
                </div>

                <div className="rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Place history</p>
                  <div className="mt-3 space-y-2">
                    {(placeHistory ?? []).length ? (placeHistory ?? []).slice(0, 5).map((entry) => (
                      <div key={entry.id} className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface)' }}>
                        <p className="text-sm font-semibold capitalize" style={{ color: 'var(--color-text)' }}>{entry.action}</p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>{new Date(entry.createdAt).toLocaleString('en-GB')}</p>
                      </div>
                    )) : (
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        This place has no manual history yet. Renames, merges, and splits will show up here.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
