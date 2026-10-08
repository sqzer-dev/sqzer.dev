import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { commands, userEvent } from 'vitest/browser';
import { fromCallback } from 'xstate';

import type { Output } from '@/shared/api';

import { SearchProvider, useSearchRef } from '../model/context';
import type { EncoderCommand, EncoderEvent } from '../model/encoder';
import { searchMachine } from '../model/machine';
import { Comparison } from './comparison';

type Point = { x: number; y: number };

declare module 'vitest/browser' {
  interface BrowserCommands {
    /** Defined in `vitest.config.ts`: a drag with a real mouse, from one point to another. */
    drag: (from: Point, to: Point) => Promise<void>;
  }
}

const middle = (element: Element): Point => {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { x: left + width / 2, y: top + height / 2 };
};

const fixture = new URL('../../../../tests/fixtures/pattern-rgb.jpg', import.meta.url);

// The fixture is 48 x 32. The output is said to be about half of it, as after a resize, with the
// height rounded as a resampler rounds it: its aspect is not the input's.
const output: Output = {
  bytes: new Uint8Array(1),
  animated: false,
  width: 48,
  height: 32,
  alpha: false,
  content: 'photo',
  format: 'jpeg',
  outputWidth: 25,
  outputHeight: 16,
  backend: 'mozjpeg-rs',
  tier: 'portable',
  lossless: false,
};

/** The picker's part: one button that hands the machine `file`. */
function Pick({ file, label = 'Pick' }: { file: File; label?: string }) {
  const search = useSearchRef();
  const image = { name: file.name, vector: false, bytes: new ArrayBuffer(0), blob: file };
  return (
    <button type="button" onClick={() => search.send({ type: 'picked', image, options: {} })}>
      {label}
    </button>
  );
}

/** The controls' part: one button that has the machine search again, as a change of a control does. */
function Change() {
  const search = useSearchRef();
  return (
    <button type="button" onClick={() => search.send({ type: 'options', options: {} })}>
      Change
    </button>
  );
}

/**
 * The comparison over a worker that reads and encodes at once, with the fixture picked. The worker
 * answers for a preview only when the test says, through `preview`, and `encodeAgain` has the
 * controls change, which the worker answers with another file.
 */
async function renderComparison() {
  const file = new File([await (await fetch(fixture)).blob()], 'pattern-rgb.jpg', { type: 'image/jpeg' });
  // what the worker can decode and the browser cannot show, a TIFF say
  const unshowable = new File(['not an image'], 'pattern.tiff', { type: 'image/tiff' });
  const answers: Record<string, EncoderEvent> = {
    read: {
      type: 'decoded',
      decoded: { width: 48, height: 32, format: 'jpeg', alpha: false, animated: false },
      drawnWidth: null,
    },
    encode: { type: 'done', result: { output, file, seconds: 1 } },
  };
  // another file for the same encode, as a change of the controls gives
  const again = new File([await (await fetch(fixture)).blob()], 'pattern-rgb-again.jpg', { type: 'image/jpeg' });
  const answer: { to?: (event: EncoderEvent) => void } = {};
  const encoder = fromCallback<EncoderCommand>(({ sendBack, receive }) => {
    answer.to = sendBack;
    sendBack({ type: 'ready', version: '0.0.0', codecs: [] });
    receive((command) => {
      const reply = answers[command.type];
      if (reply) sendBack(reply);
    });
  });
  const screen = await render(
    <SearchProvider logic={searchMachine.provide({ actors: { encoder } })}>
      <Pick file={file} />
      <Pick file={unshowable} label="Pick the unshowable" />
      <Change />
      {/* the screen's part: the comparison fills what it is put in */}
      <div className="relative h-96" data-testid="screen">
        <Comparison flat={false} />
      </div>
    </SearchProvider>,
  );
  await screen.getByRole('button', { name: 'Pick', exact: true }).click();
  return {
    screen,
    preview: () => answer.to?.({ type: 'previewed', preview: file }),
    encodeAgain: async () => {
      answers['encode'] = { type: 'done', result: { output, file: again, seconds: 1 } };
      await screen.getByRole('button', { name: 'Change' }).click();
    },
    // the layer itself, hidden or not: a locator by role would skip it while it is hidden
    source: () => document.querySelector('[data-slot=before]'),
  };
}

test("each side's size sits in the corner of the screen over it", async () => {
  const { screen } = await renderComparison();
  const before = screen.getByText('Before: 48 × 32');
  const after = screen.getByText('After: 25 × 16');

  await expect.element(before).toBeVisible();
  await expect.element(after).toBeVisible();
  // the input's on the side of the picture as it was dropped, the output's on the side as it was encoded
  const edges = screen.getByTestId('screen').element().getBoundingClientRect();
  expect(before.element().getBoundingClientRect().left - edges.left).toBe(12);
  expect(edges.right - after.element().getBoundingClientRect().right).toBe(12);
});

