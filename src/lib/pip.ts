// Pop-out mini player using the Document Picture-in-Picture API (Chrome / Edge 116+):
// a small always-on-top window that shares this page's JavaScript, so the player store,
// audio and translations are the same objects.
import { mount, unmount } from 'svelte';
import MiniPlayer from '../components/MiniPlayer.svelte';

interface DocumentPiP { requestWindow(o: { width: number; height: number }): Promise<Window>; window: Window | null }
const dpip = (): DocumentPiP | undefined => (window as unknown as { documentPictureInPicture?: DocumentPiP }).documentPictureInPicture;

export const pipSupported = typeof window !== 'undefined' && !!dpip();

export async function openMiniPlayer(): Promise<void> {
  const api = dpip();
  if (!api) throw new Error('unsupported');
  if (api.window) { api.window.focus(); return; }
  const win = await api.requestWindow({ width: 320, height: 440 });
  const doc = win.document;
  // copy the app's styles (absolute URLs: the new document has no base URL of its own)
  for (const node of document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>('link[rel="stylesheet"], style')) {
    const copy = node.cloneNode(true) as HTMLLinkElement | HTMLStyleElement;
    if (copy instanceof HTMLLinkElement) copy.href = (node as HTMLLinkElement).href;
    doc.head.appendChild(copy);
  }
  doc.documentElement.lang = document.documentElement.lang;
  doc.documentElement.dir = document.documentElement.dir;
  // keep the accent colour (set on the main <html> from the artwork) in sync
  const syncHue = () => doc.documentElement.style.setProperty('--h', document.documentElement.style.getPropertyValue('--h') || '285');
  syncHue();
  const hueTimer = setInterval(syncHue, 1000);
  const app = mount(MiniPlayer, { target: doc.body });
  win.addEventListener('pagehide', () => { clearInterval(hueTimer); unmount(app); }, { once: true });
}
