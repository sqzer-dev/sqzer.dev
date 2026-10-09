// The page in a test: over a worker that answers at once, with the toaster the notices need.
import { expect } from 'vitest';
import { render } from 'vitest-browser-react';
import { fromCallback } from 'xstate';

import type { Codec, Output } from '@/shared/api';
import { Toaster } from '@/shared/ui/toast';

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
  quality: 60,
  lossless: false,
  // what the package searched for with no target asked: its default for this image
  target: 72,
  score: 72.5,
};

// Longer than the controls rest and the machine waits for a busy worker, together.
export const SETTLED_MS = 800;

export const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** A worker that only says what it has: for the controls on their own. */
export const readyEncoder = (codecs: Codec[]) =>
  fromCallback<EncoderCommand>(({ sendBack }) => {
    sendBack({ type: 'ready', version: '0.0.0', codecs });
  });

/** What the stub worker gets wrong, if anything: its start, or reading the image. */
type Fails = 'start' | 'read' | null;

/** The page over workers that read and encode at once, and say what they were asked. */
export async function renderPage(fails: Fails = null) {
  const file = new File([await (await fetch(fixture)).blob()], 'pattern-rgb.jpg', { type: 'image/jpeg' });
  const workers: EncoderCommand[][] = [];
  const encoder = fromCallback<EncoderCommand>(({ sendBack, receive }) => {
    const asked: EncoderCommand[] = [];
    workers.push(asked);
    if (fails === 'start') {
      sendBack({ type: 'failed', message: 'the worker did not start', broken: true });
      return;
    }
    sendBack({ type: 'ready', version: '0.0.0', codecs: [] });
    receive((command) => {
      asked.push(command);
      if (command.type === 'read' && fails === 'read') {
        sendBack({ type: 'failed', message: 'no decoder for HEIC in this build', broken: false });
        return;
      }
      if (command.type === 'read') {
        const decoded = { width: 48, height: 32, format: 'jpeg', alpha: false, animated: false };
        sendBack({ type: 'decoded', decoded, drawnWidth: null });
      }
      if (command.type === 'encode') sendBack({ type: 'done', result: { output, file, seconds: 1 } });
    });
  });
  const screen = await render(
    <Toaster>
      <SearchProvider logic={searchMachine.provide({ actors: { encoder } })}>
        <CompressPage />
      </SearchProvider>
    </Toaster>,
  );
  const encodes = () => workers.flat().flatMap((command) => (command.type === 'encode' ? [command.options] : []));
  const drop = async () => {
    await screen.getByLabelText('Choose an image').upload(file);
    // the workspace, which is loaded once there is an image. The search is over within the quiet 500 ms
    // of ADR-0005, so no toast tells of it
    await expect.element(screen.getByRole('link', { name: 'Download pattern-rgb.jpg' })).toBeVisible();
  };
  return { screen, workers, encodes, drop };
}

/** An element in `colour`, so the browser says how it paints it. */
export function swatch(colour: string) {
  const element = document.createElement('span');
  element.style.color = colour;
  document.body.append(element);
  return element;
}

/** The box of the panel whose title is `name`. */
export function panel(screen: Awaited<ReturnType<typeof renderPage>>['screen'], name: string) {
  const box = screen.getByRole('button', { name }).element().closest('[data-size]')?.getBoundingClientRect();
  if (!box) throw new Error(`no panel is called ${name}`);
  return box;
}
