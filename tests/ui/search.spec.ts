import { test } from '@ui/fixtures/ui.fixture';
import { BUENOS_AIRES_TO_MAR_DEL_PLATA, SAME_TERMINAL } from '@ui/data/routes';
import { REQ } from '../support/tags';

const DEPARTURE_DAY_NEXT_MONTH = 15;

test.describe('Search tickets', { tag: '@ui' }, () => {
  test.beforeEach(async ({ searchPage }) => {
    await searchPage.goto();
  });

  test.describe('valid search', () => {
    test(
      'lists services coherent with the searched route and date',
      { tag: ['@smoke', REQ.validSearch, REQ.coherentResults] },
      async ({ searchPage, resultsPage }) => {
        const departure = await searchPage.searchTrip(
          BUENOS_AIRES_TO_MAR_DEL_PLATA,
          DEPARTURE_DAY_NEXT_MONTH,
        );

        await resultsPage.verify.urlMatchesSearch(BUENOS_AIRES_TO_MAR_DEL_PLATA, departure);
        await resultsPage.verify.showsRoute(BUENOS_AIRES_TO_MAR_DEL_PLATA);
        await resultsPage.verify.selectedDateIs(departure);
        await resultsPage.verify.listsOnlyServicesFor(BUENOS_AIRES_TO_MAR_DEL_PLATA);
        await resultsPage.verify.firstServiceIsComplete(BUENOS_AIRES_TO_MAR_DEL_PLATA);
      },
    );
  });

  test.describe('search without results', () => {
    test(
      'shows the empty state when origin and destination are the same terminal',
      { tag: ['@smoke', REQ.noResults] },
      async ({ searchPage, resultsPage }) => {
        const departure = await searchPage.searchTrip(SAME_TERMINAL, DEPARTURE_DAY_NEXT_MONTH);

        await resultsPage.verify.urlMatchesSearch(SAME_TERMINAL, departure);
        await resultsPage.verify.showsNoServices();
      },
    );
  });

  test.describe('invalid data', () => {
    test(
      'flags every required field when submitting an empty form',
      { tag: [REQ.invalidData] },
      async ({ searchPage }) => {
        await searchPage.submit();

        await searchPage.verify.requiredFieldsAreFlagged();
      },
    );

    test(
      'flags the missing date when only the route is filled',
      { tag: [REQ.invalidData] },
      async ({ searchPage }) => {
        await searchPage.selectOrigin(BUENOS_AIRES_TO_MAR_DEL_PLATA.origin);
        await searchPage.selectDestination(BUENOS_AIRES_TO_MAR_DEL_PLATA.destination);
        await searchPage.submit();

        await searchPage.verify.dateIsMissingError();
      },
    );

    test(
      'offers no terminal for an unknown origin',
      { tag: [REQ.invalidData] },
      async ({ searchPage }) => {
        await searchPage.typeInOrigin('zzzzqq');

        await searchPage.verify.autocompleteHasNoMatches();
      },
    );

    test(
      'does not allow selecting a past date',
      { tag: [REQ.invalidData] },
      async ({ searchPage }) => {
        await searchPage.openDatePicker();

        await searchPage.verify.pastDaysAreNotSelectable();
      },
    );
  });

  test.describe('back navigation', () => {
    test(
      'returns to the search form with the previous search kept',
      { tag: [REQ.backNavigation] },
      async ({ searchPage, resultsPage }) => {
        const { origin, destination } = BUENOS_AIRES_TO_MAR_DEL_PLATA;
        const departure = await searchPage.searchTrip(
          BUENOS_AIRES_TO_MAR_DEL_PLATA,
          DEPARTURE_DAY_NEXT_MONTH,
        );
        await resultsPage.verify.listsOnlyServicesFor(BUENOS_AIRES_TO_MAR_DEL_PLATA);

        await resultsPage.goBack();

        await searchPage.verify.formKeepsSearch(
          origin.optionText,
          destination.optionText,
          departure,
        );
      },
    );
  });
});
