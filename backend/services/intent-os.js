/**
 * Intent OS Service - Core Conversion Rate Optimization Engine
 * Manages catalog overlays, UTM-driven content, and promo page drafts
 * CRITICAL: All mutations gated by PROMOTE flag for safety
 */

import { getAIProviderService } from "./ai-provider.js";
import tenantConfigService from "./tenant-config.js";
import tenantRegistry from "./tenant-registry.js";
import tenantCache from "./cache.js";

class IntentOSService {
  constructor() {
    this.initialized = false;
    this.aiProvider = null;

    // Intent Block templates for different industries
    this.templates = {
      ecommerce: {
        hero_headline: "Limited Time: {discount}% Off {category}",
        benefit_bullets: "Fast Shipping|Money-Back Guarantee|Expert Support",
        proof_snippet: "Join {customer_count}+ satisfied customers",
        cta_text: "Shop Now & Save",
        url_target: "/collections/{category}",
      },
      saas: {
        hero_headline: "Get {trial_days} Days Free - {product_name}",
        benefit_bullets: "No Setup Fees|Cancel Anytime|24/7 Support",
        proof_snippet: "Trusted by {company_count}+ companies",
        cta_text: "Start Free Trial",
        url_target: "/signup",
      },
      services: {
        hero_headline: "Book Your {service_name} Today",
        benefit_bullets:
          "Licensed Professionals|Satisfaction Guaranteed|Fast Response",
        proof_snippet: "{reviews_count}+ five-star reviews",
        cta_text: "Get Free Quote",
        url_target: "/contact",
      },
    };

    // UTM term mapping for content swaps
    this.utmContentMap = {
      "high-intent": {
        urgency: "high",
        social_proof: "testimonials",
        cta_style: "primary",
      },
      research: {
        urgency: "low",
        social_proof: "reviews",
        cta_style: "secondary",
      },
      comparison: {
        urgency: "medium",
        social_proof: "comparisons",
        cta_style: "comparison",
      },
    };
  }

  /**
   * Initialize Intent OS with AI provider
   */
  async initialize() {
    if (this.initialized) return;

    try {
      this.aiProvider = getAIProviderService();
      await this.aiProvider.initialize();
      this.initialized = true;
      console.log("Intent OS Service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Intent OS:", error);
      throw error;
    }
  }

