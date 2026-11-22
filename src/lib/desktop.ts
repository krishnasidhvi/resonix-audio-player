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
