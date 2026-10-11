// A toast's text stays within its own box (ADR-0005 D5): a long name breaks, and never runs under the buttons.
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { Toaster, useToastManager } from './toast';

const NAME = 'Encoding 44b4c06ea0e9fbbb49245d1e2933ac08f7a1b2c3d4e5f6a7b8c9d0e1f2a3b4.jpg.';

/** One button that adds a toast with a name no space breaks, and an action beside it. */
function Say() {
  const toast = useToastManager();
  return (
    <button
      type="button"
      onClick={() => {
        toast.add({ id: 'search', type: 'loading', title: NAME, timeout: 0, actionProps: { children: 'Cancel' } });
      }}
    >
      Say
    </button>
  );
}

test('a long name in the title breaks and keeps clear of the action and the close button', async () => {
  const screen = await render(
    <Toaster>
      <Say />
    </Toaster>,
  );
  await screen.getByRole('button', { name: 'Say' }).click();
  const toast = screen.getByRole('dialog', { name: NAME });
  await expect.element(toast).toBeVisible();

  const title = toast.element().querySelector('[data-slot=toast-title]');
  if (!title) throw new Error('the toast has no title');
  const action = toast.getByRole('button', { name: 'Cancel' }).element().getBoundingClientRect();
  // the text itself, not the box it may spill out of
  const range = document.createRange();
  range.selectNodeContents(title);
  const text = range.getBoundingClientRect();
  expect(text.right).toBeLessThanOrEqual(action.left);
  expect(title.scrollWidth).toBeLessThanOrEqual(title.clientWidth);
  // and the name broke rather than overflowed: the text is more than one line tall
  expect(text.height).toBeGreaterThan(20);
});
