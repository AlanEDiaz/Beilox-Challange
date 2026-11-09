/**
 * Local one-command coverage run: API suite, then the UI suite per browser, each with V8 coverage
 * collected by c8, followed by the coverage report. Mirrors what CI does with separate jobs.
 * Usage: npm run coverage            (all three browsers, about 4 minutes)
 *        npm run coverage -- chromium (one browser only)
 */
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const browsers =
  process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['chromium', 'firefox', 'webkit'];

const runs = [
  { name: 'api', playwright: '--project=api --workers=1' },
  ...browsers.map((browser) => ({ name: `ui-${browser}`, playwright: `--project=ui-${browser}` })),
];

rmSync('coverage', { recursive: true, force: true });
rmSync('all-results', { recursive: true, force: true });

let failed = false;
runs.forEach((run, index) => {
  console.log(`\n=== ${run.name} ===`);
  const result = spawnSync(`npx c8 --clean=${index === 0} npx playwright test ${run.playwright}`, {
    shell: true,
    stdio: 'inherit',
    // CI=true gives retries and the JSON report, exactly like the workflow.
    env: {
      ...process.env,
      CI: 'true',
      PW_JSON_OUTPUT: `all-results/results-${run.name}/test-results/results.json`,
    },
  });
  if (result.status !== 0) failed = true;
});

spawnSync('npx c8 report', { shell: true, stdio: 'inherit' });
const report = spawnSync(
  'node scripts/coverage-report.ts all-results --c8 coverage/c8/coverage-summary.json --out coverage/summary.json',
  { shell: true, stdio: 'inherit' },
);

process.exit(failed || report.status !== 0 ? 1 : 0);
