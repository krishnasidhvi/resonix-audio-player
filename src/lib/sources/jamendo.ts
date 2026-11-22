// Jamendo: 600k+ Creative Commons tracks. Needs a free client_id from
// https://devportal.jamendo.com — set it in Settings (or VITE_JAMENDO_CLIENT_ID at build time).
// Without a key, Jamendo music is still reachable through Openverse.
import { getJson, qs } from '../http';
import { licenseFromUrl } from '../license';
import type { Track } from '../types';

interface JTrack {
  id: string;
  name: string;
  duration: number;
  artist_name: string;
  album_name?: string;
  image?: string;
  audio: string;
  shareurl?: string;
  license_ccurl?: string;
  musicinfo?: { tags?: { genres?: string[] } };
}

export function jamendoKey(): string {
  return localStorage.getItem('jamendo_client_id') || import.meta.env.VITE_JAMENDO_CLIENT_ID || '';
}

async function call(params: Record<string, string | number | undefined>): Promise<Track[]> {
  const key = jamendoKey();
  if (!key) throw new Error('Add a free Jamendo client ID in Settings to search Jamendo directly');
  const r = await getJson<{ headers: { status: string; error_message?: string }; results: JTrack[] }>(
    `https://api.jamendo.com/v3.0/tracks/?${qs({ client_id: key, format: 'json', limit: 30, include: 'musicinfo', audioformat: 'mp32', ...params })}`,
  );
  if (r.headers.status !== 'success') throw new Error(r.headers.error_message || 'Jamendo error');
  return r.results.map((t) => ({
    id: `jamendo:${t.id}`,
    source: 'jamendo',
    title: t.name,
    artist: t.artist_name,
    album: t.album_name,
    duration: t.duration,
    artwork: t.image,
    streamUrl: t.audio,
    pageUrl: t.shareurl,
    license: licenseFromUrl(t.license_ccurl),
    genre: t.musicinfo?.tags?.genres?.[0],
    format: 'MP3',
    cors: false, // storage.jamendo.com sends no CORS headers
  }));
}

export const jamendoSearch = (query: string, offset = 0) => call({ search: query, offset, order: 'relevance' });
export const jamendoPopular = (tag?: string) => call({ order: 'popularity_week', tags: tag });
