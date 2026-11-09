import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

export default tseslint.config(
  { ignores: ['node_modules', 'playwright-report', 'test-results', 'blob-report', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['tests/**/*.ts', 'src/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-force-option': 'error',
      'playwright/no-skipped-test': 'warn',
      'playwright/expect-expect': [
        'error',
        {
          assertFunctionNames: [
            'expectStatus',
            'expectSchema',
            'expectJsonContentType',
            'expectWithinBudget',
          ],
        },
      ],
    },
  },
  {
    // UI assertions live in page-object "verify" classes (web-first expects), so the rule
    // cannot see them from the spec; reviewers enforce one verify.* call per test instead.
    files: ['tests/ui/**/*.ts'],
    rules: { 'playwright/expect-expect': 'off' },
  },
);
