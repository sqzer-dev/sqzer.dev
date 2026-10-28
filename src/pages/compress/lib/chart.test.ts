import { expect, test } from 'vitest';

import { chart, SIDE, TOP } from './chart';

const size = { width: 204, height: 115 };
/** Trials as the chart takes them, each with a size of nothing, so its line lies on the bottom rule. */
const sized = (trials: { quality: number; score: number }[]) => trials.map((trial) => ({ ...trial, size: 0 }));
/** The numbers in a piece of a path. */
const numbers = (text: string) => text.match(/-?[\d.]+/gu)?.map(Number) ?? [];
/** A number as the path writes it. */
const tenth = (n: number) => Math.round(n * 10) / 10;
/** Where the target's label goes for `trials` searching for `target`. */
const at = (target: number, trials: { quality: number; score: number }[]) =>
  chart(sized(trials), [], target, size, 1).target;
/** A run of `n` trials, each ten points up from the one before. */
const run = (n: number) => Array.from({ length: n }, (_, i) => ({ quality: 10 * i, score: 10 * i }));

test('the trials stand across, the scale of 0 to 100 runs up, with a rule every twenty points', () => {
  const drawn = chart(sized([{ quality: 100, score: 100 }]), [], null, size, 1);

  // the sides leave a point's radius, and the bottom rule sits on the last pixel row, crisp
  expect(drawn.rules).toEqual([114.5, 94.5, 74.5, 54.5, 34.5, 14.5]);
  // one trial stands at the left
  expect(drawn.score.points).toEqual([{ x: SIDE, y: TOP }]);
  expect(drawn.target).toBeNull();
});

test('the score and the quality are two lines over the same trials, and the target a rule at its score', () => {
  const drawn = chart(
    sized([
      { quality: 50, score: 65 },
      { quality: 60, score: 72.5 },
    ]),
    [[{ quality: 40, score: 30 }]],
    70,
    size,
    1,
  );

  expect(drawn.score.path).toBe('M4 49 L200 41.5');
  expect(drawn.quality.path).toBe('M4 64 L200 54');
  // the run ends nearer the target than it starts, so the label goes to the left end, and the run
  // is under the rule there, so above it
  expect(drawn.target).toEqual({ y: 44.5, label: 'start', side: 'above' });
  // a run of one trial is a lone point, since its path draws nothing
  expect(drawn.previous).toEqual([{ path: 'M4 84', quality: 'M4 74', lone: { x: 4, y: 84 } }]);
});

test('the target is labelled where its rule is clear of the current run, its quality counted too', () => {
  expect(at(70, [])).toEqual({ y: 44.5, label: 'end', side: 'above' });
  const away = [
    { quality: 0, score: 72 },
    { quality: 0, score: 30 },
  ];
  // the end the score is further from, on the side it is not
  expect(at(70, away)).toEqual({ y: 44.5, label: 'end', side: 'above' });
  expect(at(70, away.toReversed())).toEqual({ y: 44.5, label: 'start', side: 'above' });
  // a run hugging the rule from above at both ends leaves the space under it
  const hugging = [
    { quality: 0, score: 91 },
    { quality: 0, score: 90 },
  ];
  expect(at(85, hugging)).toEqual({ y: 29.5, label: 'start', side: 'below' });
  // unless the rule is at the bottom edge, where there is no room under it. The sizes stand at the
  // input's here, at the top, so their number over the last point is not near the rule
  const large = [
    { quality: 0, score: 91, size: 1 },
    { quality: 0, score: 90, size: 1 },
  ];
  expect(chart(large, [], 2, size, 1).target).toEqual({ y: 112.5, label: 'end', side: 'above' });
  // the quality line under a hugging score takes the space below at the start, so the end's is the clearer
  const close = [
    { quality: 77, score: 91 },
    { quality: 73, score: 90 },
  ];
  expect(at(85, close)).toEqual({ y: 29.5, label: 'end', side: 'below' });
});

