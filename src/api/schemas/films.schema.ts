import type { SchemaObject } from 'ajv';
import { collectionEnvelope, fields, itemEnvelope } from './envelope.schema';

const { text, isoDate, stringList } = fields;

const filmProperties: SchemaObject = {
  type: 'object',
  required: [
    'created',
    'edited',
    'title',
    'episode_id',
    'director',
    'producer',
    'release_date',
    'opening_crawl',
    'characters',
    'planets',
    'starships',
    'vehicles',
    'species',
    'url',
  ],
  properties: {
    created: isoDate,
    edited: isoDate,
    title: { type: 'string', minLength: 1 },
    episode_id: { type: 'integer', minimum: 1 },
    director: text,
    producer: text,
    release_date: { type: 'string', format: 'date' },
    opening_crawl: text,
    characters: stringList,
    planets: stringList,
    starships: stringList,
    vehicles: stringList,
    species: stringList,
    url: { type: 'string', format: 'uri' },
  },
};

export const filmSchema: SchemaObject = itemEnvelope(filmProperties);
export const filmCollectionSchema: SchemaObject = collectionEnvelope(filmProperties);
