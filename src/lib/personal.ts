// Personal rows for Home: "Because you played …" and a daily mix.
// Built only from this browser's own history and favourites plus the open-source recommender.
import { db } from './db';
import { similarTo } from './recommend';
import type { Track } from './types';

const becauseCache = new Map<string, Track[]>();

/** Similar music for the most recent (non-live) track; cached per seed for the session. */
export async function becauseYouPlayed(recent: Track[], local: Track[]): Promise<{ seed: Track; tracks: Track[] } | null> {
  const seed = recent.find((t) => !t.isLive && t.source !== 'radio');
  if (!seed) return null;
  if (!becauseCache.has(seed.id)) {
    const recs = await similarTo(seed, local, new Set(recent.map((t) => t.id)), 14).catch(() => []);
    becauseCache.set(seed.id, recs.map((r) => r.track));
  }
  const tracks = becauseCache.get(seed.id)!;
  return tracks.length ? { seed, tracks } : null;
}

/** Deterministic shuffle so the mix stays the same all day. */
function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Up to 25 tracks: favourites and recent plays, topped up with music like them. New each day. */
export async function dailyMix(favorites: Track[], recent: Track[], local: Track[]): Promise<Track[]> {
  const cached = await db.get<{ date: string; tracks: Track[] }>('kv', 'daily-mix').catch(() => undefined);
  if (cached?.date === today() && cached.tracks.length) return cached.tracks;
  const own = [...favorites, ...recent].filter((t, i, a) => !t.isLive && a.findIndex((x) => x.id === t.id) === i);
  if (own.length < 3) return [];
  const seeds = seededShuffle(own, today()).slice(0, 2);
  const extra = (await Promise.all(seeds.map((s) => similarTo(s, local, new Set(own.map((t) => t.id)), 8).catch(() => []))))
    .flat().map((r) => r.track);
  const pool = [...seededShuffle(own, today()).slice(0, 15), ...extra].filter((t, i, a) => a.findIndex((x) => x.id === t.id) === i);
  const tracks = seededShuffle(pool, today() + 'mix').slice(0, 25);
  // JSON clone: these may be reactive proxies, which IndexedDB can't store
  void db.set('kv', 'daily-mix', { date: today(), tracks: JSON.parse(JSON.stringify(tracks)) }).catch(() => {});
  return tracks;
}
