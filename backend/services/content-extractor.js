/**
 * Content Extractor Service for Ads Autopilot AI SaaS
 * Intelligent HTML parsing and data extraction using pattern matching and heuristics
 * Extracts structured data, products, meta tags, and content without external dependencies
 *
 * Features:
 * - Smart HTML parsing without cheerio (using regex and DOM-like parsing)
 * - JSON-LD structured data extraction
 * - Product name, description, and price detection
 * - Meta tag and Open Graph extraction
 * - CTA and offer identification
 * - Image and media extraction
 */

import logger from './logger.js';

/**
 * Content Extractor with intelligent HTML parsing
 */
export class ContentExtractorService {
  constructor() {
    this.initialized = false;

    // Extraction patterns
    this.patterns = {
      // Product patterns
      productName: [
        /<h1[^>]*class="[^"]*product[^"]*"[^>]*>(.*?)<\/h1>/gi,
        /<h1[^>]*itemprop="name"[^>]*>(.*?)<\/h1>/gi,
        /<span[^>]*class="[^"]*product-title[^"]*"[^>]*>(.*?)<\/span>/gi,
        /<div[^>]*class="[^"]*product-name[^"]*"[^>]*>(.*?)<\/div>/gi
      ],
      productPrice: [
        /<span[^>]*class="[^"]*price[^"]*"[^>]*>\$?([\d,]+\.?\d*)<\/span>/gi,
        /<meta[^>]*property="product:price:amount"[^>]*content="([^"]+)"/gi,
        /<span[^>]*itemprop="price"[^>]*content="([^"]+)"/gi,
        /\$\s*([\d,]+\.?\d+)/gi
      ],
      // CTA patterns
      ctaButtons: [
        /<button[^>]*class="[^"]*(?:cta|button|btn)[^"]*"[^>]*>(.*?)<\/button>/gi,
        /<a[^>]*class="[^"]*(?:cta|button|btn)[^"]*"[^>]*>(.*?)<\/a>/gi
      ],
      // Email patterns
      email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      // Phone patterns
      phone: /(?:\+\d{1,3}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g
    };
  }

  /**
   * Initialize the extractor
   */
  async initialize() {
    if (this.initialized) return;
    this.initialized = true;
    logger.info('Content extractor service initialized');
  }

  /**
   * Extract all content from HTML
   */
  async extractFromHTML(html, url = '') {
    await this.initialize();

    try {
      return {
        // Basic metadata
        title: this.extractTitle(html),
        metaTags: this.extractMetaTags(html),
        openGraph: this.extractOpenGraph(html),

        // Structured data
        structuredData: this.extractStructuredData(html),

        // Content
        headings: this.extractHeadings(html),
        paragraphs: this.extractParagraphs(html),
        textContent: this.extractTextContent(html),

        // Media
        images: this.extractImages(html, url),
        videos: this.extractVideos(html),

        // Links
        links: this.extractLinks(html, url),

        // CTAs and actions
        ctas: this.extractCTAs(html),
        forms: this.extractForms(html),

        // Contact info
        emails: this.extractEmails(html),
        phones: this.extractPhones(html),

        // Scripts and tracking
        scripts: this.extractScripts(html),

        // Social links
        socialLinks: this.extractSocialLinks(html)
      };
    } catch (error) {
      logger.error('Content extraction failed:', error);
      return this.getEmptyExtraction();
    }
  }

  /**
   * Extract product information from a page
   */
  extractProductFromPage(page) {
    const html = page.content || '';

    try {
      // Try structured data first
      const structuredProducts = (page.structuredData || [])
        .filter(d => d['@type'] === 'Product');

      if (structuredProducts.length > 0) {
        const product = structuredProducts[0];
        return {
          name: product.name || '',
          description: product.description || '',
          price: product.offers?.price || null,
          currency: product.offers?.priceCurrency || 'USD',
          image: product.image || null,
          brand: product.brand?.name || null,
          sku: product.sku || null,
          url: page.url
        };
      }

      // Fallback to pattern matching
      const name = this.extractWithPatterns(html, this.patterns.productName);
      const priceMatch = this.extractWithPatterns(html, this.patterns.productPrice);
      const description = this.extractProductDescription(html);

      if (name) {
        return {
          name,
          description,
          price: priceMatch ? parseFloat(priceMatch.replace(/[,$]/g, '')) : null,
          currency: 'USD',
          image: null,
          brand: null,
          sku: null,
          url: page.url
        };
      }

      return null;
    } catch (error) {
      logger.error('Product extraction failed:', error);
      return null;
    }
  }

  /**
   * Extract title
   */
  extractTitle(html) {
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
    return titleMatch ? this.cleanText(titleMatch[1]) : '';
  }

  /**
   * Extract meta tags
   */
  extractMetaTags(html) {
    const meta = {};
    const metaRegex = /<meta\s+([^>]+)>/gi;
    let match;

    while ((match = metaRegex.exec(html)) !== null) {
      const attrs = this.parseAttributes(match[1]);

      if (attrs.name && attrs.content) {
        meta[attrs.name] = attrs.content;
      } else if (attrs.property && attrs.content) {
        meta[attrs.property] = attrs.content;
      }
    }

    return meta;
  }

  /**
   * Extract Open Graph data
   */
  extractOpenGraph(html) {
    const og = {};
    const ogRegex = /<meta\s+property="og:([^"]+)"\s+content="([^"]+)"/gi;
    let match;

    while ((match = ogRegex.exec(html)) !== null) {
      og[match[1]] = match[2];
    }

    return og;
  }

  /**
   * Extract JSON-LD structured data
   */
  extractStructuredData(html) {
    const structuredData = [];
    const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis;
    let match;

    while ((match = scriptRegex.exec(html)) !== null) {
      try {
        const json = JSON.parse(match[1]);
        // Handle both single objects and arrays
        if (Array.isArray(json)) {
          structuredData.push(...json);
        } else {
          structuredData.push(json);
        }
      } catch (error) {
        // Invalid JSON, skip
        continue;
      }
    }

    return structuredData;
  }

  /**
   * Extract headings
   */
  extractHeadings(html) {
    const headings = [];
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
    let match;

    while ((match = headingRegex.exec(html)) !== null) {
      const level = parseInt(match[1]);
      const text = this.cleanText(match[2]);

      if (text.length > 0) {
        headings.push({ level, text });
      }
    }

    return headings;
  }

  /**
   * Extract paragraphs
   */
  extractParagraphs(html) {
    const paragraphs = [];
    const pRegex = /<p[^>]*>(.*?)<\/p>/gi;
    let match;

    while ((match = pRegex.exec(html)) !== null) {
      const text = this.cleanText(match[1]);
      if (text.length > 20) { // Only meaningful paragraphs
        paragraphs.push(text);
      }
    }

    return paragraphs.slice(0, 50); // Limit to 50 paragraphs
  }

  /**
   * Extract all text content
   */
  extractTextContent(html) {
    // Remove script and style tags
    let text = html.replace(/<script[^>]*>.*?<\/script>/gis, '');
    text = text.replace(/<style[^>]*>.*?<\/style>/gis, '');
    text = text.replace(/<noscript[^>]*>.*?<\/noscript>/gis, '');

    // Remove all HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    // Split into sentences for easier processing
    const sentences = text.split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20); // Filter short fragments

    return sentences.slice(0, 100); // Limit to 100 sentences
  }

  /**
   * Extract images
   */
  extractImages(html, baseUrl = '') {
    const images = [];
    const imgRegex = /<img[^>]+>/gi;
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
      const attrs = this.parseAttributes(match[0]);

      if (attrs.src) {
        images.push({
          src: this.resolveUrl(attrs.src, baseUrl),
          alt: attrs.alt || '',
          title: attrs.title || '',
          width: attrs.width || null,
          height: attrs.height || null
        });
      }
    }

    return images.slice(0, 30); // Limit to 30 images
  }

  /**
   * Extract videos
   */
  extractVideos(html) {
    const videos = [];

    // Video tags
    const videoRegex = /<video[^>]+>/gi;
    let match;

    while ((match = videoRegex.exec(html)) !== null) {
      const attrs = this.parseAttributes(match[0]);
      if (attrs.src) {
        videos.push({
          src: attrs.src,
          type: 'video',
          poster: attrs.poster || null
        });
      }
    }

    // YouTube embeds
    const youtubeRegex = /(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]+)/gi;
    while ((match = youtubeRegex.exec(html)) !== null) {
      videos.push({
        src: `https://www.youtube.com/watch?v=${match[1]}`,
        type: 'youtube',
        videoId: match[1]
      });
    }

    // Vimeo embeds
    const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/gi;
    while ((match = vimeoRegex.exec(html)) !== null) {
      videos.push({
        src: `https://vimeo.com/${match[1]}`,
        type: 'vimeo',
        videoId: match[1]
      });
    }

    return videos;
  }

  /**
   * Extract links
   */
  extractLinks(html, baseUrl = '') {
    const links = new Set();
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        const resolvedUrl = this.resolveUrl(href, baseUrl);
        links.add(resolvedUrl);
      }
    }

    return Array.from(links).slice(0, 100); // Limit to 100 links
  }

  /**
   * Extract CTAs
   */
  extractCTAs(html) {
    const ctas = new Set();

    for (const pattern of this.patterns.ctaButtons) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const text = this.cleanText(match[1]);
        if (text.length > 0 && text.length < 50) {
          ctas.add(text);
        }
      }
    }

    return Array.from(ctas).slice(0, 20);
  }

  /**
   * Extract forms
   */
  extractForms(html) {
    const forms = [];
    const formRegex = /<form[^>]*>(.*?)<\/form>/gis;
    let match;

    while ((match = formRegex.exec(html)) !== null) {
      const formHtml = match[0];
      const attrs = this.parseAttributes(formHtml);

      // Count input fields
      const inputs = (formHtml.match(/<input/gi) || []).length;
      const textareas = (formHtml.match(/<textarea/gi) || []).length;
      const selects = (formHtml.match(/<select/gi) || []).length;

      forms.push({
        action: attrs.action || '',
        method: (attrs.method || 'get').toLowerCase(),
        fieldCount: inputs + textareas + selects,
        hasEmail: /type=["']?email["']?/i.test(formHtml),
        hasPassword: /type=["']?password["']?/i.test(formHtml),
        hasSubmit: /<button|<input[^>]+type=["']?submit["']?/i.test(formHtml)
      });
    }

    return forms;
  }

  /**
   * Extract email addresses
   */
  extractEmails(html) {
    const text = this.extractTextContent(html).join(' ');
    const emails = new Set();
    let match;

    while ((match = this.patterns.email.exec(text)) !== null) {
      // Filter out common false positives
      const email = match[0].toLowerCase();
      if (!email.includes('example.com') && !email.includes('domain.com')) {
        emails.add(email);
      }
    }

    // Also check mailto links
    const mailtoRegex = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    while ((match = mailtoRegex.exec(html)) !== null) {
      emails.add(match[1].toLowerCase());
    }

    return Array.from(emails).slice(0, 5);
  }

  /**
   * Extract phone numbers
   */
  extractPhones(html) {
    const text = this.extractTextContent(html).join(' ');
    const phones = new Set();
    let match;

    while ((match = this.patterns.phone.exec(text)) !== null) {
      phones.add(match[0]);
    }

    // Also check tel links
    const telRegex = /tel:([+\d\s()-]+)/gi;
    while ((match = telRegex.exec(html)) !== null) {
      phones.add(match[1]);
    }

    return Array.from(phones).slice(0, 5);
  }

  /**
   * Extract script sources
   */
  extractScripts(html) {
    const scripts = {
      googleAnalytics: false,
      googleTagManager: false,
      facebookPixel: false,
      shopify: false,
      wordpress: false,
      woocommerce: false
    };

    scripts.googleAnalytics = /google-analytics\.com|gtag\/js/i.test(html);
    scripts.googleTagManager = /googletagmanager\.com/i.test(html);
    scripts.facebookPixel = /connect\.facebook\.net/i.test(html);
    scripts.shopify = /cdn\.shopify\.com/i.test(html);
    scripts.wordpress = /wp-content|wordpress/i.test(html);
    scripts.woocommerce = /woocommerce/i.test(html);

    return scripts;
  }

  /**
   * Extract social media links
   */
  extractSocialLinks(html) {
    const social = {};
    const platforms = {
      facebook: /(?:facebook\.com|fb\.com)\/([a-zA-Z0-9._-]+)/i,
      twitter: /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/i,
      instagram: /instagram\.com\/([a-zA-Z0-9._]+)/i,
      linkedin: /linkedin\.com\/(?:company|in)\/([a-zA-Z0-9-]+)/i,
      youtube: /youtube\.com\/(?:user|channel|c)\/([a-zA-Z0-9_-]+)/i,
      tiktok: /tiktok\.com\/@([a-zA-Z0-9._]+)/i,
      pinterest: /pinterest\.com\/([a-zA-Z0-9_]+)/i
    };

    for (const [platform, regex] of Object.entries(platforms)) {
      const match = html.match(regex);
      if (match) {
        social[platform] = match[0];
      }
    }

    return social;
  }

  /**
   * Extract product description
   */
  extractProductDescription(html) {
    // Look for common product description patterns
    const patterns = [
      /<div[^>]*class="[^"]*product-description[^"]*"[^>]*>(.*?)<\/div>/gis,
      /<div[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)<\/div>/gis,
      /<meta[^>]*name="description"[^>]*content="([^"]+)"/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const text = this.cleanText(match[1]);
        if (text.length > 20) {
          return text.substring(0, 500); // Limit length
        }
      }
    }

    return '';
  }

  /**
   * Helper: Extract text using multiple patterns
   */
  extractWithPatterns(html, patterns) {
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return this.cleanText(match[1]);
      }
    }
    return null;
  }

  /**
   * Helper: Parse HTML attributes
   */
  parseAttributes(htmlString) {
    const attrs = {};
    const attrRegex = /(\w+)=["']([^"']+)["']/g;
    let match;

    while ((match = attrRegex.exec(htmlString)) !== null) {
      attrs[match[1]] = match[2];
    }

    return attrs;
  }

  /**
   * Helper: Clean text (remove HTML, extra whitespace)
   */
  cleanText(text) {
    if (!text) return '';

    return text
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Helper: Resolve relative URLs
   */
  resolveUrl(url, baseUrl) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('//')) {
      return 'https:' + url;
    }
    if (url.startsWith('/')) {
      try {
        const base = new URL(baseUrl);
        return `${base.protocol}//${base.host}${url}`;
      } catch {
        return url;
      }
    }
    return url;
  }

  /**
   * Get empty extraction result
   */
  getEmptyExtraction() {
    return {
      title: '',
      metaTags: {},
      openGraph: {},
      structuredData: [],
      headings: [],
      paragraphs: [],
      textContent: [],
      images: [],
      videos: [],
      links: [],
      ctas: [],
      forms: [],
      emails: [],
      phones: [],
      scripts: {},
      socialLinks: {}
    };
  }

  /**
   * Validate extraction result
   */
  validateExtraction(extraction) {
    return {
      hasTitle: extraction.title.length > 0,
      hasHeadings: extraction.headings.length > 0,
      hasContent: extraction.textContent.length > 0,
      hasImages: extraction.images.length > 0,
      hasStructuredData: extraction.structuredData.length > 0,
      hasCTAs: extraction.ctas.length > 0,
      completeness: this.calculateCompleteness(extraction)
    };
  }

  /**
   * Calculate completeness score (0-100)
   */
  calculateCompleteness(extraction) {
    let score = 0;

    if (extraction.title) score += 10;
    if (extraction.headings.length > 0) score += 15;
    if (extraction.textContent.length > 10) score += 20;
    if (extraction.images.length > 0) score += 10;
    if (extraction.structuredData.length > 0) score += 15;
    if (extraction.ctas.length > 0) score += 10;
    if (extraction.metaTags.description) score += 10;
    if (Object.keys(extraction.socialLinks).length > 0) score += 10;

    return score;
  }
}

// Singleton instance
let extractorInstance = null;

/**
 * Get singleton content extractor instance
 */
export function getContentExtractor() {
  if (!extractorInstance) {
    extractorInstance = new ContentExtractorService();
  }
  return extractorInstance;
}

export default getContentExtractor;