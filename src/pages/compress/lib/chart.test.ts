import { expect, test } from 'vitest';

import { chart, SIDE, TOP } from './chart';

const size = { width: 204, height: 115 };

test('the score runs across from 30 to 100, the quality up from 0 to 100, with a rule every twenty points', () => {
  const drawn = chart([{ quality: 100, score: 100 }], [], null, size);

  // the sides leave a point's radius, and the bottom rule sits on the last pixel row, crisp
  expect(drawn.rules).toEqual([114.5, 94.5, 74.5, 54.5, 34.5, 14.5]);
  expect(drawn.low).toBe(30);
  expect(drawn.current.points).toEqual([{ x: size.width - SIDE, y: TOP }]);
  expect(drawn.target).toBeNull();
});

test('consecutive trials are joined in their order, and the target stands at its score', () => {
  const drawn = chart(
    [
      { quality: 50, score: 65 },
      { quality: 60, score: 72.5 },
    ],
    [[{ quality: 40, score: 30 }]],
    65,
    size,
  );

  expect(drawn.current.path).toBe('M102 64 L123 54');
  expect(drawn.target).toBe(102);
  expect(drawn.previous).toEqual(['M4 74']);
});

test('a trial under 30 widens the chart to the ten under it, and one over 100 stops at the edge', () => {
  const drawn = chart([{ quality: 10, score: 7.5 }], [[{ quality: 90, score: 101 }]], 70, size);

  expect(drawn.low).toBe(0);
  expect(drawn.current.points[0]?.x).toBeCloseTo(SIDE + 0.075 * (size.width - 2 * SIDE));
  expect(drawn.previous).toEqual([`M${size.width - SIDE} 24`]);
});
