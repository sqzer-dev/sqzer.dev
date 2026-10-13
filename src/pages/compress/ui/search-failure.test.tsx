// The alert of ADR-0001 D6 on the page over its stub worker: whose failure it is, where it is shown, and its dismissal.
import { beforeEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';

import { renderPage } from './compress-page.harness';

beforeEach(async () => {
  await page.viewport(1200, 800);
});

test("the encoder's own failure is the one the empty state shows", async () => {
  const { screen } = await renderPage('start');

  await expect
    .element(screen.getByRole('main').getByRole('alert'))
    .toHaveTextContent('The encoder could not start. Reload the page, or try another browser.the worker did not start');
  await expect.element(screen.getByLabelText('Choose an image')).toBeVisible();
});

test("an image's failure is shown in the result panel, and never in the empty state", async () => {
  const { screen } = await renderPage('read');
  await screen.getByLabelText('Choose an image').upload(new File(['not an image'], 'photo.heic'));

  const alert = screen.getByRole('alert');
  // one sentence that names the file and what to do, and the package's words after it (ADR-0001 D6)
  await expect
    .element(alert)
    .toHaveTextContent(
      'This build cannot decode photo.heic, and the browser could not draw it either. The `sqzer` command line built with `native-heic` can.no decoder for HEIC in this build',
    );
  expect(alert.element().closest('[data-size]')?.querySelector('h2')?.textContent).toBe('Result');
  expect(screen.getByRole('alert').elements()).toHaveLength(1);
  await expect.element(screen.getByText('Drop an image, paste one, or choose a file.')).not.toBeInTheDocument();

  // dismissed, until the next failure
  await alert.getByRole('button', { name: 'Dismiss' }).click();
  await expect.element(alert).not.toBeInTheDocument();
  await screen.getByLabelText('New image').upload(new File(['not an image'], 'other.heic'));
  await expect.element(screen.getByRole('alert')).toBeVisible();
  expect(screen.getByRole('alert').element().textContent).toMatch(/^This build cannot decode other\.heic/u);
});

test("on a phone, an image's failure lifts the bottom expander to show its alert", async () => {
  await page.viewport(390, 780);
  const { screen } = await renderPage('read');
  await screen.getByLabelText('Choose an image').upload(new File(['not an image'], 'photo.heic'));

  const expander = screen.getByRole('dialog', { name: 'Result and options' });
  await expect.element(expander.getByRole('alert')).toBeVisible();
  expect(expander.getByRole('alert').element().textContent).toMatch(/^This build cannot decode photo\.heic/u);
  await expect.poll(() => expander.element().getBoundingClientRect().top).toBeLessThan(200);
});
