import type { APIRequestContext, APIResponse } from '@playwright/test';

export type Resource = 'people' | 'planets' | 'films';

export interface ApiResult {
  readonly response: APIResponse;
  readonly status: number;
  /** Parsed JSON body, `undefined` when the body is not valid JSON. */
  readonly body: unknown;
  readonly durationMs: number;
}

export interface PageParams {
  readonly page?: number | string;
  readonly limit?: number | string;
}

/** Thin typed wrapper over Playwright's APIRequestContext for swapi.tech. No assertions here. */
export class SwapiClient {
  constructor(private readonly request: APIRequestContext) {}

  list(resource: Resource, params: PageParams = {}): Promise<ApiResult> {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    const qs = query.size > 0 ? `?${query.toString()}` : '';
    return this.get(`${resource}${qs}`);
  }

  getById(resource: Resource, id: number | string): Promise<ApiResult> {
    return this.get(`${resource}/${encodeURIComponent(String(id))}`);
  }

  /** Follows an absolute URL returned by the API (e.g. `next`), keeping timing/parsing identical. */
  getUrl(url: string): Promise<ApiResult> {
    return this.get(url);
  }

  private async get(pathOrUrl: string): Promise<ApiResult> {
    let attempt = await this.timedGet(pathOrUrl);
    if (attempt.response.status() === 429) {
      const waitSeconds = Number(attempt.response.headers()['retry-after']);
      // Retry once, and only for short waits. A long retry-after (minutes) means the quota is
      // exhausted: fail loudly instead of stalling the run or reporting a false API regression.
      if (!Number.isFinite(waitSeconds) || waitSeconds > MAX_RETRY_AFTER_SECONDS) {
        throw new Error(rateLimitMessage(attempt.response));
      }
      await sleep(waitSeconds * 1000);
      attempt = await this.timedGet(pathOrUrl);
      if (attempt.response.status() === 429) throw new Error(rateLimitMessage(attempt.response));
    }
    const { response, durationMs } = attempt;
    const body: unknown = await response.json().catch(() => undefined);
    return { response, status: response.status(), body, durationMs };
  }

  private async timedGet(pathOrUrl: string): Promise<TimedResponse> {
    await throttle();
    const startedAt = performance.now();
    const response = await this.request.get(pathOrUrl);
    return { response, durationMs: Math.round(performance.now() - startedAt) };
  }
}

interface TimedResponse {
  readonly response: APIResponse;
  readonly durationMs: number;
}

/** swapi.tech allows ~100 requests per window per IP; keep a steady, gentle pace. */
const MIN_GAP_MS = 300;
const MAX_RETRY_AFTER_SECONDS = 30;

// Module state is per Playwright worker process, so the gap holds across tests in that worker.
let lastRequestAt = 0;

async function throttle(): Promise<void> {
  const wait = lastRequestAt + MIN_GAP_MS - Date.now();
  // Reserve the slot before awaiting so concurrent callers in one worker queue up, not collide.
  lastRequestAt = Date.now() + Math.max(wait, 0);
  if (wait > 0) await sleep(wait);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rateLimitMessage(response: APIResponse): string {
  const retryAfter = response.headers()['retry-after'] ?? 'unknown';
  return `swapi.tech rate limit hit (429), retry-after=${retryAfter}s: ${response.url()}`;
}
