/// <reference types="cypress" />

describe('ProofKit Settings Configuration', () => {
  beforeEach(() => {
    cy.stubProofKitAPI('success');
    cy.fixture('tenant-data').as('testData');
  });

  it('should persist settings and enable wizard access', function() {
    const { demoTenant } = this.testData;
    
    // Step 1: Navigate to settings
    cy.visit('/app/settings');
    cy.step(
      'Settings Page Load',
      'Settings page loads with empty form and required field indicators',
      '/app/settings'
    );
    
    // Verify initial state
    cy.get('[data-testid="settings-tenant-id"]').should('have.value', '');
    cy.get('[data-testid="settings-save"]').should('be.disabled');
    
    // Step 2: Fill required fields
    cy.get('[data-testid="settings-tenant-id"]').type(demoTenant.tenantId);
    cy.get('[data-testid="settings-backend-url"]').type(demoTenant.backendUrl);
    cy.get('[data-testid="settings-hmac-secret"]').type(demoTenant.hmacSecret);
    
    cy.step(
      'Required Fields Filled',
      'Save button becomes enabled when all required fields are completed',
      '/app/settings'
    );
    
    // Verify form validation
    cy.get('[data-testid="settings-save"]').should('not.be.disabled');
    
    // Step 3: Fill optional tracking fields
    cy.get('[data-testid="settings-ga4-id"]').type(demoTenant.ga4MeasurementId);
    cy.get('[data-testid="settings-google-ads-id"]').type(demoTenant.googleAdsId);
    cy.get('[data-testid="settings-conversion-label"]').type(demoTenant.conversionLabel);
    
    cy.step(
      'Optional Fields Completed',
      'All tracking IDs filled with proper format validation and help text',
      '/app/settings'
    );
    
    // Step 4: Save settings (optimistic update)
    cy.get('[data-testid="settings-save"]').click();
    
    cy.step(
      'Optimistic Save Update',
      'Button shows loading state and form shows success feedback immediately',
      '/app/settings'
    );
    
    // Verify optimistic update
    cy.get('[data-testid="settings-save"]').should('contain.text', 'Saving...');
    cy.waitForOptimisticUpdate('[data-testid="settings-save"]', 'Save Settings');
    
    // Wait for API calls
    cy.wait('@upsertConfig');
    
    // Step 5: Success state and wizard access
    cy.get('[data-testid="success-banner"]').should('be.visible');
    cy.get('[data-testid="continue-wizard-button"]').should('be.visible').and('not.be.disabled');
    
    cy.step(
      'Save Success State',
      'Success banner appears and wizard access button is enabled',
      '/app/settings'
    );
    
    // Accessibility checks
    cy.checkA11y('[data-testid="settings-form"]');
    
    // Test keyboard navigation through form
    cy.get('[data-testid="settings-tenant-id"]').focus().tab();
    cy.focused().should('have.attr', 'data-testid', 'settings-backend-url');
  });

  it('should handle validation errors appropriately', function() {
    cy.visit('/app/settings');
    
    // Test empty form submission
    cy.get('[data-testid="settings-save"]').should('be.disabled');
    
    cy.step(
      'Form Validation',
      'Save button disabled when required fields are empty with clear validation messages',
      '/app/settings'
    );
    
    // Test partial form completion
    cy.get('[data-testid="settings-tenant-id"]').type('test');
    cy.get('[data-testid="settings-save"]').should('be.disabled');
    
    // Test invalid URL format
    cy.get('[data-testid="settings-backend-url"]').type('invalid-url');
    cy.get('[data-testid="settings-hmac-secret"]').type('short');
    
    cy.get('[data-testid="settings-save"]').click();
    
    cy.step(
      'Validation Error Display',
      'Form shows specific validation errors for invalid inputs',
      '/app/settings'
    );
    
    cy.get('[data-testid="validation-error"]').should('be.visible');
  });

  it('should handle API errors with retry functionality', () => {
    cy.stubProofKitAPI('error');
    cy.fixture('tenant-data').then((testData) => {
      const { demoTenant } = testData;
      
      cy.visit('/app/settings');
      
      // Fill form
      cy.get('[data-testid="settings-tenant-id"]').type(demoTenant.tenantId);
      cy.get('[data-testid="settings-backend-url"]').type(demoTenant.backendUrl);
      cy.get('[data-testid="settings-hmac-secret"]').type(demoTenant.hmacSecret);
      
      // Attempt save
      cy.get('[data-testid="settings-save"]').click();
      
      cy.step(
        'API Error Handling',
        'App shows error banner with retry option when save fails',
        '/app/settings'
      );
      
      // Verify error handling
      cy.get('[data-testid="error-banner"]').should('be.visible');
      cy.get('[data-testid="retry-save-button"]').should('be.visible');
      
      // Test retry with success
      cy.stubProofKitAPI('success');
      cy.get('[data-testid="retry-save-button"]').click();
      
      cy.wait('@upsertConfig');
      cy.get('[data-testid="success-banner"]').should('be.visible');
    });
  });

  it('should handle rate limiting gracefully', () => {
    // Simulate rate limiting scenario
    cy.intercept('POST', '/api/upsertConfig*', {
      statusCode: 429,
      body: { 
        ok: false, 
        error: 'Rate limit exceeded', 
        retryAfter: 60 
      }
    }).as('rateLimited');
    
    cy.fixture('tenant-data').then((testData) => {
      const { demoTenant } = testData;
      
      cy.visit('/app/settings');
      
      // Fill and submit form
      cy.get('[data-testid="settings-tenant-id"]').type(demoTenant.tenantId);
      cy.get('[data-testid="settings-backend-url"]').type(demoTenant.backendUrl);
      cy.get('[data-testid="settings-hmac-secret"]').type(demoTenant.hmacSecret);
      
      cy.get('[data-testid="settings-save"]').click();
      
      cy.step(
        'Rate Limit Handling',
        'App shows rate limit message with retry countdown when API returns 429',
        '/app/settings'
      );
      
      cy.wait('@rateLimited');
      
      // Verify rate limit handling
      cy.get('[data-testid="rate-limit-banner"]').should('be.visible');
      cy.get('[data-testid="retry-countdown"]').should('contain.text', '60');
    });
  });
});