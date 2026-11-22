import type { SearchResult, SourceId, Track } from '../types';
import type { Album } from './album';
import { audiusSearch } from './audius';
import { archiveSearch } from './archive';
import { openverseSearch } from './openverse';
import { jamendoKey, jamendoSearch } from './jamendo';
import { radioSearch } from './radio';

export interface SourceInfo { id: SourceId; name: string; blurb: string; url: string; color: string }

export const SOURCES: Record<SourceId, SourceInfo> = {
  local: { id: 'local', name: 'Your library', blurb: 'Files on this device', url: '', color: 'oklch(78% 0.13 160)' },
  audius: { id: 'audius', name: 'Audius', blurb: 'Independent artists, full tracks', url: 'https://audius.co', color: 'oklch(70% 0.19 300)' },
  archive: { id: 'archive', name: 'Internet Archive', blurb: 'CC & public-domain recordings', url: 'https://archive.org/details/audio', color: 'oklch(80% 0.08 80)' },
  openverse: { id: 'openverse', name: 'Openverse', blurb: 'Jamendo, Wikimedia, ccMixter & more', url: 'https://openverse.org', color: 'oklch(76% 0.15 30)' },
  jamendo: { id: 'jamendo', name: 'Jamendo', blurb: 'Creative Commons catalogue', url: 'https://www.jamendo.com', color: 'oklch(74% 0.15 0)' },
  radio: { id: 'radio', name: 'Radio Browser', blurb: 'Live internet radio', url: 'https://www.radio-browser.info', color: 'oklch(78% 0.14 220)' },
  youtube: { id: 'youtube', name: 'YouTube', blurb: 'Official uploads, in YouTube’s player', url: 'https://www.youtube.com', color: 'oklch(64% 0.22 27)' },
};

export interface UnifiedResults { tracks: SearchResult[]; albums: Album[]; albumError?: string }

const wrap = async (source: SourceId, p: Promise<Track[]>): Promise<SearchResult> => {
  try { return { source, tracks: await p }; } catch (e) { return { source, tracks: [], error: (e as Error).message }; }
};

/** Search every online source in parallel; each source fails independently. */
export async function searchAll(query: string, local: Track[]): Promise<UnifiedResults> {
  const q = query.toLowerCase();
  const localHits = local.filter((t) => `${t.title} ${t.artist} ${t.album ?? ''}`.toLowerCase().includes(q));
  const jobs: Promise<SearchResult>[] = [
    Promise.resolve({ source: 'local', tracks: localHits }),
    wrap('audius', audiusSearch(query)),
    wrap('openverse', openverseSearch(query)),
    wrap('radio', radioSearch({ name: query, limit: 12 })),
  ];
  if (jamendoKey()) jobs.push(wrap('jamendo', jamendoSearch(query)));
  const [tracks, albums] = await Promise.all([
    Promise.all(jobs),
    archiveSearch(query).then((a) => ({ a })).catch((e: Error) => ({ a: [] as Album[], e: e.message })),
  ]);
  return { tracks, albums: albums.a, albumError: 'e' in albums ? albums.e : undefined };
}
