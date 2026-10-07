// The two toasts of ADR-0005 D2, as the toaster shows them for a machine the test plays the worker of.
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { fromCallback } from 'xstate';

import type { Output } from '@/shared/api';
import { Toaster, useToastManager } from '@/shared/ui/toast';

import { SearchProvider, useSearchRef } from './context';
import type { EncoderCommand, EncoderEvent } from './encoder';
import { searchMachine } from './machine';
import { useNotices } from './notices';

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

const decoded: EncoderEvent = {
  type: 'decoded',
  decoded: { width: 48, height: 32, format: 'jpeg', alpha: false, animated: false },
  drawnWidth: null,
};
const done: EncoderEvent = { type: 'done', result: { output, file: new File([], 'out.jpg'), seconds: 1 } };
const trial: EncoderEvent = { type: 'trial', trial: { n: 1, max: 6, quality: 62, score: 71.4 } };

// Past the quiet 500 ms, and short of them.
const SHOWN_MS = 650;
const QUIET_MS = 300;

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** The page's part: the toasts follow the machine. */
function Notices() {
  useNotices(useToastManager());
  return null;
}

/** The picker's part: one button that hands the machine a file. */
function Pick() {
  const search = useSearchRef();
  const image = { name: 'pattern-rgb.jpg', vector: false, bytes: new ArrayBuffer(0), blob: new Blob() };
  return (
    <button type="button" onClick={() => search.send({ type: 'picked', image, options: {} })}>
      Pick
    </button>
  );
}

/** The toaster over a machine whose worker says nothing until the test does, through `tell`. */
async function renderNotices() {
  const answer: { to?: (event: EncoderEvent) => void } = {};
  const encoder = fromCallback<EncoderCommand>(({ sendBack }) => {
    answer.to = sendBack;
  });
  const screen = await render(
    <Toaster>
      <SearchProvider logic={searchMachine.provide({ actors: { encoder } })}>
        <Notices />
        <Pick />
      </SearchProvider>
    </Toaster>,
  );
  return {
    screen,
    tell: (event: EncoderEvent) => answer.to?.(event),
    ready: () => answer.to?.({ type: 'ready', version: '0.0.0', codecs: [] }),
    pick: () => screen.getByRole('button', { name: 'Pick' }).click(),
    toasts: () => screen.getByRole('dialog').elements().length,
  };
}

test('the encoder is one toast, loading and then ready', async () => {
  const { screen, ready, toasts } = await renderNotices();
  await expect.element(screen.getByText('Loading the encoder.')).toBeVisible();

  ready();

  await expect.element(screen.getByText('Ready.')).toBeVisible();
  await expect.element(screen.getByText('Loading the encoder.')).not.toBeInTheDocument();
  expect(toasts()).toBe(1);
});

test('a search is one toast, shown after 500 ms with the newest trial, and done', async () => {
  const { screen, ready, pick, tell } = await renderNotices();
  ready();
  await pick();
  tell(decoded);
  await wait(QUIET_MS);
  expect(screen.getByText(/^Encoding/u).elements()).toHaveLength(0);

  await wait(SHOWN_MS - QUIET_MS);
  await expect.element(screen.getByText('Encoding pattern-rgb.jpg.')).toBeVisible();

  tell(trial);
  await expect.element(screen.getByText('Trial 1 of at most 6: quality 62 scores 71.4.')).toBeVisible();

  tell(done);
  await expect.element(screen.getByText('Done in 1.0 s.')).toBeVisible();
  await expect.element(screen.getByText('Encoding pattern-rgb.jpg.')).not.toBeInTheDocument();
  // the trial went with the encoding
  await expect.element(screen.getByText(/^Trial 1/u)).not.toBeInTheDocument();
});

test('a fast search shows only that it is done', async () => {
  const { screen, ready, pick, tell } = await renderNotices();
  ready();
  await pick();
  tell(decoded);
  tell(done);

  await expect.element(screen.getByText('Done in 1.0 s.')).toBeVisible();
  await wait(SHOWN_MS);
  expect(screen.getByText(/^Encoding|^Reading/u).elements()).toHaveLength(0);
});

test('a search toast still on the screen follows the next search at once', async () => {
  const { screen, ready, pick, tell } = await renderNotices();
  ready();
  await pick();
  tell(decoded);
  tell(done);
  await expect.element(screen.getByText('Done in 1.0 s.')).toBeVisible();

  await pick();

  await expect.element(screen.getByText('Reading pattern-rgb.jpg.')).toBeVisible();
});

test('a failure closes the search toast', async () => {
  const { screen, ready, pick, tell } = await renderNotices();
  ready();
  await pick();
  tell(decoded);
  await wait(SHOWN_MS);
  await expect.element(screen.getByText('Encoding pattern-rgb.jpg.')).toBeVisible();

  tell({ type: 'failed', message: 'no', broken: false });

  await expect.element(screen.getByText('Encoding pattern-rgb.jpg.')).not.toBeInTheDocument();
});

test('a search toast the reader closed stays closed until the search is done', async () => {
  const { screen, ready, pick, tell } = await renderNotices();
  ready();
  await pick();
  tell(decoded);
  await wait(SHOWN_MS);
  const encoding = screen.getByRole('dialog', { name: 'Encoding pattern-rgb.jpg.' });
  // the close button is there for a pointer or the focus: the stack expands under the pointer first
  await encoding.hover();
  await encoding.getByRole('button', { name: 'Close' }).click();
  await expect.element(encoding).not.toBeInTheDocument();

  tell(trial);
  await wait(QUIET_MS);
  expect(screen.getByText(/^Encoding/u).elements()).toHaveLength(0);

  tell(done);
  await expect.element(screen.getByText('Done in 1.0 s.')).toBeVisible();
});
