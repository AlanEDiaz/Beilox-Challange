import { test as base } from '@playwright/test';
import { ResultsPage } from '../pages/results/results.page';
import { SearchPage } from '../pages/search/search.page';

interface UiFixtures {
  searchPage: SearchPage;
  resultsPage: ResultsPage;
}

/** Page objects are injected, never instantiated inside tests. */
export const test = base.extend<UiFixtures>({
  searchPage: async ({ page }, use) => {
    await use(new SearchPage(page));
  },
  resultsPage: async ({ page }, use) => {
    await use(new ResultsPage(page));
  },
});

export { expect } from '@playwright/test';
