import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import type { Place, Route } from '../../data/routes';
import { SearchAssertions } from './search.assertions';
import { SearchLocators } from './search.locators';

/** A calendar date as zero-padded strings, as the site shows it in its date inputs. */
export interface Departure {
  readonly day: string;
  readonly month: string;
  readonly year: string;
}

export interface RoundTrip {
  readonly departure: Departure;
  readonly returnDate: Departure;
}

/** Actions on the home page search form. Selectors live in SearchLocators, checks in `verify`. */
export class SearchPage {
  readonly locators: SearchLocators;
  readonly verify: SearchAssertions;

  constructor(private readonly page: Page) {
    this.locators = new SearchLocators(page);
    this.verify = new SearchAssertions(this.locators);
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.verify.formIsVisible();
  }

  async selectOrigin(place: Place): Promise<void> {
    await this.locators.originCombobox.click();
    await this.chooseOption(place);
  }

  /** The site opens the destination list by itself once an origin is chosen. */
  async selectDestination(place: Place): Promise<void> {
    await expect(this.locators.destinationCombobox).toHaveAttribute('aria-expanded', 'true');
    await this.chooseOption(place);
  }

  async selectRoute(route: Route): Promise<void> {
    await this.selectOrigin(route.origin);
    await this.selectDestination(route.destination);
  }

  async swapPlaces(): Promise<void> {
    await this.locators.swapButton.click();
  }

  async selectPassengers(count: number): Promise<void> {
    await this.locators.passengersSelect.selectOption(String(count));
  }

  /** Types in the open autocomplete without choosing anything (for invalid-input checks). */
  async typeInOrigin(text: string): Promise<void> {
    await this.locators.originCombobox.click();
    await this.locators.dropdownSearchField.fill(text);
  }

  /** Picks `dayOfMonth` of NEXT month: always in the future, whatever day the suite runs. */
  async pickDepartureNextMonth(dayOfMonth: number): Promise<Departure> {
    await this.openDatePicker();
    await this.locators.datePickerNextMonth.click();
    await this.locators.dayOfShownMonth(dayOfMonth).click();
    return this.readDate(this.locators.departureInput);
  }

  async chooseRoundTrip(): Promise<void> {
    await this.locators.roundTripOption.click();
    await expect(this.locators.returnInput).toBeEnabled();
  }

  /** After choosing a departure the site opens the return calendar on the same month. */
  async pickReturnSameMonth(dayOfMonth: number): Promise<Departure> {
    await expect(this.locators.returnDatePicker).toBeVisible();
    await this.locators.returnDayOfShownMonth(dayOfMonth).click();
    return this.readDate(this.locators.returnInput);
  }

  async openDatePicker(): Promise<void> {
    await this.locators.departureInput.click();
    await expect(this.locators.datePicker).toBeVisible();
  }

  async submit(): Promise<void> {
    // The button has onclick="this.click()" (self-triggering): in Firefox the click never settles
    // while the navigation runs, so don't let the click wait for it. Callers assert the outcome.
    await this.locators.searchButton.click({ noWaitAfter: true });
  }

  /**
   * Submits a valid search and waits for the results page. In Firefox the click is sometimes
   * swallowed while the date picker is still closing (layout shift), so retry until it navigates.
   */
  async submitAndWaitForResults(): Promise<void> {
    await expect(async () => {
      await this.submit();
      await expect(this.page).toHaveURL(/\/pasajes-micro\//, { timeout: 5_000 });
    }).toPass({ timeout: 30_000 });
  }

  /** One-way happy path: fill the form for `route` and submit. Returns the chosen departure. */
  async searchTrip(route: Route, dayOfNextMonth: number): Promise<Departure> {
    await this.selectRoute(route);
    const departure = await this.pickDepartureNextMonth(dayOfNextMonth);
    await this.submitAndWaitForResults();
    return departure;
  }

  async searchRoundTrip(
    route: Route,
    departureDay: number,
    returnDay: number,
    passengers = 1,
  ): Promise<RoundTrip> {
    await this.selectRoute(route);
    await this.chooseRoundTrip();
    await this.selectPassengers(passengers);
    const departure = await this.pickDepartureNextMonth(departureDay);
    const returnDate = await this.pickReturnSameMonth(returnDay);
    await this.submitAndWaitForResults();
    return { departure, returnDate };
  }

  private async chooseOption(place: Place): Promise<void> {
    await this.locators.dropdownSearchField.fill(place.query);
    await this.locators.dropdownOptions.filter({ hasText: place.optionText }).first().click();
  }

  /** The site renders dates as DD-MM-YYYY while typing and DD/MM/YYYY once restored. */
  private async readDate(input: Locator): Promise<Departure> {
    await expect(input).toHaveValue(/^\d{2}\D\d{2}\D\d{4}$/);
    const [day = '', month = '', year = ''] = (await input.inputValue()).split(/\D/);
    return { day, month, year };
  }
}
