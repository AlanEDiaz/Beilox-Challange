import { expect, test } from './support/security.fixture';
import { TARGETS } from './support/targets';

const web = TARGETS.filter((t) => t.kind === 'web');

for (const target of web) {
  test.describe(`${target.name} page content`, { tag: ['@security', '@sec-content'] }, () => {
    test('loads every subresource over HTTPS and inventories scripts for a future CSP', async ({
      page,
    }) => {
      const firstPartyHost = new URL(target.url).hostname.replace(/^www\./, '');
      const insecure: string[] = [];
      const thirdPartyScriptHosts = new Set<string>();

      page.on('request', (request) => {
        const url = new URL(request.url());
        if (url.protocol === 'http:') insecure.push(request.url());
        if (request.resourceType() === 'script' && !url.hostname.endsWith(firstPartyHost)) {
          thirdPartyScriptHosts.add(url.hostname);
        }
      });
      await page.goto(target.url, { waitUntil: 'load' });
      const inlineScripts = await page.locator('script:not([src])').count();

      // A real CSP needs to allow exactly these origins; this is the starting point for one.
      await test.info().attach('csp-readiness.json', {
        body: JSON.stringify({ inlineScripts, thirdPartyScriptHosts: [...thirdPartyScriptHosts] }),
        contentType: 'application/json',
      });
      expect(insecure, 'mixed content (HTTP subresources on an HTTPS page)').toEqual([]);
    });
  });
}
