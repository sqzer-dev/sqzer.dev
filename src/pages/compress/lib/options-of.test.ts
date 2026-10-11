import { expect, test } from 'vitest';

import type { Codec, CodecOption } from '@/shared/api';

import { UNTOUCHED } from '../model/controls';
import { optionsOf } from './options-of';

const codec = (format: string, lossy: boolean, options: CodecOption[] = []): Codec => ({
  format,
  extension: format,
  mime: `image/${format}`,
  decoderFeatures: [],
  encoderFeatures: [],
  encoder: {
    backend: `${format}-rs`,
    tier: 'portable',
    lossy,
    lossless: !lossy,
    alpha: true,
    animation: false,
    exif: false,
    xmp: false,
    bitDepth: [8],
    options,
  },
});

// a build that writes PNG, lossless only, and JPEG, lossy only, each with one backend option
const codecs = [
  codec('png', false, [{ key: 'png:interlace', default: 'false', help: 'write Adam7 interlaced output' }]),
  codec('jpeg', true, [{ key: 'jpeg:progressive', default: 'true', help: 'progressive scan order' }]),
];

test("controls that were not touched send nothing, so the defaults are the package's", () => {
  expect(optionsOf(UNTOUCHED, codecs)).toEqual({});
});

test('a score the slider was moved to is sent, as a number', () => {
  expect(optionsOf({ ...UNTOUCHED, target: 85 }, codecs)).toEqual({ target: 85 });
});

test('a fixed quality is sent once it is chosen, and the score with it is not', () => {
  expect(optionsOf({ ...UNTOUCHED, mode: 'quality', target: 85 }, codecs)).toEqual({ quality: 80 });
});

test('lossless is sent once it is chosen, with a format that has it or none', () => {
  expect(optionsOf({ ...UNTOUCHED, mode: 'lossless' }, codecs)).toEqual({ lossless: true });
  expect(optionsOf({ ...UNTOUCHED, mode: 'lossless', format: 'png' }, codecs)).toEqual({
    format: 'png',
    lossless: true,
  });
  expect(optionsOf({ ...UNTOUCHED, mode: 'lossless', format: 'jpeg' }, codecs)).toEqual({ format: 'jpeg' });
  // and under JPEG the choice reads as the target, so `fast` goes with it
  expect(optionsOf({ ...UNTOUCHED, mode: 'lossless', format: 'jpeg', fast: true }, codecs)).toEqual({
    format: 'jpeg',
    fast: true,
  });
});

test("a format and a side of the box are sent as they are said, and an empty side, the image's own size, is not", () => {
  expect(optionsOf({ ...UNTOUCHED, format: 'jpeg', width: '1600' }, codecs)).toEqual({ format: 'jpeg', width: 1600 });
  expect(optionsOf({ ...UNTOUCHED, ratio: false }, codecs)).toEqual({});
});

test("with a fit that needs both sides, a side left as the image's own is sent as such; with `inside`, it is not", () => {
  const image = { width: 48, height: 32 };
  expect(optionsOf({ ...UNTOUCHED, width: '24', fit: 'cover' }, codecs, null, image)).toEqual({
    width: 24,
    height: 32,
    fit: 'cover',
  });
  expect(optionsOf({ ...UNTOUCHED, height: '16', fit: 'contain' }, codecs, null, image)).toEqual({
    width: 48,
    height: 16,
    fit: 'contain',
  });
  expect(optionsOf({ ...UNTOUCHED, width: '24', fit: 'inside' }, codecs, null, image)).toEqual({
    width: 24,
    fit: 'inside',
  });
  expect(optionsOf({ ...UNTOUCHED, width: '24' }, codecs, null, image)).toEqual({ width: 24 });
  // both sides as shown: the box is the image's own, which the fit takes as it is
  expect(optionsOf({ ...UNTOUCHED, fit: 'cover' }, codecs, null, image)).toEqual({
    width: 48,
    height: 32,
    fit: 'cover',
  });
  // before the image is read there is no size to send, and the package says what it needs
  expect(optionsOf({ ...UNTOUCHED, width: '24', fit: 'cover' }, codecs)).toEqual({ width: 24, fit: 'cover' });
});

test('a format that is lossless only takes no score and no quality', () => {
  expect(optionsOf({ ...UNTOUCHED, format: 'png', target: 85 }, codecs)).toEqual({ format: 'png' });
  expect(optionsOf({ ...UNTOUCHED, format: 'png', mode: 'quality' }, codecs)).toEqual({ format: 'png' });
});

test('every option behind Advanced and the resize is sent as the package spells it, and nothing that was left empty', () => {
  expect(
    optionsOf(
      {
        ...UNTOUCHED,
        effort: 9,
        subsampling: '420',
        fast: true,
        keepIcc: true,
        keepMetadata: true,
        height: '900',
        fit: 'contain',
        position: 'top-left',
        background: '#ffffff',
        enlarge: true,
        filter: 'nearest',
        maxPixels: '1000000',
      },
      codecs,
    ),
  ).toEqual({
    effort: 9,
    subsampling: '420',
    fast: true,
    keepIcc: true,
    keepMetadata: true,
    height: 900,
    fit: 'contain',
    position: 'top-left',
    background: '#ffffff',
    enlarge: true,
    filter: 'nearest',
    maxPixels: 1000000,
  });
});

test('a control that does not apply sends nothing: the package would refuse the combination', () => {
  // `position` and `background` go with a fit that crops or pads
  expect(optionsOf({ ...UNTOUCHED, fit: 'inside', position: 'top', background: 'white' }, codecs)).toEqual({
    fit: 'inside',
  });
  expect(optionsOf({ ...UNTOUCHED, fit: 'cover', position: 'top', background: 'white' }, codecs)).toEqual({
    fit: 'cover',
    position: 'top',
  });
  // `fast` goes with a target
  expect(optionsOf({ ...UNTOUCHED, mode: 'quality', fast: true }, codecs)).toEqual({ quality: 80 });
  // subsampling means nothing to a lossless encoder
  expect(optionsOf({ ...UNTOUCHED, format: 'png', subsampling: '444' }, codecs)).toEqual({ format: 'png' });
});

test("the backend options of the encoder in use are sent as a map, and the other encoders' are kept but not sent", () => {
  const set = {
    ...UNTOUCHED,
    codecOpts: { 'jpeg:progressive': 'false', 'png:interlace': 'true', 'png:optimize_alpha': '' },
  };
  expect(optionsOf({ ...set, format: 'jpeg' }, codecs)).toEqual({
    format: 'jpeg',
    codecOpts: new Map([['jpeg:progressive', 'false']]),
  });
  expect(optionsOf({ ...set, format: 'png' }, codecs)).toEqual({
    format: 'png',
    codecOpts: new Map([['png:interlace', 'true']]),
  });
  // with the format chosen per image, the options of the format the newest result says it chose, and none before one
  expect(optionsOf(set, codecs)).toEqual({});
  expect(optionsOf(set, codecs, 'png')).toEqual({ codecOpts: new Map([['png:interlace', 'true']]) });
});
