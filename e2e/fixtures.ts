import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';

/** A mono 16-bit WAV of a sine tone: a real, playable audio file without shipping one. */
export function wav(seconds: number, freq = 440, rate = 22050): Buffer {
  const n = Math.floor(seconds * rate);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * freq * i) / rate) * 8000), 44 + i * 2);
  return buf;
}

/** A 1×1 PNG, used as cover art. */
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

/** A fake Internet Archive album: two public-domain tracks with a cover. */
export const ALBUM = 'e2e_album';
export async function mockArchiveAlbum(ctx: BrowserContext, opts: { coverCors?: boolean } = {}) {
  await ctx.route(`https://archive.org/metadata/${ALBUM}`, (r) => r.fulfill({
    headers: { 'access-control-allow-origin': '*' },
    json: {
      metadata: { title: 'E2E Album', creator: 'Test Artist', licenseurl: 'http://creativecommons.org/publicdomain/zero/1.0/' },
      files: [
        { name: '01 First.mp3', format: 'VBR MP3', title: 'First Song', length: '12' },
        { name: '02 Second.mp3', format: 'VBR MP3', title: 'Second Song', length: '12' },
      ],
    },
  }));
  await ctx.route(`https://archive.org/download/${ALBUM}/**`, (r) => r.fulfill({
    headers: { 'access-control-allow-origin': '*', 'content-type': 'audio/wav' }, body: wav(12, 330),
  }));
  // archive.org serves covers without CORS headers: <img> can show them, but the page can't read them.
  // Playwright skips the CORS check for answered requests, so a page read (fetch) is refused here instead.
  // coverCors: true simulates a host that does send CORS headers.
  await ctx.route(`https://archive.org/services/img/${ALBUM}`, (r) => (
    !opts.coverCors && r.request().resourceType() === 'fetch'
      ? r.abort('accessdenied')
      : r.fulfill({ headers: { 'content-type': 'image/png', 'access-control-allow-origin': '*' }, body: PNG })
  ));
}

/** Stand-in for the desktop app's native bridge (Tauri). Records invoke() calls in window.__calls. */
export async function fakeDesktop(ctx: BrowserContext) {
  await ctx.addInitScript((png: string) => {
    const w = window as unknown as Record<string, unknown>;
    const calls: { cmd: string; args: unknown }[] = [];
    w.__calls = calls;
    w.__TAURI_INTERNALS__ = {
      invoke: async (cmd: string, args: unknown) => {
        calls.push({ cmd, args });
        if (cmd === 'fetch_cover') return Uint8Array.from(atob(png), (c) => c.charCodeAt(0)).buffer;
        return null;
      },
      transformCallback: () => 0,
      metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main' } },
    };
  }, PNG.toString('base64'));
}

/** Keys in one IndexedDB store of the app. */
export function idbKeys(page: Page, store: string): Promise<string[]> {
  return page.evaluate((s) => new Promise<string[]>((res, rej) => {
    const r = indexedDB.open('resonix');
    r.onsuccess = () => { const q = r.result.transaction(s).objectStore(s).getAllKeys(); q.onsuccess = () => res(q.result as string[]); };
    r.onerror = () => rej(r.error);
  }), store);
}

/** The playback position the player bar shows, in seconds. */
export async function position(page: Page): Promise<number> {
  return Number(await page.locator('.bar [role=slider][aria-valuetext]').first().getAttribute('aria-valuenow'));
}

/** Add audio files through Library → On this device. */
export async function importFiles(page: Page, files: { name: string; seconds: number; freq?: number }[]) {
  await page.goto('/#/library/files');
  await page.locator('input[type=file][accept^="audio"]').setInputFiles(
    files.map((f) => ({ name: f.name, mimeType: 'audio/wav', buffer: wav(f.seconds, f.freq) })),
  );
  await expect(page.locator('.row-item')).toHaveCount(files.length);
}

export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [async ({}, use) => { await use([]); }, { scope: 'test' }],
  context: async ({ context }, use) => {
    // nothing leaves the machine: outside requests fail unless a test answers them
    await context.route(/^https?:\/\/(?!localhost[:/])/, (r) => r.abort());
    await use(context);
  },
  page: async ({ page, pageErrors }, use) => {
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await use(page);
    expect(pageErrors, 'uncaught errors in the page').toEqual([]);
  },
});
export { expect };
