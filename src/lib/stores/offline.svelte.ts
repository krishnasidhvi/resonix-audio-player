// "Save for offline": keeps the audio of openly licensed tracks in IndexedDB so they play
// without a connection. Only sources whose licence allows copying are eligible:
//   • Internet Archive items (Resonix only lists CC / public-domain ones)
//   • Openverse tracks under a Creative Commons or public-domain licence
// Not eligible: Audius (downloads are the artist's choice, and its API refuses them),
// YouTube (never downloadable under YouTube's terms), radio (live), local files (already here).
import { db } from '../db';
import type { Track } from '../types';

export interface OfflineEntry { track: Track; bytes: number; savedAt: number }

const isOpenLicence = (t: Track) => /^(CC|Public domain)/i.test(t.license?.name ?? '');

export function canSaveOffline(t: Track): boolean {
  if (!t.streamUrl || t.isLive) return false;
  if (t.source === 'archive') return true;
  if (t.source === 'openverse') return isOpenLicence(t);
  return false;
}

class Offline {
  entries: OfflineEntry[] = $state([]);
  /** track id → 0..1 while downloading */
  progress: Record<string, number> = $state({});
  private loaded = false;

  ids = $derived(new Set(this.entries.map((e) => e.track.id)));
  totalBytes = $derived(this.entries.reduce((s, e) => s + e.bytes, 0));

  async load() {
    if (this.loaded) return;
    this.loaded = true;
    this.entries = (await db.get<OfflineEntry[]>('kv', 'offline-index').catch(() => undefined)) ?? [];
  }

  has(id: string) { return this.ids.has(id); }

  async blob(id: string): Promise<Blob | undefined> {
    return this.has(id) ? db.get<Blob>('offline', id) : undefined;
  }

  private persistIndex() {
    void db.set('kv', 'offline-index', JSON.parse(JSON.stringify(this.entries)));
  }

  async save(t: Track): Promise<void> {
    if (!canSaveOffline(t)) throw new Error('This track can’t be saved for offline listening.');
    if (this.has(t.id) || t.id in this.progress) return;
    // ask the browser not to evict saved music when storage gets tight
    void navigator.storage?.persist?.();
    this.progress[t.id] = 0;
    try {
      const res = await fetch(t.streamUrl!);
      if (!res.ok || !res.body) throw new Error(`Download failed (${res.status})`);
      const total = Number(res.headers.get('content-length') || 0);
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        got += value.length;
        if (total) this.progress[t.id] = got / total;
      }
      const blob = new Blob(chunks as BlobPart[], { type: res.headers.get('content-type') || 'audio/mpeg' });
      await db.set('offline', t.id, blob);
      const track = JSON.parse(JSON.stringify(t)) as Track;
      this.entries = [{ track, bytes: blob.size, savedAt: Date.now() }, ...this.entries.filter((e) => e.track.id !== t.id)];
      this.persistIndex();
    } catch (e) {
      // most likely the host doesn't allow the browser to read the file (no CORS)
      throw new Error((e as Error).name === 'TypeError' ? 'This host doesn’t allow saving its files from the browser.' : (e as Error).message);
    } finally {
      delete this.progress[t.id];
    }
  }

  async remove(id: string) {
    await db.del('offline', id);
    this.entries = this.entries.filter((e) => e.track.id !== id);
    this.persistIndex();
  }

  async clear() {
    await db.clear('offline');
    this.entries = [];
    this.persistIndex();
  }
}

export const offline = new Offline();
