import { expect, test } from './support/security.fixture';
import { RULES } from './support/rules';
import { TARGETS } from './support/targets';

// Passive checks of what each target already sends to every visitor. See README, "Seguridad".
for (const target of TARGETS) {
  test.describe(`${target.name} security headers`, { tag: ['@security', '@sec-headers'] }, () => {
    for (const rule of RULES.filter((r) => r.appliesTo === 'all' || target.kind === 'web')) {
      test(`${rule.title}`, async ({ postures }) => {
        test.fail(target.knownGaps.includes(rule.id), `Known gap in ${target.name}: ${rule.id}`);
        expect(rule.problem(postures[target.name].headers), rule.title).toBeUndefined();
      });
    }

    test('redirects plain HTTP to HTTPS', async ({ postures }) => {
      test.fail(target.knownGaps.includes('http-redirect'), `Known gap in ${target.name}`);
      const { status, location } = postures[target.name].httpRedirect;
      expect([301, 302, 307, 308], `HTTP answered ${status}`).toContain(status);
      expect(location, 'redirect target').toMatch(/^https:\/\//);
    });

    test('does not combine wildcard CORS with credentials', async ({ postures }) => {
      const { headers } = postures[target.name];
      const wildcard = headers['access-control-allow-origin'] === '*';
      const credentials = headers['access-control-allow-credentials']?.toLowerCase() === 'true';
      expect(wildcard && credentials, 'Access-Control-Allow-Origin: * with credentials').toBe(
        false,
      );
    });
  });
}
