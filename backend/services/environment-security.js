#!/usr/bin/env node

/**
 * ProofKit Environment Security Service
 *
 * Prevents environment bypass attacks by implementing deployment-time
 * environment locking and runtime validation.
 *
 * CRITICAL SECURITY: This service prevents attackers from bypassing
 * PROMOTE gates by simply setting NODE_ENV=development at runtime.
 */

import logger from "./logger.js";

class EnvironmentSecurity {
  constructor() {
    // Lock environment at startup to prevent runtime manipulation
    this.startupEnv = process.env.NODE_ENV || "development";
    this.deploymentEnv = process.env.DEPLOYMENT_ENVIRONMENT || this.startupEnv;
    this.isProductionDeployment = this.deploymentEnv === "production";
    this.startupTime = Date.now();

    // Validate environment consistency at startup
    this.validateEnvironmentConsistency();

    // Lock critical environment variables
    this.lockEnvironment();

    logger.info("Environment Security initialized", {
      startupEnv: this.startupEnv,
      deploymentEnv: this.deploymentEnv,
      isProductionDeployment: this.isProductionDeployment,
      startupTime: this.startupTime,
    });
  }

  /**
   * Validates that environment variables are consistent and secure
   */
  validateEnvironmentConsistency() {
    const currentNodeEnv = process.env.NODE_ENV || "development";

    // Critical: Detect if NODE_ENV has been changed after startup
    if (this.startupEnv !== currentNodeEnv) {
      logger.error("SECURITY ALERT: NODE_ENV manipulation detected", {
        startupEnv: this.startupEnv,
        currentNodeEnv: currentNodeEnv,
        timeSinceStartup: Date.now() - this.startupTime,
      });

      throw new Error(
        "Environment manipulation detected - process terminating for security",
      );
    }

    // Validate deployment environment
    if (
      this.deploymentEnv &&
      !["development", "staging", "production"].includes(this.deploymentEnv)
    ) {
      throw new Error(`Invalid DEPLOYMENT_ENVIRONMENT: ${this.deploymentEnv}`);
    }

    // Production deployment must have NODE_ENV=production
    if (
      this.deploymentEnv === "production" &&
      this.startupEnv !== "production"
    ) {
      logger.error(
        "SECURITY ALERT: Production deployment with non-production NODE_ENV",
        {
          deploymentEnv: this.deploymentEnv,
          nodeEnv: this.startupEnv,
        },
      );

      throw new Error("Production deployment requires NODE_ENV=production");
    }
  }

  /**
   * Locks critical environment variables to prevent runtime changes
   */
  lockEnvironment() {
    // Log that environment is locked (can't actually modify process.env properties)
    console.log("🔒 Environment variables locked at startup values");
    console.log(`📌 NODE_ENV locked: ${this.startupEnv}`);
    console.log(`📌 DEPLOYMENT_ENVIRONMENT locked: ${this.deploymentEnv}`);

    // Store locked values for validation instead of modifying process.env
    this.lockedValues = {
      NODE_ENV: this.startupEnv,
      DEPLOYMENT_ENVIRONMENT: this.deploymentEnv,
    };

    logger.info("Environment variables locked", {
      lockedNodeEnv: this.startupEnv,
      immutableDeploymentEnv: this.deploymentEnv,
    });
  }

  /**
   * Checks if current execution context is in a production deployment
   * This cannot be bypassed by NODE_ENV manipulation
   */
  isProductionExecution() {
    // Always use DEPLOYMENT_ENVIRONMENT for production checks
    // This prevents NODE_ENV bypass attacks
    return this.deploymentEnv === "production";
  }

  /**
   * Checks if current execution context allows development features
   * Safe for Shopify test accounts
   */
  isTestingAllowed() {
    // Allow testing in development or staging deployments
    // BUT NOT in production deployments (even with Shopify test accounts)
    return this.deploymentEnv !== "production";
  }

  /**
   * Checks if execution is in a safe development context
   * for Shopify test account compatibility
   */
  isShopifyTestSafe() {
    // Allow safe testing features that don't affect real production data
    // This enables testing with Shopify test accounts
    const isTestDeployment = ["development", "staging"].includes(
      this.deploymentEnv,
    );
    const hasTestAccountMarkers = this.checkShopifyTestAccountMarkers();

    return isTestDeployment || hasTestAccountMarkers;
  }

  /**
   * Checks for Shopify test account markers
   */
  checkShopifyTestAccountMarkers() {
    // Check for common Shopify test account patterns
    const shopifyUrl = process.env.SHOPIFY_APP_URL || "";
    const tenantId = process.env.TENANT_ID || "";

    const testMarkers = [
      "test-",
      "dev-",
      "staging-",
      ".myshopify.io.test",
      "test.myshopify.com",
    ];

    return testMarkers.some(
      (marker) => shopifyUrl.includes(marker) || tenantId.includes(marker),
    );
  }

  /**
   * Gets environment information for security logging
   */
  getEnvironmentInfo() {
    return {
      startupEnv: this.startupEnv,
      deploymentEnv: this.deploymentEnv,
      isProductionDeployment: this.isProductionDeployment,
      isProductionExecution: this.isProductionExecution(),
      isTestingAllowed: this.isTestingAllowed(),
      isShopifyTestSafe: this.isShopifyTestSafe(),
      startupTime: this.startupTime,
      runtimeSecs: Math.floor((Date.now() - this.startupTime) / 1000),
    };
  }

  /**
   * Runtime environment drift detection
   */
  detectEnvironmentDrift() {
    try {
      this.validateEnvironmentConsistency();
      return { ok: true, drift: false };
    } catch (error) {
      logger.error("Environment drift detected", {
        error: error.message,
        environmentInfo: this.getEnvironmentInfo(),
      });

      return {
        ok: false,
        drift: true,
        error: error.message,
      };
    }
  }

  /**
   * Secure PROMOTE gate validation that cannot be bypassed
   */
  validateSecurePromoteGate(tenant, mutationType = "GENERAL") {
    const envInfo = this.getEnvironmentInfo();

    // CRITICAL: Never bypass PROMOTE gates in production deployments
    if (this.isProductionExecution()) {
      logger.info(
        "Secure PROMOTE Gate: Production deployment - full validation required",
        {
          tenant,
          mutationType,
          environmentInfo: envInfo,
        },
      );

      return {
        bypassAllowed: false,
        requiresPromoteTrue: true,
        reason: "production_deployment_security",
      };
    }

    // For Shopify test accounts in safe contexts
    if (this.isShopifyTestSafe()) {
      logger.info(
        "Secure PROMOTE Gate: Shopify test safe context - limited bypass allowed",
        {
          tenant,
          mutationType,
          environmentInfo: envInfo,
        },
      );

      return {
        bypassAllowed: true,
        requiresPromoteTrue: false,
        reason: "shopify_test_safe_context",
        limitations: ["read_only_preferred", "audit_all_mutations"],
      };
    }

    // Development/staging deployment
    logger.info(
      "Secure PROMOTE Gate: Development deployment - bypass allowed with audit",
      {
        tenant,
        mutationType,
        environmentInfo: envInfo,
      },
    );

    return {
      bypassAllowed: true,
      requiresPromoteTrue: false,
      reason: "development_deployment",
      limitations: ["audit_required", "non_production_only"],
    };
  }
}

// Singleton instance
const environmentSecurity = new EnvironmentSecurity();

export default environmentSecurity;
export { EnvironmentSecurity };
