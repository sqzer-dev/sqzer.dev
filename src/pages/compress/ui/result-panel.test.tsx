// The result panel (ADR-0001 D4, D5), on the page over its stub worker: the size and the difference with
// the chips, the chart and the list of the trials, and the details behind their expander.
import { beforeEach, expect, test, vi } from 'vitest';
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
    score: svg.querySelector(':scope > [data-series=score]')?.getAttribute('d'),
    quality: svg.querySelector(':scope > [data-series=quality]')?.getAttribute('d'),
    runs: [...svg.querySelectorAll('[data-run]')].map((run) => ({
      score: run.querySelector('[data-series=score]')?.getAttribute('d'),
      quality: run.querySelector('[data-series=quality]')?.getAttribute('d'),
    })),
    label: svg.querySelector('text')?.textContent,
  };
}

test('the trials are a list with their quality and score, and a chart of the same points', async () => {
  const { screen, drop } = await renderPage();
  await drop();

  const table = screen.getByRole('table', { name: 'Trials' });
  await expect.element(table.getByRole('row', { name: '1 55 68.2' })).toBeVisible();
  await expect.element(table.getByRole('row', { name: '2 60 72.5' })).toBeVisible();
  // the details say how the search went, behind their expander
  await expect.element(screen.getByText('72, reached in 2 trials')).not.toBeInTheDocument();
  await expect.poll(() => drawing(screen).points).toBe(2);
  const drawn = drawing(screen);
  expect(drawn.label).toBe('target 72');
  // hidden from a screen reader: the list carries the numbers
  expect(drawn.svg.getAttribute('aria-hidden')).toBe('true');
  // the one run is at full weight, its score and its quality, and nothing stands behind it yet
  expect(drawn.score).toMatch(/^M[\d.]+ [\d.]+ L[\d.]+ [\d.]+$/u);
  expect(drawn.quality).toMatch(/^M[\d.]+ [\d.]+ L[\d.]+ [\d.]+$/u);
  expect(drawn.runs).toEqual([]);
});

test('the search before stays behind the next as a subtle line', async () => {
  const { screen, drop } = await renderPage();
  await drop();
  await expect.poll(() => drawing(screen).points).toBe(2);
  const { score: first, quality: firstQuality } = drawing(screen);

  await screen.getByRole('button', { name: 'archive, 85' }).click();
  await wait(SETTLED_MS);

  await expect.poll(() => drawing(screen).runs).toHaveLength(1);
  const { runs, points } = drawing(screen);
  // the run before keeps both its lines
  expect(runs[0]).toEqual({ score: first, quality: firstQuality });
  expect(points).toBe(2);
  // the next image keeps the runs of the one before: they last as long as the tab
  await screen.getByLabelText('New image').upload(new File(['bytes'], 'other.jpg', { type: 'image/jpeg' }));
  await expect.poll(() => drawing(screen).runs).toHaveLength(2);
});

/** The chips on the page, as their words and their full meanings. */
function chips(screen: Awaited<ReturnType<typeof renderPage>>['screen']) {
  return [...screen.container.querySelectorAll('[data-chip]:not([inert])')].map((chip) => ({
    word: chip.textContent,
    meaning: chip.getAttribute('aria-label'),
  }));
}

test('the result leads with the size, the difference and the download, and a chip for what applied', async () => {
  const { screen, drop } = await renderPage();
  await drop();

  // the stub hands the fixture back as the output
  await expect.element(screen.getByText('673 B')).toBeVisible();
  await expect.element(screen.getByText('the same size')).toBeVisible();
  const download = screen.getByRole('link', { name: 'Download pattern-rgb.jpg' });
  await expect.element(download).toHaveAttribute('download', 'pattern-rgb.jpg');
  expect(download.element().getAttribute('href')).toMatch(/^blob:/u);
  // the one chip, with its full meaning as its name and its tooltip
  const chip = screen.getByRole('button', { name: 'reached: the target of 72 at a score of 72.5' });
  await expect.element(chip).toHaveTextContent('reached');
  expect(chips(screen)).toEqual([{ word: 'reached', meaning: 'reached: the target of 72 at a score of 72.5' }]);
  await chip.hover();
  await expect
    .poll(() => document.querySelector('[data-slot=tooltip-content]')?.textContent)
    .toBe('reached: the target of 72 at a score of 72.5');
});

