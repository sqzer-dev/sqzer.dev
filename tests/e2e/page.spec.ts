// The built page in a browser: the flow of a file through it, the panels, the
// components under the policy, and the policy itself.
import { expect, fixture, open, PICK, said, SLOW, test } from './harness';

test('a JPEG goes through the page with the defaults', async ({ page }) => {
  await open(page);
  await page.getByLabel(PICK).setInputFiles(fixture('pattern-rgb.jpg'));

  // a search of the fixture is over within the quiet 500 ms of ADR-0005, and no toast tells of it
  await expect(page.getByRole('link', { name: 'Download pattern-rgb.avif' })).toBeVisible(SLOW);
  // the size and the difference lead, the chips under them, the details behind their expander (ADR-0001 D5)
  await expect(page.locator('[data-slot=result-size]')).toHaveText(/^\d+ B\d+ % smaller$/u);
  await expect(page.getByRole('button', { name: /^reached: the target of 70 at a score of \d+\.\d$/u })).toBeVisible();
  await page.getByRole('button', { name: 'Details' }).click();
  await expect(page.getByText(/^pattern-rgb\.jpg, 673 B, jpeg, (photo|graphic)$/u)).toBeVisible();
  await expect(page.getByText(/^pattern-rgb\.avif, \d+ B, avif by ravif \(\w+\)$/u)).toBeVisible();
  await expect(page.getByText(/^70, reached in \d trials?$/u)).toBeVisible();
  // each trial in the list, and the same number of points on the chart
  const trials = page.getByRole('table', { name: 'Trials' });
  const rows = await trials.getByRole('row').count();
  expect(rows).toBeGreaterThan(1);
  const chart = page.locator('[data-slot=search-chart]');
  await expect(chart.locator('circle')).toHaveCount(rows - 1);
  await expect(chart.locator('text')).toHaveText('target 70');
  // each side's size, in the corner of the screen over it
  await expect(page.getByText('Before: 48 × 32')).toBeVisible();
  await expect(page.getByText('After: 48 × 32')).toBeVisible();

  // the download is a picture of the fixture's size, not just a link
  const download = page.getByRole('link', { name: 'Download pattern-rgb.avif' });
  const size = await download.evaluate(async (link: HTMLAnchorElement) => {
    const image = new Image();
    image.src = link.href;
    await image.decode();
    return [image.naturalWidth, image.naturalHeight];
  });
  expect(size).toEqual([48, 32]);
});

test('the footer names the version of `sqzer` the worker loaded', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('contentinfo')).toContainText(/sqzer on npm \d+\.\d+\.\d+,/u);
});

