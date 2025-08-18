/**
 * Negative Keyword Intelligence Service for ProofKit SaaS
 * Smart negative keyword detection and analysis from search terms
 */

import { getAIProviderService } from './ai-provider.js';

/**
 * Negative keyword analyzer with intelligent pattern detection
 */
export class NegativeKeywordAnalyzer {
  constructor() {
    this.aiService = getAIProviderService();
    this.analysisCache = new Map();
    this.commonNegatives = new Set([
      'free', 'cheap', 'reviews', 'complaints', 'scam', 'fake', 'download',
      'torrent', 'crack', 'illegal', 'pirate', 'diy', 'how to', 'tutorial',
      'wikipedia', 'definition', 'meaning', 'what is', 'jobs', 'career',
      'salary', 'hiring', 'employment', 'used', 'refurbished', 'broken',
      'repair', 'fix', 'problem', 'issue', 'error', 'fail'
    ]);
    this.industryPatterns = {
      ecommerce: ['coupon', 'discount code', 'promo', 'deal', 'sale'],
      saas: ['alternative', 'vs', 'competitor', 'comparison', 'versus'],
      local: ['near me', 'nearby', 'location', 'address', 'hours'],
      medical: ['side effects', 'risks', 'dangers', 'lawsuit', 'recall']
    };
  }

  /**
   * Analyze search terms to identify negative keyword candidates
   */
  async analyzeSearchTerms(searchTerms, options = {}) {
    const {
      industry = 'general',
      costThreshold = 5.0,
      clickThreshold = 3,
      conversionRate = 0,
      useAI = true,
      includeCommonNegatives = true,
      playbookPrompt = '',
      desiredKeywords = [],
      targetCPA = null,
      targetROAS = null,
      businessStrategy = 'protect'
    } = options;

    try {
      // Process and filter search terms
      const processedTerms = this.preprocessSearchTerms(searchTerms);
      
      // Identify candidates based on performance metrics
      const metricCandidates = this.identifyByMetrics(processedTerms, {
        costThreshold,
        clickThreshold,
        conversionRate
      });

      // Identify pattern-based candidates
      const patternCandidates = this.identifyByPatterns(processedTerms, industry);

      // Use AI for advanced analysis if enabled
      let aiCandidates = [];
      if (useAI && processedTerms.length > 0) {
        aiCandidates = await this.identifyWithAI(processedTerms, industry, {
          playbookPrompt,
          targetCPA,
          targetROAS,
          businessStrategy
        });
      }

      // Combine and score all candidates
      let allCandidates = this.combineAndScore([
        ...metricCandidates,
        ...patternCandidates,
        ...aiCandidates
      ]);

      // Filter out candidates that match desired keywords
      if (desiredKeywords.length > 0) {
        allCandidates = this.filterProtectedKeywords(allCandidates, desiredKeywords);
      }

      // Add common negatives if requested
      if (includeCommonNegatives) {
        const commonCandidates = this.getCommonNegatives(industry);
        allCandidates.push(...commonCandidates);
      }

      return {
        success: true,
        candidates: this.rankCandidates(allCandidates),
        analysis: {
          totalTermsAnalyzed: processedTerms.length,
          metricBasedCandidates: metricCandidates.length,
          patternBasedCandidates: patternCandidates.length,
          aiBasedCandidates: aiCandidates.length,
          recommendations: this.generateRecommendations(allCandidates),
          protectedKeywords: desiredKeywords.length,
          businessContextApplied: !!playbookPrompt,
          performanceTargetsConsidered: !!(targetCPA || targetROAS)
        }
      };
    } catch (error) {
      console.error('Negative keyword analysis failed:', error);
      return {
        success: false,
        error: error.message,
        fallback: this.getFallbackNegatives(industry)
      };
    }
  }

  /**
   * Preprocess search terms for analysis
   */
  preprocessSearchTerms(rawTerms) {
    return rawTerms
      .filter(term => term && typeof term.search_term === 'string')
      .map(term => ({
        term: term.search_term.toLowerCase().trim(),
        cost: Number(term.cost || 0),
        clicks: Number(term.clicks || 0),
        conversions: Number(term.conversions || 0),
        impressions: Number(term.impressions || 0),
        ctr: term.clicks && term.impressions ? (term.clicks / term.impressions) : 0,
        cpa: term.conversions ? (term.cost / term.conversions) : Infinity
      }))
      .filter(term => term.term.length > 0);
  }

