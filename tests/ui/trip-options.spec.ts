import { test } from '@ui/fixtures/ui.fixture';
import { addDaysWithinMonth } from '@ui/data/dates';
import { BUENOS_AIRES_TO_MAR_DEL_PLATA, reverseRoute } from '@ui/data/routes';
import type { Departure } from '@ui/pages/search/search.page';

const ROUTE = BUENOS_AIRES_TO_MAR_DEL_PLATA;
const DEPARTURE_DAY = 15;
const RETURN_DAY = 20;

test.describe('Trip options', { tag: ['@ui', '@regression'] }, () => {
  test.beforeEach(async ({ searchPage }) => {
    await searchPage.goto();
  });

  test('swaps origin and destination', async ({ searchPage }) => {
    await searchPage.selectRoute(ROUTE);

    await searchPage.swapPlaces();

    await searchPage.verify.placesAreSwapped(ROUTE);
  });

  test('searches the reversed route', async ({ searchPage, resultsPage }) => {
    const reversed = reverseRoute(ROUTE);
    const departure = await searchPage.searchTrip(reversed, DEPARTURE_DAY);

    await resultsPage.verify.urlMatchesSearch(reversed, departure);
    await resultsPage.verify.showsRoute(reversed);
    await resultsPage.verify.listsOnlyServicesFor(reversed);
  });

  test.describe('round trip', () => {
    test('blocks return days before the departure', async ({ searchPage }) => {
      await searchPage.selectRoute(ROUTE);
      await searchPage.chooseRoundTrip();
      await searchPage.pickDepartureNextMonth(DEPARTURE_DAY);

      await searchPage.verify.returnCalendarBlocksDaysBeforeDeparture();
    });

    test('keeps both dates in the results URL', async ({ searchPage, resultsPage }) => {
      const { departure, returnDate } = await searchPage.searchRoundTrip(
        ROUTE,
        DEPARTURE_DAY,
        RETURN_DAY,
      );

      await resultsPage.verify.urlMatchesSearch(ROUTE, departure);
      await resultsPage.verify.urlHasReturnDate(returnDate);
      await resultsPage.verify.listsOnlyServicesFor(ROUTE);
    });
  });

  test('carries the passenger count to the results', async ({ searchPage, resultsPage }) => {
    const passengers = 3;
    await searchPage.selectPassengers(passengers);
    await searchPage.verify.passengersAre(passengers);
    const departure = await searchPage.searchTrip(ROUTE, DEPARTURE_DAY);

    await resultsPage.verify.urlMatchesSearch(ROUTE, departure);
    await resultsPage.verify.urlHasPassengers(passengers);
  });

  test.describe('results page', () => {
    let departure: Departure;

    test.beforeEach(async ({ searchPage, resultsPage }) => {
      departure = await searchPage.searchTrip(ROUTE, DEPARTURE_DAY);
      await resultsPage.verify.selectedDateIs(departure);
    });

    test('changes the day from the date strip', async ({ resultsPage }) => {
      const nextDay = addDaysWithinMonth(departure, 1);

      await resultsPage.selectDateTab(nextDay);

      await resultsPage.verify.urlDepartureIs(nextDay);
      await resultsPage.verify.selectedDateIs(nextDay);
      await resultsPage.verify.listsOnlyServicesFor(ROUTE);
    });

    for (const order of ['lowest price', 'highest price', 'latest'] as const) {
      test(`sorts services by ${order}`, async ({ resultsPage }) => {
        await resultsPage.sortBy(order);

        await resultsPage.verify.servicesAreSortedBy(order);
      });
    }

    test('opens and closes the service details', async ({ resultsPage }) => {
      await resultsPage.openFirstServiceDetails();
      await resultsPage.verify.detailsModalShowsTrip(ROUTE);

      await resultsPage.closeDetails();

      await resultsPage.verify.detailsModalIsClosed();
    });
  });
});
