import 'dotenv/config';

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Env var ${name} must be a positive integer, got "${raw}"`);
  }
  return value;
}

export interface Env {
  readonly swapiBaseUrl: string;
  readonly centralDePasajesUrl: string;
  readonly apiMaxResponseMs: number;
}

export const env: Env = {
  // Trailing slash is required so relative paths ("people/1") resolve under /api/.
  swapiBaseUrl: process.env['SWAPI_BASE_URL'] ?? 'https://www.swapi.tech/api/',
  centralDePasajesUrl: process.env['CDP_BASE_URL'] ?? 'https://www.centraldepasajes.com.ar',
  apiMaxResponseMs: readPositiveInt('API_MAX_RESPONSE_MS', 5000),
};
