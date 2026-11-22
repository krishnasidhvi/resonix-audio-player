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
  user: { name: string; handle: string };
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

export const AUDIUS_GENRES = [
  'Electronic', 'Hip-Hop/Rap', 'Alternative', 'Pop', 'R&B/Soul', 'Lo-Fi', 'Ambient', 'House',
  'Drum & Bass', 'Techno', 'Rock', 'Jazz', 'Classical', 'World', 'Acoustic', 'Soundtrack',
];
