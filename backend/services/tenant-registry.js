/**
 * Tenant Registry System - Multi-Tenant Infrastructure
 * Manages dynamic tenant-to-sheet mapping and configuration
 */

import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

class TenantRegistry {
  constructor() {
    this.registry = new Map();
    this.isInitialized = false;
    this.lastUpdated = null;
    this.refreshInterval = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize the tenant registry from environment variable
   */
  async initialize() {
    try {
      const registryJson = process.env.TENANT_REGISTRY_JSON;
      if (registryJson) {
        const tenants = JSON.parse(registryJson);
        this.registry.clear();

        for (const [tenantId, config] of Object.entries(tenants)) {
          // Handle both string (just sheetId) and object format
          const sheetId = typeof config === "string" ? config : config.sheetId;

          this.registry.set(tenantId, {
            id: tenantId,
            sheetId: sheetId,
            name: (typeof config === "object" ? config.name : null) || tenantId,
            plan:
              (typeof config === "object" ? config.plan : null) || "starter",
            enabled:
              (typeof config === "object" ? config.enabled : true) !== false,
            config: (typeof config === "object" ? config.config : null) || {},
            createdAt:
              (typeof config === "object" ? config.createdAt : null) ||
              new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        // Add proofkit mapping for development and default usage
        if (process.env.SHEET_ID) {
          this.registry.set("proofkit", {
            id: "proofkit",
            sheetId: process.env.SHEET_ID,
            name: "ProofKit Shop",
            plan: "starter",
            enabled: true,
            config: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          console.log(
            `🔧 Added proofkit mapping to Sheet: ${process.env.SHEET_ID}`,
          );
        }
      } else {
        // Fallback to default single-tenant mode using SHEET_ID
        if (process.env.SHEET_ID) {
          this.registry.set("default", {
            id: "default",
            sheetId: process.env.SHEET_ID,
            name: "Default Tenant",
            plan: "starter",
            enabled: true,
            config: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      this.isInitialized = true;
      this.lastUpdated = Date.now();
      console.log(
        `TenantRegistry: Initialized with ${this.registry.size} tenants`,
      );

      // Schedule periodic refresh
      this.scheduleRefresh();
    } catch (error) {
      console.error("TenantRegistry: Failed to initialize:", error.message);
      this.isInitialized = false;
    }
  }

  /**
   * Schedule periodic refresh of tenant registry
   */
  scheduleRefresh() {
    setInterval(() => {
      this.refresh().catch((err) =>
        console.error("TenantRegistry: Refresh failed:", err.message),
      );
    }, this.refreshInterval);
  }

  /**
   * Refresh tenant registry from environment
   */
  async refresh() {
    const oldSize = this.registry.size;
    await this.initialize();
    const newSize = this.registry.size;

    if (oldSize !== newSize) {
      console.log(
        `TenantRegistry: Refreshed - ${oldSize} -> ${newSize} tenants`,
      );
    }
  }

  /**
   * Get tenant configuration by ID, with auto-registration for new Shopify stores
   */
  getTenant(tenantId) {
    if (!this.isInitialized) {
      throw new Error("TenantRegistry not initialized");
    }

    let tenant = this.registry.get(tenantId);
    if (!tenant) {
      // Auto-register new tenants (Shopify stores)
      tenant = this.autoRegisterTenant(tenantId);
    }

    return tenant || this.registry.get("default");
  }

  /**
   * Automatically register a new tenant (for any shop name)
   */
  autoRegisterTenant(tenantId) {
    // Allow any valid tenant ID format - no hardcoded restrictions
    if (!tenantId || typeof tenantId !== "string") {
      console.warn(`❌ Invalid tenant ID for auto-registration: ${tenantId}`);
      return null;
    }

    // Validate using the same pattern as the UI (shop name validation)
    const validIdPattern = /^[a-zA-Z0-9][a-zA-Z0-9\-_]{1,63}$/;
    if (tenantId.length < 2 || !validIdPattern.test(tenantId)) {
      console.warn(
        `❌ Invalid tenant ID format for auto-registration: ${tenantId}`,
      );
      return null;
    }

    // Use the same Google Sheet as other tenants for simplicity
    const defaultSheetId =
      process.env.SHEET_ID || "1vqcqkLxY4r3tWowi6GMsoRbSJG5x4XY7QKg2mTe54rU";

    const newTenant = {
      id: tenantId,
      sheetId: defaultSheetId,
      name: `${tenantId.charAt(0).toUpperCase() + tenantId.slice(1)} Shop`,
      plan: "starter",
      enabled: true,
      config: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      autoRegistered: true,
      type: "shopify_store",
    };

    this.registry.set(tenantId, newTenant);
    console.log(
      `✅ Auto-registered Shopify store: ${tenantId} with sheet: ${defaultSheetId}`,
    );

    return newTenant;
  }

  /**
   * Get all tenants
   */
  getAllTenants() {
    if (!this.isInitialized) {
      throw new Error("TenantRegistry not initialized");
    }

    return Array.from(this.registry.values());
  }

  /**
   * Check if tenant exists and is enabled
   */
  isValidTenant(tenantId) {
    const tenant = this.getTenant(tenantId);
    return tenant && tenant.enabled;
  }

  /**
   * Get Google Sheets document for a tenant
   */
  async getTenantDoc(tenantId) {
    const tenant = this.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    if (!tenant.enabled) {
      throw new Error(`Tenant disabled: ${tenantId}`);
    }

    // Accept both canonical and alternate env var names
    const GOOGLE_SERVICE_EMAIL =
      process.env.GOOGLE_SERVICE_EMAIL ||
      process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const GOOGLE_PRIVATE_KEY =
      process.env.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    if (!GOOGLE_SERVICE_EMAIL || !GOOGLE_PRIVATE_KEY) {
      throw new Error("Google Sheets authentication not configured");
    }

    try {
      const serviceAccountAuth = new JWT({
        email: GOOGLE_SERVICE_EMAIL,
        key: (GOOGLE_PRIVATE_KEY || "")
          .replace(/\\n/g, "\n")
          .replace(/\r/g, "\n")
          .replace(/^"|"$/g, ""),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });

      const doc = new GoogleSpreadsheet(tenant.sheetId, serviceAccountAuth);
      await doc.loadInfo();
      return doc;
    } catch (error) {
      throw new Error(
        `Failed to load sheets for tenant ${tenantId}: ${error.message}`,
      );
    }
  }

  /**
   * Add or update tenant configuration
   */
  addTenant(tenantId, config) {
    if (!tenantId || !config.sheetId) {
      throw new Error("Tenant ID and Sheet ID are required");
    }

    this.registry.set(tenantId, {
      id: tenantId,
      sheetId: config.sheetId,
      name: config.name || tenantId,
      plan: config.plan || "starter",
      enabled: config.enabled !== false,
      config: config.config || {},
      createdAt: config.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log(`TenantRegistry: Added/updated tenant ${tenantId}`);
  }

  /**
   * Remove tenant from registry
   */
  removeTenant(tenantId) {
    const removed = this.registry.delete(tenantId);
    if (removed) {
      console.log(`TenantRegistry: Removed tenant ${tenantId}`);
    }
    return removed;
  }

  /**
   * Get tenant statistics
   */
  getStats() {
    const tenants = this.getAllTenants();
    const enabled = tenants.filter((t) => t.enabled).length;
    const plans = tenants.reduce((acc, t) => {
      acc[t.plan] = (acc[t.plan] || 0) + 1;
      return acc;
    }, {});

    return {
      total: tenants.length,
      enabled,
      disabled: tenants.length - enabled,
      plans,
      lastUpdated: this.lastUpdated,
      initialized: this.isInitialized,
    };
  }

  /**
   * Export tenant registry as JSON
   */
  exportRegistry() {
    const registry = {};
    for (const [tenantId, config] of this.registry) {
      registry[tenantId] = {
        sheetId: config.sheetId,
        name: config.name,
        plan: config.plan,
        enabled: config.enabled,
        config: config.config,
        createdAt: config.createdAt,
      };
    }
    return registry;
  }
}

// Singleton instance
const tenantRegistry = new TenantRegistry();

export default tenantRegistry;
export { TenantRegistry };
