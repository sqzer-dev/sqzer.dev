import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';
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
      {/* the screen's part: the comparison fills what it is put in */}
      <div className="relative h-96" data-testid="screen">
        <Comparison flat={false} />
      </div>
    </SearchProvider>,
  );
  await screen.getByRole('button', { name: 'Pick' }).click();
  return screen;
}

test("each side's size sits in the corner of the screen over it", async () => {
  const screen = await renderComparison();
  const before = screen.getByText('Before: 48 × 32');
  const after = screen.getByText('After: 24 × 16');

  await expect.element(before).toBeVisible();
  await expect.element(after).toBeVisible();
  // the input's on the side of the picture as it was dropped, the output's on the side as it was encoded
  const edges = screen.getByTestId('screen').element().getBoundingClientRect();
  expect(before.element().getBoundingClientRect().left - edges.left).toBe(12);
  expect(edges.right - after.element().getBoundingClientRect().right).toBe(12);
});

test('the handle is a slider, and it clips the after side where it stands', async () => {
  const screen = await renderComparison();
  const after = screen.getByRole('img', { name: 'As sqzer encoded it' });
  await expect.element(after).toBeVisible();
  expect(getComputedStyle(after.element()).clipPath).toBe('inset(0px 0px 0px 50%)');

  // by the keys of a range input
  const handle = screen.getByRole('slider', { name: 'Before on the left, after on the right' });
  handle.element().focus();
  await userEvent.keyboard('{ArrowLeft}');
  await expect.poll(() => getComputedStyle(after.element()).clipPath).toBe('inset(0px 0px 0px 49%)');
  await userEvent.keyboard('{Home}');
  await expect.poll(() => getComputedStyle(after.element()).clipPath).toBe('inset(0px 0px 0px 0%)');
});

test('the line runs the height of the picture, with the handle in its middle', async () => {
  const screen = await renderComparison();
  const picture = screen.getByRole('img', { name: 'As it was dropped' }).element().getBoundingClientRect();
  const handle = screen.getByRole('slider', { name: 'Before on the left, after on the right' }).element();
  const line = handle.closest('[data-index]')?.getBoundingClientRect();
  const knob = handle.closest('[data-index]')?.querySelector('span')?.getBoundingClientRect();

  expect(line?.height).toBe(picture.height);
  expect(knob && line && knob.top + knob.height / 2).toBe(line && line.top + line.height / 2);
  expect(knob && line && knob.left + knob.width / 2).toBe(line && line.left + line.width / 2);
});
