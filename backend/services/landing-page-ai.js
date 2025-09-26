/**
 * Landing Page AI Optimization Service for ProofKit SaaS
 * Analyzes landing pages and generates AI-powered optimization suggestions
 * PRO tier feature - never auto-publishes, only creates drafts
 */

import { getAIProviderService } from './ai-provider.js';
import { ShopifyLandingPageAPI } from '../middleware/shopify-auth.js';
import logger from './logger.js';

/**
 * Landing Page AI Service
 */
export class LandingPageAIService {
  constructor() {
    this.aiProvider = getAIProviderService();
    this.initialized = false;
    this.metrics = {
      analyses: 0,
      suggestions: 0,
      draftsCreated: 0,
      errors: 0
    };
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await this.aiProvider.initialize();
      this.initialized = true;
      logger.info('Landing Page AI service initialized');
    } catch (error) {
      logger.error('Failed to initialize Landing Page AI service:', error);
      throw error;
    }
  }

  /**
   * Analyze a landing page URL and generate optimization suggestions
   */
  async analyzeLandingPage(url, options = {}) {
    const { tenant, shopifySession } = options;

    if (!tenant) {
      throw new Error('Tenant required for landing page analysis');
    }

    try {
      await this.initialize();

      let pageContent;
      let shopContext = null;

      // Try to get content via Shopify API first if session available
      if (shopifySession) {
        try {
          const shopifyAPI = new ShopifyLandingPageAPI(shopifySession);

          // Check if this is a Shopify page URL
          if (url.includes('.myshopify.com') || url.includes('shopify')) {
            const shopifyPageContent = await shopifyAPI.getLandingPageContent(url);
            pageContent = this.convertShopifyContentToAnalysisFormat(shopifyPageContent);
            shopContext = await shopifyAPI.getShopContext();
          } else {
            // External URL - fallback to web scraping
            pageContent = await this.fetchPageContent(url);
          }
        } catch (shopifyError) {
          logger.warn(`Shopify API failed, falling back to web scraping: ${shopifyError.message}`);
          pageContent = await this.fetchPageContent(url);
        }
      } else {
        // No Shopify session - use web scraping
        pageContent = await this.fetchPageContent(url);
      }

      // Generate AI analysis with shop context
      const analysis = await this.generatePageAnalysis(pageContent, tenant, shopContext);

      // Generate specific suggestions
      const suggestions = await this.generateOptimizationSuggestions(analysis, pageContent, tenant, shopContext);

      // Store analysis for tenant
      await this.storeAnalysis(tenant, url, analysis, suggestions);

      this.metrics.analyses++;

      return {
        url,
        analysis,
        suggestions,
        timestamp: new Date().toISOString(),
        status: 'completed',
        source: shopifySession ? 'shopify_api' : 'web_scraping'
      };

    } catch (error) {
      this.metrics.errors++;
      logger.error(`Landing page analysis failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Fetch and parse page content for analysis
   */
  async fetchPageContent(url) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ProofKit-AI-Analyzer/1.0'
        },
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();

      // Parse key elements from HTML
      const content = this.parseHTMLContent(html);

      return content;

    } catch (error) {
      logger.error(`Failed to fetch page content from ${url}:`, error);
      throw new Error(`Cannot access page: ${error.message}`);
    }
  }

  /**
   * Parse HTML content to extract key elements
   */
  parseHTMLContent(html) {
    // Simple HTML parsing - in production, consider using a proper parser like cheerio
    const content = {
      title: this.extractTitle(html),
      headings: this.extractHeadings(html),
      ctas: this.extractCTAs(html),
      aboveTheFold: this.extractAboveTheFold(html),
      meta: this.extractMetaTags(html),
      images: this.extractImages(html),
      textContent: this.extractTextContent(html)
    };

    return content;
  }

  /**
   * Extract title from HTML
   */
  extractTitle(html) {
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : '';
  }

  /**
   * Extract headings from HTML
   */
  extractHeadings(html) {
    const headings = [];
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
    let match;

    while ((match = headingRegex.exec(html)) !== null) {
      headings.push({
        level: parseInt(match[1]),
        text: match[2].replace(/<[^>]*>/g, '').trim()
      });
    }

    return headings;
  }

  /**
   * Extract CTAs from HTML
   */
  extractCTAs(html) {
    const ctas = [];

    // Look for buttons and links that might be CTAs
    const buttonRegex = /<(?:button|a)[^>]*class="[^"]*(?:btn|button|cta)[^"]*"[^>]*>(.*?)<\/(?:button|a)>/gi;
    let match;

    while ((match = buttonRegex.exec(html)) !== null) {
      const text = match[1].replace(/<[^>]*>/g, '').trim();
      if (text.length > 0) {
        ctas.push(text);
      }
    }

    return ctas;
  }

  /**
   * Extract above-the-fold content
   */
  extractAboveTheFold(html) {
    // Simple heuristic: first 1000 characters of body content
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (!bodyMatch) return '';

    const bodyContent = bodyMatch[1];
    const textContent = bodyContent.replace(/<script[\s\S]*?<\/script>/gi, '')
                                  .replace(/<style[\s\S]*?<\/style>/gi, '')
                                  .replace(/<[^>]*>/g, ' ')
                                  .replace(/\s+/g, ' ')
                                  .trim();

    return textContent.substring(0, 1000);
  }

  /**
   * Extract meta tags
   */
  extractMetaTags(html) {
    const meta = {};
    const metaRegex = /<meta[^>]+>/gi;
    let match;

    while ((match = metaRegex.exec(html)) !== null) {
      const metaTag = match[0];
      const nameMatch = metaTag.match(/name="([^"]+)"/);
      const contentMatch = metaTag.match(/content="([^"]+)"/);

      if (nameMatch && contentMatch) {
        meta[nameMatch[1]] = contentMatch[1];
      }
    }

    return meta;
  }

  /**
   * Extract image information
   */
  extractImages(html) {
    const images = [];
    const imgRegex = /<img[^>]+>/gi;
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
      const imgTag = match[0];
      const srcMatch = imgTag.match(/src="([^"]+)"/);
      const altMatch = imgTag.match(/alt="([^"]+)"/);

      if (srcMatch) {
        images.push({
          src: srcMatch[1],
          alt: altMatch ? altMatch[1] : ''
        });
      }
    }

    return images.slice(0, 10); // Limit to first 10 images
  }

  /**
   * Extract text content for analysis
   */
  extractTextContent(html) {
    return html.replace(/<script[\s\S]*?<\/script>/gi, '')
               .replace(/<style[\s\S]*?<\/style>/gi, '')
               .replace(/<[^>]*>/g, ' ')
               .replace(/\s+/g, ' ')
               .trim()
               .substring(0, 2000); // Limit for AI processing
  }

  /**
   * Convert Shopify page content to analysis format
   */
  convertShopifyContentToAnalysisFormat(shopifyPageContent) {
    return {
      title: shopifyPageContent.title,
      headings: this.extractHeadingsFromHTML(shopifyPageContent.content),
      ctas: this.extractCTAsFromHTML(shopifyPageContent.content),
      aboveTheFold: shopifyPageContent.content.substring(0, 1000),
      meta: {
        description: `Shopify page: ${shopifyPageContent.handle}`,
        published: shopifyPageContent.published
      },
      images: this.extractImagesFromHTML(shopifyPageContent.content),
      textContent: this.extractTextContentFromHTML(shopifyPageContent.content),
      shopifyData: {
        id: shopifyPageContent.id,
        handle: shopifyPageContent.handle,
        url: shopifyPageContent.url,
        metafields: shopifyPageContent.metafields
      }
    };
  }

  /**
   * Extract headings from HTML content
   */
  extractHeadingsFromHTML(html) {
    const headings = [];
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
    let match;

    while ((match = headingRegex.exec(html)) !== null) {
      headings.push({
        level: parseInt(match[1]),
        text: match[2].replace(/<[^>]*>/g, '').trim()
      });
    }

    return headings;
  }

  /**
   * Extract CTAs from HTML content
   */
  extractCTAsFromHTML(html) {
    const ctas = [];
    const buttonRegex = /<(?:button|a)[^>]*class="[^"]*(?:btn|button|cta)[^"]*"[^>]*>(.*?)<\/(?:button|a)>/gi;
    let match;

    while ((match = buttonRegex.exec(html)) !== null) {
      const text = match[1].replace(/<[^>]*>/g, '').trim();
      if (text.length > 0) {
        ctas.push(text);
      }
    }

    return ctas;
  }

  /**
   * Extract images from HTML content
   */
  extractImagesFromHTML(html) {
    const images = [];
    const imgRegex = /<img[^>]+>/gi;
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
      const imgTag = match[0];
      const srcMatch = imgTag.match(/src="([^"]+)"/);
      const altMatch = imgTag.match(/alt="([^"]+)"/);

      if (srcMatch) {
        images.push({
          src: srcMatch[1],
          alt: altMatch ? altMatch[1] : ''
        });
      }
    }

    return images.slice(0, 10);
  }

  /**
   * Extract text content from HTML
   */
  extractTextContentFromHTML(html) {
    return html.replace(/<script[\s\S]*?<\/script>/gi, '')
               .replace(/<style[\s\S]*?<\/style>/gi, '')
               .replace(/<[^>]*>/g, ' ')
               .replace(/\s+/g, ' ')
               .trim()
               .substring(0, 2000);
  }

  /**
   * Generate AI-powered page analysis
   */
  async generatePageAnalysis(pageContent, tenant, shopContext = null) {
    let contextInfo = '';
    if (shopContext) {
      contextInfo = `

Shop Context:
- Store: ${shopContext.shop}
- Product Types: ${shopContext.productTypes.join(', ')}
- Popular Tags: ${shopContext.commonTags.join(', ')}
- Products Count: ${shopContext.products.length}
- Collections Count: ${shopContext.collections.length}`;
    }

    const prompt = `Analyze this landing page content for conversion optimization opportunities:

Title: ${pageContent.title}

Headings: ${pageContent.headings.map(h => `H${h.level}: ${h.text}`).join('\n')}

CTAs: ${pageContent.ctas.join(', ')}

Above-the-fold content: ${pageContent.aboveTheFold}

Meta description: ${pageContent.meta.description || 'None'}${contextInfo}

Provide analysis in JSON format:
{
  "overallScore": 1-10,
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "conversionIssues": ["issue1", "issue2"],
  "mobileReadiness": 1-10,
  "loadSpeedConcerns": ["concern1", "concern2"],
  "trustSignals": ["signal1", "signal2"],
  "competitiveAdvantage": "brief analysis"
}`;

    try {
      const result = await this.aiProvider.generateText(prompt, {
        tenant,
        operation: 'landing_page_analysis',
        model: 'gpt-3.5-turbo'
      });

      return JSON.parse(result || '{}');
    } catch (error) {
      logger.error('Failed to generate page analysis:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Generate optimization suggestions
   */
  async generateOptimizationSuggestions(analysis, pageContent, tenant, shopContext = null) {
    const prompt = `Based on this landing page analysis, generate specific optimization suggestions:

Current title: ${pageContent.title}
Current CTAs: ${pageContent.ctas.join(', ')}
Analysis weaknesses: ${analysis.weaknesses?.join(', ') || 'None identified'}
Conversion issues: ${analysis.conversionIssues?.join(', ') || 'None identified'}

Generate optimization suggestions in JSON format:
{
  "titleSuggestions": [
    {"suggestion": "New title", "reason": "Why this is better"},
    {"suggestion": "Alternative title", "reason": "Why this works"}
  ],
  "ctaSuggestions": [
    {"suggestion": "New CTA text", "reason": "Why this converts better"},
    {"suggestion": "Alternative CTA", "reason": "Why this is effective"}
  ],
  "aboveTheFoldSuggestions": [
    {"suggestion": "Content improvement", "reason": "Impact on conversion"}
  ],
  "urgencySuggestions": [
    {"suggestion": "Urgency element", "reason": "How it helps conversion"}
  ],
  "trustSuggestions": [
    {"suggestion": "Trust signal to add", "reason": "Why it builds trust"}
  ],
  "priorityChanges": [
    {"change": "High-impact change", "priority": "high", "expectedLift": "5-10%"}
  ]
}`;

    try {
      const result = await this.aiProvider.generateText(prompt, {
        tenant,
        operation: 'optimization_suggestions',
        model: 'gpt-3.5-turbo'
      });

      const suggestions = JSON.parse(result || '{}');
      this.metrics.suggestions++;
      return suggestions;
    } catch (error) {
      logger.error('Failed to generate optimization suggestions:', error);
      return this.getDefaultSuggestions();
    }
  }

  /**
   * Get landing page suggestions for a tenant
   */
  async getLandingSuggestions(tenant, options = {}) {
    try {
      // In a real implementation, this would fetch from database
      // For now, return cached suggestions or generate new ones
      const cachedSuggestions = await this.getCachedSuggestions(tenant);

      if (cachedSuggestions && cachedSuggestions.length > 0) {
        return {
          suggestions: cachedSuggestions,
          status: 'cached',
          lastUpdated: cachedSuggestions[0]?.timestamp || new Date().toISOString()
        };
      }

      return {
        suggestions: [],
        status: 'no_data',
        message: 'No landing page analyses found. Analyze a page first.'
      };
    } catch (error) {
      logger.error(`Failed to get landing suggestions for tenant ${tenant}:`, error);
      throw error;
    }
  }

  /**
   * Create draft page modifications (integration point for Shopify)
   */
  async createDraftModifications(tenant, pageId, suggestions, options = {}) {
    const { shopifySession } = options;

    if (!shopifySession) {
      throw new Error('Shopify session required for draft creation');
    }

    try {
      // Use Shopify API to create actual draft
      const shopifyAPI = new ShopifyLandingPageAPI(shopifySession);

      // Prepare modifications from AI suggestions
      const modifications = this.prepareDraftModifications(suggestions);

      // Create draft through Shopify API - never auto-publish
      const draftResult = await shopifyAPI.createDraftModifications(pageId, modifications);

      // Store draft metadata for tracking
      await this.storeDraftChanges(tenant, {
        ...draftResult,
        tenant,
        suggestions,
        autoPublish: false // Always false for safety
      });

      this.metrics.draftsCreated++;

      return {
        draftId: draftResult.draftId,
        modifications: draftResult.modifications,
        status: 'draft_created',
        message: 'Draft modifications created in Shopify for review. Manual approval required.',
        shopifyDraftUrl: draftResult.draftContent ? `Draft created for page ${pageId}` : null
      };

    } catch (error) {
      logger.error(`Failed to create draft modifications:`, error);
      throw error;
    }
  }

  /**
   * Prepare draft modifications from AI suggestions
   */
  prepareDraftModifications(suggestions) {
    const modifications = [];

    // Title modifications
    if (suggestions.titleSuggestions && suggestions.titleSuggestions.length > 0) {
      modifications.push({
        type: 'title',
        current: 'Current title',
        suggested: suggestions.titleSuggestions[0].suggestion,
        reason: suggestions.titleSuggestions[0].reason,
        priority: 'high'
      });
    }

    // CTA modifications
    if (suggestions.ctaSuggestions && suggestions.ctaSuggestions.length > 0) {
      modifications.push({
        type: 'cta',
        current: 'Current CTA',
        suggested: suggestions.ctaSuggestions[0].suggestion,
        reason: suggestions.ctaSuggestions[0].reason,
        priority: 'high'
      });
    }

    // Content modifications
    if (suggestions.aboveTheFoldSuggestions && suggestions.aboveTheFoldSuggestions.length > 0) {
      modifications.push({
        type: 'content',
        section: 'above_the_fold',
        suggested: suggestions.aboveTheFoldSuggestions[0].suggestion,
        reason: suggestions.aboveTheFoldSuggestions[0].reason,
        priority: 'medium'
      });
    }

    return modifications;
  }

  /**
   * Store analysis results
   */
  async storeAnalysis(tenant, url, analysis, suggestions) {
    // In a real implementation, this would store to database
    // For now, we'll use in-memory storage or log
    logger.info(`Storing analysis for tenant ${tenant}, URL: ${url}`);

    const analysisData = {
      tenant,
      url,
      analysis,
      suggestions,
      timestamp: new Date().toISOString()
    };

    // TODO: Implement database storage
    return analysisData;
  }

  /**
   * Get cached suggestions for tenant
   */
  async getCachedSuggestions(tenant) {
    // TODO: Implement database lookup
    return [];
  }

  /**
   * Store draft changes
   */
  async storeDraftChanges(tenant, draftChanges) {
    // TODO: Implement database storage
    logger.info(`Storing draft changes for tenant ${tenant}`);
    return draftChanges;
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      initialized: this.initialized,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Default analysis for error cases
   */
  getDefaultAnalysis() {
    return {
      overallScore: 5,
      strengths: ['Page is accessible'],
      weaknesses: ['Unable to perform detailed analysis'],
      conversionIssues: ['Analysis incomplete'],
      mobileReadiness: 5,
      loadSpeedConcerns: ['Unable to assess'],
      trustSignals: [],
      competitiveAdvantage: 'Analysis needed'
    };
  }

  /**
   * Default suggestions for error cases
   */
  getDefaultSuggestions() {
    return {
      titleSuggestions: [
        {
          suggestion: 'Review and optimize page title for conversions',
          reason: 'Clear, compelling titles improve click-through rates'
        }
      ],
      ctaSuggestions: [
        {
          suggestion: 'Test action-oriented CTA buttons',
          reason: 'Action words like "Get Started" or "Shop Now" drive clicks'
        }
      ],
      aboveTheFoldSuggestions: [
        {
          suggestion: 'Ensure key value proposition is immediately visible',
          reason: 'Visitors should understand your offer within 3 seconds'
        }
      ],
      urgencySuggestions: [
        {
          suggestion: 'Add limited-time offers or scarcity elements',
          reason: 'Urgency motivates immediate action'
        }
      ],
      trustSuggestions: [
        {
          suggestion: 'Display customer reviews and testimonials prominently',
          reason: 'Social proof builds trust and credibility'
        }
      ],
      priorityChanges: [
        {
          change: 'Optimize page title and main CTA',
          priority: 'high',
          expectedLift: '3-8%'
        }
      ]
    };
  }

  /**
   * Reset service metrics
   */
  resetMetrics() {
    this.metrics = {
      analyses: 0,
      suggestions: 0,
      draftsCreated: 0,
      errors: 0
    };
  }
}

// Singleton instance
let landingPageAIInstance = null;

/**
 * Get singleton Landing Page AI service instance
 */
export function getLandingPageAIService() {
  if (!landingPageAIInstance) {
    landingPageAIInstance = new LandingPageAIService();
  }
  return landingPageAIInstance;
}

/**
 * Quick analysis function for simple use cases
 */
export async function analyzePage(url, tenant, options = {}) {
  const service = getLandingPageAIService();
  return await service.analyzeLandingPage(url, { tenant, ...options });
}

/**
 * Validate landing page AI configuration
 */
export function validateLandingPageAIConfig() {
  const errors = [];

  // Check AI provider configuration
  const aiProvider = process.env.AI_PROVIDER;
  if (!aiProvider) {
    errors.push('AI_PROVIDER not configured for landing page analysis');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default getLandingPageAIService;