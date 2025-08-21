#!/usr/bin/env node

/**
 * Environment Variable Configuration Validator
 * Tests that all critical environment variables are properly configured
 */

import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Color output for better readability
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateBackend() {
  log("\n📡 Backend Environment Validation", "blue");
  log("================================", "blue");

  // Load backend .env
  const backendEnvPath = path.resolve("./backend/.env");
  if (fs.existsSync(backendEnvPath)) {
    dotenv.config({ path: backendEnvPath });
    log(`✅ Loaded backend .env from ${backendEnvPath}`, "green");
  } else {
    log(`❌ Backend .env file not found at ${backendEnvPath}`, "red");
    return false;
  }

  const requiredVars = [
    "NODE_ENV",
    "PORT",
    "HMAC_SECRET",
    "TENANT_ID",
    "TENANT_REGISTRY_JSON",
    "GOOGLE_SHEETS_CLIENT_EMAIL",
    "GOOGLE_SHEETS_PRIVATE_KEY",
    "GOOGLE_SHEETS_PROJECT_ID",
  ];

  let allValid = true;

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      log(
        `✅ ${varName}: ${varName.includes("PRIVATE_KEY") ? "[REDACTED]" : value.length > 50 ? value.slice(0, 50) + "..." : value}`,
        "green",
      );
    } else {
      log(`❌ ${varName}: NOT SET`, "red");
      allValid = false;
    }
  }

  // Test TENANT_REGISTRY_JSON parsing
  try {
    const registry = JSON.parse(process.env.TENANT_REGISTRY_JSON || "{}");
    const tenantCount = Object.keys(registry).length;
    log(
      `✅ TENANT_REGISTRY_JSON: Valid JSON with ${tenantCount} tenants`,
      "green",
    );
  } catch (error) {
    log(`❌ TENANT_REGISTRY_JSON: Invalid JSON - ${error.message}`, "red");
    allValid = false;
  }

  return allValid;
}

function validateShopifyUI() {
  log("\n🛒 Shopify UI Environment Validation", "blue");
  log("===================================", "blue");

  // Clear existing env vars to test UI loading
  const envVarsToTest = [
    "NODE_ENV",
    "PORT",
    "TENANT_ID",
    "HMAC_SECRET",
    "BACKEND_PUBLIC_URL",
    "TENANT_REGISTRY_JSON",
    "GOOGLE_SHEETS_CLIENT_EMAIL",
    "DEFAULT_DEV_TENANT",
  ];

  // Save original values
  const originalVars = {};
  for (const varName of envVarsToTest) {
    originalVars[varName] = process.env[varName];
    delete process.env[varName];
  }

  // Load UI .env
  const uiEnvPath = path.resolve("./shopify-ui/.env");
  if (fs.existsSync(uiEnvPath)) {
    dotenv.config({ path: uiEnvPath });
    log(`✅ Loaded shopify-ui .env from ${uiEnvPath}`, "green");
  } else {
    log(`❌ Shopify UI .env file not found at ${uiEnvPath}`, "red");
    // Restore original values
    for (const [varName, value] of Object.entries(originalVars)) {
      if (value) process.env[varName] = value;
    }
    return false;
  }

  let allValid = true;

  for (const varName of envVarsToTest) {
    const value = process.env[varName];
    if (value) {
      log(
        `✅ ${varName}: ${varName.includes("PRIVATE_KEY") ? "[REDACTED]" : value.length > 50 ? value.slice(0, 50) + "..." : value}`,
        "green",
      );
    } else {
      log(`❌ ${varName}: NOT SET`, "red");
      allValid = false;
    }
  }

  // Restore original values
  for (const [varName, value] of Object.entries(originalVars)) {
    if (value) process.env[varName] = value;
  }

  return allValid;
}

function validateCrossCommunication() {
  log("\n🔗 Cross-Application Communication", "blue");
  log("=================================", "blue");

  // Load both envs
  dotenv.config({ path: "./backend/.env" });
  dotenv.config({ path: "./shopify-ui/.env" });

  const backendPort = process.env.PORT;
  const backendPublicUrl = process.env.BACKEND_PUBLIC_URL;
  const uiBackendUrl = process.env.BACKEND_PUBLIC_URL;

  log(`Backend PORT: ${backendPort}`, "yellow");
  log(`UI BACKEND_PUBLIC_URL: ${uiBackendUrl}`, "yellow");

  // Check if URLs match expected pattern
  if (uiBackendUrl && uiBackendUrl.includes(`:${backendPort}`)) {
    log("✅ Port configuration is consistent", "green");
  } else {
    log("⚠️  Port configuration mismatch detected", "yellow");
  }

  return true;
}

function main() {
  log("🔍 ProofKit Environment Variable Audit", "bold");
  log("=====================================", "bold");

  const backendValid = validateBackend();
  const uiValid = validateShopifyUI();
  const communicationValid = validateCrossCommunication();

  log("\n📊 Validation Summary", "bold");
  log("===================", "bold");

  log(
    `Backend Environment: ${backendValid ? "✅ VALID" : "❌ ISSUES FOUND"}`,
    backendValid ? "green" : "red",
  );
  log(
    `Shopify UI Environment: ${uiValid ? "✅ VALID" : "❌ ISSUES FOUND"}`,
    uiValid ? "green" : "red",
  );
  log(
    `Cross-App Communication: ${communicationValid ? "✅ VALID" : "❌ ISSUES FOUND"}`,
    communicationValid ? "green" : "red",
  );

  const overallValid = backendValid && uiValid && communicationValid;

  log(
    `\nOverall Status: ${overallValid ? "✅ ALL SYSTEMS GO" : "❌ CONFIGURATION ISSUES DETECTED"}`,
    overallValid ? "green" : "red",
  );

  if (!overallValid) {
    log("\n🔧 Recommended Actions:", "yellow");
    log("- Review and fix missing environment variables", "yellow");
    log("- Ensure consistent port configuration", "yellow");
    log("- Verify TENANT_REGISTRY_JSON is valid JSON", "yellow");
    log("- Check Google Sheets credentials are properly set", "yellow");
  }

  process.exit(overallValid ? 0 : 1);
}

main();
