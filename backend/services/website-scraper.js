/**
 * Website Scraper Service for ProofKit SaaS
 * Intelligently scrapes user's website for products, USPs, testimonials, and content
 * Extracts winning hooks, guarantees, and offers for dynamic ad creation
 *
 * Features:
 * - Product/service extraction from e-commerce and service sites
 * - USP and value proposition identification
 * - Testimonial and social proof extraction
 * - Offer, promotion, and guarantee detection
 * - Brand voice and tone analysis
 * - Winning hook and compelling copy identification
 */

import logger from './logger.js';
import { getContentExtractor } from './content-extractor.js';
import { getContentIndexer } from './content-indexer.js';

/**
 * Website Scraper Service with intelligent content extraction
 */
export class WebsiteScraperService {
  constructor() {
    this.extractor = null;
    this.indexer = null;
    this.initialized = false;

    // Scraping configuration
    this.config = {
      timeout: 15000, // 15 seconds timeout
      maxRetries: 3,
      userAgent: 'ProofKit-ContentBot/2.0 (+https://proofkit.io/bot)',
      maxDepth: 3, // Max crawl depth
      maxPages: 20, // Max pages to crawl per site
      respectRobotsTxt: true,
    };

    // Content detection patterns
    this.patterns = {
      products: [
        '/products', '/shop', '/store', '/catalog',
        'product-', 'item-', '/collections'
      ],
      testimonials: [
        'testimonial', 'review', 'feedback', 'customer-story',
        'case-study', 'success-story'
      ],
      offers: [
        'discount', 'sale', 'promo', 'deal', 'offer',
        'limited-time', 'special'
      ],
      about: ['/about', '/story', '/mission', '/vision'],
      pricing: ['/pricing', '/plans', '/packages']
    };

    // Metrics tracking
    this.metrics = {
      sitesScraped: 0,
      pagesScraped: 0,
      productsFound: 0,
      testimonialsFound: 0,
      offersFound: 0,
      errors: 0,
      cacheHits: 0
    };

    // Cache for recent scrapes (30 minutes)
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000;
  }

