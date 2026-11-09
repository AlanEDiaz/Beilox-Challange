# Beilox QA Automation Challenge — Test Plan & Delivery Plan

Status: PLAN (nothing implemented yet). Source: `Beilox-QA-Automation-Challenge.pdf`.

## 1. Scope

| Area   | Target                                                                | Tooling                                                       |
| ------ | --------------------------------------------------------------------- | ------------------------------------------------------------- |
| UI     | centraldepasajes.com.ar search flow                                   | Playwright + TypeScript (strict), POM, `test.extend` fixtures |
| API    | swapi.tech `/people`, `/planets`, `/films`                            | Playwright `request`, AJV schemas                             |
| CI/CD  | GitHub Actions, Mondays 15:00 ART (= 18:00 UTC, cron `0 18 * * 1`)    | Actions + Pages + Grafana                                     |
| AI/MCP | README section, 2+ MCPs used, 1 "did not use AI" case, 1 proposed MCP | Playwright MCP, Filesystem/Git MCP                            |

Out of scope (state honestly in README): checkout/payment, login, cross-browser beyond Chromium (Firefox/WebKit as optional project), load testing, visual regression.

## 2. Risk-based test design

Third-party prod site and public API: no control over data → tests must be data-resilient (future dates computed at runtime, assertions on structure/consistency, not on specific prices/schedules).

### 2.1 UI (centraldepasajes.com.ar) — to confirm selectors via Playwright MCP before writing

| ID    | Scenario                                    | Type       | Priority | Key assertions                                                                                |
| ----- | ------------------------------------------- | ---------- | -------- | --------------------------------------------------------------------------------------------- |
| UI-01 | Valid search origin/destination/future date | Happy      | P0       | URL/results page loads; results list visible; each result origin/destination/date match input |
| UI-02 | Route with no service                       | Negative   | P1       | Empty-state message visible; no result cards                                                  |
| UI-03 | Same origin and destination                 | Invalid    | P1       | Validation message / search blocked                                                           |
| UI-04 | Empty required fields                       | Invalid    | P1       | Validation shown, no navigation                                                               |
| UI-05 | Past date                                   | Invalid    | P1       | Date rejected / not selectable                                                                |
| UI-06 | Back from results page                      | Navigation | P1       | Search form restored with previous params (or documented behaviour)                           |
| UI-07 | Swap origin/destination (if exists)         | Functional | P2       | Values exchanged                                                                              |

Tag with `@smoke` (UI-01, UI-02) and `@regression` (rest). Real behaviour of UI-03/05/06 must be observed first; assertions encode observed behaviour, discrepancies logged as notes.

### 2.1b UI re-plan after exploring with Playwright MCP (2026-11-09)

Status of the original 7 scenarios: UI-01 valid, UI-02 no results (same terminal), UI-03/04 empty + missing date, UI-05 past dates, UI-06 back = DONE (7 tests x 3 browsers green). Corrections vs. first plan: same origin/destination is NOT blocked by validation, the site returns the "¡Ups!" empty state (so UI-02 and UI-03 merged); required-field messages are parsley texts.

Verified by MCP, not yet automated (next batch, all stable and deterministic):

| ID | Scenario | Observed behaviour (assertion) | Prio |
|---|---|---|---|
| UI-07 | Swap origin/destination (`#btnChangePads`) | values exchange | P2 |
| UI-08 | Round trip (`#rbIdaVuelta`) | return picker opens, days before departure are `.invalid`; URL gets `FVuelta=MM/DD/YYYY` | P0 |
| UI-09 | Passengers = 3 | URL `CntPas=3`; header/cards consistent | P1 |
| UI-10 | Date tab navigation on results | click a visible day tab: URL `FIda` changes, active tab matches, cards reload | P1 |
| UI-11 | Sort (slim-select over hidden `#SelOrder`: más temprano / más tarde / menor precio / mayor precio) | order verifiable via card `data-servicio-sale` / `data-servicio-valor` | P1 |
| UI-12 | "Ver detalles" modal (`#modal-informacion`) | shows duration, date, origin/destination terminals; closes with the close button (Escape does NOT close it) | P2 |
| UI-13 | Swapped direction returns services (MDP to Retiro) | route-reversal coherence | P2 |
| UI-14 | Cross-engine smoke (`@smoke` on chromium, firefox, webkit) | already running | done |

