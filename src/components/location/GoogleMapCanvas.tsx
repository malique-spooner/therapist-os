'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

import type { LocationPlaceMemoryPayload, LocationPointPayload, LocationRecapScenePayload } from '@/lib/api';
import { cn } from '@/lib/utils';

interface GoogleMapCanvasProps {
  apiKey?: string | null;
  points: LocationPointPayload[];
  places: Array<LocationPlaceMemoryPayload & { key?: string; averageDwellMinutes?: number | null }>;
  highlightedPlaceKey?: string | null;
  activeScene?: LocationRecapScenePayload | null;
  className?: string;
}

interface GoogleMapsNamespace {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
  Polyline: new (options: Record<string, unknown>) => GoogleMapOverlay;
  Circle: new (options: Record<string, unknown>) => GoogleMapOverlay;
  LatLngBounds: new () => GoogleLatLngBounds;
}

interface GoogleMapOverlay {
  setMap(map: GoogleMapInstance | null): void;
}

interface GoogleLatLng {
  lat(): number;
  lng(): number;
}

interface GoogleLatLngBounds {
  extend(point: { lat: number; lng: number }): void;
  isEmpty(): boolean;
}

interface GoogleMapInstance {
  setMapTypeId(type: string): void;
  panTo(center: { lat: number; lng: number }): void;
  setZoom(zoom: number): void;
  getZoom?(): number;
  getHeading?(): number;
  setHeading?(heading: number): void;
  getTilt?(): number;
  setTilt?(tilt: number): void;
  fitBounds(bounds: GoogleLatLngBounds, padding?: number): void;
  getCenter?(): GoogleLatLng | null;
  moveCamera?(options: { center: { lat: number; lng: number }; zoom: number; heading: number; tilt: number }): void;
}

declare global {
  interface Window {
    __therapistGoogleMapsPromise?: Promise<GoogleMapsNamespace | null>;
    google?: { maps?: GoogleMapsNamespace };
  }
}

function loadGoogleMaps(apiKey: string) {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }
  if (window.__therapistGoogleMapsPromise) {
    return window.__therapistGoogleMapsPromise;
  }

  window.__therapistGoogleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps="therapist-os"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google?.maps ?? null), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = 'therapist-os';
    script.onload = () => resolve(window.google?.maps ?? null);
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return window.__therapistGoogleMapsPromise;
}

function MapFallback({
  points,
  places,
  highlightedPlaceKey,
}: {
  points: LocationPointPayload[];
  places: Array<LocationPlaceMemoryPayload & { key?: string }>;
  highlightedPlaceKey?: string | null;
}) {
  const coordinates = [
    ...points.map((point) => ({ lat: point.latitude, lng: point.longitude })),
    ...places.map((place) => ({ lat: place.latitude ?? 51.5074, lng: place.longitude ?? -0.1278 })),
  ];
  const minLat = Math.min(...coordinates.map((point) => point.lat), 51.5);
  const maxLat = Math.max(...coordinates.map((point) => point.lat), 51.52);
  const minLng = Math.min(...coordinates.map((point) => point.lng), -0.14);
  const maxLng = Math.max(...coordinates.map((point) => point.lng), -0.08);
  const latRange = Math.max(0.001, maxLat - minLat);
  const lngRange = Math.max(0.001, maxLng - minLng);

  const mapPoint = (lat: number, lng: number) => ({
    x: 8 + ((lng - minLng) / lngRange) * 84,
    y: 92 - ((lat - minLat) / latRange) * 84,
  });

  return (
    <div className="relative h-full overflow-hidden rounded-[32px] border" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(255, 211, 165, 0.35), transparent 35%), linear-gradient(145deg, #0f172a 0%, #102437 35%, #15364a 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {points.length > 1 && (
          <polyline
            fill="none"
            stroke="rgba(244, 162, 97, 0.8)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points.map((point) => {
              const mapped = mapPoint(point.latitude, point.longitude);
              return `${mapped.x},${mapped.y}`;
            }).join(' ')}
          />
        )}
        {places.map((place) => {
          const mapped = mapPoint(place.latitude ?? 51.5074, place.longitude ?? -0.1278);
          const isHighlighted = (place.key ?? place.placeKey) === highlightedPlaceKey;
          return (
            <g key={place.key ?? place.placeKey}>
              <circle
                cx={mapped.x}
                cy={mapped.y}
                r={isHighlighted ? 4.2 : 2.8}
                fill={place.tone === 'positive' ? '#f4a261' : place.tone === 'draining' ? '#ef4444' : '#f8fafc'}
                opacity={isHighlighted ? 1 : 0.9}
              />
              {isHighlighted && (
                <circle cx={mapped.x} cy={mapped.y} r="8" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
              )}
            </g>
          );
        })}
      </svg>
      <div className="absolute left-4 top-4 rounded-2xl border px-3 py-2 text-xs" style={{ backgroundColor: 'rgba(15, 23, 42, 0.72)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.88)' }}>
        {points.length ? 'Fallback story map' : 'Save a Google Maps key to unlock the live map canvas'}
      </div>
    </div>
  );
}

