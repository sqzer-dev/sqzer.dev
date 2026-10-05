import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';

import app from './vite.config';

// Units, components and the `decodeAny` checks, in the engines the page runs in (ADR-0002 D6).
export default mergeConfig(
  app,
  defineConfig({
    test: {
      include: ['src/**/*.test.{ts,tsx}'],
      // a test that asserts nothing has checked nothing
      expect: { requireAssertions: true },
      restoreMocks: true,
      browser: {
        enabled: true,
        headless: true,
        provider: playwright(),
        instances: [{ browser: 'chromium' }, { browser: 'firefox' }],
        screenshotFailures: false,
      },
    },
  }),
);
