// Openverse (WordPress Foundation): search engine for openly licensed media.
// Its audio index covers Jamendo, Wikimedia Commons, ccMixter, Freesound and more.
// Anonymous access is rate-limited but needs no key.
import { getJson, qs } from '../http';
import { licenseFromCode } from '../license';
import type { Track } from '../types';
import { safeUrl } from '../a11y';

interface OvAudio {
  id: string;
  title: string;
  url: string;
  creator?: string;
  foreign_landing_url?: string;
  license: string;
  license_version?: string;
  license_url?: string;
  provider?: string;
  source?: string;
  duration?: number | null;
  filetype?: string;
  bit_rate?: number | null;
  thumbnail?: string | null;
  genres?: string[] | null;
  tags?: { name: string }[] | null;
}

const PROVIDER_LABEL: Record<string, string> = {
  jamendo: 'Jamendo',
  wikimedia_audio: 'Wikimedia Commons',
  ccmixter: 'ccMixter',
  freesound: 'Freesound',
};

export async function openverseSearch(query: string, page = 1, by: 'q' | 'creator' | 'tags' = 'q'): Promise<Track[]> {
  // category=music drops sound effects; length=medium,long drops snippets under ~30s.
  const url = `https://api.openverse.org/v1/audio/?${qs({ [by]: query, page, page_size: 20 /* anonymous max */, category: 'music', length: 'medium,long', mature: false })}`;
  const r = await getJson<{ results: OvAudio[] }>(url);
  return r.results.map((a): Track => ({
    id: `openverse:${a.id}`,
    source: 'openverse',
    title: a.title || 'Untitled',
    artist: a.creator || 'Unknown artist',
    album: PROVIDER_LABEL[a.source ?? ''] ?? a.source,
    duration: a.duration ? Math.round(a.duration / 1000) : 0,
    // Openverse proxies thumbnails with CORS; the raw provider URL may not allow it.
    artwork: a.thumbnail ? `https://api.openverse.org/v1/audio/${a.id}/thumb/` : undefined,
    streamUrl: a.url,
    pageUrl: safeUrl(a.foreign_landing_url),
    license: licenseFromCode(a.license, a.license_version, a.license_url),
    genre: a.genres?.[0],
    tags: (a.tags ?? []).map((x) => x.name).filter((n) => n && n.length < 24).slice(0, 6),
    format: a.filetype?.toUpperCase(),
    bitrate: a.bit_rate ?? undefined,
    cors: a.source === 'jamendo' ? false : undefined, // Jamendo storage has no CORS; others are probed
  }));
}
