// Local library: folders picked with the File System Access API (Chromium; handles persist
// across visits) or files from a plain <input> / drag-and-drop (all browsers; File objects
// are stored in IndexedDB so they persist too).
import { db } from '../db';
import { AUDIO_EXT, readTags, tagsFromFilename } from '../tags';
import type { Track } from '../types';

type Entry = File | FileSystemFileHandle;

export const canPickFolder = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

async function* walk(dir: FileSystemDirectoryHandle, path = ''): AsyncGenerator<[string, FileSystemFileHandle]> {
  // @ts-expect-error: values() is not in every TS DOM lib version
  for await (const h of dir.values() as AsyncIterable<FileSystemHandle>) {
    if (h.kind === 'file' && AUDIO_EXT.test(h.name)) yield [`${path}${h.name}`, h as FileSystemFileHandle];
    else if (h.kind === 'directory') yield* walk(h as FileSystemDirectoryHandle, `${path}${h.name}/`);
  }
}

async function toFile(e: Entry): Promise<File> {
  return e instanceof File ? e : e.getFile();
}

async function indexOne(key: string, entry: Entry, fileName: string): Promise<Track> {
  const file = await toFile(entry);
  const t = { ...tagsFromFilename(fileName), ...stripEmpty(await readTags(file)) };
  await db.set('files', key, entry);
  if (t.picture) await db.set('files', `${key}#art`, t.picture);
  const ext = fileName.split('.').pop()?.toUpperCase();
  return {
    id: `local:${key}`,
    source: 'local',
    localKey: key,
    title: t.title || fileName,
    artist: t.artist || 'Unknown artist',
    album: t.album,
    genre: t.genre,
    duration: 0,
    format: ext,
    license: { name: 'Your file' },
    cors: true,
  };
}

function stripEmpty<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')) as Partial<T>;
}

export type Progress = (done: number, total: number) => void;

export async function importFolder(onProgress: Progress): Promise<Track[]> {
  // @ts-expect-error: showDirectoryPicker is Chromium-only
  const dir: FileSystemDirectoryHandle = await window.showDirectoryPicker({ id: 'music', mode: 'read' });
  const entries: [string, FileSystemFileHandle][] = [];
  for await (const e of walk(dir)) entries.push(e);
  const folders = ((await db.get<FileSystemDirectoryHandle[]>('kv', 'folders')) ?? []).filter((f) => f.name !== dir.name);
  await db.set('kv', 'folders', [...folders, dir]);
  return indexMany(entries.map(([p, h]) => [`${dir.name}/${p}`, h, h.name]), onProgress);
}

export async function importFiles(files: File[], onProgress: Progress): Promise<Track[]> {
  const audio = files.filter((f) => AUDIO_EXT.test(f.name));
  return indexMany(audio.map((f) => [`files/${(f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name}`, f, f.name]), onProgress);
}

async function indexMany(items: [string, Entry, string][], onProgress: Progress): Promise<Track[]> {
  const out: Track[] = [];
  let done = 0;
  const queue = [...items];
  const worker = async () => {
    for (let it = queue.shift(); it; it = queue.shift()) {
      try { out.push(await indexOne(...it)); } catch (e) { console.warn('Skipped', it[0], e); }
      onProgress(++done, items.length);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return out;
}

/** Returns false if the browser needs the user to re-grant access to a picked folder. */
export async function ensurePermission(): Promise<boolean> {
  const folders = (await db.get<FileSystemDirectoryHandle[]>('kv', 'folders')) ?? [];
  for (const f of folders) {
    // @ts-expect-error: permission API on handles is Chromium-only
    if ((await f.queryPermission?.({ mode: 'read' })) !== 'granted') return false;
  }
  return true;
}

export async function requestPermission(): Promise<boolean> {
  const folders = (await db.get<FileSystemDirectoryHandle[]>('kv', 'folders')) ?? [];
  for (const f of folders) {
    // @ts-expect-error: Chromium-only
    if ((await f.requestPermission?.({ mode: 'read' })) !== 'granted') return false;
  }
  return true;
}

export async function localFile(track: Track): Promise<File> {
  const entry = await db.get<Entry>('files', track.localKey!);
  if (!entry) throw new Error('This file is no longer in your library');
  return toFile(entry);
}

export async function localArtwork(track: Track): Promise<string | undefined> {
  const blob = await db.get<Blob>('files', `${track.localKey}#art`);
  return blob ? URL.createObjectURL(blob) : undefined;
}

export async function removeLocal(track: Track): Promise<void> {
  await db.del('files', track.localKey!);
  await db.del('files', `${track.localKey}#art`);
}
