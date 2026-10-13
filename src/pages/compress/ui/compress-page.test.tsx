import { beforeEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import { panel, renderPage, SETTLED_MS, swatch, wait } from './compress-page.harness';

// a wide screen, where the panels float. the last test is a phone
beforeEach(async () => {
  await page.viewport(1200, 800);
});

test('with no file, the page is one drop target, with the wordmark and the button that opens the picker in it', async () => {
  const { screen } = await renderPage();

  await expect.element(screen.getByRole('main').getByRole('heading', { level: 1, name: 'sqzer' })).toBeVisible();
  await expect.element(screen.getByText('Drop an image, paste one, or choose a file.')).toBeVisible();
  await expect.element(screen.getByLabelText('Choose an image')).toHaveAttribute('type', 'file');
  await expect.element(screen.getByRole('contentinfo').getByText(/nothing is sent anywhere/u)).toBeVisible();
  // the way to check the claim (ADR-0001 D7): the policy is the build's, and this copy has none to quote
  await screen.getByRole('button', { name: "Don't trust us?" }).click();
  await expect.element(screen.getByText(/^This copy of the page carries no Content-Security-Policy/u)).toBeVisible();
  await expect.element(screen.getByText(/^To check, open the browser's developer tools/u)).toBeVisible();
  // the target fills the page above the footer
  const target = screen.getByRole('main').element().firstElementChild?.getBoundingClientRect();
  expect(target?.height).toBeGreaterThan(400);
  expect(target?.width).toBeGreaterThan(1000);
  // the controls come with the image
  await expect.element(screen.getByRole('combobox', { name: 'Format' })).not.toBeInTheDocument();
  // and so does what the encoder says in passing
  await expect.element(screen.getByText('Ready.')).toBeVisible();
});

test('the drop target turns blue at its border while a file is dragged over the window', async () => {
  const { screen } = await renderPage();
  const target = screen.getByRole('main').element().firstElementChild;
  if (!(target instanceof HTMLElement)) throw new Error('the page has no drop target');
  const blue = getComputedStyle(document.documentElement).getPropertyValue('--blue-9');
  const fill = getComputedStyle(target).backgroundColor;

  window.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true }));

  await expect.element(target).toHaveAttribute('data-dragging');
  // the token as the browser paints it
  expect(getComputedStyle(target).borderTopColor).toBe(getComputedStyle(swatch(blue)).color);
  expect(getComputedStyle(target).backgroundColor).toBe(fill);
});

test('an image dropped on a page nobody touched is encoded with no options', async () => {
  const { encodes, drop } = await renderPage();
  await drop();

  expect(encodes()).toEqual([{}]);
});

test('with a file, the image is the page, and the options float above the result at the right', async () => {
  const { screen, drop } = await renderPage();
  await drop();

  const picture = screen.getByRole('img', { name: 'As it was dropped' });
  await expect.element(picture).toBeVisible();
  expect(picture.element().closest('main')?.getBoundingClientRect()).toMatchObject({
    x: 0,
    y: 0,
    width: 1200,
    height: 800,
  });
  await expect.element(screen.getByRole('button', { name: 'Options' })).toHaveAttribute('aria-expanded', 'true');
  await expect.element(screen.getByRole('button', { name: 'Result' })).toHaveAttribute('aria-expanded', 'true');
  const options = panel(screen, 'Options');
  const result = panel(screen, 'Result');
  expect(options.bottom).toBeLessThan(result.top);
  expect(options.right).toBe(result.right);
  expect(result.right).toBe(1200 - 12);
  // the view bar is at the other side
  const bar = screen.getByLabelText('New image').element().closest('[data-slot=view-bar]')?.getBoundingClientRect();
  expect(bar?.left).toBe(12);
});

