import { expect } from '@playwright/test';
import type { Route } from '../../data/routes';
import type { Departure } from './search.page';
import type { SearchLocators } from './search.locators';

/** Web-first assertions for the search form (all auto-retrying, no fixed waits). */
export class SearchAssertions {
  constructor(private readonly locators: SearchLocators) {}

  async formIsVisible(): Promise<void> {
    await expect(this.locators.originCombobox).toBeVisible();
    await expect(this.locators.destinationCombobox).toBeVisible();
    await expect(this.locators.searchButton).toBeEnabled();
  }

  async requiredFieldsAreFlagged(): Promise<void> {
    await expect(this.locators.validationMessages).toHaveText([
      'Completá el Origen de tu viaje',
      'Completá el Destino de tu viaje',
      'Completá la fecha',
    ]);
  }

  async dateIsMissingError(): Promise<void> {
    await expect(this.locators.validationMessages).toHaveText(['Completá la fecha']);
  }

  async autocompleteHasNoMatches(): Promise<void> {
    await expect(this.locators.dropdownOptions).toHaveText(['No se encontraron resultados']);
  }

  async pastDaysAreNotSelectable(): Promise<void> {
    await expect(this.locators.invalidDays.first()).toBeVisible();
  }

  async placesAreSwapped(route: Route): Promise<void> {
    await expect(this.locators.originValue).toContainText(route.destination.optionText);
    await expect(this.locators.destinationValue).toContainText(route.origin.optionText);
  }

  /** Return calendar greys out days before the chosen departure and starts empty. */
  async returnCalendarBlocksDaysBeforeDeparture(): Promise<void> {
    await expect(this.locators.returnDatePicker).toBeVisible();
    await expect(this.locators.returnInvalidDays.first()).toBeVisible();
    await expect(this.locators.returnInput).toHaveValue('');
  }

  async passengersAre(count: number): Promise<void> {
    await expect(this.locators.passengersSelect).toHaveValue(String(count));
  }

  async formKeepsSearch(originText: string, destinationText: string, departure: Departure) {
    await expect(this.locators.originValue).toContainText(originText);
    await expect(this.locators.destinationValue).toContainText(destinationText);
    // The site re-renders the restored date with "/" instead of the "-" used while typing.
    await expect(this.locators.departureInput).toHaveValue(
      new RegExp(`^${departure.day}\\D${departure.month}\\D${departure.year}$`),
    );
  }
}
