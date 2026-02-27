/**
 * Campaign AI Analyzer Service
 * Scrapes a landing page URL and generates AI-powered suggestions
 * for all Google Ads campaign fields.
 */

import { LandingPageAIService } from './landing-page-ai.js';
import { getAIProviderService } from './ai-provider.js';
import logger from './logger.js';

const VALID_BIDDING_STRATEGIES = [
  'MAXIMIZE_CONVERSIONS',
  'MAXIMIZE_CLICKS',
  'MANUAL_CPC',
  'TARGET_ROAS',
];

export class CampaignAIAnalyzer {
  constructor() {
    this.pageService = new LandingPageAIService();
    this.aiService = getAIProviderService();
  }

  /**
   * Analyze a landing page URL and return campaign field suggestions.
   * @param {string} url - The landing page URL
   * @param {string} tenant - The tenant/shop ID
   * @returns {Promise<object>} Structured suggestions for all campaign fields
   */
  async analyzeForCampaign(url, tenant) {
    // Step 1: Fetch and parse the page content
    let pageContent;
    try {
      pageContent = await this.pageService.fetchPageContent(url);
    } catch (fetchErr) {
      logger.warn(`Page fetch failed for ${url}: ${fetchErr.message}`);
      // Fall back to minimal content so AI can still suggest based on URL alone
      pageContent = {
        title: '',
        headings: [],
        ctas: [],
        meta: {},
        textContent: '',
      };
    }

    // Step 2: Build prompt and call AI
    const prompt = this.buildPrompt(url, pageContent);

    const raw = await this.aiService.generateStructuredContent(prompt, 'json', {
      tenant,
      operation: 'campaign_url_analysis',
      maxRetries: 2,
    });

    // Step 3: Validate and enforce limits
    return this.validateSuggestions(raw);
  }

  /**
   * Build the AI prompt from page content.
   */
  buildPrompt(url, pageContent) {
    const headingsText = (pageContent.headings || [])
      .map(h => h.text || h)
      .filter(Boolean)
      .join(', ');

    const ctasText = (pageContent.ctas || []).join(', ');
    const metaDesc = pageContent.meta?.description || '';
    const contentSnippet = (pageContent.textContent || '').substring(0, 1500);

    return `Analyze this landing page and generate Google Ads campaign suggestions.

URL: ${url}
Page Title: ${pageContent.title || 'Unknown'}
Meta Description: ${metaDesc}
Headings: ${headingsText || 'None found'}
CTAs: ${ctasText || 'None found'}
Key Content: ${contentSnippet || 'Could not extract content'}

Generate a JSON object with exactly these fields:
{
  "campaignNames": ["name1", "name2", "name3"],
  "biddingStrategy": {
    "recommended": "MAXIMIZE_CONVERSIONS",
    "reason": "brief reason for this strategy"
  },
  "keywords": ["keyword1", "keyword2", "...up to 15 keywords"],
  "negativeKeywords": ["negative1", "negative2", "...up to 10"],
  "headlines": ["headline1", "headline2", "...up to 8 headlines"],
  "descriptions": ["desc1", "desc2", "desc3", "desc4"],
  "pageSummary": "One sentence summary of what this page offers"
}

Rules:
- campaignNames: 2-3 descriptive campaign names based on the page content and business
- keywords: 10-15 search terms a potential customer would use to find this page
- negativeKeywords: 5-10 terms to exclude (irrelevant or wasteful traffic for this business)
- headlines: 5-8 compelling ad headlines, each MUST be 30 characters or fewer
- descriptions: 3-4 ad descriptions with value props and CTAs, each MUST be 90 characters or fewer
- biddingStrategy.recommended must be one of: MAXIMIZE_CONVERSIONS, MAXIMIZE_CLICKS, MANUAL_CPC, TARGET_ROAS
- All text must be professional and compelling for advertising
- No emojis anywhere in the output
- Do not use all caps unless it is an acronym

Return ONLY valid JSON with no additional text.`;
  }

  /**
   * Validate and sanitize AI suggestions to enforce Google Ads limits.
   */
  validateSuggestions(raw) {
    if (!raw || typeof raw !== 'object') {
      return this.emptyResult();
    }

    return {
      campaignNames: this.filterStrings(raw.campaignNames, 3),
      biddingStrategy: {
        recommended: VALID_BIDDING_STRATEGIES.includes(raw.biddingStrategy?.recommended)
          ? raw.biddingStrategy.recommended
          : 'MAXIMIZE_CONVERSIONS',
        reason: typeof raw.biddingStrategy?.reason === 'string'
          ? raw.biddingStrategy.reason.substring(0, 200)
          : '',
      },
      keywords: this.filterStrings(raw.keywords, 15),
      negativeKeywords: this.filterStrings(raw.negativeKeywords, 10),
      headlines: this.filterStrings(raw.headlines, 8, 30),
      descriptions: this.filterStrings(raw.descriptions, 4, 90),
      pageSummary: typeof raw.pageSummary === 'string'
        ? raw.pageSummary.substring(0, 300)
        : '',
    };
  }

  /**
   * Filter an array of strings: remove non-strings, trim, enforce max length, slice to limit.
   */
  filterStrings(arr, maxCount, maxCharLen) {
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(s => typeof s === 'string' && s.trim().length > 0)
      .map(s => s.trim())
      .filter(s => !maxCharLen || s.length <= maxCharLen)
      .slice(0, maxCount);
  }

  emptyResult() {
    return {
      campaignNames: [],
      biddingStrategy: { recommended: 'MAXIMIZE_CONVERSIONS', reason: '' },
      keywords: [],
      negativeKeywords: [],
      headlines: [],
      descriptions: [],
      pageSummary: '',
    };
  }
}

let instance = null;

export function getCampaignAIAnalyzer() {
  if (!instance) instance = new CampaignAIAnalyzer();
  return instance;
}
