import { useForm } from '@tanstack/react-form';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import type { Codec, CodecOption } from '@/shared/api';

import { SearchProvider } from '../model/context';
import { UNTOUCHED, type Controls } from '../model/controls';
import { searchMachine } from '../model/machine';
import { readyEncoder } from './compress-page.harness';
import { ControlPanel } from './control-panel';

const codec = (format: string, lossy?: boolean, options: CodecOption[] = []): Codec => ({
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
      lossless: !lossy,
      alpha: false,
      animation: false,
      exif: false,
      xmp: false,
      bitDepth: [8],
      options,
    },
  }),
});
// what a build could list: one lossy encoder, one that is lossless only, one format it only reads
const codecs = [
  codec('jpeg', true, [
    { key: 'jpeg:progressive', default: 'true', help: 'progressive scan order; `false` writes baseline' },
  ]),
  codec('png', false, [{ key: 'png:interlace', default: 'false', help: 'write Adam7 interlaced output' }]),
  codec('tiff'),
];

/** What the form says on a change: every field, as it is then. */
type OnChange = (values: Controls) => void;

/** The workspace's part: it holds the form the controls are the fields of, as `useControlsForm` makes it. */
function Held({ onChange }: { onChange: OnChange }) {
  const form = useForm({
    defaultValues: UNTOUCHED,
    listeners: {
      onChange: ({ formApi }) => {
        onChange(formApi.state.values);
      },
    },
  });
  return <ControlPanel form={form} />;
}

/** The controls over a worker that only says what it has. */
async function renderPanel() {
  const encoder = readyEncoder(codecs);
  const onChange = vi.fn<OnChange>();
  const screen = await render(
    <SearchProvider logic={searchMachine.provide({ actors: { encoder } })}>
      <Held onChange={onChange} />
    </SearchProvider>,
  );
  const format = screen.getByRole('combobox', { name: 'Format' });
  const pickFormat = async (name: string | RegExp) => {
    await format.click();
    await screen.getByRole('option', { name }).click();
  };
  /** What the newest change said, for the fields named. */
  const said = (...keys: (keyof Controls)[]) => {
    const values = onChange.mock.lastCall?.[0];
    return values && Object.fromEntries(keys.map((key) => [key, values[key]]));
  };
  return { screen, onChange, format, pickFormat, said };
}

test('the format list is what `codecs()` can write', async () => {
  const { screen, format } = await renderPanel();
  await format.click();

  await expect.element(screen.getByRole('option', { name: 'chosen per image' })).toBeInTheDocument();
  await expect.element(screen.getByRole('option', { name: 'JPEG (jpeg-rs)' })).toBeInTheDocument();
  await expect.element(screen.getByRole('option', { name: 'PNG, lossless (png-rs)' })).toBeInTheDocument();
  await expect.element(screen.getByRole('option', { name: /TIFF/u })).not.toBeInTheDocument();
});

test('the target starts untouched: at the `web` mark, saying `default`, and nothing is reported', async () => {
  const { screen, onChange } = await renderPanel();
  const slider = screen.getByRole('slider', { name: 'Target score' });

  await expect.element(screen.getByRole('radio', { name: 'Target score' })).toBeChecked();
  await expect.element(slider).toHaveValue('70');
  await expect.element(slider).toHaveAttribute('aria-valuetext', 'default');
  await expect.element(screen.getByText('default')).toBeVisible();
  // the presets, marked on the track
  await Promise.all(
    ['thumbnail, 60', 'web, 70', 'archive, 85'].map((mark) =>
      expect.element(screen.getByRole('button', { name: mark })).toBeVisible(),
    ),
  );
  expect(onChange).not.toHaveBeenCalled();
});

test('a moved slider reports its score, with the words SSIMULACRA2 gives it', async () => {
  const { screen, said } = await renderPanel();
  const slider = screen.getByRole('slider', { name: 'Target score' });
  slider.element().focus();
  await userEvent.keyboard('{ArrowRight}');

  await expect.element(slider).toHaveValue('71');
  await expect.element(slider).toHaveAttribute('aria-valuetext', '71, high: barely noticeable side by side');
  await expect.element(screen.getByText('71, high: barely noticeable side by side')).toBeVisible();
  expect(said('mode', 'target')).toEqual({ mode: 'target', target: 71 });

  await screen.getByRole('button', { name: 'archive, 85' }).click();
  await expect.element(screen.getByText('85, excellent: not noticeable in place')).toBeVisible();
  expect(said('target')).toEqual({ target: 85 });

  // and the way back to the package's default
  await screen.getByRole('button', { name: 'use the default' }).click();
  await expect.element(slider).toHaveValue('70');
  await expect.element(screen.getByText('default')).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'use the default' })).not.toBeInTheDocument();
  expect(said('target')).toEqual({ target: null });
});

