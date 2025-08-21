/**
 * ProofKit SaaS Environment Management
 * Comprehensive environment validation and configuration system
 * Handles production, staging, and development environments
 */

import { config } from "dotenv";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Environment configuration schema
 */
const ENV_SCHEMA = {
  // Core application settings
  NODE_ENV: {
    required: true,
    type: "string",
    allowed: ["development", "staging", "production"],
    default: "development",
  },
  PORT: {
    required: true,
    type: "number",
    default: 3000,
    validate: (value) => value > 0 && value < 65536,
  },
  HOST: {
    required: false,
    type: "string",
    default: "0.0.0.0",
  },

  // Database and storage
  GOOGLE_SHEETS_PRIVATE_KEY: {
    required: true,
    type: "string",
    sensitive: true,
  },
  GOOGLE_SHEETS_CLIENT_EMAIL: {
    required: true,
    type: "string",
    validate: (value) =>
      value.includes("@") && value.includes(".iam.gserviceaccount.com"),
  },
  GOOGLE_SHEETS_PROJECT_ID: {
    required: true,
    type: "string",
  },

  // API Keys and External Services
  GEMINI_API_KEY: {
    required: true,
    type: "string",
    sensitive: true,
    validate: (value) => value.startsWith("AIza") && value.length > 30,
  },
  SHOPIFY_API_KEY: {
    required: false,
    type: "string",
    sensitive: false, // Not sensitive - just an API identifier
  },
  SHOPIFY_API_SECRET: {
    required: false,
    type: "string",
    sensitive: false, // Optional for deployment flexibility
  },

  // Security settings
  HMAC_SECRET: {
    required: true,
    type: "string",
    sensitive: true,
    validate: (value) => value.length >= 32,
  },
  CORS_ORIGIN: {
    required: false,
    type: "string",
    default: "*",
  },
  RATE_LIMIT_WINDOW_MS: {
    required: false,
    type: "number",
    default: 900000, // 15 minutes
  },
  RATE_LIMIT_MAX_REQUESTS: {
    required: false,
    type: "number",
    default: 100,
  },

  // Performance and scaling
  CACHE_TTL: {
    required: false,
    type: "number",
    default: 300000, // 5 minutes
  },
  MAX_CONCURRENT_REQUESTS: {
    required: false,
    type: "number",
    default: 50,
  },
  REQUEST_TIMEOUT: {
    required: false,
    type: "number",
    default: 30000, // 30 seconds
  },

  // Monitoring and logging
  LOG_LEVEL: {
    required: false,
    type: "string",
    allowed: ["error", "warn", "info", "debug"],
    default: "info",
  },
  ENABLE_REQUEST_LOGGING: {
    required: false,
    type: "boolean",
    default: true,
  },
  METRICS_ENABLED: {
    required: false,
    type: "boolean",
    default: true,
  },

  // Health check settings
  HEALTH_CHECK_INTERVAL: {
    required: false,
    type: "number",
    default: 30000, // 30 seconds
  },
  HEALTH_CHECK_TIMEOUT: {
    required: false,
    type: "number",
    default: 5000, // 5 seconds
  },
};

/**
 * Environment Manager Class
 */
class EnvironmentManager {
  constructor() {
    this.env = {};
    this.errors = [];
    this.warnings = [];
    this.isProduction = false;
    this.isValidated = false;
  }

  /**
   * Load environment variables from multiple sources
   */
  loadEnvironment() {
    // Load from .env files in order of precedence
    const envFiles = [".env.local", `.env.${process.env.NODE_ENV}`, ".env"];

    const rootDir = join(__dirname, "..");

    for (const envFile of envFiles) {
      const envPath = join(rootDir, envFile);
      if (existsSync(envPath)) {
        console.log(`Loading environment from: ${envFile}`);
        config({ path: envPath, override: false });
      }
    }

    // Load from process.env
    this.env = { ...process.env };
    this.isProduction = this.env.NODE_ENV === "production";

    return this;
  }

  /**
   * Validate environment configuration
   */
  validate() {
    this.errors = [];
    this.warnings = [];

    for (const [key, schema] of Object.entries(ENV_SCHEMA)) {
      const value = this.env[key];

      // Check if required
      if (schema.required && (value === undefined || value === "")) {
        this.errors.push(`Missing required environment variable: ${key}`);
        continue;
      }

      // Use default if not provided
      if (value === undefined && schema.default !== undefined) {
        this.env[key] = schema.default.toString();
        continue;
      }

      if (value !== undefined) {
        // Type validation
        if (!this._validateType(value, schema.type)) {
          this.errors.push(
            `Invalid type for ${key}: expected ${schema.type}, got ${typeof value}`,
          );
          continue;
        }

        // Allowed values validation
        if (schema.allowed && !schema.allowed.includes(value)) {
          this.errors.push(
            `Invalid value for ${key}: must be one of [${schema.allowed.join(", ")}]`,
          );
          continue;
        }

        // Custom validation
        if (
          schema.validate &&
          !schema.validate(this._convertType(value, schema.type))
        ) {
          this.errors.push(`Validation failed for ${key}`);
          continue;
        }
      }
    }

    // Production-specific validations
    if (this.isProduction) {
      this._validateProductionSettings();
    }

    this.isValidated = true;
    return this;
  }