  /**
   * Initialize the scraper service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      this.extractor = getContentExtractor();
      this.indexer = getContentIndexer();

      await this.extractor.initialize();
      await this.indexer.initialize();

      this.initialized = true;
      logger.info('Website scraper service initialized');
    } catch (error) {
      logger.error('Failed to initialize website scraper:', error);
      throw error;
    }
  }

  /**
   * Scrape a complete website for all relevant content
   * @param {string} url - Website URL to scrape
   * @param {object} options - Scraping options
   * @returns {object} Scraped content and metadata
   */
  async scrapeWebsite(url, options = {}) {
    const {
      tenant,
      depth = 2,
      includeProducts = true,
      includeTestimonials = true,
      includeOffers = true,
      includeBrandVoice = true,
      forceRefresh = false
    } = options;

    if (!tenant) {
      throw new Error('Tenant required for website scraping');
    }

    try {
      await this.initialize();

      // Check cache first
      const cacheKey = `${tenant}:${url}`;
      if (!forceRefresh && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          this.metrics.cacheHits++;
          logger.info(`Using cached content for ${url}`);
          return cached.data;
        }
      }

      logger.info(`Starting website scrape for ${url} (tenant: ${tenant})`);
      const startTime = Date.now();

      // Normalize URL
      const normalizedUrl = this.normalizeUrl(url);

      // Scrape homepage first
      const homepageData = await this.scrapePage(normalizedUrl, {
        isHomepage: true,
        extractAll: true
      });

      // Discover and scrape additional pages
      const discoveredUrls = this.discoverUrls(homepageData.links, normalizedUrl, depth);
      const additionalPages = await this.scrapeMultiplePages(discoveredUrls, {
        maxPages: this.config.maxPages - 1 // We already scraped homepage
      });

      // Aggregate all content
      const aggregatedContent = this.aggregateContent([homepageData, ...additionalPages]);

      // Extract structured data
      const structuredData = {
        homepage: homepageData,
        products: includeProducts ? this.extractProducts(aggregatedContent) : [],
        usps: this.extractUSPs(aggregatedContent),
        testimonials: includeTestimonials ? this.extractTestimonials(aggregatedContent) : [],
        offers: includeOffers ? this.extractOffers(aggregatedContent) : [],
        guarantees: this.extractGuarantees(aggregatedContent),
        brandVoice: includeBrandVoice ? this.analyzeBrandVoice(aggregatedContent) : {},
        hooks: this.extractWinningHooks(aggregatedContent),
        ctas: this.extractCTAs(aggregatedContent),
        metadata: {
          url: normalizedUrl,
          scrapedAt: new Date().toISOString(),
          pagesScraped: additionalPages.length + 1,
          duration: Date.now() - startTime
        }
      };

      // Index content for quick retrieval
      await this.indexer.indexWebsiteContent(tenant, structuredData);

      // Cache the result
      this.cache.set(cacheKey, {
        data: structuredData,
        timestamp: Date.now()
      });

      // Update metrics
      this.metrics.sitesScraped++;
      this.metrics.pagesScraped += structuredData.metadata.pagesScraped;
      this.metrics.productsFound += structuredData.products.length;
      this.metrics.testimonialsFound += structuredData.testimonials.length;
      this.metrics.offersFound += structuredData.offers.length;

      logger.info(`Website scrape completed: ${structuredData.metadata.pagesScraped} pages, ${structuredData.products.length} products, ${structuredData.testimonials.length} testimonials`);

      return structuredData;

    } catch (error) {
      this.metrics.errors++;
      logger.error(`Website scraping failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Scrape a single page
   */
  async scrapePage(url, options = {}) {
    const { isHomepage = false, extractAll = false } = options;

    try {
      // Fetch page with retries
      const html = await this.fetchPageWithRetry(url);

      // Extract all content using content extractor
      const extractedData = await this.extractor.extractFromHTML(html, url);

      return {
        url,
        isHomepage,
        ...extractedData,
        scrapedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Failed to scrape page ${url}:`, error.message);
      return {
        url,
        error: error.message,
        scrapedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Scrape multiple pages in parallel
   */
  async scrapeMultiplePages(urls, options = {}) {
    const { maxPages = 10, concurrency = 3 } = options;
    const limitedUrls = urls.slice(0, maxPages);

    const results = [];

    // Process in batches for controlled concurrency
    for (let i = 0; i < limitedUrls.length; i += concurrency) {
      const batch = limitedUrls.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(url => this.scrapePage(url))
      );

      results.push(...batchResults
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)
      );
    }

    return results;
  }

