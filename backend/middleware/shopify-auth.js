/**
 * Shopify Authentication Middleware
 * Validates Shopify app sessions and provides API access utilities
 */

import { authenticate } from "@shopify/shopify-app-remix/server";
import logger from "../services/logger.js";

/**
 * Validate Shopify app session
 */
export async function validateShopifyAccess(shopifySession) {
  if (!shopifySession) {
    throw new Error("Shopify session required");
  }

  // Basic session validation
  if (!shopifySession.shop || !shopifySession.accessToken) {
    throw new Error("Invalid Shopify session - missing shop or access token");
  }

  return true;
}

/**
 * Create Shopify GraphQL client for API calls
 */
export function createShopifyGraphQLClient(shopifySession) {
  if (!shopifySession || !shopifySession.accessToken) {
    throw new Error("Valid Shopify session required for GraphQL client");
  }

  const shopDomain = shopifySession.shop.includes('.myshopify.com')
    ? shopifySession.shop
    : `${shopifySession.shop}.myshopify.com`;

  return {
    shop: shopDomain,
    accessToken: shopifySession.accessToken,

    /**
     * Execute GraphQL query
     */
    async query(query, variables = {}) {
      try {
        const response = await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': shopifySession.accessToken,
          },
          body: JSON.stringify({
            query,
            variables
          })
        });

        if (!response.ok) {
          throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.errors) {
          throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
        }

        return data.data;
      } catch (error) {
        logger.error('Shopify GraphQL query failed:', error);
        throw error;
      }
    }
  };
}

/**
 * Create Shopify REST API client
 */
