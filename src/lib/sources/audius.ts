// Audius: open, decentralised music platform with a public read API.
// https://docs.audius.org  — full-length streams, artist-uploaded.
import { getJson, qs } from '../http';
import type { Track } from '../types';

const APP = 'resonix-open-player';
let hostPromise: Promise<string> | null = null;

/** Audius publishes its healthy discovery hosts at api.audius.co. */
function host(): Promise<string> {
  hostPromise ??= getJson<{ data: string[] }>('https://api.audius.co', 8000)
    .then((r) => r.data[Math.floor(Math.random() * r.data.length)] ?? 'https://api.audius.co')
    .catch(() => 'https://api.audius.co');
  return hostPromise;
}

interface AudiusTrack {
  id: string;
  title: string;
  duration: number;
  genre?: string;
  mood?: string;
  permalink?: string;
  artwork?: Record<string, string> | null;
  user: { id: string; name: string; handle: string };
  tags?: string | null;
  is_streamable?: boolean;
  is_available?: boolean;
}

function map(t: AudiusTrack, base: string): Track {
  const art = t.artwork?.['480x480'] ?? t.artwork?.['1000x1000'] ?? t.artwork?.['150x150'];
  return {
    id: `audius:${t.id}`,
    source: 'audius',
    title: t.title,
    artist: t.user?.name ?? 'Unknown artist',
    duration: t.duration ?? 0,
    artwork: art,
    genre: t.genre || undefined,
    mood: t.mood || undefined,
    tags: t.tags ? t.tags.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 6) : undefined,
    artistId: t.user?.id,
    streamUrl: `${base}/v1/tracks/${t.id}/stream?app_name=${APP}`,
    pageUrl: t.permalink ? `https://audius.co${t.permalink}` : `https://audius.co/${t.user?.handle ?? ''}`,
    license: { name: 'Artist upload (Audius)', url: 'https://audius.co/legal/terms-of-use' },
    cors: true,
  };
}

const playable = (t: AudiusTrack) => t.is_available !== false && t.is_streamable !== false;

export async function audiusTrending(genre?: string, time: 'week' | 'month' | 'allTime' = 'week'): Promise<Track[]> {
  const base = await host();
  const r = await getJson<{ data: AudiusTrack[] }>(`${base}/v1/tracks/trending?${qs({ app_name: APP, genre, time, limit: 40 })}`);
  return r.data.filter(playable).map((t) => map(t, base));
}

export async function audiusSearch(query: string, offset = 0): Promise<Track[]> {
  const base = await host();
  const r = await getJson<{ data: AudiusTrack[] }>(
    `${base}/v1/tracks/search?${qs({ app_name: APP, query, limit: 30, offset })}`,
  );
  return r.data.filter(playable).map((t) => map(t, base));
}

/** Other tracks by the same Audius artist, most played first. */
export async function audiusArtistTracks(userId: string, limit = 12): Promise<Track[]> {
  const base = await host();
  const r = await getJson<{ data: AudiusTrack[] }>(`${base}/v1/users/${encodeURIComponent(userId)}/tracks?${qs({ app_name: APP, limit, sort: 'plays' })}`);
  return r.data.filter(playable).map((t) => map(t, base));
}

/** Artists Audius considers related (by shared listeners). */
export async function audiusRelatedArtists(userId: string, limit = 6): Promise<{ id: string; name: string }[]> {
  const base = await host();
  const r = await getJson<{ data: { id: string; name: string }[] }>(`${base}/v1/users/${encodeURIComponent(userId)}/related?${qs({ app_name: APP, limit })}`);
  return r.data.map((u) => ({ id: u.id, name: u.name }));
}

export const AUDIUS_GENRES = [
  'Electronic', 'Hip-Hop/Rap', 'Alternative', 'Pop', 'R&B/Soul', 'Lo-Fi', 'Ambient', 'House',
  'Drum & Bass', 'Techno', 'Rock', 'Jazz', 'Classical', 'World', 'Acoustic', 'Soundtrack',
];
