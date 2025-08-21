const { defineConfig } = require("cypress");
const { writeFileSync, mkdirSync, existsSync, readFileSync } = require("fs");
const { join } = require("path");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:8080",
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    screenshotsFolder: "e2e-test-results/screenshots",
    fixturesFolder: "cypress/fixtures",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",

    setupNodeEvents(on, config) {
      on("task", {
        initializeFunnelDocs() {
          const docsDir = join(process.cwd(), "e2e-test-results", "docs");
          const screenshotsDir = join(
            process.cwd(),
            "e2e-test-results",
            "screenshots",
            "funnel",
          );

          if (!existsSync(docsDir)) {
            mkdirSync(docsDir, { recursive: true });
          }

          if (!existsSync(screenshotsDir)) {
            mkdirSync(screenshotsDir, { recursive: true });
          }

          const stepsFile = join(docsDir, "funnel-steps.json");
          writeFileSync(stepsFile, JSON.stringify([], null, 2));

          return null;
        },

        appendFunnelStep(step) {
          const docsDir = join(process.cwd(), "e2e-test-results", "docs");
          const stepsFile = join(docsDir, "funnel-steps.json");

          let steps = [];
          if (existsSync(stepsFile)) {
            try {
              const content = readFileSync(stepsFile, "utf8");
              steps = JSON.parse(content);
              if (!Array.isArray(steps)) {
                steps = [];
              }
            } catch (error) {
              console.log("Error reading steps file:", error);
              steps = [];
            }
          }

          steps.push(step);
          writeFileSync(stepsFile, JSON.stringify(steps, null, 2));

          return null;
        },

        resetStepCounter() {
          return null;
        },
      });

      return config;
    },

    env: {
      TENANT_ID: "demo-tenant-1",
      BACKEND_URL: "http://localhost:3005",
      HMAC_SECRET: "test-secret-key-for-demo",
      BACKEND_PUBLIC_URL: "http://localhost:3005",
    },

    retries: {
      runMode: 1,
      openMode: 0,
    },

    defaultCommandTimeout: 10000,
  },
});
