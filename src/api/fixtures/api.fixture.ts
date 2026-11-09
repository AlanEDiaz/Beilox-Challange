import { test as base } from '@playwright/test';
import { env } from '@shared/config/env';
import { SwapiClient } from '../clients/swapi.client';

interface ApiFixtures {
  swapi: SwapiClient;
  /** Response-time budget (ms), configurable through API_MAX_RESPONSE_MS. */
  maxResponseMs: number;
}

export const test = base.extend<ApiFixtures>({
  swapi: async ({ request }, use) => {
    await use(new SwapiClient(request));
  },
  maxResponseMs: async ({}, use) => {
    await use(env.apiMaxResponseMs);
  },
});

export { expect } from '@playwright/test';
