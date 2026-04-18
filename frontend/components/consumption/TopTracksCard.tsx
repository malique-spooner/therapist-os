'use client';

import type { ConsumptionPayload } from '@/lib/api';

interface TopTracksCardProps {
  days: ConsumptionPayload[];
}

export function TopTracksCard({ days }: TopTracksCardProps) {
  if (!days.length) {
    return (
      <div className="mx-4 rounded-[28px] p-5 mb-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Top songs</p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          No Spotify track history is available in this range yet.
        </p>
      </div>
    );
  }

  const byTrack = new Map<string, { name: string; artist: string; plays: number; days: number }>();
  days.forEach((day) => {
    day.topTracks.forEach((track) => {
      const name = track.name?.trim() || 'Unknown track';
      const artist = track.artist?.trim() || 'Unknown artist';
      const key = `${name}__${artist}`;
      const existing = byTrack.get(key);
      if (existing) {
        existing.plays += Number(track.plays ?? 1);
        existing.days += 1;
      } else {
        byTrack.set(key, {
          name,
          artist,
          plays: Number(track.plays ?? 1),
          days: 1,
        });
      }
    });
  });

  const topTracks = Array.from(byTrack.values())
    .sort((a, b) => b.plays - a.plays || b.days - a.days || a.name.localeCompare(b.name))
    .slice(0, 5);

  const totalHours = days.reduce((sum, day) => sum + day.listeningHours, 0);
  const totalDiscoveries = days.reduce((sum, day) => sum + day.newDiscoveries, 0);
  const selectedWindowLabel = days.length <= 1 ? 'selected day' : `${days.length}-day range`;

  return (
    <div className="mx-4 rounded-[28px] p-5 mb-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Top songs</p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            Most-played Spotify tracks across the {selectedWindowLabel}.
          </p>
        </div>
        <div className="rounded-2xl px-3 py-2 text-right" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Listening</p>
          <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{totalHours.toFixed(1)}h</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Tracks ranked</p>
          <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{topTracks.length}</p>
        </div>
        <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Discoveries</p>
          <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{totalDiscoveries}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {topTracks.map((track, index) => (
          <div
            key={`${track.name}-${track.artist}`}
            className="rounded-2xl px-4 py-3"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  style={{ backgroundColor: 'rgba(82,183,136,0.12)', color: 'var(--color-primary)' }}
                >
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{track.name}</p>
                  <p className="truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>{track.artist}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{track.plays}</p>
                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>plays</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
