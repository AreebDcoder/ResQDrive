/**
 * ESLint configuration for the ResQDrive mobile app.
 *
 * Uses @react-native-community/eslint-config as the base (industry-standard
 * for React Native projects). Extended with TypeScript rules.
 *
 * Run: npx eslint src/ --ext .ts,.tsx
 */
module.exports = {
  root: true,
  extends: [
    '@react-native-community',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
  },
  rules: {
    // Allow console in development (warn in production)
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    // Allow unused vars prefixed with _ (common pattern for ignored params)
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // Relax any usage (existing codebase has many `any` types)
    '@typescript-eslint/no-explicit-any': 'off',
    // Allow function hoisting (common in React Native)
    '@typescript-eslint/no-use-before-define': 'off',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.expo/',
    'android/',
    'ios/',
    'patches/',
    '*.json',
    '__tests__/',
  ],
};
