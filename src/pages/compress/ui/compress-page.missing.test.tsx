// The workspace's chunk failing to download, in a file of its own: the mock below stands for the
// whole file, and every other test of the page needs the workspace.
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { fromCallback } from 'xstate';

import { Toaster } from '@/shared/ui/toast';

import { SearchProvider } from '../model/context';
import type { EncoderCommand } from '../model/encoder';
import { searchMachine } from '../model/machine';
import { CompressPage } from './compress-page';

// A module whose export cannot be read stands in for a chunk that did not download: a factory that
// throws is Vitest's own error, reported before any test runs, where this fails the load as a
// download would, on the way to the component.
vi.mock('./workspace', () => ({
  get Workspace(): never {
    throw new Error('the chunk did not download');
  },
}));

test('when the workspace does not download, the page says so and offers a reload, and nothing is thrown', async () => {
  const encoder = fromCallback<EncoderCommand>(({ sendBack }) => {
    sendBack({ type: 'ready', version: '0.0.0', codecs: [] });
  });
  // an error thrown past every boundary, or a rejection nobody caught, would land here
  const uncaught: unknown[] = [];
  const onError = (event: ErrorEvent | PromiseRejectionEvent) => {
    event.preventDefault();
    uncaught.push('error' in event ? event.error : event.reason);
  };
  addEventListener('error', onError);
  addEventListener('unhandledrejection', onError);
  const screen = await render(
    <Toaster>
      <SearchProvider logic={searchMachine.provide({ actors: { encoder } })}>
        <CompressPage />
      </SearchProvider>
    </Toaster>,
  );
  await expect.element(screen.getByText('Ready.')).toBeVisible();

  await screen.getByLabelText('Choose an image').upload(new File(['not an image'], 'photo.jpg'));

  await expect.element(screen.getByRole('alert').getByText(/^The rest of the page did not load\./u)).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Reload the page' })).toBeVisible();
  removeEventListener('error', onError);
  removeEventListener('unhandledrejection', onError);
  expect(uncaught).toEqual([]);
});