export function createShopifyRESTClient(shopifySession) {
  if (!shopifySession || !shopifySession.accessToken) {
    throw new Error("Valid Shopify session required for REST client");
  }

  const shopDomain = shopifySession.shop.includes('.myshopify.com')
    ? shopifySession.shop
    : `${shopifySession.shop}.myshopify.com`;

  return {
    shop: shopDomain,
    accessToken: shopifySession.accessToken,

    /**
     * Execute REST API call
     */
    async request(endpoint, options = {}) {
      try {
        const url = `https://${shopDomain}/admin/api/2024-01/${endpoint}`;

        const response = await fetch(url, {
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': shopifySession.accessToken,
            ...options.headers
          },
          body: options.body ? JSON.stringify(options.body) : undefined
        });

        if (!response.ok) {
          throw new Error(`REST request failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        logger.error('Shopify REST request failed:', error);
        throw error;
      }
    },

    /**
     * Get pages
     */
    async getPages() {
      return this.request('pages.json');
    },

    /**
     * Get page by ID
     */
    async getPage(pageId) {
      return this.request(`pages/${pageId}.json`);
    },

    /**
     * Create page draft (for themes that support it)
     */
    async createPageDraft(pageId, content) {
      // Note: This is a simplified approach
      // In practice, you might need to work with theme files and liquid templates
      logger.info(`Creating draft for page ${pageId} - content length: ${content.length}`);

      // For now, we'll return a mock draft response
      // In a real implementation, this would interact with Shopify's theme API
      return {
        draft: {
          id: `draft_${pageId}_${Date.now()}`,
          pageId,
          status: 'draft',
          createdAt: new Date().toISOString(),
          content,
          message: 'Draft created for review. Manual publishing required.'
        }
      };
    },

    /**
     * Get products (for landing page content)
     */
    async getProducts(options = {}) {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.fields) params.append('fields', options.fields);

      const endpoint = `products.json${params.toString() ? '?' + params.toString() : ''}`;
      return this.request(endpoint);
    },

    /**
     * Get collections (for landing page content)
     */
    async getCollections(options = {}) {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.fields) params.append('fields', options.fields);

      const endpoint = `collections.json${params.toString() ? '?' + params.toString() : ''}`;
      return this.request(endpoint);
    }
  };
}

/**
 * Landing Page specific API utilities
 */
export class ShopifyLandingPageAPI {
  constructor(shopifySession) {
    this.session = shopifySession;
    this.restClient = createShopifyRESTClient(shopifySession);
    this.graphqlClient = createShopifyGraphQLClient(shopifySession);
  }

  /**
   * Get landing page content for analysis
   */
  async getLandingPageContent(pageId) {
    try {
      await validateShopifyAccess(this.session);

      if (pageId.startsWith('http')) {
        // If pageId is a URL, we need to find the page by URL or handle it differently
        return await this.getLandingPageByUrl(pageId);
      }

      // Get page by ID
      const pageData = await this.restClient.getPage(pageId);

      return {
        id: pageData.page.id,
        title: pageData.page.title,
        content: pageData.page.body_html || '',
        handle: pageData.page.handle,
        url: `https://${this.session.shop}/pages/${pageData.page.handle}`,
        published: pageData.page.published_at !== null,
        metafields: await this.getPageMetafields(pageId)
      };
    } catch (error) {
      logger.error(`Failed to get landing page content for ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Get landing page by URL
   */
  async getLandingPageByUrl(url) {
    try {
      // Extract handle from URL
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');

      let handle = null;
      if (pathParts.includes('pages') && pathParts.length > 2) {
        const pageIndex = pathParts.indexOf('pages');
        handle = pathParts[pageIndex + 1];
      }

      if (!handle) {
        throw new Error('Could not extract page handle from URL');
      }

      // Get all pages and find by handle
      const pagesData = await this.restClient.getPages();
      const page = pagesData.pages.find(p => p.handle === handle);

      if (!page) {
        throw new Error(`Page not found with handle: ${handle}`);
      }

      return await this.getLandingPageContent(page.id);
    } catch (error) {
      logger.error(`Failed to get landing page by URL ${url}:`, error);
      throw error;
    }
  }

  /**
   * Get page metafields for additional context
   */
  async getPageMetafields(pageId) {
    try {
      const metafields = await this.restClient.request(`pages/${pageId}/metafields.json`);
      return metafields.metafields || [];
    } catch (error) {
      logger.warn(`Failed to get metafields for page ${pageId}:`, error);
      return [];
    }
  }

  /**
   * Create draft modifications for a landing page
   */
  async createDraftModifications(pageId, modifications) {
    try {
      await validateShopifyAccess(this.session);

      // Get current page content
      const currentPage = await this.getLandingPageContent(pageId);

      // Apply modifications to create draft content
      const draftContent = this.applyModifications(currentPage, modifications);

      // Create draft (in a real implementation, this would use Shopify's draft system)
      const draft = await this.restClient.createPageDraft(pageId, draftContent);

      logger.info(`Created draft modifications for page ${pageId}`);

      return {
        draftId: draft.draft.id,
        originalPageId: pageId,
        modifications: modifications,
        draftContent: draftContent,
        status: 'draft_created',
        createdAt: draft.draft.createdAt,
        message: 'Draft created successfully. Review and publish manually.'
      };
    } catch (error) {
      logger.error(`Failed to create draft modifications for page ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Apply AI suggestions to page content
   */
  applyModifications(currentPage, modifications) {
    let modifiedContent = currentPage.content;
    let modifiedTitle = currentPage.title;

    // Apply title modifications
    const titleMod = modifications.find(m => m.type === 'title');
    if (titleMod) {
      modifiedTitle = titleMod.suggested;
    }

    // Apply CTA modifications
    const ctaMod = modifications.find(m => m.type === 'cta');
    if (ctaMod) {
      // Simple replacement of common CTA patterns
      modifiedContent = modifiedContent.replace(
        /(<button[^>]*>|<a[^>]*class="[^"]*btn[^"]*"[^>]*>)([^<]+)/gi,
        `$1${ctaMod.suggested}`
      );
    }

    // Apply content modifications
    const contentMod = modifications.find(m => m.type === 'content');
    if (contentMod && contentMod.section === 'above_the_fold') {
      // Add suggestion as a comment in the HTML for manual review
      modifiedContent = `<!-- AI Suggestion: ${contentMod.suggested} -->\n${modifiedContent}`;
    }

    return {
      title: modifiedTitle,
      content: modifiedContent,
      originalTitle: currentPage.title,
      originalContent: currentPage.content,
      modificationsApplied: modifications.length
    };
  }

  /**
   * Get shop context for AI analysis
   */
  async getShopContext() {
    try {
      // Get basic shop info, products, and collections for context
      const [productsData, collectionsData] = await Promise.all([
        this.restClient.getProducts({ limit: 10, fields: 'id,title,product_type,tags' }),
        this.restClient.getCollections({ limit: 5, fields: 'id,title,handle' })
      ]);

      return {
        shop: this.session.shop,
        products: productsData.products || [],
        collections: collectionsData.collections || [],
        productTypes: [...new Set(productsData.products?.map(p => p.product_type).filter(Boolean) || [])],
        commonTags: this.extractCommonTags(productsData.products || [])
      };
    } catch (error) {
      logger.error('Failed to get shop context:', error);
      return {
        shop: this.session.shop,
        products: [],
        collections: [],
        productTypes: [],
        commonTags: []
      };
    }
  }

  /**
   * Extract common tags for context
   */
  extractCommonTags(products) {
    const tagCounts = {};

    products.forEach(product => {
      if (product.tags) {
        product.tags.split(',').forEach(tag => {
          const cleanTag = tag.trim().toLowerCase();
          tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
        });
      }
    });

    return Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag);
  }
}

export default {
  validateShopifyAccess,
  createShopifyRESTClient,
  createShopifyGraphQLClient,
  ShopifyLandingPageAPI
};