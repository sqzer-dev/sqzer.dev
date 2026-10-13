// The wordmark as it looks: the name is the heading, the lines are behind it and scale with its type.
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { Wordmark } from './wordmark';

test('the name is a level-one heading, and the lines behind it are not read out', async () => {
  const screen = await render(<Wordmark className="text-5xl" />);

  await expect.element(screen.getByRole('heading', { level: 1, name: 'sqzer' })).toBeVisible();
  const lines = screen.container.querySelector('[data-slot=wordmark]');
  expect(lines?.getAttribute('aria-hidden')).toBe('true');
  expect(lines?.querySelectorAll('g path').length).toBe(10);
});

test('the mark scales with the type, and its strokes stay one pixel', async () => {
  const screen = await render(<Wordmark className="text-5xl" />);
  const heading = screen.getByRole('heading', { level: 1 }).element();
  const mark = heading.parentElement;
  const lines = mark?.querySelector('[data-slot=wordmark]');
  if (!mark || !lines) throw new Error('no mark');
  // measured in Geist, not in the font shown while it loads
  await document.fonts.ready;

  // 240 by 96 at a type size of 44: the heading's line box is one em
  const name = heading.getBoundingClientRect();
  const size = name.height;
  const box = mark.getBoundingClientRect();
  expect(box.width).toBeCloseTo((240 / 44) * size, 0);
  expect(box.height).toBeCloseTo((96 / 44) * size, 0);
  expect(lines.getBoundingClientRect()).toMatchObject({ width: box.width, height: box.height });
  for (const path of lines.querySelectorAll('g path')) {
    expect(getComputedStyle(path).vectorEffect).toBe('non-scaling-stroke');
  }

  // the name sits in the middle of the box, inside the rectangle the lines keep clear
  const scale = box.width / 240;
  expect(name.left - box.left).toBeGreaterThan(62.5 * scale);
  expect(box.right - name.right).toBeGreaterThan(62.5 * scale);
  expect(Math.abs(name.left - box.left - (box.right - name.right))).toBeLessThan(1);
});
