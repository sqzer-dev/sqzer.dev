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
// what a build could list: one lossy encoder, one that is lossless only, one format it only reads. The
// backend options are of every kind the help can say: a switch, a range, a select, and plain text
const codecs = [
  codec('jpeg', true, [
    { key: 'jpeg:progressive', default: 'true', help: 'progressive scan order; `false` writes baseline' },
    { key: 'jpeg:smoothing', default: '0', help: 'input smoothing `0..=100`, hides dithering noise' },
    { key: 'jpeg:model', default: 'ycbcr', help: '`ycbcr` or `rgb`; `rgb` is larger' },
    { key: 'jpeg:comment', default: '', help: 'a comment to write' },
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
  /** A step to the right on a slider. */
  const step = async (name: string) => {
    screen.getByRole('slider', { name }).element().focus();
    await userEvent.keyboard('{ArrowRight}');
  };
  return { screen, onChange, format, pickFormat, said, step };
}

test('the format list is what `codecs()` can write', async () => {
  const { screen, format } = await renderPanel();
  await format.click();

  await expect.element(screen.getByRole('option', { name: 'chosen per image' })).toBeInTheDocument();
  await expect.element(screen.getByRole('option', { name: 'JPEG (jpeg-rs)' })).toBeInTheDocument();
  await expect.element(screen.getByRole('option', { name: 'PNG, lossless (png-rs)' })).toBeInTheDocument();
  await expect.element(screen.getByRole('option', { name: /TIFF/u })).not.toBeInTheDocument();
});

test("the target starts untouched: at the package's default, saying so, and nothing is reported", async () => {
  const { screen, onChange } = await renderPanel();
  const slider = screen.getByRole('slider', { name: 'Target score' });

  await expect.element(screen.getByRole('radio', { name: 'Target score' })).toBeChecked();
  await expect.element(slider).toHaveValue('70');
  await expect.element(slider).toHaveAttribute('aria-valuetext', 'default: 70, high: barely noticeable side by side');
  await expect.element(screen.getByText('default: 70, high: barely noticeable side by side')).toBeVisible();
  // the track is the scale, in the four `score` tokens as the browser paints them
  const track = slider.element().closest('[data-slot=slider]')?.querySelector('[data-slot=slider-track]');
  const painted = track && getComputedStyle(track).backgroundImage;
  expect(painted).toMatch(/^linear-gradient\(/u);
  expect(new Set(painted?.match(/rgb\([^)]*\)/gu)).size).toBe(4);
  // the presets, named under their ticks
  await Promise.all(
    ['thumbnail, 60', 'web, 70', 'archive, 85'].map((mark) =>
      expect.element(screen.getByRole('button', { name: mark })).toBeVisible(),
    ),
  );
  expect(onChange).not.toHaveBeenCalled();
});

test('a moved slider reports its score, with the words SSIMULACRA2 gives it, and the way back', async () => {
  const { screen, said, step } = await renderPanel();
  const slider = screen.getByRole('slider', { name: 'Target score' });
  await step('Target score');

  await expect.element(slider).toHaveValue('71');
  await expect.element(slider).toHaveAttribute('aria-valuetext', '71, high: barely noticeable side by side');
  await expect.element(screen.getByText('71, high: barely noticeable side by side')).toBeVisible();
  expect(said('mode', 'target')).toEqual({ mode: 'target', target: 71 });

  await screen.getByRole('button', { name: 'archive, 85' }).click();
  await expect.element(screen.getByText('85, excellent: not noticeable in place')).toBeVisible();
  expect(said('target')).toEqual({ target: 85 });

  await screen.getByRole('button', { name: 'use the default' }).click();
  await expect.element(slider).toHaveValue('70');
  await expect.element(screen.getByText(/^default: 70/u)).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'use the default' })).not.toBeInTheDocument();
  expect(said('target')).toEqual({ target: null });
});

test('the ways to say the quality are cards: the active one bordered, the others dimmed, and a slider picks its card', async () => {
  const { screen, said, step } = await renderPanel();
  const card = (title: string) => screen.getByRole('radio', { name: title }).element().parentElement;
  expect(card('Target score')?.dataset['active']).toBe('true');
  expect(card('Fixed quality')?.dataset['active']).toBeUndefined();
  expect(getComputedStyle(card('Fixed quality') ?? document.body).opacity).toBe('0.6');
  const quality = screen.getByRole('slider', { name: 'Encoder quality, no search' });
  await expect.element(quality).toHaveValue('80');

  await step('Encoder quality, no search');
  await expect.element(screen.getByRole('radio', { name: 'Fixed quality' })).toBeChecked();
  expect(card('Fixed quality')?.dataset['active']).toBe('true');
  expect(said('mode', 'quality')).toEqual({ mode: 'quality', quality: 81 });

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
  await expect.element(screen.getByRole('slider', { name: 'Encoder quality, no search' })).not.toBeInTheDocument();
  await expect.element(screen.getByRole('radio', { name: 'Lossless' })).not.toBeInTheDocument();
  expect(said('format')).toEqual({ format: 'png' });
});

