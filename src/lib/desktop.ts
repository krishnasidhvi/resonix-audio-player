// Bridge to native features of the Resonix desktop app (Tauri). Everything here is optional:
// in a browser `isDesktop` is false and callers fall back to web behaviour.
export const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export interface LrclibPublish {
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  plainLyrics?: string;
  syncedLyrics?: string;
}

/** Publish lyrics to LRCLIB through the desktop app (solves LRCLIB's proof-of-work natively). */
export async function publishToLrclib(request: LrclibPublish): Promise<void> {
  if (!isDesktop) throw new Error('Publishing needs the Resonix desktop app');
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('lrclib_publish', { request });
}

/** Download an archive.org cover through the desktop app. archive.org serves images without CORS
 *  headers, so the web layer can show them but not keep a copy for offline listening. */
export async function fetchCover(url: string): Promise<Blob> {
  if (!isDesktop) throw new Error('Needs the Resonix desktop app');
  const { invoke } = await import('@tauri-apps/api/core');
  const bytes = await invoke<ArrayBuffer>('fetch_cover', { url });
  return new Blob([bytes]); // the native side only returns images; <img> detects the format
}

/** Hosts the desktop app can fetch covers from (mirrors src-tauri/src/cover.rs). */
export const nativeCoverHost = (url: string) => {
  try { const u = new URL(url); return u.protocol === 'https:' && /(^|\.)archive\.org$/i.test(u.hostname); } catch { return false; }
};
