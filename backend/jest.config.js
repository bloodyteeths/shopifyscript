export default {
  testEnvironment: "node",
  preset: "jest-esm",
  extensionsToTreatAsEsm: [".js"],
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
  transform: {},
  collectCoverageFrom: [
    "services/**/*.js",
    "middleware/**/*.js",
    "utils/**/*.js",
    "routes/**/*.js",
    "lib/**/*.js",
    "!**/node_modules/**",
    "!**/tests/**",
  ],
  coverageReporters: ["text", "lcov", "html"],
  coverageDirectory: "coverage",
  testMatch: ["**/tests/**/*.test.js", "**/tests/**/*.spec.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testTimeout: 10000,
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
