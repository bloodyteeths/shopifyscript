/**
 * Tenant Configuration Service - Multi-Tenant Infrastructure
 * Manages tenant-specific configurations with caching and validation
 */

import tenantRegistry from './tenant-registry.js';
import tenantCache from './cache.js';

class TenantConfigService {
  constructor() {
    this.configDefaults = {
      enabled: true,
      label: 'Proofkit • Managed',
      plan: 'starter',
      default_final_url: 'https://example.com',
      daily_budget_cap_default: 3.00,
      cpc_ceiling_default: 0.20,
      add_business_hours_if_none: true,
      business_days_csv: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY',
      business_start: '09:00',
      business_end: '18:00',
      st_lookback: 'LAST_7_DAYS',
      st_min_clicks: 2,
      st_min_cost: 2.82,
      master_neg_list_name: 'Proofkit • Master Negatives',
      
      // Feature flags
      ENABLE_SCRIPT: true,
      FEATURE_AI_DRAFTS: true,
      FEATURE_INTENT_BLOCKS: true,
      FEATURE_AUDIENCE_EXPORT: true,
      FEATURE_AUDIENCE_ATTACH: true,
      FEATURE_CM_API: false,
      FEATURE_INVENTORY_GUARD: true,
      
      // Autopilot settings
      AP: {
        objective: 'protect',
        mode: 'auto',
        schedule: 'off',
        target_cpa: null,
        target_roas: null,
        desired_keywords: [],
        playbook_prompt: ''
      }
    };

    this.planLimits = {
      starter: {
        maxCampaigns: 10,
        maxAdGroups: 50,
        maxKeywords: 500,
        maxAudienceSegments: 5,
        features: ['basic_insights', 'keyword_optimization']
      },
      growth: {
        maxCampaigns: 50,
        maxAdGroups: 250,
        maxKeywords: 2500,
        maxAudienceSegments: 20,
        features: ['basic_insights', 'keyword_optimization', 'ai_drafts', 'audience_export']
      },
      pro: {
        maxCampaigns: -1, // unlimited
        maxAdGroups: -1,
        maxKeywords: -1,
        maxAudienceSegments: -1,
        features: ['all']
      }
    };
  }

  /**
   * Get tenant configuration with caching
   */
  async getTenantConfig(tenantId) {
    // Check cache first
    const cached = tenantCache.get(tenantId, '/api/config');
    if (cached) {
      return cached;
    }

    try {
      const config = await this.loadConfigFromSheets(tenantId);
      
      // Cache the config
      tenantCache.set(tenantId, '/api/config', {}, config);
      
      return config;
    } catch (error) {
      console.error(`TenantConfigService: Failed to load config for ${tenantId}:`, error.message);
      
      // Return defaults if loading fails
      const defaultConfig = this.getDefaultConfig(tenantId);
      
      // Cache defaults briefly
      tenantCache.set(tenantId, '/api/config', {}, defaultConfig, 30000); // 30 seconds
      
      return defaultConfig;
    }
  }

  /**
   * Load configuration from Google Sheets
   */
  async loadConfigFromSheets(tenantId) {
    const doc = await tenantRegistry.getTenantDoc(tenantId);
    const config = { ...this.configDefaults };
    
    // Load main config table
    const configSheet = await this.ensureSheet(doc, `CONFIG_${tenantId}`, ['key', 'value']);
    const configRows = await configSheet.getRows();
    
    // Parse config key-value pairs
    const configMap = {};
    configRows.forEach(row => {
      if (row.key) {
        configMap[String(row.key).trim()] = String(row.value || '').trim();
      }
    });
    
    // Apply config values with type conversion
    this.applyConfigMap(config, configMap);
    
    // Load complex configuration tables
    await this.loadComplexConfigs(doc, tenantId, config);
    
    // Apply tenant-specific overrides from registry
    const tenant = tenantRegistry.getTenant(tenantId);
    if (tenant && tenant.config) {
      Object.assign(config, tenant.config);
    }
    
    // Validate and normalize config
    this.validateConfig(config);
    
    return config;
  }

