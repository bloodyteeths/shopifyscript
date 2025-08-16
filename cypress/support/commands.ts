/// <reference types="cypress" />

// Global step counter
let globalStepCounter = 0;

// Ensure docs directory exists
if (typeof window === 'undefined') {
  const fs = require('fs');
  const path = require('path');
  const docsDir = path.join(process.cwd(), 'e2e-test-results', 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
}

/**
 * Custom command to capture numbered screenshots and document funnel steps
 */
Cypress.Commands.add('step', (label: string, expectText: string, route?: string) => {
  globalStepCounter++;
  const stepNumber = globalStepCounter.toString().padStart(2, '0');
  const screenshotName = `${stepNumber}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  
  // Take screenshot
  cy.screenshot(`funnel/${screenshotName}`, {
    capture: 'fullPage',
    overwrite: true
  });
  
  // Get current route if not provided
  const currentRoute = route || '';
  
  // Append step to documentation
  cy.task('appendFunnelStep', {
    stepNumber: globalStepCounter,
    label,
    expect: expectText,
    route: currentRoute,
    screenshot: `./screenshots/funnel/${screenshotName}.png`,
    timestamp: new Date().toISOString()
  });
  
  // Log the step for debugging
  cy.log(`Step ${stepNumber}: ${label}`);
  cy.log(`Expected: ${expectText}`);
});

/**
 * Command to reset step counter for new test suites
 */
Cypress.Commands.add('resetSteps', () => {
  globalStepCounter = 0;
  cy.task('resetStepCounter');
});

/**
 * Command to stub ProofKit API responses
 */
Cypress.Commands.add('stubProofKitAPI', (scenario: 'success' | 'error' | 'loading' = 'success') => {
  const baseConfig = {
    enabled: true,
    label: 'PROOFKIT_AUTOMATED',
    daily_budget_cap_default: 25.00,
    cpc_ceiling_default: 2.50,
    business_start: '09:00',
    business_end: '17:00',
    business_days_csv: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY'
  };

  switch (scenario) {
    case 'success':
      cy.intercept('GET', '/api/config*', {
        statusCode: 200,
        body: { ok: true, config: baseConfig }
      }).as('getConfig');
      
      cy.intercept('POST', '/api/upsertConfig*', {
        statusCode: 200,
        body: { ok: true, message: 'Configuration saved successfully' }
      }).as('upsertConfig');
      
      cy.intercept('POST', '/api/script-preview*', {
        statusCode: 200,
        delay: 1500, // Simulate processing time
        body: {
          ok: true,
          mutations: [
            { type: 'BUDGET_CHANGE', description: 'Budget capped: Test Campaign → $25.00' },
            { type: 'CPC_CEILING', description: 'CPC ceiling: Test Campaign → $2.50' },
            { type: 'SCHEDULE_ADD', description: 'Schedule added: Mon-Fri 9AM-5PM' },
            { type: 'NEGATIVE_ADD', description: '5 master negatives attached' },
            { type: 'RSA_VALIDATE', description: 'RSA assets validated (30/90)' },
            { type: 'AUDIENCE_ATTACH', description: 'Audience attached in OBSERVE mode' }
          ]
        }
      }).as('scriptPreview');
      
      cy.intercept('POST', '/api/ai-drafts*', {
        statusCode: 200,
        delay: 2000,
        body: {
          ok: true,
          drafts: [{
            headlines: [
              'Premium Quality Products',
              'Free Shipping & Returns',
              'Expert Customer Support'
            ],
            descriptions: [
              'Discover our curated collection of premium products with fast shipping.',
              'Join thousands of satisfied customers who trust our quality and service.'
            ]
          }]
        }
      }).as('aiDrafts');
      
      cy.intercept('GET', '/api/intent-preview*', {
        statusCode: 200,
        body: {
          ok: true,
          headline: 'Dynamic headline based on UTM term',
          benefits: ['Benefit 1', 'Benefit 2', 'Benefit 3'],
          socialProof: 'Trusted by 10,000+ customers',
          ctaText: 'Shop Now'
        }
      }).as('intentPreview');
      
      cy.intercept('POST', '/api/promote/enable*', {
        statusCode: 200,
        body: { ok: true, promoteEnabled: true }
      }).as('enablePromote');
      
      break;
      
    case 'error':
      cy.intercept('GET', '/api/config*', {
        statusCode: 500,
        body: { ok: false, error: 'Configuration service unavailable' }
      }).as('getConfigError');
      
      cy.intercept('POST', '/api/upsertConfig*', {
        statusCode: 429,
        body: { ok: false, error: 'Rate limit exceeded' }
      }).as('upsertConfigError');
      
      break;
      
    case 'loading':
      cy.intercept('GET', '/api/config*', {
        delay: 5000,
        statusCode: 200,
        body: { ok: true, config: baseConfig }
      }).as('getConfigSlow');
      
      break;
  }
});

/**
 * Command to verify accessibility with axe-core
 */
Cypress.Commands.add('checkA11y', (context?: string, options?: any) => {
  cy.injectAxe();
  cy.checkA11y(context, {
    rules: {
      'color-contrast': { enabled: true },
      'keyboard-navigation': { enabled: true },
      'focus-management': { enabled: true },
      ...options
    }
  });
});

/**
 * Command to test keyboard navigation
 */
Cypress.Commands.add('testKeyboardNav', (testId: string) => {
  cy.get(`[data-testid="${testId}"]`).focus();
  cy.focused().should('have.attr', 'data-testid', testId);
  
  // Test Tab navigation
  cy.focused().tab();
  cy.focused().should('be.visible');
  
  // Test Enter/Space activation
  cy.focused().type('{enter}');
});

/**
 * Command to wait for optimistic updates
 */
Cypress.Commands.add('waitForOptimisticUpdate', (element: string, expectedText: string) => {
  cy.get(element).should('contain.text', expectedText);
  cy.wait(100); // Allow for optimistic UI updates
});

/**
 * Command to verify network retry behavior
 */
Cypress.Commands.add('verifyRetryBehavior', (alias: string, expectedRetries: number = 3) => {
  // Verify the network request was retried the expected number of times
  cy.get(`@${alias}.all`).should('have.length', expectedRetries);
});

// Extend Cypress namespace with custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      step(label: string, expectText: string, route?: string): Chainable<void>;
      resetSteps(): Chainable<void>;
      stubProofKitAPI(scenario?: 'success' | 'error' | 'loading'): Chainable<void>;
      checkA11y(context?: string, options?: any): Chainable<void>;
      testKeyboardNav(testId: string): Chainable<void>;
      waitForOptimisticUpdate(element: string, expectedText: string): Chainable<void>;
      verifyRetryBehavior(alias: string, expectedRetries?: number): Chainable<void>;
    }
  }
}