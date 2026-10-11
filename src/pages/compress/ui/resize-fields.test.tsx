import { beforeEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';

import { renderPage, SETTLED_MS, wait } from './compress-page.harness';

beforeEach(async () => {
  await page.viewport(1200, 800);
});

test("the box shows the image's own size, a side typed sets the other by its ratio, and a preset sets both", async () => {
  const { screen, encodes, drop } = await renderPage();
  await drop();
  await screen.getByRole('button', { name: 'Resize' }).click();
  const width = screen.getByRole('spinbutton', { name: 'Width' });
  const height = screen.getByRole('spinbutton', { name: 'Height' });
  await expect.element(width).toHaveValue(48);
  await expect.element(height).toHaveValue(32);
  await wait(SETTLED_MS);
  // the image's own size is what the package does with nothing: nothing was sent
  expect(encodes().at(-1)).toEqual({});

  await width.fill('24');
  await expect.element(height).toHaveValue(16);
  await wait(SETTLED_MS);
  expect(encodes().at(-1)).toEqual({ width: 24, height: 16 });

  // the preset is read off the sides, and sets them
  await expect.element(screen.getByText('50 %', { exact: true })).toBeVisible();
  await screen.getByRole('combobox', { name: 'Preset' }).click();
  await screen.getByRole('option', { name: '200 %' }).click();
  await expect.element(width).toHaveValue(96);
  await expect.element(height).toHaveValue(64);
  await expect.element(screen.getByRole('switch', { name: 'Allow enlarging' })).toBeChecked();
  await wait(SETTLED_MS);
  expect(encodes().at(-1)).toEqual({ width: 96, height: 64, enlarge: true });

  // the lock off, a side typed leaves the other
  await screen.getByRole('button', { name: 'Keep the ratio' }).click();
  await width.fill('12');
  await expect.element(height).toHaveValue(64);
  await expect.element(screen.getByText('Custom').first()).toBeVisible();
  await wait(SETTLED_MS);
  expect(encodes().at(-1)).toEqual({ width: 12, height: 64, enlarge: true });
});

test('the link between the sides starts no search: a change that changes nothing sends nothing', async () => {
  const { screen, encodes, drop } = await renderPage();
  await drop();
  await screen.getByRole('button', { name: 'Resize' }).click();
  await screen.getByRole('button', { name: 'Keep the ratio' }).click();
  await screen.getByRole('button', { name: 'Keep the ratio' }).click();
  await wait(SETTLED_MS);

  expect(encodes()).toEqual([{}]);
});
