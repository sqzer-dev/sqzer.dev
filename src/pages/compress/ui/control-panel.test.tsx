import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { fromCallback } from 'xstate';

import type { Codec } from '@/shared/api';

import { SearchProvider } from '../model/context';
import { UNTOUCHED, type Controls } from '../model/controls';
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

/** The page's part: it holds what the controls say. */
function Held({ onChange }: { onChange: (change: Partial<Controls>) => void }) {
  const [values, setValues] = useState(UNTOUCHED);
  return (
    <ControlPanel
      values={values}
      onChange={(change) => {
        setValues({ ...values, ...change });
        onChange(change);
      }}
    />
  );
}

/** The controls over a worker that only says what it has. */
async function renderPanel() {
  const encoder = fromCallback<EncoderCommand>(({ sendBack }) => {
    sendBack({ type: 'ready', version: '0.0.0', codecs });
  });
  const onChange = vi.fn<(change: Partial<Controls>) => void>();
  const screen = await render(
    <SearchProvider logic={searchMachine.provide({ actors: { encoder } })}>
      <Held onChange={onChange} />
    </SearchProvider>,
  );
  const format = screen.getByRole('combobox', { name: 'Format' });
  return { screen, onChange, format };
}

test('the format list is what `codecs()` can write', async () => {
  const { screen, format } = await renderPanel();
  await format.click();

  await expect.element(screen.getByRole('option', { name: 'chosen per image' })).toBeInTheDocument();
  await expect.element(screen.getByRole('option', { name: 'JPEG (jpeg-rs)' })).toBeInTheDocument();
  await expect.element(screen.getByRole('option', { name: 'PNG, lossless (png-rs)' })).toBeInTheDocument();
  await expect.element(screen.getByRole('option', { name: /TIFF/u })).not.toBeInTheDocument();
});

test('the score starts empty and says `default`: the page does not restate what the package defaults to', async () => {
  const { screen, onChange } = await renderPanel();
  const target = screen.getByRole('spinbutton', { name: 'SSIMULACRA2 score to search for' });

  await expect.element(target).toHaveValue(null);
  await expect.element(target).toHaveAttribute('placeholder', 'default');
  expect(onChange).not.toHaveBeenCalled();
});

test('a score is reported as it is typed, and as it is cleared', async () => {
  const { screen, onChange } = await renderPanel();
  const target = screen.getByRole('spinbutton', { name: 'SSIMULACRA2 score to search for' });

  await target.fill('85');
  expect(onChange).toHaveBeenLastCalledWith({ target: '85' });

  await target.clear();
  expect(onChange).toHaveBeenLastCalledWith({ target: '' });
});

test('a format that is lossless only takes no quality', async () => {
  const { screen, onChange, format } = await renderPanel();
  await format.click();
  await screen.getByRole('option', { name: 'PNG, lossless (png-rs)' }).click();

  await expect.element(screen.getByRole('spinbutton', { name: 'SSIMULACRA2 score to search for' })).toBeDisabled();
  await expect.element(screen.getByRole('spinbutton', { name: 'Encoder quality, no search' })).toBeDisabled();
  expect(onChange).toHaveBeenCalledExactlyOnceWith({ format: 'png' });
});

test('choosing a fixed quality and typing a width are each one change', async () => {
  const { screen, onChange } = await renderPanel();
  await screen.getByRole('radio', { name: /fixed/u }).click();
  await screen.getByRole('spinbutton', { name: 'Width' }).fill('1600');

  expect(onChange.mock.calls).toEqual([[{ mode: 'quality' }], [{ width: '1600' }]]);
  await expect.element(screen.getByRole('spinbutton', { name: 'Encoder quality, no search' })).toHaveValue(80);
});

test('"Solid panels" makes the glass opaque from `<html>`, keeps the choice, and is no change of the controls', async () => {
  localStorage.clear();
  const { screen, onChange } = await renderPanel();
  const solid = screen.getByRole('switch', { name: 'Solid panels' });
  await expect.element(solid).not.toBeChecked();
  expect(document.documentElement.dataset['panels']).toBe('glass');

  await solid.click();

  await expect.element(solid).toBeChecked();
  expect(document.documentElement.dataset['panels']).toBe('solid');
  expect(localStorage.getItem('panels')).toBe('solid');
  expect(onChange).not.toHaveBeenCalled();
});

test('"Solid panels" starts as it was left', async () => {
  localStorage.setItem('panels', 'solid');
  const { screen } = await renderPanel();

  await expect.element(screen.getByRole('switch', { name: 'Solid panels' })).toBeChecked();
  expect(document.documentElement.dataset['panels']).toBe('solid');
  localStorage.clear();
});