Site facts for the README (limitations / trade-offs):
- Below the desktop breakpoint "Ver detalles" sits in a collapsed accordion, so UI projects stay on Desktop viewports. A mobile-viewport project is a possible extension, not planned now.
- Date picker is a library with `.day.valid/.invalid`; the return picker is a second DOM tree (`#cdp-calendar-container-regreso`).
- Sorting by price lists lowest first; durable hooks exist (`data-servicio-*`), so no brittle text parsing.
- Prices and schedules change daily: assertions check structure and ordering, never exact values.
- Console shows 3-7 third-party errors on load: not asserted (noise), would need an allow-list if a console-error check is added.
- Out of scope: seat selection, checkout, payment (would create real bookings on a production site).

Data-driven candidates once the batch above is in: parametrize UI-01 over 3 routes (Retiro-MDP, Retiro-Rosario, Retiro-Cordoba) using the same `Route` type, `@regression` only.

### 2.2 API (swapi.tech)

Per endpoint (`people`, `planets`, `films`): 3+ tests.

| ID     | Case                                      | Assertions                                                                         |
| ------ | ----------------------------------------- | ---------------------------------------------------------------------------------- |
| API-x1 | `GET /{res}` list                         | 200, AJV list schema, `results`/`result` non-empty, time < threshold               |
| API-x2 | `GET /{res}/{validId}` happy              | 200, AJV item schema, body saved to `data/happy-path/{res}.json`, time < threshold |
| API-x3 | `GET /{res}/{nonexistentId}` (e.g. 99999) | 404, error body shape                                                              |
| API-x4 | Invalid id (`abc`, `-1`)                  | 400/404 — observe real status first, assert real contract, document deviation      |
| API-x5 | Pagination (`?page=2&limit=5`)            | `next`/`previous` consistent, count matches                                        |

Note: swapi.tech is known to be inconsistent (rate limits, envelope differences). Plan: probe first, write schemas against observed responses, `retries: 2` in CI only, response-time budget generous (e.g. 3000 ms) and configurable via env.

## 3. Coverage strategy ("solid percentage")

E2E tests against a third-party site have no source to instrument, so "coverage" is reported on four honest axes:

1. **Requirement coverage** — traceability matrix `requirement → test IDs`, target 100% of PDF requirements (generated by script from test annotations/tags; fails CI if a requirement has no test).
2. **API contract coverage** — endpoints × (happy / 404 / 400 / schema / perf) matrix, target 100% of the 3 endpoints × 5 checks, computed from a custom reporter.
3. **Framework code coverage** — instrument own TypeScript (`pages/`, `helpers/`, `fixtures/`, `schemas/`) with `monocart-reporter` + V8 coverage (or c8 on a small Vitest unit layer for pure helpers). Target ≥ 80% lines on helpers.
4. **Quality gates** — pass rate ≥ 95%, flaky rate < 2% over last 4 runs, p95 API latency, strict `tsc --noEmit` and ESLint zero errors.

Each axis published as a badge/number in README and in the dashboard.

## 4. Project structure

```
.
├── .github/workflows/{ci.yml,pr.yml}
├── src/
│   ├── ui/{pages,components,fixtures,data}
│   ├── api/{clients,schemas,fixtures,helpers}
│   └── shared/{config,utils,reporters}
├── tests/{ui,api}
├── data/happy-path/*.json        # committed artifacts, regenerated per run
├── scripts/{coverage-matrix.ts,push-metrics.ts}
├── dashboards/grafana-qa.json    # provisioned dashboard
├── docs/{AI_USAGE.md,THEORY.md,ARCHITECTURE.md}
├── playwright.config.ts          # projects: ui-chromium, api
├── .env.example  tsconfig.json (strict, noUncheckedIndexedAccess)  eslint  prettier
```

Design rules: POM with three layers (locators / actions / assertions kept in separate members or files); fixtures via `test.extend` inject pages and API clients; no `waitForTimeout`; web-first assertions; env config via `dotenv` with zod-validated `config.ts`; no `any` (ESLint `no-explicit-any: error`); tests independent and parallel-safe; husky + lint-staged pre-commit.

## 5. CI/CD design

`ci.yml` triggers: `schedule: '0 18 * * 1'` (15:00 ART), `workflow_dispatch`, `pull_request`.

Jobs:

1. `quality` — install (cached), `tsc --noEmit`, ESLint, Prettier check.
2. `api` and `ui` — parallel jobs, `npx playwright install --with-deps chromium`, run suite, upload traces/screenshots on failure, upload `data/happy-path/*.json` artifact.
3. `report` — merge blob reports, publish HTML report + coverage + trend history to **GitHub Pages**, comment summary in `$GITHUB_STEP_SUMMARY`, update badges.
4. `metrics` — push run metrics to Grafana (see §6).
5. `notify` — on failure, Slack/Issue (only on 2nd consecutive failure to avoid transient-noise alerts).

