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

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36) || 'place';
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

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
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
    return [...places].sort((a, b) => (a.placeKey === 'home' ? -1 : b.placeKey === 'home' ? 1 : (a.placeKey === 'work' ? -1 : b.placeKey === 'work' ? 1 : (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0))));
  }, [places]);

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

  async function savePlace(result: SearchResult, role: 'home' | 'work' | 'custom') {
    const label = role === 'home' ? 'Home' : role === 'work' ? 'Work' : result.label;
    const placeKey = role === 'home'
      ? 'home'
      : role === 'work'
        ? 'work'
        : `place-${slugify(label)}-${Math.round(result.latitude * 10000)}-${Math.round(result.longitude * 10000)}`;

    setSavingKey(`save-${placeKey}`);
    try {
      await api.saveLocationPlace(placeKey, {
        label,
        category: role === 'home' ? 'home' : role === 'work' ? 'work' : 'unknown_place',
        tone: role === 'home' ? 'positive' : 'neutral',
        note: result.address,
        latitude: result.latitude,
        longitude: result.longitude,
      });
      setResults([]);
      setQuery('');
      onSaved?.();
    } finally {
      setSavingKey(null);
    }
  }

  async function promoteKnownPlace(place: LocationPlaceMemoryPayload, role: 'home' | 'work') {
    if (place.latitude == null || place.longitude == null) return;
    setSavingKey(`promote-${place.placeKey}-${role}`);
    try {
      await api.saveLocationPlace(place.placeKey, {
        label: role === 'home' ? 'Home' : 'Work',
        category: role,
        tone: role === 'home' ? 'positive' : place.tone ?? 'neutral',
        note: place.note ?? null,
        latitude: place.latitude,
        longitude: place.longitude,
      });
      onSaved?.();
    } finally {
      setSavingKey(null);
    }
  }

  const unknownPlaces = knownPlaces.filter((place) => place.category === 'unknown_place' || (place.confidenceScore ?? 0) < 0.65);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]">
      <div className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-hidden rounded-t-[32px] bg-[var(--color-surface)] shadow-[0_-18px_50px_rgba(15,23,42,0.24)] md:inset-y-6 md:left-1/2 md:w-[min(920px,calc(100vw-2rem))] md:-translate-x-1/2 md:rounded-[32px]">
        <div className="flex items-center justify-between border-b px-4 py-4" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
              Location settings
            </p>
            <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              Teach home, work, and custom places
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
                Search an address, then save it as Home, Work, or a new custom place.
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
                      <button
                        type="button"
                        disabled={savingKey?.startsWith('save-place-') ?? false}
                        onClick={() => void savePlace(result, 'custom')}
                        className="rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                        style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
                      >
                        <Plus size={12} className="mr-1 inline-block" />
                        Add as place
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
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Current anchors</p>
              <div className="mt-3 space-y-2">
                {knownPlaces.filter((place) => place.placeKey === 'home' || place.placeKey === 'work' || place.category === 'unknown_place').slice(0, 8).map((place) => (
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
                            disabled={savingKey === `promote-${place.placeKey}-home`}
                            onClick={() => void promoteKnownPlace(place, 'home')}
                            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                            style={{ backgroundColor: 'rgba(45, 106, 79, 0.12)', color: 'var(--color-primary)' }}
                          >
                            Home
                          </button>
                        )}
                        {place.placeKey !== 'work' && (
                          <button
                            type="button"
                            disabled={savingKey === `promote-${place.placeKey}-work`}
                            onClick={() => void promoteKnownPlace(place, 'work')}
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
              </div>
            </div>

            <div className="rounded-[26px] p-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Unknown places to teach</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                These are the uncertain clusters you can rename or convert into proper anchors.
              </p>
              <div className="mt-3 space-y-2">
                {unknownPlaces.slice(0, 6).map((place) => (
                  <div key={place.placeKey} className="rounded-[20px] p-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{place.label ?? place.suggestedLabel ?? 'Unknown place'}</p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {place.category ?? 'unknown place'} · {place.latitude?.toFixed(4)}, {place.longitude?.toFixed(4)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {place.placeKey !== 'home' && (
                          <button
                            type="button"
                            disabled={savingKey === `promote-${place.placeKey}-home`}
                            onClick={() => void promoteKnownPlace(place, 'home')}
                            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                            style={{ backgroundColor: 'rgba(45, 106, 79, 0.12)', color: 'var(--color-primary)' }}
                          >
                            Home
                          </button>
                        )}
                        {place.placeKey !== 'work' && (
                          <button
                            type="button"
                            disabled={savingKey === `promote-${place.placeKey}-work`}
                            onClick={() => void promoteKnownPlace(place, 'work')}
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
                {!unknownPlaces.length && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No unknown places right now.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
