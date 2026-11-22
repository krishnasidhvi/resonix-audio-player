import { ALBUM, expect, fakeDesktop, idbKeys, mockArchiveAlbum, position, test } from './fixtures';

const track1 = `archive:${ALBUM}/01 First.mp3`;
const track2 = `archive:${ALBUM}/02 Second.mp3`;

test.describe('web app', () => {
  // the offline app shell needs the service worker
  test.use({ serviceWorkers: 'allow' });

  test('saves an album and plays it with no connection', async ({ page, context }) => {
    await mockArchiveAlbum(context, { coverCors: true });
    await page.goto('/');
    await page.waitForFunction(() => !!navigator.serviceWorker.controller); // installed and precached

    await page.goto(`/#/album/archive%3A${ALBUM}`);
    await expect(page.locator('.row-item')).toHaveCount(2);
    await page.getByRole('button', { name: 'Save all for offline' }).click();
    await expect(page.locator('.toast')).toContainText('Saved 2 of 2 for offline');
    await expect(page.locator('.row-item .saved')).toHaveCount(2);
    expect(await idbKeys(page, 'offline')).toEqual(expect.arrayContaining([track1, track2, `art:${track1}`]));

    await context.setOffline(true);
    await page.goto('/');
    // starts on the saved music, says it's offline, shows the saved cover
    await expect(page).toHaveURL(/#\/library\/offline$/);
    await expect(page.locator('.offline-bar')).toContainText('offline');
    await expect(page.locator('.row-item .art img').first()).toHaveJSProperty('naturalWidth', 1);
    await page.locator('.row-item .hit').first().click();
    await expect.poll(() => position(page)).toBeGreaterThanOrEqual(2);

    // a language that was never opened still loads, from the precache
    await page.evaluate(() => localStorage.setItem('resonix.locale', 'te'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'te');
  });
});

test.describe('desktop app', () => {
  test('keeps archive.org covers through the native bridge', async ({ page, context }) => {
    await fakeDesktop(context);
    await mockArchiveAlbum(context); // cover without CORS headers, like the real archive.org

    await page.goto(`/#/album/archive%3A${ALBUM}`);
    await page.getByRole('button', { name: 'Save all for offline' }).click();
    await expect(page.locator('.toast')).toContainText('Saved 2 of 2 for offline');
    const calls = await page.evaluate(() => (window as unknown as { __calls: { cmd: string; args: unknown }[] }).__calls
      .filter((c) => c.cmd === 'fetch_cover'));
    // both tracks share the album cover, so it is fetched once
    expect(calls).toEqual([{ cmd: 'fetch_cover', args: { url: `https://archive.org/services/img/${ALBUM}` } }]);
    expect(await idbKeys(page, 'offline')).toContain(`art:${track1}`);

    // after a restart with archive.org unreachable, the cover comes from the device
    await context.route('https://archive.org/**', (r) => r.abort());
    await page.goto('/#/library/offline');
    await page.reload();
    const img = page.locator('.row-item .art img').first();
    await expect(img).toHaveJSProperty('naturalWidth', 1);
    expect(await img.getAttribute('src')).toMatch(/^blob:/);
  });
});
