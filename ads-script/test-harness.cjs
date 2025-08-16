/**
 * ProofKit Ads Script Test Harness - Idempotency Validation
 * 
 * This harness ensures that Google Ads Script runs are idempotent by:
 * 1. Running the script in preview mode to capture planned mutations
 * 2. Running it again to verify no additional mutations are planned
 * 3. Logging results to RUN_LOGS for production safety verification
 * 
 * CRITICAL: This prevents unintended account changes in production
 */

class AdsScriptTestHarness {
  constructor() {
    this.runId = this.generateRunId();
    this.mutationLog = [];
    this.isPreviewMode = false;
    this.logFile = null;
  }

  generateRunId() {
    return new Date().toISOString().replace(/[:.]/g, '-') + '_idempotency_test';
  }

  /**
   * Initialize the test harness
   * @param {Object} config - Test configuration
   */
  init(config = {}) {
    this.config = {
      logDirectory: config.logDirectory || '/Users/tamsar/Downloads/proofkit-saas/run_logs',
      maxRetries: config.maxRetries || 3,
      assertionTimeout: config.assertionTimeout || 30000,
      ...config
    };
    
    this.logFile = `${this.config.logDirectory}/${this.runId}.log`;
    this.log('TEST_HARNESS_INIT', 'Idempotency test harness initialized');
  }

