import { expect, test } from 'vitest';

import { chart, SIDE, TOP } from './chart';

const size = { width: 204, height: 115 };
/** A run of `n` trials, each ten points up from the one before. */
const run = (n: number) => Array.from({ length: n }, (_, i) => ({ quality: 10 * i, score: 10 * i }));

test('the trials stand across, the scale of 0 to 100 runs up, with a rule every twenty points', () => {
  const drawn = chart([{ quality: 100, score: 100 }], [], null, size);

  // the sides leave a point's radius, and the bottom rule sits on the last pixel row, crisp
  expect(drawn.rules).toEqual([114.5, 94.5, 74.5, 54.5, 34.5, 14.5]);
  // one trial stands at the left, with room for a second
  expect(drawn.slots).toBe(2);
  expect(drawn.score.points).toEqual([{ x: SIDE, y: TOP }]);
  expect(drawn.target).toBeNull();
});

test('the score and the quality are two lines over the same trials, and the target a rule at its score', () => {
  const drawn = chart(
    [
      { quality: 50, score: 65 },
      { quality: 60, score: 72.5 },
    ],
    [[{ quality: 40, score: 30 }]],
    70,
    size,
  );

  expect(drawn.score.path).toBe('M4 49 L200 41.5');
  expect(drawn.quality.path).toBe('M4 64 L200 54');
  expect(drawn.target).toBe(44.5);
  // a run of one trial is a lone point, since its path draws nothing
  expect(drawn.previous).toEqual([{ path: 'M4 84', lone: { x: 4, y: 84 } }]);
});

test('the longest run drawn sets how many trials stand across, and a value past the scale stops at its edge', () => {
  const drawn = chart([{ quality: 110, score: -5 }], [run(5)], 70, size);

  expect(drawn.slots).toBe(5);
  expect(drawn.score.points).toEqual([{ x: SIDE, y: size.height - 1 }]);
  expect(drawn.quality.path).toBe(`M${SIDE} ${TOP}`);
  expect(drawn.previous[0]?.path.split(' L')).toHaveLength(5);
});
