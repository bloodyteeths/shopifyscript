/**
 * Serverless-compatible tenant configuration storage
 * Uses Vercel KV (Redis) or environment variables for production
 * Simple JSON storage for development
 */

// For now, use simple file-based storage that works in all environments
// TODO: Add Vercel KV support later when needed
let kv: any = null;

// Simple file-based storage for development
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

const STORAGE_PATH = join(process.cwd(), "data", "tenants.json");

interface StorageData {
  tenant_config: Record<string, TenantConfig>;
  tenant_settings: Record<string, Record<string, string>>;
}

// In-memory storage for serverless - doesn't persist between function calls
let memoryStorage: StorageData = {
  tenant_config: {},
  tenant_settings: {},
};

// Get storage data - try file system in development, memory in production
function getStorageData(): StorageData {
  // In serverless, always use memory
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return memoryStorage;
  }

  // In development, try file system
  if (existsSync(STORAGE_PATH)) {
    try {
      const data = readFileSync(STORAGE_PATH, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.warn("Failed to read storage file, using memory:", error);
      return memoryStorage;
    }
  }

  return memoryStorage;
}

// Save storage data - try file system in development, memory in production
function saveStorageData(data: StorageData): void {
  // Always update memory
  memoryStorage = { ...data };

  // In serverless, don't try to write files
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return;
  }

  // In development, try file system
  try {
    const dir = dirname(STORAGE_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(STORAGE_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.warn(
      "Failed to save storage data to file, using memory only:",
      error,
    );
  }
}

// Storage abstraction that works with KV, JSON file, or memory
class TenantStorage {
  async get(key: string): Promise<any> {
    if (kv) {
      try {
        return await kv.get(key);
      } catch (error) {
        console.warn("KV get failed, falling back to file storage:", error);
      }
    }

    // Fallback to JSON file storage
    const data = getStorageData();
    const [type, tenantId, field] = key.split(":");

    if (type === "tenant_config") {
      return data.tenant_config[tenantId] || null;
    } else if (type === "tenant_settings") {
      return data.tenant_settings[tenantId] || {};
    }

    return null;
  }

  async set(key: string, value: any): Promise<void> {
    if (kv) {
      try {
        await kv.set(key, value);
        return;
      } catch (error) {
        console.warn("KV set failed, falling back to file storage:", error);
      }
    }

    // Fallback to JSON file storage
    const data = getStorageData();
    const [type, tenantId, field] = key.split(":");

    if (type === "tenant_config") {
      data.tenant_config[tenantId] = value;
    } else if (type === "tenant_settings") {
      if (!data.tenant_settings[tenantId]) {
        data.tenant_settings[tenantId] = {};
      }
      data.tenant_settings[tenantId] = {
        ...data.tenant_settings[tenantId],
        ...value,
      };
    }

    saveStorageData(data);
  }

  async del(key: string): Promise<void> {
    if (kv) {
      try {
        await kv.del(key);
        return;
      } catch (error) {
        console.warn("KV del failed, falling back to file storage:", error);
      }
    }

    // Fallback to JSON file storage
    const data = getStorageData();
    const [type, tenantId, field] = key.split(":");

    if (type === "tenant_config") {
      delete data.tenant_config[tenantId];
    } else if (type === "tenant_settings") {
      delete data.tenant_settings[tenantId];
    }

    saveStorageData(data);
  }
}

const storage = new TenantStorage();

export interface TenantConfig {
  tenant_id: string;
  shop_domain: string;
  google_sheet_id?: string;
  setup_completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TenantSetting {
  tenant_id: string;
  setting_key: string;
  setting_value: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get tenant configuration by tenant ID
 */
export async function getTenantConfig(
  tenantId: string,
): Promise<TenantConfig | null> {
  return await storage.get(`tenant_config:${tenantId}`);
}

/**
 * Create or update tenant configuration
 */
export async function upsertTenantConfig(
  config: Partial<TenantConfig> & { tenant_id: string },
): Promise<void> {
  const existing = await getTenantConfig(config.tenant_id);
  const now = new Date().toISOString();

  const tenantConfig: TenantConfig = {
    tenant_id: config.tenant_id,
    shop_domain:
      config.shop_domain ||
      existing?.shop_domain ||
      `${config.tenant_id}.myshopify.com`,
    google_sheet_id: config.google_sheet_id || existing?.google_sheet_id,
    setup_completed_at:
      config.setup_completed_at || existing?.setup_completed_at,
    created_at: existing?.created_at || now,
    updated_at: now,
  };

  await storage.set(`tenant_config:${config.tenant_id}`, tenantConfig);
}

/**
 * Mark tenant setup as completed
 */
export async function markSetupCompleted(tenantId: string): Promise<void> {
  await upsertTenantConfig({
    tenant_id: tenantId,
    setup_completed_at: new Date().toISOString(),
  });
}

/**
 * Check if tenant has completed setup
 */
export async function isSetupCompleted(tenantId: string): Promise<boolean> {
  const config = await getTenantConfig(tenantId);
  return !!config?.setup_completed_at;
}

/**
 * Get tenant setting by key
 */
export async function getTenantSetting(
  tenantId: string,
  key: string,
): Promise<string | null> {
  const settings = await storage.get(`tenant_settings:${tenantId}`);
  return settings?.[key] || null;
}

/**
 * Set tenant setting
 */
export async function setTenantSetting(
  tenantId: string,
  key: string,
  value: string,
): Promise<void> {
  const settings = (await storage.get(`tenant_settings:${tenantId}`)) || {};
  settings[key] = value;
  await storage.set(`tenant_settings:${tenantId}`, settings);
}

/**
 * Get all tenant settings as key-value pairs
 */
export async function getTenantSettings(
  tenantId: string,
): Promise<Record<string, string>> {
  return (await storage.get(`tenant_settings:${tenantId}`)) || {};
}

/**
 * Set multiple tenant settings at once
 */
export async function setTenantSettings(
  tenantId: string,
  settings: Record<string, string>,
): Promise<void> {
  const existingSettings =
    (await storage.get(`tenant_settings:${tenantId}`)) || {};
  const mergedSettings = { ...existingSettings, ...settings };
  await storage.set(`tenant_settings:${tenantId}`, mergedSettings);
}

/**
 * Get Google Sheet ID for tenant with fallback
 */
export async function getTenantSheetId(tenantId: string): Promise<string> {
  const config = await getTenantConfig(tenantId);

  if (config?.google_sheet_id) {
    return config.google_sheet_id;
  }

  // Fallback to environment variables
  const sheetMappings: Record<string, string> = {
    proofkit: process.env.DEV_SHEET_ID || process.env.DEFAULT_SHEET_ID || "",
    "dev-tenant": process.env.DEV_SHEET_ID || "",
    "demo-store": process.env.DEMO_SHEET_ID || "",
  };

  return sheetMappings[tenantId] || process.env.DEFAULT_SHEET_ID || "";
}

/**
 * Associate Google Sheet with tenant
 */
export async function setTenantSheetId(
  tenantId: string,
  sheetId: string,
): Promise<void> {
  await upsertTenantConfig({
    tenant_id: tenantId,
    google_sheet_id: sheetId,
  });
}

/**
 * Initialize tenant from Shopify session data
 */
export async function initializeTenant(
  tenantId: string,
  shopDomain: string,
): Promise<void> {
  const existing = await getTenantConfig(tenantId);

  if (!existing) {
    await upsertTenantConfig({
      tenant_id: tenantId,
      shop_domain: shopDomain,
    });
    console.log(`🆕 Initialized new tenant: ${tenantId} (${shopDomain})`);
  } else {
    // Update shop domain if different
    if (existing.shop_domain !== shopDomain) {
      await upsertTenantConfig({
        tenant_id: tenantId,
        shop_domain: shopDomain,
      });
      console.log(
        `🔄 Updated tenant ${tenantId} shop domain: ${existing.shop_domain} → ${shopDomain}`,
      );
    }
  }
}

/**
 * List all tenants (for admin purposes)
 */
export async function getAllTenants(): Promise<TenantConfig[]> {
  // This would need to be implemented based on storage type
  // For now, return empty array as it's not commonly used
  return [];
}
