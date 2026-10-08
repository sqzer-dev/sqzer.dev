import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { ZoomField } from './zoom-field';

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

test('a click opens the field with the percent, which takes a number on Enter or on leaving it', async () => {
  const onZoom = vi.fn<(scale: number) => void>();
  const screen = await render(<ZoomField scale={1.25} onZoom={onZoom} />);
  const preview = screen.getByRole('button', { name: 'Zoom 125 %' });
  await expect.element(preview).toBeVisible();

  await preview.click();

  const zoom = screen.getByRole('textbox', { name: 'Zoom' });
  await expect.element(zoom).toHaveValue('125');
  await expect.element(zoom).toHaveFocus();
  await userEvent.keyboard('200{Enter}');
  expect(onZoom).toHaveBeenLastCalledWith(2);
  // a key closes the field and hands the focus back to the text, so a keyboard keeps its place
  await expect.element(preview).toHaveFocus();

  // nothing of a number that is not one, or of nothing at all, and Escape leaves the field as it was
  await preview.click();
  await zoom.fill('a lot');
  await userEvent.keyboard('{Escape}');
  await expect.element(preview).toHaveFocus();
  await preview.click();
  await zoom.fill('');
  await userEvent.tab();
  expect(onZoom).toHaveBeenCalledTimes(1);

  await preview.click();
  await zoom.fill('50');
  await userEvent.tab();
  expect(onZoom).toHaveBeenLastCalledWith(0.5);
});

test('a double click goes to 100 % and opens nothing, and a key opens the field at once', async () => {
  const onZoom = vi.fn<(scale: number) => void>();
  const screen = await render(<ZoomField scale={0.5} onZoom={onZoom} />);
  const preview = screen.getByRole('button', { name: 'Zoom 50 %' });

  await preview.dblClick();

  expect(onZoom).toHaveBeenLastCalledWith(1);
  await wait(400);
  await expect.element(screen.getByRole('textbox', { name: 'Zoom' })).not.toBeInTheDocument();

  preview.element().focus();
  await userEvent.keyboard('{Enter}');
  await expect.element(screen.getByRole('textbox', { name: 'Zoom' })).toHaveFocus();
});

test('a click whose wait is left by the focus opens nothing', async () => {
  const screen = await render(
    <>
      <ZoomField scale={1} onZoom={() => {}} />
      <button type="button">Elsewhere</button>
    </>,
  );
  const preview = screen.getByRole('button', { name: 'Zoom 100 %' });

  await preview.click();
  await userEvent.tab();

  await expect.element(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
  await wait(400);
  await expect.element(screen.getByRole('textbox', { name: 'Zoom' })).not.toBeInTheDocument();
  await expect.element(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
});
