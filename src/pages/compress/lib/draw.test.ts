import { expect, test } from 'vitest';

import type { Picked } from '../model/picked';
import { draw } from './draw';

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="2"><rect width="4" height="2" fill="#f00"/></svg>';
const vector: Picked = {
  name: 'a.svg',
  vector: true,
  bytes: new ArrayBuffer(0),
  blob: new Blob([svg], { type: 'image/svg+xml' }),
};

test('a vector image is drawn at the width asked for, keeping its shape', async () => {
  const drawn = await draw(vector, 40);
  expect([drawn.width, drawn.height]).toEqual([40, 20]);
});

test("the limit on the pixels is the one asked for, and the package's own without one", async () => {
  await expect(draw(vector, 40, 100)).rejects.toThrow('40x20 is over the limit of 0.0001 megapixels');
  await expect(draw(vector, 40, 800)).resolves.toMatchObject({ width: 40 });
  // 8000 by 4000
  await expect(draw(vector, 8000)).rejects.toThrow('over the limit of 24 megapixels');
});
