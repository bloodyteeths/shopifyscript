import { jest } from '@jest/globals';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });
dotenv.config({ path: '.env' });

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.HMAC_SECRET = 'test-secret-key';
process.env.SHEET_ID = 'test-sheet-id';
process.env.GOOGLE_APPLICATION_CREDENTIALS = './test-credentials.json';

// Global test setup
beforeAll(() => {
  // Setup global mocks
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
});

afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();
});

afterAll(() => {
  // Cleanup
  jest.restoreAllMocks();
});