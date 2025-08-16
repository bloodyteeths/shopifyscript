export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/app/tests/setup.js'],
  testMatch: [
    '**/app/tests/**/*.test.{js,jsx,ts,tsx}',
    '**/app/tests/**/*.spec.{js,jsx,ts,tsx}'
  ],
  moduleNameMapping: {
    '^~/(.*)$': '<rootDir>/app/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  collectCoverageFrom: [
    'app/components/**/*.{js,jsx,ts,tsx}',
    'app/routes/**/*.{js,jsx,ts,tsx}',
    'app/services/**/*.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.json'
    }]
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx']
};