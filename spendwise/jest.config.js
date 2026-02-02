const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/e2e/',
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/*.test.{ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/app/layout.tsx',
    '!src/app/providers.tsx',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};

// next/jest adds /node_modules/ to transformIgnorePatterns which blocks ESM
// packages like @apollo/client v4. Override it after config creation.
const baseConfig = createJestConfig(customJestConfig);
module.exports = async () => {
  const config = await baseConfig();
  config.transformIgnorePatterns = [
    '/node_modules/(?!@apollo/client)',
    '^.+\\.module\\.(css|sass|scss)$',
  ];
  return config;
};
