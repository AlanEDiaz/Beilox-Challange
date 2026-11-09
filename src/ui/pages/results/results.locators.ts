import type { Locator, Page } from '@playwright/test';

/** Selectors only for the results page. */
export class ResultsLocators {
  constructor(private readonly page: Page) {}

  get routeHeading(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }
  get selectedDateTab(): Locator {
    return this.page.locator('a.active.poi .fecha');
  }
  /** Day tab in the date strip, found by its "16 Dic" label. */
  dateTab(label: RegExp): Locator {
    return this.page
      .locator('a.poi')
      .filter({ has: this.page.locator('.fecha', { hasText: label }) });
  }

  get serviceCards(): Locator {
    return this.page.locator('#servicios .card');
  }
  /** Origin is the first ".ciudad" in a card, destination the second. */
  cardCity(card: Locator, position: 'origin' | 'destination'): Locator {
    return card.locator('.ciudad').nth(position === 'origin' ? 0 : 1);
  }
  cardDeparture(card: Locator): Locator {
    return card.locator('.hora').first();
  }
  cardArrival(card: Locator): Locator {
    return card.locator('.hora').nth(1);
  }
  cardDetailsLink(card: Locator): Locator {
    // An <a> without href: it opens a modal, so it has no "link" role.
    return card.getByText('Ver detalles', { exact: true });
  }

  /** Custom (slim-select) sort widget; its text is the current choice. */
  get sortControl(): Locator {
    return this.page.locator('.ss-main', {
      hasText: /^(más temprano|más tarde|menor precio|mayor precio)$/,
    });
  }
  sortOption(label: string): Locator {
    return this.page.locator('.ss-content .ss-option', { hasText: new RegExp(`^${label}$`) });
  }

  get detailsModal(): Locator {
    return this.page.locator('#modal-informacion');
  }
  get detailsModalClose(): Locator {
    return this.detailsModal.locator('a.close').first();
  }

  get noServicesTitle(): Locator {
    return this.page.getByText('¡Ups!', { exact: true });
  }
  get noServicesMessage(): Locator {
    return this.page.getByText('No encontramos opciones para tu viaje.');
  }
  get newSearchLink(): Locator {
    return this.page.getByRole('link', { name: 'Nueva búsqueda' });
  }
}
