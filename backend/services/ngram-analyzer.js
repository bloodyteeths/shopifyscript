/**
 * N-gram Waste Detection Service for Ads Autopilot AI SaaS
 * Advanced phrase-level blocking using n-gram analysis
 * PRO tier feature for detecting wasteful phrase patterns
 */

import { getAIProviderService } from "./ai-provider.js";

/**
 * N-gram analyzer for detecting wasteful phrase patterns
 */
export class NgramAnalyzer {
  constructor() {
    this.aiService = getAIProviderService();
    this.analysisCache = new Map();

    // Statistical significance thresholds
    this.SIGNIFICANCE_THRESHOLDS = {
      MIN_OCCURRENCES: 3,
      MIN_TOTAL_COST: 10.0,
      MIN_WASTE_SCORE: 0.6,
      MAX_CONVERSION_RATE: 0.02, // 2% or lower
      MIN_SAMPLE_SIZE: 50 // Minimum search terms for reliable analysis
    };

    // N-gram extraction configurations
    this.NGRAM_CONFIG = {
      MIN_LENGTH: 2, // 2-grams minimum
      MAX_LENGTH: 4, // 4-grams maximum
      MIN_WORD_LENGTH: 3, // Skip very short words
      STOP_WORDS: new Set([
        'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
        'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
        'after', 'above', 'below', 'between', 'among', 'is', 'are', 'was',
        'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
        'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must'
      ])
    };

    // Common wasteful n-gram patterns
    this.WASTEFUL_PATTERNS = {
      job_related: ['job', 'jobs', 'career', 'careers', 'employment', 'hiring'],
      price_shopping: ['cheap', 'free', 'discount', 'sale', 'deal', 'coupon'],
      research_intent: ['review', 'reviews', 'rating', 'comparison', 'vs', 'versus'],
      educational: ['how to', 'tutorial', 'guide', 'learn', 'course', 'training'],
      problems: ['problem', 'issue', 'error', 'broken', 'fix', 'repair'],
      competitor: ['alternative', 'competitor', 'similar to', 'like'],
      location_irrelevant: ['near me', 'nearby', 'location', 'address']
    };
  }

  /**
   * Analyze search terms to find wasteful n-gram patterns
   */
  async analyzeNgramWaste(searchTerms, options = {}) {
    const {
      industry = 'general',
      costThreshold = 10.0,
      conversionThreshold = 0.02,
      useStatisticalSignificance = true,
      useAI = true,
      businessContext = null
    } = options;

    try {
      // Validate input size
      if (searchTerms.length < this.SIGNIFICANCE_THRESHOLDS.MIN_SAMPLE_SIZE) {
        return {
          success: false,
          error: `Insufficient data: Need at least ${this.SIGNIFICANCE_THRESHOLDS.MIN_SAMPLE_SIZE} search terms for reliable n-gram analysis`,
          fallback: []
        };
      }

      // Process search terms
      const processedTerms = this.preprocessSearchTerms(searchTerms);

      // Extract n-grams
      const ngrams = this.extractNgrams(processedTerms);

      // Calculate waste scores
      const wasteAnalysis = this.calculateWasteScores(ngrams, processedTerms);

      // Apply statistical significance testing
      let significantNgrams = wasteAnalysis;
      if (useStatisticalSignificance) {
        significantNgrams = this.applyStatisticalSignificance(wasteAnalysis);
      }

      // Use AI for advanced pattern recognition
      let aiEnhancedNgrams = significantNgrams;
      if (useAI && significantNgrams.length > 0) {
        aiEnhancedNgrams = await this.enhanceWithAI(
          significantNgrams,
          processedTerms,
          industry,
          businessContext
        );
      }

      // Generate recommendations
      const recommendations = this.generateNgramRecommendations(aiEnhancedNgrams);

      return {
        success: true,
        ngramNegatives: aiEnhancedNgrams.slice(0, 20), // Limit for practicality
        analysis: {
          totalTermsAnalyzed: processedTerms.length,
          totalNgramsExtracted: ngrams.size,
          significantNgrams: significantNgrams.length,
          aiEnhancedNgrams: aiEnhancedNgrams.length,
          estimatedCostSavings: this.calculateCostSavings(aiEnhancedNgrams),
          recommendations: recommendations,
          statisticalSignificance: useStatisticalSignificance,
          aiEnhancement: useAI
        }
      };

    } catch (error) {
      console.error('N-gram waste analysis failed:', error);
      return {
        success: false,
        error: error.message,
        fallback: this.getFallbackNgrams(industry)
      };
    }
  }

