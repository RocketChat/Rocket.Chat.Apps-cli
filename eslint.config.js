const js = require('@eslint/js')
const typescript = require('typescript-eslint')
const prettier = require('eslint-config-prettier')

module.exports = [
  js.configs.recommended,
  ...typescript.configs.recommended,
  prettier,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
      'no-console': 'warn',
      'prefer-const': 'error',
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    ignores: ['lib/', 'dist/', 'node_modules/', 'coverage/', '**/*.js', '*.d.ts'],
  },
]