test('the resize is one section with a switch: off, its controls are away; on, a control shows only where it applies', async () => {
  const { screen, said } = await renderPanel();
  const resize = screen.getByRole('switch', { name: 'Resize' });
  await expect.element(screen.getByRole('spinbutton', { name: 'Width' })).not.toBeInTheDocument();

  await resize.click();
  await expect.element(screen.getByRole('spinbutton', { name: 'Width' })).toBeVisible();
  await expect.element(screen.getByRole('spinbutton', { name: 'Height' })).toBeVisible();
  await expect.element(screen.getByRole('combobox', { name: 'Position' })).not.toBeInTheDocument();
  expect(said('resize')).toEqual({ resize: true });

  // the fit's select shows the package's default until one is chosen
  const fit = screen.getByRole('combobox', { name: 'Fit' });
  await expect.element(screen.getByText('default: inside')).toBeVisible();
  // `position` with a fit that crops or pads, `background` with the one that pads
  await fit.click();
  await screen.getByRole('option', { name: 'cover' }).click();
  await expect.element(screen.getByRole('combobox', { name: 'Position' })).toBeVisible();
  await expect.element(screen.getByRole('textbox', { name: 'Background' })).not.toBeInTheDocument();
  await fit.click();
  await screen.getByRole('option', { name: 'contain' }).click();
  await expect.element(screen.getByRole('textbox', { name: 'Background' })).toBeVisible();
  expect(said('fit')).toEqual({ fit: 'contain' });

  // and a default can be chosen again
  await fit.click();
  await screen.getByRole('option', { name: 'default: inside' }).click();
  expect(said('fit')).toEqual({ fit: null });
});

test('Advanced stays closed until opened, with sliders for ranges and the defaults shown', async () => {
  const { screen, said, step } = await renderPanel();
  const effort = screen.getByRole('slider', { name: 'Effort' });
  await expect.element(effort).not.toBeInTheDocument();

  await screen.getByRole('button', { name: 'Advanced' }).click();
  // the package states no default effort: the slider rests on a notch left of its range that says so
  await expect.element(effort).toHaveAttribute('aria-valuetext', 'default');
  await expect.element(screen.getByText("default: the package's")).toBeVisible();
  await step('Effort');
  await expect.element(effort).toHaveValue('0');
  expect(said('effort')).toEqual({ effort: 0 });
  await screen.getByRole('switch', { name: 'Fast' }).click();
  expect(said('fast')).toEqual({ fast: true });

  const maxPixels = screen.getByRole('spinbutton', { name: 'Max pixels' });
  await expect.element(maxPixels).toHaveAttribute('placeholder', '24000000');
  await expect.element(maxPixels).toHaveAccessibleDescription(/The tab may run out of memory above the default/u);
  await maxPixels.fill('1000000');
  expect(said('maxPixels')).toEqual({ maxPixels: '1000000' });

  // `fast` with a target only
  await screen.getByRole('radio', { name: 'Fixed quality' }).click();
  await expect.element(screen.getByRole('switch', { name: 'Fast' })).not.toBeInTheDocument();
});

test("the backend options are the chosen encoder's, from `codecs()`, each as the control its help says", async () => {
  const { screen, pickFormat, said, step } = await renderPanel();
  await screen.getByRole('button', { name: 'Advanced' }).click();
  // chosen per image, and no result yet: none to show
  await expect.element(screen.getByRole('switch', { name: 'jpeg:progressive' })).not.toBeInTheDocument();

  await pickFormat('JPEG (jpeg-rs)');
  // `true` or `false`: a switch at its default, and flipped back it is the default again
  const progressive = screen.getByRole('switch', { name: 'jpeg:progressive' });
  await expect.element(progressive).toBeChecked();
  await expect.element(progressive).toHaveAccessibleDescription('progressive scan order; `false` writes baseline');
  await progressive.click();
  expect(said('codecOpts')).toEqual({ codecOpts: { 'jpeg:progressive': 'false' } });
  await progressive.click();
  expect(said('codecOpts')).toEqual({ codecOpts: { 'jpeg:progressive': '' } });

  // a range: a slider resting at its default
  const smoothing = screen.getByRole('slider', { name: 'jpeg:smoothing' });
  await expect.element(smoothing).toHaveValue('0');
  await expect.element(smoothing).toHaveAttribute('aria-valuetext', 'default');
  await step('jpeg:smoothing');
  expect(said('codecOpts')).toEqual({ codecOpts: { 'jpeg:progressive': '', 'jpeg:smoothing': '1' } });

  // listed values: a select showing the default
  const model = screen.getByRole('combobox', { name: 'jpeg:model' });
  await expect.element(screen.getByText('default: ycbcr')).toBeVisible();
  await model.click();
  await screen.getByRole('option', { name: 'rgb' }).click();
  expect(said('codecOpts')).toMatchObject({ codecOpts: { 'jpeg:model': 'rgb' } });

  // anything else: typed
  await screen.getByRole('textbox', { name: 'jpeg:comment' }).fill('hi');
  expect(said('codecOpts')).toMatchObject({ codecOpts: { 'jpeg:comment': 'hi' } });
  await expect.element(screen.getByRole('switch', { name: 'png:interlace' })).not.toBeInTheDocument();
});
