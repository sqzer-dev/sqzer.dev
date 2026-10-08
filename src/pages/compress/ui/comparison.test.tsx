import { expect, test } from 'vitest';
import { commands, userEvent } from 'vitest/browser';

import { middle, renderComparison } from './comparison.harness';

test("each side's size sits in the corner of the screen over it", async () => {
  const { screen } = await renderComparison();
  const before = screen.getByText('Before: 48 × 32');
  const after = screen.getByText('After: 25 × 16');

  await expect.element(before).toBeVisible();
  await expect.element(after).toBeVisible();
  // the input's on the side of the picture as it was dropped, the output's on the side as it was encoded
  const edges = screen.getByTestId('screen').element().getBoundingClientRect();
  expect(before.element().getBoundingClientRect().left - edges.left).toBe(12);
  expect(edges.right - after.element().getBoundingClientRect().right).toBe(12);
});

test('the handle is a slider, and it clips the after side where it stands on the screen', async () => {
  const { screen } = await renderComparison();
  const after = screen.getByRole('img', { name: 'As sqzer encoded it' });
  await expect.element(after).toBeVisible();
  // the layer the size of the screen that holds the picture, not the picture
  const layer = after.element().closest('[data-slot=after]');
  expect(layer && getComputedStyle(layer).clipPath).toBe('inset(0px 0px 0px 50%)');

  // by the keys of a range input
  const handle = screen.getByRole('slider', { name: 'Before on the left, after on the right' });
  handle.element().focus();
  await userEvent.keyboard('{ArrowLeft}');
  await expect.poll(() => layer && getComputedStyle(layer).clipPath).toBe('inset(0px 0px 0px 49%)');
  await userEvent.keyboard('{Home}');
  await expect.poll(() => layer && getComputedStyle(layer).clipPath).toBe('inset(0px 0px 0px 0%)');
});

test('the line runs the height of the screen, past the picture, with the handle in its middle', async () => {
  const { screen } = await renderComparison();
  const slider = screen.getByRole('slider', { name: 'Before on the left, after on the right' });
  // the line comes with the after side, once the browser has loaded it
  await expect.element(slider).toBeVisible();
  const edges = screen.getByTestId('screen').element().getBoundingClientRect();
  const picture = screen.getByRole('img', { name: 'As it was dropped' }).element().getBoundingClientRect();
  const handle = slider.element();
  const line = handle.closest('[data-index]')?.getBoundingClientRect();
  const knob = handle.closest('[data-index]')?.querySelector('span')?.getBoundingClientRect();

  expect(line?.height).toBe(edges.height);
  expect(line?.height).toBeGreaterThan(picture.height);
  expect(knob && line && knob.top + knob.height / 2).toBe(line && line.top + line.height / 2);
  expect(knob && line && knob.left + knob.width / 2).toBe(line && line.left + line.width / 2);
});

test('a drag of the handle across the screen selects nothing', async () => {
  const { screen } = await renderComparison();
  const handle = screen.getByRole('slider', { name: 'Before on the left, after on the right' });
  await expect.element(handle).toBeVisible();

  // from the middle of the screen to the label in its far corner
  await commands.drag(middle(handle.element()), middle(screen.getByText('After: 25 × 16').element()));

  await expect.poll(() => handle.element().getAttribute('aria-valuenow')).not.toBe('50');
  expect(getSelection()?.toString()).toBe('');
});

test('an image the browser cannot show is hidden until the worker previews it, and the next image shows at once', async () => {
  const { screen, preview, source } = await renderComparison();
  await expect.element(screen.getByRole('img', { name: 'As it was dropped' })).toBeVisible();

  await screen.getByRole('button', { name: 'Pick the unshowable' }).click();

  // the browser's `<img>` fails on it, and nothing takes its place: not the alt text in an empty box
  await expect.poll(() => source()?.hasAttribute('hidden')).toBe(true);
  preview();
  await expect.poll(() => source()?.hasAttribute('hidden')).toBe(false);
  await expect.element(screen.getByRole('img', { name: 'As it was dropped' })).toBeVisible();

  await screen.getByRole('button', { name: 'Pick', exact: true }).click();

  await expect.element(screen.getByRole('img', { name: 'As it was dropped' })).toBeVisible();
  expect(source()?.hasAttribute('hidden')).toBe(false);
});

test('the next encode replaces the after side in place, without a blink', async () => {
  const { screen, encodeAgain } = await renderComparison();
  const after = screen.getByRole('img', { name: 'As sqzer encoded it' });
  await expect.element(after).toBeVisible();
  const layer = after.element().closest('[data-slot=after]');
  if (!layer) throw new Error('the after side has no layer');
  const was = after.element().getAttribute('src');
  // every change of the layer's `hidden` from here on
  const hides: boolean[] = [];
  const watcher = new MutationObserver(() => {
    hides.push(layer.hasAttribute('hidden'));
  });
  watcher.observe(layer, { attributes: true, attributeFilter: ['hidden'] });

  await encodeAgain();

  await expect.poll(() => after.element().getAttribute('src')).not.toBe(was);
  await expect.element(after).toBeVisible();
  watcher.disconnect();
  expect(hides).toEqual([]);
});

test("a resized output is drawn into the input's box, so the two sides line up", async () => {
  const { screen } = await renderComparison();
  const before = screen.getByRole('img', { name: 'As it was dropped' });
  const after = screen.getByRole('img', { name: 'As sqzer encoded it' });
  await expect.element(after).toBeVisible();

  // the input is 48 x 32 and the output 25 x 16: both are shown at the input's size, to the pixel
  expect(before.element().getBoundingClientRect()).toMatchObject({ width: 48, height: 32 });
  expect(after.element().getBoundingClientRect()).toEqual(before.element().getBoundingClientRect());
});
