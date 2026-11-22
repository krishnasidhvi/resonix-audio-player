// LRCLIB: free, open, community-built synced lyrics database. https://lrclib.net
import { getJson, qs } from '../http';
import { db } from '../db';
import type { Track } from '../types';
import { parseLrc, type LyricLine } from './lrc';

interface LrcRecord {
  trackName: string;
  artistName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

export interface Lyrics {
  synced: boolean;
  instrumental: boolean;
  lines: LyricLine[];
  /** Plain text when not synced. */
  plain?: string;
  /** true when these are the user's own edited lyrics (stored on this device). */
  local?: boolean;
}

const cache = new Map<string, Lyrics | null>();

/** Strip "(Official Video)", "[Remastered]", "feat. X" etc. so lookups match. */
export function cleanTitle(t: string): string {
  return t
    .replace(/\s*[([][^)\]]*(official|video|audio|lyric|remaster|explicit|hd|hq|visuali[sz]er)[^)\]]*[)\]]/gi, '')
    .replace(/\s+(feat\.?|ft\.?)\s.*$/i, '')
    .trim();
}

function toLyrics(r: LrcRecord): Lyrics {
  if (r.syncedLyrics) return { synced: true, instrumental: r.instrumental, lines: parseLrc(r.syncedLyrics) };
  return { synced: false, instrumental: r.instrumental, lines: [], plain: r.plainLyrics ?? '' };
}

/** Lyrics the user edited or synced in Resonix (stored on this device) take priority over LRCLIB. */
export interface LocalLyrics { lrc?: string; plain?: string; updated: number }
export async function localLyrics(id: string): Promise<LocalLyrics | undefined> {
  return db.get<LocalLyrics>('lyrics', id).catch(() => undefined);
}
export async function saveLocalLyrics(id: string, data: Omit<LocalLyrics, 'updated'>): Promise<void> {
  await db.set('lyrics', id, { ...data, updated: Date.now() });
  cache.delete(id);
}
export async function removeLocalLyrics(id: string): Promise<void> {
  await db.del('lyrics', id);
  cache.delete(id);
}

// Lyrics of tracks saved for offline listening, kept next to the audio (see stores/offline.svelte.ts).
const savedKey = (id: string) => `lyr:${id}`;
/** Fetch and keep a track's LRCLIB lyrics on this device. */
export async function keepLyricsOffline(track: Track): Promise<void> {
  const l = await fetchLyrics(track);
  if (l && !l.local) await db.set('offline', savedKey(track.id), JSON.parse(JSON.stringify(l)));
}
export async function forgetSavedLyrics(id: string): Promise<void> {
  await db.del('offline', savedKey(id));
  if (!cache.get(id)?.local) cache.delete(id);
}

export async function fetchLyrics(track: Track): Promise<Lyrics | null> {
  if (track.isLive) return null;
  if (cache.has(track.id)) return cache.get(track.id)!;
  const mine = await localLyrics(track.id);
  if (mine?.lrc) { const l: Lyrics = { synced: true, instrumental: false, lines: parseLrc(mine.lrc), local: true }; cache.set(track.id, l); return l; }
  if (mine?.plain) { const l: Lyrics = { synced: false, instrumental: false, lines: [], plain: mine.plain, local: true }; cache.set(track.id, l); return l; }
  const kept = await db.get<Lyrics>('offline', savedKey(track.id)).catch(() => undefined);
  if (kept) { cache.set(track.id, kept); return kept; }
  const title = cleanTitle(track.title);
  let artist = track.artist;
  // Many uploads are named "Artist - Title"
  let name = title;
  const dash = title.split(/\s+[-–]\s+/);
  if (dash.length === 2 && /unknown/i.test(artist)) { artist = dash[0]; name = dash[1]; }

  let result: Lyrics | null = null;
  try {
    const exact = await getJson<LrcRecord>(
      `https://lrclib.net/api/get?${qs({ track_name: name, artist_name: artist, album_name: track.album, duration: track.duration || undefined })}`,
      8000,
    ).catch(() => null);
    if (exact && (exact.syncedLyrics || exact.plainLyrics)) result = toLyrics(exact);
    else {
      const list = await getJson<LrcRecord[]>(`https://lrclib.net/api/search?${qs({ track_name: name, artist_name: artist })}`, 8000);
      // prefer synced, and a duration within 3 s when we know it
      const close = (r: LrcRecord) => !track.duration || Math.abs(r.duration - track.duration) <= 3;
      const pick = list.find((r) => r.syncedLyrics && close(r)) ?? list.find((r) => close(r) && r.plainLyrics);
      if (pick) result = toLyrics(pick);
    }
  } catch { return null; } // network trouble: don't remember "no lyrics", try again next time
  cache.set(track.id, result);
  return result;
}