  /**
   * Identify negative candidates based on performance metrics
   */
  identifyByMetrics(terms, thresholds) {
    const { costThreshold, clickThreshold, conversionRate } = thresholds;
    const candidates = [];

    for (const term of terms) {
      const score = this.calculateMetricScore(term, thresholds);
      
      if (score > 0.6) { // High confidence threshold
        candidates.push({
          keyword: term.term,
          type: 'performance',
          confidence: score,
          reason: this.getMetricReason(term, thresholds),
          matchType: this.suggestMatchType(term.term),
          scope: 'account',
          data: {
            cost: term.cost,
            clicks: term.clicks,
            conversions: term.conversions,
            cpa: term.cpa
          }
        });
      }
    }

    return candidates;
  }

  /**
   * Calculate performance-based score for negative keyword candidacy
   */
  calculateMetricScore(term, thresholds) {
    let score = 0;

    // High cost with no conversions
    if (term.cost >= thresholds.costThreshold && term.conversions === 0) {
      score += 0.4;
    }

    // High clicks with no conversions
    if (term.clicks >= thresholds.clickThreshold && term.conversions === 0) {
      score += 0.3;
    }

    // Very high CPA
    if (term.cpa > thresholds.costThreshold * 3) {
      score += 0.3;
    }

    // Low CTR indicating irrelevance
    if (term.ctr < 0.01 && term.clicks > 0) {
      score += 0.2;
    }

    return Math.min(1.0, score);
  }

  /**
   * Get human-readable reason for metric-based negative
   */
  getMetricReason(term, thresholds) {
    const reasons = [];

    if (term.cost >= thresholds.costThreshold && term.conversions === 0) {
      reasons.push(`High cost ($${term.cost.toFixed(2)}) with no conversions`);
    }

    if (term.clicks >= thresholds.clickThreshold && term.conversions === 0) {
      reasons.push(`${term.clicks} clicks with no conversions`);
    }

    if (term.cpa > thresholds.costThreshold * 3) {
      reasons.push(`Very high CPA ($${term.cpa.toFixed(2)})`);
    }

    return reasons.join('; ');
  }

  /**
   * Identify candidates based on keyword patterns
   */
  identifyByPatterns(terms, industry) {
    const candidates = [];
    const patterns = [
      ...this.getUniversalPatterns(),
      ...(this.industryPatterns[industry] || [])
    ];

    for (const term of terms) {
      for (const pattern of patterns) {
        if (this.matchesPattern(term.term, pattern)) {
          candidates.push({
            keyword: this.extractNegativeKeyword(term.term, pattern),
            type: 'pattern',
            confidence: 0.7,
            reason: `Matches negative pattern: "${pattern}"`,
            matchType: this.suggestMatchType(term.term, pattern),
            scope: 'account',
            pattern: pattern
          });
          break; // Only match first pattern to avoid duplicates
        }
      }
    }

    return candidates;
  }

  /**
   * Get universal negative keyword patterns
   */
  getUniversalPatterns() {
    return [
      { pattern: /\b(free|gratis)\b/i, type: 'free' },
      { pattern: /\b(cheap|bargain|budget)\b/i, type: 'price' },
      { pattern: /\b(review|rating|complaint)\b/i, type: 'research' },
      { pattern: /\b(job|career|hiring|employment)\b/i, type: 'employment' },
      { pattern: /\b(diy|tutorial|how\s+to)\b/i, type: 'educational' },
      { pattern: /\b(used|refurbished|second\s*hand)\b/i, type: 'condition' },
      { pattern: /\b(download|torrent|crack|pirate)\b/i, type: 'illegal' },
      { pattern: /\b(vs|versus|alternative|competitor)\b/i, type: 'comparison' },
      { pattern: /\b(problem|issue|error|broken|fix)\b/i, type: 'support' }
    ];
  }

  /**
   * Check if term matches a negative pattern
   */
  matchesPattern(term, patternObj) {
    if (typeof patternObj === 'string') {
      return term.includes(patternObj.toLowerCase());
    }
    return patternObj.pattern.test(term);
  }

  /**
   * Extract the actual negative keyword from a search term
   */
  extractNegativeKeyword(term, pattern) {
    if (typeof pattern === 'string') {
      return pattern;
    }
    
    const match = term.match(pattern.pattern);
    return match ? match[1] || match[0] : term.split(' ')[0];
  }

