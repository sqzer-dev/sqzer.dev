import { expect, test } from 'vitest';

import { kindOf } from './option-kind';

// what `codecs()` lists at 0.3.0, word for word
test('`true` or `false` is a switch', () => {
  expect(
    kindOf({ key: 'jpeg:progressive', default: 'true', help: 'progressive scan order; `false` writes baseline' }),
  ).toEqual({
    kind: 'switch',
  });
  expect(kindOf({ key: 'png:interlace', default: 'false', help: 'write Adam7 interlaced output' })).toEqual({
    kind: 'switch',
  });
});

test('a range in the help is a slider, whatever the default', () => {
  expect(
    kindOf({ key: 'jpeg:smoothing', default: '0', help: 'input smoothing `0..=100`, hides dithering noise' }),
  ).toEqual({
    kind: 'range',
    min: 0,
    max: 100,
  });
  expect(
    kindOf({
      key: 'avif:alpha_quality',
      default: 'auto',
      help: 'alpha plane quality `1..=100`; `auto` follows the colour quality',
    }),
  ).toEqual({ kind: 'range', min: 1, max: 100 });
});

test('values listed in backticks with the default among them are a select', () => {
  expect(
    kindOf({ key: 'avif:bit_depth', default: 'auto', help: 'AV1 payload depth, `8`, `10` or `auto` (10)' }),
  ).toEqual({
    kind: 'select',
    values: ['8', '10', 'auto'],
  });
  expect(
    kindOf({
      key: 'avif:color_model',
      default: 'ycbcr',
      help: '`ycbcr` or `rgb`; `rgb` is larger but exact in colour',
    }),
  ).toEqual({
    kind: 'select',
    values: ['ycbcr', 'rgb'],
  });
});

test('anything else is typed', () => {
  expect(kindOf({ key: 'x:name', default: 'photo', help: 'a name for the output' })).toEqual({ kind: 'text' });
  // listed values the default is not among say nothing certain
  expect(kindOf({ key: 'x:mode', default: 'fast', help: 'try `slow` or `slower`' })).toEqual({ kind: 'text' });
});
