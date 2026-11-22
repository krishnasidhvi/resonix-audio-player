// "Save for offline": keeps the audio of openly licensed tracks in IndexedDB so they play
// without a connection. Only sources whose licence allows copying are eligible:
//   • Internet Archive items (Resonix only lists CC / public-domain ones)
//   • Openverse tracks under a Creative Commons or public-domain licence
// Not eligible: Audius (downloads are the artist's choice, and its API refuses them),
// YouTube (never downloadable under YouTube's terms), radio (live), local files (already here).
//
// A saved track also keeps its cover art and lyrics, so it looks and works the same offline.
// IndexedDB 'offline' store keys: <track id> → audio Blob, 'art:<id>' → cover Blob,
// 'lyr:<id>' → lyrics (see lyrics/lrclib.ts).
import { db } from '../db';
import type { Track } from '../types';
import { t } from '../i18n/i18n.svelte';
import { forgetSavedLyrics, keepLyricsOffline } from '../lyrics/lrclib';

export interface OfflineEntry { track: Track; bytes: number; savedAt: number }

/** Covers whose host doesn't allow reading them from a page (no CORS) are kept here instead,
 *  and the service worker (public/sw.js) answers image requests from it. */
export const ART_CACHE = 'resonix-offline-art';

const isOpenLicence = (tr: Track) => /^(CC|Public domain)/i.test(tr.license?.name ?? '');

export function canSaveOffline(tr: Track): boolean {
  if (!tr.streamUrl || tr.isLive) return false;
  if (tr.source === 'archive') return true;
  if (tr.source === 'openverse') return isOpenLicence(tr);
  return false;
}

export const fmtBytes = (b: number) => new Intl.NumberFormat(undefined, {
  style: 'unit', unit: b >= 1e9 ? 'gigabyte' : 'megabyte', maximumFractionDigits: 1,
}).format(b >= 1e9 ? b / 1e9 : b / 1e6);

const isQuota = (e: unknown) => (e as DOMException)?.name === 'QuotaExceededError';

class Offline {
  entries: OfflineEntry[] = $state([]);
  /** track id → bytes received so far, and the full size when the host sends it */
  progress: Record<string, { got: number; total: number }> = $state({});
  /** remote cover URL → blob: URL of the copy kept on this device */
  artUrls: Record<string, string> = $state({});
  /** false while the device has no network connection */
  online = $state(typeof navigator === 'undefined' ? true : navigator.onLine);
  /** "save all" in progress */
  batch: { done: number; total: number } | null = $state(null);
  private stopRequested = false;
  private loaded: Promise<void> | null = null;

  ids = $derived(new Set(this.entries.map((e) => e.track.id)));
  totalBytes = $derived(this.entries.reduce((s, e) => s + e.bytes, 0));

  load(): Promise<void> {
    this.loaded ??= (async () => {
      addEventListener('online', () => (this.online = true));
      addEventListener('offline', () => (this.online = false));
      this.entries = (await db.get<OfflineEntry[]>('kv', 'offline-index').catch(() => undefined)) ?? [];
      for (const e of this.entries) {
        const url = e.track.artwork;
        if (!url || this.artUrls[url]) continue;
        const art = await db.get<Blob>('offline', `art:${e.track.id}`).catch(() => undefined);
        if (art) this.artUrls[url] = URL.createObjectURL(art);
      }
    })();
    return this.loaded;
  }

  has(id: string) { return this.ids.has(id); }

  /** Can this track play with no connection? */
  playableOffline(tr: Track) { return tr.source === 'local' || this.has(tr.id); }

  /** The on-device copy of a cover when there is one, otherwise the URL itself. */
  artFor(url: string | undefined): string | undefined { return url ? this.artUrls[url] ?? url : url; }

  /** "Saving… 42%", or "Saving… 3.1 MB" when the host doesn't say how big the file is. */
  savingLabel(id: string): string {
    const p = this.progress[id];
    if (!p) return t('offline.save');
    return p.total ? t('offline.saving', { pct: Math.round((p.got / p.total) * 100) }) : t('offline.savingSize', { size: fmtBytes(p.got) });
  }

  async blob(id: string): Promise<Blob | undefined> {
    return this.has(id) ? db.get<Blob>('offline', id) : undefined;
  }

  private persistIndex() {
    void db.set('kv', 'offline-index', JSON.parse(JSON.stringify(this.entries)));
  }

