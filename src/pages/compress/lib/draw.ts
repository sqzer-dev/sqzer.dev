import type { Picked } from '../model/picked';

// The package's default `maxPixels`, for the one image the page draws itself.
const MAX_PIXELS = 24_000_000;

async function load(blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * The image drawn by the browser, for what the package cannot decode: RGBA
 * as `fromPixels` takes it. A vector image is drawn at `width`, sharp at any
 * size; pixels are drawn at their own size and resized by the package.
 */
export async function draw(image: Picked, width: number): Promise<ImageData> {
  const img = await load(image.blob);
  let { naturalWidth: w, naturalHeight: h } = img;
  if (!(w && h)) throw new Error('the browser gives no size for this image');
  if (image.vector && width) {
    h = Math.max(1, Math.round((h * width) / w));
    w = width;
  }
  if (w * h > MAX_PIXELS) {
    throw new Error(`${w}x${h} is over the limit of ${MAX_PIXELS / 1e6} megapixels`);
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('the browser gives no canvas to draw on');
  context.drawImage(img, 0, 0, w, h);
  return context.getImageData(0, 0, w, h);
}