  /**
   * Preprocess search terms for n-gram analysis
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
        conversionRate: term.clicks > 0 ? Number(term.conversions || 0) / Number(term.clicks || 1) : 0
      }))
      .filter(term => term.term.length > 0 && term.cost > 0);
  }

  /**
   * Extract n-grams from search terms
   */
  extractNgrams(processedTerms) {
    const ngramMap = new Map();

    for (const termData of processedTerms) {
      const words = termData.term
        .split(/\s+/)
        .filter(word =>
          word.length >= this.NGRAM_CONFIG.MIN_WORD_LENGTH &&
          !this.NGRAM_CONFIG.STOP_WORDS.has(word)
        );

      // Extract n-grams of different lengths
      for (let n = this.NGRAM_CONFIG.MIN_LENGTH; n <= this.NGRAM_CONFIG.MAX_LENGTH; n++) {
        if (words.length >= n) {
          for (let i = 0; i <= words.length - n; i++) {
            const ngram = words.slice(i, i + n).join(' ');

            if (!ngramMap.has(ngram)) {
              ngramMap.set(ngram, {
                phrase: ngram,
                length: n,
                occurrences: [],
                totalCost: 0,
                totalClicks: 0,
                totalConversions: 0,
                searchTerms: new Set()
              });
            }

            const ngramData = ngramMap.get(ngram);
            ngramData.occurrences.push(termData);
            ngramData.totalCost += termData.cost;
            ngramData.totalClicks += termData.clicks;
            ngramData.totalConversions += termData.conversions;
            ngramData.searchTerms.add(termData.term);
          }
        }
      }
    }

    return ngramMap;
  }

  /**
   * Calculate waste scores for n-grams
   */
  calculateWasteScores(ngramMap, allTerms) {
    const results = [];

    for (const [phrase, data] of ngramMap) {
      // Skip n-grams with insufficient data
      if (data.occurrences.length < this.SIGNIFICANCE_THRESHOLDS.MIN_OCCURRENCES ||
          data.totalCost < this.SIGNIFICANCE_THRESHOLDS.MIN_TOTAL_COST) {
        continue;
      }

      // Calculate metrics
      const conversionRate = data.totalClicks > 0 ? data.totalConversions / data.totalClicks : 0;
      const avgCostPerOccurrence = data.totalCost / data.occurrences.length;
      const frequency = data.occurrences.length / allTerms.length;

      // Calculate waste score based on multiple factors
      let wasteScore = 0;

      // High cost with low conversions
      if (conversionRate <= this.SIGNIFICANCE_THRESHOLDS.MAX_CONVERSION_RATE) {
        wasteScore += 0.4;
      }

      // High frequency indicates common wasteful pattern
      if (frequency > 0.05) { // 5% or more
        wasteScore += 0.3;
      }

      // High cost per occurrence
      if (avgCostPerOccurrence > 2.0) {
        wasteScore += 0.2;
      }

      // Pattern recognition bonus
      const patternBonus = this.getPatternWasteBonus(phrase);
      wasteScore += patternBonus;

      // Normalize to 0-1 scale
      wasteScore = Math.min(1.0, wasteScore);

      if (wasteScore >= this.SIGNIFICANCE_THRESHOLDS.MIN_WASTE_SCORE) {
        results.push({
          phrase: phrase,
          wasteScore: wasteScore,
          ngramLength: data.length,
          occurrences: data.occurrences.length,
          totalCost: data.totalCost,
          totalClicks: data.totalClicks,
          totalConversions: data.totalConversions,
          conversionRate: conversionRate,
          avgCostPerOccurrence: avgCostPerOccurrence,
          frequency: frequency,
          searchTerms: Array.from(data.searchTerms),
          patternType: this.identifyPatternType(phrase),
          confidence: Math.min(0.95, 0.5 + (wasteScore * 0.5)) // Base confidence + waste score boost
        });
      }
    }

    return results.sort((a, b) => b.wasteScore - a.wasteScore);
  }

  /**
   * Get waste score bonus for known patterns
   */
  getPatternWasteBonus(phrase) {
    let bonus = 0;

    for (const [category, patterns] of Object.entries(this.WASTEFUL_PATTERNS)) {
      for (const pattern of patterns) {
        if (phrase.includes(pattern)) {
          switch (category) {
            case 'job_related':
            case 'price_shopping':
              bonus += 0.2;
              break;
            case 'research_intent':
            case 'educational':
              bonus += 0.15;
              break;
            default:
              bonus += 0.1;
          }
          break; // Only count first match per category
        }
      }
    }

    return Math.min(0.3, bonus); // Cap bonus at 0.3
  }