  /**
   * Use AI to identify sophisticated negative keyword candidates
   */
  async identifyWithAI(terms, industry, businessContext = {}) {
    // Create cache key including business context
    const contextKey = JSON.stringify(businessContext).substring(0, 50);
    const cacheKey = `${industry}_${terms.length}_${contextKey}_${terms.slice(0, 5).map(t => t.term).join(',')}`;
    
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey);
    }

    const prompt = this.buildAINegativePrompt(terms.slice(0, 20), industry, businessContext); // Limit for cost control
    
    try {
      const aiResponse = await this.aiService.generateStructuredContent(prompt, 'json');
      
      if (aiResponse && aiResponse.negatives) {
        const candidates = aiResponse.negatives.map(negative => ({
          keyword: negative.keyword,
          type: 'ai',
          confidence: negative.confidence || 0.6,
          reason: negative.reason || 'AI identified as negative keyword',
          matchType: negative.matchType || 'phrase',
          scope: negative.scope || 'account'
        }));

        // Cache the result
        this.analysisCache.set(cacheKey, candidates);
        return candidates;
      }
    } catch (error) {
      console.warn('AI negative keyword analysis failed:', error);
    }

    return [];
  }

  /**
   * Build AI prompt for negative keyword analysis
   */
  buildAINegativePrompt(terms, industry, businessContext = {}) {
    const { playbookPrompt, targetCPA, targetROAS, businessStrategy } = businessContext;
    const termList = terms.map(t => `"${t.term}" (${t.clicks} clicks, $${t.cost.toFixed(2)}, ${t.conversions} conv)`).join('\n');

    // Build business context text
    let contextText = '';
    if (playbookPrompt) {
      contextText += `\nBusiness Strategy: ${playbookPrompt}\n`;
    }
    if (targetCPA || targetROAS) {
      const targets = [];
      if (targetCPA) targets.push(`CPA target: $${targetCPA}`);
      if (targetROAS) targets.push(`ROAS target: ${targetROAS}x`);
      contextText += `Performance Targets: ${targets.join(', ')}\n`;
    }
    if (businessStrategy) {
      contextText += `Business Objective: ${businessStrategy}\n`;
    }

    return `Analyze these search terms from a ${industry} business and identify which should be negative keywords.
${contextText}
Search Terms:
${termList}

Identify terms that are:
- Irrelevant to the business intent
- Likely to generate unqualified traffic based on business strategy
- Research-only queries with low commercial intent
- Job/career related queries
- Competitor research queries
${targetCPA ? `- Terms unlikely to achieve CPA target of $${targetCPA}` : ''}
${targetROAS ? `- Terms unlikely to achieve ROAS target of ${targetROAS}x` : ''}

${playbookPrompt ? 'IMPORTANT: Consider the business strategy context when determining relevance.' : ''}

Return ONLY valid JSON in this format:
{
  "negatives": [
    {
      "keyword": "extracted negative keyword",
      "confidence": 0.8,
      "reason": "why this should be negative",
      "matchType": "phrase|exact|broad",
      "scope": "account|campaign"
    }
  ]
}`;
  }

  /**
   * Suggest appropriate match type for negative keyword
   */
  suggestMatchType(term, pattern = null) {
    // Exact match for very specific terms
    if (term.length <= 10 || term.split(' ').length === 1) {
      return 'exact';
    }
    
    // Phrase match for most cases
    if (term.split(' ').length <= 3) {
      return 'phrase';
    }
    
    // Broad match for longer, more general terms
    return 'broad';
  }

  /**
   * Filter out negative keyword candidates that match desired/protected keywords
   */
  filterProtectedKeywords(candidates, desiredKeywords) {
    const protectedTerms = new Set(desiredKeywords.map(k => k.toLowerCase().trim()));
    
    return candidates.filter(candidate => {
      const candidateKeyword = candidate.keyword.toLowerCase();
      
      // Check if candidate keyword matches any desired keyword
      const isProtected = desiredKeywords.some(desired => {
        const desiredLower = desired.toLowerCase();
        return candidateKeyword.includes(desiredLower) || 
               desiredLower.includes(candidateKeyword) ||
               candidateKeyword === desiredLower;
      });
      
      if (isProtected) {
        console.log(`Filtering out negative keyword "${candidate.keyword}" - matches desired keyword`);
        return false;
      }
      
      return true;
    });
  }

  /**
   * Combine and deduplicate candidates from multiple sources
   */
  combineAndScore(candidateLists) {
    const combined = new Map();

    for (const candidate of candidateLists.flat()) {
      const key = candidate.keyword.toLowerCase();
      
      if (combined.has(key)) {
        // Merge with existing candidate, taking highest confidence
        const existing = combined.get(key);
        if (candidate.confidence > existing.confidence) {
          combined.set(key, {
            ...candidate,
            sources: [...(existing.sources || [existing.type]), candidate.type]
          });
        }
      } else {
        combined.set(key, candidate);
      }
    }

    return Array.from(combined.values());
  }

  /**
   * Rank candidates by confidence and impact
   */
  rankCandidates(candidates) {
    return candidates
      .sort((a, b) => {
        // Primary sort by confidence
        if (Math.abs(a.confidence - b.confidence) > 0.1) {
          return b.confidence - a.confidence;
        }
        
        // Secondary sort by potential cost savings
        const aCost = a.data?.cost || 0;
        const bCost = b.data?.cost || 0;
        return bCost - aCost;
      })
      .slice(0, 50); // Limit to top 50 candidates
  }

  /**
   * Get common negative keywords for an industry
   */
  getCommonNegatives(industry) {
    const common = Array.from(this.commonNegatives).map(keyword => ({
      keyword,
      type: 'common',
      confidence: 0.5,
      reason: 'Common negative keyword',
      matchType: 'phrase',
      scope: 'account'
    }));

    const industrySpecific = (this.industryPatterns[industry] || []).map(keyword => ({
      keyword,
      type: 'industry',
      confidence: 0.6,
      reason: `Common ${industry} negative keyword`,
      matchType: 'phrase',
      scope: 'account'
    }));

    return [...common, ...industrySpecific];
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(candidates) {
    const recommendations = [];
    
    const highConfidence = candidates.filter(c => c.confidence > 0.8).length;
    const mediumConfidence = candidates.filter(c => c.confidence > 0.6 && c.confidence <= 0.8).length;
    
    if (highConfidence > 0) {
      recommendations.push(`${highConfidence} high-confidence negative keywords identified - implement immediately`);
    }
    
    if (mediumConfidence > 0) {
      recommendations.push(`${mediumConfidence} medium-confidence candidates - review and test gradually`);
    }
    
    if (candidates.length > 20) {
      recommendations.push('Large number of candidates found - prioritize by cost impact');
    }
    
    const performanceBased = candidates.filter(c => c.type === 'performance').length;
    if (performanceBased > 0) {
      recommendations.push(`${performanceBased} performance-based negatives will provide immediate cost savings`);
    }
    
    return recommendations;
  }

  /**
   * Get fallback negatives when analysis fails
   */
  getFallbackNegatives(industry) {
    return {
      candidates: this.getCommonNegatives(industry).slice(0, 10),
      analysis: {
        totalTermsAnalyzed: 0,
        metricBasedCandidates: 0,
        patternBasedCandidates: 0,
        aiBasedCandidates: 0,
        recommendations: ['Using fallback common negatives. Configure AI for better analysis.']
      }
    };
  }

  /**
   * Clear analysis cache
   */
  clearCache() {
    this.analysisCache.clear();
  }

  /**
   * Get analysis statistics
   */
  getStats() {
    return {
      cacheSize: this.analysisCache.size,
      commonNegativesCount: this.commonNegatives.size,
      supportedIndustries: Object.keys(this.industryPatterns)
    };
  }
}

// Export singleton instance
let negativeAnalyzerInstance = null;

/**
 * Get singleton negative analyzer instance
 */
export function getNegativeAnalyzer() {
  if (!negativeAnalyzerInstance) {
    negativeAnalyzerInstance = new NegativeKeywordAnalyzer();
  }
  return negativeAnalyzerInstance;
}

/**
 * Quick analysis function for simple use cases
 */
export async function analyzeNegativeKeywords(searchTerms, options = {}) {
  const analyzer = getNegativeAnalyzer();
  return await analyzer.analyzeSearchTerms(searchTerms, options);
}

/**
 * Batch analyze multiple search term sets
 */
export async function batchAnalyzeNegatives(searchTermSets, options = {}) {
  const analyzer = getNegativeAnalyzer();
  const results = [];

  for (const { terms, label } of searchTermSets) {
    try {
      const result = await analyzer.analyzeSearchTerms(terms, options);
      results.push({ label, ...result });
    } catch (error) {
      results.push({ 
        label, 
        success: false, 
        error: error.message,
        fallback: analyzer.getFallbackNegatives(options.industry || 'general')
      });
    }
  }

  return results;
}