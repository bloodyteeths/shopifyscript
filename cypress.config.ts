import { defineConfig } from "cypress";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    screenshotsFolder: "cypress/screenshots",
    fixturesFolder: "cypress/fixtures",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",

    setupNodeEvents(on, config) {
      // Task to initialize step counter and docs
      on("task", {
        initializeFunnelDocs() {
          const docsDir = join(process.cwd(), "docs");
          const screenshotsDir = join(docsDir, "screenshots", "funnel");

          if (!existsSync(docsDir)) {
            mkdirSync(docsDir, { recursive: true });
          }

          if (!existsSync(screenshotsDir)) {
            mkdirSync(screenshotsDir, { recursive: true });
          }

          // Initialize the steps JSON file
          const stepsFile = join(docsDir, "funnel-steps.json");
          writeFileSync(stepsFile, JSON.stringify([], null, 2));

          return null;
        },

        appendFunnelStep(step: {
          stepNumber: number;
          label: string;
          expect: string;
          route: string;
          screenshot: string;
          timestamp: string;
        }) {
          const docsDir = join(process.cwd(), "docs");
          const stepsFile = join(docsDir, "funnel-steps.json");

          let steps = [];
          if (existsSync(stepsFile)) {
            try {
              const content = require(stepsFile);
              steps = Array.isArray(content) ? content : [];
            } catch {
              steps = [];
            }
          }

          steps.push(step);
          writeFileSync(stepsFile, JSON.stringify(steps, null, 2));

          return null;
        },

        resetStepCounter() {
          // Reset global step counter
          global.stepCounter = 0;
          return null;
        },
      });

      // Environment-specific config
      if (config.env.ENVIRONMENT === "ci") {
        config.video = false;
        config.screenshotOnRunFailure = true;
      }

      return config;
    },

    env: {
      TENANT_ID: "demo-tenant-1",
      BACKEND_URL: "http://localhost:3001",
      HMAC_SECRET: "test-secret-key-for-demo",
      ENVIRONMENT: process.env.NODE_ENV || "development",
    },

    retries: {
      runMode: 2,
      openMode: 0,
    },

    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 15000,
  },

  component: {
    devServer: {
      framework: "create-react-app",
      bundler: "webpack",
    },
  },
});
