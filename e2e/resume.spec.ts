import { expect, importFiles, position, test } from './fixtures';

test('a restart resumes the same track, paused, at the same place', async ({ page }) => {
  await importFiles(page, [{ name: 'Alpha.wav', seconds: 40 }, { name: 'Beta.wav', seconds: 40, freq: 550 }]);
  await page.locator('.row-item:has-text("Beta") .hit').click();
  await expect.poll(() => position(page)).toBeGreaterThanOrEqual(4);
  await page.locator('.bar button.play').click(); // pause
  await expect(page.locator('.bar button.play')).toHaveAttribute('aria-label', 'Play');
  const at = await position(page);

  await page.reload();
  // same track, not playing, at the same place (±1 s for rounding)
  await expect(page.locator('.bar')).toContainText('Beta');
  await expect(page.locator('.bar button.play')).toHaveAttribute('aria-label', 'Play');
  expect(Math.abs((await position(page)) - at)).toBeLessThanOrEqual(1);

  // play continues from there, not from the start
  await page.locator('.bar button.play').click();
  await expect(page.locator('.bar button.play')).toHaveAttribute('aria-label', 'Pause');
  await expect.poll(() => position(page)).toBeGreaterThan(at);
  expect(await position(page)).toBeGreaterThanOrEqual(at - 1);

  // the rest of the queue came back too
  await page.getByRole('button', { name: 'Queue' }).first().click();
  await expect(page.locator('.panel')).toContainText('Alpha');
});

test('seeking before pressing play moves the resume point', async ({ page }) => {
  await importFiles(page, [{ name: 'Gamma.wav', seconds: 60 }]);
  await page.locator('.row-item .hit').first().click();
  await expect.poll(() => position(page)).toBeGreaterThanOrEqual(2);
  await page.locator('.bar button.play').click();
  await page.reload();
  await expect(page.locator('.bar')).toContainText('Gamma');
  const slider = page.locator('.bar [role=slider][aria-valuetext]').first();
  await slider.focus();
  for (let i = 0; i < 4; i++) await slider.press('ArrowRight'); // each press seeks forward
  const moved = await position(page);
  await page.locator('.bar button.play').click();
  await expect.poll(() => position(page)).toBeGreaterThanOrEqual(moved);
});
