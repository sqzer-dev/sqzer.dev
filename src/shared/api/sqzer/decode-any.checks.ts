// What `decodeAny` does in this browser, on the page and in a worker. The
// package's own tests run in Node, which has no canvas, so the canvas path
// of `decodeAny` is only ever checked here.
//
// ok     as the package documents it
// note   differs between browsers and is allowed to: read it, do not fix it
// FAIL   a defect, in the package or in this page
import init, { decodeAny, type DecodeAnyOptions, type SqzerImage } from 'sqzer';

export type Check = { mark: 'ok' | 'note' | 'FAIL'; name: string; detail: string };

const fixtures = {
  jpeg: new URL('../../../../tests/fixtures/pattern-rgb.jpg', import.meta.url),
  svg: new URL('../../../../tests/fixtures/pattern-rgb.svg', import.meta.url),
  heic: new URL('../../../../tests/fixtures/pattern-rgb.heic', import.meta.url),
};

async function fixture(url: URL) {
  const response = await fetch(url);
  return new Uint8Array(await response.arrayBuffer());
}

const inWorker = typeof document === 'undefined';
const size = (image: SqzerImage) => `${image.width}x${image.height}`;

// Count the bitmaps `decodeAny` makes and the ones it closes. A bitmap
// holds decoded pixels until it is closed, so the two must agree.
function countBitmaps() {
  const make = globalThis.createImageBitmap;
  // oxlint-disable-next-line typescript/unbound-method -- only ever called with a bitmap as `this`
  const { close } = ImageBitmap.prototype;
  const count = { made: 0, closed: 0 };
  // `decodeAny` hands over a blob and nothing else
  globalThis.createImageBitmap = async (source: ImageBitmapSource) => {
    const bitmap = await make(source);
    count.made += 1;
    return bitmap;
  };
  ImageBitmap.prototype.close = function closeCounted(this: ImageBitmap) {
    count.closed += 1;
    close.call(this);
  };
  const restore = () => {
    globalThis.createImageBitmap = make;
    ImageBitmap.prototype.close = close;
  };
  return { count, make, close, restore };
}

type Bitmaps = ReturnType<typeof countBitmaps>;

