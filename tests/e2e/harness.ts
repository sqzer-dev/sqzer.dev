// The built page in a browser, with what only the built page has: the policy,
// and every request staying on the page's own origin (ADR-0002 D6). What every
// spec of the suite opens the page with.
import { fileURLToPath } from 'node:url';

import { expect, test as base, type Page } from '@playwright/test';

export { expect };

declare global {
  interface Window {
    report: (problem: string) => Promise<void>;
    statuses: string[];
  }
}

export const fixture = (name: string) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));
export const PICK = 'Choose an image';
export const SLOW = { timeout: 120_000 };

/** Every test fails on a page error, a console error, a refusal by the policy, or a request to another origin. */
export const test = base.extend<{ problems: string[] }>({
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

/** The toast that says `text` (ADR-0005): a dialog named by its title. */
export const said = (page: Page, text: string | RegExp) => page.getByRole('dialog', { name: text });

export async function open(page: Page) {
  await page.goto('/');
  await expect(said(page, 'Ready.')).toBeVisible(SLOW);
}

/** Picks from the format list, a Base UI select: its options are on the page only while it is open. */
export async function format(page: Page, name: RegExp) {
  await page.getByRole('combobox', { name: 'Format' }).click();
  await page.getByRole('option', { name }).click();
}
