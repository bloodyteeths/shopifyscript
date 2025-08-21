/// <reference types="cypress" />

describe("Script Preview & Idempotency Testing", () => {
  beforeEach(() => {
    cy.stubProofKitAPI("success");
    cy.fixture("api-responses").as("apiResponses");
    cy.fixture("tenant-data").as("testData");
  });

  it("should run script preview and verify idempotency", function () {
    const { scriptPreview } = this.apiResponses;

    // Setup: Navigate to preview step
    cy.visit("/app/funnel/wizard");
    cy.get('[data-testid="step-1"]').click(); // Go to script preview step

    cy.step(
      "Script Preview Step",
      "Preview step loads with explanation and run preview button",
      "/app/funnel/wizard",
    );

    // Verify preview step UI
    cy.get('[data-testid="preview-run"]')
      .should("be.visible")
      .and("not.be.disabled");
    cy.get('[data-testid="preview-explanation"]').should(
      "contain.text",
      "no live changes",
    );

    // Step 1: Run first preview
    cy.get('[data-testid="preview-run"]').click();

    cy.step(
      "First Preview Execution",
      "Preview runs with loading state and displays planned mutations",
      "/app/funnel/wizard",
    );

    // Verify loading state
    cy.get('[data-testid="preview-loading"]').should("be.visible");

    // Wait for preview completion
    cy.wait("@scriptPreview");

    // Verify first run results
    cy.get('[data-testid="preview-results"]').should("be.visible");
    cy.get('[data-testid="mutation-list"]').should(
      "contain.text",
      "Budget capped",
    );
    cy.get('[data-testid="mutation-list"]').should(
      "contain.text",
      "CPC ceiling",
    );
    cy.get('[data-testid="mutation-list"]').should(
      "contain.text",
      "Schedule added",
    );
    cy.get('[data-testid="mutation-list"]').should(
      "contain.text",
      "negatives attached",
    );
    cy.get('[data-testid="mutation-list"]').should(
      "contain.text",
      "RSA assets validated",
    );
    cy.get('[data-testid="mutation-list"]').should(
      "contain.text",
      "Audience attached",
    );

    // Step 2: Second preview button appears
    cy.get('[data-testid="preview-run-second"]').should("be.visible");

    cy.step(
      "Idempotency Test Available",
      "Second preview button appears to test script idempotency",
      "/app/funnel/wizard",
    );

    // Step 3: Run second preview (idempotency test)
    cy.intercept("POST", "/api/script-preview*", {
      statusCode: 200,
      delay: 1000,
      body: scriptPreview.secondRun,
    }).as("secondPreview");

    cy.get('[data-testid="preview-run-second"]').click();

    cy.step(
      "Second Preview Execution",
      "Second preview runs and should show no planned mutations",
      "/app/funnel/wizard",
    );

    cy.wait("@secondPreview");

    // Step 4: Verify idempotency results
    cy.get('[data-testid="idempotency-results"]').should("be.visible");
    cy.get('[data-testid="idempotency-badge"]').should(
      "contain.text",
      "passed",
    );
    cy.get('[data-testid="no-mutations-message"]').should(
      "contain.text",
      "no duplicate mutations",
    );

    cy.step(
      "Idempotency Validation",
      "Second run shows zero mutations confirming script idempotency",
      "/app/funnel/wizard",
    );

    // Step 5: Enable next step navigation
    cy.get('[data-testid="wizard-next"]').should("not.be.disabled");

    cy.step(
      "Preview Complete",
      "Successful preview enables progression to next wizard step",
      "/app/funnel/wizard",
    );

    // Accessibility check
    cy.checkA11y('[data-testid="preview-section"]');
  });

  it("should handle preview failures gracefully", () => {
    // Simulate preview API failure
    cy.intercept("POST", "/api/script-preview*", {
      statusCode: 500,
      body: {
        ok: false,
        error: "Google Ads Script configuration invalid",
      },
    }).as("previewError");

    cy.visit("/app/funnel/wizard");
    cy.get('[data-testid="step-1"]').click();

    cy.get('[data-testid="preview-run"]').click();

    cy.step(
      "Preview Error Handling",
      "Script preview errors show clear error message and troubleshooting steps",
      "/app/funnel/wizard",
    );

    cy.wait("@previewError");

    // Verify error handling
    cy.get('[data-testid="preview-error"]').should("be.visible");
    cy.get('[data-testid="error-message"]').should(
      "contain.text",
      "configuration invalid",
    );
    cy.get('[data-testid="troubleshooting-link"]').should("be.visible");

    // Test retry functionality
    cy.stubProofKitAPI("success");
    cy.get('[data-testid="retry-preview"]').click();

    cy.wait("@scriptPreview");
    cy.get('[data-testid="preview-results"]').should("be.visible");
  });

  it("should validate mutation expectations", function () {
    const expectedMutations = this.testData.expectedMutations.firstRun;

    cy.visit("/app/funnel/wizard");
    cy.get('[data-testid="step-1"]').click();
    cy.get('[data-testid="preview-run"]').click();

    cy.wait("@scriptPreview");

    cy.step(
      "Mutation Validation",
      "Preview results match expected mutation types and descriptions",
      "/app/funnel/wizard",
    );

    // Verify each expected mutation type
    expectedMutations.forEach((mutationType) => {
      cy.get('[data-testid="mutation-list"]').should(
        "contain.text",
        mutationType.replace("_", " ").toLowerCase(),
      );
    });

    // Verify mutation details are expandable
    cy.get('[data-testid="mutation-details-toggle"]').first().click();
    cy.get('[data-testid="mutation-details"]').should("be.visible");
  });
});
