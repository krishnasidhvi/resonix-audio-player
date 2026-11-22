import { db } from '../db';
import { localArtwork, removeLocal } from '../sources/local';
import type { Track } from '../types';

export interface Playlist { id: string; name: string; tracks: Track[]; created: number }

/** Strip runtime-only fields (object URLs) before persisting. */
const persistable = (t: Track): Track => (t.source === 'local' ? { ...t, artwork: undefined, streamUrl: undefined } : t);

class Library {
  local: Track[] = $state([]);
  favorites: Track[] = $state([]);
  playlists: Playlist[] = $state([]);
  recent: Track[] = $state([]);
  ready = $state(false);

  async load() {
    const [local, fav, pls, recent] = await Promise.all([
      db.get<Track[]>('kv', 'local'),
      db.get<Track[]>('kv', 'favorites'),
      db.get<Playlist[]>('kv', 'playlists'),
      db.get<Track[]>('kv', 'recent'),
    ]);
    this.local = local ?? [];
    this.favorites = fav ?? [];
    this.playlists = pls ?? [];
    this.recent = recent ?? [];
    this.ready = true;
    // attach embedded cover art for local files
    for (const t of this.local) {
      localArtwork(t).then((url) => { if (url) t.artwork = url; });
    }
  }

  private save(key: 'local' | 'favorites' | 'playlists' | 'recent') {
    const v = $state.snapshot(this[key]) as unknown;
    const clean = key === 'playlists'
      ? (v as Playlist[]).map((p) => ({ ...p, tracks: p.tracks.map(persistable) }))
      : (v as Track[]).map(persistable);
    void db.set('kv', key, clean);
  }

  async addLocal(tracks: Track[]) {
    const byId = new Map(this.local.map((t) => [t.id, t]));
    for (const t of tracks) byId.set(t.id, t);
    this.local = [...byId.values()].sort((a, b) => (a.artist + a.album + a.title).localeCompare(b.artist + b.album + b.title));
    this.save('local');
    for (const t of this.local) if (!t.artwork) localArtwork(t).then((url) => { if (url) t.artwork = url; });
  }

  async removeLocal(track: Track) {
    const art = this.local.find((t) => t.id === track.id)?.artwork;
    if (art?.startsWith('blob:')) URL.revokeObjectURL(art);
    await removeLocal(track);
    this.local = this.local.filter((t) => t.id !== track.id);
    this.save('local');
  }

  async clearLocal() {
    for (const t of this.local) { if (t.artwork?.startsWith('blob:')) URL.revokeObjectURL(t.artwork); await removeLocal(t); }
    this.local = [];
    await db.set('kv', 'folders', []);
    this.save('local');
  }

  setDuration(id: string, seconds: number) {
    const t = this.local.find((x) => x.id === id);
    if (t && !t.duration) { t.duration = seconds; this.save('local'); }
  }

  private favIds = $derived(new Set(this.favorites.map((t) => t.id)));
  isFavorite(id: string) { return this.favIds.has(id); }

  toggleFavorite(track: Track) {
    this.favorites = this.isFavorite(track.id)
      ? this.favorites.filter((t) => t.id !== track.id)
      : [$state.snapshot(track) as Track, ...this.favorites];
    this.save('favorites');
  }

  pushRecent(track: Track) {
    this.recent = [$state.snapshot(track) as Track, ...this.recent.filter((t) => t.id !== track.id)].slice(0, 40);
    this.save('recent');
  }

  createPlaylist(name: string, tracks: Track[] = []): Playlist {
    const p: Playlist = { id: crypto.randomUUID(), name, tracks: tracks.map((t) => $state.snapshot(t) as Track), created: Date.now() };
    this.playlists = [...this.playlists, p];
    this.save('playlists');
    return p;
  }

  addToPlaylist(id: string, tracks: Track[]) {
    const p = this.playlists.find((x) => x.id === id);
    if (!p) return;
    const have = new Set(p.tracks.map((t) => t.id));
    p.tracks.push(...tracks.filter((t) => !have.has(t.id)).map((t) => $state.snapshot(t) as Track));
    this.save('playlists');
  }

  removeFromPlaylist(id: string, trackId: string) {
    const p = this.playlists.find((x) => x.id === id);
    if (!p) return;
    p.tracks = p.tracks.filter((t) => t.id !== trackId);
    this.save('playlists');
  }

  renamePlaylist(id: string, name: string) {
    const p = this.playlists.find((x) => x.id === id);
    if (p) { p.name = name; this.save('playlists'); }
  }

  deletePlaylist(id: string) {
    this.playlists = this.playlists.filter((p) => p.id !== id);
    this.save('playlists');
  }
}

export const library = new Library();