  /**
   * Identify pattern type for an n-gram
   */
  identifyPatternType(phrase) {
    for (const [category, patterns] of Object.entries(this.WASTEFUL_PATTERNS)) {
      for (const pattern of patterns) {
        if (phrase.includes(pattern)) {
          return category;
        }
      }
    }
    return 'unknown';
  }

  /**
   * Apply statistical significance testing
   */
  applyStatisticalSignificance(wasteAnalysis) {
    return wasteAnalysis.filter(ngram => {
      // Require minimum sample size
      if (ngram.occurrences < this.SIGNIFICANCE_THRESHOLDS.MIN_OCCURRENCES) {
        return false;
      }

      // Require minimum cost impact
      if (ngram.totalCost < this.SIGNIFICANCE_THRESHOLDS.MIN_TOTAL_COST) {
        return false;
      }

      // Chi-square test for conversion rate significance
      const expectedConversions = ngram.totalClicks * 0.05; // Assume 5% baseline
      const observedConversions = ngram.totalConversions;

      if (expectedConversions > 5) { // Valid for chi-square test
        const chiSquare = Math.pow(observedConversions - expectedConversions, 2) / expectedConversions;
        const significant = chiSquare > 3.84; // p < 0.05 for 1 df

        if (!significant && ngram.wasteScore < 0.8) {
          return false; // Require either statistical significance or very high waste score
        }
      }

      return true;
    });
  }

