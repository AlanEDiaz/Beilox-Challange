import type { SchemaObject } from 'ajv';
import { fields, itemEnvelope } from './envelope.schema';

const { text, isoDate } = fields;

const planetProperties: SchemaObject = {
  type: 'object',
  required: [
    'created',
    'edited',
    'name',
    'climate',
    'surface_water',
    'diameter',
    'rotation_period',
    'orbital_period',
    'terrain',
    'gravity',
    'population',
    'url',
  ],
  properties: {
    created: isoDate,
    edited: isoDate,
    name: { type: 'string', minLength: 1 },
    climate: text,
    surface_water: text,
    diameter: text,
    rotation_period: text,
    orbital_period: text,
    terrain: text,
    gravity: text,
    population: text,
    url: { type: 'string', format: 'uri' },
  },
};

export const planetSchema: SchemaObject = itemEnvelope(planetProperties);