  /**
   * Fetch page HTML with retry logic
   */
  async fetchPageWithRetry(url, retryCount = 0) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        },
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      return html;

    } catch (error) {
      if (retryCount < this.config.maxRetries) {
        logger.warn(`Fetch failed for ${url}, retrying (${retryCount + 1}/${this.config.maxRetries})`);
        await this.sleep(1000 * (retryCount + 1)); // Exponential backoff
        return this.fetchPageWithRetry(url, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Discover URLs to scrape from links
   */
  discoverUrls(links, baseUrl, maxDepth) {
    const discovered = new Set();
    const baseDomain = new URL(baseUrl).hostname;

    for (const link of links) {
      try {
        const absoluteUrl = new URL(link, baseUrl).href;
        const linkDomain = new URL(absoluteUrl).hostname;

        // Only follow same-domain links
        if (linkDomain === baseDomain) {
          // Prioritize important pages
          const isImportant = this.isImportantUrl(absoluteUrl);
          if (isImportant || discovered.size < this.config.maxPages) {
            discovered.add(absoluteUrl);
          }
        }
      } catch (error) {
        // Invalid URL, skip
        continue;
      }
    }

    return Array.from(discovered).slice(0, this.config.maxPages);
  }

  /**
   * Check if URL is important (products, pricing, etc.)
   */
  isImportantUrl(url) {
    const urlLower = url.toLowerCase();

    // Check against all pattern categories
    for (const patterns of Object.values(this.patterns)) {
      if (patterns.some(pattern => urlLower.includes(pattern))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Aggregate content from multiple pages
   */
  aggregateContent(pages) {
    const aggregated = {
      allText: [],
      allHeadings: [],
      allLinks: [],
      allImages: [],
      allStructuredData: [],
      productPages: [],
      aboutPages: [],
      pricingPages: []
    };

    for (const page of pages) {
      if (page.error) continue;

      aggregated.allText.push(...(page.textContent || []));
      aggregated.allHeadings.push(...(page.headings || []));
      aggregated.allLinks.push(...(page.links || []));
      aggregated.allImages.push(...(page.images || []));
      aggregated.allStructuredData.push(...(page.structuredData || []));

      // Categorize pages
      const urlLower = page.url.toLowerCase();
      if (this.patterns.products.some(p => urlLower.includes(p))) {
        aggregated.productPages.push(page);
      }
      if (this.patterns.about.some(p => urlLower.includes(p))) {
        aggregated.aboutPages.push(page);
      }
      if (this.patterns.pricing.some(p => urlLower.includes(p))) {
        aggregated.pricingPages.push(page);
      }
    }

    return aggregated;
  }

  /**
   * Extract products from aggregated content
   */
  extractProducts(content) {
    const products = [];

    // Extract from structured data (JSON-LD)
    for (const data of content.allStructuredData) {
      if (data['@type'] === 'Product') {
        products.push({
          name: data.name || '',
          description: data.description || '',
          price: data.offers?.price || data.price || null,
          currency: data.offers?.priceCurrency || 'USD',
          image: data.image || null,
          url: data.url || null,
          brand: data.brand?.name || null,
          rating: data.aggregateRating?.ratingValue || null,
          source: 'structured_data'
        });
      }
    }

    // Extract from product pages (if no structured data found)
    if (products.length === 0) {
      for (const page of content.productPages) {
        const productData = this.extractor.extractProductFromPage(page);
        if (productData) {
          products.push({
            ...productData,
            source: 'html_extraction'
          });
        }
      }
    }

    return this.deduplicateItems(products, 'name');
  }

  /**
   * Extract USPs (Unique Selling Propositions)
   */
  extractUSPs(content) {
    const usps = [];

    // Look for common USP patterns in headings
    const uspPatterns = [
      /why (choose|us|our)/i,
      /what (makes|sets) (us|our)/i,
      /benefits?/i,
      /features?/i,
      /advantage/i,
      /guaranteed?/i,
      /proven/i,
      /certified/i,
      /award/i,
      /best/i,
      /\d+\+ (years|customers|products)/i,
      /free (shipping|returns|trial)/i,
      /\d+% (off|discount)/i,
      /satisfaction guaranteed/i
    ];

    // Check headings
    for (const heading of content.allHeadings) {
      const text = heading.text || '';
      if (uspPatterns.some(pattern => pattern.test(text))) {
        usps.push({
          text: text,
          type: 'heading',
          confidence: 'high'
        });
      }
    }

    // Check for bullet points and feature lists
    const textContent = content.allText.join(' ');
    const uspKeywords = [
      'free shipping', 'money back', 'guarantee', 'warranty',
      'certified', 'licensed', 'insured', 'bonded',
      '24/7 support', 'same day', 'next day', 'fast delivery',
      'no commitment', 'cancel anytime', 'risk free'
    ];

    for (const keyword of uspKeywords) {
      const regex = new RegExp(`([^.!?]*${keyword}[^.!?]*)`, 'gi');
      const matches = textContent.match(regex);
      if (matches) {
        matches.slice(0, 3).forEach(match => {
          usps.push({
            text: match.trim(),
            type: 'feature',
            confidence: 'medium'
          });
        });
      }
    }

    return this.deduplicateItems(usps, 'text').slice(0, 10);
  }

  /**
   * Extract testimonials and reviews
   */
  extractTestimonials(content) {
    const testimonials = [];

    // Extract from structured data
    for (const data of content.allStructuredData) {
      if (data['@type'] === 'Review') {
        testimonials.push({
          text: data.reviewBody || '',
          author: data.author?.name || 'Anonymous',
          rating: data.reviewRating?.ratingValue || null,
          date: data.datePublished || null,
          source: 'structured_data'
        });
      }
    }

    // Look for testimonial patterns in text
    const testimonialPatterns = [
      /"([^"]{30,200})"/g, // Quoted text between 30-200 chars
      /testimonial[^a-z]([^.!?]{30,200})[.!?]/gi,
      /review[^a-z]([^.!?]{30,200})[.!?]/gi
    ];

    const textContent = content.allText.join(' ');
    for (const pattern of testimonialPatterns) {
      const matches = [...textContent.matchAll(pattern)];
      matches.slice(0, 5).forEach(match => {
        const text = match[1].trim();
        if (text.split(' ').length >= 10) { // At least 10 words
          testimonials.push({
            text: text,
            author: 'Customer',
            rating: null,
            date: null,
            source: 'text_extraction'
          });
        }
      });
    }

    return this.deduplicateItems(testimonials, 'text').slice(0, 15);
  }

  /**
   * Extract offers and promotions
   */
  extractOffers(content) {
    const offers = [];
    const textContent = content.allText.join(' ');

    // Discount patterns
    const discountPatterns = [
      /(\d+%\s+off)/gi,
      /(save\s+\$?\d+)/gi,
      /(buy\s+\d+\s+get\s+\d+)/gi,
      /(limited\s+time\s+offer)/gi,
      /(special\s+offer)/gi,
      /(sale\s+now\s+on)/gi,
      /(free\s+shipping)/gi,
      /(first\s+order\s+discount)/gi
    ];

    for (const pattern of discountPatterns) {
      const matches = [...textContent.matchAll(pattern)];
      matches.slice(0, 3).forEach(match => {
        offers.push({
          text: match[0].trim(),
          type: 'discount',
          confidence: 'high'
        });
      });
    }

    // Extract from structured data
    for (const data of content.allStructuredData) {
      if (data['@type'] === 'Offer') {
        offers.push({
          text: data.name || data.description || '',
          type: 'structured_offer',
          price: data.price || null,
          validUntil: data.priceValidUntil || null,
          confidence: 'high'
        });
      }
    }

    return this.deduplicateItems(offers, 'text').slice(0, 10);
  }

  /**
   * Extract guarantees
   */
  extractGuarantees(content) {
    const guarantees = [];
    const textContent = content.allText.join(' ');

    const guaranteePatterns = [
      /money[\s-]?back\s+guarantee/gi,
      /satisfaction\s+guaranteed?/gi,
      /\d+[\s-]?day\s+guarantee/gi,
      /lifetime\s+warranty/gi,
      /risk[\s-]?free/gi,
      /no[\s-]?questions[\s-]?asked/gi,
      /100%\s+guaranteed?/gi
    ];

    for (const pattern of guaranteePatterns) {
      const matches = [...textContent.matchAll(pattern)];
      matches.slice(0, 2).forEach(match => {
        // Get surrounding context (50 chars before and after)
        const index = match.index;
        const start = Math.max(0, index - 50);
        const end = Math.min(textContent.length, index + match[0].length + 50);
        const context = textContent.substring(start, end).trim();

        guarantees.push({
          text: match[0],
          context: context,
          confidence: 'high'
        });
      });
    }

    return this.deduplicateItems(guarantees, 'text');
  }

  /**
   * Analyze brand voice and tone
   */
  analyzeBrandVoice(content) {
    const textContent = content.allText.join(' ');
    const headings = content.allHeadings.map(h => h.text).join(' ');

    // Analyze tone indicators
    const toneIndicators = {
      professional: ['certified', 'licensed', 'professional', 'expert', 'industry'],
      friendly: ['love', 'enjoy', 'happy', 'welcome', 'community'],
      urgent: ['now', 'today', 'limited', 'hurry', 'don\'t miss'],
      luxury: ['premium', 'exclusive', 'luxury', 'elite', 'bespoke'],
      casual: ['hey', 'awesome', 'cool', 'great', 'amazing']
    };

    const toneScores = {};
    for (const [tone, keywords] of Object.entries(toneIndicators)) {
      const score = keywords.reduce((count, keyword) => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = (textContent.match(regex) || []).length;
        return count + matches;
      }, 0);
      toneScores[tone] = score;
    }

    // Determine primary tone
    const primaryTone = Object.entries(toneScores)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'professional';

    // Analyze common phrases
    const commonPhrases = this.extractCommonPhrases(textContent, 3, 6);

    return {
      primaryTone,
      toneScores,
      commonPhrases: commonPhrases.slice(0, 10),
      avgSentenceLength: this.calculateAvgSentenceLength(textContent),
      formalityScore: this.calculateFormalityScore(textContent)
    };
  }

  /**
   * Extract winning hooks from content
   */
  extractWinningHooks(content) {
    const hooks = [];

    // H1 headings are often main hooks
    const h1Headings = content.allHeadings.filter(h => h.level === 1);
    h1Headings.forEach(heading => {
      hooks.push({
        text: heading.text,
        type: 'headline',
        location: 'h1',
        confidence: 'high'
      });
    });

    // Check for hook patterns in text
    const hookPatterns = [
      /^(Discover|Learn|Get|Start|Transform|Unlock|Achieve)/i,
      /(in just|within|in only)\s+\d+\s+(minutes|hours|days)/gi,
      /without\s+(the|any)\s+\w+/gi,
      /\d+\s+(ways|reasons|secrets|tips|strategies)/gi
    ];

    const textContent = content.allText.join(' ');
    for (const pattern of hookPatterns) {
      const matches = [...textContent.matchAll(pattern)];
      matches.slice(0, 3).forEach(match => {
        hooks.push({
          text: match[0],
          type: 'hook_pattern',
          confidence: 'medium'
        });
      });
    }

    return this.deduplicateItems(hooks, 'text').slice(0, 15);
  }

  /**
   * Extract CTAs (Call to Actions)
   */
  extractCTAs(content) {
    const ctas = new Set();

    // Common CTA patterns
    const ctaPatterns = [
      /get\s+(started|quote|free)/i,
      /sign\s+up/i,
      /try\s+(free|now|today)/i,
      /shop\s+now/i,
      /buy\s+now/i,
      /order\s+(now|today)/i,
      /contact\s+us/i,
      /schedule/i,
      /book\s+(now|today)/i,
      /learn\s+more/i,
      /download/i,
      /subscribe/i
    ];

    const textContent = content.allText.join(' ');
    for (const pattern of ctaPatterns) {
      const matches = [...textContent.matchAll(pattern)];
      matches.slice(0, 2).forEach(match => {
        ctas.add(match[0].trim());
      });
    }

    return Array.from(ctas).slice(0, 10);
  }

  /**
   * Helper: Normalize URL
   */
  normalizeUrl(url) {
    try {
      const parsed = new URL(url);
      // Remove trailing slash
      return parsed.href.replace(/\/$/, '');
    } catch (error) {
      // If not a valid URL, try adding https://
      return this.normalizeUrl(`https://${url}`);
    }
  }

  /**
   * Helper: Deduplicate items by key
   */
  deduplicateItems(items, key) {
    const seen = new Set();
    return items.filter(item => {
      const value = item[key]?.toLowerCase().trim();
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }

  /**
   * Helper: Extract common phrases
   */
  extractCommonPhrases(text, minWords, maxWords) {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

    const phrases = new Map();

    for (let len = minWords; len <= maxWords; len++) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(' ');
        phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
      }
    }

    return Array.from(phrases.entries())
      .filter(([phrase, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([phrase, count]) => ({ phrase, count }));
  }

  /**
   * Helper: Calculate average sentence length
   */
  calculateAvgSentenceLength(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return 0;

    const totalWords = sentences.reduce((sum, s) => {
      return sum + s.trim().split(/\s+/).length;
    }, 0);

    return Math.round(totalWords / sentences.length);
  }

  /**
   * Helper: Calculate formality score (0-100)
   */
  calculateFormalityScore(text) {
    const formalWords = ['therefore', 'however', 'furthermore', 'moreover', 'consequently'];
    const informalWords = ['really', 'very', 'pretty', 'kind of', 'sort of'];

    const textLower = text.toLowerCase();
    const formalCount = formalWords.reduce((sum, word) =>
      sum + (textLower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
    const informalCount = informalWords.reduce((sum, word) =>
      sum + (textLower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);

    const total = formalCount + informalCount;
    if (total === 0) return 50; // Neutral

    return Math.round((formalCount / total) * 100);
  }

  /**
   * Helper: Sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get scraping metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('Website scraper cache cleared');
  }
}

// Singleton instance
let scraperInstance = null;

/**
 * Get singleton website scraper instance
 */
export function getWebsiteScraper() {
  if (!scraperInstance) {
    scraperInstance = new WebsiteScraperService();
  }
  return scraperInstance;
}

/**
 * Quick scrape function
 */
export async function scrapeWebsite(url, tenant, options = {}) {
  const scraper = getWebsiteScraper();
  return await scraper.scrapeWebsite(url, { tenant, ...options });
}

export default getWebsiteScraper;