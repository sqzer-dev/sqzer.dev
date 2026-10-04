import { defineConfig, devices } from '@playwright/test';

const ci = Boolean(process.env['CI']);
const url = 'http://localhost:4173';

// End to end, against the built page: the policy is tested where it is served (ADR-0002 D3, D6).
export default defineConfig({
  testDir: 'tests/e2e',
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