Retries: `retries: 2` in CI; flaky = passed-on-retry, tracked separately instead of hidden. Secrets only via `${{ secrets.* }}`, `.env` git-ignored, `.env.example` committed. `timeout-minutes` on all jobs, `concurrency` group to cancel duplicates.

README "scale-up" section (not implemented): `--shard=i/n` matrix, project matrix (ui/api/browsers), blob reports merged, test-impact selection by tag on PRs, nightly full regression vs. PR smoke, dependency/browser cache, self-hosted or larger runners, environment-scoped secrets with required reviewers.

## 6. Dashboard ("Grafana") — options

| Option                                                                               | Effort | Cost      | Impressiveness | Notes                                                                             |
| ------------------------------------------------------------------------------------ | ------ | --------- | -------------- | --------------------------------------------------------------------------------- |
| A. Grafana Cloud free + Prometheus remote-write / InfluxDB from the Action           | Medium | Free tier | High           | Real Grafana, live dashboard, public snapshot/link; needs 2 repo secrets          |
| B. Local Grafana + InfluxDB via `docker-compose` in repo, dashboard JSON provisioned | Medium | Free      | Medium-High    | Reviewer can `docker compose up`; no live data between runs unless data committed |
| C. GitHub Pages static dashboard (Chart.js) from `history.json`                      | Low    | Free      | Medium         | Zero external deps, always works                                                  |

**Recommendation: A + C.** Pages dashboard is guaranteed-working fallback (reviewer clicks link, no accounts); Grafana Cloud shows real observability skills. Include B's `docker-compose` + `dashboards/grafana-qa.json` so the dashboard is reproducible as code.

Metrics pushed per run: total/passed/failed/flaky/skipped, duration, pass rate, p50/p95 API latency per endpoint, coverage axes from §3, run URL, commit SHA.

## 7. README outline (mandatory content from PDF)

1. Badges (CI status, coverage axes, dashboard link) + 30-second summary.
2. Quick start; run UI suite; run API suite; run by tag; view report.
3. Architecture & technical decisions (+ diagram), trade-offs and limitations (honest).
4. Test plan summary + coverage matrix (link to this file).
5. CI/CD: how it runs, Monday schedule and timezone conversion, scaling proposal (§5).
6. **AI + MCP usage**: ≥2 MCPs used concretely (Playwright MCP for locator discovery; Filesystem/Git MCP for refactor; optionally Atlassian MCP for a mock bug), 1 case where AI was deliberately not used, 1 proposed unused MCP with concrete use case. **Must be written from what was truly done** — do not fabricate.
7. Answers to the 6 theoretical questions (short, own voice).
8. Definition of Done checklist (below).

## 8. Definition of Done

- [ ] All UI scenarios (valid, no results, invalid, back-navigation) pass locally and in CI
- [ ] 3 endpoints × ≥3 tests, status + body + time + AJV schema in each
- [ ] Happy-path JSON files generated and committed/uploaded
- [ ] Fixtures via `test.extend`, zero `waitForTimeout`, zero unjustified `any`
- [ ] `tsc --noEmit` + ESLint clean
- [ ] Scheduled workflow green via manual `workflow_dispatch`; cron verified as `0 18 * * 1`
- [ ] Coverage axes computed and ≥ targets; dashboard live
- [ ] README complete incl. AI/MCP section and 6 answers
- [ ] Public GitHub repo, no secrets in history

## 9. Execution order (≈ 2–3 days)

1. Day 1 AM: scaffold, config, strict TS, lint, CI skeleton. PM: API suite + schemas + happy-path JSON.
2. Day 2 AM: explore UI with Playwright MCP, POM + fixtures. PM: UI scenarios, stabilise.
3. Day 3 AM: coverage scripts, reporters, Pages + Grafana. PM: README, theory answers, AI section, final CI run.

## 10. Decisions

Resolved:

1. README language: **Spanish**. (Code, identifiers and test names stay in English.)
2. Grafana: **Option A+C**. User creates Grafana Cloud free account and provides secrets (`GRAFANA_*`) as GitHub repo secrets; never committed.
3. Browsers: **Chromium + Firefox + WebKit**. Playwright projects `ui-chromium`, `ui-firefox`, `ui-webkit`, plus `api` (no browser).
   - Scheduled Monday run and `workflow_dispatch`: full matrix (3 browsers x ui, + api), one job per browser, `fail-fast: false`.
   - PR runs: chromium + api only (fast feedback). Firefox/WebKit via manual dispatch.
   - Risk: WebKit on Linux CI differs from real Safari and can be slower/flakier; site may behave differently per engine. Mitigation: per-browser pass rate in dashboard, flaky tracked per project, `@smoke` tag runs on all engines, full regression only on chromium.
   - Metrics get a `browser` label so Grafana can compare engines.
