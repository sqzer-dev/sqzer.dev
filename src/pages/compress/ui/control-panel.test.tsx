import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';

import { renderPanel } from './control-panel.harness';

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
  await expect.element(slider).toHaveAttribute('aria-valuetext', 'default: high: barely noticeable side by side');
  await expect.element(screen.getByText('default: high: barely noticeable side by side')).toBeVisible();
  await expect.element(screen.getByRole('button', { name: /^Target score: 70\./u })).toBeVisible();
  // the track is the scale, in the four `score` tokens as the browser paints them
  const track = slider.element().closest('[data-slot=slider]')?.querySelector('[data-slot=slider-track]');
  const painted = track && getComputedStyle(track).backgroundImage;
  expect(painted).toMatch(/^linear-gradient\(/u);
  expect(new Set(painted?.match(/(?:rgb|oklch)\([^)]*\)/gu)).size).toBe(4);
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
  await expect.element(screen.getByText('high: barely noticeable side by side')).toBeVisible();
  expect(said('mode', 'target')).toEqual({ mode: 'target', target: 71 });

  await screen.getByRole('button', { name: 'archive, 85' }).click();
  await expect.element(screen.getByText('excellent: not noticeable in place')).toBeVisible();
  expect(said('target')).toEqual({ target: 85 });

  // the number stands at the title row, typed where it is shown
  await screen.getByRole('button', { name: /^Target score: 85\./u }).click();
  await screen.getByRole('spinbutton', { name: 'Target score' }).fill('95');
  await userEvent.keyboard('{Enter}');
  await expect.element(slider).toHaveValue('95');
  expect(said('target')).toEqual({ target: 95 });

  await screen.getByRole('button', { name: 'use the default' }).click();
  await expect.element(slider).toHaveValue('70');
  await expect.element(screen.getByText(/^default: high/u)).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'use the default' })).not.toBeInTheDocument();
  expect(said('target')).toEqual({ target: null });
});

test('the ways to say the quality are cards: the active one bordered, the others dimmed, and a slider picks its card', async () => {
  const { screen, said, step } = await renderPanel();
  const card = (title: string) => {
    const found = screen.getByRole('radio', { name: title }).element().closest('[data-choice]');
    return found instanceof HTMLElement ? found : null;
  };
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

test('the resize is behind an expander, with the sides linked, and a control shows only where it applies', async () => {
  const { screen, said } = await renderPanel();
  await expect.element(screen.getByRole('spinbutton', { name: 'Width' })).not.toBeInTheDocument();

  await screen.getByRole('button', { name: 'Resize' }).click();
  const width = screen.getByRole('spinbutton', { name: 'Width' });
  await expect.element(width).toBeVisible();
  await expect.element(screen.getByRole('spinbutton', { name: 'Height' })).toBeVisible();
  // no image here: the sides are empty, the link is on, and no preset stands
  await expect.element(width).toHaveAttribute('placeholder', 'original');
  await expect.element(screen.getByRole('button', { name: 'Keep the ratio' })).toHaveAttribute('aria-pressed', 'true');
  await expect.element(screen.getByText('Custom').first()).toBeVisible();
  await expect.element(screen.getByRole('combobox', { name: 'Position' })).not.toBeInTheDocument();

  // the fit's select opens on the package's default until one is chosen, and nothing is said of it
  const fit = screen.getByRole('combobox', { name: 'Fit' });
  await expect.element(screen.getByText('inside', { exact: true })).toBeVisible();
  // `position` with a fit that crops or pads, `background` with the one that pads
  await fit.click();
  await screen.getByRole('option', { name: 'cover' }).click();
  await expect.element(screen.getByRole('combobox', { name: 'Position' })).toBeVisible();
  await expect.element(screen.getByRole('textbox', { name: 'Background' })).not.toBeInTheDocument();
  await fit.click();
  await screen.getByRole('option', { name: 'contain' }).click();
  await expect.element(screen.getByRole('textbox', { name: 'Background' })).toBeVisible();
  expect(said('fit')).toEqual({ fit: 'contain' });

  // the default chosen by hand is the default again: nothing is said of it (ADR-0007 D6)
  await fit.click();
  await screen.getByRole('option', { name: 'inside' }).click();
  expect(said('fit')).toEqual({ fit: null });
});