  /**
   * Apply configuration map with proper type conversion
   */
  applyConfigMap(config, configMap) {
    // Boolean fields
    const booleanFields = [
      'enabled', 'add_business_hours_if_none', 'ENABLE_SCRIPT', 
      'FEATURE_AI_DRAFTS', 'FEATURE_INTENT_BLOCKS', 'FEATURE_AUDIENCE_EXPORT',
      'FEATURE_AUDIENCE_ATTACH', 'FEATURE_CM_API', 'FEATURE_INVENTORY_GUARD'
    ];
    
    // Numeric fields
    const numericFields = [
      'daily_budget_cap_default', 'cpc_ceiling_default', 
      'st_min_clicks', 'st_min_cost'
    ];
    
    // Apply values with type conversion
    Object.entries(configMap).forEach(([key, value]) => {
      if (booleanFields.includes(key)) {
        config[key] = value.toLowerCase() !== 'false';
      } else if (numericFields.includes(key)) {
        config[key] = Number(value) || 0;
      } else if (key.startsWith('AP_')) {
        // Handle autopilot settings
        this.applyAutopilotConfig(config, key, value);
      } else {
        config[key] = value;
      }
    });
  }

  /**
   * Apply autopilot configuration
   */
  applyAutopilotConfig(config, key, value) {
    if (!config.AP) config.AP = {};
    
    switch (key) {
      case 'AP_OBJECTIVE':
        config.AP.objective = value.toLowerCase();
        break;
      case 'AP_MODE':
        config.AP.mode = value.toLowerCase();
        break;
      case 'AP_SCHEDULE':
        config.AP.schedule = value.toLowerCase();
        break;
      case 'AP_TARGET_CPA':
        config.AP.target_cpa = Number(value) || null;
        break;
      case 'AP_TARGET_ROAS':
        config.AP.target_roas = Number(value) || null;
        break;
      case 'AP_DESIRED_KEYWORDS_PIPE':
        config.AP.desired_keywords = value.split('|').map(s => s.trim()).filter(Boolean);
        break;
      case 'AP_PLAYBOOK_PROMPT':
        config.AP.playbook_prompt = value;
        break;
    }
  }

  /**
   * Load complex configuration tables
   */
  async loadComplexConfigs(doc, tenantId, config) {
    try {
      // Load budget caps
      config.BUDGET_CAPS = await this.loadMapTable(doc, `BUDGET_CAPS_${tenantId}`, ['campaign', 'value']);
      
      // Load CPC ceilings
      config.CPC_CEILINGS = await this.loadMapTable(doc, `CPC_CEILINGS_${tenantId}`, ['campaign', 'value']);
      
      // Load schedules
      config.SCHEDULES = await this.loadSchedules(doc, tenantId);
      
      // Load master negatives
      config.MASTER_NEGATIVES = await this.loadList(doc, `MASTER_NEGATIVES_${tenantId}`, ['term']);
      
      // Load waste negative map
      config.WASTE_NEGATIVE_MAP = await this.loadNested(doc, `WASTE_NEGATIVE_MAP_${tenantId}`, ['campaign', 'ad_group', 'term']);
      
      // Load RSA assets
      config.RSA_DEFAULT = await this.loadRSADefault(doc, tenantId);
      config.RSA_MAP = await this.loadRSAMap(doc, tenantId);
      
      // Load exclusions
      config.EXCLUSIONS = await this.loadExclusions(doc, tenantId);
      
    } catch (error) {
      console.warn(`TenantConfigService: Failed to load some complex configs for ${tenantId}:`, error.message);
    }
  }

  /**
   * Load simple map table (campaign -> value)
   */
  async loadMapTable(doc, sheetName, headers) {
    const sheet = await this.ensureSheet(doc, sheetName, headers);
    const rows = await sheet.getRows();
    const map = {};
    
    rows.forEach(row => {
      const key = String(row.campaign || '').trim();
      if (key) {
        map[key] = Number(row.value || 0);
      }
    });
    
    return map;
  }

  /**
   * Load list table
   */
  async loadList(doc, sheetName, headers) {
    const sheet = await this.ensureSheet(doc, sheetName, headers);
    const rows = await sheet.getRows();
    const list = [];
    
    rows.forEach(row => {
      const term = String(row.term || '').trim();
      if (term) {
        list.push(term);
      }
    });
    
    return list;
  }

  /**
   * Load nested structure (campaign -> ad_group -> terms[])
   */
  async loadNested(doc, sheetName, headers) {
    const sheet = await this.ensureSheet(doc, sheetName, headers);
    const rows = await sheet.getRows();
    const nested = {};
    
    rows.forEach(row => {
      const campaign = String(row.campaign || '').trim();
      const adGroup = String(row.ad_group || '').trim();
      const term = String(row.term || '').trim().toLowerCase();
      
      if (campaign && adGroup && term) {
        if (!nested[campaign]) nested[campaign] = {};
        if (!nested[campaign][adGroup]) nested[campaign][adGroup] = [];
        nested[campaign][adGroup].push(term);
      }
    });
    
    return nested;
  }