  /**
   * Production-specific validation rules
   */
  _validateProductionSettings() {
    // Ensure sensitive data is properly set
    const sensitiveVars = Object.entries(ENV_SCHEMA)
      .filter(([_, schema]) => schema.sensitive)
      .map(([key]) => key);

    for (const key of sensitiveVars) {
      const value = this.env[key];
      if (!value || value.length < 10) {
        this.errors.push(`Production requires properly set ${key}`);
      }
    }

    // Security warnings
    if (this.env.CORS_ORIGIN === "*") {
      this.warnings.push(
        "CORS_ORIGIN set to wildcard (*) in production - consider restricting",
      );
    }

    if (this.env.LOG_LEVEL === "debug") {
      this.warnings.push(
        "Debug logging enabled in production - consider changing to info or warn",
      );
    }

    // Performance warnings
    if (parseInt(this.env.RATE_LIMIT_MAX_REQUESTS) > 1000) {
      this.warnings.push(
        "Rate limit set very high - ensure this is intentional",
      );
    }
  }

  /**
   * Type validation helper
   */
  _validateType(value, expectedType) {
    switch (expectedType) {
      case "string":
        return typeof value === "string";
      case "number":
        return !isNaN(Number(value));
      case "boolean":
        return ["true", "false", "1", "0"].includes(value.toLowerCase());
      default:
        return true;
    }
  }

  /**
   * Type conversion helper
   */
  _convertType(value, type) {
    switch (type) {
      case "number":
        return Number(value);
      case "boolean":
        return ["true", "1"].includes(value.toLowerCase());
      default:
        return value;
    }
  }

  /**
   * Get configuration object with proper types
   */
  getConfig() {
    if (!this.isValidated) {
      throw new Error("Environment must be validated before getting config");
    }

    const config = {};

    for (const [key, schema] of Object.entries(ENV_SCHEMA)) {
      const value = this.env[key];
      if (value !== undefined) {
        config[key] = this._convertType(value, schema.type);
      }
    }

    return config;
  }

  /**
   * Get masked configuration for logging (hides sensitive data)
   */
  getMaskedConfig() {
    const config = this.getConfig();
    const masked = { ...config };

    for (const [key, schema] of Object.entries(ENV_SCHEMA)) {
      if (schema.sensitive && masked[key]) {
        masked[key] = this._maskValue(masked[key]);
      }
    }

    return masked;
  }

  /**
   * Mask sensitive values for logging
   */
  _maskValue(value) {
    if (!value || typeof value !== "string") return "[REDACTED]";
    if (value.length <= 8) return "[REDACTED]";
    return (
      value.substring(0, 4) +
      "*".repeat(value.length - 8) +
      value.substring(value.length - 4)
    );
  }

  /**
   * Check if environment is valid
   */
  isValid() {
    return this.isValidated && this.errors.length === 0;
  }

  /**
   * Get validation errors
   */
  getErrors() {
    return [...this.errors];
  }

  /**
   * Get validation warnings
   */
  getWarnings() {
    return [...this.warnings];
  }

  /**
   * Print validation report
   */
  printReport() {
    console.log("\n=== Environment Validation Report ===");
    console.log(`Environment: ${this.env.NODE_ENV || "development"}`);
    console.log(`Status: ${this.isValid() ? "✅ Valid" : "❌ Invalid"}`);

    if (this.errors.length > 0) {
      console.log("\n❌ Errors:");
      this.errors.forEach((error) => console.log(`  - ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log("\n⚠️  Warnings:");
      this.warnings.forEach((warning) => console.log(`  - ${warning}`));
    }

    if (this.isValid()) {
      console.log("\n✅ Configuration loaded successfully");
      const maskedConfig = this.getMaskedConfig();
      console.log("Loaded configuration:");
      Object.entries(maskedConfig).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    }

    console.log("=====================================\n");
  }

  /**
   * Export configuration for external use
   */
  export() {
    if (!this.isValid()) {
      throw new Error(
        `Environment validation failed: ${this.errors.join(", ")}`,
      );
    }

    return {
      config: this.getConfig(),
      isProduction: this.isProduction,
      NODE_ENV: this.env.NODE_ENV,
      errors: this.getErrors(),
      warnings: this.getWarnings(),
    };
  }
}

/**
 * Create and validate environment
 */
export function createEnvironment() {
  const envManager = new EnvironmentManager();

  try {
    envManager.loadEnvironment().validate();

    // Print report in development/staging
    if (!envManager.isProduction || process.env.VERBOSE === "true") {
      envManager.printReport();
    }

    if (!envManager.isValid()) {
      const errors = envManager.getErrors();
      throw new Error(`Environment validation failed:\n${errors.join("\n")}`);
    }

    return envManager.export();
  } catch (error) {
    console.error("Failed to initialize environment:", error.message);
    if (envManager.isProduction) {
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Default export for direct usage
 */
export default createEnvironment;