test('the download button stays when the result is collapsed', async () => {
  const { screen, drop } = await renderPage();
  await drop();
  const download = screen.getByRole('link', { name: 'Download pattern-rgb.jpg' });
  const result = screen.getByRole('button', { name: 'Result' });

  await result.click();

  await expect.element(result).toHaveAttribute('aria-expanded', 'false');
  // hidden, not unmounted: what was typed into a collapsed panel stays
  await expect.poll(() => screen.container.querySelector('table')?.checkVisibility()).toBe(false);
  // the size, the difference and the chips stay with the download (ADR-0001 D5)
  await expect.element(download).toBeVisible();
  await expect.element(screen.getByText('673 B')).toBeVisible();
  await expect.element(screen.getByText('the same size')).toBeVisible();
  await expect.element(screen.getByRole('button', { name: /^reached: /u })).toBeVisible();
});

test('at 768 px the view bar and the panels keep apart', async () => {
  await page.viewport(768, 800);
  const { screen, drop } = await renderPage();
  await drop();

  const bar = screen.getByLabelText('New image').element().closest('[data-slot=view-bar]')?.getBoundingClientRect();
  if (!bar) throw new Error('the page has no view bar');
  for (const name of ['Options', 'Result']) {
    const box = panel(screen, name);
    expect(bar.right).toBeLessThan(box.left);
  }
});

test('a collapsed panel keeps what was typed into it', async () => {
  const { screen, encodes, drop } = await renderPage();
  await drop();
  await screen.getByRole('button', { name: 'Resize' }).click();
  const width = screen.getByRole('spinbutton', { name: 'Width' });
  await width.fill('1600');

  const options = screen.getByRole('button', { name: 'Options' });
  await options.click();
  await expect.element(options).toHaveAttribute('aria-expanded', 'false');
  await expect.element(width).not.toBeInTheDocument();
  await options.click();

  await expect.element(width).toHaveValue(1600);
  await wait(SETTLED_MS);
  // the height followed, by the image's ratio
  expect(encodes().at(-1)).toEqual({ width: 1600, height: 1067 });
});

test('the checkerboard under a transparent image can be a flat colour', async () => {
  const { screen, drop } = await renderPage();
  await drop();
  await expect.element(screen.getByRole('img', { name: 'As it was dropped' })).toBeVisible();
  const picture = screen.getByRole('img', { name: 'As it was dropped' }).element().parentElement;
  const checkerboard = screen.getByRole('button', { name: 'Checkerboard under a transparent image' });
  await expect.element(checkerboard).toHaveAttribute('aria-pressed', 'true');
  expect(picture && getComputedStyle(picture).backgroundImage).toContain('repeating-conic-gradient');

  await checkerboard.click();

  await expect.element(checkerboard).toHaveAttribute('aria-pressed', 'false');
  expect(picture && getComputedStyle(picture).backgroundImage).toBe('none');
});

test('the view bar zooms the picture in steps, out past its own pixels, and fits it again', async () => {
  const { screen, drop } = await renderPage();
  await drop();
  const picture = screen.getByRole('img', { name: 'As it was dropped' });
  const zoom = (said: string) => screen.getByRole('button', { name: `Zoom ${said} %` });
  await expect.element(zoom('100')).toBeVisible();
  await expect.element(picture).toBeVisible();
  await screen.getByRole('button', { name: 'Zoom in' }).click();
  await expect.element(zoom('125')).toBeVisible();
  expect(picture.element().getBoundingClientRect()).toMatchObject({ width: 60, height: 40 });

  await screen.getByRole('button', { name: 'Fit to the screen' }).click();
  await expect.element(zoom('100')).toBeVisible();
  expect(picture.element().getBoundingClientRect()).toMatchObject({ width: 48, height: 32 });

  // and out, below the fit, which is this picture's own pixels
  await screen.getByRole('button', { name: 'Zoom out' }).click();
  await expect.element(zoom('80')).toBeVisible();
});

test('the controls rest before a search starts with what they say', async () => {
  const { screen, workers, encodes, drop } = await renderPage();
  await drop();

  await screen.getByRole('button', { name: 'Resize' }).click();
  const width = screen.getByRole('spinbutton', { name: 'Width' });
  await width.fill('16');
  await width.fill('1600');
  await wait(SETTLED_MS);

  // one search for the three changes, or two as the clock has it, on the worker that holds the image
  expect(encodes().at(-1)).toEqual({ width: 1600, height: 1067 });
  expect(workers).toHaveLength(1);
});

