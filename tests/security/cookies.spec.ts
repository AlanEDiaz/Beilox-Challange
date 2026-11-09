import { expect, test } from './support/security.fixture';
import { TARGETS } from './support/targets';

const SESSION_COOKIE = /sess|auth|token/i;

for (const target of TARGETS.filter((t) => t.expectsSessionCookie)) {
  test.describe(`${target.name} session cookie`, { tag: ['@security', '@sec-cookies'] }, () => {
    test('is Secure and HttpOnly', async ({ postures }) => {
      const session = postures[target.name].cookies.filter((c) => SESSION_COOKIE.test(c.name));
      expect(session, 'a session cookie is set on first visit').not.toHaveLength(0);
      for (const cookie of session) {
        expect(cookie.secure, `${cookie.name} Secure`).toBe(true);
        expect(cookie.httpOnly, `${cookie.name} HttpOnly`).toBe(true);
      }
    });

    test('is not sent cross-site (SameSite Lax or Strict)', async ({ postures }) => {
      test.fail(target.knownGaps.includes('cookie-samesite'), `Known gap in ${target.name}`);
      const session = postures[target.name].cookies.filter((c) => SESSION_COOKIE.test(c.name));
      expect(session, 'a session cookie is set on first visit').not.toHaveLength(0);
      for (const cookie of session) {
        expect(['Lax', 'Strict'], `${cookie.name} SameSite=${cookie.sameSite}`).toContain(
          cookie.sameSite,
        );
      }
    });
  });
}
