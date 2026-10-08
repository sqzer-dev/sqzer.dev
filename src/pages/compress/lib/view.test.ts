import { expect, test } from 'vitest';

import { changed, clamped, fitScale, fitted, percent, pinched, stepped, type Frame } from './view';

// a 4:3 photo on a wide screen: fitted, it is 600 x 450, bound by the height
const photo: Frame = { screen: { width: 1600, height: 450 }, picture: { width: 4000, height: 3000 } };
// a thumbnail smaller than the screen
const small: Frame = { screen: { width: 1200, height: 800 }, picture: { width: 48, height: 32 } };

test('fitted, the picture fills the screen on its tighter side, and never passes its own pixels', () => {
  expect(fitScale(photo)).toBe(0.15);
  expect(fitScale(small)).toBe(1);
  expect(fitted(photo)).toEqual({ scale: 0.15, x: 0, y: 0 });
});

test('a view stays between a 32nd and 32 times the pixels, and goes wherever it is taken', () => {
  expect(clamped({ scale: 0.001, x: 0, y: 0 }).scale).toBe(1 / 32);
  expect(clamped({ scale: 100, x: 0, y: 0 }).scale).toBe(32);
  expect(clamped({ scale: 1, x: 5000, y: -5000 })).toEqual({ scale: 1, x: 5000, y: -5000 });
});

test('a zoom keeps what is under the pointer under it', () => {
  // the pointer 100 px right of the centre, over a point of the picture; doubled, that point is still there
  const view = changed(fitted(photo), { factor: 2, origin: { x: 100, y: 0 } });
  expect(view).toEqual({ scale: 0.3, x: -100, y: 0 });
  // and a pan comes before the zoom
  expect(changed(fitted(photo), { dx: 10, dy: -20, factor: 2 })).toEqual({ scale: 0.3, x: 20, y: -40 });
  // a zoom past the far end keeps the point under the pointer at the scale it got
  expect(changed({ scale: 16, x: 0, y: 0 }, { factor: 4, origin: { x: 100, y: 0 } })).toEqual({
    scale: 32,
    x: -100,
    y: 0,
  });
});

test('a step zooms by a quarter about the centre, and stops at 100 % on its way past', () => {
  expect(stepped({ scale: 0.4, x: 0, y: 0 }, 'in').scale).toBe(0.5);
  expect(stepped({ scale: 0.9, x: 0, y: 0 }, 'in').scale).toBe(1);
  expect(stepped({ scale: 1, x: 0, y: 0 }, 'in').scale).toBe(1.25);
  expect(stepped({ scale: 1.1, x: 0, y: 0 }, 'out').scale).toBe(1);
  expect(stepped({ scale: 1, x: 0, y: 0 }, 'out').scale).toBe(0.8);
});

test('two fingers pan by their midpoint and zoom by their distance, about where they meet', () => {
  const change = pinched(
    [
      { x: -20, y: 0 },
      { x: 20, y: 0 },
    ],
    [
      { x: 0, y: 10 },
      { x: 80, y: 10 },
    ],
  );
  expect(change).toEqual({ dx: 40, dy: 10, factor: 2, origin: { x: 40, y: 10 } });
  expect(percent(0.31)).toBe('31');
});
