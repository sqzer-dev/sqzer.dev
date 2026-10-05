import { createRef } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { fromCallback } from 'xstate';

import type { Codec } from '@/shared/api';

import { optionsOf } from '../lib/options-of';
import { SearchProvider } from '../model/context';
import type { EncoderCommand } from '../model/encoder';
import { searchMachine } from '../model/machine';
import { ControlPanel } from './control-panel';

const codec = (format: string, lossy?: boolean): Codec => ({
  format,
  extension: format,
  mime: `image/${format}`,
  decoderFeatures: [],
  encoderFeatures: [],
  ...(lossy !== undefined && {
    encoder: {
      backend: `${format}-rs`,
      tier: 'portable',
      lossy,
      lossless: true,
      alpha: false,
      animation: false,
      exif: false,
      xmp: false,
      bitDepth: [8],
      options: [],
    },
  }),
});
// what a build could list: one lossy encoder, one that is lossless only, one format it only reads
const codecs = [codec('jpeg', true), codec('png', false), codec('tiff')];

/** The controls over a worker that only says what it has. */
async function renderPanel() {
  const encoder = fromCallback<EncoderCommand>(({ sendBack }) => {
    sendBack({ type: 'ready', version: '0.0.0', codecs });
  });
  const form = createRef<HTMLFormElement>();
  const onChange = vi.fn<() => void>();
  const screen = await render(
    <SearchProvider logic={searchMachine.provide({ actors: { encoder } })}>
      <ControlPanel ref={form} onChange={onChange} />
    </SearchProvider>,
  );
  const options = () => (form.current ? optionsOf(form.current, codecs) : null);
  const format = screen.getByRole('combobox', { name: 'Format' });
  return { screen, onChange, options, format };
}

test('the format list is what `codecs()` can write', async () => {
  const { screen, format } = await renderPanel();
  await format.click();

  await expect.element(screen.getByRole('option', { name: 'chosen per image' })).toBeInTheDocument();
  await expect.element(screen.getByRole('option', { name: 'JPEG (jpeg-rs)' })).toBeInTheDocument();
  await expect.element(screen.getByRole('option', { name: 'PNG, lossless (png-rs)' })).toBeInTheDocument();
  await expect.element(screen.getByRole('option', { name: /TIFF/u })).not.toBeInTheDocument();
});

test('the controls start at the target the page has always sent', async () => {
  const { screen, options } = await renderPanel();

  await expect.element(screen.getByRole('spinbutton', { name: 'SSIMULACRA2 score to search for' })).toHaveValue(70);
  expect(options()).toEqual({ target: 70 });
});

test('a format that is lossless only takes no quality', async () => {
  const { screen, onChange, options, format } = await renderPanel();
  await format.click();
  await screen.getByRole('option', { name: 'PNG, lossless (png-rs)' }).click();

  await expect.element(screen.getByRole('spinbutton', { name: 'SSIMULACRA2 score to search for' })).toBeDisabled();
  await expect.element(screen.getByRole('spinbutton', { name: 'Encoder quality, no search' })).toBeDisabled();
  expect(options()).toEqual({ format: 'png' });
  // the controls rest before a search starts
  expect(onChange).not.toHaveBeenCalled();
  await expect.poll(() => onChange.mock.calls).toHaveLength(1);
});

test('a fixed quality and a width are sent as numbers', async () => {
  const { screen, options } = await renderPanel();
  await screen.getByRole('radio', { name: /fixed/u }).click();
  await screen.getByRole('spinbutton', { name: 'Width' }).fill('1600');

  expect(options()).toEqual({ quality: 80, width: 1600 });
});

test('"Solid panels" makes the glass opaque from `<html>`, keeps the choice, and starts no search', async () => {
  localStorage.clear();
  const { screen, onChange } = await renderPanel();
  const solid = screen.getByRole('switch', { name: 'Solid panels' });
  await expect.element(solid).not.toBeChecked();
  expect(document.documentElement.dataset['panels']).toBe('glass');

  await solid.click();

  await expect.element(solid).toBeChecked();
  expect(document.documentElement.dataset['panels']).toBe('solid');
  expect(localStorage.getItem('panels')).toBe('solid');
  // longer than the controls rest
  await new Promise((resolve) => {
    setTimeout(resolve, 400);
  });
  expect(onChange).not.toHaveBeenCalled();
});

test('"Solid panels" starts as it was left', async () => {
  localStorage.setItem('panels', 'solid');
  const { screen } = await renderPanel();

  await expect.element(screen.getByRole('switch', { name: 'Solid panels' })).toBeChecked();
  expect(document.documentElement.dataset['panels']).toBe('solid');
  localStorage.clear();
});
