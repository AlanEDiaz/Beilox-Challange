import { test as base } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';
import type { Headers } from './rules';
import { TARGETS } from './targets';
import type { TargetName } from './targets';

export interface Posture {
  readonly status: number;
  readonly headers: Headers;
  readonly cookies: Awaited<ReturnType<BrowserContext['cookies']>>;
  /** Answer to a plain-HTTP request, not followed. */
  readonly httpRedirect: { readonly status: number; readonly location: string | undefined };
}

/**
 * Passive observation only: one page load and one plain-HTTP request per target, exactly what any
 * visitor's browser sends. Collected once per worker and shared by every check.
 */
export const test = base.extend<object, { postures: Readonly<Record<TargetName, Posture>> }>({
  postures: [
    async ({ browser }, use) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      const entries: Array<[TargetName, Posture]> = [];
      for (const target of TARGETS) {
        const response = await page.goto(target.url, { waitUntil: 'domcontentloaded' });
        if (response === null) throw new Error(`No response from ${target.url}`);
        const http = await context.request.get(target.url.replace(/^https:/, 'http:'), {
          maxRedirects: 0,
        });
        entries.push([
          target.name,
          {
            status: response.status(),
            headers: await response.allHeaders(),
            cookies: await context.cookies(target.url),
            httpRedirect: { status: http.status(), location: http.headers()['location'] },
          },
        ]);
      }
      await context.close();
      await use(Object.fromEntries(entries) as Record<TargetName, Posture>);
    },
    { scope: 'worker', timeout: 60_000 },
  ],
});

export { expect } from '@playwright/test';
