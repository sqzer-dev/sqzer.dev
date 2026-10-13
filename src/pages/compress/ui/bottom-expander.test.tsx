// The bottom expander at rest, on the page over its stub worker: what is above the fold stays on the
// screen, at the height the sheet measures, as the result lands and as the screen narrows.
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';

import { renderPage } from './compress-page.harness';

/** The bottom edge of the view bar's controls and of the download, against the screen's. */
function edges(screen: Awaited<ReturnType<typeof renderPage>>['screen']) {
  const bar = screen.getByText('New image').element().closest('[data-slot=view-bar]');
  const controls = [...(bar?.children ?? [])].map((control) => control.getBoundingClientRect().bottom);
  const download = screen.getByRole('link', { name: 'Download pattern-rgb.jpg' }).element().getBoundingClientRect();
  return { controls, download: download.bottom, screen: window.innerHeight };
}

test('at rest the size, the download and every view control are on the screen, on a narrow phone too', async () => {
  await page.viewport(390, 780);
  const { screen, drop } = await renderPage();
  await drop();

  // once the sheet has settled around what is above the fold
  await expect.poll(() => edges(screen).download).toBeLessThan(780);
  let { controls, download } = edges(screen);
  expect(controls.length).toBeGreaterThan(4);
  for (const bottom of controls) expect(bottom).toBeLessThan(780);
  expect(download).toBeLessThan(780);

  // on the narrowest phone the view bar wraps: the sheet rests higher, measured anew
  await page.viewport(320, 780);
  await expect.poll(() => Math.max(...edges(screen).controls)).toBeLessThan(780);
  ({ controls, download } = edges(screen));
  const bar = screen.getByText('New image').element().closest('[data-slot=view-bar]')?.getBoundingClientRect();
  expect(bar?.height).toBeGreaterThan(40);
  for (const bottom of controls) expect(bottom).toBeLessThan(780);
  expect(download).toBeLessThan(780);
});