test('the handle is a slider, and it clips the after side where it stands on the screen', async () => {
  const { screen } = await renderComparison();
  const after = screen.getByRole('img', { name: 'As sqzer encoded it' });
  await expect.element(after).toBeVisible();
  // the layer the size of the screen that holds the picture, not the picture
  const layer = after.element().closest('[data-slot=after]');
  expect(layer && getComputedStyle(layer).clipPath).toBe('inset(0px 0px 0px 50%)');

  // by the keys of a range input
  const handle = screen.getByRole('slider', { name: 'Before on the left, after on the right' });
  handle.element().focus();
  await userEvent.keyboard('{ArrowLeft}');
  await expect.poll(() => layer && getComputedStyle(layer).clipPath).toBe('inset(0px 0px 0px 49%)');
  await userEvent.keyboard('{Home}');
  await expect.poll(() => layer && getComputedStyle(layer).clipPath).toBe('inset(0px 0px 0px 0%)');
});

test('the line runs the height of the screen, past the picture, with the handle in its middle', async () => {
  const { screen } = await renderComparison();
  const slider = screen.getByRole('slider', { name: 'Before on the left, after on the right' });
  // the line comes with the after side, once the browser has loaded it
  await expect.element(slider).toBeVisible();
  const edges = screen.getByTestId('screen').element().getBoundingClientRect();
  const picture = screen.getByRole('img', { name: 'As it was dropped' }).element().getBoundingClientRect();
  const handle = slider.element();
  const line = handle.closest('[data-index]')?.getBoundingClientRect();
  const knob = handle.closest('[data-index]')?.querySelector('span')?.getBoundingClientRect();

  expect(line?.height).toBe(edges.height);
  expect(line?.height).toBeGreaterThan(picture.height);
  expect(knob && line && knob.top + knob.height / 2).toBe(line && line.top + line.height / 2);
  expect(knob && line && knob.left + knob.width / 2).toBe(line && line.left + line.width / 2);
});

test('a drag of the handle across the screen selects nothing', async () => {
  const { screen } = await renderComparison();
  const handle = screen.getByRole('slider', { name: 'Before on the left, after on the right' });
  await expect.element(handle).toBeVisible();

  // from the middle of the screen to the label in its far corner
  await commands.drag(middle(handle.element()), middle(screen.getByText('After: 25 × 16').element()));

  await expect.poll(() => handle.element().getAttribute('aria-valuenow')).not.toBe('50');
  expect(getSelection()?.toString()).toBe('');
});

test('an image the browser cannot show is hidden until the worker previews it, and the next image shows at once', async () => {
  const { screen, preview, source } = await renderComparison();
  await expect.element(screen.getByRole('img', { name: 'As it was dropped' })).toBeVisible();

  await screen.getByRole('button', { name: 'Pick the unshowable' }).click();

  // the browser's `<img>` fails on it, and nothing takes its place: not the alt text in an empty box
  await expect.poll(() => source()?.hasAttribute('hidden')).toBe(true);
  preview();
  await expect.poll(() => source()?.hasAttribute('hidden')).toBe(false);
  await expect.element(screen.getByRole('img', { name: 'As it was dropped' })).toBeVisible();

  await screen.getByRole('button', { name: 'Pick', exact: true }).click();

  await expect.element(screen.getByRole('img', { name: 'As it was dropped' })).toBeVisible();
  expect(source()?.hasAttribute('hidden')).toBe(false);
});

test('the next encode replaces the after side in place, without a blink', async () => {
  const { screen, encodeAgain } = await renderComparison();
  const after = screen.getByRole('img', { name: 'As sqzer encoded it' });
  await expect.element(after).toBeVisible();
  const layer = after.element().closest('[data-slot=after]');
  if (!layer) throw new Error('the after side has no layer');
  const was = after.element().getAttribute('src');
  // every change of the layer's `hidden` from here on
  const hides: boolean[] = [];
  const watcher = new MutationObserver(() => {
    hides.push(layer.hasAttribute('hidden'));
  });
  watcher.observe(layer, { attributes: true, attributeFilter: ['hidden'] });

  await encodeAgain();

  await expect.poll(() => after.element().getAttribute('src')).not.toBe(was);
  await expect.element(after).toBeVisible();
  watcher.disconnect();
  expect(hides).toEqual([]);
});

test("a resized output is drawn into the input's box, so the two sides line up", async () => {
  const { screen } = await renderComparison();
  const before = screen.getByRole('img', { name: 'As it was dropped' });
  const after = screen.getByRole('img', { name: 'As sqzer encoded it' });
  await expect.element(after).toBeVisible();

  // the input is 48 x 32 and the output 25 x 16: both are shown at the input's size, to the pixel
  expect(before.element().getBoundingClientRect()).toMatchObject({ width: 48, height: 32 });
  expect(after.element().getBoundingClientRect()).toEqual(before.element().getBoundingClientRect());
});