export function GoogleMapCanvas({
  apiKey,
  points,
  places,
  highlightedPlaceKey,
  activeScene,
  className,
}: GoogleMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const overlaysRef = useRef<GoogleMapOverlay[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const defaultCenter = useMemo(() => {
    if (activeScene) {
      return { lat: activeScene.latitude, lng: activeScene.longitude };
    }
    const home = places.find((place) => (place.key ?? place.placeKey) === 'home') ?? places[0];
    if (home) {
      return { lat: home.latitude ?? 51.5074, lng: home.longitude ?? -0.1278 };
    }
    const firstPoint = points[0];
    return firstPoint
      ? { lat: firstPoint.latitude, lng: firstPoint.longitude }
      : { lat: 51.5074, lng: -0.1278 };
  }, [activeScene, places, points]);

  useEffect(() => {
    if (!apiKey || !containerRef.current) {
      return;
    }

    let cancelled = false;
    void loadGoogleMaps(apiKey)
      .then((maps) => {
        if (!maps || cancelled || !containerRef.current) return;
        if (!mapRef.current) {
          mapRef.current = new maps.Map(containerRef.current, {
            center: defaultCenter,
            zoom: activeScene ? activeScene.zoom : 13,
            disableDefaultUI: true,
            clickableIcons: false,
            gestureHandling: 'greedy',
            mapTypeId: activeScene ? 'hybrid' : 'roadmap',
            styles: activeScene
              ? []
              : [
                  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
                  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
                  { elementType: 'labels.text.fill', stylers: [{ color: '#e2e8f0' }] },
                  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#22364a' }] },
                  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#102437' }] },
                ],
          });
        }
        setMapReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('Could not load Google Maps right now.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, activeScene, defaultCenter]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps || !mapReady) {
      return;
    }

    const maps = window.google.maps;
    overlaysRef.current.forEach((overlay) => {
      if (overlay?.setMap) overlay.setMap(null);
    });
    overlaysRef.current = [];

    if (points.length > 1) {
      const polyline = new maps.Polyline({
        path: points.map((point) => ({ lat: point.latitude, lng: point.longitude })),
        geodesic: true,
        strokeColor: '#f4a261',
        strokeOpacity: 0.9,
        strokeWeight: 4,
      });
      polyline.setMap(mapRef.current);
      overlaysRef.current.push(polyline);
    }

    places.forEach((place) => {
      const circle = new maps.Circle({
        strokeColor: (place.key ?? place.placeKey) === highlightedPlaceKey ? '#f8fafc' : '#ffffff',
        strokeOpacity: 0.9,
        strokeWeight: (place.key ?? place.placeKey) === highlightedPlaceKey ? 2 : 1,
        fillColor: place.tone === 'positive' ? '#f4a261' : place.tone === 'draining' ? '#ef4444' : '#f8fafc',
        fillOpacity: (place.key ?? place.placeKey) === highlightedPlaceKey ? 0.9 : 0.68,
        map: mapRef.current,
        center: { lat: place.latitude ?? 51.5074, lng: place.longitude ?? -0.1278 },
        radius: (place.key ?? place.placeKey) === 'home' ? 110 : Math.max(45, Math.min(160, (place.averageDwellMinutes ?? 60) * 1.7)),
      });
      overlaysRef.current.push(circle);
    });

    if (activeScene) {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      mapRef.current.setMapTypeId('hybrid');
      const center = mapRef.current.getCenter?.();
      const startLat = center?.lat?.() ?? defaultCenter.lat;
      const startLng = center?.lng?.() ?? defaultCenter.lng;
      const startZoom = mapRef.current.getZoom?.() ?? 13;
      const startHeading = mapRef.current.getHeading?.() ?? 0;
      const startTilt = mapRef.current.getTilt?.() ?? 0;
      const duration = activeScene.durationMs ?? 4800;
      const startTime = performance.now();
      const easeInOut = (value: number) => 0.5 - Math.cos(value * Math.PI) / 2;

      const animate = (timestamp: number) => {
        const progress = Math.min(1, (timestamp - startTime) / duration);
        const eased = easeInOut(progress);
        const nextCenter = {
          lat: startLat + (activeScene.latitude - startLat) * eased,
          lng: startLng + (activeScene.longitude - startLng) * eased,
        };
        const nextZoom = startZoom + (activeScene.zoom - startZoom) * eased;
        const nextHeading = startHeading + (activeScene.heading - startHeading) * eased;
        const nextTilt = startTilt + (activeScene.tilt - startTilt) * eased;

        if (typeof mapRef.current.moveCamera === 'function') {
          mapRef.current.moveCamera({
            center: nextCenter,
            zoom: nextZoom,
            heading: nextHeading,
            tilt: nextTilt,
          });
        } else {
          mapRef.current.panTo(nextCenter);
          mapRef.current.setZoom(nextZoom);
          if (typeof mapRef.current.setHeading === 'function') mapRef.current.setHeading(nextHeading);
          if (typeof mapRef.current.setTilt === 'function') mapRef.current.setTilt(nextTilt);
        }

        if (progress < 1) {
          animationFrameRef.current = window.requestAnimationFrame(animate);
        }
      };

      animationFrameRef.current = window.requestAnimationFrame(animate);
      return;
    }

    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    mapRef.current.setMapTypeId('roadmap');
    if (typeof mapRef.current.setHeading === 'function') mapRef.current.setHeading(0);
    if (typeof mapRef.current.setTilt === 'function') mapRef.current.setTilt(0);

    const bounds = new maps.LatLngBounds();
    points.forEach((point) => bounds.extend({ lat: point.latitude, lng: point.longitude }));
    places.forEach((place) => bounds.extend({ lat: place.latitude, lng: place.longitude }));
    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, 64);
    } else {
      mapRef.current.panTo(defaultCenter);
      mapRef.current.setZoom(13);
    }
  }, [activeScene, defaultCenter, highlightedPlaceKey, mapReady, places, points]);

  if (!apiKey || loadError) {
    return <MapFallback points={points} places={places} highlightedPlaceKey={highlightedPlaceKey} />;
  }

  return (
    <div className={cn('relative h-full overflow-hidden rounded-[32px] border', className)} style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
      <div ref={containerRef} className="absolute inset-0" />
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 h-28"
        style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.72) 0%, rgba(15,23,42,0) 100%)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />
    </div>
  );
}
