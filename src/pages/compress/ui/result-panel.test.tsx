// The chart and the list of the trials in the result panel (ADR-0001 D4), on the page over its stub worker.
import { beforeEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';

import { renderPage, SETTLED_MS, wait } from './compress-page.harness';

beforeEach(async () => {
  await page.viewport(1200, 800);
});

/** The chart's drawing, and what it has of each thing. */
function drawing(screen: Awaited<ReturnType<typeof renderPage>>['screen']) {
  const svg = screen.getByRole('table', { name: 'Trials' }).element().parentElement?.querySelector('svg');
  if (!svg || svg.dataset['slot'] !== 'search-chart') throw new Error('the panel has no chart');
  return {
    svg,
    points: svg.querySelectorAll('circle').length,
    paths: [...svg.querySelectorAll('path')].map((path) => path.getAttribute('d')),
    label: svg.querySelector('text')?.textContent,
  };
}

test('the trials are a list with their quality and score, and a chart of the same points', async () => {
  const { screen, drop } = await renderPage();
  await drop();

  const table = screen.getByRole('table', { name: 'Trials' });
  await expect.element(table.getByRole('row', { name: '1 55 68.2' })).toBeVisible();
  await expect.element(table.getByRole('row', { name: '2 60 72.5' })).toBeVisible();
  // the summary no longer lists them itself
  await expect.element(screen.getByText(/target 72 reached in 2 trials$/u)).toBeVisible();
  await expect.poll(() => drawing(screen).points).toBe(2);
  const drawn = drawing(screen);
  expect(drawn.label).toBe('target 72');
  // hidden from a screen reader: the list carries the numbers
  expect(drawn.svg.getAttribute('aria-hidden')).toBe('true');
  // the one run is at full weight, and nothing stands behind it yet
  expect(drawn.paths).toHaveLength(1);
  expect(drawn.paths[0]).toMatch(/^M[\d.]+ [\d.]+ L[\d.]+ [\d.]+$/u);
});

test('the search before stays behind the next as a subtle line', async () => {
  const { screen, drop } = await renderPage();
  await drop();
  await expect.poll(() => drawing(screen).points).toBe(2);
  const [first] = drawing(screen).paths;

  await screen.getByRole('button', { name: 'archive, 85' }).click();
  await wait(SETTLED_MS);

  await expect.poll(() => drawing(screen).paths).toHaveLength(2);
  const { paths, points } = drawing(screen);
  expect(paths[0]).toBe(first);
  expect(points).toBe(2);
  // the next image keeps the runs of the one before: they last as long as the tab
  await screen.getByLabelText('New image').upload(new File(['bytes'], 'other.jpg', { type: 'image/jpeg' }));
  await expect.poll(() => drawing(screen).paths).toHaveLength(3);
});
