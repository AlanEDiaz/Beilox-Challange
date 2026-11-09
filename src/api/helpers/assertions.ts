import type { SchemaObject } from 'ajv';
import { expect, test } from '@playwright/test';
import type { ApiResult } from '../clients/swapi.client';
import { validateSchema } from './schema-validator';

/** Asserts `body` conforms to `schema`; failure message lists every violated rule. */
export function expectSchema(schema: SchemaObject, body: unknown): void {
  const { valid, errors } = validateSchema(schema, body);
  expect(valid, `Schema violations:\n${errors.join('\n')}`).toBe(true);
}

export function expectStatus(result: ApiResult, expected: number): void {
  expect(result.status, `Unexpected status for ${result.response.url()}`).toBe(expected);
}

export function expectJsonContentType(result: ApiResult): void {
  expect(result.response.headers()['content-type'] ?? '').toContain('application/json');
}

export function expectWithinBudget(result: ApiResult, maxMs: number): void {
  expect(result.durationMs, `${result.response.url()} took ${result.durationMs}ms`).toBeLessThan(
    maxMs,
  );
}

/** Records a `known-issue` annotation when swapi.tech misspells the error key as "messsage". */
export function annotateUpstreamTypo(resource: string, body: unknown): void {
  const hasTypo = typeof body === 'object' && body !== null && 'messsage' in body;
  if (!hasTypo) return;
  test.info().annotations.push({
    type: 'known-issue',
    description: `/${resource} 404 body misspells "message" as "messsage" (upstream bug)`,
  });
}
