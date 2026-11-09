import type { SchemaObject } from 'ajv';

/** Fields every swapi.tech response carries, success or error. */
const metaProperties = {
  apiVersion: { type: 'string' },
  timestamp: { type: 'string', format: 'date-time' },
  support: {
    type: 'object',
    required: ['contact'],
    properties: { contact: { type: 'string' } },
  },
} as const;

const stringList = { type: 'array', items: { type: 'string', format: 'uri' } } as const;
const isoDate = { type: 'string', format: 'date-time' } as const;
const text = { type: 'string' } as const;

/** Building blocks reused by every resource schema. */
export const fields = { stringList, isoDate, text } as const;

/** Wraps a resource "properties" schema in the single-item envelope: GET /{resource}/{id}. */
export function itemEnvelope(propertiesSchema: SchemaObject): SchemaObject {
  return {
    type: 'object',
    required: ['message', 'result', 'apiVersion', 'timestamp', 'support'],
    properties: {
      ...metaProperties,
      message: { const: 'ok' },
      result: documentSchema(propertiesSchema),
    },
  };
}

/** Films-style list: GET /films returns full documents and no pagination fields. */
export function collectionEnvelope(propertiesSchema: SchemaObject): SchemaObject {
  return {
    type: 'object',
    required: ['message', 'result', 'apiVersion', 'timestamp', 'support'],
    properties: {
      ...metaProperties,
      message: { const: 'ok' },
      result: { type: 'array', minItems: 1, items: documentSchema(propertiesSchema) },
    },
  };
}

/** People/planets-style list: GET /{resource}?page=&limit= returns summaries plus pagination. */
export const paginatedListEnvelope: SchemaObject = {
  type: 'object',
  required: ['message', 'total_records', 'total_pages', 'previous', 'next', 'results'],
  properties: {
    ...metaProperties,
    message: { const: 'ok' },
    total_records: { type: 'integer', minimum: 1 },
    total_pages: { type: 'integer', minimum: 1 },
    previous: { type: ['string', 'null'], format: 'uri' },
    next: { type: ['string', 'null'], format: 'uri' },
    results: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['uid', 'name', 'url'],
        properties: {
          uid: { type: 'string', pattern: '^[0-9]+$' },
          name: { type: 'string', minLength: 1 },
          url: { type: 'string', format: 'uri' },
        },
      },
    },
  },
};

/**
 * Error body. swapi.tech is inconsistent: GET /planets/{unknown} answers with the misspelled
 * key "messsage" (three s). Both spellings are accepted here and the typo is reported as an
 * annotation by the test instead of silently hidden.
 */
export const errorEnvelope: SchemaObject = {
  type: 'object',
  required: ['apiVersion', 'timestamp', 'support'],
  properties: {
    ...metaProperties,
    message: { type: 'string', minLength: 1 },
    messsage: { type: 'string', minLength: 1 },
  },
  anyOf: [
    { required: ['message'], properties: { message: { type: 'string' } } },
    { required: ['messsage'], properties: { messsage: { type: 'string' } } },
  ],
};

function documentSchema(propertiesSchema: SchemaObject): SchemaObject {
  return {
    type: 'object',
    required: ['properties', '_id', 'description', 'uid'],
    properties: {
      properties: propertiesSchema,
      _id: { type: 'string' },
      description: { type: 'string' },
      uid: { type: 'string', pattern: '^[0-9]+$' },
    },
  };
}
