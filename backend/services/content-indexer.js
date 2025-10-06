/**
 * Content Indexer Service for Ads Autopilot AI SaaS
 * Stores and indexes extracted website content in Supabase for quick retrieval
 * Creates searchable index for products, testimonials, offers, and other content
 *
 * Features:
 * - Supabase storage for all extracted content
 * - Content tagging by type (product, testimonial, offer, etc.)
 * - Full-text search capabilities
 * - Periodic re-scraping and freshness tracking
 * - Version history for content changes
 */

import { getSupabaseClient, executeQuery, isSupabaseEnabled } from './supabase-client.js';
import logger from './logger.js';

/**
 * Content Indexer with Supabase integration
 */
export class ContentIndexerService {
  constructor() {
    this.initialized = false;
    this.supabase = null;

    // Content types for tagging
    this.contentTypes = {
      PRODUCT: 'product',
      TESTIMONIAL: 'testimonial',
      OFFER: 'offer',
      GUARANTEE: 'guarantee',
      USP: 'usp',
      HOOK: 'hook',
      CTA: 'cta',
      BRAND_VOICE: 'brand_voice'
    };

    // Freshness settings
    this.freshnessThresholds = {
      products: 7 * 24 * 60 * 60 * 1000, // 7 days
      testimonials: 30 * 24 * 60 * 60 * 1000, // 30 days
      offers: 1 * 24 * 60 * 60 * 1000, // 1 day (offers change frequently)
      brandVoice: 30 * 24 * 60 * 60 * 1000 // 30 days
    };

    // Metrics
    this.metrics = {
      indexed: 0,
      updated: 0,
      retrieved: 0,
      errors: 0
    };
  }

  /**
   * Initialize the indexer
   */
  async initialize() {
    if (this.initialized) return;

    try {
      if (!isSupabaseEnabled()) {
        logger.warn('Supabase not enabled, content indexer running in fallback mode');
        this.initialized = true;
        return;
      }

      this.supabase = getSupabaseClient();

      if (!this.supabase) {
        throw new Error('Failed to get Supabase client');
      }

      // Ensure tables exist
      await this.ensureTables();

      this.initialized = true;
      logger.info('Content indexer service initialized with Supabase');
    } catch (error) {
      logger.error('Failed to initialize content indexer:', error);
      // Continue in fallback mode
      this.initialized = true;
    }
  }

  /**
   * Ensure required tables exist
   */
  async ensureTables() {
    // Tables should be created via migrations, but we can check if they exist
    const tables = [
      'website_content',
      'content_index',
      'content_tags'
    ];

    for (const table of tables) {
      try {
        const { error } = await this.supabase
          .from(table)
          .select('count')
          .limit(1);

        if (error) {
          logger.warn(`Table ${table} may not exist:`, error.message);
        }
      } catch (error) {
        logger.warn(`Could not check table ${table}:`, error.message);
      }
    }
  }

  /**
   * Index website content in Supabase
   */
  async indexWebsiteContent(tenant, content) {
    if (!tenant) {
      throw new Error('Tenant required for content indexing');
    }

    try {
      await this.initialize();

      const websiteUrl = content.metadata?.url || content.homepage?.url || 'unknown';

      logger.info(`Indexing website content for tenant ${tenant}, URL: ${websiteUrl}`);

      // Store main website content
      const websiteRecord = await this.storeWebsiteContent(tenant, content);

      // Index individual content items
      const indexedItems = [];

      // Index products
      if (content.products && content.products.length > 0) {
        const productItems = await this.indexProducts(tenant, websiteUrl, content.products);
        indexedItems.push(...productItems);
      }

      // Index testimonials
      if (content.testimonials && content.testimonials.length > 0) {
        const testimonialItems = await this.indexTestimonials(tenant, websiteUrl, content.testimonials);
        indexedItems.push(...testimonialItems);
      }

      // Index offers
      if (content.offers && content.offers.length > 0) {
        const offerItems = await this.indexOffers(tenant, websiteUrl, content.offers);
        indexedItems.push(...offerItems);
      }

      // Index USPs
      if (content.usps && content.usps.length > 0) {
        const uspItems = await this.indexUSPs(tenant, websiteUrl, content.usps);
        indexedItems.push(...uspItems);
      }

      // Index guarantees
      if (content.guarantees && content.guarantees.length > 0) {
        const guaranteeItems = await this.indexGuarantees(tenant, websiteUrl, content.guarantees);
        indexedItems.push(...guaranteeItems);
      }

      // Index hooks
      if (content.hooks && content.hooks.length > 0) {
        const hookItems = await this.indexHooks(tenant, websiteUrl, content.hooks);
        indexedItems.push(...hookItems);
      }

      // Index CTAs
      if (content.ctas && content.ctas.length > 0) {
        const ctaItems = await this.indexCTAs(tenant, websiteUrl, content.ctas);
        indexedItems.push(...ctaItems);
      }

      // Index brand voice
      if (content.brandVoice) {
        const brandVoiceItem = await this.indexBrandVoice(tenant, websiteUrl, content.brandVoice);
        if (brandVoiceItem) indexedItems.push(brandVoiceItem);
      }

      this.metrics.indexed += indexedItems.length;

      logger.info(`Successfully indexed ${indexedItems.length} content items for ${tenant}`);

      return {
        success: true,
        websiteRecord,
        indexedItems: indexedItems.length,
        itemsByType: this.groupItemsByType(indexedItems)
      };

    } catch (error) {
      this.metrics.errors++;
      logger.error(`Failed to index website content for ${tenant}:`, error);
      throw error;
    }
  }

