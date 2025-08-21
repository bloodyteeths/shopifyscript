/// <reference types="cypress" />

describe("ProofKit Real Funnel Audit & Screenshots", () => {
  let stepCounter = 0;

  const takeStep = (label: string, expectation: string, route?: string) => {
    stepCounter++;
    const stepNum = stepCounter.toString().padStart(2, "0");
    const filename = `${stepNum}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

    cy.screenshot(`e2e-test-results/screenshots/funnel/${filename}`, {
      capture: "fullPage",
      overwrite: true,
    });

    cy.task("appendFunnelStep", {
      stepNumber: stepCounter,
      label,
      expect: expectation,
      route: route || window.location.pathname,
      screenshot: `./screenshots/funnel/${filename}.png`,
      timestamp: new Date().toISOString(),
    });

    cy.log(`📸 Step ${stepNum}: ${label}`);
    cy.log(`Expected: ${expectation}`);
  };

  before(() => {
    cy.task("initializeFunnelDocs");
    stepCounter = 0;
  });

  it("should audit the complete ProofKit funnel with real UI interactions", () => {
    // Step 1: Landing page / Dashboard
    cy.visit("/");

    takeStep(
      "Application Landing",
      "ProofKit application loads with navigation and main interface elements visible",
    );

    // Step 2: Navigate to settings or main app
    cy.get("body").then(($body) => {
      // Check if there's a navigation menu or direct link to app sections
      if ($body.find('a[href*="/app"]').length > 0) {
        cy.get('a[href*="/app"]').first().click();
      } else if ($body.find('[data-testid*="nav"]').length > 0) {
        cy.get('[data-testid*="nav"]').first().click();
      } else {
        // Try common app routes
        cy.visit("/app");
      }
    });

    cy.wait(1000); // Allow page to load

    takeStep(
      "Main Application Interface",
      "Main app interface loads with navigation menu and core features accessible",
      "/app",
    );

    // Step 3: Try to access different sections
    const sections = [
      {
        path: "/app/autopilot",
        name: "Autopilot",
        description: "Automated campaign management interface",
      },
      {
        path: "/app/insights",
        name: "Insights",
        description: "Performance insights and analytics dashboard",
      },
      {
        path: "/app/intent-os",
        name: "Intent OS",
        description: "Intent-based content optimization interface",
      },
      {
        path: "/app/advanced",
        name: "Advanced",
        description: "Advanced configuration and settings",
      },
    ];

    sections.forEach((section) => {
      cy.visit(section.path);
      cy.wait(2000); // Allow components to load

      takeStep(section.name, section.description, section.path);

      // Test any interactive elements on the page
      cy.get("body").then(($body) => {
        // Look for buttons, forms, or interactive elements
        const buttons = $body.find("button").length;
        const forms = $body.find("form").length;
        const inputs = $body.find("input").length;

        cy.log(`Found ${buttons} buttons, ${forms} forms, ${inputs} inputs`);

        // Click the first visible button if it exists (non-destructive)
        if ($body.find("button:visible").length > 0) {
          const firstButton = $body.find("button:visible").first();
          const buttonText = firstButton.text();

          // Only click safe buttons (avoid delete, submit, etc.)
          if (
            !buttonText.toLowerCase().includes("delete") &&
            !buttonText.toLowerCase().includes("remove") &&
            !buttonText.toLowerCase().includes("submit")
          ) {
            cy.get("button:visible").first().click({ force: true });
            cy.wait(1000);

            takeStep(
              `${section.name} - Interactive Element`,
              `Clicked button "${buttonText}" - interface responds with appropriate feedback or modal`,
              section.path,
            );
          }
        }
      });
    });

    // Step: Test any modal or overlay interfaces
    cy.visit("/app/insights");
    cy.get("body").then(($body) => {
      // Look for elements that might open modals
      const modalTriggers = $body.find(
        '[data-testid*="modal"], [data-testid*="open"], button[title*="open"]',
      );

      if (modalTriggers.length > 0) {
        cy.get(modalTriggers[0]).click({ force: true });
        cy.wait(1000);

        takeStep(
          "Modal Interface",
          "Modal or overlay interface opens with proper content and close functionality",
          "/app/insights",
        );

        // Try to close the modal
        cy.get("body").then(($bodyWithModal) => {
          if (
            $bodyWithModal.find(
              '[data-testid*="close"], button[title*="close"]',
            ).length > 0
          ) {
            cy.get('[data-testid*="close"], button[title*="close"]')
              .first()
              .click({ force: true });
          } else if (
            $bodyWithModal.find(".Polaris-Modal-CloseButton").length > 0
          ) {
            cy.get(".Polaris-Modal-CloseButton").click({ force: true });
          }
        });
      }
    });

    // Step: Test form interactions
    cy.visit("/app/autopilot");
    cy.wait(2000);

    takeStep(
      "Form Interface",
      "Form elements display with proper validation and input handling",
      "/app/autopilot",
    );

    cy.get("body").then(($body) => {
      // Fill out any visible forms with test data
      if ($body.find('input[type="text"]:visible').length > 0) {
        cy.get('input[type="text"]:visible')
          .first()
          .type("test-value", { force: true });
        cy.wait(500);

        takeStep(
          "Form Input Interaction",
          "Form accepts input and provides real-time validation feedback",
          "/app/autopilot",
        );
      }

      if ($body.find("select:visible").length > 0) {
        cy.get("select:visible").first().select(1, { force: true }); // Select second option
        cy.wait(500);

        takeStep(
          "Form Select Interaction",
          "Dropdown selections work properly and trigger appropriate UI updates",
          "/app/autopilot",
        );
      }
    });

    // Step: Test data loading states
    cy.visit("/app/insights");
    cy.wait(1000);

    takeStep(
      "Data Loading Interface",
      "Data-heavy interfaces show appropriate loading states and populated content",
      "/app/insights",
    );

    // Step: Test responsive design
    cy.viewport(768, 1024); // Tablet view
    cy.wait(1000);

    takeStep(
      "Responsive Design - Tablet",
      "Interface adapts properly to tablet viewport with accessible navigation",
      "/app/insights",
    );

    cy.viewport(375, 667); // Mobile view
    cy.wait(1000);

    takeStep(
      "Responsive Design - Mobile",
      "Interface adapts to mobile viewport with touch-friendly controls",
      "/app/insights",
    );

    // Reset to desktop
    cy.viewport(1280, 720);

    // Step: Final overview of complete interface
    cy.visit("/app");
    cy.wait(2000);

    takeStep(
      "Complete Interface Overview",
      "Full application interface showing all navigation elements and core functionality",
      "/app",
    );

    // Generate final test summary
    cy.then(() => {
      cy.log(`✅ Completed funnel audit with ${stepCounter} documented steps`);
      cy.log("📸 Screenshots saved to e2e-test-results/screenshots/funnel/");
      cy.log("📋 Documentation data saved for auto-generation");
    });
  });

  it("should test keyboard navigation and accessibility", () => {
    cy.visit("/app");

    takeStep(
      "Accessibility Audit",
      "Interface supports keyboard navigation with proper focus indicators and tab order",
      "/app",
    );

    // Test keyboard navigation
    cy.get("body").tab(); // Should focus first interactive element
    cy.focused().should("be.visible");

    // Tab through multiple elements
    for (let i = 0; i < 5; i++) {
      cy.focused().tab();
      cy.focused().should("be.visible");
    }

    takeStep(
      "Keyboard Navigation Test",
      "All interactive elements accessible via keyboard with visible focus indicators",
      "/app",
    );
  });
});
