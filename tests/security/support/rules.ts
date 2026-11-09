import { cspWeaknesses } from './csp';

/** Lower-cased response headers, as returned by Playwright's `response.allHeaders()`. */
export type Headers = Readonly<Record<string, string>>;

export type RuleId =
  'hsts' | 'nosniff' | 'referrer-policy' | 'clickjacking' | 'csp' | 'no-tech-disclosure';

export interface Rule {
  readonly id: RuleId;
  readonly title: string;
  /** 'web' rules only make sense for pages a browser renders; 'all' also covers JSON APIs. */
  readonly appliesTo: 'all' | 'web';
  /** Returns what is wrong, or undefined when the header policy is acceptable. */
  readonly problem: (headers: Headers) => string | undefined;
}

const HSTS_MIN_SECONDS = 15_552_000; // 180 days

export const RULES: readonly Rule[] = [
  {
    id: 'hsts',
    title: 'enforces HTTPS with Strict-Transport-Security (max-age of 180 days or more)',
    appliesTo: 'all',
    problem: (headers) => {
      const value = headers['strict-transport-security'];
      if (value === undefined) return 'Strict-Transport-Security header is missing';
      const maxAge = Number(/max-age=(\d+)/i.exec(value)?.[1] ?? 0);
      return maxAge >= HSTS_MIN_SECONDS ? undefined : `max-age=${maxAge} is below 180 days`;
    },
  },
  {
    id: 'nosniff',
    title: 'stops MIME sniffing with X-Content-Type-Options: nosniff',
    appliesTo: 'all',
    problem: (headers) => {
      const value = headers['x-content-type-options'];
      return value?.toLowerCase() === 'nosniff'
        ? undefined
        : `expected "nosniff", got ${value === undefined ? 'no header' : `"${value}"`}`;
    },
  },
  {
    id: 'referrer-policy',
    title: 'limits referrer leakage with a Referrer-Policy',
    appliesTo: 'web',
    problem: (headers) => {
      const value = headers['referrer-policy']?.toLowerCase();
      if (value === undefined) return 'Referrer-Policy header is missing';
      return ['unsafe-url', 'no-referrer-when-downgrade'].includes(value)
        ? `"${value}" leaks full URLs cross-origin`
        : undefined;
    },
  },
  {
    id: 'clickjacking',
    title: 'blocks framing (X-Frame-Options or CSP frame-ancestors)',
    appliesTo: 'web',
    problem: (headers) => {
      const frameOptions = headers['x-frame-options']?.toUpperCase();
      if (frameOptions === 'DENY' || frameOptions === 'SAMEORIGIN') return undefined;
      const csp = headers['content-security-policy'] ?? '';
      return /(^|;)\s*frame-ancestors\s/i.test(csp)
        ? undefined
        : 'neither X-Frame-Options nor CSP frame-ancestors is set';
    },
  },
  {
    id: 'csp',
    title: 'ships a Content-Security-Policy without weak script sources',
    appliesTo: 'web',
    problem: (headers) => {
      const csp = headers['content-security-policy'];
      if (csp === undefined) return 'Content-Security-Policy header is missing';
      const weaknesses = cspWeaknesses(csp);
      return weaknesses.length === 0 ? undefined : weaknesses.join('; ');
    },
  },
  {
    id: 'no-tech-disclosure',
    title: 'does not disclose its stack through X-Powered-By',
    appliesTo: 'all',
    problem: (headers) => {
      const value = headers['x-powered-by'];
      return value === undefined ? undefined : `X-Powered-By discloses "${value}"`;
    },
  },
];
