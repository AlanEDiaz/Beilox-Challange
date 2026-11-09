/** A terminal as the user finds it in the autocomplete, plus the name the results page shows. */
export interface Place {
  /** Text typed into the autocomplete. */
  readonly query: string;
  /** Text that identifies the wanted option in the dropdown list. */
  readonly optionText: string;
  /** Name displayed on the results page (header and service cards). */
  readonly resultName: string;
  /** URL path segment used by the results page. */
  readonly slug: string;
}

export interface Route {
  readonly origin: Place;
  readonly destination: Place;
}

export const BUENOS_AIRES_RETIRO: Place = {
  query: 'Buenos',
  optionText: 'Terminal Retiro',
  resultName: 'Retiro Buenos Aires',
  slug: 'retiro-buenos-aires',
};

export const MAR_DEL_PLATA: Place = {
  query: 'Mar del Plata',
  optionText: 'Mar del Plata Terminal',
  resultName: 'Mar del Plata',
  slug: 'mar-del-plata',
};

/** Busy route that always has services: the happy path. */
export const BUENOS_AIRES_TO_MAR_DEL_PLATA: Route = {
  origin: BUENOS_AIRES_RETIRO,
  destination: MAR_DEL_PLATA,
};

export function reverseRoute(route: Route): Route {
  return { origin: route.destination, destination: route.origin };
}

/** Same terminal on both ends: the site has no service for it ("¡Ups!" page). Deterministic. */
export const SAME_TERMINAL: Route = {
  origin: BUENOS_AIRES_RETIRO,
  destination: BUENOS_AIRES_RETIRO,
};
