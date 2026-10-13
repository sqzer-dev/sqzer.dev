import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { SplitHandle } from './split-handle';

test('a key moves the line by a whole percent from wherever a drag left it, and not past an edge', async () => {
  const onChange = vi.fn<(value: number) => void>();
  const screen = await render(<SplitHandle value={50.3} onChange={onChange} />);
  const handle = screen.getByRole('slider', { name: 'Before on the left, after on the right' });
  // a press on the grip, not a scripted `focus()`: the Firefox of Playwright 1.64 drops one into a frame
  // that has not had the pointer yet, and a key then goes nowhere. The slider itself is the range input
  // under the grip, which takes the pointer. The press is a drag of no distance, which reports the value
  // as it stands, so the calls start after it
  const grip = handle.element().parentElement?.querySelector('span');
  if (!grip) throw new Error('no grip');
  await userEvent.click(grip);
  await expect.element(handle).toHaveFocus();
  onChange.mockClear();

  await userEvent.keyboard('{ArrowRight}');
  expect(onChange).toHaveBeenLastCalledWith(51.3);
  await userEvent.keyboard('{ArrowLeft}');
  expect(onChange).toHaveBeenLastCalledWith(49.3);
  await userEvent.keyboard('{Home}');
  expect(onChange).toHaveBeenLastCalledWith(0);
  await userEvent.keyboard('{End}');
  expect(onChange).toHaveBeenLastCalledWith(100);

  await screen.rerender(<SplitHandle value={0.5} onChange={onChange} />);
  await userEvent.keyboard('{ArrowLeft}');
  expect(onChange).toHaveBeenLastCalledWith(0);
  await screen.rerender(<SplitHandle value={99.9} onChange={onChange} />);
  await userEvent.keyboard('{ArrowRight}');
  expect(onChange).toHaveBeenLastCalledWith(100);
});
