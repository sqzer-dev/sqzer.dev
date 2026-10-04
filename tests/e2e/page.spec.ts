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

test('a JPEG goes through the page with the defaults', async ({ page }) => {
  const status = await open(page);
  await page.getByLabel(DROP).setInputFiles(fixture('pattern-rgb.jpg'));

  await expect(status).toHaveText(/^Done in [\d.]+ s\.$/u, SLOW);
  await expect(page.getByText(/pattern-rgb\.jpg -> pattern-rgb\.avif\s+673 B -> \d+ B/u)).toBeVisible();
  await expect(page.getByText(/target 70 reached in \d trials?:/u)).toBeVisible();

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

test('a change of format during a search ends the worker and starts another', async ({ page }) => {
  const status = await open(page);
  await page.evaluate(() => {
    const line = document.querySelector('[role="status"]');
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
  await page.getByLabel(/^Format/u).selectOption('avif');
  await page.getByLabel(DROP).setInputFiles(fixture('pattern-rgb.svg'));
  await expect(status).toHaveText(/^Encoding: trial 1 of at most/u, SLOW);

  await page.getByLabel(/^Format/u).selectOption('jpeg');
  await expect(status).toHaveText(/^Done in/u, SLOW);
  await expect(page.getByText(/pattern-rgb\.svg -> pattern-rgb\.jpg/u)).toBeVisible();

  // a new worker holds nothing, so the image is read again after the trial that was cut short
  const statuses = await page.evaluate(() => window.statuses);
  const trial = statuses.findIndex((text) => text.startsWith('Encoding: trial 1 '));
  expect(trial).toBeGreaterThan(-1);
  expect(statuses.lastIndexOf('Reading pattern-rgb.svg.')).toBeGreaterThan(trial);
  expect(statuses.join('\n')).not.toMatch(/avif/u);
});

test("the policy names no origin but the page's own", async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', (request) => origins.add(new URL(request.url()).origin));

  const status = await open(page);
  await page.getByLabel(DROP).setInputFiles(fixture('pattern-rgb.jpg'));
  await expect(status).toHaveText(/^Done in/u, SLOW);

  const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(policy).toMatch(/^default-src 'none'; /u);
  expect(policy).not.toMatch(/https?:|\*|unsafe-inline|data:/u);
  expect([...origins]).toEqual([new URL(page.url()).origin]);
});