  /**
   * Apply metafield overlay to catalog with versioning
   * GATED BY PROMOTE FLAG
   */
  async applyMetafieldOverlay(tenantId, overlayConfig, promote = false) {
    if (!promote && !this.checkPromoteFlag(tenantId)) {
      throw new Error("Intent OS mutations require PROMOTE flag to be enabled");
    }

    await this.initialize();

    try {
      const version = await this.createOverlayVersion(tenantId, overlayConfig);

      // Store overlay history
      await this.recordOverlayAction(tenantId, "APPLY", overlayConfig, version);

      // Apply the overlay to Shopify metafields
      const result = await this.executeMetafieldOverlay(
        tenantId,
        overlayConfig,
        version,
      );

      // Cache the active overlay
      tenantCache.set(
        tenantId,
        "/intent-os/overlay/active",
        {},
        {
          version,
          config: overlayConfig,
          appliedAt: new Date().toISOString(),
          result,
        },
      );

      return {
        success: true,
        version,
        appliedFields: result.appliedFields,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Intent OS overlay apply failed for ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Revert metafield overlay to previous version
   * GATED BY PROMOTE FLAG
   */
  async revertMetafieldOverlay(
    tenantId,
    targetVersion = null,
    promote = false,
  ) {
    if (!promote && !this.checkPromoteFlag(tenantId)) {
      throw new Error("Intent OS mutations require PROMOTE flag to be enabled");
    }

    await this.initialize();

    try {
      const history = await this.getOverlayHistory(tenantId);
      const target = targetVersion || this.findPreviousVersion(history);

      if (!target) {
        throw new Error("No previous version found to revert to");
      }

      // Apply the target version
      const result = await this.executeMetafieldOverlay(
        tenantId,
        target.config,
        target.version,
      );

      // Record revert action
      await this.recordOverlayAction(
        tenantId,
        "REVERT",
        { targetVersion: target.version },
        Date.now(),
      );

      // Update cache
      tenantCache.clearTenantPath(tenantId, "/intent-os/overlay/active");

      return {
        success: true,
        revertedTo: target.version,
        appliedFields: result.appliedFields,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Intent OS overlay revert failed for ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Generate UTM-driven content for theme sections
   */
  async generateUTMContent(tenantId, utmTerm, productContext = {}) {
    await this.initialize();

    try {
      // Get content strategy based on UTM term
      const strategy =
        this.utmContentMap[utmTerm] || this.utmContentMap["research"];

      // Get tenant config for industry context
      const config = await tenantConfigService.getTenantConfig(tenantId);
      const industry = config.industry || "ecommerce";

      // Generate AI-powered content variations
      const contentVariations = await this.generateContentVariations(
        tenantId,
        strategy,
        industry,
        productContext,
      );

      // Cache content for fast retrieval
      const cacheKey = `/intent-os/utm-content/${utmTerm}`;
      tenantCache.set(
        tenantId,
        cacheKey,
        productContext,
        contentVariations,
        3600000,
      ); // 1 hour

      return {
        strategy,
        variations: contentVariations,
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`UTM content generation failed for ${tenantId}:`, error);
      return this.getFallbackContent(utmTerm);
    }
  }

  /**
   * Create AI-powered promo page draft (NEVER auto-publish)
   * GATED BY PROMOTE FLAG
   */
  async createPromoDraft(tenantId, promoConfig, promote = false) {
    if (!promote && !this.checkPromoteFlag(tenantId)) {
      throw new Error("Intent OS mutations require PROMOTE flag to be enabled");
    }

    await this.initialize();

    try {
      // Generate AI content for promo page
      const aiContent = await this.generatePromoContent(tenantId, promoConfig);

      // Create draft structure
      const draft = {
        id: `promo_${Date.now()}`,
        title: aiContent.title,
        content: aiContent.content,
        meta_description: aiContent.metaDescription,
        handle: this.generatePromoHandle(aiContent.title),
        status: "DRAFT", // NEVER auto-publish
        intent_config: promoConfig,
        created_at: new Date().toISOString(),
        created_by: "intent-os",
        tags: ["intent-os", "promo", promoConfig.campaign_type || "general"],
      };

      // Store draft in tenant sheets
      await this.storePromoDraft(tenantId, draft);

      // Cache draft
      const cacheKey = `/intent-os/promo-drafts/${draft.id}`;
      tenantCache.set(tenantId, cacheKey, {}, draft);

      return {
        draft,
        warning: "DRAFT ONLY - Manual review and publishing required",
        review_url: `/admin/promo-drafts/${draft.id}`,
      };
    } catch (error) {
      console.error(`Promo draft creation failed for ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get Intent Blocks for tenant
   */
  async getIntentBlocks(tenantId, intentKey = null) {
    try {
      const doc = await tenantRegistry.getTenantDoc(tenantId);
      const sheet = await this.ensureSheet(doc, `INTENT_BLOCKS_${tenantId}`, [
        "intent_key",
        "hero_headline",
        "benefit_bullets_pipe",
        "proof_snippet",
        "cta_text",
        "url_target",
        "updated_at",
        "updated_by",
      ]);

      const rows = await sheet.getRows();
      const blocks = {};

      rows.forEach((row) => {
        const key = String(row.intent_key || "").trim();
        if (key) {
          blocks[key] = {
            hero_headline: row.hero_headline || "",
            benefit_bullets: (row.benefit_bullets_pipe || "")
              .split("|")
              .filter(Boolean),
            proof_snippet: row.proof_snippet || "",
            cta_text: row.cta_text || "",
            url_target: row.url_target || "",
            updated_at: row.updated_at || "",
            updated_by: row.updated_by || "",
          };
        }
      });

      return intentKey ? blocks[intentKey] || null : blocks;
    } catch (error) {
      console.error(`Failed to get intent blocks for ${tenantId}:`, error);
      return intentKey ? null : {};
    }
  }

  /**
   * Update Intent Block (GATED BY PROMOTE FLAG)
   */
  async updateIntentBlock(tenantId, intentKey, blockData, promote = false) {
    if (!promote && !this.checkPromoteFlag(tenantId)) {
      throw new Error("Intent OS mutations require PROMOTE flag to be enabled");
    }

    try {
      const doc = await tenantRegistry.getTenantDoc(tenantId);
      const sheet = await this.ensureSheet(doc, `INTENT_BLOCKS_${tenantId}`, [
        "intent_key",
        "hero_headline",
        "benefit_bullets_pipe",
        "proof_snippet",
        "cta_text",
        "url_target",
        "updated_at",
        "updated_by",
      ]);

      const rows = await sheet.getRows();
      let existingRow = null;

      // Find existing row
      for (const row of rows) {
        if (String(row.intent_key || "").trim() === intentKey) {
          existingRow = row;
          break;
        }
      }

      const updateData = {
        intent_key: intentKey,
        hero_headline: blockData.hero_headline || "",
        benefit_bullets_pipe: (blockData.benefit_bullets || []).join("|"),
        proof_snippet: blockData.proof_snippet || "",
        cta_text: blockData.cta_text || "",
        url_target: blockData.url_target || "",
        updated_at: new Date().toISOString(),
        updated_by: "intent-os",
      };

      if (existingRow) {
        // Update existing row
        Object.assign(existingRow, updateData);
        await existingRow.save();
      } else {
        // Add new row
        await sheet.addRow(updateData);
      }

      // Clear cache
      tenantCache.clearTenantPath(tenantId, "/intent-os/blocks");

      return { success: true, intentKey, updated_at: updateData.updated_at };
    } catch (error) {
      console.error(`Failed to update intent block for ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Check if PROMOTE flag is enabled for tenant
   */
  checkPromoteFlag(tenantId) {
    const tenant = tenantRegistry.getTenant(tenantId);
    return (
      tenant?.config?.INTENT_OS_PROMOTE === true ||
      process.env.INTENT_OS_GLOBAL_PROMOTE === "true"
    );
  }

  /**
   * Create versioned overlay snapshot
   */
  async createOverlayVersion(tenantId, overlayConfig) {
    const version = Date.now();
    const versionKey = `/intent-os/overlay/versions/${version}`;

    tenantCache.set(
      tenantId,
      versionKey,
      {},
      {
        version,
        config: overlayConfig,
        created_at: new Date().toISOString(),
      },
      2592000000,
    ); // 30 days

    return version;
  }

  /**
   * Record overlay action in history
   */
  async recordOverlayAction(tenantId, action, config, version) {
    try {
      const doc = await tenantRegistry.getTenantDoc(tenantId);
      const sheet = await this.ensureSheet(doc, `OVERLAY_HISTORY_${tenantId}`, [
        "timestamp",
        "action",
        "selector",
        "channel",
        "fields_json",
      ]);

      await sheet.addRow({
        timestamp: new Date().toISOString(),
        action,
        selector: config.selector || "",
        channel: config.channel || "web",
        fields_json: JSON.stringify(config),
      });
    } catch (error) {
      console.warn(`Failed to record overlay action for ${tenantId}:`, error);
    }
  }

  /**
   * Execute metafield overlay (mock implementation for safety)
   */
  async executeMetafieldOverlay(tenantId, config, version) {
    // SAFETY: Mock implementation - real Shopify integration would go here
    console.log(`[INTENT-OS] Mock applying overlay for ${tenantId}:`, {
      version,
      config: config.selector,
      fields: Object.keys(config.metafields || {}),
    });

    return {
      appliedFields: Object.keys(config.metafields || {}),
      shopifyResponse: "MOCK_SUCCESS",
    };
  }

  /**
   * Generate AI content variations
   */
  async generateContentVariations(
    tenantId,
    strategy,
    industry,
    productContext,
  ) {
    const template = this.templates[industry] || this.templates.ecommerce;

    const prompt = `Generate ${strategy.urgency} urgency marketing content for ${industry} industry.
Product context: ${JSON.stringify(productContext)}
Focus on ${strategy.social_proof} as social proof.
Generate 3 variations of:
1. Hero headline
2. 3 benefit bullets
3. Social proof snippet  
4. CTA text

Return as JSON with variations array.`;

    try {
      const aiResult = await this.aiProvider.generateStructuredContent(prompt);
      return (
        aiResult?.variations || [
          this.templateToVariation(template, productContext),
        ]
      );
    } catch (error) {
      console.warn("AI content generation failed, using template fallback");
      return [this.templateToVariation(template, productContext)];
    }
  }

  /**
   * Generate promo page content
   */
  async generatePromoContent(tenantId, promoConfig) {
    const prompt = `Create a high-converting promotional page for:
Campaign: ${promoConfig.campaign_name}
Offer: ${promoConfig.offer_details}
Target audience: ${promoConfig.target_audience}
Industry: ${promoConfig.industry}

Generate:
1. Compelling page title (under 60 chars)
2. Meta description (under 160 chars)  
3. Full page content with sections for hero, benefits, social proof, CTA
4. Include urgency and scarcity elements

Return as JSON with title, metaDescription, content fields.`;

    try {
      const aiResult = await this.aiProvider.generateStructuredContent(prompt);
      return aiResult || this.getFallbackPromoContent(promoConfig);
    } catch (error) {
      console.warn("AI promo generation failed, using fallback");
      return this.getFallbackPromoContent(promoConfig);
    }
  }

  /**
   * Convert template to variation
   */
  templateToVariation(template, context) {
    return {
      hero_headline: this.interpolateTemplate(template.hero_headline, context),
      benefit_bullets: template.benefit_bullets.split("|"),
      proof_snippet: this.interpolateTemplate(template.proof_snippet, context),
      cta_text: template.cta_text,
      url_target: this.interpolateTemplate(template.url_target, context),
    };
  }

  /**
   * Interpolate template variables
   */
  interpolateTemplate(template, context) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return context[key] || match;
    });
  }

  /**
   * Get fallback content for UTM terms
   */
  getFallbackContent(utmTerm) {
    return {
      strategy: this.utmContentMap[utmTerm] || this.utmContentMap.research,
      variations: [
        {
          hero_headline: "Discover Our Products",
          benefit_bullets: [
            "Quality Guaranteed",
            "Fast Shipping",
            "Expert Support",
          ],
          proof_snippet: "Trusted by thousands",
          cta_text: "Learn More",
          url_target: "/products",
        },
      ],
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Get fallback promo content
   */
  getFallbackPromoContent(config) {
    return {
      title: `Special Offer: ${config.campaign_name}`,
      metaDescription: `Limited time offer on ${config.campaign_name}. Don't miss out!`,
      content: `<h1>Special Offer: ${config.campaign_name}</h1><p>${config.offer_details}</p><a href="/contact">Get Started</a>`,
    };
  }

  /**
   * Generate promo page handle/slug
   */
  generatePromoHandle(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 50);
  }

  /**
   * Store promo draft in sheets
   */
  async storePromoDraft(tenantId, draft) {
    try {
      const doc = await tenantRegistry.getTenantDoc(tenantId);
      const sheet = await this.ensureSheet(doc, `PROMO_DRAFTS_${tenantId}`, [
        "id",
        "title",
        "handle",
        "status",
        "content",
        "meta_description",
        "created_at",
        "created_by",
        "tags_csv",
      ]);

      await sheet.addRow({
        id: draft.id,
        title: draft.title,
        handle: draft.handle,
        status: draft.status,
        content: draft.content,
        meta_description: draft.meta_description,
        created_at: draft.created_at,
        created_by: draft.created_by,
        tags_csv: draft.tags.join(","),
      });
    } catch (error) {
      console.error(`Failed to store promo draft for ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get overlay history
   */
  async getOverlayHistory(tenantId, limit = 10) {
    try {
      const doc = await tenantRegistry.getTenantDoc(tenantId);
      const sheet = await this.ensureSheet(doc, `OVERLAY_HISTORY_${tenantId}`, [
        "timestamp",
        "action",
        "selector",
        "channel",
        "fields_json",
      ]);

      const rows = await sheet.getRows();
      return rows
        .map((row) => ({
          timestamp: row.timestamp,
          action: row.action,
          selector: row.selector,
          channel: row.channel,
          config: this.safeParseJSON(row.fields_json),
        }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    } catch (error) {
      console.error(`Failed to get overlay history for ${tenantId}:`, error);
      return [];
    }
  }

  /**
   * Find previous version from history
   */
  findPreviousVersion(history) {
    for (const entry of history) {
      if (entry.action === "APPLY" && entry.config) {
        return {
          version: entry.timestamp,
          config: entry.config,
        };
      }
    }
    return null;
  }

  /**
   * Safely parse JSON
   */
  safeParseJSON(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch {
      return {};
    }
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
   * Get Intent OS status and metrics
   */
  getStatus(tenantId) {
    const tenant = tenantRegistry.getTenant(tenantId);
    return {
      initialized: this.initialized,
      promoteEnabled: this.checkPromoteFlag(tenantId),
      tenantPlan: tenant?.plan || "unknown",
      aiProvider: this.aiProvider?.getStatus() || null,
      features: {
        metafieldOverlays: true,
        utmContent: true,
        promoDrafts: true,
        intentBlocks: true,
      },
    };
  }
}

// Singleton instance
let intentOSInstance = null;

/**
 * Get singleton Intent OS instance
 */
export function getIntentOSService() {
  if (!intentOSInstance) {
    intentOSInstance = new IntentOSService();
  }
  return intentOSInstance;
}

export default IntentOSService;
export { IntentOSService };
