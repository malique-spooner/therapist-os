'use client';

import { useEffect, useMemo, useState } from 'react';
import { Briefcase, Home, Plus, Search, X } from 'lucide-react';

import { api, type LocationPlaceMemoryPayload } from '@/lib/api';

interface SearchResult {
  label: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface GoogleMapsNamespace {
  Geocoder: new () => {
    geocode(
      request: { address: string },
      callback: (results: Array<{
        name?: string | null;
        formatted_address?: string | null;
        geometry: { location: { lat(): number; lng(): number } };
      }>, status: string) => void,
    ): void;
  };
}

interface LocationSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  places: LocationPlaceMemoryPayload[];
  onSaved?: () => void;
}

function loadGoogleMaps(apiKey: string): Promise<GoogleMapsNamespace | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  const googleWindow = window as Window & { google?: { maps?: GoogleMapsNamespace } };
  if (googleWindow.google?.maps) return Promise.resolve(googleWindow.google.maps);
  const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps="therapist-os"]');
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(googleWindow.google?.maps ?? null), { once: true });
      existing.addEventListener('error', reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = 'therapist-os';
    script.onload = () => resolve(googleWindow.google?.maps ?? null);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function geocodeQuery(apiKey: string, query: string): Promise<SearchResult[]> {
  const maps = await loadGoogleMaps(apiKey);
  if (!maps) return [];

  return new Promise((resolve, reject) => {
    const geocoder = new maps.Geocoder();
    geocoder.geocode({ address: query }, (results, status) => {
      if (status !== 'OK' || !results?.length) {
        reject(new Error('No matching places found'));
        return;
      }
      resolve(
        results.slice(0, 5).map((result) => ({
          label: result.name || result.formatted_address || query,
          address: result.formatted_address || result.name || query,
          latitude: result.geometry.location.lat(),
          longitude: result.geometry.location.lng(),
        })),
      );
    });
  });
}

export function LocationSettingsDrawer({ open, onClose, places, onSaved }: LocationSettingsDrawerProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [memoryPlaces, setMemoryPlaces] = useState<LocationPlaceMemoryPayload[]>([]);
  const [selectedUnknownKey, setSelectedUnknownKey] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftTone, setDraftTone] = useState<'positive' | 'neutral' | 'draining'>('neutral');
  const [draftNote, setDraftNote] = useState('');
  const [mergeTargetKey, setMergeTargetKey] = useState('');

  async function refreshMemoryPlaces() {
    try {
      setMemoryPlaces(await api.getLocationPlaces());
    } catch {
      setMemoryPlaces([]);
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void refreshMemoryPlaces();
    void api.getAiRuntimeOptions()
      .then((payload) => {
        if (!cancelled) setApiKey(payload.googleMapsApiKey ?? null);
      })
      .catch(() => {
        if (!cancelled) setApiKey(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const knownPlaces = useMemo(() => {
    const sourcePlaces = memoryPlaces.length ? memoryPlaces : places;
    return [...sourcePlaces].sort((a, b) => (
      a.placeKey === 'home' ? -1 : b.placeKey === 'home' ? 1 : (
        a.placeKey === 'work' ? -1 : b.placeKey === 'work' ? 1 : (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0)
      )
    ));
  }, [memoryPlaces, places]);

  const unknownPlaces = useMemo(
    () => knownPlaces.filter((place) => place.category === 'unknown_place' || (place.confidenceScore ?? 0) < 0.65),
    [knownPlaces],
  );

  const selectedUnknown = useMemo(
    () => unknownPlaces.find((place) => place.placeKey === selectedUnknownKey) ?? unknownPlaces[0] ?? null,
    [selectedUnknownKey, unknownPlaces],
  );

  useEffect(() => {
    if (!selectedUnknown) {
      setSelectedUnknownKey(null);
      setDraftLabel('');
      setDraftTone('neutral');
      setDraftNote('');
      setMergeTargetKey('');
      return;
    }

    setSelectedUnknownKey(selectedUnknown.placeKey);
    setDraftLabel(selectedUnknown.label ?? selectedUnknown.suggestedLabel ?? '');
    setDraftTone((selectedUnknown.tone as 'positive' | 'neutral' | 'draining' | null) ?? 'neutral');
    setDraftNote(selectedUnknown.note ?? '');
    setMergeTargetKey(knownPlaces.find((place) => place.placeKey === 'home')?.placeKey ?? knownPlaces.find((place) => place.placeKey === 'work')?.placeKey ?? '');
  }, [knownPlaces, selectedUnknown]);

  if (!open) return null;

  async function search() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearching(true);
    setError(null);
    setResults([]);
    try {
      if (!apiKey) {
        throw new Error('Google Maps search is not available yet.');
      }
      setResults(await geocodeQuery(apiKey, trimmed));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  }

  async function savePlace(result: SearchResult, role: 'home' | 'work') {
    const label = role === 'home' ? 'Home' : 'Work';
    const placeKey = role;

    setSavingKey(`save-${placeKey}`);
    try {
      await api.saveLocationPlace(placeKey, {
        label,
        category: role,
        tone: role === 'home' ? 'positive' : 'neutral',
        note: result.address,
        latitude: result.latitude,
        longitude: result.longitude,
      });
      setResults([]);
      setQuery('');
      await refreshMemoryPlaces();
      onSaved?.();
    } finally {
      setSavingKey(null);
    }
  }

  async function saveKnownPlace(place: LocationPlaceMemoryPayload, overrides?: Partial<LocationPlaceMemoryPayload>) {
    setSavingKey(`save-${place.placeKey}`);
    try {
      await api.saveLocationPlace(place.placeKey, {
        label: overrides?.label ?? place.label ?? place.suggestedLabel ?? null,
        category: overrides?.category ?? place.category ?? 'unknown_place',
        tone: overrides?.tone ?? place.tone ?? 'neutral',
        note: overrides?.note ?? place.note ?? null,
        latitude: overrides?.latitude ?? place.latitude ?? null,
        longitude: overrides?.longitude ?? place.longitude ?? null,
      });
      await refreshMemoryPlaces();
      onSaved?.();
    } finally {
      setSavingKey(null);
    }
  }

  async function mergeUnknownPlace(placeKey: string, targetPlaceKey: string) {
    if (!targetPlaceKey || targetPlaceKey === placeKey) return;
    setSavingKey(`merge-${placeKey}`);
    try {
      await api.mergeLocationPlace(placeKey, targetPlaceKey);
      await refreshMemoryPlaces();
      onSaved?.();
    } finally {
      setSavingKey(null);
    }
  }

  async function applyPreset(place: LocationPlaceMemoryPayload, role: 'home' | 'work') {
    await saveKnownPlace(place, {
      label: role === 'home' ? 'Home' : 'Work',
      category: role,
      tone: role === 'home' ? 'positive' : place.tone ?? 'neutral',
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]">
      <div className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-hidden rounded-t-[32px] bg-[var(--color-surface)] shadow-[0_-18px_50px_rgba(15,23,42,0.24)] md:inset-y-6 md:left-1/2 md:w-[min(920px,calc(100vw-2rem))] md:-translate-x-1/2 md:rounded-[32px]">
        <div className="flex items-center justify-between border-b px-4 py-4" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
              Location settings
            </p>
            <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              Teach home and work
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2" style={{ color: 'var(--color-text-muted)' }} aria-label="Close location settings">
            <X size={18} />
          </button>
        </div>

        <div className="grid max-h-[calc(92vh-68px)] gap-4 overflow-y-auto p-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-[26px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Search a place</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Search an address, then save it as Home or Work.
              </p>
              <div className="mt-3 flex gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border px-3" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void search();
                      }
                    }}
                    placeholder="Search a location"
                    className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
                    style={{ color: 'var(--color-text)' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void search()}
                  className="rounded-2xl px-4 text-sm font-semibold"
                  style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                >
                  Search
                </button>
              </div>
              {error && <p className="mt-3 text-sm" style={{ color: '#ef4444' }}>{error}</p>}
              {!apiKey && (
                <p className="mt-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Google Maps search is not ready yet. Save the Google Maps API key first.
                </p>
              )}
            </div>

            <div className="rounded-[26px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Search results</p>
              <div className="mt-3 space-y-3">
                {searching ? (
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Searching...</p>
                ) : results.length ? results.map((result, index) => (
                  <div key={`${result.address}-${index}`} className="rounded-[22px] p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{result.label}</p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>{result.address}</p>
                      </div>
                      <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: 'rgba(82,183,136,0.12)', color: 'var(--color-primary)' }}>
                        {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={savingKey === `save-home`}
                        onClick={() => void savePlace(result, 'home')}
                        className="rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                        style={{ backgroundColor: 'rgba(45, 106, 79, 0.12)', color: 'var(--color-primary)' }}
                      >
                        <Home size={12} className="mr-1 inline-block" />
                        Set Home
                      </button>
                      <button
                        type="button"
                        disabled={savingKey === `save-work`}
                        onClick={() => void savePlace(result, 'work')}
                        className="rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                        style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}
                      >
                        <Briefcase size={12} className="mr-1 inline-block" />
                        Set Work
                      </button>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Search results will appear here.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[26px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Saved anchors</p>
              <div className="mt-3 space-y-2">
                {knownPlaces.filter((place) => place.placeKey === 'home' || place.placeKey === 'work').map((place) => (
                  <div key={place.placeKey} className="rounded-[20px] p-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{place.label ?? place.suggestedLabel ?? place.placeKey}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{place.category ?? 'unknown place'} · {place.visitCount ?? 0} visits</p>
                      </div>
                      <div className="flex gap-2">
                        {place.placeKey !== 'home' && (
                          <button
                            type="button"
                            disabled={savingKey === `save-${place.placeKey}`}
                            onClick={() => void applyPreset(place, 'home')}
                            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                            style={{ backgroundColor: 'rgba(45, 106, 79, 0.12)', color: 'var(--color-primary)' }}
                          >
                            Home
                          </button>
                        )}
                        {place.placeKey !== 'work' && (
                          <button
                            type="button"
                            disabled={savingKey === `save-${place.placeKey}`}
                            onClick={() => void applyPreset(place, 'work')}
                            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                            style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}
                          >
                            Work
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {!knownPlaces.length && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No places saved yet.</p>}
                {!knownPlaces.some((place) => place.placeKey === 'home' || place.placeKey === 'work') && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No home or work saved yet.</p>}
              </div>
            </div>

            <div className="rounded-[26px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Unknown places to teach</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Tap a place to edit it, then save it as Home or Work.
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-[0.95fr_1.05fr]">
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {unknownPlaces.map((place) => {
                    const isSelected = place.placeKey === selectedUnknown?.placeKey;
                    return (
                      <button
                        key={place.placeKey}
                        type="button"
                        onClick={() => setSelectedUnknownKey(place.placeKey)}
                        className="w-full rounded-[20px] p-3 text-left transition"
                        style={{
                          backgroundColor: isSelected ? 'rgba(82,183,136,0.12)' : 'var(--color-surface)',
                          border: `1px solid ${isSelected ? 'rgba(82,183,136,0.42)' : 'var(--color-border)'}`,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{place.label ?? place.suggestedLabel ?? 'Unknown place'}</p>
                            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {place.category ?? 'unknown place'} · {place.latitude?.toFixed(4)}, {place.longitude?.toFixed(4)}
                            </p>
                          </div>
                          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: 'rgba(15,23,42,0.06)', color: 'var(--color-text-muted)' }}>
                            {Math.round((place.confidenceScore ?? 0) * 100)}%
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  {!unknownPlaces.length && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No unknown places right now.</p>}
                </div>

                <div className="rounded-[20px] p-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  {selectedUnknown ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>Edit unknown place</p>
                        <p className="mt-1 text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                          {selectedUnknown.label ?? selectedUnknown.suggestedLabel ?? 'Unknown place'}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {selectedUnknown.placeKey} · {selectedUnknown.latitude?.toFixed(4)}, {selectedUnknown.longitude?.toFixed(4)}
                        </p>
                      </div>

                      <label className="block text-sm">
                        <span className="mb-1 block font-medium" style={{ color: 'var(--color-text)' }}>Label</span>
                        <input
                          value={draftLabel}
                          onChange={(event) => setDraftLabel(event.target.value)}
                          className="w-full rounded-2xl border bg-transparent px-3 py-2.5 text-sm outline-none"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                          placeholder="Name this place"
                        />
                      </label>

                      <label className="block text-sm">
                        <span className="mb-1 block font-medium" style={{ color: 'var(--color-text)' }}>Note</span>
                        <textarea
                          value={draftNote}
                          onChange={(event) => setDraftNote(event.target.value)}
                          rows={3}
                          className="w-full rounded-2xl border bg-transparent px-3 py-2.5 text-sm outline-none"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                          placeholder="Optional note"
                        />
                      </label>

                      <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>Merge into existing place</p>
                        <div className="mt-2 flex gap-2">
                          <select
                            value={mergeTargetKey}
                            onChange={(event) => setMergeTargetKey(event.target.value)}
                            className="min-w-0 flex-1 rounded-2xl border bg-transparent px-3 py-2.5 text-sm outline-none"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                          >
                            <option value="">Choose Home or Work</option>
                            {knownPlaces.filter((place) => ['home', 'work'].includes(place.placeKey)).map((place) => (
                              <option key={place.placeKey} value={place.placeKey}>
                                {place.label ?? place.suggestedLabel ?? place.placeKey}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={!mergeTargetKey || savingKey === `merge-${selectedUnknown.placeKey}`}
                            onClick={() => void mergeUnknownPlace(selectedUnknown.placeKey, mergeTargetKey)}
                            className="rounded-2xl px-3 py-2.5 text-sm font-semibold disabled:opacity-60"
                            style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}
                          >
                            Merge
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={savingKey === `save-${selectedUnknown.placeKey}`}
                          onClick={() => void applyPreset(selectedUnknown, 'home')}
                          className="rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                          style={{ backgroundColor: 'rgba(45, 106, 79, 0.12)', color: 'var(--color-primary)' }}
                        >
                          <Home size={12} className="mr-1 inline-block" />
                          Save as Home
                        </button>
                        <button
                          type="button"
                          disabled={savingKey === `save-${selectedUnknown.placeKey}`}
                          onClick={() => void applyPreset(selectedUnknown, 'work')}
                          className="rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                          style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}
                        >
                          <Briefcase size={12} className="mr-1 inline-block" />
                          Save as Work
                        </button>
                        <button
                          type="button"
                          disabled={savingKey === `save-${selectedUnknown.placeKey}`}
                          onClick={() => void saveKnownPlace(selectedUnknown, {
                            label: draftLabel.trim() || selectedUnknown.label || selectedUnknown.suggestedLabel || 'Unknown place',
                            category: 'unknown_place',
                            tone: draftTone,
                            note: draftNote.trim() || null,
                          })}
                          className="rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                          style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
                        >
                          <Plus size={12} className="mr-1 inline-block" />
                          Save note
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No unknown places right now.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
