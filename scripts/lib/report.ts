/** Shared reader for Playwright JSON reports (ci-summary, push-metrics, coverage-report). */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export type TestStatus = 'expected' | 'unexpected' | 'flaky' | 'skipped';

interface PwResult {
  readonly duration: number;
}
interface PwTest {
  readonly status: TestStatus;
  readonly projectName: string;
  readonly results: readonly PwResult[];
}
interface PwSpec {
  readonly title: string;
  readonly file: string;
  /** Tags without the leading "@", including the ones inherited from describe blocks. */
  readonly tags?: readonly string[];
  readonly tests: readonly PwTest[];
}
interface PwSuite {
  readonly title: string;
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

/** One test case as run in one Playwright project. */
export interface SpecRecord {
  readonly title: string;
  readonly project: string;
  /** Titles of the enclosing describe blocks, outermost first (the file itself is skipped). */
  readonly describes: readonly string[];
  readonly tags: readonly string[];
  /** True for passed and flaky (passed on retry); flaky ones are reported separately. */
  readonly passed: boolean;
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
  readonly specs: SpecRecord[];
}

function findReports(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return findReports(path);
    return entry === 'results.json' ? [path] : [];
  });
}

function pwSpecs(suites: readonly PwSuite[]): PwSpec[] {
  return suites.flatMap((suite) => [...(suite.specs ?? []), ...pwSpecs(suite.suites ?? [])]);
}

/** Flattens suites into one record per (spec, project), keeping the describe chain. */
function records(suites: readonly PwSuite[], chain: readonly string[] = []): SpecRecord[] {
  return suites.flatMap((suite) => {
    // The top-level suite is the spec file: its title is a path, not a describe block.
    const isFile = chain.length === 0 && suite.title.includes('.spec.');
    const describes = isFile ? chain : [...chain, suite.title];
    const own = (suite.specs ?? []).flatMap((spec) =>
      spec.tests.map((test) => ({
        title: spec.title,
        project: test.projectName,
        describes,
        tags: spec.tags ?? [],
        passed: test.status === 'expected' || test.status === 'flaky',
      })),
    );
    return [...own, ...records(suite.suites ?? [], describes)];
  });
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
      const all = pwSpecs(report.suites);
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
        specs: records(report.suites),
      };
    });
}

export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}
