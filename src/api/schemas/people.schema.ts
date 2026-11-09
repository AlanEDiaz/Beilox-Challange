import type { SchemaObject } from 'ajv';
import { fields, itemEnvelope } from './envelope.schema';

const { text, isoDate, stringList } = fields;

const personProperties: SchemaObject = {
  type: 'object',
  required: [
    'created',
    'edited',
    'name',
    'gender',
    'skin_color',
    'hair_color',
    'height',
    'eye_color',
    'mass',
    'homeworld',
    'birth_year',
    'vehicles',
    'starships',
    'films',
    'url',
  ],
  properties: {
    created: isoDate,
    edited: isoDate,
    name: { type: 'string', minLength: 1 },
    gender: text,
    skin_color: text,
    hair_color: text,
    height: text,
    eye_color: text,
    mass: text,
    homeworld: { type: 'string', format: 'uri' },
    birth_year: text,
    vehicles: stringList,
    starships: stringList,
    films: stringList,
    url: { type: 'string', format: 'uri' },
  },
};

export const personSchema: SchemaObject = itemEnvelope(personProperties);