  /**
   * Load schedules
   */
  async loadSchedules(doc, tenantId) {
    const sheet = await this.ensureSheet(doc, `SCHEDULES_${tenantId}`, ['campaign', 'days_csv', 'start_hh:mm', 'end_hh:mm']);
    const rows = await sheet.getRows();
    const schedules = {};
    
    rows.forEach(row => {
      const campaign = String(row.campaign || '').trim();
      if (campaign) {
        schedules[campaign] = {
          days: String(row.days_csv || '').trim(),
          start: String(row['start_hh:mm'] || '').trim(),
          end: String(row['end_hh:mm'] || '').trim()
        };
      }
    });
    
    return schedules;
  }

  /**
   * Load RSA default assets
   */
  async loadRSADefault(doc, tenantId) {
    const sheet = await this.ensureSheet(doc, `RSA_ASSETS_DEFAULT_${tenantId}`, ['headlines_pipe', 'descriptions_pipe']);
    const rows = await sheet.getRows();
    
    if (!rows.length) return { H: [], D: [] };
    
    const H = String(rows[0].headlines_pipe || '').split('|').map(s => s.trim()).filter(Boolean);
    const D = String(rows[0].descriptions_pipe || '').split('|').map(s => s.trim()).filter(Boolean);
    
    return { H, D };
  }

  /**
   * Load RSA map
   */
  async loadRSAMap(doc, tenantId) {
    const sheet = await this.ensureSheet(doc, `RSA_ASSETS_MAP_${tenantId}`, ['campaign', 'ad_group', 'headlines_pipe', 'descriptions_pipe']);
    const rows = await sheet.getRows();
    const map = {};
    
    rows.forEach(row => {
      const campaign = String(row.campaign || '').trim();
      const adGroup = String(row.ad_group || '').trim();
      
      if (campaign && adGroup) {
        const H = String(row.headlines_pipe || '').split('|').map(s => s.trim()).filter(Boolean);
        const D = String(row.descriptions_pipe || '').split('|').map(s => s.trim()).filter(Boolean);
        
        if (!map[campaign]) map[campaign] = {};
        map[campaign][adGroup] = { H, D };
      }
    });
    
    return map;
  }

  /**
   * Load exclusions
   */
  async loadExclusions(doc, tenantId) {
    const sheet = await this.ensureSheet(doc, `EXCLUSIONS_${tenantId}`, ['campaign', 'ad_group']);
    const rows = await sheet.getRows();
    const exclusions = {};
    
    rows.forEach(row => {
      const campaign = String(row.campaign || '').trim();
      const adGroup = String(row.ad_group || '').trim();
      
      if (campaign && adGroup) {
        if (!exclusions[campaign]) exclusions[campaign] = {};
        exclusions[campaign][adGroup] = true;
      }
    });
    
    return exclusions;
  }

  /**
   * Get default configuration for a tenant
   */
  getDefaultConfig(tenantId) {
    const tenant = tenantRegistry.getTenant(tenantId);
    const config = { ...this.configDefaults };
    
    if (tenant) {
      config.plan = tenant.plan;
      if (tenant.config) {
        Object.assign(config, tenant.config);
      }
    }
    
    // Initialize empty complex configs
    config.BUDGET_CAPS = {};
    config.CPC_CEILINGS = {};
    config.SCHEDULES = {};
    config.MASTER_NEGATIVES = [];
    config.WASTE_NEGATIVE_MAP = {};
    config.RSA_DEFAULT = { H: [], D: [] };
    config.RSA_MAP = {};
    config.EXCLUSIONS = {};
    
    return config;
  }

  /**
   * Update tenant configuration
   */
  async updateTenantConfig(tenantId, updates) {
    try {
      const doc = await tenantRegistry.getTenantDoc(tenantId);
      await this.upsertConfigToSheets(doc, tenantId, updates);
      
      // Clear cache
      tenantCache.clearTenantPath(tenantId, '/api/config');
      
      return true;
    } catch (error) {
      console.error(`TenantConfigService: Failed to update config for ${tenantId}:`, error.message);
      throw error;
    }
  }

  /**
   * Upsert configuration to sheets
   */
  async upsertConfigToSheets(doc, tenantId, settings) {
    const sheet = await this.ensureSheet(doc, `CONFIG_${tenantId}`, ['key', 'value']);
    const rows = await sheet.getRows();
    
    // Build current config map
    const configMap = {};
    rows.forEach(row => {
      if (row.key) {
        configMap[String(row.key).trim()] = String(row.value || '').trim();
      }
    });
    
    // Apply updates
    Object.entries(settings || {}).forEach(([key, value]) => {
      configMap[key] = String(value);
    });
    
    // Clear and rebuild sheet
    await sheet.clearRows();
    await sheet.setHeaderRow(['key', 'value']);
    
    for (const [key, value] of Object.entries(configMap)) {
      await sheet.addRow({ key, value });
    }
  }