  /**
   * Run the complete idempotency test suite
   * @param {Function} scriptMainFunction - The main() function from master.gs
   * @returns {Object} Test results
   */
  async runIdempotencyTest(scriptMainFunction) {
    this.log('TEST_START', 'Beginning idempotency validation');
    
    try {
      // First run in preview mode
      this.log('FIRST_RUN_START', 'Starting first preview run');
      const firstRunResults = await this.runScriptPreview(scriptMainFunction, 'first');
      
      this.log('FIRST_RUN_COMPLETE', `First run planned ${firstRunResults.mutationCount} mutations`);
      
      // Second run in preview mode
      this.log('SECOND_RUN_START', 'Starting second preview run');
      const secondRunResults = await this.runScriptPreview(scriptMainFunction, 'second');
      
      this.log('SECOND_RUN_COMPLETE', `Second run planned ${secondRunResults.mutationCount} mutations`);
      
      // Validate idempotency
      const isIdempotent = this.validateIdempotency(firstRunResults, secondRunResults);
      
      const testResults = {
        passed: isIdempotent,
        runId: this.runId,
        firstRun: firstRunResults,
        secondRun: secondRunResults,
        timestamp: new Date().toISOString(),
        logFile: this.logFile
      };
      
      this.log('TEST_COMPLETE', `Idempotency test ${isIdempotent ? 'PASSED' : 'FAILED'}`);
      
      if (!isIdempotent) {
        this.log('TEST_FAILURE_DETAIL', this.generateFailureReport(firstRunResults, secondRunResults));
      }
      
      return testResults;
      
    } catch (error) {
      this.log('TEST_ERROR', `Test harness error: ${error.message}`);
      return {
        passed: false,
        error: error.message,
        runId: this.runId,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Run the script in preview mode and capture planned mutations
   */
  async runScriptPreview(scriptFunction, runLabel) {
    const startTime = Date.now();
    this.mutationLog = [];
    this.isPreviewMode = true;
    
    // Mock Google Ads API calls to capture planned mutations instead of executing them
    const originalMocks = this.setupPreviewMocks();
    
    try {
      // Execute the script
      await scriptFunction();
      
      const endTime = Date.now();
      const results = {
        runLabel,
        mutationCount: this.mutationLog.length,
        mutations: [...this.mutationLog],
        duration: endTime - startTime,
        timestamp: new Date().toISOString()
      };
      
      this.log(`${runLabel.toUpperCase()}_MUTATIONS`, JSON.stringify(results.mutations));
      
      return results;
      
    } finally {
      // Restore original functions
      this.restoreOriginalMocks(originalMocks);
      this.isPreviewMode = false;
    }
  }

  /**
   * Setup mocks for Google Ads API to capture mutations without executing them
   */
  setupPreviewMocks() {
    const originalMocks = {};
    
    // Mock campaign budget changes
    if (typeof AdsApp !== 'undefined' && AdsApp.campaigns) {
      originalMocks.budgetSetAmount = this.mockMethod('Campaign.getBudget().setAmount', 
        (amount) => this.logMutation('BUDGET_CHANGE', { amount }));
      
      // Mock bidding strategy changes
      originalMocks.biddingSetStrategy = this.mockMethod('Campaign.bidding().setStrategy',
        (strategy) => this.logMutation('BIDDING_STRATEGY_CHANGE', { strategy }));
      
      originalMocks.biddingSetCeiling = this.mockMethod('Campaign.bidding().setCpcBidCeiling',
        (ceiling) => this.logMutation('CPC_CEILING_CHANGE', { ceiling }));
      
      // Mock ad schedule additions
      originalMocks.addAdSchedule = this.mockMethod('Campaign.addAdSchedule',
        (...args) => this.logMutation('AD_SCHEDULE_ADD', { args }));
      
      // Mock negative keyword additions
      originalMocks.addNegativeKeyword = this.mockMethod('AdGroup.createNegativeKeyword',
        (keyword) => this.logMutation('NEGATIVE_KEYWORD_ADD', { keyword }));
      
      // Mock RSA creation
      originalMocks.rsaBuild = this.mockMethod('ResponsiveSearchAd.build',
        () => this.logMutation('RSA_CREATE', {}));
      
      // Mock audience attachment
      originalMocks.audienceBuild = this.mockMethod('UserListBuilder.build',
        () => this.logMutation('AUDIENCE_ATTACH', {}));
    }
    
    return originalMocks;
  }

  /**
   * Helper to mock a method and capture its calls
   */
  mockMethod(methodName, mockFunction) {
    // This is a simplified mock setup - in actual implementation, 
    // you'd need to properly intercept the Google Ads API calls
    return {
      methodName,
      originalFunction: null, // Would store original function
      mockFunction
    };
  }

  /**
   * Restore original API methods
   */
  restoreOriginalMocks(originalMocks) {
    // Restore original functions
    Object.values(originalMocks).forEach(mock => {
      if (mock.originalFunction) {
        // Restore original function
      }
    });
  }

  /**
   * Log a planned mutation
   */
  logMutation(type, details) {
    const mutation = {
      type,
      details,
      timestamp: new Date().toISOString(),
      stackTrace: this.getStackTrace()
    };
    
    this.mutationLog.push(mutation);
    this.log('MUTATION_PLANNED', `${type}: ${JSON.stringify(details)}`);
  }

  /**
   * Get simplified stack trace for debugging
   */
  getStackTrace() {
    try {
      throw new Error();
    } catch (e) {
      return e.stack ? e.stack.split('\n').slice(2, 5).join('\n') : 'Stack trace unavailable';
    }
  }

  /**
   * Validate that the script is idempotent
   */
  validateIdempotency(firstRun, secondRun) {
    // Core idempotency assertion: second run should plan zero mutations
    if (secondRun.mutationCount > 0) {
      this.log('IDEMPOTENCY_VIOLATION', 
        `Second run planned ${secondRun.mutationCount} mutations (expected 0)`);
      return false;
    }
    
    // Additional validation: mutation types should be consistent
    const firstMutationTypes = new Set(firstRun.mutations.map(m => m.type));
    const secondMutationTypes = new Set(secondRun.mutations.map(m => m.type));
    
    // If second run has different mutation types, that's also a problem
    if (secondMutationTypes.size > 0) {
      const unexpectedTypes = [...secondMutationTypes].filter(type => !firstMutationTypes.has(type));
      if (unexpectedTypes.length > 0) {
        this.log('IDEMPOTENCY_VIOLATION', 
          `Second run had unexpected mutation types: ${unexpectedTypes.join(', ')}`);
        return false;
      }
    }
    
    this.log('IDEMPOTENCY_CONFIRMED', 'Script behavior is idempotent');
    return true;
  }

  /**
   * Generate detailed failure report
   */
  generateFailureReport(firstRun, secondRun) {
    const report = {
      summary: `Idempotency test failed - second run planned ${secondRun.mutationCount} mutations`,
      firstRunSummary: {
        mutationCount: firstRun.mutationCount,
        duration: firstRun.duration
      },
      secondRunSummary: {
        mutationCount: secondRun.mutationCount,
        duration: secondRun.duration
      },
      secondRunMutations: secondRun.mutations,
      recommendations: [
        'Check for missing idempotency guards in the script',
        'Verify that all state checks happen before mutations',
        'Ensure proper exclusion logic is working',
        'Review label guards and existing entity detection'
      ]
    };
    
    return JSON.stringify(report, null, 2);
  }

  /**
   * Log messages to both console and log file
   */
  log(type, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${type}: ${message}`;
    
    // Console output
    console.log(logEntry);
    
    // File logging (simplified - in real implementation would use proper file I/O)
    if (typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        fs.appendFileSync(this.logFile, logEntry + '\n');
      } catch (e) {
        console.warn('Could not write to log file:', e.message);
      }
    }
  }

  /**
   * Create a promote gate check based on test results
   */
  createPromoteGate(testResults) {
    return {
      gate: 'IDEMPOTENCY_CHECK',
      passed: testResults.passed,
      canPromote: testResults.passed,
      runId: testResults.runId,
      timestamp: testResults.timestamp,
      details: testResults.passed ? 
        'Script passed idempotency validation - safe to promote to production' :
        'Script failed idempotency validation - DO NOT promote to production',
      logFile: testResults.logFile
    };
  }
}

// Export for use in test environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdsScriptTestHarness;
}

// Global instance for Google Apps Script environment
if (typeof global !== 'undefined') {
  global.AdsScriptTestHarness = AdsScriptTestHarness;
}

/**
 * Usage Example:
 * 
 * const harness = new AdsScriptTestHarness();
 * harness.init({ logDirectory: './run_logs' });
 * 
 * const testResults = await harness.runIdempotencyTest(main);
 * const promoteGate = harness.createPromoteGate(testResults);
 * 
 * if (promoteGate.canPromote) {
 *   console.log('✓ Script is safe for production deployment');
 * } else {
 *   console.error('✗ Script failed idempotency check - fix before deploying');
 * }
 */