test('typing a fixed quality chooses it, and the slider chooses the target again', async () => {
  const { screen, said } = await renderPanel();
  const quality = screen.getByRole('spinbutton', { name: 'Encoder quality, no search' });
  await expect.element(quality).toHaveValue(80);

  await quality.fill('70');
  await expect.element(screen.getByRole('radio', { name: 'Fixed quality' })).toBeChecked();
  expect(said('mode', 'quality')).toEqual({ mode: 'quality', quality: '70' });

  await screen.getByRole('button', { name: 'web, 70' }).click();
  await expect.element(screen.getByRole('radio', { name: 'Target score' })).toBeChecked();
  expect(said('mode', 'target')).toEqual({ mode: 'target', target: 70 });
});

test('each way to say the quality shows where `codecs()` says the chosen encoder has it', async () => {
  const { screen, pickFormat, said } = await renderPanel();
  // chosen per image: any of the three
  await expect.element(screen.getByRole('radio', { name: 'Lossless' })).toBeVisible();
  await screen.getByRole('radio', { name: 'Lossless' }).click();
  expect(said('mode')).toEqual({ mode: 'lossless' });

  // lossy only: no lossless, and the lossless choice reads as the target, the package's default
  await pickFormat('JPEG (jpeg-rs)');
  await expect.element(screen.getByRole('radio', { name: 'Target score' })).toBeChecked();
  await expect.element(screen.getByRole('radio', { name: 'Lossless' })).not.toBeInTheDocument();
  expect(said('mode')).toEqual({ mode: 'lossless' });

  // and is there again for a format that has it
  await pickFormat('chosen per image');
  await expect.element(screen.getByRole('radio', { name: 'Lossless' })).toBeChecked();

  // lossless only: nothing to say
  await pickFormat('PNG, lossless (png-rs)');
  await expect.element(screen.getByRole('slider', { name: 'Target score' })).not.toBeInTheDocument();
  await expect.element(screen.getByRole('spinbutton', { name: 'Encoder quality, no search' })).not.toBeInTheDocument();
  await expect.element(screen.getByRole('radio', { name: 'Lossless' })).not.toBeInTheDocument();
  expect(said('format')).toEqual({ format: 'png' });
});

test('Advanced stays closed until opened, and a control shows only where it applies', async () => {
  const { screen, said } = await renderPanel();
  const effort = screen.getByRole('spinbutton', { name: 'Effort' });
  await expect.element(effort).not.toBeInTheDocument();

  await screen.getByRole('button', { name: 'Advanced' }).click();
  await expect.element(effort).toBeVisible();
  await expect.element(screen.getByRole('switch', { name: 'Fast' })).toBeVisible();
  await expect.element(screen.getByRole('combobox', { name: 'Position' })).not.toBeInTheDocument();

  // `position` with a fit that crops or pads, `background` with the one that pads
  const fit = screen.getByRole('combobox', { name: 'Fit' });
  await fit.click();
  await screen.getByRole('option', { name: 'cover' }).click();
  await expect.element(screen.getByRole('combobox', { name: 'Position' })).toBeVisible();
  await expect.element(screen.getByRole('textbox', { name: 'Background' })).not.toBeInTheDocument();
  await fit.click();
  await screen.getByRole('option', { name: 'contain' }).click();
  await expect.element(screen.getByRole('textbox', { name: 'Background' })).toBeVisible();
  expect(said('fit')).toEqual({ fit: 'contain' });

  // `fast` with a target only
  await screen.getByRole('radio', { name: 'Fixed quality' }).click();
  await expect.element(screen.getByRole('switch', { name: 'Fast' })).not.toBeInTheDocument();

  // and a default can be chosen again
  await fit.click();
  await screen.getByRole('option', { name: 'default' }).click();
  expect(said('fit')).toEqual({ fit: null });
});

test('the help of `maxPixels` says the tab may run out of memory above the default', async () => {
  const { screen, said } = await renderPanel();
  await screen.getByRole('button', { name: 'Advanced' }).click();
  const maxPixels = screen.getByRole('spinbutton', { name: 'Max pixels' });

  await expect.element(maxPixels).toHaveAccessibleDescription(/The tab may run out of memory above the default/u);
  await maxPixels.fill('1000000');
  expect(said('maxPixels')).toEqual({ maxPixels: '1000000' });
});

test("the backend options are the chosen encoder's, from `codecs()`, each with its default and its help", async () => {
  const { screen, pickFormat, said } = await renderPanel();
  await screen.getByRole('button', { name: 'Advanced' }).click();
  // chosen per image: every encoder's
  await expect.element(screen.getByRole('textbox', { name: 'jpeg:progressive' })).toBeVisible();
  await expect.element(screen.getByRole('textbox', { name: 'png:interlace' })).toBeVisible();

  await pickFormat('JPEG (jpeg-rs)');
  const progressive = screen.getByRole('textbox', { name: 'jpeg:progressive' });
  await expect.element(progressive).toHaveAttribute('placeholder', 'true');
  await expect.element(progressive).toHaveAccessibleDescription('progressive scan order; `false` writes baseline');
  await expect.element(screen.getByRole('textbox', { name: 'png:interlace' })).not.toBeInTheDocument();

  await progressive.fill('false');
  expect(said('codecOpts')).toEqual({ codecOpts: { 'jpeg:progressive': 'false' } });
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