  /**
   * Store main website content record
   */
  async storeWebsiteContent(tenant, content) {
    if (!this.supabase) {
      // Fallback mode - just return mock data
      return { id: `mock-${Date.now()}`, tenant, url: content.metadata?.url };
    }

    try {
      const websiteData = {
        tenant_id: tenant,
        url: content.metadata?.url || 'unknown',
        homepage_data: content.homepage || {},
        metadata: content.metadata || {},
        scraped_at: new Date().toISOString(),
        pages_scraped: content.metadata?.pagesScraped || 0,
        content_summary: {
          productsCount: content.products?.length || 0,
          testimonialsCount: content.testimonials?.length || 0,
          offersCount: content.offers?.length || 0,
          uspsCount: content.usps?.length || 0
        }
      };

      // Check if record exists
      const { data: existing } = await this.supabase
        .from('website_content')
        .select('id')
        .eq('tenant_id', tenant)
        .eq('url', websiteData.url)
        .single();

      if (existing) {
        // Update existing record
        const { data, error } = await this.supabase
          .from('website_content')
          .update(websiteData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        this.metrics.updated++;
        return data;
      } else {
        // Insert new record
        const { data, error } = await this.supabase
          .from('website_content')
          .insert(websiteData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

    } catch (error) {
      logger.error('Failed to store website content:', error);
      // Return mock data on error
      return { id: `error-${Date.now()}`, tenant, url: content.metadata?.url };
    }
  }

  /**
   * Index products
   */
  async indexProducts(tenant, websiteUrl, products) {
    const items = [];

    for (const product of products) {
      const item = await this.indexItem(tenant, websiteUrl, {
        type: this.contentTypes.PRODUCT,
        title: product.name,
        content: product.description,
        metadata: {
          price: product.price,
          currency: product.currency,
          image: product.image,
          brand: product.brand,
          source: product.source
        },
        tags: ['product', 'e-commerce', product.brand].filter(Boolean)
      });

      if (item) items.push(item);
    }

    return items;
  }

  /**
   * Index testimonials
   */
  async indexTestimonials(tenant, websiteUrl, testimonials) {
    const items = [];

    for (const testimonial of testimonials) {
      const item = await this.indexItem(tenant, websiteUrl, {
        type: this.contentTypes.TESTIMONIAL,
        title: `Testimonial from ${testimonial.author}`,
        content: testimonial.text,
        metadata: {
          author: testimonial.author,
          rating: testimonial.rating,
          date: testimonial.date,
          source: testimonial.source
        },
        tags: ['testimonial', 'social-proof', 'review']
      });

      if (item) items.push(item);
    }

    return items;
  }

  /**
   * Index offers
   */
  async indexOffers(tenant, websiteUrl, offers) {
    const items = [];

    for (const offer of offers) {
      const item = await this.indexItem(tenant, websiteUrl, {
        type: this.contentTypes.OFFER,
        title: offer.text,
        content: offer.text,
        metadata: {
          offerType: offer.type,
          price: offer.price,
          validUntil: offer.validUntil,
          confidence: offer.confidence
        },
        tags: ['offer', 'promotion', offer.type].filter(Boolean),
        expires_at: offer.validUntil || null
      });

      if (item) items.push(item);
    }

    return items;
  }

  /**
   * Index USPs
   */
  async indexUSPs(tenant, websiteUrl, usps) {
    const items = [];

    for (const usp of usps) {
      const item = await this.indexItem(tenant, websiteUrl, {
        type: this.contentTypes.USP,
        title: usp.text.substring(0, 100),
        content: usp.text,
        metadata: {
          uspType: usp.type,
          confidence: usp.confidence
        },
        tags: ['usp', 'value-proposition', usp.type].filter(Boolean)
      });

      if (item) items.push(item);
    }

    return items;
  }

  /**
   * Index guarantees
   */
  async indexGuarantees(tenant, websiteUrl, guarantees) {
    const items = [];

    for (const guarantee of guarantees) {
      const item = await this.indexItem(tenant, websiteUrl, {
        type: this.contentTypes.GUARANTEE,
        title: guarantee.text,
        content: guarantee.context || guarantee.text,
        metadata: {
          confidence: guarantee.confidence
        },
        tags: ['guarantee', 'trust-signal']
      });

      if (item) items.push(item);
    }

    return items;
  }

  /**
   * Index hooks
   */
  async indexHooks(tenant, websiteUrl, hooks) {
    const items = [];

    for (const hook of hooks) {
      const item = await this.indexItem(tenant, websiteUrl, {
        type: this.contentTypes.HOOK,
        title: hook.text,
        content: hook.text,
        metadata: {
          hookType: hook.type,
          location: hook.location,
          confidence: hook.confidence
        },
        tags: ['hook', 'headline', hook.type].filter(Boolean)
      });

      if (item) items.push(item);
    }

    return items;
  }

  /**
   * Index CTAs
   */
  async indexCTAs(tenant, websiteUrl, ctas) {
    const items = [];

    for (const cta of ctas) {
      const item = await this.indexItem(tenant, websiteUrl, {
        type: this.contentTypes.CTA,
        title: cta,
        content: cta,
        metadata: {},
        tags: ['cta', 'call-to-action']
      });

      if (item) items.push(item);
    }

    return items;
  }

  /**
   * Index brand voice
   */
  async indexBrandVoice(tenant, websiteUrl, brandVoice) {
    return await this.indexItem(tenant, websiteUrl, {
      type: this.contentTypes.BRAND_VOICE,
      title: `Brand Voice - ${brandVoice.primaryTone}`,
      content: JSON.stringify(brandVoice.commonPhrases || []),
      metadata: brandVoice,
      tags: ['brand-voice', brandVoice.primaryTone]
    });
  }

  /**
   * Index a single content item
   */
  async indexItem(tenant, websiteUrl, item) {
    if (!this.supabase) {
      // Fallback mode
      return {
        id: `mock-${Date.now()}-${Math.random()}`,
        tenant,
        ...item
      };
    }

    try {
      const indexData = {
        tenant_id: tenant,
        website_url: websiteUrl,
        content_type: item.type,
        title: item.title,
        content: item.content,
        metadata: item.metadata || {},
        tags: item.tags || [],
        expires_at: item.expires_at || null,
        indexed_at: new Date().toISOString()
      };

      // Check if similar item exists (to avoid duplicates)
      const { data: existing } = await this.supabase
        .from('content_index')
        .select('id')
        .eq('tenant_id', tenant)
        .eq('content_type', item.type)
        .eq('title', item.title)
        .single();

      if (existing) {
        // Update existing item
        const { data, error } = await this.supabase
          .from('content_index')
          .update(indexData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new item
        const { data, error } = await this.supabase
          .from('content_index')
          .insert(indexData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

    } catch (error) {
      logger.error(`Failed to index item (${item.type}):`, error.message);
      return null;
    }
  }

  /**
   * Retrieve content by type
   */
  async getContentByType(tenant, contentType, options = {}) {
    const { limit = 50, onlyFresh = true } = options;

    try {
      await this.initialize();

      if (!this.supabase) {
        return { items: [], cached: false };
      }

      let query = this.supabase
        .from('content_index')
        .select('*')
        .eq('tenant_id', tenant)
        .eq('content_type', contentType)
        .order('indexed_at', { ascending: false })
        .limit(limit);

      // Filter out expired content
      if (onlyFresh) {
        query = query.or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      this.metrics.retrieved += data.length;

      return {
        items: data || [],
        cached: false
      };

    } catch (error) {
      logger.error(`Failed to retrieve content (${contentType}) for ${tenant}:`, error);
      return { items: [], cached: false, error: error.message };
    }
  }

  /**
   * Search content by query
   */
  async searchContent(tenant, searchQuery, options = {}) {
    const { contentTypes = [], limit = 20 } = options;

    try {
      await this.initialize();

      if (!this.supabase) {
        return { results: [] };
      }

      let query = this.supabase
        .from('content_index')
        .select('*')
        .eq('tenant_id', tenant)
        .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
        .limit(limit);

      if (contentTypes.length > 0) {
        query = query.in('content_type', contentTypes);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        results: data || [],
        count: data?.length || 0
      };

    } catch (error) {
      logger.error(`Search failed for ${tenant}:`, error);
      return { results: [], count: 0, error: error.message };
    }
  }

  /**
   * Get all content for a tenant (for ad generation)
   */
  async getAllContentForAds(tenant) {
    try {
      await this.initialize();

      const [products, testimonials, offers, usps, guarantees, hooks, ctas, brandVoice] = await Promise.all([
        this.getContentByType(tenant, this.contentTypes.PRODUCT, { limit: 20 }),
        this.getContentByType(tenant, this.contentTypes.TESTIMONIAL, { limit: 10 }),
        this.getContentByType(tenant, this.contentTypes.OFFER, { limit: 10 }),
        this.getContentByType(tenant, this.contentTypes.USP, { limit: 10 }),
        this.getContentByType(tenant, this.contentTypes.GUARANTEE, { limit: 5 }),
        this.getContentByType(tenant, this.contentTypes.HOOK, { limit: 15 }),
        this.getContentByType(tenant, this.contentTypes.CTA, { limit: 10 }),
        this.getContentByType(tenant, this.contentTypes.BRAND_VOICE, { limit: 1 })
      ]);

      return {
        products: products.items,
        testimonials: testimonials.items,
        offers: offers.items,
        usps: usps.items,
        guarantees: guarantees.items,
        hooks: hooks.items,
        ctas: ctas.items,
        brandVoice: brandVoice.items[0]?.metadata || null,
        totalItems: [products, testimonials, offers, usps, guarantees, hooks, ctas].reduce(
          (sum, result) => sum + result.items.length, 0
        )
      };

    } catch (error) {
      logger.error(`Failed to get all content for ${tenant}:`, error);
      return {
        products: [],
        testimonials: [],
        offers: [],
        usps: [],
        guarantees: [],
        hooks: [],
        ctas: [],
        brandVoice: null,
        totalItems: 0
      };
    }
  }

  /**
   * Check if content needs refresh
   */
  async checkContentFreshness(tenant, websiteUrl) {
    if (!this.supabase) return { needsRefresh: true, reason: 'no_data' };

    try {
      const { data, error } = await this.supabase
        .from('website_content')
        .select('scraped_at, content_summary')
        .eq('tenant_id', tenant)
        .eq('url', websiteUrl)
        .single();

      if (error || !data) {
        return { needsRefresh: true, reason: 'no_previous_scrape' };
      }

      const scrapedAt = new Date(data.scraped_at);
      const now = new Date();
      const ageInMs = now - scrapedAt;

      // Check if content is older than threshold (7 days default)
      const threshold = this.freshnessThresholds.products;

      if (ageInMs > threshold) {
        return {
          needsRefresh: true,
          reason: 'stale_content',
          lastScraped: data.scraped_at,
          ageInDays: Math.floor(ageInMs / (24 * 60 * 60 * 1000))
        };
      }

      return {
        needsRefresh: false,
        lastScraped: data.scraped_at,
        ageInDays: Math.floor(ageInMs / (24 * 60 * 60 * 1000)),
        summary: data.content_summary
      };

    } catch (error) {
      logger.error('Failed to check content freshness:', error);
      return { needsRefresh: true, reason: 'error' };
    }
  }

  /**
   * Delete old/expired content
   */
  async cleanupExpiredContent(tenant) {
    if (!this.supabase) return { deleted: 0 };

    try {
      const { data, error } = await this.supabase
        .from('content_index')
        .delete()
        .eq('tenant_id', tenant)
        .lt('expires_at', new Date().toISOString())
        .select();

      if (error) throw error;

      logger.info(`Cleaned up ${data?.length || 0} expired content items for ${tenant}`);

      return { deleted: data?.length || 0 };

    } catch (error) {
      logger.error('Failed to cleanup expired content:', error);
      return { deleted: 0, error: error.message };
    }
  }

  /**
   * Helper: Group items by type
   */
  groupItemsByType(items) {
    const grouped = {};

    for (const item of items) {
      const type = item.content_type || 'unknown';
      if (!grouped[type]) {
        grouped[type] = 0;
      }
      grouped[type]++;
    }

    return grouped;
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let indexerInstance = null;

/**
 * Get singleton content indexer instance
 */
export function getContentIndexer() {
  if (!indexerInstance) {
    indexerInstance = new ContentIndexerService();
  }
  return indexerInstance;
}

export default getContentIndexer;