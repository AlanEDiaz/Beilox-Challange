import type { Locator, Page } from '@playwright/test';

/** Selectors only: no actions and no assertions. The single place to fix when the markup changes. */
export class SearchLocators {
  constructor(private readonly page: Page) {}

  // Origin / destination are select2 widgets: the real <input> is hidden, the combobox is a span.
  get originCombobox(): Locator {
    return this.page.locator('[aria-labelledby="select2-PadOrigen-container"]');
  }
  get destinationCombobox(): Locator {
    return this.page.locator('[aria-labelledby="select2-PadDestino-container"]');
  }
  get originValue(): Locator {
    return this.page.locator('#select2-PadOrigen-container');
  }
  get destinationValue(): Locator {
    return this.page.locator('#select2-PadDestino-container');
  }

  // The dropdown is rendered once, at the end of <body>, for whichever combobox is open.
  get dropdownSearchField(): Locator {
    return this.page.locator('.select2-container--open .select2-search__field');
  }
  get dropdownOptions(): Locator {
    return this.page.locator('.select2-results__option');
  }

  get departureInput(): Locator {
    return this.page.locator('#fechaPartida');
  }
  get datePicker(): Locator {
    // A second picker (#cdp-calendar-container-regreso) exists for the return trip.
    return this.page.locator('#cdp-calendar-container .date-picker-wrapper');
  }
  get datePickerNextMonth(): Locator {
    return this.datePicker.locator('.next');
  }
  get invalidDays(): Locator {
    return this.datePicker.locator('.day.invalid');
  }
  dayOfShownMonth(day: number): Locator {
    return this.datePicker.locator('.day.toMonth.valid', { hasText: new RegExp(`^${day}$`) });
  }

  get swapButton(): Locator {
    return this.page.locator('#btnChangePads');
  }
  /** The radio input is visually hidden; its label is what users click. */
  get roundTripOption(): Locator {
    return this.page.locator('label.radio-inline', { hasText: 'Ida y vuelta' });
  }
  get returnInput(): Locator {
    return this.page.locator('#fechaVuelta');
  }
  get returnDatePicker(): Locator {
    return this.page.locator('#cdp-calendar-container-regreso .date-picker-wrapper');
  }
  get returnInvalidDays(): Locator {
    return this.returnDatePicker.locator('.day.toMonth.invalid');
  }
  returnDayOfShownMonth(day: number): Locator {
    return this.returnDatePicker.locator('.day.toMonth.valid', {
      hasText: new RegExp(`^${day}$`),
    });
  }
  get passengersSelect(): Locator {
    return this.page.locator('#pasajeros');
  }

  get searchButton(): Locator {
    return this.page.locator('#btnCons');
  }
  get validationMessages(): Locator {
    return this.page.locator('.parsley-errors-list li');
  }
}
