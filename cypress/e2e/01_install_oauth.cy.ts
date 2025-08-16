/// <reference types="cypress" />

describe('ProofKit Installation & OAuth Flow', () => {
  beforeEach(() => {
    cy.resetSteps();
    cy.task('initializeFunnelDocs');
    
    // Stub Shopify OAuth and app installation
    cy.intercept('GET', '/auth/shopify*', {
      statusCode: 302,
      headers: {
        location: '/app'
      }
    }).as('shopifyAuth');
    
    cy.intercept('GET', '/app*', {
      statusCode: 200
    }).as('appLoad');
  });

  it('should complete Shopify app installation and OAuth flow', () => {
    // Step 1: Initial app installation page
    cy.visit('/install');
    cy.step(
      'App Installation Landing',
      'User sees ProofKit app installation page with "Install App" button and clear value proposition',
      '/install'
    );
    
    // Verify install page elements
    cy.get('[data-testid="install-app-button"]').should('be.visible');
    cy.get('[data-testid="value-proposition"]').should('contain.text', 'Automate your Google Ads');
    cy.get('[data-testid="features-list"]').should('be.visible');
    
    // Step 2: Click install and begin OAuth
    cy.get('[data-testid="install-app-button"]').click();
    cy.step(
      'OAuth Initiation',
      'App redirects to Shopify OAuth screen with proper scopes and permissions request',
      '/auth/shopify'
    );
    
    // Verify OAuth redirection
    cy.wait('@shopifyAuth');
    cy.url().should('include', '/auth/shopify');
    
    // Step 3: OAuth approval (simulated)
    cy.visit('/app'); // Simulate successful OAuth return
    cy.step(
      'OAuth Success Redirect',
      'User is redirected to app home page after successful OAuth approval',
      '/app'
    );
    
    // Step 4: App loads in embedded iframe
    cy.wait('@appLoad');
    cy.get('[data-testid="app-shell"]').should('be.visible');
    cy.step(
      'Embedded App Load',
      'App loads successfully in Shopify admin with navigation and setup prompt',
      '/app'
    );
    
    // Verify app shell elements
    cy.get('[data-testid="setup-wizard-prompt"]').should('be.visible');
    cy.get('[data-testid="navigation-menu"]').should('be.visible');
    
    // Step 5: Setup wizard prompt
    cy.get('[data-testid="setup-wizard-prompt"]').should('contain.text', 'Complete your setup');
    cy.get('[data-testid="start-setup-button"]').should('be.visible').and('not.be.disabled');
    cy.step(
      'Setup Wizard Prompt',
      'App displays setup wizard prompt with clear next steps and accessible navigation',
      '/app'
    );
    
    // Accessibility checks
    cy.checkA11y('[data-testid="app-shell"]');
    
    // Keyboard navigation test
    cy.testKeyboardNav('start-setup-button');
  });

  it('should handle OAuth errors gracefully', () => {
    // Test OAuth error scenario
    cy.intercept('GET', '/auth/shopify*', {
      statusCode: 400,
      body: { error: 'invalid_request', error_description: 'Missing required parameters' }
    }).as('oauthError');
    
    cy.visit('/install');
    cy.get('[data-testid="install-app-button"]').click();
    
    cy.step(
      'OAuth Error Handling',
      'App shows clear error message and retry option when OAuth fails',
      '/auth/error'
    );
    
    // Verify error handling
    cy.get('[data-testid="error-message"]').should('be.visible');
    cy.get('[data-testid="retry-install-button"]').should('be.visible');
    
    // Test retry functionality
    cy.get('[data-testid="retry-install-button"]').click();
    cy.url().should('include', '/install');
  });

  it('should display loading states during OAuth process', () => {
    // Test loading states
    cy.intercept('GET', '/auth/shopify*', {
      delay: 2000,
      statusCode: 302,
      headers: { location: '/app' }
    }).as('slowAuth');
    
    cy.visit('/install');
    cy.get('[data-testid="install-app-button"]').click();
    
    cy.step(
      'OAuth Loading State',
      'App displays loading indicator while processing OAuth request',
      '/auth/shopify'
    );
    
    // Verify loading state
    cy.get('[data-testid="oauth-loading"]').should('be.visible');
    cy.get('[data-testid="loading-message"]').should('contain.text', 'Connecting to Shopify');
    
    // Wait for completion
    cy.wait('@slowAuth');
    cy.get('[data-testid="oauth-loading"]').should('not.exist');
  });
});