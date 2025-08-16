/// <reference types="cypress" />

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Global before hook to initialize tests
beforeEach(() => {
  // Ensure step counter is initialized
  if (!window.stepCounter) {
    window.stepCounter = 0;
  }
});

// Global after hook to ensure screenshots are taken
afterEach(() => {
  // Take screenshot if test failed
  if (Cypress.currentTest.state === 'failed') {
    cy.screenshot(`failed-${Cypress.currentTest.title}`, {
      capture: 'fullPage'
    });
  }
});

// Configure global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing on uncaught exceptions in development
  if (Cypress.env('ENVIRONMENT') === 'development') {
    console.warn('Uncaught exception:', err);
    return false;
  }
  return true;
});

// Add global type declarations
declare global {
  interface Window {
    stepCounter: number;
  }
}