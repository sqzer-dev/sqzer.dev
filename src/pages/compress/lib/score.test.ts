import { expect, test } from 'vitest';

import { describe, PRESETS, TARGET } from './score';

test("a score reads as SSIMULACRA2's words for the highest line it reaches", () => {
  expect(describe(100)).toBe('100, visually lossless');
  expect(describe(90)).toBe('90, visually lossless');
  expect(describe(89)).toBe('89, excellent: not noticeable in place');
  expect(describe(80)).toBe('80, very high: not noticeable side by side');
  expect(describe(75)).toBe('75, high: barely noticeable side by side');
  expect(describe(70)).toBe('70, high: barely noticeable side by side');
  expect(describe(69)).toBe('69, medium: slightly annoying artifacts');
  expect(describe(30)).toBe('30, low: obvious artifacts');
});

test('the presets sit inside the range of the slider', () => {
  for (const { score } of PRESETS) {
    expect(score).toBeGreaterThan(TARGET.min);
    expect(score).toBeLessThan(TARGET.max);
  }
});