  /**
   * Validate configuration
   */
  validateConfig(config) {
    // Ensure required fields
    if (!config.plan || !this.planLimits[config.plan]) {
      config.plan = 'starter';
    }
    
    // Validate numeric ranges
    if (config.daily_budget_cap_default < 0) config.daily_budget_cap_default = 3.00;
    if (config.cpc_ceiling_default < 0) config.cpc_ceiling_default = 0.20;
    if (config.st_min_clicks < 0) config.st_min_clicks = 2;
    if (config.st_min_cost < 0) config.st_min_cost = 2.82;
    
    // Validate URLs
    if (config.default_final_url && !this.isValidUrl(config.default_final_url)) {
      config.default_final_url = 'https://example.com';
    }
    
    // Ensure AP object exists
    if (!config.AP) {
      config.AP = this.configDefaults.AP;
    }
  }

  /**
   * Check if URL is valid
   */
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get plan limits for a tenant
   */
  getPlanLimits(tenantId) {
    const tenant = tenantRegistry.getTenant(tenantId);
    const plan = tenant?.plan || 'starter';
    return this.planLimits[plan] || this.planLimits.starter;
  }

  /**
   * Check if tenant has feature access
   */
  hasFeatureAccess(tenantId, feature) {
    const limits = this.getPlanLimits(tenantId);
    return limits.features.includes('all') || limits.features.includes(feature);
  }

  /**
   * Ensure sheet exists with proper headers
   */
  async ensureSheet(doc, title, headers) {
    let sheet = doc.sheetsByTitle[title];
    if (!sheet) {
      sheet = await doc.addSheet({ title, headerValues: headers });
    } else {
      try {
        await sheet.loadHeaderRow();
        if (!sheet._headerValues || sheet._headerValues.length === 0) {
          await sheet.setHeaderRow(headers);
        }
      } catch (error) {
        if (headers?.length) {
          await sheet.setHeaderRow(headers);
        }
      }
    }
    return sheet;
  }

  /**
   * Bootstrap tenant with default configuration
   */
  async bootstrapTenant(tenantId) {
    try {
      const defaults = this.getDefaultConfig(tenantId);
      await this.updateTenantConfig(tenantId, defaults);
      
      // Ensure audience tabs exist
      await this.ensureAudienceTabs(tenantId);
      
      return true;
    } catch (error) {
      console.error(`TenantConfigService: Failed to bootstrap ${tenantId}:`, error.message);
      return false;
    }
  }

  /**
   * Ensure audience tabs exist for tenant
   */
  async ensureAudienceTabs(tenantId) {
    const doc = await tenantRegistry.getTenantDoc(tenantId);
    const audienceTabs = [
      { name: `AUDIENCE_SEEDS_${tenantId}`, headers: ['customer_id', 'email_hash', 'phone_hash', 'total_spent', 'order_count', 'last_order_at', 'top_category', 'last_product_ids_csv'] },
      { name: `SKU_MARGIN_${tenantId}`, headers: ['sku', 'margin'] },
      { name: `SKU_STOCK_${tenantId}`, headers: ['sku', 'stock'] },
      { name: `AUDIENCE_SEGMENTS_${tenantId}`, headers: ['segment_key', 'logic_sqlish', 'active'] },
      { name: `AUDIENCE_EXPORT_${tenantId}`, headers: ['segment_key', 'format', 'url', 'row_count', 'generated_at'] },
      { name: `AUDIENCE_MAP_${tenantId}`, headers: ['campaign', 'ad_group', 'user_list_id', 'mode', 'bid_modifier'] },
      { name: `ADGROUP_SKU_MAP_${tenantId}`, headers: ['ad_group_id', 'sku'] },
      { name: `INTENT_BLOCKS_${tenantId}`, headers: ['intent_key', 'hero_headline', 'benefit_bullets_pipe', 'proof_snippet', 'cta_text', 'url_target', 'updated_at', 'updated_by'] },
      { name: `OVERLAY_HISTORY_${tenantId}`, headers: ['timestamp', 'action', 'selector', 'channel', 'fields_json'] }
    ];
    
    for (const tab of audienceTabs) {
      await this.ensureSheet(doc, tab.name, tab.headers);
    }
  }
}

// Singleton instance
const tenantConfigService = new TenantConfigService();

export default tenantConfigService;
export { TenantConfigService };