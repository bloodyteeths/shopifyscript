/// <reference types="cypress" />

describe("Safe First Run Wizard", () => {
  beforeEach(() => {
    cy.stubProofKitAPI("success");
    cy.fixture("tenant-data").as("testData");
  });

  it("should complete safe first run configuration", function () {
    const { safeRunDefaults } = this.testData;

    // Step 1: Enter wizard from settings
    cy.visit("/app/settings");

    // Fill settings first
    cy.get('[data-testid="settings-tenant-id"]').type("demo-tenant-1");
    cy.get('[data-testid="settings-backend-url"]').type(
      "http://localhost:3001",
    );
    cy.get('[data-testid="settings-hmac-secret"]').type("test-secret");
    cy.get('[data-testid="settings-save"]').click();

    // Navigate to wizard
    cy.get('[data-testid="continue-wizard-button"]').click();

    cy.step(
      "Wizard Entry",
      "Setup wizard loads with progress indicator and first step (Safe First Run)",
      "/app/funnel/wizard",
    );

    // Verify wizard loaded
    cy.get('[data-testid="wizard-page"]').should("be.visible");
    cy.get('[data-testid="wizard-progress"]').should("be.visible");
    cy.get('[data-testid="step-0"]').should("contain.text", "Safe First Run");

    // Step 2: Configure budget cap
    cy.get('[data-testid="wizard-budget-cap"]')
      .clear()
      .type(safeRunDefaults.dailyBudgetCap);

    cy.step(
      "Budget Cap Configuration",
      "Daily budget cap field accepts numeric input with currency formatting",
      "/app/funnel/wizard",
    );

    // Verify input validation
    cy.get('[data-testid="wizard-budget-cap"]').should(
      "have.value",
      safeRunDefaults.dailyBudgetCap,
    );

    // Step 3: Configure CPC ceiling
    cy.get('[data-testid="wizard-cpc-ceiling"]')
      .clear()
      .type(safeRunDefaults.cpcCeiling);

    cy.step(
      "CPC Ceiling Configuration",
      "Maximum CPC field accepts decimal values with proper validation",
      "/app/funnel/wizard",
    );

    // Step 4: Set schedule window
    cy.get('[data-testid="wizard-schedule-start"]')
      .clear()
      .type(safeRunDefaults.scheduleStart);
    cy.get('[data-testid="wizard-schedule-end"]')
      .clear()
      .type(safeRunDefaults.scheduleEnd);

    cy.step(
      "Schedule Window Setup",
      "Time picker fields accept valid time format and show business hours",
      "/app/funnel/wizard",
    );

    // Step 5: Configure exclusions
    cy.get('[data-testid="wizard-exclusions"]').type(
      safeRunDefaults.exclusions,
    );

    cy.step(
      "Campaign Exclusions",
      "Exclusions field accepts comma-separated campaign names for safety",
      "/app/funnel/wizard",
    );

    // Step 6: Proceed to next step
    cy.get('[data-testid="wizard-next"]').should("not.be.disabled").click();

    cy.step(
      "Wizard Navigation",
      "Next button advances to script preview step with updated progress indicator",
      "/app/funnel/wizard",
    );

    // Verify step advancement
    cy.get('[data-testid="wizard-progress"]').should(
      "contain.text",
      "Script Preview",
    );
    cy.get('[data-testid="step-1"]').should("have.class", "active");

    // Accessibility verification
    cy.checkA11y('[data-testid="wizard-page"]');
  });

  it("should validate safe run limits and show warnings", function () {
    cy.visit("/app/funnel/wizard");

    // Test high budget warning
    cy.get('[data-testid="wizard-budget-cap"]').type("100.00");

    cy.step(
      "Budget Warning Display",
      "High budget amounts trigger warning message about safety limits",
      "/app/funnel/wizard",
    );

    cy.get('[data-testid="budget-warning"]').should("be.visible");
    cy.get('[data-testid="budget-warning"]').should(
      "contain.text",
      "Consider starting with a lower budget",
    );

    // Test extreme CPC warning
    cy.get('[data-testid="wizard-cpc-ceiling"]').type("10.00");

    cy.get('[data-testid="cpc-warning"]').should("be.visible");
    cy.get('[data-testid="cpc-warning"]').should(
      "contain.text",
      "High CPC ceiling",
    );
  });

  it("should support keyboard navigation throughout wizard", () => {
    cy.visit("/app/funnel/wizard");

    // Test tab order through form
    cy.get('[data-testid="wizard-budget-cap"]').focus();
    cy.focused().tab();
    cy.focused().should("have.attr", "data-testid", "wizard-cpc-ceiling");

    cy.focused().tab();
    cy.focused().should("have.attr", "data-testid", "wizard-schedule-start");

    cy.focused().tab();
    cy.focused().should("have.attr", "data-testid", "wizard-schedule-end");

    cy.focused().tab();
    cy.focused().should("have.attr", "data-testid", "wizard-exclusions");

    // Test form submission with Enter key
    cy.get('[data-testid="wizard-budget-cap"]').type("25.00{enter}");

    cy.step(
      "Keyboard Navigation",
      "All form fields are accessible via keyboard with proper tab order and Enter submission",
      "/app/funnel/wizard",
    );
  });
});
