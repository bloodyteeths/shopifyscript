/// <reference types="cypress" />

describe("PROMOTE Enable & Go Live", () => {
  beforeEach(() => {
    cy.stubProofKitAPI("success");
    cy.fixture("api-responses").as("apiResponses");
  });

  it("should enable PROMOTE and execute live automation", function () {
    const { promoteEnable } = this.apiResponses;

    // Navigate to final step
    cy.visit("/app/funnel/wizard");
    cy.get('[data-testid="step-5"]').click(); // Go Live step

    cy.step(
      "Go Live Step",
      "Final step loads with PROMOTE warning and schedule configuration",
      "/app/funnel/wizard",
    );

    // Verify go live UI
    cy.get('[data-testid="promote-warning"]').should("be.visible");
    cy.get('[data-testid="promote-warning"]').should(
      "contain.text",
      "live changes",
    );
    cy.get('[data-testid="promote-toggle"]')
      .should("be.visible")
      .and("not.be.disabled");

    // Step 1: Configure schedule window (optional)
    const scheduleTime = new Date(Date.now() + 300000)
      .toISOString()
      .slice(0, 16); // +5 minutes
    cy.get('[data-testid="promote-schedule-start"]').type(scheduleTime);

    cy.step(
      "Schedule Window Configuration",
      "Optional schedule window configured for time-boxed PROMOTE activation",
      "/app/funnel/wizard",
    );

    // Configure duration
    cy.get('[data-testid="promote-duration"]').select("60");
    cy.get('[data-testid="schedule-summary"]').should(
      "contain.text",
      "60 minutes",
    );

    // Step 2: Enable PROMOTE with confirmation
    cy.get('[data-testid="promote-toggle"]').click();

    cy.step(
      "PROMOTE Confirmation",
      "Confirmation modal appears warning about live changes and requiring explicit approval",
      "/app/funnel/wizard",
    );

    // Verify confirmation modal
    cy.get('[data-testid="promote-confirmation-modal"]').should("be.visible");
    cy.get('[data-testid="live-changes-warning"]').should(
      "contain.text",
      "real budget",
    );
    cy.get('[data-testid="confirm-promote"]').should("be.visible");
    cy.get('[data-testid="cancel-promote"]').should("be.visible");

    // Confirm PROMOTE enable
    cy.get('[data-testid="confirm-promote"]').click();

    cy.step(
      "PROMOTE Activation",
      "PROMOTE flag enabled successfully with confirmation feedback",
      "/app/funnel/wizard",
    );

    cy.wait("@enablePromote");

    // Verify PROMOTE enabled state
    cy.get('[data-testid="promote-enabled-badge"]').should("be.visible");
    cy.get('[data-testid="promote-enabled-badge"]').should(
      "contain.text",
      "ACTIVE",
    );
    cy.get('[data-testid="schedule-active"]').should("be.visible");

    // Step 3: Live execution monitoring
    cy.get('[data-testid="execution-monitor"]').should("be.visible");
    cy.get('[data-testid="run-logs-link"]').should("be.visible");

    cy.step(
      "Live Execution Monitoring",
      "Execution monitor shows active status with links to run logs and change history",
      "/app/funnel/wizard",
    );

    // Mock live execution results
    cy.intercept("GET", "/api/execution/status*", {
      statusCode: 200,
      body: {
        ok: true,
        status: "RUNNING",
        executionId: "exec-12345",
        startTime: new Date().toISOString(),
        mutations: [
          {
            type: "BUDGET_CHANGE",
            status: "COMPLETED",
            campaign: "Test Campaign",
          },
          {
            type: "CPC_CEILING",
            status: "COMPLETED",
            campaign: "Test Campaign",
          },
          {
            type: "SCHEDULE_ADD",
            status: "COMPLETED",
            campaign: "Test Campaign",
          },
        ],
      },
    }).as("executionStatus");

    // Check execution status
    cy.get('[data-testid="check-execution-status"]').click();
    cy.wait("@executionStatus");

    // Step 4: Verify live execution results
    cy.get('[data-testid="execution-results"]').should("be.visible");
    cy.get('[data-testid="mutations-applied"]').should(
      "contain.text",
      "3 changes applied",
    );
    cy.get('[data-testid="execution-success"]').should("be.visible");

    cy.step(
      "Live Execution Results",
      "Live execution completes successfully with detailed change log",
      "/app/funnel/wizard",
    );

    // Step 5: Setup completion
    cy.get('[data-testid="setup-complete"]').should("be.visible");
    cy.get('[data-testid="dashboard-link"]').should("be.visible");

    cy.step(
      "Setup Completion",
      "Wizard completes with success message and navigation to main dashboard",
      "/app/funnel/wizard",
    );

    // Accessibility check
    cy.checkA11y('[data-testid="go-live-section"]');
  });

  it("should handle PROMOTE failures and safety fallbacks", () => {
    // Mock PROMOTE enable failure
    cy.intercept("POST", "/api/promote/enable*", {
      statusCode: 403,
      body: {
        ok: false,
        error: "Idempotency test required before enabling PROMOTE",
        code: "PROMOTE_GATE_BLOCKED",
      },
    }).as("promoteFailed");

    cy.visit("/app/funnel/wizard");
    cy.get('[data-testid="step-5"]').click();

    cy.get('[data-testid="promote-toggle"]').click();
    cy.get('[data-testid="confirm-promote"]').click();

    cy.step(
      "PROMOTE Gate Protection",
      "PROMOTE enable fails with safety gate message and required actions",
      "/app/funnel/wizard",
    );

    cy.wait("@promoteFailed");

    // Verify safety gate message
    cy.get('[data-testid="promote-gate-error"]').should("be.visible");
    cy.get('[data-testid="safety-requirements"]').should(
      "contain.text",
      "Idempotency test",
    );
    cy.get('[data-testid="run-required-tests"]').should("be.visible");

    // Test retry after requirements met
    cy.stubProofKitAPI("success");
    cy.get('[data-testid="run-required-tests"]').click();

    // Should succeed after requirements
    cy.get('[data-testid="tests-passed"]').should("be.visible");
    cy.get('[data-testid="promote-toggle"]').should("not.be.disabled");
  });

  it("should demonstrate emergency PROMOTE disable", () => {
    cy.visit("/app/funnel/wizard");
    cy.get('[data-testid="step-5"]').click();

    // Enable PROMOTE first
    cy.get('[data-testid="promote-toggle"]').click();
    cy.get('[data-testid="confirm-promote"]').click();
    cy.wait("@enablePromote");

    // Step: Emergency disable
    cy.get('[data-testid="emergency-disable"]').should("be.visible");
    cy.get('[data-testid="emergency-disable"]').click();

    cy.step(
      "Emergency PROMOTE Disable",
      "Emergency disable immediately stops automation with confirmation",
      "/app/funnel/wizard",
    );

    // Verify emergency disable confirmation
    cy.get('[data-testid="emergency-confirm-modal"]').should("be.visible");
    cy.get('[data-testid="emergency-warning"]').should(
      "contain.text",
      "immediately stop",
    );

    cy.get('[data-testid="confirm-emergency-disable"]').click();

    // Verify disable success
    cy.get('[data-testid="promote-disabled-badge"]').should("be.visible");
    cy.get('[data-testid="automation-stopped"]').should(
      "contain.text",
      "stopped",
    );
  });

  it("should validate schedule window constraints", () => {
    cy.visit("/app/funnel/wizard");
    cy.get('[data-testid="step-5"]').click();

    // Test invalid schedule time (past)
    const pastTime = new Date(Date.now() - 300000).toISOString().slice(0, 16); // -5 minutes
    cy.get('[data-testid="promote-schedule-start"]').type(pastTime);

    cy.step(
      "Schedule Validation",
      "Past schedule times show validation error preventing PROMOTE activation",
      "/app/funnel/wizard",
    );

    cy.get('[data-testid="schedule-error"]').should("be.visible");
    cy.get('[data-testid="schedule-error"]').should(
      "contain.text",
      "future time",
    );
    cy.get('[data-testid="promote-toggle"]').should("be.disabled");

    // Test valid future time
    const futureTime = new Date(Date.now() + 300000).toISOString().slice(0, 16); // +5 minutes
    cy.get('[data-testid="promote-schedule-start"]').clear().type(futureTime);

    cy.get('[data-testid="schedule-valid"]').should("be.visible");
    cy.get('[data-testid="promote-toggle"]').should("not.be.disabled");
  });

  it("should track and display execution progress", () => {
    cy.visit("/app/funnel/wizard");
    cy.get('[data-testid="step-5"]').click();

    // Enable PROMOTE
    cy.get('[data-testid="promote-toggle"]').click();
    cy.get('[data-testid="confirm-promote"]').click();
    cy.wait("@enablePromote");

    // Mock execution progress updates
    cy.intercept("GET", "/api/execution/progress*", (req) => {
      req.reply((res) => {
        const progress = Math.min(100, (Date.now() % 10000) / 100); // Simulate progress
        res.send({
          statusCode: 200,
          body: {
            ok: true,
            progress: progress,
            currentStep:
              progress < 50 ? "Applying budget caps" : "Validating RSA assets",
            completedSteps: Math.floor(progress / 20),
            totalSteps: 5,
          },
        });
      });
    }).as("executionProgress");

    cy.get('[data-testid="track-execution"]').click();

    cy.step(
      "Execution Progress Tracking",
      "Real-time progress tracking shows current automation step and completion status",
      "/app/funnel/wizard",
    );

    // Verify progress tracking
    cy.get('[data-testid="progress-tracker"]').should("be.visible");
    cy.get('[data-testid="current-step"]').should("be.visible");
    cy.get('[data-testid="progress-bar"]').should("be.visible");

    // Wait for progress updates
    cy.wait("@executionProgress");
    cy.get('[data-testid="execution-step-name"]').should("not.be.empty");
  });
});
