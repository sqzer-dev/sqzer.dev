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
        commands: { emulateMedia },
        instances: [{ browser: 'chromium' }, { browser: 'firefox' }],
        screenshotFailures: false,
      },
    },
  }),
);
