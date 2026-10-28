import { expect, test } from 'vitest';

import type { Output } from '@/shared/api';

import type { Searched } from '../model/machine';
import { bytes, detailsOf, difference, recordOf } from './result';

const output: Output = {
  bytes: new Uint8Array(3),
  inputFormat: 'jpeg',
  animated: false,
  width: 4000,
  height: 3000,
  alpha: false,
  content: 'photo',
  format: 'avif',
  outputWidth: 1600,
  outputHeight: 1200,
  backend: 'ravif',
  tier: 'portable',
  quality: 62.5,
  lossless: false,
  target: 70,
  score: 70.3,
  reached: true,
  capped: false,
  iterations: 3,
  trials: [
    { quality: 55, score: 65, size: 16_800 },
    { quality: 65, score: 72, size: 21_400 },
    { quality: 62.5, score: 70.3, size: 19_300 },
  ],
};

const searched = (over: Partial<Output> = {}): Searched => ({
  output: { ...output, ...over },
  file: new File([new Uint8Array(19_300)], 'photo.avif', { type: 'image/avif' }),
  seconds: 1.234,
  asked: {},
});
const source = { name: 'photo.jpg', size: 482_000 };

test('bytes read as the command line prints them', () => {
  expect(bytes(673)).toBe('673 B');
  expect(bytes(45_600)).toBe('45.6 KB');
  expect(bytes(1_200_000)).toBe('1.2 MB');
});

test('the difference is a whole percent, smaller or larger, or none', () => {
  expect(difference(482_000, 19_300)).toBe('96 % smaller');
  expect(difference(1000, 1120)).toBe('12 % larger');
  expect(difference(1000, 1002)).toBe('the same size');
});

test('the details are the input, the output with its backend, the quality, the score with its words, the target and the time', () => {
  expect(detailsOf(source, searched())).toEqual([
    { term: 'input', said: 'photo.jpg, 482.0 KB, jpeg, photo' },
    { term: 'output', said: 'photo.avif, 19.3 KB, avif by ravif (portable)' },
    { term: 'quality', said: '62.5' },
    { term: 'score', said: '70.3, high: barely noticeable side by side' },
    { term: 'target', said: '70, reached in 3 trials' },
    { term: 'time', said: '1.2 s' },
  ]);
});

test('a search that stopped short says so in its target line', () => {
  const missed = detailsOf(source, searched({ reached: false, score: 68.2, iterations: 6 }));
  expect(missed.find((detail) => detail.term === 'target')?.said).toBe('70, not reached in 6 trials');
  const capped = detailsOf(source, searched({ reached: false, capped: true, score: 68.2, iterations: 1 }));
  expect(capped.find((detail) => detail.term === 'target')?.said).toBe(
    '70, not reached in 1 trial; this is the best quality the encoder has',
  );
});

test('a fast result had no search: the target line says so, instead of a target missed in no trials', () => {
  const fast: Output = { ...output, quality: 62 };
  delete fast.score;
  delete fast.reached;
  delete fast.capped;
  delete fast.iterations;
  delete fast.trials;
  const details = detailsOf(source, { ...searched(), output: fast, asked: { fast: true } });
  expect(details.map((detail) => detail.term)).toEqual(['input', 'output', 'quality', 'target', 'time']);
  expect(details[3]?.said).toBe('70, no search: one encode at the seed quality');
});

test('a palette of `png:colors` is lossy at no quality, and the default target it reports is not told of', () => {
  // as 0.4.0 returns it: no quality, no search, and the target an encode without one would have had
  const palette: Output = { ...output, format: 'png', backend: 'oxipng' };
  delete palette.quality;
  delete palette.score;
  delete palette.reached;
  delete palette.capped;
  delete palette.iterations;
  delete palette.trials;
  const details = detailsOf(source, { ...searched(), output: palette, asked: { format: 'png' } });
  expect(details.map((detail) => detail.term)).toEqual(['input', 'output', 'quality', 'time']);
  expect(details[2]?.said).toBe('lossy');
});

test('a lossless result has no quality, score or target to tell of, and an image drawn by the browser says so', () => {
  const drawn: Output = { ...output, lossless: true, target: 70 };
  delete drawn.inputFormat;
  delete drawn.quality;
  delete drawn.score;
  const details = detailsOf(source, { ...searched(), output: drawn });
  expect(details.map((detail) => detail.term)).toEqual(['input', 'output', 'quality', 'time']);
  expect(details[0]?.said).toBe('photo.jpg, 482.0 KB, drawn by the browser, photo');
  expect(details[2]?.said).toBe('lossless');
});

test('the record is what the package returned, without the bytes', () => {
  const record: unknown = JSON.parse(recordOf(output));
  expect(record).not.toHaveProperty('bytes');
  expect(record).toMatchObject({ format: 'avif', score: 70.3, trials: output.trials });
  expect(recordOf(output)).toMatch(/^\{\n {2}"inputFormat": "jpeg",\n/u);
});
