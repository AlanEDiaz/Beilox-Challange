/**
 * Pushes one metrics sample per suite to Grafana Cloud (Influx line protocol endpoint).
 * Usage: node scripts/push-metrics.ts <results dir> [--coverage <summary.json>] [--dry-run]
 * (dry run prints the samples instead of sending them)
 *
 * Env: GRAFANA_INFLUX_URL, GRAFANA_INFLUX_USER, GRAFANA_INFLUX_TOKEN (GitHub secrets).
 * Without them the script exits 0 and says so, so forks and local runs never fail on it.
 * Grafana turns measurement `playwright_run` + field `passed` into metric `playwright_run_passed`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { percentile, readSuiteReports, securityByTarget } from './lib/report.ts';

const root = process.argv[2];
if (root === undefined) {
  console.error('Usage: node scripts/push-metrics.ts <results dir>');
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');
const url = process.env['GRAFANA_INFLUX_URL'];
const user = process.env['GRAFANA_INFLUX_USER'];
const token = process.env['GRAFANA_INFLUX_TOKEN'];
if (!dryRun && (!url || !user || !token)) {
  console.log('Grafana secrets not set: skipping metrics push.');
  process.exit(0);
}

/** Tag values must not contain spaces, commas or equals signs in line protocol. */
const tag = (value: string | undefined): string =>
  (value && value.length > 0 ? value : 'unknown').replace(/[\s,=]/g, '_');

const event = tag(process.env['GITHUB_EVENT_NAME']);
const ref = tag(process.env['GITHUB_REF_NAME']);
const suites = readSuiteReports(root);

const lines = suites.map((suite) => {
  const total = suite.passed + suite.failed + suite.flaky;
  const passRate = total === 0 ? 0 : ((suite.passed + suite.flaky) / total) * 100;
  const fields = {
    passed: suite.passed,
    failed: suite.failed,
    flaky: suite.flaky,
    skipped: suite.skipped,
    total,
    pass_rate: Number(passRate.toFixed(2)),
    duration_ms: Math.round(suite.durationMs),
    test_p50_ms: percentile(suite.testDurationsMs, 50),
    test_p95_ms: percentile(suite.testDurationsMs, 95),
  };
  const body = Object.entries(fields)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
  return `playwright_run,suite=${tag(suite.name)},event=${event},ref=${ref} ${body}`;
});

// Open security gaps per target: tests marked test.fail() that still fail as expected. The suite
// reports 100% pass rate by design, so this is the number that shows the real security posture.
for (const suite of suites) {
  for (const [target, { checks, openGaps }] of securityByTarget(suite)) {
    lines.push(
      `playwright_security,target=${tag(target)},event=${event},ref=${ref} open_gaps=${openGaps.length},checks=${checks}`,
    );
  }
}

// Optional coverage sample (written by scripts/coverage-report.ts --out).
const coverageIndex = process.argv.indexOf('--coverage');
const coveragePath = coverageIndex === -1 ? undefined : process.argv[coverageIndex + 1];
if (coveragePath !== undefined && existsSync(coveragePath)) {
  const coverage = JSON.parse(readFileSync(coveragePath, 'utf8')) as Record<string, number>;
  const body = Object.entries(coverage)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
  lines.push(`playwright_coverage,event=${event},ref=${ref} ${body}`);
}

if (lines.length === 0) {
  console.log('No reports found: nothing to push.');
  process.exit(0);
}

if (dryRun || !url || !user || !token) {
  console.log(lines.join('\n'));
  process.exit(0);
}

const response = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Basic ${Buffer.from(`${user}:${token}`).toString('base64')}`,
    'Content-Type': 'text/plain',
  },
  body: `${lines.join('\n')}\n`,
}).catch((error: unknown) => {
  console.error(`Grafana push failed: ${error instanceof Error ? error.message : String(error)}`);
  return process.exit(1);
});

if (!response.ok) {
  console.error(`Grafana push failed: HTTP ${response.status} ${await response.text()}`);
  process.exit(1);
}
console.log(`Pushed ${lines.length} sample(s) to Grafana Cloud (HTTP ${response.status}).`);
