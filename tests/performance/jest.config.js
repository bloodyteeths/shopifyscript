export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  testMatch: [
    '**/*.test.js',
    '**/load-test.js',
    '**/stress-test.js'
  ],
  testTimeout: 120000, // 2 minutes for performance tests
  maxWorkers: 1, // Run performance tests sequentially
  verbose: true,
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'ProofKit Performance Test Report',
      outputPath: './performance-report.html',
      includeFailureMsg: true,
      includeSuiteFailure: true
    }]
  ]
};