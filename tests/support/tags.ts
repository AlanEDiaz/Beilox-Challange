/**
 * Coverage tags. A test declares which contract checks and requirements it really exercises;
 * scripts/coverage-report.ts turns them into the traceability and contract matrices.
 */

/** API contract checks, evaluated per endpoint (people, planets, films). */
export const CHECK = {
  list: '@chk-list',
  happy: '@chk-happy',
  notFound: '@chk-not-found',
  invalidId: '@chk-invalid-id',
  schema: '@chk-schema',
  time: '@chk-time',
  json: '@chk-json',
  pagination: '@chk-pagination',
} as const;

/** UI requirements taken from the challenge brief, evaluated per browser. */
export const REQ = {
  validSearch: '@req-valid-search',
  coherentResults: '@req-coherent-results',
  noResults: '@req-no-results',
  invalidData: '@req-invalid-data',
  backNavigation: '@req-back-navigation',
} as const;
