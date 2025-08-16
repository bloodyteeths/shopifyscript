/// <reference types="cypress" />

describe('ProofKit Manual Funnel Screenshots', () => {
  before(() => {
    // Configure error handling
    Cypress.on('uncaught:exception', (err, runnable) => {
      // Don't fail on hydration errors
      if (err.message.includes('Hydration') || err.message.includes('hydrating')) {
        return false;
      }
      return true;
    });
  });

  it('should manually capture each ProofKit interface section', () => {
    // Routes to test
    const routes = [
      { path: '/app', name: 'main-dashboard', wait: 4000 },
      { path: '/app/autopilot', name: 'autopilot-interface', wait: 4000 },
      { path: '/app/insights', name: 'insights-dashboard', wait: 4000 },
      { path: '/app/insights/terms', name: 'insights-terms', wait: 4000 },
      { path: '/app/intent-os', name: 'intent-os-system', wait: 4000 },
      { path: '/app/advanced', name: 'advanced-settings', wait: 4000 }
    ];

    routes.forEach((route, index) => {
      const stepNum = (index + 1).toString().padStart(2, '0');
      
      cy.visit(route.path, { failOnStatusCode: false });
      cy.wait(route.wait);
      
      cy.screenshot(`e2e-test-results/screenshots/funnel/${stepNum}-${route.name}`, { 
        capture: 'fullPage',
        overwrite: true
      });
      
      cy.log(`✅ Captured: ${route.path} → ${stepNum}-${route.name}.png`);
    });

    // Test responsive views
    cy.viewport(768, 1024); // Tablet
    cy.visit('/app/autopilot', { failOnStatusCode: false });
    cy.wait(3000);
    cy.screenshot('e2e-test-results/screenshots/funnel/07-tablet-responsive', { 
      capture: 'fullPage',
      overwrite: true
    });

    cy.viewport(375, 667); // Mobile
    cy.wait(2000);
    cy.screenshot('e2e-test-results/screenshots/funnel/08-mobile-responsive', { 
      capture: 'fullPage',
      overwrite: true
    });

    cy.log('✅ All ProofKit interface screenshots captured successfully!');
  });
});