// https://github.com/sqzer-dev/sqzer.dev/issues/8
test('a control changed just before another image is picked does not start the search twice', async () => {
  const { screen, workers, encodes, drop } = await renderPage();
  await drop();
  await screen.getByRole('button', { name: 'Resize' }).click();
  await screen.getByRole('spinbutton', { name: 'Width' }).fill('1600');
  await screen.getByLabelText('New image').upload(new File(['not an image'], 'other.jpg'));
  await wait(SETTLED_MS);

  expect(encodes()).toEqual([{}, { width: 1600, height: 1067 }]);
  expect(workers).toHaveLength(1);
});

test('on a phone the panels are one bottom expander, and the controls keep what they say across the change', async () => {
  const { screen, drop } = await renderPage();
  await drop();
  await screen.getByRole('button', { name: 'Resize' }).click();
  await screen.getByRole('spinbutton', { name: 'Width' }).fill('1600');

  await page.viewport(390, 780);

  await expect.element(screen.getByRole('dialog', { name: 'Result and options' })).toBeInTheDocument();
  await expect.element(screen.getByRole('button', { name: 'Options' })).not.toBeInTheDocument();
  // the expander is closed again in the new layout, what was typed into it is not. It sits in the
  // sheet at rest, below the screen's edge, so the press is the element's own
  screen
    .getByRole('button', { name: 'Resize' })
    .element()
    .dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await expect.element(screen.getByRole('spinbutton', { name: 'Width' })).toHaveValue(1600);

  // on the narrowest phone the view bar wraps, so every control stays within the screen
  await page.viewport(320, 780);
  const bar = screen.getByLabelText('New image').element().closest('[data-slot=view-bar]');
  await expect.poll(() => bar && bar.getBoundingClientRect().height).toBeGreaterThan(40);
  for (const control of bar?.children ?? []) expect(control.getBoundingClientRect().right).toBeLessThanOrEqual(320);
});

test('the untouched target stands at the score the result reports, and sends nothing until it is moved', async () => {
  const { screen, encodes, drop } = await renderPage();
  await drop();
  const slider = screen.getByRole('slider', { name: 'Target score' });

  await expect.element(slider).toHaveValue('72');
  await expect.element(screen.getByText('default: high: barely noticeable side by side')).toBeVisible();
  await expect.element(screen.getByRole('button', { name: /^Target score: 72\./u })).toBeVisible();
  // the format the package chose for this run, with the choice
  await expect.element(screen.getByText('chosen per image: JPEG')).toBeVisible();
  expect(encodes()).toEqual([{}]);

  slider.element().focus();
  await userEvent.keyboard('{ArrowRight}');
  await expect.element(screen.getByRole('button', { name: /^Target score: 73\./u })).toBeVisible();
  await wait(SETTLED_MS);
  expect(encodes()).toEqual([{}, { target: 73 }]);
});

test('another image picked under `chosen per image` keeps the backend settings of the format the last run chose', async () => {
  const { screen, encodes, drop } = await renderPage();
  await drop();
  await screen.getByRole('button', { name: 'Advanced' }).click();
  // the last run chose JPEG, so its options show, and one is flipped
  await screen.getByRole('switch', { name: 'jpeg:progressive' }).click();
  await wait(SETTLED_MS);
  expect(encodes().at(-1)).toEqual({ codecOpts: new Map([['jpeg:progressive', 'false']]) });

  await screen.getByLabelText('New image').upload(new File(['not an image'], 'other.jpg'));
  await wait(SETTLED_MS);

  expect(encodes().at(-1)).toEqual({ codecOpts: new Map([['jpeg:progressive', 'false']]) });
});

test('an option behind Advanced reaches the search as the package spells it', async () => {
  const { screen, encodes, drop } = await renderPage();
  await drop();
  await screen.getByRole('button', { name: 'Advanced' }).click();
  await screen.getByRole('spinbutton', { name: 'Max pixels' }).fill('1000');
  await screen.getByRole('switch', { name: 'Keep metadata' }).click();
  await wait(SETTLED_MS);

  // one search or two, as the clock has it between the two changes: the last says both
  expect(encodes().at(-1)).toEqual({ keepMetadata: true, maxPixels: 1000 });
});
