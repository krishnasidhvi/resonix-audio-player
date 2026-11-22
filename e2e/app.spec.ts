import { expect, importFiles, position, test } from './fixtures';

test('every page opens without errors', async ({ page }) => {
  for (const path of ['/', '/#/library/files', '/#/library/offline', '/#/radio', '/#/youtube',
    '/#/server', '/#/raga', '/#/journey', '/#/stats', '/#/settings']) {
    await page.goto(path);
    await expect(page.locator('#main h1').first(), path).toBeVisible();
  }
  // search has a search box instead of a heading
  await page.goto('/#/search?q=piano');
  await expect(page.locator('#main input[type=search]')).toHaveValue('piano');
});

test('plays a file from this device', async ({ page }) => {
  await importFiles(page, [{ name: 'Tone.wav', seconds: 20 }]);
  await page.locator('.row-item .hit').first().click();
  await expect(page.locator('.bar')).toContainText('Tone');
  await expect.poll(() => position(page)).toBeGreaterThanOrEqual(2);
  await expect(page.locator('.bar button.play')).toHaveAttribute('aria-label', 'Pause');
});

test('Arabic switches the layout to right-to-left', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('resonix.locale', 'ar'));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
});
