// The bottom expander at rest, on the page over its stub worker: what is above the fold stays on the
// screen, at the height the sheet measures, as the result lands and as the screen narrows.
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';

import { renderPage, SETTLED_MS, wait } from './compress-page.harness';

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

/** Where the sheet's top edge is on the screen. */
const top = () => document.querySelector('[data-slot=drawer-popup]')?.getBoundingClientRect().top ?? Number.NaN;

test("over a browser's bar the fold rests above it, and nothing below the fold shows through it", async () => {
  await page.viewport(390, 780);
  const { screen, drop } = await renderPage();
  await drop();
  // at rest, and still
  await expect.poll(() => edges(screen).download).toBeLessThan(780);
  await wait(SETTLED_MS);
  const rest = top();

  // the bar is `--safe-area-bottom`, `env(safe-area-inset-bottom)` on a phone: the sheet reads it from
  // the stylesheet, so the test says it there, and tells the sheet the window changed as a phone would
  const root = document.documentElement;
  try {
    root.style.setProperty('--safe-area-bottom', '34px');
    window.dispatchEvent(new Event('resize'));
    // the sheet rises by the bar
    await expect.poll(top).toBeLessThan(rest - 30);
    await wait(SETTLED_MS);
    const { controls, download } = edges(screen);
    for (const bottom of controls) expect(bottom).toBeLessThan(780 - 34);
    expect(download).toBeLessThan(780 - 34);
    // the first thing under the fold starts past the screen's edge: the bar shows the sheet alone
    const sheet = screen.getByText('New image').element().closest('[data-slot=drawer-content]');
    const below = sheet?.querySelector(':scope > div')?.children[1];
    if (!below) throw new Error('nothing below the fold');
    expect(below.getBoundingClientRect().top).toBeGreaterThanOrEqual(780);
  } finally {
    root.style.removeProperty('--safe-area-bottom');
  }
});

test("the sheet's edge for Safari's bar: on the bottom edge, the width of the screen, in one opaque colour, painting nothing", async () => {
  await page.viewport(390, 780);
  const { drop } = await renderPage();
  await drop();
  const edge = document.querySelector('[data-slot=sheet-edge]');
  if (!edge) throw new Error('the sheet has no edge');
  const rect = edge.getBoundingClientRect();
  const style = getComputedStyle(edge);
  expect(rect.bottom).toBe(780);
  expect(rect.width).toBe(390);
  // Safari passes over a box of 10 px or less
  expect(rect.height).toBeGreaterThan(10);
  // nothing painted: the background stops at a content box with no height
  expect(style.backgroundClip).toBe('content-box');
  expect(style.height).toBe('0px');
  // the colour Safari reads: opaque, and not the page's own
  expect(style.backgroundColor).not.toMatch(/rgba\(.*, 0\)$/u);
  expect(style.backgroundColor).not.toBe(getComputedStyle(document.body).backgroundColor);
});