// The pixels of a decoded image: through a lossless PNG and back.
async function pixels(image: SqzerImage, { make, close }: Bitmaps) {
  const { bytes } = image.encode({ format: 'png' });
  const drawn = await make(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
  const context = new OffscreenCanvas(drawn.width, drawn.height).getContext('2d');
  if (!context) throw new Error('this browser gives no canvas to read the pixels from');
  context.drawImage(drawn, 0, 0);
  const { data, width } = context.getImageData(0, 0, drawn.width, drawn.height);
  close.call(drawn);
  return (x: number, y: number) => data[(y * width + x) * 4 + 2];
}

// The fixtures all hold one 48 x 32 pattern, whose blue channel steps
// from 40 to 220 between columns 23 and 24. Drawn `scale` times larger
// from the vector, the step stays one pixel wide; scaled up from a 48
// pixel bitmap, it smears.
async function blur(image: SqzerImage, scale: number, bitmaps: Bitmaps) {
  const blue = await pixels(image, bitmaps);
  const left = blue(24 * scale - 1, 5 * scale);
  const right = blue(24 * scale, 5 * scale);
  return left === 40 && right === 220 ? null : `blue is ${left} then ${right} across the edge, not 40 then 220`;
}

// One call of `decodeAny`, described.
async function decode(bytes: Uint8Array, options?: DecodeAnyOptions) {
  try {
    return { image: await decodeAny(bytes, options) };
  } catch (thrown) {
    const kind = thrown instanceof Error && 'kind' in thrown ? String(thrown.kind) : 'not a SqzerError';
    return { kind, message: thrown instanceof Error ? thrown.message : String(thrown) };
  }
}

// 1. the package's own decoder comes first: no bitmap for a JPEG
async function jpeg({ count }: Bitmaps): Promise<Check> {
  const { image, kind, message } = await decode(await fixture(fixtures.jpeg));
  if (!image) return { mark: 'FAIL', name: 'jpeg', detail: `${kind}: ${message}` };
  const fine = image.format === 'jpeg' && size(image) === '48x32' && count.made === 0;
  const detail = `${size(image)}, format ${image.format}, ${count.made} bitmaps made`;
  image.free();
  return { mark: fine ? 'ok' : 'FAIL', name: 'jpeg', detail };
}

// 2. SVG at its own size
async function svg(bytes: Uint8Array, bitmaps: Bitmaps): Promise<Check> {
  const { image, kind, message } = await decode(bytes);
  if (!image) {
    const allowed = kind === 'DecoderUnavailable' && inWorker;
    return allowed
      ? { mark: 'note', name: 'svg', detail: `not in a worker here: ${message}` }
      : { mark: 'FAIL', name: 'svg', detail: `${kind}: ${message}` };
  }
  const right = size(image) === '48x32' && image.format === 'svg';
  const wrong = right ? await blur(image, 1, bitmaps) : 'wrong size or format';
  const detail = `${size(image)}, format ${image.format}${wrong === null ? '' : `, ${wrong}`}`;
  image.free();
  return { mark: wrong === null ? 'ok' : 'FAIL', name: 'svg', detail };
}

// 3. SVG drawn to fit a width: on the page from the vector, in a worker from a bitmap
async function svgAtWidth(bytes: Uint8Array, bitmaps: Bitmaps): Promise<Check> {
  const name = 'svg at width 480';
  const { image, kind, message } = await decode(bytes, { width: 480 });
  if (!image) return { mark: 'FAIL', name, detail: `${kind}: ${message}` };
  const sized = size(image) === '480x320';
  const wrong = sized ? await blur(image, 10, bitmaps) : 'wrong size';
  const detail = size(image);
  image.free();
  if (wrong === null) return { mark: 'ok', name, detail: `${detail}, sharp` };
  if (inWorker && sized) return { mark: 'note', name, detail: `${detail}, scaled from a bitmap: ${wrong}` };
  return { mark: 'FAIL', name, detail: `${detail}, ${wrong}` };
}

// 4. an image over the limit is refused, and its bitmap closed
async function overLimit(name: string, bytes: Uint8Array): Promise<Check> {
  const { image, kind, message } = await decode(bytes, { maxPixels: 1000 });
  image?.free();
  const detail = image ? 'was decoded' : `${kind}: ${message}`;
  return { mark: kind === 'TooLarge' ? 'ok' : 'FAIL', name, detail };
}

// 5. HEIC: Safari decodes it, nothing else does
async function heic({ count }: Bitmaps): Promise<Check[]> {
  const bytes = await fixture(fixtures.heic);
  const before = count.made;
  const { image, kind, message } = await decode(bytes);
  if (!image) {
    return kind === 'DecoderUnavailable'
      ? [{ mark: 'note', name: 'heic', detail: `not in this browser: ${message}` }]
      : [{ mark: 'FAIL', name: 'heic', detail: `${kind}: ${message}` }];
  }
  const right = size(image) === '48x32' && image.format === 'heic';
  const detail = `${size(image)}, format ${image.format}, ${count.made - before} bitmaps made`;
  image.free();
  return [{ mark: right ? 'ok' : 'FAIL', name: 'heic', detail }, await overLimit('heic over maxPixels', bytes)];
}

export async function run(): Promise<Check[]> {
  await init();
  const bitmaps = countBitmaps();
  try {
    const checks = [await jpeg(bitmaps)];
    const vector = await fixture(fixtures.svg);
    const atOwnSize = await svg(vector, bitmaps);
    checks.push(atOwnSize);
    if (atOwnSize.mark !== 'note') {
      checks.push(await svgAtWidth(vector, bitmaps), await overLimit('svg over maxPixels', vector));
    }
    checks.push(...(await heic(bitmaps)));
    // 6. every bitmap made was closed, the refused ones included
    const { made, closed } = bitmaps.count;
    checks.push({ mark: made === closed ? 'ok' : 'FAIL', name: 'bitmaps', detail: `${made} made, ${closed} closed` });
    return checks;
  } finally {
    bitmaps.restore();
  }
}