test('the details are behind an expander: the input, the output, the quality, the score, the target, the time and the record', async () => {
  const { screen, drop } = await renderPage();
  await drop();

  await screen.getByRole('button', { name: 'Details' }).click();

  await expect.element(screen.getByText('pattern-rgb.jpg, 673 B, jpeg, photo')).toBeVisible();
  await expect.element(screen.getByText('pattern-rgb.jpg, 673 B, jpeg by mozjpeg-rs (portable)')).toBeVisible();
  await expect.element(screen.getByText('72.5, high: barely noticeable side by side')).toBeVisible();
  await expect.element(screen.getByText('72, reached in 2 trials')).toBeVisible();
  await expect.element(screen.getByText('1.0 s')).toBeVisible();
  await expect.element(screen.getByText(/"backend": "mozjpeg-rs"/u)).toBeVisible();
  // the bytes are the download, not the record
  expect(screen.getByText(/"backend": "mozjpeg-rs"/u).element().textContent).not.toContain('"bytes"');
});

test('the chips past the first line collapse into a last chip that expands them', async () => {
  const { screen, drop } = await renderPage();
  await drop();
  await screen.getByRole('button', { name: 'Advanced' }).click();
  await screen.getByRole('switch', { name: 'Keep metadata' }).click();
  await screen.getByRole('switch', { name: 'Keep the ICC profile' }).click();
  await screen.getByRole('spinbutton', { name: 'Max pixels' }).fill('1000');
  await screen.getByRole('switch', { name: 'jpeg:progressive' }).click();
  await wait(SETTLED_MS);

  // every option sent is a chip, in the order of the booleans, what was kept, then the rest
  const more = screen.getByRole('button', { name: /^\d more$/u });
  await expect.element(more).toBeVisible();
  const shown = chips(screen);
  expect(shown.length).toBeGreaterThan(0);
  expect(shown.length).toBeLessThan(5);
  expect(shown.map((chip) => chip.word)).toEqual(
    ['reached', 'metadata', 'icc', 'maxPixels', 'jpeg:progressive'].slice(0, shown.length),
  );

  await more.click();

  await expect.element(more).not.toBeInTheDocument();
  expect(chips(screen)).toEqual([
    { word: 'reached', meaning: 'reached: the target of 72 at a score of 72.5' },
    { word: 'metadata', meaning: 'metadata: EXIF and XMP kept' },
    { word: 'icc', meaning: 'icc: the ICC profile kept, not converted to sRGB' },
    { word: 'maxPixels', meaning: 'maxPixels 1000, default 24000000' },
    { word: 'jpeg:progressive', meaning: 'jpeg:progressive false, default true' },
  ]);
});

test('the record is copied by its button, which says so for a moment, and stays as it was when the clipboard refuses', async () => {
  const { screen, drop } = await renderPage();
  await drop();
  await screen.getByRole('button', { name: 'Details' }).click();
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  const copy = screen.getByRole('button', { name: 'Copy the record' });

  await copy.click();

  expect(write).toHaveBeenCalledOnce();
  const text = write.mock.calls[0]?.[0] ?? '';
  expect(text).toMatch(/^\{\n {2}"inputFormat": "jpeg",\n/u);
  expect(text).not.toContain('"bytes"');
  await expect.element(screen.getByRole('button', { name: 'Copied' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Copy the record' })).toBeVisible();

  // a clipboard the browser refuses: the button stays as it was, and nothing is thrown
  write.mockRejectedValue(new Error('not allowed'));
  await screen.getByRole('button', { name: 'Copy the record' }).click();
  await wait(100);
  expect(screen.getByRole('button', { name: 'Copied' }).elements()).toHaveLength(0);
  await expect.element(screen.getByRole('button', { name: 'Copy the record' })).toBeVisible();
});
