// "Similar to this": gathers candidates from every source that fits the current track,
// labels each with the reason it was picked, and reranks by measured sound where both
// tracks have been analysed. Only open sources and the user's own files are used.
import { allAnalyses, cachedAnalysis } from './audio/analysis';
import { soundSimilarity } from './recommend-core';
import { AUDIUS_GENRES, audiusArtistTracks, audiusRelatedArtists, audiusSearch, audiusTrending } from './sources/audius';
import { openverseSearch } from './sources/openverse';
import { radioSearch } from './sources/radio';
import { youtubeKey, youtubeSearch } from './sources/youtube';
import type { Track } from './types';

export { soundSimilarity };

export type RecReason = 'artist' | 'related' | 'genre' | 'tag' | 'sound' | 'station' | 'album';
export interface Rec { track: Track; reason: RecReason; score: number }

const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)|\[.*?\]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const key = (t: Track) => `${norm(t.artist)}|${norm(t.title)}`;

/** Map a free-text genre onto an Audius genre filter, if one matches. */
export function audiusGenre(genre?: string): string | undefined {
  if (!genre) return undefined;
  const g = genre.toLowerCase();
  return AUDIUS_GENRES.find((x) => g.includes(x.toLowerCase().split('/')[0].replace('-', ' ')) || x.toLowerCase().includes(g));
}

const BASE: Record<RecReason, number> = { artist: 0.75, album: 0.7, related: 0.65, station: 0.6, genre: 0.5, tag: 0.5, sound: 0.55 };

export async function similarTo(track: Track, local: Track[], exclude: Set<string> = new Set(), limit = 12): Promise<Rec[]> {
  const out = new Map<string, Rec>();
  const seen = new Set<string>([key(track), ...exclude]);
  const add = (tracks: Track[], reason: RecReason, max = 6) => {
    let n = 0;
    for (const t of tracks) {
      if (n >= max) break;
      const k = key(t);
      if (t.id === track.id || exclude.has(t.id) || seen.has(k)) continue;
      seen.add(k);
      out.set(t.id, { track: t, reason, score: BASE[reason] - n * 0.02 });
      n++;
    }
  };
  const safe = <T>(p: Promise<T>, fallback: T) => p.catch(() => fallback);
  const jobs: Promise<void>[] = [];

  if (track.source === 'radio') {
    const tag = track.genre ?? track.tags?.[0];
    if (tag) jobs.push(safe(radioSearch({ tag, limit: 12 }), []).then((r) => add(r, 'station', 10)));
  } else {
    // same artist / album
    const sameArtist = local.filter((t) => norm(t.artist) === norm(track.artist));
    add(sameArtist.filter((t) => track.album && t.album === track.album), 'album', 4);
    add(sameArtist, 'artist', 4);
    if (track.source === 'audius' && track.artistId) {
      jobs.push(safe(audiusArtistTracks(track.artistId), []).then((r) => add(r, 'artist', 4)));
      jobs.push(safe(audiusRelatedArtists(track.artistId, 4), []).then(async (artists) => {
        const lists = await Promise.all(artists.map((a) => safe(audiusArtistTracks(a.id, 3), [])));
        add(lists.flatMap((l) => l.slice(0, 2)), 'related', 6);
      }));
    } else if (track.source === 'youtube') {
      // costs one of the key's 100 daily searches, so only when a key is set
      if (youtubeKey()) jobs.push(safe(youtubeSearch(track.artist), []).then((r) => add(r, 'artist', 6)));
    } else if (track.source === 'openverse' && !/unknown/i.test(track.artist)) {
      jobs.push(safe(openverseSearch(track.artist, 1, 'creator'), []).then((r) => add(r, 'artist', 4)));
    } else if (!/unknown/i.test(track.artist) && track.source !== 'archive') {
      // Local or other files: independent artists sometimes publish on Audius too.
      jobs.push(safe(audiusSearch(track.artist), []).then((r) => add(r.filter((t) => norm(t.artist) === norm(track.artist)), 'artist', 3)));
    }
    // same genre
    const ag = audiusGenre(track.genre);
    if (ag) jobs.push(safe(audiusTrending(ag, 'month'), []).then((r) => add(r, 'genre', 5)));
    if (track.genre) add(local.filter((t) => t.genre && norm(t.genre) === norm(track.genre!)), 'genre', 4);
    // tags / mood
    const tags = [...(track.tags ?? []), track.mood].filter(Boolean).slice(0, 2) as string[];
    if (tags.length) jobs.push(safe(openverseSearch(tags.join(','), 1, 'tags'), []).then((r) => add(r, 'tag', 4)));
    else if (track.genre && !ag) jobs.push(safe(openverseSearch(track.genre), []).then((r) => add(r, 'tag', 4)));
  }

  await Promise.all(jobs);

  // Measured sound: rerank candidates with analyses and add close matches from everything analysed.
  const mine = await cachedAnalysis(track.id);
  if (mine) {
    for (const a of await allAnalyses()) {
      if (!a.track || a.track.id === track.id || exclude.has(a.track.id) || a.track.isLive) continue;
      const sim = soundSimilarity(mine, a);
      const existing = out.get(a.track.id);
      if (existing) existing.score += 0.3 * sim;
      else if (sim > 0.72 && !seen.has(key(a.track))) { seen.add(key(a.track)); out.set(a.track.id, { track: a.track, reason: 'sound', score: BASE.sound + 0.3 * sim }); }
    }
  }

  // Interleave reasons so one source doesn't flood the list, then cut.
  const sorted = [...out.values()].sort((a, b) => b.score - a.score);
  const byReason = new Map<RecReason, Rec[]>();
  for (const r of sorted) byReason.set(r.reason, [...(byReason.get(r.reason) ?? []), r]);
  const mixed: Rec[] = [];
  while (mixed.length < limit && [...byReason.values()].some((l) => l.length)) {
    for (const l of byReason.values()) if (l.length && mixed.length < limit) mixed.push(l.shift()!);
  }
  return mixed;
}
