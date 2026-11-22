import type { Page } from '@playwright/test';
import { expect, importFiles, position, test } from './fixtures';

/** Two shots of the background one second apart: true when the picture changed. */
async function moving(page: Page): Promise<boolean> {
  const canvas = page.locator('.cine-layer canvas');
  const a = await canvas.screenshot();
  await page.waitForTimeout(1000);
  return !a.equals(await canvas.screenshot());
}

async function playSomething(page: Page) {
  await importFiles(page, [{ name: 'Loop.wav', seconds: 60 }]);
  await page.locator('.row-item .hit').first().click();
  await expect.poll(() => position(page)).toBeGreaterThanOrEqual(1);
}

const prefs = (s: object) => (v: object) => localStorage.setItem('resonix.settings.v2', JSON.stringify(v));

for (const style of ['liquid', 'waves', 'aurora']) {
  test(`the ${style} background moves while music plays`, async ({ page }) => {
    await page.addInitScript(prefs({}), { cinematic: 'vivid', cinematicStyle: style });
    await playSomething(page);
    expect(await moving(page)).toBe(true);
  });
}

test.describe('when the system asks for reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('Settings offers to keep the background moving, and it then moves', async ({ page }) => {
    await page.addInitScript(prefs({}), { cinematic: 'vivid', cinematicStyle: 'waves' });
    await page.goto('/#/settings');
    const keepMoving = page.getByRole('checkbox', { name: /Keep the background moving/ });
    await expect(keepMoving).toBeVisible();
    await keepMoving.check();
    await playSomething(page);
    expect(await moving(page)).toBe(true);
  });
});
