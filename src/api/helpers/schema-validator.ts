import Ajv from 'ajv';
import type { SchemaObject } from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

export interface SchemaResult {
  readonly valid: boolean;
  /** Human readable list of violations, empty when valid. */
  readonly errors: readonly string[];
}

/** Validates `data` against `schema`; compiled validators are cached by Ajv per schema object. */
export function validateSchema(schema: SchemaObject, data: unknown): SchemaResult {
  const validate = ajv.compile(schema);
  const valid = validate(data);
  const errors = (validate.errors ?? []).map(
    (e) => `${e.instancePath || '(root)'} ${e.message ?? 'invalid'}`,
  );
  return { valid, errors };
}
