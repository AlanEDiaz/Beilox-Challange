import { personSchema } from '@api/schemas/people.schema';
import { defineResourceSuite } from './support/resource-suite';

defineResourceSuite({
  resource: 'people',
  itemSchema: personSchema,
  list: { kind: 'paginated' },
  existingId: 1,
});
