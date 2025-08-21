/// <reference types="cypress" />

describe("Audience Attachment & Size Guards", () => {
  beforeEach(() => {
    cy.stubProofKitAPI("success");
    cy.fixture("api-responses").as("apiResponses");
    cy.fixture("tenant-data").as("testData");
  });

  it("should configure audience attachment with size guards", function () {
    const { audienceUpload } = this.apiResponses;
    const { audienceDefaults } = this.testData;

    // Navigate to audience setup step
    cy.visit("/app/funnel/wizard");
    cy.get('[data-testid="step-4"]').click(); // Audience step

    cy.step(
      "Audience Setup Step",
      "Audience step loads with upload instructions and configuration form",
      "/app/funnel/wizard",
    );

    // Verify audience setup UI
    cy.get('[data-testid="audience-upload-help"]').should("be.visible");
    cy.get('[data-testid="audience-list-id"]').should("be.visible");
    cy.get('[data-testid="audience-mode"]').should("have.value", "OBSERVE");

    // Step 1: Show upload instructions
    cy.get('[data-testid="audience-upload-help"]').click();

    cy.step(
      "Upload Instructions Modal",
      "Modal opens with step-by-step Google Ads audience upload instructions",
      "/app/funnel/wizard",
    );

    // Verify instructions modal
    cy.get('[data-testid="audience-instructions-modal"]').should("be.visible");
    cy.get('[data-testid="upload-step-1"]').should(
      "contain.text",
      "Export your audience CSV",
    );
    cy.get('[data-testid="upload-step-6"]').should(
      "contain.text",
      "Paste the ID",
    );

    // Close instructions
    cy.get('[data-testid="close-instructions"]').click();

    // Step 2: Configure audience attachment
    cy.get('[data-testid="audience-list-id"]').type(audienceDefaults.listId);

    cy.step(
      "Audience List ID Entry",
      "User enters Google Ads User List ID with format validation",
      "/app/funnel/wizard",
    );

    // Verify ID format validation
    cy.get('[data-testid="list-id-valid"]').should("be.visible");

    // Step 3: Configure targeting mode (keep OBSERVE)
    cy.get('[data-testid="audience-mode"]').should("have.value", "OBSERVE");
    cy.get('[data-testid="mode-explanation"]').should(
      "contain.text",
      "Recommended for new lists",
    );

    cy.step(
      "Targeting Mode Selection",
      "OBSERVE mode selected by default with explanation of safety benefits",
      "/app/funnel/wizard",
    );

    // Step 4: Test audience validation
    cy.intercept("GET", "/api/audience/validate*", {
      statusCode: 200,
      body: audienceUpload.success,
    }).as("audienceValidation");

    cy.get('[data-testid="validate-audience"]').click();

    cy.step(
      "Audience Validation",
      "System validates audience list size and accessibility from Google Ads",
      "/app/funnel/wizard",
    );

    cy.wait("@audienceValidation");

    // Verify validation results
    cy.get('[data-testid="audience-valid"]').should("be.visible");
    cy.get('[data-testid="audience-size"]').should("contain.text", "15,000");
    cy.get('[data-testid="size-guard-status"]').should(
      "contain.text",
      "Above minimum",
    );

    // Step 5: Size guard demonstration
    cy.get('[data-testid="size-guard-explanation"]').should("be.visible");
    cy.get('[data-testid="size-guard-explanation"]').should(
      "contain.text",
      "1,000 user minimum",
    );

    cy.step(
      "Size Guard Information",
      "System explains size guard protection and minimum audience requirements",
      "/app/funnel/wizard",
    );

    // Enable next step
    cy.get('[data-testid="wizard-next"]').should("not.be.disabled");

    // Accessibility check
    cy.checkA11y('[data-testid="audience-section"]');
  });

  it("should handle small audience lists with size guard warnings", function () {
    const { audienceUpload } = this.apiResponses;

    cy.visit("/app/funnel/wizard");
    cy.get('[data-testid="step-4"]').click();

    // Configure small audience
    cy.get('[data-testid="audience-list-id"]').type("987654321");

    // Mock small audience response
    cy.intercept("GET", "/api/audience/validate*", {
      statusCode: 200,
      body: audienceUpload.tooSmall,
    }).as("smallAudience");

    cy.get('[data-testid="validate-audience"]').click();

    cy.step(
      "Small Audience Warning",
      "System shows size warning for audiences under 1,000 users with bid modifier skip",
      "/app/funnel/wizard",
    );

    cy.wait("@smallAudience");

    // Verify size guard warning
    cy.get('[data-testid="size-warning"]').should("be.visible");
    cy.get('[data-testid="audience-size"]').should("contain.text", "500");
    cy.get('[data-testid="bid-modifier-skipped"]').should(
      "contain.text",
      "skipped",
    );
    cy.get('[data-testid="size-guard-protection"]').should("be.visible");

    // Verify can still proceed
    cy.get('[data-testid="wizard-next"]').should("not.be.disabled");
  });

  it("should validate audience mode configurations", () => {
    cy.visit("/app/funnel/wizard");
    cy.get('[data-testid="step-4"]').click();

    // Test TARGET mode
    cy.get('[data-testid="audience-mode"]').select("TARGET");

    cy.step(
      "Target Mode Configuration",
      "TARGET mode enables bid modifier field with validation and warnings",
      "/app/funnel/wizard",
    );

    // Verify TARGET mode changes
    cy.get('[data-testid="audience-bid-modifier"]').should("be.visible");
    cy.get('[data-testid="target-mode-warning"]').should("be.visible");
    cy.get('[data-testid="target-mode-warning"]').should(
      "contain.text",
      "reduces reach",
    );

    // Test bid modifier validation
    cy.get('[data-testid="audience-bid-modifier"]').type("1.25");
    cy.get('[data-testid="bid-modifier-valid"]').should("be.visible");

    // Test invalid bid modifier
    cy.get('[data-testid="audience-bid-modifier"]').clear().type("10.0");
    cy.get('[data-testid="bid-modifier-warning"]').should(
      "contain.text",
      "High bid modifier",
    );

    // Test EXCLUDE mode
    cy.get('[data-testid="audience-mode"]').select("EXCLUDE");

    cy.step(
      "Exclude Mode Configuration",
      "EXCLUDE mode hides bid modifier and shows exclusion explanation",
      "/app/funnel/wizard",
    );

    // Verify EXCLUDE mode
    cy.get('[data-testid="audience-bid-modifier"]').should("not.exist");
    cy.get('[data-testid="exclude-explanation"]').should(
      "contain.text",
      "never shown",
    );
  });

  it("should handle audience API errors", () => {
    cy.visit("/app/funnel/wizard");
    cy.get('[data-testid="step-4"]').click();

    // Mock audience validation error
    cy.intercept("GET", "/api/audience/validate*", {
      statusCode: 404,
      body: {
        ok: false,
        error: "User list not found or not accessible",
      },
    }).as("audienceError");

    cy.get('[data-testid="audience-list-id"]').type("invalid123");
    cy.get('[data-testid="validate-audience"]').click();

    cy.step(
      "Audience Validation Error",
      "Invalid audience lists show clear error with troubleshooting guidance",
      "/app/funnel/wizard",
    );

    cy.wait("@audienceError");

    // Verify error handling
    cy.get('[data-testid="audience-error"]').should("be.visible");
    cy.get('[data-testid="error-message"]').should("contain.text", "not found");
    cy.get('[data-testid="troubleshooting-tips"]').should("be.visible");

    // Test skip option for optional step
    cy.get('[data-testid="skip-audience-step"]').should("be.visible");
    cy.get('[data-testid="skip-audience-step"]').click();

    cy.get('[data-testid="wizard-next"]').should("not.be.disabled");
  });

  it("should demonstrate keyboard accessibility for audience forms", () => {
    cy.visit("/app/funnel/wizard");
    cy.get('[data-testid="step-4"]').click();

    // Test keyboard navigation
    cy.get('[data-testid="audience-list-id"]').focus();
    cy.testKeyboardNav("audience-list-id");

    // Tab through form elements
    cy.focused().tab();
    cy.focused().should("have.attr", "data-testid", "audience-mode");

    // Test select dropdown with keyboard
    cy.focused().type("{downarrow}"); // Should open dropdown
    cy.focused().type("{enter}"); // Should select option

    cy.step(
      "Audience Form Keyboard Navigation",
      "All audience form controls accessible via keyboard with proper focus management",
      "/app/funnel/wizard",
    );

    // Verify ARIA labels
    cy.get('[data-testid="audience-list-id"]').should(
      "have.attr",
      "aria-label",
    );
    cy.get('[data-testid="audience-mode"]').should("have.attr", "aria-label");
  });
});
