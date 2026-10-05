// The built page in a browser, with what only the built page has: the policy,
// and every request staying on the page's own origin (ADR-0002 D6).
import { fileURLToPath } from 'node:url';

import { expect, test as base, type Page } from '@playwright/test';

declare global {
  interface Window {
    report: (problem: string) => Promise<void>;
    statuses: string[];
  }
}

const fixture = (name: string) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));
const DROP = 'Drop an image here, paste one, or choose a file.';
const SLOW = { timeout: 120_000 };

/** Every test fails on a page error, a console error, a refusal by the policy, or a request to another origin. */
const test = base.extend<{ problems: string[] }>({
  problems: [
    async ({ page, baseURL }, use) => {
      const problems: string[] = [];
      const own = new URL(baseURL ?? '').origin;
      page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() === 'error') problems.push(`console: ${message.text()}`);
      });
      page.on('request', (request) => {
        // a `blob:` URL has the origin of the page that made it
        if (new URL(request.url()).origin !== own) problems.push(`asked of another origin: ${request.url()}`);
      });
      await page.exposeFunction('report', (problem: string) => {
        problems.push(problem);
      });
      await page.addInitScript(() => {
        addEventListener('securitypolicyviolation', (event) => {
          void window.report(`refused by the policy: ${event.violatedDirective} ${event.blockedURI}`);
        });
      });
      await use(problems);
      expect(problems).toEqual([]);
    },
    { auto: true },
  ],
});

async function open(page: Page) {
  await page.goto('/');
  const status = page.getByRole('status');
  await expect(status).toHaveText('Ready.', SLOW);
  return status;
}

/** Picks from the format list, a Base UI select: its options are on the page only while it is open. */
async function format(page: Page, name: RegExp) {
  await page.getByRole('combobox', { name: 'Format' }).click();
  await page.getByRole('option', { name }).click();
}

test('a JPEG goes through the page with the defaults', async ({ page }) => {
  const status = await open(page);
  await page.getByLabel(DROP).setInputFiles(fixture('pattern-rgb.jpg'));

  await expect(status).toHaveText(/^Done in [\d.]+ s\.$/u, SLOW);
  await expect(page.getByText(/pattern-rgb\.jpg -> pattern-rgb\.avif\s+673 B -> \d+ B/u)).toBeVisible();
  await expect(page.getByText(/target 70 reached in \d trials?:/u)).toBeVisible();
  // each side's size, in the corner over it
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

test('a change of format during a search ends the worker and starts another', async ({ page }) => {
  const status = await open(page);
  await page.evaluate(() => {
    const line = document.querySelector('output');
    if (!line) throw new Error('the page has no status line');
    window.statuses = [];
    new MutationObserver(() => {
      window.statuses.push(line.textContent);
    }).observe(line, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  });

  // drawn large, so a search takes seconds
  await page.getByLabel('Width').fill('2000');
  await format(page, /^AVIF/u);
  await page.getByLabel(DROP).setInputFiles(fixture('pattern-rgb.svg'));
  await expect(status).toHaveText(/^Encoding: trial 1 of at most/u, SLOW);

  await format(page, /^JPEG/u);
  await expect(status).toHaveText(/^Done in/u, SLOW);
  await expect(page.getByText(/pattern-rgb\.svg -> pattern-rgb\.jpg/u)).toBeVisible();

  // a new worker holds nothing, so the image is read again after the trial that was cut short
  const statuses = await page.evaluate(() => window.statuses);
  const trial = statuses.findIndex((text) => text.startsWith('Encoding: trial 1 '));
  expect(trial).toBeGreaterThan(-1);
  expect(statuses.lastIndexOf('Reading pattern-rgb.svg.')).toBeGreaterThan(trial);
  expect(statuses.join('\n')).not.toMatch(/avif/u);
});

test('the components and the fonts hold under the policy', async ({ page }) => {
  await open(page);

  // the list hides its scrollbar by a class, which Base UI would otherwise style from a `<style>` element
  await page.getByRole('combobox', { name: 'Format' }).click();
  await expect(page.getByRole('option', { name: 'chosen per image' })).toBeVisible();
  await page.keyboard.press('Escape');

  const solid = page.getByRole('switch', { name: 'Solid panels' });
  await solid.click();
  await expect(solid).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-panels', 'solid');

  // Geist comes from the page's own origin, under `font-src 'self'`
  const fonts = await page.evaluate(async () => {
    await Promise.all([document.fonts.load('1em Geist'), document.fonts.load('1em "Geist Mono"')]);
    return [...document.fonts].map((font) => `${font.family} ${font.status}`);
  });
  expect(fonts.toSorted()).toEqual(['Geist Mono loaded', 'Geist loaded']);
  await expect(page.locator('style')).toHaveCount(0);
});

test("the policy names no origin but the page's own", async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', (request) => origins.add(new URL(request.url()).origin));

  const status = await open(page);
  await page.getByLabel(DROP).setInputFiles(fixture('pattern-rgb.jpg'));
  await expect(status).toHaveText(/^Done in/u, SLOW);

  const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(policy).toMatch(/^default-src 'none'; /u);
  expect(policy).toContain("style-src 'self'; font-src 'self';");
  expect(policy).not.toMatch(/https?:|\*|unsafe-inline|data:/u);
  expect([...origins]).toEqual([new URL(page.url()).origin]);
});
