/** Shared reader for Playwright JSON reports (used by ci-summary.ts and push-metrics.ts). */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export type TestStatus = 'expected' | 'unexpected' | 'flaky' | 'skipped';

interface PwResult {
  readonly duration: number;
}
interface PwTest {
  readonly status: TestStatus;
  readonly results: readonly PwResult[];
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

export interface SuiteReport {
  /** Artifact folder name without the "results-" prefix, e.g. "api" or "ui-chromium". */
  readonly name: string;
  readonly passed: number;
  readonly failed: number;
  readonly flaky: number;
  readonly skipped: number;
  readonly durationMs: number;
  /** "file › title" of every spec whose tests ended with the given status. */
  readonly titlesWith: (status: TestStatus) => string[];
  /** Duration of every test's final attempt, in ms. */
  readonly testDurationsMs: number[];
}

function findReports(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return findReports(path);
    return entry === 'results.json' ? [path] : [];
  });
}

function specs(suites: readonly PwSuite[]): PwSpec[] {
  return suites.flatMap((suite) => [...(suite.specs ?? []), ...specs(suite.suites ?? [])]);
}

/** The first path segment below `root` is the artifact folder: results-<suite>. */
function suiteName(root: string, reportPath: string): string {
  const folder = reportPath.slice(root.length + 1).split(/[\\/]/)[0] ?? 'unknown';
  return folder.replace(/^results-/, '');
}

export function readSuiteReports(root: string): SuiteReport[] {
  return findReports(root)
    .sort()
    .map((path) => {
      const report = JSON.parse(readFileSync(path, 'utf8')) as PwReport;
      const all = specs(report.suites);
      const { expected, unexpected, flaky, skipped, duration } = report.stats;
      return {
        name: suiteName(root, path),
        passed: expected,
        failed: unexpected,
        flaky,
        skipped,
        durationMs: duration,
        titlesWith: (status) =>
          all
            .filter((spec) => spec.tests.some((test) => test.status === status))
            .map((spec) => `${spec.file} › ${spec.title}`),
        testDurationsMs: all.flatMap((spec) =>
          spec.tests.flatMap((test) => test.results.slice(-1).map((result) => result.duration)),
        ),
      };
    });
}

export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}
