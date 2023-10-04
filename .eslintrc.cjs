module.exports = {
  env: { node: true },
  extends: [],
  ignorePatterns: ['node_modules'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig-eslint.json',
    sourceType: 'module',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],
    '@typescript-eslint/prefer-namespace-keyword': 'error',
    eqeqeq: ['error', 'always'],
    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-duplicates': 'error',
    'import/order': [
      'error',
      { alphabetize: { order: 'asc' }, 'newlines-between': 'always' },
    ],
    'no-undef': 'error',
    'no-shadow': 'warn',
    'no-eval': 'error',
    'no-unsafe-finally': 'error',
    'no-var': 'error',
    'no-global-assign': 'error',
    'no-implicit-globals': 'error',
    'padding-line-between-statements': [
      'error',
      { blankLine: 'always', next: 'return', prev: '*' },
    ],
  },
  settings: {},
}
