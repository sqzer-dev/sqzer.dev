import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { fromCallback } from 'xstate';

import type { Output } from '@/shared/api';

import { SearchProvider } from '../model/context';
import type { EncoderCommand } from '../model/encoder';
import { searchMachine } from '../model/machine';
import { CompressPage } from './compress-page';

const fixture = new URL('../../../../tests/fixtures/pattern-rgb.jpg', import.meta.url);

const output: Output = {
  bytes: new Uint8Array(1),
  animated: false,
  width: 48,
  height: 32,
  alpha: false,
  content: 'photo',
  format: 'jpeg',
  outputWidth: 48,
  outputHeight: 32,
  backend: 'mozjpeg-rs',
  tier: 'portable',
  lossless: false,
};

// Longer than the controls rest and the machine waits for a busy worker, together.
const SETTLED_MS = 800;

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** The page over workers that read and encode at once, and say what they were asked. */
async function renderPage() {
  const file = new File([await (await fetch(fixture)).blob()], 'pattern-rgb.jpg', { type: 'image/jpeg' });
  const workers: EncoderCommand[][] = [];
  const encoder = fromCallback<EncoderCommand>(({ sendBack, receive }) => {
    const asked: EncoderCommand[] = [];
    workers.push(asked);
    sendBack({ type: 'ready', version: '0.0.0', codecs: [] });
    receive((command) => {
      asked.push(command);
      if (command.type === 'read') {
        const decoded = { width: 48, height: 32, format: 'jpeg', alpha: false, animated: false };
        sendBack({ type: 'decoded', decoded, drawnWidth: null });
      }
      if (command.type === 'encode') sendBack({ type: 'done', result: { output, file, seconds: 1 } });
    });
  });
  const screen = await render(
    <SearchProvider logic={searchMachine.provide({ actors: { encoder } })}>
      <CompressPage />
    </SearchProvider>,
  );
  const encodes = () => workers.flat().flatMap((command) => (command.type === 'encode' ? [command.options] : []));
  const drop = () => screen.getByLabelText('Drop an image here, paste one, or choose a file.').upload(file);
  return { screen, workers, encodes, drop };
}

test('an image dropped on a page nobody touched is encoded with no options', async () => {
  const { screen, encodes, drop } = await renderPage();
  await drop();

  await expect.element(screen.getByRole('status')).toHaveTextContent('Done in 1.0 s.');
  expect(encodes()).toEqual([{}]);
});

test('the controls rest before a search starts with what they say', async () => {
  const { screen, workers, encodes, drop } = await renderPage();
  await drop();
  await expect.element(screen.getByRole('status')).toHaveTextContent('Done in 1.0 s.');

  const width = screen.getByRole('spinbutton', { name: 'Width' });
  await width.fill('16');
  await width.fill('1600');
  await wait(SETTLED_MS);

  // one search for the two changes, on the worker that holds the image
  expect(encodes()).toEqual([{}, { width: 1600 }]);
  expect(workers).toHaveLength(1);
});

// https://github.com/sqzer-dev/sqzer.dev/issues/8
test('a control changed just before a drop does not start the search twice', async () => {
  const { screen, workers, encodes, drop } = await renderPage();
  await screen.getByRole('spinbutton', { name: 'Width' }).fill('1600');
  await drop();
  await wait(SETTLED_MS);

  expect(encodes()).toEqual([{ width: 1600 }]);
  expect(workers).toHaveLength(1);
});
