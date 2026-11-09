import { env } from '../../../src/shared/config/env';
import type { RuleId } from './rules';

export type TargetName = 'centraldepasajes' | 'swapi';
export type GapId = RuleId | 'cookie-samesite' | 'http-redirect';

export interface Target {
  readonly name: TargetName;
  readonly kind: 'web' | 'api';
  readonly url: string;
  /**
   * Findings observed on 2026-11-09 that the owner has not fixed. Their test is marked
   * `test.fail()`: it stays green while the gap exists and turns red when the owner fixes it,
   * which is the signal to delete the entry here. Any NEW regression fails normally.
   */
  readonly knownGaps: readonly GapId[];
  readonly expectsSessionCookie: boolean;
}

export const TARGETS: readonly Target[] = [
  {
    name: 'centraldepasajes',
    kind: 'web',
    url: `${env.centralDePasajesUrl}/`,
    knownGaps: [
      'hsts',
      'nosniff',
      'referrer-policy',
      'clickjacking',
      'csp',
      'no-tech-disclosure',
      'cookie-samesite',
    ],
    expectsSessionCookie: true,
  },
  {
    name: 'swapi',
    kind: 'api',
    url: new URL('people/1', env.swapiBaseUrl).href,
    knownGaps: ['hsts', 'nosniff', 'no-tech-disclosure', 'http-redirect'],
    expectsSessionCookie: false,
  },
];
