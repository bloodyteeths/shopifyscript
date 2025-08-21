/**
 * Agency Template System
 * Provides template library functionality for cloning configurations across tenants
 * Enables agencies to manage multiple client configurations efficiently
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AgencyTemplateService {
  constructor() {
    this.templatesDir = path.join(__dirname, "../templates");
    this.ensureTemplatesDirectory();
  }

  /**
   * Ensure templates directory exists
   */
  ensureTemplatesDirectory() {
    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, { recursive: true });
    }
  }

  /**
   * Create a new template from existing tenant configuration
   */
  async createTemplate(templateData) {
    try {
      const {
        templateId,
        templateName,
        description,
        sourceConfig,
        category = "general",
        tags = [],
        createdBy,
        isPublic = false,
      } = templateData;

      // Validate template data
      if (!templateId || !templateName || !sourceConfig) {
        throw new Error("Template ID, name, and source config are required");
      }

      // Sanitize the configuration to remove tenant-specific data
      const sanitizedConfig = this.sanitizeConfiguration(sourceConfig);

      const template = {
        id: templateId,
        name: templateName,
        description: description || "",
        category,
        tags,
        config: sanitizedConfig,
        metadata: {
          createdBy,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: "1.0.0",
          isPublic,
          usageCount: 0,
        },
      };

      // Save template to file system
      const templatePath = path.join(this.templatesDir, `${templateId}.json`);
      fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));

      console.log(`Template created: ${templateName} (${templateId})`);
      return template;
    } catch (error) {
      console.error("Error creating template:", error);
      throw error;
    }
  }

  /**
   * Get all available templates
   */
  async getTemplates(filters = {}) {
    try {
      const templateFiles = fs
        .readdirSync(this.templatesDir)
        .filter((file) => file.endsWith(".json"));

      const templates = templateFiles.map((file) => {
        const templatePath = path.join(this.templatesDir, file);
        const templateData = JSON.parse(fs.readFileSync(templatePath, "utf8"));

        // Return metadata only (not full config) for listing
        return {
          id: templateData.id,
          name: templateData.name,
          description: templateData.description,
          category: templateData.category,
          tags: templateData.tags,
          metadata: templateData.metadata,
        };
      });

      // Apply filters
      let filteredTemplates = templates;

      if (filters.category) {
        filteredTemplates = filteredTemplates.filter(
          (t) => t.category === filters.category,
        );
      }

      if (filters.tags && filters.tags.length > 0) {
        filteredTemplates = filteredTemplates.filter((t) =>
          filters.tags.some((tag) => t.tags.includes(tag)),
        );
      }

      if (filters.publicOnly) {
        filteredTemplates = filteredTemplates.filter(
          (t) => t.metadata.isPublic,
        );
      }

      return filteredTemplates;
    } catch (error) {
      console.error("Error getting templates:", error);
      throw error;
    }
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId) {
    try {
      const templatePath = path.join(this.templatesDir, `${templateId}.json`);

      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found: ${templateId}`);
      }

      const template = JSON.parse(fs.readFileSync(templatePath, "utf8"));

      // Increment usage count
      template.metadata.usageCount = (template.metadata.usageCount || 0) + 1;
      template.metadata.lastUsed = new Date().toISOString();

      fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));

      return template;
    } catch (error) {
      console.error("Error getting template:", error);
      throw error;
    }
  }

  /**
   * Clone template configuration to a new tenant
   */
  async cloneToTenant(templateId, targetTenantId, customizations = {}) {
    try {
      const template = await this.getTemplate(templateId);

      // Start with template configuration
      let clonedConfig = JSON.parse(JSON.stringify(template.config));

      // Apply tenant-specific customizations
      clonedConfig = this.applyCustomizations(clonedConfig, customizations);

      // Add tenant-specific identifiers
      clonedConfig.tenant_id = targetTenantId;
      clonedConfig.source_template = templateId;
      clonedConfig.cloned_at = new Date().toISOString();

      console.log(`Template ${templateId} cloned to tenant ${targetTenantId}`);
      return clonedConfig;
    } catch (error) {
      console.error("Error cloning template:", error);
      throw error;
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(templateId, updates) {
    try {
      const template = await this.getTemplate(templateId);

      // Update fields
      if (updates.name) template.name = updates.name;
      if (updates.description) template.description = updates.description;
      if (updates.category) template.category = updates.category;
      if (updates.tags) template.tags = updates.tags;
      if (updates.config)
        template.config = this.sanitizeConfiguration(updates.config);

      // Update metadata
      template.metadata.updatedAt = new Date().toISOString();
      template.metadata.version = this.incrementVersion(
        template.metadata.version,
      );

      // Save updated template
      const templatePath = path.join(this.templatesDir, `${templateId}.json`);
      fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));

      console.log(`Template updated: ${templateId}`);
      return template;
    } catch (error) {
      console.error("Error updating template:", error);
      throw error;
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId) {
    try {
      const templatePath = path.join(this.templatesDir, `${templateId}.json`);

      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found: ${templateId}`);
      }

      fs.unlinkSync(templatePath);
      console.log(`Template deleted: ${templateId}`);
      return true;
    } catch (error) {
      console.error("Error deleting template:", error);
      throw error;
    }
  }

  /**
   * Bulk clone template to multiple tenants
   */
  async bulkClone(templateId, tenantConfigs) {
    try {
      const results = [];

      for (const tenantConfig of tenantConfigs) {
        try {
          const clonedConfig = await this.cloneToTenant(
            templateId,
            tenantConfig.tenantId,
            tenantConfig.customizations || {},
          );

          results.push({
            tenantId: tenantConfig.tenantId,
            success: true,
            config: clonedConfig,
          });
        } catch (error) {
          results.push({
            tenantId: tenantConfig.tenantId,
            success: false,
            error: error.message,
          });
        }
      }

      console.log(
        `Bulk clone completed: ${results.filter((r) => r.success).length}/${results.length} successful`,
      );
      return results;
    } catch (error) {
      console.error("Error in bulk clone:", error);
      throw error;
    }
  }

  /**
   * Get template analytics
   */
  async getTemplateAnalytics() {
    try {
      const templates = await this.getTemplates();

      const analytics = {
        totalTemplates: templates.length,
        categoryCounts: {},
        mostUsed: [],
        recentlyCreated: [],
        totalUsage: 0,
      };

      // Calculate category counts and total usage
      templates.forEach((template) => {
        analytics.categoryCounts[template.category] =
          (analytics.categoryCounts[template.category] || 0) + 1;
        analytics.totalUsage += template.metadata.usageCount || 0;
      });

      // Most used templates
      analytics.mostUsed = templates
        .sort(
          (a, b) => (b.metadata.usageCount || 0) - (a.metadata.usageCount || 0),
        )
        .slice(0, 10);

      // Recently created templates
      analytics.recentlyCreated = templates
        .sort(
          (a, b) =>
            new Date(b.metadata.createdAt) - new Date(a.metadata.createdAt),
        )
        .slice(0, 10);

      return analytics;
    } catch (error) {
      console.error("Error getting template analytics:", error);
      throw error;
    }
  }

  /**
   * Sanitize configuration to remove tenant-specific data
   */
  sanitizeConfiguration(config) {
    const sanitized = JSON.parse(JSON.stringify(config));

    // Remove tenant-specific fields
    delete sanitized.tenant_id;
    delete sanitized.tenant_name;
    delete sanitized.created_at;
    delete sanitized.updated_at;
    delete sanitized.source_template;
    delete sanitized.cloned_at;

    // Remove specific IDs that should be regenerated
    if (sanitized.AUDIENCE_MAP) {
      Object.keys(sanitized.AUDIENCE_MAP).forEach((campaign) => {
        Object.keys(sanitized.AUDIENCE_MAP[campaign]).forEach((adGroup) => {
          // Keep the structure but remove actual audience IDs
          if (sanitized.AUDIENCE_MAP[campaign][adGroup].user_list_id) {
            sanitized.AUDIENCE_MAP[campaign][adGroup].user_list_id =
              "PLACEHOLDER_AUDIENCE_ID";
          }
        });
      });
    }

    return sanitized;
  }

  /**
   * Apply customizations to cloned configuration
   */
  applyCustomizations(config, customizations) {
    const customized = JSON.parse(JSON.stringify(config));

    // Apply budget adjustments
    if (customizations.budgetMultiplier) {
      if (customized.daily_budget_cap_default) {
        customized.daily_budget_cap_default *= customizations.budgetMultiplier;
      }
      if (customized.BUDGET_CAPS) {
        Object.keys(customized.BUDGET_CAPS).forEach((campaign) => {
          customized.BUDGET_CAPS[campaign] *= customizations.budgetMultiplier;
        });
      }
    }

    // Apply CPC adjustments
    if (customizations.cpcMultiplier) {
      if (customized.cpc_ceiling_default) {
        customized.cpc_ceiling_default *= customizations.cpcMultiplier;
      }
      if (customized.CPC_CEILINGS) {
        Object.keys(customized.CPC_CEILINGS).forEach((campaign) => {
          customized.CPC_CEILINGS[campaign] *= customizations.cpcMultiplier;
        });
      }
    }

    // Apply URL replacements
    if (customizations.finalUrl) {
      customized.default_final_url = customizations.finalUrl;
    }

    // Apply label customizations
    if (customizations.label) {
      customized.label = customizations.label;
    }

    // Apply business hours customizations
    if (customizations.businessHours) {
      customized.business_start = customizations.businessHours.start;
      customized.business_end = customizations.businessHours.end;
      customized.business_days_csv = customizations.businessHours.days;
    }

    // Apply RSA customizations
    if (customizations.rsaContent) {
      if (customizations.rsaContent.headlines) {
        customized.RSA_DEFAULT.H = customizations.rsaContent.headlines;
      }
      if (customizations.rsaContent.descriptions) {
        customized.RSA_DEFAULT.D = customizations.rsaContent.descriptions;
      }
    }

    // Apply any other direct field overrides
    if (customizations.overrides) {
      Object.keys(customizations.overrides).forEach((key) => {
        customized[key] = customizations.overrides[key];
      });
    }

    return customized;
  }

  /**
   * Increment version number
   */
  incrementVersion(version) {
    const parts = version.split(".");
    const patch = parseInt(parts[2]) + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  /**
   * Export template for sharing
   */
  async exportTemplate(templateId) {
    try {
      const template = await this.getTemplate(templateId);

      // Create exportable version
      const exportData = {
        ...template,
        exported_at: new Date().toISOString(),
        exported_by: "ProofKit Agency System",
      };

      return exportData;
    } catch (error) {
      console.error("Error exporting template:", error);
      throw error;
    }
  }

  /**
   * Import template from export data
   */
  async importTemplate(exportData, importOptions = {}) {
    try {
      const {
        newTemplateId = exportData.id,
        newTemplateName = exportData.name,
        overwriteExisting = false,
      } = importOptions;

      // Check if template already exists
      const templatePath = path.join(
        this.templatesDir,
        `${newTemplateId}.json`,
      );
      if (fs.existsSync(templatePath) && !overwriteExisting) {
        throw new Error(`Template ${newTemplateId} already exists`);
      }

      // Prepare imported template
      const importedTemplate = {
        ...exportData,
        id: newTemplateId,
        name: newTemplateName,
        metadata: {
          ...exportData.metadata,
          imported_at: new Date().toISOString(),
          original_id:
            exportData.id !== newTemplateId ? exportData.id : undefined,
        },
      };

      // Remove export-specific fields
      delete importedTemplate.exported_at;
      delete importedTemplate.exported_by;

      // Save imported template
      fs.writeFileSync(templatePath, JSON.stringify(importedTemplate, null, 2));

      console.log(`Template imported: ${newTemplateName} (${newTemplateId})`);
      return importedTemplate;
    } catch (error) {
      console.error("Error importing template:", error);
      throw error;
    }
  }
}

export default AgencyTemplateService;