  async save(tr: Track): Promise<void> {
    if (!canSaveOffline(tr)) throw new Error(t('offline.notEligible'));
    if (this.has(tr.id) || tr.id in this.progress) return;
    // ask the browser not to evict saved music when storage gets tight
    void navigator.storage?.persist?.();
    this.progress[tr.id] = { got: 0, total: 0 };
    try {
      let res: Response;
      try { res = await fetch(tr.streamUrl!); }
      // a TypeError here almost always means the host doesn't let pages read its files (no CORS)
      catch { throw new Error(this.online ? t('offline.noCors') : t('offline.banner')); }
      if (!res.ok || !res.body) throw new Error(t('offline.failed', { status: res.status }));
      const total = Number(res.headers.get('content-length') || 0);
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        got += value.length;
        this.progress[tr.id] = { got, total };
      }
      const blob = new Blob(chunks as BlobPart[], { type: res.headers.get('content-type') || 'audio/mpeg' });
      await db.set('offline', tr.id, blob);
      // cover and lyrics are extras: a track still counts as saved if they can't be fetched
      await Promise.all([this.saveArt(tr).catch(() => {}), keepLyricsOffline(tr).catch(() => {})]);
      const track = JSON.parse(JSON.stringify(tr)) as Track;
      this.entries = [{ track, bytes: blob.size, savedAt: Date.now() }, ...this.entries.filter((e) => e.track.id !== tr.id)];
      this.persistIndex();
    } catch (e) {
      if (isQuota(e)) throw Object.assign(new Error(t('offline.full')), { name: 'QuotaExceededError' });
      throw e;
    } finally {
      delete this.progress[tr.id];
    }
  }

  private async saveArt(tr: Track) {
    const url = tr.artwork;
    if (!url || !/^https?:/.test(url) || this.artUrls[url]) return;
    try {
      const res = await fetch(url);
      const img = res.ok ? await res.blob() : null;
      if (!img || !img.type.startsWith('image/')) throw new Error('not an image');
      await db.set('offline', `art:${tr.id}`, img);
      this.artUrls[url] = URL.createObjectURL(img);
    } catch {
      // the host doesn't allow reading the image: keep an opaque copy for the service worker to serve
      if (!('caches' in globalThis)) return;
      const opaque = await fetch(url, { mode: 'no-cors' });
      await (await caches.open(ART_CACHE)).put(url, opaque);
    }
  }

  /** Save every eligible track in a list, one after another. Returns how many were saved. */
  async saveAll(tracks: Track[]): Promise<{ saved: number; total: number }> {
    const todo = tracks.filter((tr) => canSaveOffline(tr) && !this.has(tr.id) && !(tr.id in this.progress));
    if (!todo.length || this.batch) return { saved: 0, total: 0 };
    this.batch = { done: 0, total: todo.length };
    this.stopRequested = false;
    let saved = 0;
    try {
      for (const tr of todo) {
        if (this.stopRequested || !this.online) break;
        try { await this.save(tr); saved++; } catch (e) { if (isQuota(e)) throw e; } // one track failing doesn't stop the rest; a full disk does
        this.batch.done++;
      }
    } finally {
      this.batch = null;
    }
    return { saved, total: todo.length };
  }

  /** Stop a "save all" after the track that is downloading now. */
  stopBatch() { this.stopRequested = true; }

  /** How many tracks of a list could still be saved. */
  unsaved(tracks: Track[]) { return tracks.filter((tr) => canSaveOffline(tr) && !this.has(tr.id)).length; }

  async remove(id: string) {
    const entry = this.entries.find((e) => e.track.id === id);
    await Promise.all([db.del('offline', id), db.del('offline', `art:${id}`), forgetSavedLyrics(id)]);
    this.entries = this.entries.filter((e) => e.track.id !== id);
    this.persistIndex();
    // drop the cover only when no other saved track shares it (tracks of one album do)
    const url = entry?.track.artwork;
    if (url && !this.entries.some((e) => e.track.artwork === url)) {
      if (this.artUrls[url]) { URL.revokeObjectURL(this.artUrls[url]); delete this.artUrls[url]; }
      if ('caches' in globalThis) void caches.open(ART_CACHE).then((c) => c.delete(url)).catch(() => {});
    }
  }

  async clear() {
    await db.clear('offline');
    for (const u of Object.values(this.artUrls)) URL.revokeObjectURL(u);
    this.artUrls = {};
    if ('caches' in globalThis) await caches.delete(ART_CACHE).catch(() => {});
    this.entries = [];
    this.persistIndex();
  }
}

export const offline = new Offline();
