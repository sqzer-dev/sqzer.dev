import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';
import type { BrowserCommand } from 'vitest/node';

import app from './vite.config';

type Media = {
  colorScheme?: 'light' | 'dark' | null;
  contrast?: 'more' | null;
  forcedColors?: 'active' | null;
};

/** The stylesheet follows media queries, and those are the browser's to answer: a test asks it to. */
const emulateMedia: BrowserCommand<[media: Media]> = async ({ page }, media) => {
  await page.emulateMedia(media);
};

type Point = { x: number; y: number };

/**
 * A press at `from`, a move to `to` in steps and a release, with a real mouse: what a drag of the
 * handle does to the page. The points are the test's, inside its frame, which sits somewhere on
 * the browser's page.
 */
const drag: BrowserCommand<[from: Point, to: Point]> = async (context, from, to) => {
  const { page } = context;
  const box = await (await (await context.frame()).frameElement()).boundingBox();
  const offset = { x: box?.x ?? 0, y: box?.y ?? 0 };
  await page.mouse.move(from.x + offset.x, from.y + offset.y);
  await page.mouse.down();
  await page.mouse.move(to.x + offset.x, to.y + offset.y, { steps: 10 });
  await page.mouse.up();
};

// Units, components and the `decodeAny` checks, in the engines the page runs in (ADR-0002 D6).
export default mergeConfig(
  app,
  defineConfig({
    test: {
      include: ['src/**/*.test.{ts,tsx}'],
      // components are tested as the reader sees them: a Base UI part has no size without the stylesheet
      setupFiles: ['src/app/style.css'],
      // a test that asserts nothing has checked nothing
      expect: { requireAssertions: true },
      restoreMocks: true,
      browser: {
        enabled: true,
        headless: true,
        provider: playwright(),
        commands: { emulateMedia, drag },
        instances: [{ browser: 'chromium' }, { browser: 'firefox' }],
        screenshotFailures: false,
      },
    },
  }),
);
