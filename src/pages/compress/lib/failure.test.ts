import { expect, test } from 'vitest';

import { explain, type About } from './failure';

const about: About = { name: 'photo.heic', format: undefined, maxPixels: undefined };

test('a failure of the worker itself says to reload, whatever the browser said', () => {
  expect(explain({ message: 'this browser has no module workers', stage: 'start' }, about)).toEqual({
    sentence: 'The encoder could not start. Reload the page, or try another browser.',
    detail: 'this browser has no module workers',
  });
  expect(explain({ message: 'offline.', stage: 'load' }, about).sentence).toMatch(/^The encoder could not load\./u);
});

test("the sentence names the file and what to do, and the package's words are the detail", () => {
  expect(explain({ message: 'unknown format', kind: 'UnknownFormat', stage: 'read' }, about)).toEqual({
    sentence:
      'photo.heic is no image this page knows. Choose a file in a format it reads, or one the browser can show.',
    detail: 'unknown format',
  });
  expect(explain({ message: 'bad params', kind: 'InvalidParams', stage: 'encode' }, about).sentence).toBe(
    'The package refused the options. Change the ones it names.',
  );
});

test('a missing decoder or encoder names the build that has it', () => {
  const decoder = { message: 'no decoder for HEIC', kind: 'DecoderUnavailable', stage: 'read' } as const;
  expect(explain({ ...decoder, availableIn: ['native-heic'] }, about).sentence).toBe(
    'This build cannot decode photo.heic, and the browser could not draw it either. The `sqzer` command line built with `native-heic` can.',
  );
  // no build has one: nothing to point at
  expect(explain({ ...decoder, availableIn: [] }, about).sentence).toBe(
    'This build cannot decode photo.heic, and the browser could not draw it either.',
  );
  const encoder = { message: 'no encoder for JPEG XL', kind: 'EncoderUnavailable', stage: 'encode' } as const;
  expect(explain({ ...encoder, availableIn: ['native-jxl', 'wasm-jxl'] }, { ...about, format: 'jxl' }).sentence).toBe(
    'This build cannot write jxl. Choose another format. The `sqzer` command line built with `native-jxl` or `wasm-jxl` writes it.',
  );
});

test('an image over the limit is told the limit, in megapixels, and where to raise it', () => {
  const large = { message: 'image has 30000000 pixels, limit is 24000000', kind: 'TooLarge', stage: 'read' } as const;
  expect(explain(large, about).sentence).toMatch(
    /^photo\.heic has more pixels than the limit of 24 megapixels\. Raise Max pixels under Advanced/u,
  );
  expect(explain(large, { ...about, maxPixels: 1 }).sentence).toContain('the limit of 1 pixel.');
  expect(explain(large, { ...about, maxPixels: 1500 }).sentence).toContain('the limit of 1500 pixels.');
  expect(explain(large, { ...about, maxPixels: 2_500_000 }).sentence).toContain('the limit of 2.5 megapixels.');
});

test("the browser's own failure to read a file is said as its own, without a full stop doubled", () => {
  expect(explain({ message: 'The source image could not be decoded.', stage: 'read' }, about)).toEqual({
    sentence: 'The browser could not read photo.heic. Choose another file.',
    detail: 'The source image could not be decoded',
  });
  expect(explain({ message: 'gone', stage: 'encode' }, { ...about, name: null }).sentence).toBe(
    'The encode of the image failed.',
  );
});
