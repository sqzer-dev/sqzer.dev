// The comparison in a test: over a worker that answers at once, on a screen of the test's size.
import { useRef } from 'react';
import { render } from 'vitest-browser-react';
import { fromCallback } from 'xstate';

import type { Output } from '@/shared/api';

import { SearchProvider, useSearchRef } from '../model/context';
import type { EncoderCommand, EncoderEvent } from '../model/encoder';
import { searchMachine } from '../model/machine';
import { useViewer } from '../model/viewer';
import { Comparison } from './comparison';

type Point = { x: number; y: number };

declare module 'vitest/browser' {
  interface BrowserCommands {
    /** Defined in `vitest.config.ts`: a drag with a real mouse, from one point to another. */
    drag: (from: Point, to: Point) => Promise<void>;
  }
}

export const middle = (element: Element): Point => {
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

/** The screen's part: the comparison fills what it is put in, and the viewer is measured against it. */
function Screen({ small = false }: { small?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const viewer = useViewer(ref);
  return (
    <div ref={ref} className={small ? 'relative h-6 w-24' : 'relative h-96'} data-testid="screen">
      <Comparison flat={false} viewer={viewer} />
    </div>
  );
}

/**
 * The comparison over a worker that reads and encodes at once, with the fixture picked. The worker
 * answers for a preview only when the test says, through `preview`, and `encodeAgain` has the
 * controls change, which the worker answers with another file. A `small` screen is one the fixture
 * does not fit in.
 */
export async function renderComparison(small = false) {
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
      <Screen small={small} />
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

/** The box of the picture as it was dropped. */
export function pictureBox(screen: Awaited<ReturnType<typeof renderComparison>>['screen']) {
  return screen.getByRole('img', { name: 'As it was dropped' }).element().getBoundingClientRect();
}

/** The comparison's own region, which takes the wheel, the pointer and the keys. */
export function region(screen: Awaited<ReturnType<typeof renderComparison>>['screen']) {
  return screen.getByRole('application', { name: 'Before and after' });
}
