/**
 * Simple SQLite database for tenant configuration storage
 * Stores basic tenant settings to avoid repeated user input
 */

import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'tenants.db');

let db: Database.Database | null = null;

function getDb() {
  if (!db) {
    // Ensure directory exists
    const fs = require('fs');
    const path = require('path');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    db = new Database(DB_PATH);
    
    // Create tables if they don't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS tenant_config (
        tenant_id TEXT PRIMARY KEY,
        shop_domain TEXT NOT NULL,
        google_sheet_id TEXT,
        setup_completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS tenant_settings (
        tenant_id TEXT NOT NULL,
        setting_key TEXT NOT NULL,
        setting_value TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (tenant_id, setting_key),
        FOREIGN KEY (tenant_id) REFERENCES tenant_config(tenant_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant ON tenant_settings(tenant_id);
    `);
  }
  
  return db;
}

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
export function getTenantConfig(tenantId: string): TenantConfig | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM tenant_config WHERE tenant_id = ?');
  return stmt.get(tenantId) as TenantConfig | null;
}

/**
 * Create or update tenant configuration
 */
export function upsertTenantConfig(config: Partial<TenantConfig> & { tenant_id: string }): void {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO tenant_config (tenant_id, shop_domain, google_sheet_id, setup_completed_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(tenant_id) DO UPDATE SET
      shop_domain = excluded.shop_domain,
      google_sheet_id = COALESCE(excluded.google_sheet_id, google_sheet_id),
      setup_completed_at = COALESCE(excluded.setup_completed_at, setup_completed_at),
      updated_at = datetime('now')
  `);
  
  stmt.run(
    config.tenant_id,
    config.shop_domain || `${config.tenant_id}.myshopify.com`,
    config.google_sheet_id || null,
    config.setup_completed_at || null
  );
}

/**
 * Mark tenant setup as completed
 */
export function markSetupCompleted(tenantId: string): void {
  const database = getDb();
  const stmt = database.prepare(`
    UPDATE tenant_config 
    SET setup_completed_at = datetime('now'), updated_at = datetime('now')
    WHERE tenant_id = ?
  `);
  stmt.run(tenantId);
}

/**
 * Check if tenant has completed setup
 */
export function isSetupCompleted(tenantId: string): boolean {
  const config = getTenantConfig(tenantId);
  return !!(config?.setup_completed_at);
}

/**
 * Get tenant setting by key
 */
export function getTenantSetting(tenantId: string, key: string): string | null {
  const database = getDb();
  const stmt = database.prepare('SELECT setting_value FROM tenant_settings WHERE tenant_id = ? AND setting_key = ?');
  const result = stmt.get(tenantId, key) as { setting_value: string } | null;
  return result?.setting_value || null;
}

/**
 * Set tenant setting
 */
export function setTenantSetting(tenantId: string, key: string, value: string): void {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(tenant_id, setting_key) DO UPDATE SET
      setting_value = excluded.setting_value,
      updated_at = datetime('now')
  `);
  stmt.run(tenantId, key, value);
}

/**
 * Get all tenant settings as key-value pairs
 */
export function getTenantSettings(tenantId: string): Record<string, string> {
  const database = getDb();
  const stmt = database.prepare('SELECT setting_key, setting_value FROM tenant_settings WHERE tenant_id = ?');
  const rows = stmt.all(tenantId) as Array<{ setting_key: string, setting_value: string }>;
  
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.setting_key] = row.setting_value;
  }
  return settings;
}

/**
 * Set multiple tenant settings at once
 */
export function setTenantSettings(tenantId: string, settings: Record<string, string>): void {
  const database = getDb();
  const transaction = database.transaction((settingsObj: Record<string, string>) => {
    const stmt = database.prepare(`
      INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(tenant_id, setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        updated_at = datetime('now')
    `);
    
    for (const [key, value] of Object.entries(settingsObj)) {
      stmt.run(tenantId, key, value);
    }
  });
  
  transaction(settings);
}

/**
 * Get Google Sheet ID for tenant with fallback
 */
export function getTenantSheetId(tenantId: string): string {
  const config = getTenantConfig(tenantId);
  
  if (config?.google_sheet_id) {
    return config.google_sheet_id;
  }
  
  // Fallback to environment variables
  const sheetMappings: Record<string, string> = {
    'proofkit': process.env.DEV_SHEET_ID || process.env.DEFAULT_SHEET_ID || '',
    'dev-tenant': process.env.DEV_SHEET_ID || '',
    'demo-store': process.env.DEMO_SHEET_ID || '',
  };
  
  return sheetMappings[tenantId] || process.env.DEFAULT_SHEET_ID || '';
}

/**
 * Associate Google Sheet with tenant
 */
export function setTenantSheetId(tenantId: string, sheetId: string): void {
  const database = getDb();
  const stmt = database.prepare(`
    UPDATE tenant_config 
    SET google_sheet_id = ?, updated_at = datetime('now')
    WHERE tenant_id = ?
  `);
  stmt.run(sheetId, tenantId);
}

/**
 * Initialize tenant from Shopify session data
 */
export function initializeTenant(tenantId: string, shopDomain: string): void {
  const existing = getTenantConfig(tenantId);
  
  if (!existing) {
    upsertTenantConfig({
      tenant_id: tenantId,
      shop_domain: shopDomain
    });
    console.log(`🆕 Initialized new tenant: ${tenantId} (${shopDomain})`);
  } else {
    // Update shop domain if different
    if (existing.shop_domain !== shopDomain) {
      upsertTenantConfig({
        tenant_id: tenantId,
        shop_domain: shopDomain
      });
      console.log(`🔄 Updated tenant ${tenantId} shop domain: ${existing.shop_domain} → ${shopDomain}`);
    }
  }
}

/**
 * List all tenants (for admin purposes)
 */
export function getAllTenants(): TenantConfig[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM tenant_config ORDER BY created_at DESC');
  return stmt.all() as TenantConfig[];
}

/**
 * Close database connection
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}