test('the footer links the licences of what the page carries, the package in the worker included', async ({ page }) => {
  await open(page);
  const href = await page.getByRole('link', { name: 'the licences of what it carries' }).getAttribute('href');
  const licences = await page.request.get(href ?? '');

  expect(licences.ok()).toBe(true);
  const text = await licences.text();
  expect(text).toMatch(/^## react - \d/mu);
  expect(text).toMatch(/^## xstate - \d/mu);
  expect(text).toMatch(/^## @base-ui\/react - \d/mu);
  expect(text).toMatch(/^## lucide-react - \d.+\(ISC\)$/mu);
  // what reaches the page as a stylesheet or a font
  expect(text).toMatch(/^## geist - \d/mu);
  expect(text).toContain('SIL Open Font License');
  expect(text).toMatch(/^## @radix-ui\/colors - \d/mu);
  expect(text).toMatch(/^## sqzer - \d+\.\d+\.\d+ \(MIT OR Apache-2\.0\)$/mu);
});

test('the workspace is a chunk of its own, fetched once the empty state is up', async ({ page }) => {
  await open(page);

  const scripts = await page.evaluate(() => ({
    inHtml: document.scripts.length,
    fetched: performance
      .getEntriesByType('resource')
      .map((entry) => new URL(entry.name).pathname)
      .filter((path) => path.endsWith('.js'))
      .toSorted(),
  }));
  expect(scripts.inHtml).toBe(1);
  // the page's script, the worker's, the workspace, and the little runtime Vite splits out with it
  expect(scripts.fetched).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/^\/assets\/index-/u),
      expect.stringMatching(/^\/assets\/worker-/u),
      expect.stringMatching(/^\/assets\/workspace-/u),
    ]),
  );
});

test('the components and the fonts hold under the policy', async ({ page }) => {
  await open(page);
  // the toast is a Base UI part too, drawn from its variables: it stays while hovered, and its button closes it
  const ready = said(page, 'Ready.');
  await ready.hover();
  await expect(ready).toHaveAttribute('data-expanded');
  await ready.getByRole('button', { name: 'Close' }).click();
  await expect(ready).toBeHidden();
  await page.getByLabel(PICK).setInputFiles(fixture('pattern-rgb.jpg'));
  await expect(page.getByRole('link', { name: 'Download pattern-rgb.avif' })).toBeVisible(SLOW);

  // the list hides its scrollbar by a class, which Base UI would otherwise style from a `<style>` element
  await page.getByRole('combobox', { name: 'Format' }).click();
  await expect(page.getByRole('option', { name: 'chosen per image' })).toBeVisible();
  await page.keyboard.press('Escape');

  const solid = page.getByRole('switch', { name: 'Solid panels' });
  await solid.click();
  await expect(solid).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-panels', 'solid');

  // a panel collapses, the handle moves by its keys, a tooltip and a popover find their place
  await page.getByRole('button', { name: 'Options' }).click();
  await expect(solid).toBeHidden();
  await page.getByRole('slider', { name: 'Before on the left, after on the right' }).press('ArrowLeft');
  await expect(page.getByRole('slider', { name: 'Before on the left, after on the right' })).toHaveValue('49');
  // the view bar zooms in a step, and a drag of the picture with the mouse pans it
  const picture = page.getByRole('img', { name: 'As it was dropped' });
  await expect(picture).toBeVisible();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.getByRole('button', { name: 'Zoom 125 %' })).toBeVisible();
  const before = await picture.boundingBox();
  if (!before) throw new Error('the picture has no box');
  expect(before.width).toBe(60);
  await page.mouse.move(100, 400);
  await page.mouse.down();
  await page.mouse.move(130, 380, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await picture.boundingBox())?.x).toBe(before.x + 30);
  await page.getByRole('button', { name: 'Fit to the screen' }).click();
  await expect(page.getByRole('button', { name: 'Zoom 100 %' })).toBeVisible();
  await page.getByRole('button', { name: 'Checkerboard under a transparent image' }).hover();
  await expect(page.getByText('Checkerboard under a transparent image')).toBeVisible();
  await page.getByRole('button', { name: 'About this page' }).click();
  const about = page.getByRole('dialog');
  await expect(about.getByText(/nothing is sent anywhere/u)).toBeVisible();
  // the note quotes the policy the page is served with, as it is (ADR-0001 D7)
  await about.getByRole('button', { name: "Don't trust us?" }).click();
  const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  await expect(about.locator('pre')).toHaveText(policy ?? 'no policy');
  await page.keyboard.press('Escape');

  // Geist comes from the page's own origin, under `font-src 'self'`
  const fonts = await page.evaluate(async () => {
    await Promise.all([document.fonts.load('1em Geist'), document.fonts.load('1em "Geist Mono"')]);
    return [...document.fonts].map((font) => `${font.family} ${font.status}`);
  });
  expect(fonts.toSorted()).toEqual(['Geist Mono loaded', 'Geist loaded']);
  await expect(page.locator('style')).toHaveCount(0);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test('the panels are one bottom expander, pulled up over the image, under the policy', async ({ page }) => {
    await open(page);
    await page.getByLabel(PICK).setInputFiles(fixture('pattern-rgb.jpg'));
    await expect(page.getByRole('link', { name: 'Download pattern-rgb.avif' })).toBeVisible(SLOW);

    const expander = page.getByRole('dialog', { name: 'Result and options' });
    const top = async () => {
      // once it has stopped sliding
      await expander.evaluate(async (sheet) => {
        await Promise.all(sheet.getAnimations({ subtree: true }).map((animation) => animation.finished));
      });
      return (await expander.boundingBox())?.y ?? Number.NaN;
    };
    // the image keeps the screen: the expander shows the view bar and the chips, and no more
    await expect.poll(top).toBeGreaterThan(780 - 130);
    await expect(page.getByLabel('New image')).toBeInViewport();

    const grip = await page.locator('[data-slot=drawer-swipe-handle]').boundingBox();
    if (!grip) throw new Error('the expander has no handle');
    const [x, y] = [grip.x + grip.width / 2, grip.y + grip.height / 2];
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y - 300, { steps: 20 });
    await page.mouse.up();

    await expect.poll(top).toBeLessThan(200);
    await page.getByRole('button', { name: 'Resize' }).click();
    await page.getByLabel('Width').fill('24');
    await expect(page.getByText('After: 24 × 16')).toBeVisible(SLOW);

    // Escape does not close it: it lets the image go again
    await page.keyboard.press('Escape');
    await expect.poll(top).toBeGreaterThan(600);
    await expect(expander).toBeVisible();
  });
});

test("the policy names no origin but the page's own", async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', (request) => origins.add(new URL(request.url()).origin));

  await open(page);
  await page.getByLabel(PICK).setInputFiles(fixture('pattern-rgb.jpg'));
  await expect(page.getByRole('link', { name: 'Download pattern-rgb.avif' })).toBeVisible(SLOW);

  const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(policy).toMatch(/^default-src 'none'; /u);
  expect(policy).toContain("style-src 'self'; font-src 'self';");
  expect(policy).not.toMatch(/https?:|\*|unsafe-inline|data:/u);
  expect([...origins]).toEqual([new URL(page.url()).origin]);
});
