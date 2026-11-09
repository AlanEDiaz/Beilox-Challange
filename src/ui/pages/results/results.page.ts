import type { Page } from '@playwright/test';
import { dateTabLabel } from '../../data/dates';
import type { Departure } from '../search/search.page';
import { ResultsAssertions } from './results.assertions';
import type { SortOrder } from './results.assertions';
import { ResultsLocators } from './results.locators';

const SORT_LABELS: Record<SortOrder, string> = {
  earliest: 'más temprano',
  latest: 'más tarde',
  'lowest price': 'menor precio',
  'highest price': 'mayor precio',
};

/** Results page: navigation, sorting and the details modal. */
export class ResultsPage {
  readonly locators: ResultsLocators;
  readonly verify: ResultsAssertions;

  constructor(private readonly page: Page) {
    this.locators = new ResultsLocators(page);
    this.verify = new ResultsAssertions(page, this.locators);
  }

  async goBack(): Promise<void> {
    await this.page.goBack();
  }

  /** Opens a day from the date strip (must be near the selected one, so it is on screen). */
  async selectDateTab(date: Departure): Promise<void> {
    await this.locators.dateTab(dateTabLabel(date)).click();
  }

  async sortBy(order: SortOrder): Promise<void> {
    await this.locators.sortControl.click();
    await this.locators.sortOption(SORT_LABELS[order]).click();
  }

  async openFirstServiceDetails(): Promise<void> {
    await this.locators.cardDetailsLink(this.locators.serviceCards.first()).click();
  }

  async closeDetails(): Promise<void> {
    await this.locators.detailsModalClose.click();
  }
}
