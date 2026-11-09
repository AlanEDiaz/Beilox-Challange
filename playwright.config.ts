import { defineConfig, devices } from '@playwright/test';
import { env } from './src/shared/config/env';

const isCI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // API specs run with --workers=1 (see test:api) to respect swapi.tech's rate limit.
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: isCI
    ? [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
  },
  projects: [
    ...(['chromium', 'firefox', 'webkit'] as const).map((browser) => ({
      name: `ui-${browser}`,
      testMatch: 'ui/**/*.spec.ts',
      use: {
        ...devices[
          browser === 'chromium'
            ? 'Desktop Chrome'
            : browser === 'firefox'
              ? 'Desktop Firefox'
              : 'Desktop Safari'
        ],
        baseURL: env.centralDePasajesUrl,
      },
    })),
    {
      name: 'api',
      testMatch: 'api/**/*.spec.ts',
      use: {
        baseURL: env.swapiBaseUrl,
        extraHTTPHeaders: { Accept: 'application/json' },
      },
    },
  ],
});