  /**
   * Enhance n-gram analysis with AI insights
   */
  async enhanceWithAI(ngramCandidates, allTerms, industry, businessContext) {
    const cacheKey = `ai_ngram_${industry}_${ngramCandidates.length}_${JSON.stringify(businessContext).substring(0, 50)}`;

    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey);
    }

    try {
      const prompt = this.buildAINgramPrompt(ngramCandidates, allTerms, industry, businessContext);

      const aiResponse = await this.aiService.generateStructuredContent(prompt, 'json');

      if (aiResponse && aiResponse.enhanced_ngrams) {
        const enhanced = ngramCandidates.map(ngram => {
          const aiEnhancement = aiResponse.enhanced_ngrams.find(
            ai => ai.phrase === ngram.phrase
          );

          if (aiEnhancement) {
            return {
              ...ngram,
              aiConfidence: aiEnhancement.ai_confidence || ngram.confidence,
              aiReason: aiEnhancement.ai_reason || 'AI analysis confirmed waste pattern',
              businessImpact: aiEnhancement.business_impact || 'medium',
              recommendedAction: aiEnhancement.recommended_action || 'add_negative',
              confidence: Math.max(ngram.confidence, aiEnhancement.ai_confidence || 0)
            };
          }

          return ngram;
        });

        // Filter based on AI recommendations
        const filtered = enhanced.filter(ngram =>
          ngram.recommendedAction === 'add_negative' &&
          ngram.aiConfidence > 0.6
        );

        this.analysisCache.set(cacheKey, filtered);
        return filtered;
      }
    } catch (error) {
      console.warn('AI enhancement failed for n-gram analysis:', error);
    }

    return ngramCandidates;
  }

  /**
   * Build AI prompt for n-gram analysis enhancement
   */
  buildAINgramPrompt(ngramCandidates, allTerms, industry, businessContext) {
    const ngramData = ngramCandidates.slice(0, 10).map(ngram => ({
      phrase: ngram.phrase,
      waste_score: ngram.wasteScore.toFixed(3),
      occurrences: ngram.occurrences,
      total_cost: ngram.totalCost.toFixed(2),
      conversion_rate: (ngram.conversionRate * 100).toFixed(2) + '%',
      pattern_type: ngram.patternType
    }));

    let contextText = '';
    if (businessContext) {
      contextText = `\nBusiness Context: ${JSON.stringify(businessContext)}\n`;
    }

    return `Analyze these n-gram patterns from ${industry} business search terms to determine if they should be negative keywords.

${contextText}
N-gram Candidates:
${JSON.stringify(ngramData, null, 2)}

For each n-gram, evaluate:
1. Business relevance for ${industry} industry
2. Commercial intent vs research intent
3. Potential for false positives (blocking good traffic)
4. Cost-benefit of blocking this pattern

Return ONLY valid JSON:
{
  "enhanced_ngrams": [
    {
      "phrase": "exact n-gram phrase",
      "ai_confidence": 0.8,
      "ai_reason": "detailed reason for recommendation",
      "business_impact": "high|medium|low",
      "recommended_action": "add_negative|review_manually|ignore"
    }
  ]
}`;
  }

  /**
   * Generate recommendations for n-gram negatives
   */
  generateNgramRecommendations(ngramResults) {
    const recommendations = [];

    const highWaste = ngramResults.filter(n => n.wasteScore > 0.8).length;
    const mediumWaste = ngramResults.filter(n => n.wasteScore > 0.6 && n.wasteScore <= 0.8).length;
    const totalCost = ngramResults.reduce((sum, n) => sum + n.totalCost, 0);

    if (highWaste > 0) {
      recommendations.push(`${highWaste} high-waste n-gram patterns found - implement immediately for cost savings`);
    }

    if (mediumWaste > 0) {
      recommendations.push(`${mediumWaste} medium-waste patterns identified - review before implementing`);
    }

    if (totalCost > 100) {
      recommendations.push(`High cost impact: $${totalCost.toFixed(2)} in wasteful spending identified`);
    }

    const jobRelated = ngramResults.filter(n => n.patternType === 'job_related').length;
    if (jobRelated > 0) {
      recommendations.push(`${jobRelated} job-related patterns found - likely irrelevant traffic`);
    }

    const researchIntent = ngramResults.filter(n => n.patternType === 'research_intent').length;
    if (researchIntent > 0) {
      recommendations.push(`${researchIntent} research-intent patterns - consider user journey stage`);
    }

    if (ngramResults.length > 10) {
      recommendations.push('Large number of wasteful patterns - implement gradually to monitor impact');
    }

    return recommendations;
  }

  /**
   * Calculate estimated cost savings from implementing n-gram negatives
   */
  calculateCostSavings(ngramResults) {
    const monthlyCostSavings = ngramResults.reduce((total, ngram) => {
      // Estimate monthly cost based on current spending pattern
      const weeklyCost = ngram.totalCost;
      const monthlyCost = weeklyCost * 4.33; // Average weeks per month
      const savingsRate = Math.min(0.9, ngram.wasteScore); // Cap at 90% savings

      return total + (monthlyCost * savingsRate);
    }, 0);

    return {
      monthly: monthlyCostSavings,
      annual: monthlyCostSavings * 12,
      confidence: ngramResults.length > 0 ?
        ngramResults.reduce((sum, n) => sum + n.confidence, 0) / ngramResults.length : 0
    };
  }

  /**
   * Get fallback n-grams when analysis fails
   */
  getFallbackNgrams(industry) {
    const fallback = [];

    // Add common wasteful patterns
    for (const [category, patterns] of Object.entries(this.WASTEFUL_PATTERNS)) {
      for (const pattern of patterns.slice(0, 2)) { // Limit to top 2 per category
        fallback.push({
          phrase: pattern,
          wasteScore: 0.6,
          ngramLength: pattern.split(' ').length,
          confidence: 0.5,
          patternType: category,
          reason: `Common ${category} wasteful pattern`,
          fallback: true
        });
      }
    }

    return fallback.slice(0, 10);
  }

  /**
   * Clear analysis cache
   */
  clearCache() {
    this.analysisCache.clear();
  }

  /**
   * Get analyzer statistics
   */
  getStats() {
    return {
      cacheSize: this.analysisCache.size,
      significanceThresholds: this.SIGNIFICANCE_THRESHOLDS,
      ngramConfig: this.NGRAM_CONFIG,
      wastefulPatternCategories: Object.keys(this.WASTEFUL_PATTERNS),
      totalWastefulPatterns: Object.values(this.WASTEFUL_PATTERNS).flat().length
    };
  }
}

// Export singleton instance
let ngramAnalyzerInstance = null;

/**
 * Get singleton n-gram analyzer instance
 */
export function getNgramAnalyzer() {
  if (!ngramAnalyzerInstance) {
    ngramAnalyzerInstance = new NgramAnalyzer();
  }
  return ngramAnalyzerInstance;
}

/**
 * Quick n-gram analysis function
 */
export async function analyzeNgramWaste(searchTerms, options = {}) {
  const analyzer = getNgramAnalyzer();
  return await analyzer.analyzeNgramWaste(searchTerms, options);
}

/**
 * Extract n-grams for manual review
 */
export function extractNgramsOnly(searchTerms, ngramLength = 3) {
  const analyzer = getNgramAnalyzer();
  const processed = analyzer.preprocessSearchTerms(searchTerms);
  const ngrams = analyzer.extractNgrams(processed);

  return Array.from(ngrams.entries())
    .filter(([phrase, data]) => data.length === ngramLength)
    .map(([phrase, data]) => ({
      phrase,
      occurrences: data.occurrences.length,
      totalCost: data.totalCost,
      searchTerms: Array.from(data.searchTerms)
    }))
    .sort((a, b) => b.totalCost - a.totalCost);
}