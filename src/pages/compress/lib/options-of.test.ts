import { expect, test } from 'vitest';

import type { Codec } from '@/shared/api';

import { UNTOUCHED } from '../model/controls';
import { optionsOf } from './options-of';

// a build that writes PNG, and only lossless
const png: Codec = {
  format: 'png',
  extension: 'png',
  mime: 'image/png',
  decoderFeatures: [],
  encoderFeatures: [],
  encoder: {
    backend: 'png-rs',
    tier: 'portable',
    lossy: false,
    lossless: true,
    alpha: true,
    animation: false,
    exif: false,
    xmp: false,
    bitDepth: [8],
    options: [],
  },
};

test("controls that were not touched send nothing, so the defaults are the package's", () => {
  expect(optionsOf(UNTOUCHED, [png])).toEqual({});
});

test('a score that was typed is sent, as a number', () => {
  expect(optionsOf({ ...UNTOUCHED, target: '85' }, [png])).toEqual({ target: 85 });
});

test('a fixed quality is sent once it is chosen, and the score with it is not', () => {
  expect(optionsOf({ ...UNTOUCHED, mode: 'quality', target: '85' }, [png])).toEqual({ quality: 80 });
});

test('a format and a width are sent as they are said', () => {
  expect(optionsOf({ ...UNTOUCHED, format: 'avif', width: '1600' }, [png])).toEqual({ format: 'avif', width: 1600 });
});

test('a format that is lossless only takes no score and no quality', () => {
  expect(optionsOf({ ...UNTOUCHED, format: 'png', target: '85' }, [png])).toEqual({ format: 'png' });
});
