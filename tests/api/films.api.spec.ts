import { filmCollectionSchema, filmSchema } from '@api/schemas/films.schema';
import { defineResourceSuite } from './support/resource-suite';

defineResourceSuite({
  resource: 'films',
  itemSchema: filmSchema,
  list: { kind: 'collection', schema: filmCollectionSchema },
  existingId: 1,
});
