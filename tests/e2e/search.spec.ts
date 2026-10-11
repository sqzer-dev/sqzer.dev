// The search on the built page: one that takes seconds, cancelled or cut short
// by the controls, and the controls reaching the package.
import { expect, fixture, format, open, PICK, said, SLOW, test } from './harness';

test('a change of format during a search ends the worker and starts another', async ({ page }) => {
  await open(page);
  await page.getByLabel(PICK).setInputFiles(fixture('pattern-rgb.svg'));
  await expect(page.getByRole('link', { name: /^Download pattern-rgb\./u })).toBeVisible(SLOW);
  await format(page, /^AVIF/u);
  await expect(page.getByText(/pattern-rgb\.svg -> pattern-rgb\.avif/u)).toBeVisible(SLOW);

  // what the search toast says, each time it changes
  await page.evaluate(() => {
    const toaster = document.querySelector('[data-slot=toast-viewport]');
    if (!toaster) throw new Error('the page has no toaster');
    window.statuses = [];
    new MutationObserver(() => {
      for (const title of toaster.querySelectorAll('[data-slot=toast-title]')) {
        const text = title.textContent;
        if (text !== 'Ready.' && text !== window.statuses.at(-1)) window.statuses.push(text);
      }
    }).observe(toaster, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  });

  // drawn large, so a search takes seconds
  await page.getByRole('button', { name: 'Resize' }).click();
  await page.getByLabel('Width').fill('2000');
  await expect(said(page, 'Encoding pattern-rgb.svg.')).toHaveText(/Trial 1 of at most/u, SLOW);

  await format(page, /^JPEG/u);
  await expect(said(page, /^Done in/u)).toBeVisible(SLOW);
  await expect(page.getByText(/pattern-rgb\.svg -> pattern-rgb\.jpg/u)).toBeVisible(SLOW);

  // a new worker holds nothing, so the image is read again after the trial that was cut short
  const statuses = await page.evaluate(() => window.statuses);
  const trial = statuses.indexOf('Encoding pattern-rgb.svg.');
  expect(trial).toBeGreaterThan(-1);
  expect(statuses.lastIndexOf('Reading pattern-rgb.svg.')).toBeGreaterThan(trial);
});

test('cancelling a search ends the worker and leaves the result before it', async ({ page }) => {
  await open(page);
  await page.getByLabel(PICK).setInputFiles(fixture('pattern-rgb.svg'));
  await expect(page.getByRole('link', { name: /^Download pattern-rgb\./u })).toBeVisible(SLOW);
  // a format that is searched: the package goes lossless for a graphic on its own
  await format(page, /^AVIF/u);
  await expect(page.getByText(/pattern-rgb\.svg -> pattern-rgb\.avif/u)).toBeVisible(SLOW);
  const before = await page.getByText(/^pattern-rgb\.svg -> /u).textContent();

  // drawn large, so a search takes seconds
  await page.getByRole('button', { name: 'Resize' }).click();
  await page.getByLabel('Width').fill('2000');
  const encoding = said(page, 'Encoding pattern-rgb.svg.');
  await expect(encoding).toHaveText(/Trial 1 of at most/u, SLOW);
  await encoding.getByRole('button', { name: 'Cancel' }).click();

  await expect(encoding).toBeHidden();
  await expect(page.getByText(/^pattern-rgb\.svg -> /u)).toHaveText(before ?? '');
  // the next change searches again, on a worker that reads the image anew
  await page.getByLabel('Width').fill('40');
  await expect(page.getByText('After: 40 × 27')).toBeVisible(SLOW);
});

test('the target slider and an option behind Advanced reach the package', async ({ page }) => {
  await open(page);
  await page.getByLabel(PICK).setInputFiles(fixture('pattern-rgb.jpg'));
  await expect(page.getByRole('link', { name: 'Download pattern-rgb.avif' })).toBeVisible(SLOW);
  // the slider stands at the target the result reports, the package's default, and says so
  const slider = page.getByRole('slider', { name: 'Target score' });
  await expect(slider).toHaveValue('70');
  await expect(page.getByText('default: high: barely noticeable side by side')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Target score: 70\./u })).toBeVisible();

  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: /^Target score: 71\./u })).toBeVisible();
  await expect(page.getByText(/target 71 (reached|not reached) in \d trials?$/u)).toBeVisible(SLOW);

  // a limit the fixture is over: the package's refusal is the alert of ADR-0001 D6
  await page.getByRole('button', { name: 'Advanced' }).click();
  await page.getByLabel('Max pixels').fill('1');
  await expect(page.getByRole('alert')).toHaveText(/image has 1536 pixels, limit is 1/u, SLOW);
});
