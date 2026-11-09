import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { dateTabLabel } from '../../data/dates';
import type { Route } from '../../data/routes';
import type { Departure } from '../search/search.page';
import type { ResultsLocators } from './results.locators';

export type SortOrder = 'earliest' | 'latest' | 'lowest price' | 'highest price';

interface SortRule {
  /** Card data attribute holding the value: data-servicio-sale ("HHMM") or data-servicio-valor. */
  readonly field: 'servicioSale' | 'servicioValor';
  readonly direction: 'asc' | 'desc';
}

const SORT_RULES: Record<SortOrder, SortRule> = {
  earliest: { field: 'servicioSale', direction: 'asc' },
  latest: { field: 'servicioSale', direction: 'desc' },
  'lowest price': { field: 'servicioValor', direction: 'asc' },
  'highest price': { field: 'servicioValor', direction: 'desc' },
};

/** Web-first assertions for the results page. */
export class ResultsAssertions {
  constructor(
    private readonly page: Page,
    private readonly locators: ResultsLocators,
  ) {}

  /** URL encodes route and date: /cdp/pasajes-micro/<origin>/<destination>?FIda=MM/DD/YYYY. */
  async urlMatchesSearch(route: Route, departure: Departure): Promise<void> {
    const { origin, destination } = route;
    const path = `/pasajes-micro/${origin.slug}/${destination.slug}`;
    await expect(this.page).toHaveURL(new RegExp(`${path}\\?`));
    await this.urlDepartureIs(departure);
  }

  async urlDepartureIs(date: Departure): Promise<void> {
    await expect(this.page).toHaveURL(
      new RegExp(`[?&]FIda=${date.month}/${date.day}/${date.year}(&|$)`),
    );
  }

  async urlHasReturnDate(date: Departure): Promise<void> {
    await expect(this.page).toHaveURL(
      new RegExp(`[?&]FVuelta=${date.month}/${date.day}/${date.year}(&|$)`),
    );
  }

  async urlHasPassengers(count: number): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`[?&]CntPas=${count}(&|$)`));
  }

  async showsRoute(route: Route): Promise<void> {
    await expect(this.locators.routeHeading).toContainText(route.origin.resultName);
    await expect(this.locators.routeHeading).toContainText(route.destination.resultName);
  }

  async selectedDateIs(departure: Departure): Promise<void> {
    await expect(this.locators.selectedDateTab).toHaveText(dateTabLabel(departure));
  }

  /** Every listed service goes from the searched origin to the searched destination. */
  async listsOnlyServicesFor(route: Route): Promise<void> {
    const { serviceCards } = this.locators;
    await expect(serviceCards.first()).toBeVisible();
    await expect(
      serviceCards.filter({
        hasNot: this.page.locator('.ciudad', { hasText: route.origin.resultName }),
      }),
    ).toHaveCount(0);
    await expect(
      serviceCards.filter({
        hasNot: this.page.locator('.ciudad', { hasText: route.destination.resultName }),
      }),
    ).toHaveCount(0);
  }

  async firstServiceIsComplete(route: Route): Promise<void> {
    const card = this.locators.serviceCards.first();
    await expect(this.locators.cardCity(card, 'origin')).toHaveText(route.origin.resultName);
    await expect(this.locators.cardCity(card, 'destination')).toHaveText(
      route.destination.resultName,
    );
    await expect(this.locators.cardDeparture(card)).toHaveText(/^\d{2}:\d{2}$/);
    await expect(this.locators.cardArrival(card)).toHaveText(/^\d{2}:\d{2}$/);
    await expect(card).toContainText(/\$\s?[\d.]+/);
    await expect(this.locators.cardDetailsLink(card)).toBeVisible();
  }

  async showsNoServices(): Promise<void> {
    await expect(this.locators.noServicesTitle).toBeVisible();
    await expect(this.locators.noServicesMessage).toBeVisible();
    await expect(this.locators.newSearchLink).toBeVisible();
    await expect(this.locators.serviceCards).toHaveCount(0);
  }

  /** Order is read from the cards' data attributes, so it never depends on text formatting. */
  async servicesAreSortedBy(order: SortOrder): Promise<void> {
    const { field, direction } = SORT_RULES[order];
    await expect(this.locators.serviceCards.first()).toBeVisible();
    await expect
      .poll(async () => {
        const values = await this.locators.serviceCards.evaluateAll(
          (cards, key) => cards.map((card) => Number((card as HTMLElement).dataset[key])),
          field,
        );
        const sorted = [...values].sort((a, b) => (direction === 'asc' ? a - b : b - a));
        return values.length > 1 && values.join() === sorted.join();
      })
      .toBe(true);
  }

  async detailsModalShowsTrip(route: Route): Promise<void> {
    const modal = this.locators.detailsModal;
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Duración de tu viaje');
    await expect(modal).toContainText(new RegExp(route.origin.optionText, 'i'));
    await expect(modal).toContainText(new RegExp(route.destination.optionText, 'i'));
  }

  async detailsModalIsClosed(): Promise<void> {
    await expect(this.locators.detailsModal).toBeHidden();
  }
}
