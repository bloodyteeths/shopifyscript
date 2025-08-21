module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/app/tests/setup.js"],
  testMatch: [
    "**/app/tests/**/*.test.{js,jsx,ts,tsx}",
    "**/app/tests/**/*.spec.{js,jsx,ts,tsx}",
  ],
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/app/$1",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  collectCoverageFrom: [
    "app/components/**/*.{js,jsx,ts,tsx}",
    "app/routes/**/*.{js,jsx,ts,tsx}",
    "app/services/**/*.{js,jsx,ts,tsx}",
    "!**/node_modules/**",
    "!**/tests/**",
  ],
  coverageReporters: ["text", "lcov", "html"],
  coverageDirectory: "coverage",
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
    "^.+\\.(js|jsx)$": [
      "babel-jest",
      {
        presets: [
          ["@babel/preset-env", { targets: { node: "current" } }],
          ["@babel/preset-react", { runtime: "classic" }],
        ],
      },
    ],
  },
};
