/**
 * Prints a Markdown run summary from Playwright JSON reports.
 * Usage: node scripts/ci-summary.ts <dir containing results-*\/test-results/results.json>
 * Runs on Node >= 24 (native type stripping), so it uses no imports that need a build step.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

interface PwTest {
  readonly status: 'expected' | 'unexpected' | 'flaky' | 'skipped';
}
interface PwSpec {
  readonly title: string;
  readonly file: string;
  readonly tests: readonly PwTest[];
}
interface PwSuite {
  readonly specs?: readonly PwSpec[];
  readonly suites?: readonly PwSuite[];
}
interface PwReport {
  readonly stats: {
    readonly expected: number;
    readonly unexpected: number;
    readonly flaky: number;
    readonly skipped: number;
    readonly duration: number;
  };
  readonly suites: readonly PwSuite[];
}

function findReports(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return findReports(path);
    return entry === 'results.json' ? [path] : [];
  });
}

function collect(suites: readonly PwSuite[], status: PwTest['status']): string[] {
  return suites.flatMap((suite) => [
    ...(suite.specs ?? [])
      .filter((spec) => spec.tests.some((test) => test.status === status))
      .map((spec) => `${spec.file} › ${spec.title}`),
    ...collect(suite.suites ?? [], status),
  ]);
}

/** Artifact folders are named results-<suite>; the suite is the first path segment below root. */
function suiteName(root: string, reportPath: string): string {
  return (
    reportPath
      .slice(root.length + 1)
      .split(/[\\/]/)[0]
      ?.replace(/^results-/, '') ?? 'unknown'
  );
}

const root = process.argv[2];
if (root === undefined) {
  console.error('Usage: node scripts/ci-summary.ts <results dir>');
  process.exit(1);
}

const reports = findReports(root).sort();
const lines: string[] = ['## Test run summary', ''];

if (reports.length === 0) {
  lines.push('No Playwright JSON reports were found (a job may have failed before running tests).');
} else {
  lines.push(
    '| Suite | Passed | Failed | Flaky | Skipped | Duration |',
    '|---|---|---|---|---|---|',
  );
  const details: string[] = [];
  for (const path of reports) {
    const report = JSON.parse(readFileSync(path, 'utf8')) as PwReport;
    const { expected, unexpected, flaky, skipped, duration } = report.stats;
    const name = suiteName(root, path);
    lines.push(
      `| ${name} | ${expected} | ${unexpected} | ${flaky} | ${skipped} | ${(duration / 1000).toFixed(1)}s |`,
    );
    for (const status of ['unexpected', 'flaky'] as const) {
      const titles = collect(report.suites, status);
      if (titles.length === 0) continue;
      const label = status === 'unexpected' ? 'Failed' : 'Flaky (passed on retry)';
      details.push(`**${name} — ${label}**`, '', ...titles.map((title) => `- ${title}`), '');
    }
  }
  if (details.length > 0) lines.push('', ...details);
}

console.log(lines.join('\n'));
