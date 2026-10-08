import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';

import { pictureBox, region, renderComparison } from './comparison.harness';

type Point = { x: number; y: number };

test('the wheel zooms about the pointer, and both sides with it, drawn pixelated from 100 % up', async () => {
  const { screen } = await renderComparison();
  const after = screen.getByRole('img', { name: 'As sqzer encoded it' });
  await expect.element(after).toBeVisible();
  // the fixture fits the screen at its own pixels, where it is already pixelated
  expect(pictureBox(screen)).toMatchObject({ width: 48, height: 32 });
  expect(getComputedStyle(after.element()).imageRendering).toBe('pixelated');
  const edges = screen.getByTestId('screen').element().getBoundingClientRect();
  const was = pictureBox(screen);

  // a wheel of 300 px zooms by e, with the pointer at the picture's left edge
  region(screen)
    .element()
    .dispatchEvent(new WheelEvent('wheel', { deltaY: -300, clientX: was.left, clientY: was.top + 16, bubbles: true }));

  await expect.poll(() => pictureBox(screen).width).toBeCloseTo(48 * Math.E, 1);
  // the left edge stayed under the pointer
  expect(pictureBox(screen).left).toBeCloseTo(was.left, 1);
  expect(after.element().getBoundingClientRect()).toEqual(pictureBox(screen));
  expect(pictureBox(screen).left).toBeGreaterThan(edges.left);
});

test('on a screen the picture does not fit, it is scaled down and smooth, and a step in snaps to 100 %', async () => {
  const { screen } = await renderComparison(true);
  const before = screen.getByRole('img', { name: 'As it was dropped' });
  await expect.element(before).toBeVisible();
  // 48 x 32 in a 96 x 24 screen: three quarters
  expect(pictureBox(screen)).toMatchObject({ width: 36, height: 24 });
  expect(getComputedStyle(before.element()).imageRendering).not.toBe('pixelated');

  region(screen).element().focus();
  await userEvent.keyboard('+');
  await expect.poll(() => pictureBox(screen).width).toBeCloseTo(45, 3);
  await userEvent.keyboard('+');
  await expect.poll(() => pictureBox(screen).width).toBe(48);
  expect(getComputedStyle(before.element()).imageRendering).toBe('pixelated');
  await userEvent.keyboard('-');
  await expect.poll(() => pictureBox(screen).width).toBeCloseTo(38.4, 3);
});

/** A pointer's event on the region, as the browser would send it, at a point offset from the screen's centre. */
function pointer(screen: Awaited<ReturnType<typeof renderComparison>>['screen'], type: string, id: number, at: Point) {
  const edges = screen.getByTestId('screen').element().getBoundingClientRect();
  region(screen)
    .element()
    .dispatchEvent(
      new PointerEvent(type, {
        pointerId: id,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        clientX: edges.left + edges.width / 2 + at.x,
        clientY: edges.top + edges.height / 2 + at.y,
        bubbles: true,
      }),
    );
}

test('the pictures are not dragged as files, and the panels do not take the pointer between them', async () => {
  const { screen } = await renderComparison();
  const before = screen.getByRole('img', { name: 'As it was dropped' });
  await expect.element(before).toBeVisible();
  expect(before.element().getAttribute('draggable')).toBe('false');
  // the comparison is a layer of its own, so the handle Base UI raises stays under what floats over the image
  expect(getComputedStyle(region(screen).element()).isolation).toBe('isolate');
});

test('a drag of the screen pans both sides, and the arrows do the same', async () => {
  const { screen } = await renderComparison();
  const after = screen.getByRole('img', { name: 'As sqzer encoded it' });
  await expect.element(after).toBeVisible();
  const was = pictureBox(screen);

  // from the screen's corner, away from the handle, 30 px to the right and 20 down
  pointer(screen, 'pointerdown', 1, { x: -150, y: -150 });
  pointer(screen, 'pointermove', 1, { x: -130, y: -140 });
  pointer(screen, 'pointermove', 1, { x: -120, y: -130 });
  pointer(screen, 'pointerup', 1, { x: -120, y: -130 });

  await expect.poll(() => pictureBox(screen).left).toBe(was.left + 30);
  expect(pictureBox(screen).top).toBe(was.top + 20);
  expect(after.element().getBoundingClientRect()).toEqual(pictureBox(screen));
  // let go, the pointer moves nothing
  pointer(screen, 'pointermove', 1, { x: 0, y: 0 });
  expect(pictureBox(screen).left).toBe(was.left + 30);

  region(screen).element().focus();
  await userEvent.keyboard('{ArrowLeft}');
  await expect.poll(() => pictureBox(screen).left).toBe(was.left + 70);
  await userEvent.keyboard('{ArrowUp}');
  await expect.poll(() => pictureBox(screen).top).toBe(was.top + 60);
});

test('two fingers pinch about their midpoint', async () => {
  const { screen } = await renderComparison();
  await expect.element(screen.getByRole('img', { name: 'As sqzer encoded it' })).toBeVisible();
  const was = pictureBox(screen);

  // two fingers 40 px apart over the picture's centre, spread to 80 and moved 30 px right together
  pointer(screen, 'pointerdown', 1, { x: -20, y: 0 });
  pointer(screen, 'pointerdown', 2, { x: 20, y: 0 });
  pointer(screen, 'pointermove', 2, { x: 60, y: 0 });
  pointer(screen, 'pointermove', 2, { x: 70, y: 0 });
  pointer(screen, 'pointermove', 1, { x: -10, y: 0 });
  pointer(screen, 'pointerup', 1, { x: -10, y: 0 });
  pointer(screen, 'pointerup', 2, { x: 70, y: 0 });

  // doubled, and the picture's centre stayed between the fingers, which ended 30 px right of the screen's
  await expect.poll(() => pictureBox(screen).width).toBe(96);
  const box = pictureBox(screen);
  expect(box.left + box.width / 2 - (was.left + was.width / 2)).toBeCloseTo(30, 1);
});
