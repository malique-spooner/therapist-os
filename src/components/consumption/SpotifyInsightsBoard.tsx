'use client';

import type { ConsumptionPayload } from '@/lib/api';

interface SpotifyInsightsBoardProps {
  days: ConsumptionPayload[];
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function describeDirection(delta: number, positiveLabel: string, negativeLabel: string, neutralLabel: string) {
  if (delta > 0.05) return positiveLabel;
  if (delta < -0.05) return negativeLabel;
  return neutralLabel;
}

function moodReadout(valence: number, energy: number, danceability: number) {
  const descriptors: string[] = [];
  descriptors.push(valence >= 0.62 ? 'uplifting' : valence <= 0.42 ? 'reflective' : 'balanced');
  descriptors.push(energy >= 0.65 ? 'high-drive' : energy <= 0.4 ? 'gentle' : 'steady');
  descriptors.push(danceability >= 0.65 ? 'body-led' : danceability <= 0.42 ? 'still' : 'fluid');
  return descriptors;
}

function aggregateTopGenres(days: ConsumptionPayload[]) {
  const genreScores = new Map<string, number>();
  days.forEach((day) => {
    (day.topGenres ?? []).forEach((genre, index) => {
      genreScores.set(genre, (genreScores.get(genre) ?? 0) + (5 - index));
    });
  });
  return Array.from(genreScores.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([genre, score]) => ({ genre, score }));
}

function aggregateTopTracks(days: ConsumptionPayload[]) {
  const tracks = new Map<string, { name: string; artist: string; plays: number; days: number }>();
  days.forEach((day) => {
    (day.topTracks ?? []).forEach((track) => {
      const name = track.name?.trim() || 'Unknown track';
      const artist = track.artist?.trim() || 'Unknown artist';
      const key = `${name}__${artist}`;
      const existing = tracks.get(key);
      if (existing) {
        existing.plays += Number(track.plays ?? 1);
        existing.days += 1;
      } else {
        tracks.set(key, { name, artist, plays: Number(track.plays ?? 1), days: 1 });
      }
    });
  });
  return Array.from(tracks.values()).sort((a, b) => b.plays - a.plays || b.days - a.days).slice(0, 8);
}

function aggregateTopArtists(days: ConsumptionPayload[]) {
  const artists = new Map<string, { artist: string; plays: number }>();
  days.forEach((day) => {
    (day.topTracks ?? []).forEach((track) => {
      const artist = track.artist?.trim() || 'Unknown artist';
      artists.set(artist, {
        artist,
        plays: (artists.get(artist)?.plays ?? 0) + Number(track.plays ?? 1),
      });
    });
  });
  return Array.from(artists.values()).sort((a, b) => b.plays - a.plays).slice(0, 5);
}

export function SpotifyInsightsBoard({ days }: SpotifyInsightsBoardProps) {
  if (!days.length) {
    return (
      <div className="mx-4 rounded-[28px] p-5 mb-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Spotify analysis</p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          No Spotify listening history is available in this range yet.
        </p>
      </div>
    );
  }

  const totalHours = days.reduce((sum, day) => sum + day.listeningHours, 0);
  const activeDays = days.filter((day) => day.listeningHours > 0).length;
  const totalDiscoveries = days.reduce((sum, day) => sum + day.newDiscoveries, 0);
  const avgValence = average(days.map((day) => day.averageValence ?? 0));
  const avgEnergy = average(days.map((day) => day.averageEnergy ?? 0));
  const avgDanceability = average(days.map((day) => day.averageDanceability ?? 0));
  const moodDescriptors = moodReadout(avgValence, avgEnergy, avgDanceability);
  const splitIndex = Math.max(1, Math.floor(days.length / 2));
  const earlyDays = days.slice(0, splitIndex);
  const lateDays = days.slice(splitIndex);
  const valenceShift = average(lateDays.map((day) => day.averageValence ?? 0)) - average(earlyDays.map((day) => day.averageValence ?? 0));
  const energyShift = average(lateDays.map((day) => day.averageEnergy ?? 0)) - average(earlyDays.map((day) => day.averageEnergy ?? 0));
  const danceShift = average(lateDays.map((day) => day.averageDanceability ?? 0)) - average(earlyDays.map((day) => day.averageDanceability ?? 0));
  const topGenres = aggregateTopGenres(days);
  const topTracks = aggregateTopTracks(days);
  const topArtists = aggregateTopArtists(days);
  const replayShare = topTracks.reduce((sum, track) => sum + track.plays, 0) / Math.max(1, activeDays);
  const consistencyScore = activeDays / Math.max(1, days.length);
  const rangeLabel = days.length <= 1 ? 'selected day' : `${days.length}-day range`;

  const narrative = [
    `Across this ${rangeLabel}, Spotify feels ${moodDescriptors.join(', ')} rather than random background noise.`,
    `Mood drift looks ${describeDirection(valenceShift, 'lighter lately', 'more introspective lately', 'fairly stable')}, while the overall pace is ${describeDirection(energyShift, 'picking up', 'cooling down', 'holding steady')}.`,
    totalDiscoveries > activeDays
      ? 'There is a real novelty habit here, with discovery showing up as a meaningful part of the listening pattern.'
      : 'This period leans more toward familiar rotation than discovery, which can mean comfort, routine, or both.',
  ].join(' ');

  return (
    <div className="mx-4 rounded-[28px] p-5 mb-4" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Spotify analysis</p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            A deeper read on your listening mood, repetition, discovery, and overall pattern.
          </p>
        </div>
        <div className="rounded-2xl px-3 py-2 text-right" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Listening</p>
          <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{totalHours.toFixed(1)}h</p>
        </div>
      </div>

      <div className="mt-4 rounded-[24px] p-4" style={{ background: 'linear-gradient(135deg, rgba(58,134,255,0.12) 0%, rgba(82,183,136,0.12) 45%, rgba(244,211,94,0.14) 100%)', border: '1px solid rgba(82,183,136,0.18)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Reading</p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>{narrative}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 md:grid-cols-4">
        {[
          { label: 'Mood', value: avgValence.toFixed(2), note: moodDescriptors[0] },
          { label: 'Energy', value: avgEnergy.toFixed(2), note: moodDescriptors[1] },
          { label: 'Danceability', value: avgDanceability.toFixed(2), note: moodDescriptors[2] },
          { label: 'Discovery', value: `${totalDiscoveries}`, note: `${activeDays} active days` },
        ].map((metric) => (
          <div key={metric.label} className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>{metric.label}</p>
            <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{metric.value}</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>{metric.note}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 mt-4 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Trend shifts</p>
          <div className="mt-4 space-y-3">
            {[
              { label: 'Mood drift', value: valenceShift, positive: 'More uplifting', negative: 'More reflective', neutral: 'Stable' },
              { label: 'Intensity drift', value: energyShift, positive: 'More charged', negative: 'More low-key', neutral: 'Stable' },
              { label: 'Movement drift', value: danceShift, positive: 'More body-led', negative: 'More still', neutral: 'Stable' },
            ].map((item) => {
              const summary = describeDirection(item.value, item.positive, item.negative, item.neutral);
              const width = Math.min(100, Math.max(8, Math.abs(item.value) * 140));
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{item.label}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{summary}</p>
                  </div>
                  <div className="mt-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${width}%`,
                        backgroundColor: item.value >= 0 ? 'var(--color-primary)' : '#E76F51',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Consistency</p>
              <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{Math.round(consistencyScore * 100)}%</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>days with Spotify activity</p>
            </div>
            <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Replay pull</p>
              <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{replayShare.toFixed(1)}</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>top-track plays per active day</p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Genre rotation</p>
          <div className="mt-4 space-y-3">
            {topGenres.map((genre) => (
              <div key={genre.genre}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{genre.genre}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{genre.score}</p>
                </div>
                <div className="mt-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <div className="h-2 rounded-full" style={{ width: `${Math.max(12, genre.score * 8)}%`, backgroundColor: 'var(--color-primary)' }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Most present artists</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {topArtists.map((artist) => (
              <span
                key={artist.artist}
                className="rounded-full px-3 py-2 text-xs font-medium"
                style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              >
                {artist.artist} · {artist.plays}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[24px] p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Most repeated songs</p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              This is the part of the range that looks most habitual or emotionally sticky.
            </p>
          </div>
          <div className="rounded-2xl px-3 py-2 text-right" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-muted)' }}>Active days</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{activeDays}</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {topTracks.map((track, index) => (
            <div
              key={`${track.name}-${track.artist}`}
              className="rounded-2xl px-4 py-3"
              style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
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
                  <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{track.days} days</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