test('the sizes are a third line, each a share of the input, the top rule the input, and none past it', () => {
  const trials = [
    { quality: 50, score: 60, size: 500 },
    { quality: 70, score: 72, size: 250 },
  ];
  const drawn = chart(trials, [], null, size, 1000);
  // half the input stands at 50, a quarter at 25, on the scale the score and the quality share
  expect(drawn.bytes.path).toBe(
    chart(
      sized([
        { quality: 50, score: 0 },
        { quality: 25, score: 0 },
      ]),
      [],
      null,
      size,
      1,
    ).quality.path,
  );
  // the line comes down into its last point, so the number goes under it, off the line
  expect(drawn.bytes.end).toEqual({ y: 114 - 0.25 * (114 - TOP), label: 'end', side: 'below' });
  expect(drawn.bytes.lone).toBeNull();
  // a file larger than the input stops at the top rule, and a run of one trial has its number at the left, where it stands
  const one = chart([{ quality: 50, score: 60, size: 3000 }], [], null, size, 1000).bytes;
  expect(one.end).toEqual({ y: TOP, label: 'start', side: 'above' });
  // and a point of its own, since a path of one point draws nothing
  expect(one.lone).toEqual({ x: SIDE, y: TOP });
  // no trial, no line
  expect(chart([], [], 70, size, 1000).bytes).toEqual({ path: '', lone: null, end: null });
});

test("the target's label keeps clear of the size's line, and of its number over the last point", () => {
  // the score and the quality keep away from a rule at 70 at both ends; the size ends just under it
  const trials = [
    { quality: 20, score: 20, size: 100 },
    { quality: 20, score: 20, size: 680 },
  ];
  expect(chart(trials, [], 70, size, 1000).target).toEqual({ y: 44.5, label: 'start', side: 'above' });
});

test('every run spans the width on its own, and a value past the scale stops at its edge', () => {
  const drawn = chart(sized([{ quality: 110, score: -5 }]), [run(5)], 70, size, 1);

  expect(drawn.score.points).toEqual([{ x: SIDE, y: size.height - 1 }]);
  // the run of five ends at the right edge, at its last score of 40
  const bottom = size.height - 1;
  expect(drawn.previous[0]?.path.endsWith(` ${size.width - SIDE} ${bottom - 0.4 * (bottom - TOP)}`)).toBe(true);
  const three = chart(sized(run(3)), [], null, size, 1);
  expect(three.score.points.map((point) => point.x)).toEqual([SIDE, size.width / 2, size.width - SIDE]);
  expect(drawn.quality.path).toBe(`M${SIDE} ${TOP}`);
  // three points and more are joined by cubic segments, one per pair
  expect(drawn.previous[0]?.path.split(' C')).toHaveLength(5);
});

test('the curve through the trials bends, and never past a point it passes', () => {
  const trials = [40, 80, 80, 60].map((score) => ({ quality: 0, score }));
  const drawn = chart(sized(trials), [], null, size, 1);
  const [move, ...segments] = drawn.score.path.split(' C');

  expect(move).toBe(`M${drawn.score.points[0]?.x} ${drawn.score.points[0]?.y}`);
  expect(segments).toHaveLength(3);
  for (const [index, segment] of segments.entries()) {
    const [, h1y, , h2y, x, y] = numbers(segment);
    const from = drawn.score.points[index];
    const to = drawn.score.points[index + 1];
    // each cubic ends on its point, as the path writes it, and its handles stay between the two points it joins
    expect({ x, y }).toEqual({ x: tenth(to?.x ?? 0), y: tenth(to?.y ?? 0) });
    const [low, high] = [Math.min(from?.y ?? 0, to?.y ?? 0), Math.max(from?.y ?? 0, to?.y ?? 0)];
    expect(h1y).toBeGreaterThanOrEqual(low);
    expect(h1y).toBeLessThanOrEqual(high);
    expect(h2y).toBeGreaterThanOrEqual(low);
    expect(h2y).toBeLessThanOrEqual(high);
  }
});
