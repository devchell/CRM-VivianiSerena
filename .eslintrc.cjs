module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parserOptions: {
    project: [
      './apps/api/tsconfig.json',
      './packages/types/tsconfig.json',
      './packages/ui/tsconfig.json',
      './packages/utils/tsconfig.json',
    ],
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'dist/',
    'coverage/',
    'out/',
    '.turbo/',
    '**/*.spec.ts',
    '**/*.test.ts',
    'apps/crm/',
    'apps/landing/',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/no-namespace': 'off',
    'prefer-const': 'error',
    'no-var': 'error',
  },
}
