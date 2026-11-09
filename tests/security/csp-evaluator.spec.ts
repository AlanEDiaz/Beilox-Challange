import { expect, test } from '@playwright/test';
import { cspWeaknesses, parseCsp } from './support/csp';

// Offline unit tests: the targets send no CSP today, so these prove the evaluator itself works.
test.describe('CSP evaluator (offline)', { tag: ['@security', '@sec-csp'] }, () => {
  const strict =
    "default-src 'none'; script-src 'nonce-abc' 'strict-dynamic'; base-uri 'none'; frame-ancestors 'none'";

  test('accepts a strict policy', () => {
    expect(cspWeaknesses(strict)).toEqual([]);
  });

  test('parses directives case-insensitively and keeps the first duplicate', () => {
    const policy = parseCsp("Script-Src 'self'; script-src *");
    expect(policy.get('script-src')).toEqual(["'self'"]);
  });

  test("flags 'unsafe-inline' unless a nonce or hash neutralises it", () => {
    const base = "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; script-src";
    expect(cspWeaknesses(`${base} 'unsafe-inline'`)).toEqual([
      "script sources allow 'unsafe-inline' without a nonce or hash",
    ]);
    expect(cspWeaknesses(`${base} 'unsafe-inline' 'nonce-abc'`)).toEqual([]);
  });

  test('flags wildcard, eval and data: script sources', () => {
    const problems = cspWeaknesses(
      "default-src 'none'; script-src * 'unsafe-eval' data:; base-uri 'none'; frame-ancestors 'none'",
    );
    expect(problems).toEqual([
      "script sources allow 'unsafe-eval'",
      'script sources allow *',
      'script sources allow data:',
    ]);
  });

  test('falls back to default-src when script-src is absent', () => {
    expect(cspWeaknesses("default-src *; base-uri 'none'; frame-ancestors 'none'")).toContain(
      'script sources allow *',
    );
  });

  test('flags missing script control, object-src, base-uri and frame-ancestors', () => {
    expect(cspWeaknesses("img-src 'self'")).toEqual([
      'neither script-src nor default-src is set',
      'object-src is not restricted',
      'base-uri is not set',
      'frame-ancestors is not set',
    ]);
  });
});
