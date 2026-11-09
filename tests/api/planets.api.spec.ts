import { planetSchema } from '@api/schemas/planets.schema';
import { defineResourceSuite } from './support/resource-suite';

defineResourceSuite({
  resource: 'planets',
  itemSchema: planetSchema,
  list: { kind: 'paginated' },
  existingId: 1,
});
