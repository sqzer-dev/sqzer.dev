// The images to try on the empty page (ADR-0009): what each tile says, that its small copy is there,
// and that pressing it hands the page the file, as picking it would.
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { SAMPLES } from '../model/samples';
import { Samples } from './samples';

test('each sample is a button with its name and size, over its small copy at the size it states', async () => {
  const screen = await render(<Samples onPick={() => {}} />);

  await expect.element(screen.getByRole('button', { name: 'Aurora 562.3 KB' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Rocket fuel, 20 MP 2.1 MB' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Julia set 568.5 KB' })).toBeVisible();
  const sizes = await Promise.all(
    SAMPLES.map(async ({ key }) => {
      const image = screen.container.querySelector(`[data-sample=${key}] img`);
      if (!(image instanceof HTMLImageElement)) throw new Error(`${key} has no image`);
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight };
    }),
  );
  // the small copies are served, and the size each states, which holds its place while it loads, is its own
  expect(sizes).toEqual(SAMPLES.map(({ shown: { width, height } }) => ({ width, height })));
});

test('pressed, a sample is fetched and picked as a file of its name, type and stated size', async () => {
  const onPick = vi.fn<(file: File) => void>();
  const screen = await render(<Samples onPick={onPick} />);

  for (const { key } of SAMPLES) screen.container.querySelector<HTMLButtonElement>(`[data-sample=${key}]`)?.click();
  await expect.poll(() => onPick.mock.calls.length).toBe(SAMPLES.length);

  // by name, as they land in whatever order: the size each tile states is its file's, so a sample
  // replaced without its size fails here
  const picked = Object.fromEntries(onPick.mock.calls.map(([file]) => [file.name, [file.type, file.size]]));
  expect(picked).toEqual(Object.fromEntries(SAMPLES.map(({ file, type, size }) => [file, [type, size]])));
});

test('a sample that does not load says so, picks nothing, and can be pressed again', async () => {
  const onPick = vi.fn<(file: File) => void>();
  const fetch = vi.spyOn(window, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));
  const screen = await render(<Samples onPick={onPick} />);
  const aurora = screen.getByRole('button', { name: /^Aurora/u });

  await aurora.click();
  await expect.element(screen.getByText('It did not load. Try again.')).toBeVisible();
  expect(onPick).not.toHaveBeenCalled();

  await aurora.click();
  await expect.poll(() => onPick.mock.calls.length).toBe(1);
  await expect.element(screen.getByText('It did not load. Try again.')).not.toBeInTheDocument();
  fetch.mockRestore();
});
