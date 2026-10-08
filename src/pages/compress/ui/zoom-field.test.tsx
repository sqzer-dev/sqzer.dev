import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { ZoomField } from './zoom-field';

test('the field says the percent, takes a number on Enter or on leaving, and goes to 100 % on a double click', async () => {
  const onZoom = vi.fn<(scale: number) => void>();
  const screen = await render(<ZoomField scale={1.25} onZoom={onZoom} />);
  const zoom = screen.getByRole('textbox', { name: 'Zoom' });
  await expect.element(zoom).toHaveValue('125');

  await zoom.fill('200');
  await userEvent.keyboard('{Enter}');
  expect(onZoom).toHaveBeenLastCalledWith(2);

  // nothing of a number that is not one, or of nothing at all
  await zoom.fill('a lot');
  await userEvent.keyboard('{Escape}');
  await expect.element(zoom).toHaveValue('125');
  await zoom.fill('');
  await userEvent.tab();
  expect(onZoom).toHaveBeenCalledTimes(1);

  await zoom.fill('50');
  await userEvent.tab();
  expect(onZoom).toHaveBeenLastCalledWith(0.5);

  await zoom.dblClick();
  expect(onZoom).toHaveBeenLastCalledWith(1);
});
