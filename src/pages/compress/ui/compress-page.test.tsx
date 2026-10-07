import { beforeEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
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
  const drop = async () => {
    await screen.getByLabelText('Choose an image').upload(file);
    await expect.element(screen.getByRole('status')).toHaveTextContent('Done in 1.0 s.');
  };
  return { screen, workers, encodes, drop };
}

// a wide screen, where the panels float. the last test is a phone
beforeEach(async () => {
  await page.viewport(1200, 800);
});

test('with no file, the page is the drop zone: a line and the button that opens the picker', async () => {
  const { screen } = await renderPage();

  await expect.element(screen.getByRole('heading', { name: 'sqzer' })).toBeVisible();
  await expect.element(screen.getByText('Drop an image, paste one, or choose a file.')).toBeVisible();
  await expect.element(screen.getByLabelText('Choose an image')).toHaveAttribute('type', 'file');
  await expect.element(screen.getByRole('contentinfo').getByText(/nothing is sent anywhere/u)).toBeVisible();
  // the controls come with the image
  await expect.element(screen.getByRole('combobox', { name: 'Format' })).not.toBeInTheDocument();
});

test('an image dropped on a page nobody touched is encoded with no options', async () => {
  const { encodes, drop } = await renderPage();
  await drop();

  expect(encodes()).toEqual([{}]);
});

test('with a file, the image is the page and the rest floats over it in panels', async () => {
  const { screen, drop } = await renderPage();
  await drop();

  const picture = screen.getByRole('img', { name: 'As it was dropped' }).element().closest('main');
  expect(picture?.getBoundingClientRect()).toMatchObject({ x: 0, y: 0, width: 1200, height: 800 });
  await expect.element(screen.getByRole('button', { name: 'Options' })).toHaveAttribute('aria-expanded', 'true');
  await expect.element(screen.getByRole('button', { name: 'Result' })).toHaveAttribute('aria-expanded', 'true');
  await expect.element(screen.getByRole('link', { name: 'Download pattern-rgb.jpg' })).toBeVisible();
});

test('a collapsed panel keeps what was typed into it', async () => {
  const { screen, encodes, drop } = await renderPage();
  await drop();
  const width = screen.getByRole('spinbutton', { name: 'Width' });
  await width.fill('1600');

  const options = screen.getByRole('button', { name: 'Options' });
  await options.click();
  await expect.element(options).toHaveAttribute('aria-expanded', 'false');
  await expect.element(width).not.toBeInTheDocument();
  await options.click();

  await expect.element(width).toHaveValue(1600);
  await wait(SETTLED_MS);
  expect(encodes()).toEqual([{}, { width: 1600 }]);
});

test('the checkerboard under a transparent image can be a flat colour', async () => {
  const { screen, drop } = await renderPage();
  await drop();
  const picture = screen.getByRole('img', { name: 'As it was dropped' }).element().parentElement;
  const checkerboard = screen.getByRole('button', { name: 'Checkerboard under a transparent image' });
  await expect.element(checkerboard).toHaveAttribute('aria-pressed', 'true');
  expect(picture && getComputedStyle(picture).backgroundImage).toContain('repeating-conic-gradient');

  await checkerboard.click();

  await expect.element(checkerboard).toHaveAttribute('aria-pressed', 'false');
  expect(picture && getComputedStyle(picture).backgroundImage).toBe('none');
});

test('the controls rest before a search starts with what they say', async () => {
  const { screen, workers, encodes, drop } = await renderPage();
  await drop();

  const width = screen.getByRole('spinbutton', { name: 'Width' });
  await width.fill('16');
  await width.fill('1600');
  await wait(SETTLED_MS);

  // one search for the two changes, on the worker that holds the image
  expect(encodes()).toEqual([{}, { width: 1600 }]);
  expect(workers).toHaveLength(1);
});

// https://github.com/sqzer-dev/sqzer.dev/issues/8
test('a control changed just before another image is picked does not start the search twice', async () => {
  const { screen, workers, encodes, drop } = await renderPage();
  await drop();
  await screen.getByRole('spinbutton', { name: 'Width' }).fill('1600');
  await screen.getByLabelText('New image').upload(new File(['not an image'], 'other.jpg'));
  await wait(SETTLED_MS);

  expect(encodes()).toEqual([{}, { width: 1600 }]);
  expect(workers).toHaveLength(1);
});

test('on a phone the panels are one bottom expander, and the controls keep what they say across the change', async () => {
  const { screen, drop } = await renderPage();
  await drop();
  await screen.getByRole('spinbutton', { name: 'Width' }).fill('1600');

  await page.viewport(390, 780);

  await expect.element(screen.getByRole('dialog', { name: 'Result and options' })).toBeInTheDocument();
  await expect.element(screen.getByRole('button', { name: 'Options' })).not.toBeInTheDocument();
  await expect.element(screen.getByRole('spinbutton', { name: 'Width' })).toHaveValue(1600);
});
