import { expect, test } from 'vitest';

import type { Codec, EncodeOptions, Output } from '@/shared/api';

import type { Searched } from '../model/machine';
import { chipsOf } from './chips';

const output: Output = {
  bytes: new Uint8Array(1),
  animated: false,
  width: 48,
  height: 32,
  alpha: false,
  content: 'photo',
  format: 'jpeg',
  outputWidth: 48,
  outputHeight: 32,
  backend: 'mozjpeg-rs',
  tier: 'portable',
  quality: 60,
  lossless: false,
  target: 72,
  score: 72.5,
  reached: true,
  trials: [{ quality: 60, score: 72.5 }],
};

const codecs: Codec[] = [
  {
    format: 'jpeg',
    extension: 'jpg',
    mime: 'image/jpeg',
    decoderFeatures: [],
    encoderFeatures: [],
    encoder: {
      backend: 'mozjpeg-rs',
      tier: 'portable',
      lossy: true,
      lossless: false,
      alpha: false,
      animation: false,
      exif: true,
      xmp: true,
      bitDepth: [8],
      options: [{ key: 'jpeg:progressive', default: 'true', help: 'progressive scan order' }],
    },
  },
];

const searched = (asked: EncodeOptions = {}, over: Partial<Output> = {}): Searched => ({
  output: { ...output, ...over },
  file: new File([], 'a.jpg'),
  seconds: 1,
  asked,
});

const words = (chips: ReturnType<typeof chipsOf>) => chips.map((chip) => chip.word);

test("a result of the package's defaults has one chip, for the target it reached", () => {
  expect(chipsOf(searched(), codecs)).toEqual([
    { word: 'reached', meaning: 'reached: the target of 72 at a score of 72.5' },
  ]);
});

test('a target missed says so, and whether the encoder had no higher quality to try', () => {
  expect(chipsOf(searched({}, { reached: false, score: 68.2 }), codecs)).toEqual([
    { word: 'missed', meaning: 'missed: the target of 72 at a score of 68.2' },
  ]);
  expect(chipsOf(searched({}, { reached: false, capped: true, score: 68.2 }), codecs)[0]?.meaning).toBe(
    'missed: the target of 72 at a score of 68.2, the best quality the encoder has',
  );
});

test('the booleans of the output come first, then what was kept, then every other option sent', () => {
  const asked: EncodeOptions = {
    format: 'jpeg',
    target: 80,
    width: 24,
    keepMetadata: true,
    keepIcc: true,
    effort: 9,
    fast: true,
    fit: 'cover',
    codecOpts: new Map([['jpeg:progressive', 'false']]),
  };
  const chips = chipsOf(searched(asked, { lossless: true, animated: true, outputWidth: 24, outputHeight: 16 }), codecs);
  expect(words(chips)).toEqual([
    'lossless',
    'reached',
    'resized',
    'animated',
    'metadata',
    'icc',
    'effort',
    'fast',
    'fit',
    'jpeg:progressive',
  ]);
  expect(chips.map((chip) => chip.meaning)).toEqual([
    'lossless: the output is exact',
    'reached: the target of 72 at a score of 72.5',
    'resized: from 48 × 32 to 24 × 16',
    'animated: only the first frame was encoded',
    'metadata: EXIF and XMP kept',
    'icc: the ICC profile kept, not converted to sRGB',
    'effort 9',
    'fast: one encode at the seed quality, no search',
    'fit cover, default inside',
    'jpeg:progressive false, default true',
  ]);
});

test('the format, the quality and the box are said elsewhere, and get no chip', () => {
  expect(chipsOf(searched({ format: 'jpeg', quality: 80, width: 48, height: 32 }), codecs)).toEqual([
    { word: 'reached', meaning: 'reached: the target of 72 at a score of 72.5' },
  ]);
});

test('an option the page knows the default of says it, and one it does not says the value alone', () => {
  const chips = chipsOf(searched({ maxPixels: 1000, background: 'white', enlarge: true }), codecs);
  expect(chips.slice(1)).toEqual([
    { word: 'maxPixels', meaning: 'maxPixels 1000, default 24000000' },
    { word: 'background', meaning: 'background white' },
    { word: 'enlarge', meaning: 'enlarge: scaled up to the box' },
  ]);
});
