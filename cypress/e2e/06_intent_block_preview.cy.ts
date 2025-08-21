/// <reference types="cypress" />

describe("Intent Block Preview & UTM Testing", () => {
  beforeEach(() => {
    cy.stubProofKitAPI("success");
    cy.fixture("api-responses").as("apiResponses");
  });

  it("should preview intent blocks for different UTM terms", function () {
    const { intentPreview } = this.apiResponses;

    // Navigate to intent preview step
    cy.visit("/app/funnel/wizard");
    cy.get('[data-testid="step-3"]').click(); // Intent preview step

    cy.step(
      "Intent Preview Step",
      "Intent preview step loads with explanation and UTM term preview buttons",
      "/app/funnel/wizard",
    );

    // Verify intent preview UI
    cy.get('[data-testid="intent-preview-explanation"]').should(
      "contain.text",
      "content changes",
    );
    cy.get('[data-testid="intent-preview-high-intent"]').should("be.visible");
    cy.get('[data-testid="intent-preview-research"]').should("be.visible");
    cy.get('[data-testid="intent-preview-comparison"]').should("be.visible");
    cy.get('[data-testid="intent-preview-retargeting"]').should("be.visible");

    // Step 1: Preview high-intent content
    cy.intercept("GET", "/api/intent-preview*utm_term=high-intent*", {
      statusCode: 200,
      body: intentPreview.highIntent,
    }).as("highIntentPreview");

    cy.get('[data-testid="intent-preview-high-intent"]').click();

    cy.step(
      "High Intent Preview",
      "High intent preview opens modal with urgent messaging and countdown timer",
      "/app/funnel/wizard",
    );

    cy.wait("@highIntentPreview");

    // Verify high-intent modal content
    cy.get('[data-testid="intent-preview-modal"]').should("be.visible");
    cy.get('[data-testid="preview-headline"]').should(
      "contain.text",
      "Limited Time",
    );
    cy.get('[data-testid="urgency-badge"]').should("contain.text", "URGENT");
    cy.get('[data-testid="countdown-timer"]').should("be.visible");

    // Close modal
    cy.get('[data-testid="close-preview"]').click();

    // Step 2: Preview research content
    cy.intercept("GET", "/api/intent-preview*utm_term=research*", {
      statusCode: 200,
      body: intentPreview.research,
    }).as("researchPreview");

    cy.get('[data-testid="intent-preview-research"]').click();

    cy.step(
      "Research Intent Preview",
      "Research preview shows educational content with expert testimonials",
      "/app/funnel/wizard",
    );

    cy.wait("@researchPreview");

    // Verify research modal content
    cy.get('[data-testid="preview-headline"]').should(
      "contain.text",
      "Discover",
    );
    cy.get('[data-testid="educational-benefits"]').should("be.visible");
    cy.get('[data-testid="expert-social-proof"]').should(
      "contain.text",
      "experts",
    );
    cy.get('[data-testid="countdown-timer"]').should("not.exist"); // No urgency for research

    cy.get('[data-testid="close-preview"]').click();

    // Step 3: Preview comparison content
    cy.intercept("GET", "/api/intent-preview*utm_term=comparison*", {
      statusCode: 200,
      body: intentPreview.comparison,
    }).as("comparisonPreview");

    cy.get('[data-testid="intent-preview-comparison"]').click();

    cy.step(
      "Comparison Intent Preview",
      "Comparison preview emphasizes competitive advantages and value proposition",
      "/app/funnel/wizard",
    );

    cy.wait("@comparisonPreview");

    // Verify comparison modal content
    cy.get('[data-testid="preview-headline"]').should(
      "contain.text",
      "Why We're #1",
    );
    cy.get('[data-testid="competitive-badge"]').should(
      "contain.text",
      "BEST VALUE",
    );
    cy.get('[data-testid="comparison-benefits"]').should("be.visible");

    cy.get('[data-testid="close-preview"]').click();

    // Step 4: Preview retargeting content
    cy.intercept("GET", "/api/intent-preview*utm_term=retargeting*", {
      statusCode: 200,
      body: intentPreview.retargeting,
    }).as("retargetingPreview");

    cy.get('[data-testid="intent-preview-retargeting"]').click();

    cy.step(
      "Retargeting Intent Preview",
      "Retargeting preview shows personalized welcome back message with incentive",
      "/app/funnel/wizard",
    );

    cy.wait("@retargetingPreview");

    // Verify retargeting modal content
    cy.get('[data-testid="preview-headline"]').should(
      "contain.text",
      "Welcome Back",
    );
    cy.get('[data-testid="incentive-badge"]').should(
      "contain.text",
      "SAVE 15%",
    );
    cy.get('[data-testid="personal-message"]').should(
      "contain.text",
      "waiting",
    );

    cy.get('[data-testid="close-preview"]').click();

    // Step 5: Verify UTM parameter understanding
    cy.get('[data-testid="utm-explanation"]').should(
      "contain.text",
      "automatically adapts",
    );
    cy.get('[data-testid="wizard-next"]').should("not.be.disabled");

    cy.step(
      "Intent Preview Complete",
      "All intent variations previewed successfully, wizard progression enabled",
      "/app/funnel/wizard",
    );

    // Accessibility check
    cy.checkA11y('[data-testid="intent-preview-section"]');
  });

  it("should handle intent preview failures", () => {
    // Simulate preview API failure
    cy.intercept("GET", "/api/intent-preview*", {
      statusCode: 500,
      body: {
        ok: false,
        error: "Intent OS service unavailable",
      },
    }).as("intentPreviewError");

    cy.visit("/app/funnel/wizard");
    cy.get('[data-testid="step-3"]').click();

    cy.get('[data-testid="intent-preview-high-intent"]').click();

    cy.step(
      "Intent Preview Error",
      "Intent preview errors show fallback content and service status",
      "/app/funnel/wizard",
    );

    cy.wait("@intentPreviewError");

    // Verify error handling in modal
    cy.get('[data-testid="intent-preview-modal"]').should("be.visible");
    cy.get('[data-testid="preview-error"]').should(
      "contain.text",
      "service unavailable",
    );
    cy.get('[data-testid="fallback-content"]').should("be.visible");

    // Test skip functionality
    cy.get('[data-testid="skip-intent-step"]').should("be.visible");
    cy.get('[data-testid="close-preview"]').click();
    cy.get('[data-testid="skip-intent-step"]').click();

    cy.get('[data-testid="wizard-next"]').should("not.be.disabled");
  });

  it("should validate UTM parameter format and tracking", () => {
    cy.visit("/app/funnel/wizard");
    cy.get('[data-testid="step-3"]').click();

    // Step: Test UTM parameter detection
    cy.get('[data-testid="utm-test-input"]').type("high-intent");
    cy.get('[data-testid="test-utm-button"]').click();

    cy.step(
      "UTM Parameter Testing",
      "UTM parameter input validates format and shows preview of content changes",
      "/app/funnel/wizard",
    );

    // Verify UTM format validation
    cy.get('[data-testid="utm-format-valid"]').should("be.visible");
    cy.get('[data-testid="utm-preview-result"]').should(
      "contain.text",
      "high-intent",
    );

    // Test invalid UTM format
    cy.get('[data-testid="utm-test-input"]').clear().type("invalid utm term!");
    cy.get('[data-testid="test-utm-button"]').click();

    cy.get('[data-testid="utm-format-error"]').should("be.visible");
    cy.get('[data-testid="utm-format-help"]').should(
      "contain.text",
      "Use lowercase letters",
    );
  });

  it("should demonstrate responsive design across intent types", () => {
    cy.visit("/app/funnel/wizard");
    cy.get('[data-testid="step-3"]').click();

    // Test each intent type with different viewport sizes
    const viewports = [
      { width: 1280, height: 720, name: "desktop" },
      { width: 768, height: 1024, name: "tablet" },
      { width: 375, height: 667, name: "mobile" },
    ];

    viewports.forEach((viewport) => {
      cy.viewport(viewport.width, viewport.height);

      cy.get('[data-testid="intent-preview-high-intent"]').click();

      cy.step(
        `Responsive Design - ${viewport.name}`,
        `Intent preview modal adapts properly to ${viewport.name} viewport dimensions`,
        "/app/funnel/wizard",
      );

      // Verify responsive layout
      cy.get('[data-testid="intent-preview-modal"]').should("be.visible");
      cy.get('[data-testid="preview-content"]').should("be.visible");

      // Check for mobile-specific adaptations
      if (viewport.width < 768) {
        cy.get('[data-testid="mobile-layout"]').should("be.visible");
        cy.get('[data-testid="full-width-cta"]').should("be.visible");
      }

      cy.get('[data-testid="close-preview"]').click();
    });

    // Reset to desktop view
    cy.viewport(1280, 720);
  });
});
