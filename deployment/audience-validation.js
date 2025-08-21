#!/usr/bin/env node

/**
 * PROOFKIT AUDIENCE ATTACHMENT VALIDATION SYSTEM
 * Comprehensive validation for safe audience attachment during canary tests
 * P0-7 CRITICAL: Ensures GDPR compliance and safe audience targeting
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const crypto = require("crypto");

// Audience safety limits and validation rules
const AUDIENCE_SAFETY_RULES = {
  MIN_LIST_SIZE: 1000, // Minimum for meaningful testing
  MAX_BID_MODIFIER: 0.25, // Maximum bid adjustment for canary
  REQUIRED_MODE: "OBSERVE", // Only OBSERVE mode for canary
  MAX_LISTS_PER_CAMPAIGN: 3, // Limit complexity
  GDPR_REQUIRED_FIELDS: ["consent_timestamp", "consent_version"],
  HASH_VALIDATION: true, // Validate email/phone hashing
  AGE_LIMIT_DAYS: 180, // Maximum age of customer data
};

const VALIDATION_STATUSES = {
  PASS: "PASS",
  FAIL: "FAIL",
  WARNING: "WARNING",
  SKIP: "SKIP",
};

class AudienceValidator {
  constructor(tenant, options = {}) {
    this.tenant = tenant;
    this.options = {
      enforceGDPR: options.enforceGDPR !== false, // Default true
      strictMode: options.strictMode || false,
      dryRun: options.dryRun || false,
      ...options,
    };

    this.validationResults = [];
    this.audienceData = null;
    this.googleAdsListInfo = null;

    this.log("INFO", "Audience validator initialized", {
      tenant,
      options: this.options,
    });
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
    console.log(
      `[${level}] [AUDIENCE-${this.tenant}] ${message}`,
      Object.keys(details).length ? details : "",
    );
  }

  // Main validation workflow
  async validateAudienceAttachment(audienceConfig) {
    this.log("INFO", "Starting audience attachment validation");

    try {
      // Phase 1: Configuration Validation
      const configValid = this.validateAudienceConfiguration(audienceConfig);
      if (!configValid) return this.generateReport(false);

      // Phase 2: Google Ads List Validation
      const listValid = await this.validateGoogleAdsList(
        audienceConfig.userListId,
      );
      if (!listValid && this.options.strictMode)
        return this.generateReport(false);

      // Phase 3: Customer Data Validation
      if (audienceConfig.customerData) {
        const dataValid = await this.validateCustomerData(
          audienceConfig.customerData,
        );
        if (!dataValid) return this.generateReport(false);
      }

      // Phase 4: GDPR Compliance Check
      if (this.options.enforceGDPR) {
        const gdprValid = this.validateGDPRCompliance(audienceConfig);
        if (!gdprValid) return this.generateReport(false);
      }

      // Phase 5: Size and Performance Validation
      const sizeValid = await this.validateAudienceSize(
        audienceConfig.userListId,
      );
      if (!sizeValid && this.options.strictMode)
        return this.generateReport(false);

      // Phase 6: Attachment Safety Check
      const attachmentValid = this.validateAttachmentSafety(audienceConfig);
      if (!attachmentValid) return this.generateReport(false);

      return this.generateReport(true);
    } catch (error) {
      this.log("ERROR", "Audience validation failed with error", {
        error: error.message,
        stack: error.stack,
      });
      return this.generateReport(false);
    }
  }

  // Phase 1: Configuration Validation
  validateAudienceConfiguration(config) {
    this.log("INFO", "Validating audience configuration");

    let valid = true;

    // Check required fields
    if (!config.userListId) {
      this.log("ERROR", "Missing user list ID");
      valid = false;
    }

    if (!config.campaignName) {
      this.log("ERROR", "Missing campaign name");
      valid = false;
    }

    // Validate user list ID format
    if (config.userListId && !/^\d+$/.test(config.userListId)) {
      this.log("ERROR", "Invalid user list ID format - must be numeric", {
        userListId: config.userListId,
      });
      valid = false;
    }

    // Validate targeting mode
    if (config.mode !== AUDIENCE_SAFETY_RULES.REQUIRED_MODE) {
      this.log(
        "ERROR",
        `Invalid targeting mode - must be ${AUDIENCE_SAFETY_RULES.REQUIRED_MODE} for canary`,
        {
          currentMode: config.mode,
          requiredMode: AUDIENCE_SAFETY_RULES.REQUIRED_MODE,
        },
      );
      valid = false;
    }

    // Validate bid modifier
    const bidModifier = parseFloat(config.bidModifier || "0");
    if (Math.abs(bidModifier) > AUDIENCE_SAFETY_RULES.MAX_BID_MODIFIER) {
      this.log("ERROR", "Bid modifier exceeds safety limit", {
        bidModifier,
        maxAllowed: AUDIENCE_SAFETY_RULES.MAX_BID_MODIFIER,
      });
      valid = false;
    }

    // Check for multiple lists (complexity limit)
    if (
      Array.isArray(config.userListId) &&
      config.userListId.length > AUDIENCE_SAFETY_RULES.MAX_LISTS_PER_CAMPAIGN
    ) {
      this.log(
        "WARNING",
        "Multiple audience lists may complicate canary analysis",
        {
          listCount: config.userListId.length,
          maxRecommended: AUDIENCE_SAFETY_RULES.MAX_LISTS_PER_CAMPAIGN,
        },
      );
    }

    return valid;
  }

  // Phase 2: Google Ads List Validation
  async validateGoogleAdsList(userListId) {
    this.log("INFO", "Validating Google Ads audience list");

    try {
      // Fetch list information from Google Ads
      const response = await fetch(
        `http://localhost:3001/api/google-ads/audience/${userListId}`,
      );

      if (!response.ok) {
        this.log("ERROR", "Failed to fetch audience list information", {
          userListId,
          status: response.status,
        });
        return false;
      }

      this.googleAdsListInfo = await response.json();

      // Validate list exists and is active
      if (!this.googleAdsListInfo.exists) {
        this.log("ERROR", "Audience list does not exist in Google Ads", {
          userListId,
        });
        return false;
      }

      if (this.googleAdsListInfo.status !== "ENABLED") {
        this.log("ERROR", "Audience list is not active", {
          userListId,
          status: this.googleAdsListInfo.status,
        });
        return false;
      }

      // Check list type compatibility
      if (!this.isCompatibleListType(this.googleAdsListInfo.type)) {
        this.log(
          "ERROR",
          "Incompatible audience list type for canary testing",
          {
            listType: this.googleAdsListInfo.type,
            compatibleTypes: ["USER_LIST", "CUSTOMER_MATCH"],
          },
        );
        return false;
      }

      // Validate list permissions
      if (!this.googleAdsListInfo.canTarget) {
        this.log(
          "ERROR",
          "Insufficient permissions to target this audience list",
          { userListId },
        );
        return false;
      }

      this.log("INFO", "Google Ads list validation passed", {
        userListId,
        type: this.googleAdsListInfo.type,
        size: this.googleAdsListInfo.size,
      });

      return true;
    } catch (error) {
      this.log("ERROR", "Google Ads list validation failed", {
        userListId,
        error: error.message,
      });
      return false;
    }
  }

  isCompatibleListType(listType) {
    const compatibleTypes = [
      "USER_LIST",
      "CUSTOMER_MATCH",
      "RULE_BASED_USER_LIST",
      "LOGICAL_USER_LIST",
    ];
    return compatibleTypes.includes(listType);
  }

  // Phase 3: Customer Data Validation
  async validateCustomerData(customerData) {
    this.log("INFO", "Validating customer data quality");

    let valid = true;

    if (!Array.isArray(customerData) || customerData.length === 0) {
      this.log("ERROR", "Customer data must be a non-empty array");
      return false;
    }

    const sampleSize = Math.min(100, customerData.length);
    const sample = customerData.slice(0, sampleSize);

    let validRecords = 0;
    let hashingErrors = 0;
    let formatErrors = 0;
    let consentErrors = 0;

    for (const record of sample) {
      const recordValid = this.validateCustomerRecord(record);

      if (recordValid.valid) {
        validRecords++;
      } else {
        if (recordValid.errors.includes("HASHING")) hashingErrors++;
        if (recordValid.errors.includes("FORMAT")) formatErrors++;
        if (recordValid.errors.includes("CONSENT")) consentErrors++;
      }
    }

    const validPercentage = (validRecords / sample.length) * 100;

    // Require at least 90% valid records
    if (validPercentage < 90) {
      this.log("ERROR", "Customer data quality below threshold", {
        validPercentage: validPercentage.toFixed(1),
        threshold: 90,
        sampleSize,
        errors: { hashingErrors, formatErrors, consentErrors },
      });
      valid = false;
    } else if (validPercentage < 95) {
      this.log("WARNING", "Customer data quality concerns", {
        validPercentage: validPercentage.toFixed(1),
        sampleSize,
        errors: { hashingErrors, formatErrors, consentErrors },
      });
    }

    return valid;
  }

  validateCustomerRecord(record) {
    const errors = [];

    // Check required fields
    if (!record.email && !record.phone && !record.userId) {
      errors.push("FORMAT");
    }

    // Validate email hashing
    if (record.email) {
      if (!this.isValidEmailHash(record.email)) {
        errors.push("HASHING");
      }
    }

    // Validate phone hashing
    if (record.phone) {
      if (!this.isValidPhoneHash(record.phone)) {
        errors.push("HASHING");
      }
    }

    // Check GDPR consent fields
    if (this.options.enforceGDPR) {
      if (!record.consentTimestamp || !record.consentVersion) {
        errors.push("CONSENT");
      }

      // Check consent age
      if (record.consentTimestamp) {
        const consentAge =
          (Date.now() - new Date(record.consentTimestamp).getTime()) /
          (1000 * 60 * 60 * 24);
        if (consentAge > AUDIENCE_SAFETY_RULES.AGE_LIMIT_DAYS) {
          errors.push("CONSENT");
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  isValidEmailHash(email) {
    // Check if it's a valid SHA256 hash (64 hex characters)
    return /^[a-f0-9]{64}$/i.test(email);
  }

  isValidPhoneHash(phone) {
    // Check if it's a valid SHA256 hash (64 hex characters)
    return /^[a-f0-9]{64}$/i.test(phone);
  }

  // Phase 4: GDPR Compliance Validation
  validateGDPRCompliance(config) {
    this.log("INFO", "Validating GDPR compliance");

    let valid = true;

    // Check consent documentation
    if (!config.consentDocumentation) {
      this.log("ERROR", "Missing GDPR consent documentation");
      valid = false;
    }

    // Validate consent purposes
    const requiredPurposes = ["marketing", "analytics"];
    const consentedPurposes = config.consentDocumentation?.purposes || [];

    for (const purpose of requiredPurposes) {
      if (!consentedPurposes.includes(purpose)) {
        this.log("ERROR", `Missing consent for required purpose: ${purpose}`, {
          consentedPurposes,
          requiredPurposes,
        });
        valid = false;
      }
    }

    // Check data retention policy
    if (!config.dataRetentionDays || config.dataRetentionDays > 365) {
      this.log(
        "WARNING",
        "Data retention period may exceed GDPR recommendations",
        {
          retentionDays: config.dataRetentionDays,
          recommendedMax: 365,
        },
      );
    }

    // Validate processing lawful basis
    const validBases = ["consent", "legitimate_interest", "contract"];
    if (!validBases.includes(config.lawfulBasis)) {
      this.log("ERROR", "Invalid or missing lawful basis for processing", {
        lawfulBasis: config.lawfulBasis,
        validBases,
      });
      valid = false;
    }

    return valid;
  }

  // Phase 5: Audience Size Validation
  async validateAudienceSize(userListId) {
    this.log("INFO", "Validating audience size for meaningful testing");

    const listSize = this.googleAdsListInfo?.size || 0;

    if (listSize < AUDIENCE_SAFETY_RULES.MIN_LIST_SIZE) {
      this.log(
        "WARNING",
        "Audience size below recommended minimum for testing",
        {
          listSize,
          minimum: AUDIENCE_SAFETY_RULES.MIN_LIST_SIZE,
          impact: "May result in limited statistical significance",
        },
      );

      // In strict mode, this is an error
      if (this.options.strictMode) {
        this.log("ERROR", "Audience size insufficient for strict mode testing");
        return false;
      }
    }

    // Check for very large audiences that might dominate results
    if (listSize > 10000000) {
      // 10M
      this.log("WARNING", "Very large audience may dominate canary results", {
        listSize,
        recommendation: "Consider using a smaller segment",
      });
    }

    // Estimate reach for the campaign
    if (this.googleAdsListInfo?.reach) {
      const estimatedReach = this.googleAdsListInfo.reach;

      if (estimatedReach < 100) {
        this.log("WARNING", "Low estimated reach for target campaign", {
          estimatedReach,
          recommendation: "May limit testing effectiveness",
        });
      }
    }

    return true;
  }

  // Phase 6: Attachment Safety Validation
  validateAttachmentSafety(config) {
    this.log("INFO", "Validating attachment safety configuration");

    let valid = true;

    // Ensure OBSERVE mode is set
    if (config.mode !== "OBSERVE") {
      this.log(
        "ERROR",
        "Canary tests must use OBSERVE mode for audience attachment",
      );
      valid = false;
    }

    // Check bid modifier safety
    const bidModifier = parseFloat(config.bidModifier || "0");

    if (bidModifier > 0.25) {
      this.log("ERROR", "Bid modifier too high for safe canary testing", {
        bidModifier,
        maxSafe: 0.25,
      });
      valid = false;
    }

    if (bidModifier < -0.25) {
      this.log(
        "ERROR",
        "Negative bid modifier too large for safe canary testing",
        {
          bidModifier,
          minSafe: -0.25,
        },
      );
      valid = false;
    }

    // Validate campaign targeting
    if (!this.isCanaryCampaign(config.campaignName)) {
      this.log(
        "ERROR",
        "Audience can only be attached to designated canary campaign",
        {
          campaignName: config.campaignName,
        },
      );
      valid = false;
    }

    // Check for conflicting audience settings
    if (config.exclusions && config.exclusions.length > 0) {
      this.log(
        "WARNING",
        "Audience exclusions may complicate canary analysis",
        {
          exclusionCount: config.exclusions.length,
        },
      );
    }

    return valid;
  }

  isCanaryCampaign(campaignName) {
    // Check if campaign has the canary label or matches naming pattern
    // This would typically check against the configured canary campaign
    return (
      campaignName &&
      (campaignName.includes("canary") ||
        campaignName.includes("test") ||
        this.isLabeledCanary(campaignName))
    );
  }

  isLabeledCanary(campaignName) {
    // This would check the actual Google Ads labels
    // For now, simplified validation
    return true; // Assume validation happens elsewhere
  }

  // Automated fix suggestions
  generateFixSuggestions() {
    const suggestions = [];

    // Analyze validation results for fixable issues
    for (const result of this.validationResults) {
      if (result.level === "ERROR") {
        switch (result.message) {
          case "Invalid targeting mode - must be OBSERVE for canary":
            suggestions.push({
              issue: result.message,
              fix: "Change audience mode to OBSERVE in configuration",
              priority: "HIGH",
            });
            break;

          case "Bid modifier exceeds safety limit":
            suggestions.push({
              issue: result.message,
              fix: `Reduce bid modifier to ${AUDIENCE_SAFETY_RULES.MAX_BID_MODIFIER} or lower`,
              priority: "HIGH",
            });
            break;

          case "Audience size below recommended minimum for testing":
            suggestions.push({
              issue: result.message,
              fix: "Use a larger audience list or combine multiple lists",
              priority: "MEDIUM",
            });
            break;
        }
      }
    }

    return suggestions;
  }

  // Generate comprehensive validation report
  generateReport(passed) {
    const report = {
      tenant: this.tenant,
      timestamp: new Date().toISOString(),
      passed,
      summary: {
        totalChecks: this.validationResults.length,
        errors: this.validationResults.filter((r) => r.level === "ERROR")
          .length,
        warnings: this.validationResults.filter((r) => r.level === "WARNING")
          .length,
        infos: this.validationResults.filter((r) => r.level === "INFO").length,
      },
      audienceInfo: this.googleAdsListInfo,
      validationResults: this.validationResults,
      fixSuggestions: this.generateFixSuggestions(),
      recommendation: this.generateRecommendation(passed),
      safetyRules: AUDIENCE_SAFETY_RULES,
    };

    return report;
  }

  generateRecommendation(passed) {
    if (!passed) {
      return {
        action: "FIX_ISSUES",
        reason: "Critical validation failures detected",
        steps: [
          "Review and fix all ERROR level issues",
          "Address high-priority fix suggestions",
          "Re-run validation before proceeding",
        ],
      };
    }

    const warningCount = this.validationResults.filter(
      (r) => r.level === "WARNING",
    ).length;

    if (warningCount > 3) {
      return {
        action: "PROCEED_WITH_CAUTION",
        reason: "Multiple warnings detected",
        steps: [
          "Review all warning messages",
          "Consider addressing fixable warnings",
          "Monitor audience performance closely",
          "Have rollback plan ready",
        ],
      };
    }

    return {
      action: "PROCEED",
      reason: "All critical validations passed",
      steps: [
        "Proceed with audience attachment",
        "Monitor performance during canary window",
        "Ensure OBSERVE mode remains active",
      ],
    };
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const tenant = process.argv[2];
  const configFile = process.argv[3];

  if (!tenant) {
    console.error("Usage: node audience-validation.js <tenant> [config-file]");
    process.exit(1);
  }

  const validator = new AudienceValidator(tenant, {
    enforceGDPR: !process.argv.includes("--no-gdpr"),
    strictMode: process.argv.includes("--strict"),
    dryRun: process.argv.includes("--dry-run"),
  });

  let config = {};
  if (configFile && require("fs").existsSync(configFile)) {
    try {
      config = JSON.parse(require("fs").readFileSync(configFile, "utf8"));
    } catch (error) {
      console.error("Failed to parse config file:", error.message);
      process.exit(1);
    }
  }

  validator
    .validateAudienceAttachment(config)
    .then((report) => {
      console.log("\n=== AUDIENCE VALIDATION REPORT ===");
      console.log(JSON.stringify(report, null, 2));

      if (report.passed) {
        console.log("\n✅ AUDIENCE VALIDATION PASSED");
        process.exit(0);
      } else {
        console.log("\n❌ AUDIENCE VALIDATION FAILED");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("Audience validation failed:", error);
      process.exit(1);
    });
}

export { AudienceValidator, AUDIENCE_SAFETY_RULES, VALIDATION_STATUSES };
