module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint'],
  env: {
    'react/react-native': true,
    es2022: true,
    node: true,
  },
  rules: {
    // Warn on unused vars (don't error — some are used by type inference)
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // Allow explicit any (the codebase has many `any` types)
    '@typescript-eslint/no-explicit-any': 'off',
    // No console.log in production code
    'no-console': ['error', { allow: ['warn', 'error'] }],
    // React Native specific
    'react-native/no-raw-text': 'off',
    // Allow short-circuit evaluation (common pattern in the codebase)
    'no-unused-expressions': 'off',
    // Allow require() for dynamic imports
    '@typescript-eslint/no-var-requires': 'off',
  },
  ignorePatterns: ['node_modules/', 'dist/', '.expo/', '*.config.js', '*.json'],
};
