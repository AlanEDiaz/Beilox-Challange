import type { SchemaObject } from 'ajv';
import { expect, test } from '@api/fixtures/api.fixture';
import type { Resource } from '@api/clients/swapi.client';
import {
  annotateUpstreamTypo,
  expectJsonContentType,
  expectSchema,
  expectStatus,
  expectWithinBudget,
} from '@api/helpers/assertions';
import { saveHappyPath } from '@api/helpers/happy-path-store';
import { errorEnvelope, paginatedListEnvelope } from '@api/schemas/envelope.schema';

export interface ResourceSuiteConfig {
  readonly resource: Resource;
  /** Schema for GET /{resource}/{id}. */
  readonly itemSchema: SchemaObject;
  /** Paginated lists share one envelope; non-paginated lists (films) bring their own schema. */
  readonly list:
    { readonly kind: 'paginated' } | { readonly kind: 'collection'; readonly schema: SchemaObject };
  readonly existingId: number;
}

const UNKNOWN_ID = 99999;
const NON_NUMERIC_ID = 'not-a-number';

/**
 * Same contract checks for every swapi.tech resource, so each endpoint gets identical coverage
 * and adding a new one is a 6-line spec instead of copy-pasted tests.
 */
export function defineResourceSuite(config: ResourceSuiteConfig): void {
  const { resource, itemSchema, existingId } = config;
  const paginated = config.list.kind === 'paginated';
  const listSchema = config.list.kind === 'paginated' ? paginatedListEnvelope : config.list.schema;

  test.describe(`/${resource}`, { tag: '@api' }, () => {
    test(
      `GET /${resource} returns the list`,
      { tag: '@smoke' },
      async ({ swapi, maxResponseMs }) => {
        const result = await swapi.list(resource);

        expectStatus(result, 200);
        expectJsonContentType(result);
        expectSchema(listSchema, result.body);
        expectWithinBudget(result, maxResponseMs);
      },
    );

    test(
      `GET /${resource}/${existingId} returns the item (happy path)`,
      { tag: '@smoke' },
      async ({ swapi, maxResponseMs }) => {
        const result = await swapi.getById(resource, existingId);

        expectStatus(result, 200);
        expectJsonContentType(result);
        expectSchema(itemSchema, result.body);
        expectWithinBudget(result, maxResponseMs);

        await saveHappyPath(resource, result.body);
      },
    );

    test(`GET /${resource}/${UNKNOWN_ID} returns 404 for an unknown id`, async ({
      swapi,
      maxResponseMs,
    }) => {
      const result = await swapi.getById(resource, UNKNOWN_ID);

      expectStatus(result, 404);
      expectSchema(errorEnvelope, result.body);
      expectWithinBudget(result, maxResponseMs);
      annotateUpstreamTypo(resource, result.body);
    });

    test(`GET /${resource}/<non-numeric> returns 404, not 400`, async ({
      swapi,
      maxResponseMs,
    }) => {
      const result = await swapi.getById(resource, NON_NUMERIC_ID);

      // Observed contract: the API never answers 400; a malformed id is just "not found".
      expectStatus(result, 404);
      expectSchema(errorEnvelope, result.body);
      expectWithinBudget(result, maxResponseMs);
    });

    if (paginated) {
      test(`GET /${resource}?page=2&limit=5 paginates consistently`, async ({
        swapi,
        maxResponseMs,
      }) => {
        const result = await swapi.list(resource, { page: 2, limit: 5 });

        expectStatus(result, 200);
        expectSchema(listSchema, result.body);
        expectWithinBudget(result, maxResponseMs);

        const body = result.body as PaginatedBody;
        const uids = body.results.map((r) => Number(r.uid));
        expect(body.results).toHaveLength(5);
        expect(body.total_pages).toBe(Math.ceil(body.total_records / 5));
        expect(body.previous).toContain('page=1');
        expect(body.next).toContain('page=3');
        // Page 2 must not repeat page 1's items: ids are unique and ascending.
        expect(uids).toEqual([...new Set(uids)].sort((x, y) => x - y));
        expect(Math.min(...uids)).toBeGreaterThan(5);
      });

      test(`GET /${resource} with invalid paging params falls back to defaults`, async ({
        swapi,
        maxResponseMs,
      }) => {
        const result = await swapi.list(resource, { page: 'abc' });

        // Observed contract: no 400 validation; bad params are ignored and defaults apply.
        expectStatus(result, 200);
        expectSchema(listSchema, result.body);
        expectWithinBudget(result, maxResponseMs);

        const body = result.body as PaginatedBody;
        expect(body.previous).toBeNull();
        expect(body.results).toHaveLength(10);
      });
    }
  });
}

interface PaginatedBody {
  readonly total_records: number;
  readonly total_pages: number;
  readonly previous: string | null;
  readonly next: string | null;
  readonly results: ReadonlyArray<{ readonly uid: string }>;
}
