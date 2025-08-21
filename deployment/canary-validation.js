#!/usr/bin/env node

/**
 * PROOFKIT CANARY VALIDATION SYSTEM
 * Automated safety validation for canary deployments
 * P0-7 CRITICAL: Prevents risky first deploys
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const fs = require("fs");
const path = require("path");

// Configuration constants
const SAFETY_LIMITS = {
  MAX_DAILY_BUDGET: 10.0, // Absolute maximum for canary
  MAX_CPC_CEILING: 0.5, // Absolute maximum CPC
  MAX_WINDOW_MINUTES: 180, // Maximum test window
  MIN_AUDIENCE_SIZE: 1000, // Minimum audience for meaningful test
  MAX_CANARY_CAMPAIGNS: 1, // Only one campaign for canary
  REQUIRED_BUFFER_MINUTES: 2, // Minimum buffer before start
};

const VALIDATION_LEVELS = {
  CRITICAL: "CRITICAL", // Must pass or abort
  WARNING: "WARNING", // Should review but can proceed
  INFO: "INFO", // Informational only
};

class CanaryValidator {
  constructor(tenant, config = {}) {
    this.tenant = tenant;
    this.config = config;
    this.validationResults = [];
    this.criticalErrors = [];
    this.warnings = [];
    this.startTime = Date.now();
  }

  log(level, message, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
      tenant: this.tenant,
    };

    this.validationResults.push(entry);

    if (level === VALIDATION_LEVELS.CRITICAL) {
      this.criticalErrors.push(entry);
    } else if (level === VALIDATION_LEVELS.WARNING) {
      this.warnings.push(entry);
    }

    console.log(
      `[${level}] ${message}`,
      Object.keys(details).length ? details : "",
    );
  }

  // Phase 0: Environment Validation
  async validateEnvironment() {
    this.log(VALIDATION_LEVELS.INFO, "Starting environment validation");

    // Check required environment variables
    const requiredEnvVars = [
      "HMAC_SECRET",
      "GOOGLE_SHEETS_PRIVATE_KEY",
      "GOOGLE_SHEETS_CLIENT_EMAIL",
      "GEMINI_API_KEY",
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        this.log(
          VALIDATION_LEVELS.CRITICAL,
          `Missing required environment variable: ${envVar}`,
        );
      }
    }

    // Validate HMAC secret length
    if (process.env.HMAC_SECRET && process.env.HMAC_SECRET.length < 32) {
      this.log(
        VALIDATION_LEVELS.CRITICAL,
        "HMAC_SECRET must be at least 32 characters",
        {
          currentLength: process.env.HMAC_SECRET.length,
        },
      );
    }

    // Validate Gemini API key format
    if (
      process.env.GEMINI_API_KEY &&
      !process.env.GEMINI_API_KEY.startsWith("AIza")
    ) {
      this.log(
        VALIDATION_LEVELS.CRITICAL,
        "Invalid GEMINI_API_KEY format - must start with AIza",
      );
    }

    // Test backend health
    try {
      const response = await fetch("http://localhost:3001/api/diagnostics");
      if (!response.ok) {
        this.log(VALIDATION_LEVELS.CRITICAL, "Backend health check failed", {
          status: response.status,
          statusText: response.statusText,
        });
      } else {
        const diagnostics = await response.json();
        if (!diagnostics.sheets_ok) {
          this.log(VALIDATION_LEVELS.CRITICAL, "Sheets connection failed");
        }
        if (!diagnostics.ai_ready) {
          this.log(VALIDATION_LEVELS.WARNING, "AI service not ready");
        }
      }
    } catch (error) {
      this.log(VALIDATION_LEVELS.CRITICAL, "Failed to connect to backend", {
        error: error.message,
      });
    }
  }

  // Phase 1: Safety Configuration Validation
  validateSafetyConfiguration(config) {
    this.log(VALIDATION_LEVELS.INFO, "Validating safety configuration");

    // Validate feature flags
    const requiredFlags = {
      ENABLE_SCRIPT: true,
      FEATURE_INVENTORY_GUARD: true,
    };

    for (const [flag, expectedValue] of Object.entries(requiredFlags)) {
      if (config[flag] !== expectedValue) {
        this.log(VALIDATION_LEVELS.CRITICAL, `Invalid ${flag} setting`, {
          expected: expectedValue,
          actual: config[flag],
        });
      }
    }

    // PROMOTE should be FALSE initially
    if (config.PROMOTE === true || config.PROMOTE === "TRUE") {
      this.log(
        VALIDATION_LEVELS.CRITICAL,
        "PROMOTE must be FALSE during setup phase",
        {
          currentValue: config.PROMOTE,
        },
      );
    }
  }

  // Phase 2: Budget Safety Validation
  validateBudgetSafety(budgetCaps) {
    this.log(VALIDATION_LEVELS.INFO, "Validating budget safety caps");

    if (!budgetCaps || budgetCaps.length === 0) {
      this.log(VALIDATION_LEVELS.CRITICAL, "No budget caps configured");
      return;
    }

    for (const cap of budgetCaps) {
      const dailyBudget = parseFloat(cap);

      if (isNaN(dailyBudget)) {
        this.log(VALIDATION_LEVELS.CRITICAL, "Invalid budget cap format", {
          cap,
        });
        continue;
      }

      if (dailyBudget > SAFETY_LIMITS.MAX_DAILY_BUDGET) {
        this.log(
          VALIDATION_LEVELS.CRITICAL,
          "Budget cap exceeds safety limit",
          {
            cap: dailyBudget,
            maxAllowed: SAFETY_LIMITS.MAX_DAILY_BUDGET,
          },
        );
      }

      if (dailyBudget < 1.0) {
        this.log(
          VALIDATION_LEVELS.WARNING,
          "Budget cap very low - may limit meaningful testing",
          {
            cap: dailyBudget,
          },
        );
      }
    }
  }

  // Phase 3: CPC Safety Validation
  validateCPCSafety(cpcCeilings) {
    this.log(VALIDATION_LEVELS.INFO, "Validating CPC safety ceilings");

    if (!cpcCeilings || cpcCeilings.length === 0) {
      this.log(VALIDATION_LEVELS.CRITICAL, "No CPC ceilings configured");
      return;
    }

    for (const ceiling of cpcCeilings) {
      const maxCPC = parseFloat(ceiling);

      if (isNaN(maxCPC)) {
        this.log(VALIDATION_LEVELS.CRITICAL, "Invalid CPC ceiling format", {
          ceiling,
        });
        continue;
      }

      if (maxCPC > SAFETY_LIMITS.MAX_CPC_CEILING) {
        this.log(
          VALIDATION_LEVELS.CRITICAL,
          "CPC ceiling exceeds safety limit",
          {
            ceiling: maxCPC,
            maxAllowed: SAFETY_LIMITS.MAX_CPC_CEILING,
          },
        );
      }

      if (maxCPC < 0.05) {
        this.log(
          VALIDATION_LEVELS.WARNING,
          "CPC ceiling very low - may prevent ad serving",
          {
            ceiling: maxCPC,
          },
        );
      }
    }
  }

  // Phase 4: Schedule Safety Validation
  validateScheduleSafety(schedules) {
    this.log(VALIDATION_LEVELS.INFO, "Validating schedule safety");

    if (!schedules || schedules.length === 0) {
      this.log(VALIDATION_LEVELS.CRITICAL, "No schedule configured");
      return;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Check business hours (9AM-5PM)
    if (currentHour < 9 || currentHour >= 17) {
      this.log(
        VALIDATION_LEVELS.WARNING,
        "Canary scheduled outside business hours",
        {
          currentHour,
          recommendedHours: "9AM-5PM",
        },
      );
    }

    // Check weekday (Monday-Thursday preferred)
    if (currentDay === 0 || currentDay === 5 || currentDay === 6) {
      this.log(
        VALIDATION_LEVELS.WARNING,
        "Canary scheduled on weekend or Friday",
        {
          currentDay: [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ][currentDay],
          recommendedDays: "Monday-Thursday",
        },
      );
    }

    // Validate duration
    for (const schedule of schedules) {
      const parts = schedule.split(" ");
      if (parts.length >= 3) {
        const duration = parseInt(parts[2]);

        if (isNaN(duration)) {
          this.log(
            VALIDATION_LEVELS.CRITICAL,
            "Invalid schedule duration format",
            { schedule },
          );
          continue;
        }

        if (duration > SAFETY_LIMITS.MAX_WINDOW_MINUTES) {
          this.log(
            VALIDATION_LEVELS.CRITICAL,
            "Schedule duration exceeds safety limit",
            {
              duration,
              maxAllowed: SAFETY_LIMITS.MAX_WINDOW_MINUTES,
            },
          );
        }

        if (duration < 30) {
          this.log(
            VALIDATION_LEVELS.WARNING,
            "Schedule duration very short for meaningful testing",
            {
              duration,
              recommendedMinimum: 60,
            },
          );
        }
      }
    }
  }

  // Phase 5: Campaign Exclusions Validation
  validateCampaignExclusions(exclusions, campaignName) {
    this.log(VALIDATION_LEVELS.INFO, "Validating campaign exclusions");

    if (!exclusions || exclusions.length === 0) {
      this.log(
        VALIDATION_LEVELS.WARNING,
        "No campaign exclusions configured - all campaigns may be affected",
      );
      return;
    }

    // Check if canary campaign is in exclusions (it shouldn't be)
    const excludedCampaigns = exclusions
      .join(",")
      .split(",")
      .map((c) => c.trim());

    if (excludedCampaigns.includes(campaignName)) {
      this.log(
        VALIDATION_LEVELS.CRITICAL,
        "Canary campaign found in exclusions list",
        {
          campaignName,
          exclusions: excludedCampaigns,
        },
      );
    }

    if (excludedCampaigns.length === 0) {
      this.log(
        VALIDATION_LEVELS.WARNING,
        "No campaigns excluded - ALL campaigns will be affected",
      );
    }
  }

  // Phase 6: Audience Safety Validation
  validateAudienceSafety(audienceMap) {
    this.log(VALIDATION_LEVELS.INFO, "Validating audience attachment safety");

    if (!audienceMap || audienceMap.length === 0) {
      this.log(
        VALIDATION_LEVELS.INFO,
        "No audience mapping configured - test will run without audience targeting",
      );
      return;
    }

    for (const mapping of audienceMap) {
      // Validate mode is OBSERVE for canary
      if (mapping.mode !== "OBSERVE") {
        this.log(
          VALIDATION_LEVELS.CRITICAL,
          "Audience mode must be OBSERVE for canary testing",
          {
            currentMode: mapping.mode,
            requiredMode: "OBSERVE",
          },
        );
      }

      // Validate bid modifier is reasonable
      const bidMod = parseFloat(mapping.bid_modifier || "0");
      if (Math.abs(bidMod) > 0.25) {
        this.log(
          VALIDATION_LEVELS.WARNING,
          "Large bid modifier may skew canary results",
          {
            bidModifier: bidMod,
            recommendedRange: "-0.25 to +0.25",
          },
        );
      }

      // Validate user list ID format
      if (!mapping.user_list_id || !/^\d+$/.test(mapping.user_list_id)) {
        this.log(VALIDATION_LEVELS.CRITICAL, "Invalid user list ID format", {
          userListId: mapping.user_list_id,
          expectedFormat: "numbers only",
        });
      }
    }
  }

  // Phase 7: Promote Window Validation
  validatePromoteWindow(windowConfig) {
    this.log(VALIDATION_LEVELS.INFO, "Validating promote window configuration");

    if (!windowConfig) {
      this.log(VALIDATION_LEVELS.CRITICAL, "No promote window configured");
      return;
    }

    const now = Date.now();
    const startTime = this.parseStartTime(windowConfig.start_at);
    const duration = parseInt(windowConfig.duration_minutes || "60");

    // Check start time buffer
    const bufferMinutes = (startTime - now) / (1000 * 60);
    if (bufferMinutes < SAFETY_LIMITS.REQUIRED_BUFFER_MINUTES) {
      this.log(
        VALIDATION_LEVELS.WARNING,
        "Insufficient buffer time before window start",
        {
          bufferMinutes: Math.round(bufferMinutes),
          recommendedMinimum: SAFETY_LIMITS.REQUIRED_BUFFER_MINUTES,
        },
      );
    }

    // Check duration
    if (duration > SAFETY_LIMITS.MAX_WINDOW_MINUTES) {
      this.log(
        VALIDATION_LEVELS.CRITICAL,
        "Window duration exceeds safety limit",
        {
          duration,
          maxAllowed: SAFETY_LIMITS.MAX_WINDOW_MINUTES,
        },
      );
    }

    // Check end time is in business hours
    const endTime = new Date(startTime + duration * 60 * 1000);
    if (endTime.getHours() >= 18) {
      this.log(
        VALIDATION_LEVELS.WARNING,
        "Window may extend beyond business hours",
        {
          endTime: endTime.toLocaleString(),
        },
      );
    }
  }

  parseStartTime(startString) {
    if (!startString) return Date.now();

    if (startString.startsWith("now+")) {
      const match = startString.match(/now\+(\d+)m/i);
      if (match) {
        return Date.now() + parseInt(match[1]) * 60 * 1000;
      }
    }

    const parsed = Date.parse(startString);
    return isFinite(parsed) ? parsed : Date.now();
  }

  // Comprehensive validation runner
  async runFullValidation(configData) {
    this.log(
      VALIDATION_LEVELS.INFO,
      `Starting comprehensive canary validation for tenant: ${this.tenant}`,
    );

    try {
      // Phase 0: Environment
      await this.validateEnvironment();

      // Phase 1: Safety Configuration
      this.validateSafetyConfiguration(configData.config || {});

      // Phase 2: Budget Safety
      this.validateBudgetSafety(configData.budgetCaps || []);

      // Phase 3: CPC Safety
      this.validateCPCSafety(configData.cpcCeilings || []);

      // Phase 4: Schedule Safety
      this.validateScheduleSafety(configData.schedules || []);

      // Phase 5: Campaign Exclusions
      this.validateCampaignExclusions(
        configData.exclusions || [],
        configData.campaignName,
      );

      // Phase 6: Audience Safety
      this.validateAudienceSafety(configData.audienceMap || []);

      // Phase 7: Promote Window
      this.validatePromoteWindow(configData.promoteWindow);
    } catch (error) {
      this.log(
        VALIDATION_LEVELS.CRITICAL,
        "Validation process failed with error",
        {
          error: error.message,
          stack: error.stack,
        },
      );
    }

    return this.generateValidationReport();
  }

  generateValidationReport() {
    const executionTime = Date.now() - this.startTime;

    const report = {
      tenant: this.tenant,
      timestamp: new Date().toISOString(),
      executionTimeMs: executionTime,
      summary: {
        totalChecks: this.validationResults.length,
        criticalErrors: this.criticalErrors.length,
        warnings: this.warnings.length,
        passed: this.criticalErrors.length === 0,
      },
      criticalErrors: this.criticalErrors,
      warnings: this.warnings,
      allResults: this.validationResults,
      recommendation: this.generateRecommendation(),
    };

    return report;
  }

  generateRecommendation() {
    if (this.criticalErrors.length > 0) {
      return {
        action: "ABORT",
        reason: "Critical safety violations detected",
        nextSteps: [
          "Review and fix all critical errors",
          "Re-run validation before proceeding",
          "Ensure all safety limits are respected",
        ],
      };
    }

    if (this.warnings.length > 5) {
      return {
        action: "REVIEW",
        reason: "Multiple warnings detected",
        nextSteps: [
          "Review all warnings carefully",
          "Consider adjusting configuration",
          "Proceed with extra caution",
        ],
      };
    }

    if (this.warnings.length > 0) {
      return {
        action: "PROCEED_WITH_CAUTION",
        reason: "Minor warnings detected",
        nextSteps: [
          "Review warnings",
          "Monitor closely during execution",
          "Have rollback plan ready",
        ],
      };
    }

    return {
      action: "PROCEED",
      reason: "All safety validations passed",
      nextSteps: [
        "Execute canary test",
        "Monitor performance closely",
        "Be ready for immediate rollback if needed",
      ],
    };
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const tenant = process.argv[2];
  const configFile = process.argv[3];

  if (!tenant) {
    console.error("Usage: node canary-validation.js <tenant> [config-file]");
    process.exit(1);
  }

  const validator = new CanaryValidator(tenant);

  let configData = {};
  if (configFile && fs.existsSync(configFile)) {
    try {
      configData = JSON.parse(fs.readFileSync(configFile, "utf8"));
    } catch (error) {
      console.error("Failed to parse config file:", error.message);
      process.exit(1);
    }
  }

  validator
    .runFullValidation(configData)
    .then((report) => {
      console.log("\n=== VALIDATION REPORT ===");
      console.log(JSON.stringify(report, null, 2));

      if (report.summary.passed) {
        console.log("\n✅ VALIDATION PASSED - Safe to proceed with canary");
        process.exit(0);
      } else {
        console.log("\n❌ VALIDATION FAILED - Cannot proceed safely");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("Validation failed:", error);
      process.exit(1);
    });
}

export { CanaryValidator, SAFETY_LIMITS, VALIDATION_LEVELS };
