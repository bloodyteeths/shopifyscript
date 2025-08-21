/// <reference types="cypress" />

describe("ProofKit UI Audit & Screenshots", () => {
  let stepCounter = 0;

  it("should capture screenshots of the ProofKit interface", () => {
    // Step 1: Home page
    cy.visit("/");
    stepCounter++;
    cy.screenshot(
      `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-application-home`,
      {
        capture: "fullPage",
      },
    );
    cy.wait(2000);

    // Step 2: Main app interface
    cy.visit("/app");
    cy.wait(3000); // Allow time for React to render
    stepCounter++;
    cy.screenshot(
      `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-main-app-interface`,
      {
        capture: "fullPage",
      },
    );

    // Step 3: Autopilot section
    cy.visit("/app/autopilot");
    cy.wait(3000);
    stepCounter++;
    cy.screenshot(
      `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-autopilot-dashboard`,
      {
        capture: "fullPage",
      },
    );

    // Test any buttons or interactive elements
    cy.get("body").then(($body) => {
      if ($body.find("button:visible").length > 0) {
        const button = $body.find("button:visible").first();
        const buttonText = button.text();

        // Only click safe buttons
        if (
          buttonText &&
          !buttonText.toLowerCase().includes("delete") &&
          !buttonText.toLowerCase().includes("remove")
        ) {
          cy.get("button:visible").first().click({ force: true });
          cy.wait(1000);

          stepCounter++;
          cy.screenshot(
            `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-autopilot-interaction`,
            {
              capture: "fullPage",
            },
          );
        }
      }
    });

    // Step 4: Insights section
    cy.visit("/app/insights");
    cy.wait(3000);
    stepCounter++;
    cy.screenshot(
      `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-insights-dashboard`,
      {
        capture: "fullPage",
      },
    );

    // Step 5: Intent OS section
    cy.visit("/app/intent-os");
    cy.wait(3000);
    stepCounter++;
    cy.screenshot(
      `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-intent-os-interface`,
      {
        capture: "fullPage",
      },
    );

    // Test form interactions if available
    cy.get("body").then(($body) => {
      if ($body.find("input:visible").length > 0) {
        cy.get("input:visible").first().type("test-input", { force: true });
        cy.wait(500);

        stepCounter++;
        cy.screenshot(
          `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-form-interaction`,
          {
            capture: "fullPage",
          },
        );
      }
    });

    // Step 6: Advanced section
    cy.visit("/app/advanced");
    cy.wait(3000);
    stepCounter++;
    cy.screenshot(
      `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-advanced-settings`,
      {
        capture: "fullPage",
      },
    );

    // Step 7: Test responsive design
    cy.viewport(768, 1024); // Tablet
    cy.wait(1000);
    stepCounter++;
    cy.screenshot(
      `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-tablet-responsive`,
      {
        capture: "fullPage",
      },
    );

    cy.viewport(375, 667); // Mobile
    cy.wait(1000);
    stepCounter++;
    cy.screenshot(
      `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-mobile-responsive`,
      {
        capture: "fullPage",
      },
    );

    // Reset viewport
    cy.viewport(1280, 720);

    // Step 8: Final overview
    cy.visit("/app");
    cy.wait(3000);
    stepCounter++;
    cy.screenshot(
      `e2e-test-results/screenshots/funnel/${stepCounter.toString().padStart(2, "0")}-final-overview`,
      {
        capture: "fullPage",
      },
    );

    // Create step documentation data
    cy.writeFile("e2e-test-results/docs/audit-steps.json", [
      {
        step: 1,
        name: "Application Home",
        description: "ProofKit application landing page with navigation",
        screenshot: "01-application-home.png",
      },
      {
        step: 2,
        name: "Main App Interface",
        description: "Main application dashboard with core functionality",
        screenshot: "02-main-app-interface.png",
      },
      {
        step: 3,
        name: "Autopilot Dashboard",
        description: "Automated campaign management interface",
        screenshot: "03-autopilot-dashboard.png",
      },
      {
        step: 4,
        name: "Autopilot Interaction",
        description: "Interactive elements and user feedback",
        screenshot: "04-autopilot-interaction.png",
      },
      {
        step: 5,
        name: "Insights Dashboard",
        description: "Performance analytics and insights interface",
        screenshot: "05-insights-dashboard.png",
      },
      {
        step: 6,
        name: "Intent OS Interface",
        description: "Intent-based optimization and content management",
        screenshot: "06-intent-os-interface.png",
      },
      {
        step: 7,
        name: "Form Interaction",
        description: "Form inputs and validation behavior",
        screenshot: "07-form-interaction.png",
      },
      {
        step: 8,
        name: "Advanced Settings",
        description: "Advanced configuration and feature settings",
        screenshot: "08-advanced-settings.png",
      },
      {
        step: 9,
        name: "Tablet Responsive",
        description: "Interface adaptation for tablet viewport",
        screenshot: "09-tablet-responsive.png",
      },
      {
        step: 10,
        name: "Mobile Responsive",
        description: "Mobile-optimized interface layout",
        screenshot: "10-mobile-responsive.png",
      },
      {
        step: 11,
        name: "Final Overview",
        description: "Complete interface overview with all features",
        screenshot: "11-final-overview.png",
      },
    ]);

    cy.log(`✅ Captured ${stepCounter} screenshots of ProofKit interface`);
  });
});
