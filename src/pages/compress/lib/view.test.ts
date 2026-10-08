import { expect, test } from 'vitest';

import { changed, clamped, fitScale, fitted, overflows, percent, pinched, stepped, type Frame } from './view';

// a 4:3 photo on a wide screen: fitted, it is 600 x 450, bound by the height
const photo: Frame = { screen: { width: 1600, height: 450 }, picture: { width: 4000, height: 3000 } };
// a thumbnail smaller than the screen
const small: Frame = { screen: { width: 1200, height: 800 }, picture: { width: 48, height: 32 } };

test('fitted, the picture fills the screen on its tighter side, and never passes its own pixels', () => {
  expect(fitScale(photo)).toBe(0.15);
  expect(fitScale(small)).toBe(1);
  expect(fitted(photo)).toEqual({ scale: 0.15, x: 0, y: 0 });
});

test('a view stays no further out than fitted, no closer than 32, and never pushes the picture off the screen', () => {
  expect(clamped({ scale: 0.01, x: 0, y: 0 }, photo).scale).toBe(0.15);
  expect(clamped({ scale: 100, x: 0, y: 0 }, photo).scale).toBe(32);
  // at 1:1 the picture is 4000 x 3000 over a 1600 x 450 screen: it can be moved until its edge meets the screen's
  expect(clamped({ scale: 1, x: 5000, y: -5000 }, photo)).toEqual({ scale: 1, x: 1200, y: -1275 });
  // a picture smaller than the screen can be moved until it touches the edge, not past it
  expect(clamped({ scale: 1, x: 1000, y: 0 }, small)).toEqual({ scale: 1, x: 576, y: 0 });
});

test('a zoom keeps what is under the pointer under it', () => {
  // the pointer 100 px right of the centre, over a point of the picture; doubled, that point is still there
  const view = changed(fitted(photo), photo, { factor: 2, origin: { x: 100, y: 0 } });
  expect(view).toEqual({ scale: 0.3, x: -100, y: 0 });
  // and a pan comes before the zoom
  expect(changed(fitted(photo), photo, { dx: 10, dy: -20, factor: 2 })).toEqual({ scale: 0.3, x: 20, y: -40 });
});

test('a step zooms by a quarter about the centre, and stops at 100 % on its way past', () => {
  expect(stepped({ scale: 0.4, x: 0, y: 0 }, photo, 'in').scale).toBe(0.5);
  expect(stepped({ scale: 0.9, x: 0, y: 0 }, photo, 'in').scale).toBe(1);
  expect(stepped({ scale: 1, x: 0, y: 0 }, photo, 'in').scale).toBe(1.25);
  expect(stepped({ scale: 1.1, x: 0, y: 0 }, photo, 'out').scale).toBe(1);
  // out from fitted goes nowhere
  expect(stepped(fitted(photo), photo, 'out')).toEqual(fitted(photo));
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
});

test('the picture overflows the screen once it is larger on either side', () => {
  expect(overflows(fitted(photo), photo)).toBe(false);
  expect(overflows({ scale: 0.31, x: 0, y: 0 }, photo)).toBe(true);
  expect(percent(0.31)).toBe('31 %');
});
