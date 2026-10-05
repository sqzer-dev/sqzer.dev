import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { fromCallback } from 'xstate';

import type { Output } from '@/shared/api';

import { SearchProvider, useSearchRef } from '../model/context';
import type { EncoderCommand, EncoderEvent } from '../model/encoder';
import { searchMachine } from '../model/machine';
import { Comparison } from './comparison';

const fixture = new URL('../../../../tests/fixtures/pattern-rgb.jpg', import.meta.url);

// The fixture is 48 x 32. The output is said to be half of it, as after a resize.
const output: Output = {
  bytes: new Uint8Array(1),
  animated: false,
  width: 48,
  height: 32,
  alpha: false,
  content: 'photo',
  format: 'jpeg',
  outputWidth: 24,
  outputHeight: 16,
  backend: 'mozjpeg-rs',
  tier: 'portable',
  lossless: false,
};

/** The picker's part: one button that hands the machine `file`. */
function Pick({ file }: { file: File }) {
  const search = useSearchRef();
  const image = { name: file.name, vector: false, bytes: new ArrayBuffer(0), blob: file };
  return (
    <button type="button" onClick={() => search.send({ type: 'picked', image, options: {} })}>
      Pick
    </button>
  );
}

/** The comparison over a worker that reads and encodes at once, with the fixture picked. */
async function renderComparison() {
  const file = new File([await (await fetch(fixture)).blob()], 'pattern-rgb.jpg', { type: 'image/jpeg' });
  const answers: Record<string, EncoderEvent> = {
    read: {
      type: 'decoded',
      decoded: { width: 48, height: 32, format: 'jpeg', alpha: false, animated: false },
      drawnWidth: null,
    },
    encode: { type: 'done', result: { output, file, seconds: 1 } },
  };
  const encoder = fromCallback<EncoderCommand>(({ sendBack, receive }) => {
    sendBack({ type: 'ready', version: '0.0.0', codecs: [] });
    receive((command) => {
      const answer = answers[command.type];
      if (answer) sendBack(answer);
    });
  });
  const screen = await render(
    <SearchProvider logic={searchMachine.provide({ actors: { encoder } })}>
      <Pick file={file} />
      <Comparison />
    </SearchProvider>,
  );
  await screen.getByRole('button', { name: 'Pick' }).click();
  return screen;
}

test("each side's size sits in the corner over it", async () => {
  const screen = await renderComparison();
  const before = screen.getByText('Before: 48 × 32');
  const after = screen.getByText('After: 24 × 16');

  await expect.element(before).toBeVisible();
  await expect.element(after).toBeVisible();
  // the input's on the side of the picture as it was dropped, the output's on the side as it was encoded
  const handle = screen.getByRole('slider', { name: 'Before on the left, after on the right' }).element();
  const { left, width } = handle.getBoundingClientRect();
  const middle = left + width / 2;
  expect(before.element().getBoundingClientRect().right).toBeLessThan(middle);
  expect(after.element().getBoundingClientRect().left).toBeGreaterThan(middle);
});

test('the handle clips the after side where it stands', async () => {
  const screen = await renderComparison();
  const after = screen.getByRole('img', { name: 'As sqzer encoded it' });
  await expect.element(after).toBeVisible();
  expect(getComputedStyle(after.element()).clipPath).toBe('inset(0px 0px 0px 50%)');

  await screen.getByRole('slider', { name: 'Before on the left, after on the right' }).fill('25');

  expect(getComputedStyle(after.element()).clipPath).toBe('inset(0px 0px 0px 25%)');
});
