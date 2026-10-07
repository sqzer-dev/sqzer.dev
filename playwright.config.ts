import { defineConfig, devices } from '@playwright/test';

const ci = Boolean(process.env['CI']);
const url = 'http://localhost:4173';

// End to end, against the built page: the policy is tested where it is served (ADR-0002 D3, D6).
export default defineConfig({
  testDir: 'tests/e2e',
  // a search of a 2000 px image is seconds, and tens of them on a loaded machine: the suite waits up to
  // 120 s for one, and the test has to be allowed to
  timeout: 150_000,
  fullyParallel: true,
  forbidOnly: ci,
  retries: 0,
  reporter: ci ? 'github' : 'list',
  use: { baseURL: url },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'firefox', use: devices['Desktop Firefox'] },
  ],
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173 --strictPort',
    url,
    reuseExistingServer: !ci,
  },
});
