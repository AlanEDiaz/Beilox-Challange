/**
 * Coverage report built from what the suite really executed.
 * Usage: node scripts/coverage-report.ts <results dir> [--c8 <coverage-summary.json>]
 *        [--out <summary.json>] [--enforce]
 *
 * E2E tests against a third-party site have no source to instrument, so "coverage" is reported on
 * three axes:
 *   1. UI requirements x browsers      (traceability matrix from the challenge brief)
 *   2. API contract checks x endpoints (what each endpoint is verified for)
 *   3. Framework code lines            (c8/V8 coverage of src/, optional input)
 * A cell is covered only by a test that PASSED in that project. --enforce exits 1 below 100% on
 * axes 1 and 2, so a missing or failing test cannot hide behind a green badge.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { readSuiteReports } from './lib/report.ts';
import type { SpecRecord } from './lib/report.ts';

interface Requirement {
  readonly tag: string;
  readonly text: string;
}

/** Requirements from the challenge brief, block 1 (UI). Tags match tests/support/tags.ts. */
const UI_REQUIREMENTS: readonly Requirement[] = [
  { tag: 'req-valid-search', text: 'Valid search can be performed' },
  { tag: 'req-coherent-results', text: 'Results are coherent with the entered parameters' },
  { tag: 'req-no-results', text: 'Search without results' },
  { tag: 'req-invalid-data', text: 'Search with invalid data' },
  { tag: 'req-back-navigation', text: 'Back from the results page' },
];
const UI_PROJECTS = ['ui-chromium', 'ui-firefox', 'ui-webkit'] as const;

/** Contract checks from the brief, block 2 (API), applied to every endpoint. */
const API_CHECKS: readonly Requirement[] = [
  { tag: 'chk-list', text: 'list' },
  { tag: 'chk-happy', text: 'happy path' },
  { tag: 'chk-not-found', text: '404' },
  { tag: 'chk-invalid-id', text: 'invalid id' },
  { tag: 'chk-schema', text: 'AJV schema' },
  { tag: 'chk-time', text: 'response time' },
  { tag: 'chk-json', text: 'happy-path JSON' },
  { tag: 'chk-pagination', text: 'pagination' },
];
const API_ENDPOINTS = ['people', 'planets', 'films'] as const;
/** swapi.tech /films has no pagination, so that cell does not exist (not counted as a gap). */
const NOT_APPLICABLE = new Set(['films|chk-pagination']);

function covered(
  specs: readonly SpecRecord[],
  tag: string,
  project: string,
  endpoint?: string,
): boolean {
  return specs.some(
    (spec) =>
      spec.passed &&
      spec.project === project &&
      spec.tags.includes(tag) &&
      (endpoint === undefined || spec.describes.includes(`/${endpoint}`)),
  );
}

const pct = (done: number, total: number): number =>
  total === 0 ? 0 : Number(((done / total) * 100).toFixed(1));
const mark = (ok: boolean): string => (ok ? '✅' : '❌');

const args = process.argv.slice(2);
const root = args[0];
const option = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
if (root === undefined || root.startsWith('--')) {
  console.error('Usage: node scripts/coverage-report.ts <results dir> [--c8 file] [--out file]');
  process.exit(1);
}

const all = readSuiteReports(root).flatMap((suite) => suite.specs);
const lines: string[] = ['## Coverage report', ''];

// 1. UI requirements x browsers
let uiDone = 0;
const uiTotal = UI_REQUIREMENTS.length * UI_PROJECTS.length;
lines.push(
  '### UI requirements × browser',
  '',
  `| Requirement | ${UI_PROJECTS.join(' | ')} |`,
  `|---|${UI_PROJECTS.map(() => ':-:').join('|')}|`,
);
for (const req of UI_REQUIREMENTS) {
  const cells = UI_PROJECTS.map((project) => {
    const ok = covered(all, req.tag, project);
    if (ok) uiDone += 1;
    return mark(ok);
  });
  lines.push(`| ${req.text} | ${cells.join(' | ')} |`);
}
const uiPct = pct(uiDone, uiTotal);
lines.push('', `**UI requirement coverage: ${uiPct}%** (${uiDone}/${uiTotal})`, '');

// 2. API contract checks x endpoints
let apiDone = 0;
let apiTotal = 0;
lines.push(
  '### API contract × endpoint',
  '',
  `| Check | ${API_ENDPOINTS.map((endpoint) => `/${endpoint}`).join(' | ')} |`,
  `|---|${API_ENDPOINTS.map(() => ':-:').join('|')}|`,
);
for (const check of API_CHECKS) {
  const cells = API_ENDPOINTS.map((endpoint) => {
    if (NOT_APPLICABLE.has(`${endpoint}|${check.tag}`)) return 'n/a';
    apiTotal += 1;
    const ok = covered(all, check.tag, 'api', endpoint);
    if (ok) apiDone += 1;
    return mark(ok);
  });
  lines.push(`| ${check.text} | ${cells.join(' | ')} |`);
}
const apiPct = pct(apiDone, apiTotal);
lines.push('', `**API contract coverage: ${apiPct}%** (${apiDone}/${apiTotal})`, '');

// 3. Framework code coverage (optional input from c8)
interface C8Summary {
  readonly total: Record<
    'lines' | 'statements' | 'functions' | 'branches',
    { readonly pct: number }
  >;
}
const c8Path = option('--c8');
let frameworkPct: number | undefined;
if (c8Path !== undefined && existsSync(c8Path)) {
  const { total } = JSON.parse(readFileSync(c8Path, 'utf8')) as C8Summary;
  frameworkPct = total.lines.pct;
  lines.push(
    '### Framework code coverage (src/, V8 via c8)',
    '',
    '| Lines | Statements | Functions | Branches |',
    '|:-:|:-:|:-:|:-:|',
    `| ${total.lines.pct}% | ${total.statements.pct}% | ${total.functions.pct}% | ${total.branches.pct}% |`,
    '',
    'Uncovered paths are real gaps, e.g. the 429 retry only runs when the API throttles.',
    '',
  );
}

const out = option('--out');
if (out !== undefined) {
  const summary = {
    requirements_pct: uiPct,
    api_contract_pct: apiPct,
    ...(frameworkPct === undefined ? {} : { framework_lines_pct: frameworkPct }),
  };
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
}

console.log(lines.join('\n'));

if (args.includes('--enforce') && (uiPct < 100 || apiPct < 100)) {
  console.error(`Coverage gate failed: UI ${uiPct}%, API ${apiPct}% (both must be 100%).`);
  process.exit(1);
}
