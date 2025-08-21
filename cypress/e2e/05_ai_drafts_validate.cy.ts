/// <reference types="cypress" />

describe("AI Drafts Generation & Validation", () => {
  beforeEach(() => {
    cy.stubProofKitAPI("success");
    cy.fixture("api-responses").as("apiResponses");
  });

  it("should generate and validate RSA drafts with 30/90 character limits", function () {
    const { aiDrafts } = this.apiResponses;

    // Navigate to AI drafts step
    cy.visit("/app/funnel/wizard");
    cy.get('[data-testid="step-2"]').click(); // AI drafts step

    cy.step(
      "AI Drafts Step",
      "AI drafts step loads with generation button and explanation of RSA requirements",
      "/app/funnel/wizard",
    );

    // Verify AI drafts step
    cy.get('[data-testid="generate-ai-drafts"]').should("be.visible");
    cy.get('[data-testid="rsa-explanation"]').should(
      "contain.text",
      "30/90 character",
    );

    // Step 1: Generate AI drafts
    cy.get('[data-testid="generate-ai-drafts"]').click();

    cy.step(
      "AI Generation Loading",
      "Generation button shows loading state while AI creates RSA content",
      "/app/funnel/wizard",
    );

    // Verify loading state
    cy.get('[data-testid="generate-ai-drafts"]').should(
      "contain.text",
      "Generating...",
    );
    cy.get('[data-testid="ai-loading-indicator"]').should("be.visible");

    // Wait for AI generation
    cy.wait("@aiDrafts");

    // Step 2: Display generated content
    cy.get('[data-testid="ai-drafts-results"]').should("be.visible");

    cy.step(
      "AI Drafts Results",
      "Generated RSA content displays with character count validation badges",
      "/app/funnel/wizard",
    );

    // Verify headlines with character validation
    cy.get('[data-testid="headline-1"]').should("be.visible");
    cy.get('[data-testid="headline-1-length"]').should("contain.text", "/30");
    cy.get('[data-testid="headline-1-badge"]').should("have.class", "success"); // Valid length

    // Verify descriptions with character validation
    cy.get('[data-testid="description-1"]').should("be.visible");
    cy.get('[data-testid="description-1-length"]').should(
      "contain.text",
      "/90",
    );
    cy.get('[data-testid="description-1-badge"]').should(
      "have.class",
      "success",
    ); // Valid length

    // Step 3: Content quality validation
    cy.get('[data-testid="content-quality-check"]').should("be.visible");
    cy.get('[data-testid="deduplication-status"]').should(
      "contain.text",
      "No duplicates found",
    );

    cy.step(
      "Content Quality Validation",
      "System validates content quality including deduplication and brand compliance",
      "/app/funnel/wizard",
    );

    // Step 4: Manual review and approval
    cy.get('[data-testid="approve-drafts"]').should("be.visible");
    cy.get('[data-testid="reject-drafts"]').should("be.visible");

    cy.step(
      "Manual Approval Process",
      "Generated content requires manual review and approval before use",
      "/app/funnel/wizard",
    );

    // Approve drafts
    cy.get('[data-testid="approve-drafts"]').click();

    // Verify approval
    cy.get('[data-testid="drafts-approved"]').should("be.visible");
    cy.get('[data-testid="wizard-next"]').should("not.be.disabled");

    // Accessibility check
    cy.checkA11y('[data-testid="ai-drafts-section"]');
  });

  it("should handle character limit violations", () => {
    // Mock AI response with invalid lengths
    cy.intercept("POST", "/api/ai-drafts*", {
      statusCode: 200,
      body: {
        ok: true,
        drafts: [
          {
            headlines: [
              "This headline is way too long and exceeds the 30 character limit for Google Ads RSA headlines",
              "Valid Headline",
              "Another very long headline that will be flagged as invalid",
            ],
            descriptions: [
              "This description is way too long and exceeds the 90 character limit for Google Ads RSA descriptions and should be flagged as invalid by the validation system",
              "Valid description under 90 chars",
            ],
            validation: {
              headlines: { valid: false, violations: 2 },
              descriptions: { valid: false, violations: 1 },
            },
          },
        ],
      },
    }).as("invalidDrafts");

    cy.visit("/app/funnel/wizard");
    cy.get('[data-testid="step-2"]').click();
    cy.get('[data-testid="generate-ai-drafts"]').click();

    cy.wait("@invalidDrafts");

    cy.step(
      "Character Limit Violations",
      "Invalid content shows error badges and prevents approval until fixed",
      "/app/funnel/wizard",
    );

    // Verify validation errors
    cy.get('[data-testid="headline-1-badge"]').should("have.class", "critical");
    cy.get('[data-testid="description-1-badge"]').should(
      "have.class",
      "critical",
    );
    cy.get('[data-testid="validation-errors"]').should("be.visible");

    // Verify approval is blocked
    cy.get('[data-testid="approve-drafts"]').should("be.disabled");
    cy.get('[data-testid="regenerate-invalid"]').should("be.visible");
  });

  it("should handle AI service errors", () => {
    // Mock AI service failure
    cy.intercept("POST", "/api/ai-drafts*", {
      statusCode: 503,
      body: {
        ok: false,
        error: "AI service temporarily unavailable",
      },
    }).as("aiServiceError");

    cy.visit("/app/funnel/wizard");
    cy.get('[data-testid="step-2"]').click();
    cy.get('[data-testid="generate-ai-drafts"]').click();

    cy.wait("@aiServiceError");

    cy.step(
      "AI Service Error Handling",
      "AI service errors show clear message with retry option and manual alternative",
      "/app/funnel/wizard",
    );

    // Verify error handling
    cy.get('[data-testid="ai-service-error"]').should("be.visible");
    cy.get('[data-testid="retry-ai-generation"]').should("be.visible");
    cy.get('[data-testid="skip-ai-step"]').should("be.visible");

    // Test skip functionality
    cy.get('[data-testid="skip-ai-step"]').click();
    cy.get('[data-testid="wizard-next"]').should("not.be.disabled");
  });

  it("should validate deduplication across multiple drafts", () => {
    // Mock response with duplicate content
    cy.intercept("POST", "/api/ai-drafts*", {
      statusCode: 200,
      body: {
        ok: true,
        drafts: [
          {
            headlines: [
              "Premium Quality Products",
              "Premium Quality Products", // Duplicate
              "Fast Shipping & Returns",
            ],
            descriptions: [
              "Discover our premium collection",
              "Discover our premium collection", // Duplicate
            ],
            validation: {
              headlines: { valid: false, duplicates: 1 },
              descriptions: { valid: false, duplicates: 1 },
            },
          },
        ],
      },
    }).as("duplicateDrafts");

    cy.visit("/app/funnel/wizard");
    cy.get('[data-testid="step-2"]').click();
    cy.get('[data-testid="generate-ai-drafts"]').click();

    cy.wait("@duplicateDrafts");

    cy.step(
      "Deduplication Validation",
      "System detects and flags duplicate content preventing approval",
      "/app/funnel/wizard",
    );

    // Verify duplicate detection
    cy.get('[data-testid="duplicate-warning"]').should("be.visible");
    cy.get('[data-testid="duplicate-count"]').should(
      "contain.text",
      "2 duplicates",
    );
    cy.get('[data-testid="approve-drafts"]').should("be.disabled");

    // Test deduplication action
    cy.get('[data-testid="remove-duplicates"]').click();
    cy.get('[data-testid="duplicate-warning"]').should("not.exist");
    cy.get('[data-testid="approve-drafts"]').should("not.be.disabled");
  });
});
