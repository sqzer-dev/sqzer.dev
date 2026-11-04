// The bottom expander at rest, on the page over its stub worker: what is above the fold stays on the
// screen, at the height the sheet measures, as the result lands and as the screen narrows.
import { expect, test } from 'vitest';
import { commands, page } from 'vitest/browser';

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

/** The alpha of a colour as the browser writes it: `rgb()`, `rgba()` or `color()`. */
function alphaOf(colour: string) {
  const slash = /\/\s*([\d.]+)\s*\)$/u.exec(colour);
  if (slash?.[1] !== undefined) return Number(slash[1]);
  const comma = /^rgba\(.*,\s*([\d.]+)\)$/u.exec(colour);
  return comma?.[1] === undefined ? 1 : Number(comma[1]);
}

/** The strip Safari reads the sheet's colour from, and the sheet. */
function edgeAndSheet() {
  const edge = document.querySelector('[data-slot=sheet-edge]');
  const sheet = document.querySelector('[data-slot=drawer-popup]');
  if (!edge || !sheet) throw new Error('the sheet has no edge');
  return { edge, sheet };
}

test("the sheet's edge for Safari's bar: on the bottom edge, the width of the screen, over the sheet, in one opaque colour, painting nothing", async () => {
  await page.viewport(390, 780);
  const { drop } = await renderPage();
  await drop();
  const { edge, sheet } = edgeAndSheet();
  const rect = edge.getBoundingClientRect();
  const style = getComputedStyle(edge);
  expect(rect.bottom).toBe(780);
  expect(rect.width).toBe(390);
  // Safari passes over a box of 10 px or less
  expect(rect.height).toBeGreaterThan(10);
  // nothing painted: the background stops at a content box with no height
  expect(style.backgroundClip).toBe('content-box');
  expect(style.height).toBe('0px');
  // what Safari hits in the middle of the bottom edge is the strip, over the sheet. Its first hit test
  // ignores `pointer-events`; the browser's does not, so the test lifts that for the question
  expect(sheet.contains(edge)).toBe(false);
  if (!(edge instanceof HTMLElement)) throw new Error('the edge is no element');
  edge.style.pointerEvents = 'auto';
  expect(document.elementFromPoint(195, 776)).toBe(edge);
  edge.style.pointerEvents = '';
  // the colour Safari reads: opaque, and not the page's own
  expect(alphaOf(style.backgroundColor)).toBe(1);
  expect(style.backgroundColor).not.toBe(getComputedStyle(document.body).backgroundColor);
});

test("the sheet's edge takes the sheet's own colour where the glass is solid, by choice or in forced colours", async () => {
  await page.viewport(390, 780);
  const { drop } = await renderPage();
  await drop();
  const { edge, sheet } = edgeAndSheet();
  const same = () => getComputedStyle(edge).backgroundColor === getComputedStyle(sheet).backgroundColor;
  expect(same()).toBe(false);
  try {
    document.documentElement.dataset['panels'] = 'solid';
    await expect.poll(same).toBe(true);
    expect(alphaOf(getComputedStyle(edge).backgroundColor)).toBe(1);
    document.documentElement.dataset['panels'] = 'glass';
    await commands.emulateMedia({ forcedColors: 'active' });
    await expect.poll(same).toBe(true);
  } finally {
    document.documentElement.dataset['panels'] = 'glass';
    await commands.emulateMedia({ forcedColors: null });
  }
});
