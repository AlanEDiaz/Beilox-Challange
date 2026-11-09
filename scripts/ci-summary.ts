/**
 * Prints a Markdown run summary from Playwright JSON reports.
 * Usage: node scripts/ci-summary.ts <dir with results-<suite>/**\/results.json>
 * Runs on Node >= 24 (native type stripping): no build step.
 */
import { readSuiteReports } from './lib/report.ts';

const root = process.argv[2];
if (root === undefined) {
  console.error('Usage: node scripts/ci-summary.ts <results dir>');
  process.exit(1);
}

const suites = readSuiteReports(root);
const lines: string[] = ['## Test run summary', ''];

if (suites.length === 0) {
  lines.push('No Playwright JSON reports were found (a job may have failed before running tests).');
} else {
  lines.push(
    '| Suite | Passed | Failed | Flaky | Skipped | Duration |',
    '|---|---|---|---|---|---|',
  );
  const details: string[] = [];
  for (const suite of suites) {
    lines.push(
      `| ${suite.name} | ${suite.passed} | ${suite.failed} | ${suite.flaky} | ${suite.skipped} | ${(suite.durationMs / 1000).toFixed(1)}s |`,
    );
    for (const status of ['unexpected', 'flaky'] as const) {
      const titles = suite.titlesWith(status);
      if (titles.length === 0) continue;
      const label = status === 'unexpected' ? 'Failed' : 'Flaky (passed on retry)';
      details.push(`**${suite.name} — ${label}**`, '', ...titles.map((title) => `- ${title}`), '');
    }
  }
  if (details.length > 0) lines.push('', ...details);
}

console.log(lines.join('\n'));
