import { expect, test } from 'vitest';

import { renderPanel } from './control-panel.harness';

test('Advanced stays closed until opened, with sliders for ranges and the defaults shown', async () => {
  const { screen, said, step } = await renderPanel();
  const effort = screen.getByRole('slider', { name: 'Effort' });
  await expect.element(effort).not.toBeInTheDocument();
  // a press anywhere on a quality card picks it
  screen
    .getByRole('radio', { name: 'Lossless' })
    .element()
    .closest('[data-choice]')
    ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await expect.element(screen.getByRole('radio', { name: 'Lossless' })).toBeChecked();
  screen
    .getByRole('radio', { name: 'Target score' })
    .element()
    .closest('[data-choice]')
    ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await expect.element(screen.getByRole('radio', { name: 'Target score' })).toBeChecked();

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
  // the default is the value shown, so the field steps from it, and nothing is sent until it is typed
  await expect.element(maxPixels).toHaveValue(24000000);
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
  await expect.element(screen.getByText('ycbcr', { exact: true })).toBeVisible();
  await model.click();
  await screen.getByRole('option', { name: 'rgb' }).click();
  expect(said('codecOpts')).toMatchObject({ codecOpts: { 'jpeg:model': 'rgb' } });

  // anything else: typed
  await screen.getByRole('textbox', { name: 'jpeg:comment' }).fill('hi');
  expect(said('codecOpts')).toMatchObject({ codecOpts: { 'jpeg:comment': 'hi' } });
  await expect.element(screen.getByRole('switch', { name: 'png:interlace' })).not.toBeInTheDocument();
});
