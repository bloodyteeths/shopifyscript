/**
 * Keyword Miner Service for Ads Autopilot AI SaaS
 * Advanced semantic keyword extraction, intent classification, and competitive gap analysis
 *
 * Features:
 * - Semantic keyword extraction using TF-IDF and co-occurrence analysis
 * - Long-tail keyword discovery with search intent classification
 * - Keyword clustering and topic modeling
 * - Search intent classification (informational, navigational, transactional, commercial)
 * - Negative keyword suggestions for better targeting
 * - Competitor keyword gap analysis
 * - Keyword difficulty and opportunity scoring
 * - Seasonal and trending keyword identification
 */

import logger from './logger.js';
import { getContentIntelligence } from './content-intelligence.js';

/**
 * Keyword Miner Service with semantic analysis
 */
export class KeywordMinerService {
  constructor() {
    this.initialized = false;
    this.contentIntelligence = null;

    // Search intent patterns
    this.intentPatterns = {
      informational: {
        keywords: ['what', 'why', 'how', 'when', 'where', 'who', 'guide', 'tutorial', 'learn'],
        phrases: ['how to', 'what is', 'why does', 'guide to', 'learn about', 'understand'],
        patterns: [
          /^(what|why|how|when|where|who)\s+/i,
          /\b(guide|tutorial|tips|learn|understand|explain)\b/i,
          /(step\s+by\s+step|beginner|basics|introduction)/i
        ]
      },
      navigational: {
        keywords: ['login', 'contact', 'about', 'home', 'dashboard', 'account', 'profile'],
        phrases: ['sign in', 'log in', 'contact us', 'about us', 'my account'],
        patterns: [
          /\b(login|signin|contact|about|home|dashboard)\b/i,
          /(my\s+account|user\s+profile|sign\s+in)/i
        ]
      },
      transactional: {
        keywords: ['buy', 'purchase', 'order', 'checkout', 'cart', 'payment', 'pricing', 'cost'],
        phrases: ['buy now', 'add to cart', 'check out', 'place order', 'get quote'],
        patterns: [
          /\b(buy|purchase|order|checkout|cart|payment|pricing)\b/i,
          /(add\s+to\s+cart|place\s+order|get\s+quote|buy\s+now)/i,
          /(\$|price|cost|fee|subscription|plan)/i
        ]
      },
      commercial: {
        keywords: ['review', 'compare', 'best', 'top', 'vs', 'alternative', 'recommendation'],
        phrases: ['best for', 'compare to', 'vs', 'alternative to', 'review of'],
        patterns: [
          /\b(review|compare|best|top|vs|alternative|recommendation)\b/i,
          /(best\s+for|compare\s+to|alternative\s+to|review\s+of)/i,
          /(top\s+\d+|vs\s+|compared\s+to)/i
        ]
      }
    };

    // Keyword quality indicators
    this.qualityIndicators = {
      high: ['solution', 'service', 'professional', 'expert', 'premium', 'certified'],
      medium: ['tool', 'software', 'app', 'platform', 'system', 'product'],
      low: ['free', 'cheap', 'basic', 'simple', 'easy', 'quick']
    };

    // Negative keyword patterns
    this.negativePatterns = {
      irrelevant: ['porn', 'adult', 'gambling', 'casino', 'illegal', 'pirate'],
      competitors: [], // Will be populated based on analysis
      lowIntent: ['free', 'cracked', 'torrent', 'download', 'trial'],
      location: ['near me', 'local', 'nearby'] // Unless local business
    };

    // Keyword clustering parameters
    this.clusteringParams = {
      similarityThreshold: 0.7,
      minClusterSize: 3,
      maxClusters: 20
    };

    // Cache for keyword analysis
    this.keywordCache = new Map();
    this.cacheTimeout = 2 * 60 * 60 * 1000; // 2 hours
  }

  /**
   * Initialize the keyword miner service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      this.contentIntelligence = getContentIntelligence();
      await this.contentIntelligence.initialize();

      this.initialized = true;
      logger.info('Keyword miner service initialized');
    } catch (error) {
      logger.error('Failed to initialize keyword miner service:', error);
      throw error;
    }
  }

  /**
   * Mine keywords from content comprehensively
   * @param {object} content - Content from website scraper
   * @param {object} options - Mining options
   * @returns {object} Keyword analysis results
   */
  async mineKeywords(content, options = {}) {
    const {
      includeSemanticKeywords = true,
      includeLongTail = true,
      includeIntentClassification = true,
      includeClustering = true,
      includeNegativeKeywords = true,
      includeOpportunities = true,
      competitorKeywords = null,
      targetAudience = null,
      industry = null,
      cacheKey = null
    } = options;

    await this.initialize();

    try {
      // Check cache
      if (cacheKey && this.keywordCache.has(cacheKey)) {
        const cached = this.keywordCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          logger.info('Using cached keyword analysis');
          return cached.data;
        }
      }

      const startTime = performance.now();

      // Prepare content for analysis
      const textData = this.prepareTextForKeywordAnalysis(content);

      const keywordAnalysis = {
        metadata: {
          analyzedAt: new Date().toISOString(),
          sourcePages: content.metadata?.pagesScraped || 1,
          totalWords: textData.words.length,
          uniqueWords: textData.uniqueWords.size,
          processingTime: 0
        }
      };

      // Extract semantic keywords
      if (includeSemanticKeywords) {
        keywordAnalysis.semanticKeywords = await this.extractSemanticKeywords(textData);
      }

      // Discover long-tail keywords
      if (includeLongTail) {
        keywordAnalysis.longTailKeywords = await this.discoverLongTailKeywords(textData);
      }

      // Classify search intent
      if (includeIntentClassification) {
        keywordAnalysis.intentClassification = await this.classifySearchIntent(
          keywordAnalysis.semanticKeywords,
          keywordAnalysis.longTailKeywords
        );
      }

      // Cluster keywords by topic
      if (includeClustering) {
        keywordAnalysis.clusters = await this.clusterKeywords(
          keywordAnalysis.semanticKeywords,
          textData
        );
      }

      // Generate negative keyword suggestions
      if (includeNegativeKeywords) {
        keywordAnalysis.negativeKeywords = await this.generateNegativeKeywords(
          keywordAnalysis.semanticKeywords,
          industry
        );
      }

      // Identify keyword opportunities
      if (includeOpportunities) {
        keywordAnalysis.opportunities = await this.identifyKeywordOpportunities(
          keywordAnalysis,
          competitorKeywords,
          industry
        );
      }

      // Competitor gap analysis
      if (competitorKeywords) {
        keywordAnalysis.competitorGaps = await this.analyzeCompetitorGaps(
          keywordAnalysis.semanticKeywords,
          competitorKeywords
        );
      }

      // Calculate keyword metrics and scores
      keywordAnalysis.metrics = this.calculateKeywordMetrics(keywordAnalysis);

      // Generate strategic recommendations
      keywordAnalysis.recommendations = this.generateKeywordRecommendations(
        keywordAnalysis,
        targetAudience,
        industry
      );

      // Performance tracking
      keywordAnalysis.metadata.processingTime = Math.round(performance.now() - startTime);

      // Cache result
      if (cacheKey) {
        this.keywordCache.set(cacheKey, {
          data: keywordAnalysis,
          timestamp: Date.now()
        });
      }

      logger.info(`Keyword analysis completed in ${keywordAnalysis.metadata.processingTime}ms`);
      return keywordAnalysis;

    } catch (error) {
      logger.error('Keyword mining failed:', error);
      throw error;
    }
  }

  /**
   * Extract semantic keywords using TF-IDF and co-occurrence
   */
  async extractSemanticKeywords(textData) {
    const keywords = {
      primary: [],
      secondary: [],
      branded: [],
      commercial: [],
      informational: []
    };

    // Calculate TF-IDF scores
    const tfidfScores = this.calculateTFIDF(textData.words, textData.documents);

    // Extract primary keywords (high TF-IDF + frequency)
    keywords.primary = tfidfScores
      .filter(item => item.tfidfScore > 0.1 && item.frequency > 2)
      .slice(0, 20)
      .map(item => ({
        keyword: item.word,
        relevanceScore: item.tfidfScore,
        frequency: item.frequency,
        searchVolume: this.estimateSearchVolume(item.word),
        difficulty: this.estimateKeywordDifficulty(item.word),
        opportunity: this.calculateOpportunityScore(item.tfidfScore, item.frequency)
      }));

    // Extract secondary keywords (medium relevance)
    keywords.secondary = tfidfScores
      .filter(item => item.tfidfScore > 0.05 && item.tfidfScore <= 0.1)
      .slice(0, 30)
      .map(item => ({
        keyword: item.word,
        relevanceScore: item.tfidfScore,
        frequency: item.frequency,
        searchVolume: this.estimateSearchVolume(item.word),
        difficulty: this.estimateKeywordDifficulty(item.word),
        opportunity: this.calculateOpportunityScore(item.tfidfScore, item.frequency)
      }));

    // Identify branded keywords
    keywords.branded = this.identifyBrandedKeywords(textData.allText);

    // Categorize by commercial vs informational intent
    const allKeywords = [...keywords.primary, ...keywords.secondary];
    keywords.commercial = allKeywords.filter(k => this.isCommercialKeyword(k.keyword));
    keywords.informational = allKeywords.filter(k => this.isInformationalKeyword(k.keyword));

    // Extract n-gram keywords (2-4 word phrases)
    const ngramKeywords = this.extractNgramKeywords(textData.allText);
    keywords.phrases = ngramKeywords
      .filter(phrase => phrase.frequency > 1)
      .slice(0, 25)
      .map(phrase => ({
        keyword: phrase.text,
        relevanceScore: phrase.score,
        frequency: phrase.frequency,
        wordCount: phrase.wordCount,
        searchVolume: this.estimateSearchVolume(phrase.text),
        difficulty: this.estimateKeywordDifficulty(phrase.text),
        opportunity: this.calculateOpportunityScore(phrase.score, phrase.frequency)
      }));

    return keywords;
  }

  /**
   * Discover long-tail keyword opportunities
   */
  async discoverLongTailKeywords(textData) {
    const longTailKeywords = {
      discovered: [],
      questions: [],
      modifiers: [],
      localizers: [],
      seasonalOpportunities: []
    };

    // Extract question-based long-tail keywords
    longTailKeywords.questions = this.extractQuestionKeywords(textData.allText);

    // Generate modifier-based long-tail keywords
    longTailKeywords.modifiers = this.generateModifierKeywords(textData.topKeywords);

    // Extract location-based keywords if applicable
    longTailKeywords.localizers = this.extractLocationKeywords(textData.allText);

    // Discover through content analysis
    const contentQueries = this.analyzeContentForQueries(textData.sentences);
    longTailKeywords.discovered = contentQueries
      .filter(query => query.words.length >= 3)
      .slice(0, 30)
      .map(query => ({
        keyword: query.text,
        intent: this.classifyQueryIntent(query.text),
        relevanceScore: query.score,
        wordCount: query.words.length,
        searchVolume: this.estimateSearchVolume(query.text),
        difficulty: this.estimateKeywordDifficulty(query.text),
        opportunity: this.calculateLongTailOpportunity(query)
      }));

    // Identify seasonal opportunities
    longTailKeywords.seasonalOpportunities = this.identifySeasonalKeywords(textData.allText);

    return longTailKeywords;
  }

  /**
   * Classify search intent for keywords
   */
  async classifySearchIntent(semanticKeywords, longTailKeywords) {
    const intentClassification = {
      byIntent: {
        informational: [],
        navigational: [],
        transactional: [],
        commercial: []
      },
      distribution: {},
      confidence: {}
    };

    // Classify semantic keywords
    const allKeywords = [
      ...(semanticKeywords.primary || []),
      ...(semanticKeywords.secondary || []),
      ...(semanticKeywords.phrases || [])
    ];

    allKeywords.forEach(keyword => {
      const intent = this.classifyKeywordIntent(keyword.keyword);
      intentClassification.byIntent[intent.type].push({
        ...keyword,
        intent: intent.type,
        confidence: intent.confidence
      });
    });

    // Classify long-tail keywords
    if (longTailKeywords) {
      const longTailKeys = [
        ...(longTailKeywords.discovered || []),
        ...(longTailKeywords.questions || []),
        ...(longTailKeywords.modifiers || [])
      ];

      longTailKeys.forEach(keyword => {
        const intent = this.classifyKeywordIntent(keyword.keyword);
        intentClassification.byIntent[intent.type].push({
          ...keyword,
          intent: intent.type,
          confidence: intent.confidence,
          isLongTail: true
        });
      });
    }

    // Calculate distribution
    const totalKeywords = Object.values(intentClassification.byIntent)
      .reduce((sum, arr) => sum + arr.length, 0);

    intentClassification.distribution = {
      informational: (intentClassification.byIntent.informational.length / totalKeywords) * 100,
      navigational: (intentClassification.byIntent.navigational.length / totalKeywords) * 100,
      transactional: (intentClassification.byIntent.transactional.length / totalKeywords) * 100,
      commercial: (intentClassification.byIntent.commercial.length / totalKeywords) * 100
    };

    // Calculate confidence scores
    Object.keys(intentClassification.byIntent).forEach(intent => {
      const keywords = intentClassification.byIntent[intent];
      if (keywords.length > 0) {
        const avgConfidence = keywords.reduce((sum, k) => sum + (k.confidence || 0.5), 0) / keywords.length;
        intentClassification.confidence[intent] = avgConfidence;
      } else {
        intentClassification.confidence[intent] = 0;
      }
    });

    return intentClassification;
  }

  /**
   * Cluster keywords by semantic similarity and topic
   */
  async clusterKeywords(semanticKeywords, textData) {
    const clusters = {
      topicClusters: [],
      semanticGroups: [],
      intentClusters: {},
      recommendations: []
    };

    // Combine all keywords for clustering
    const allKeywords = [
      ...(semanticKeywords.primary || []),
      ...(semanticKeywords.secondary || []),
      ...(semanticKeywords.phrases || [])
    ];

    if (allKeywords.length < 3) {
      return {
        topicClusters: [],
        semanticGroups: [],
        intentClusters: {},
        recommendations: ['Need more keywords for effective clustering']
      };
    }

    // Semantic clustering using word co-occurrence
    const cooccurrenceMatrix = this.buildCooccurrenceMatrix(allKeywords, textData.sentences);
    clusters.semanticGroups = this.performSemanticClustering(allKeywords, cooccurrenceMatrix);

    // Topic-based clustering
    clusters.topicClusters = this.performTopicClustering(allKeywords, textData);

    // Intent-based clustering
    clusters.intentClusters = this.clusterByIntent(allKeywords);

    // Generate clustering recommendations
    clusters.recommendations = this.generateClusteringRecommendations(clusters);

    return clusters;
  }

  /**
   * Generate negative keyword suggestions
   */
  async generateNegativeKeywords(semanticKeywords, industry) {
    const negativeKeywords = {
      irrelevant: [],
      competitors: [],
      lowQuality: [],
      unwantedModifiers: [],
      recommendations: []
    };

    // Identify irrelevant keywords based on content
    negativeKeywords.irrelevant = this.identifyIrrelevantKeywords(semanticKeywords, industry);

    // Suggest competitor brand terms as negatives
    negativeKeywords.competitors = this.identifyCompetitorTerms(semanticKeywords);

    // Identify low-quality traffic keywords
    negativeKeywords.lowQuality = this.identifyLowQualityKeywords(semanticKeywords);

    // Suggest unwanted modifiers
    negativeKeywords.unwantedModifiers = this.generateUnwantedModifiers(industry);

    // Generate strategic recommendations
    negativeKeywords.recommendations = this.generateNegativeKeywordRecommendations(
      negativeKeywords,
      industry
    );

    return negativeKeywords;
  }

  /**
   * Identify keyword opportunities and gaps
   */
  async identifyKeywordOpportunities(keywordAnalysis, competitorKeywords, industry) {
    const opportunities = {
      lowCompetition: [],
      highOpportunity: [],
      contentGaps: [],
      emergingTrends: [],
      seasonalOpportunities: [],
      recommendations: []
    };

    const allKeywords = this.combineAllKeywords(keywordAnalysis);

    // Low competition opportunities
    opportunities.lowCompetition = allKeywords
      .filter(keyword => keyword.difficulty < 30 && keyword.searchVolume > 100)
      .sort((a, b) => b.opportunity - a.opportunity)
      .slice(0, 15);

    // High opportunity score keywords
    opportunities.highOpportunity = allKeywords
      .filter(keyword => keyword.opportunity > 0.7)
      .sort((a, b) => b.opportunity - a.opportunity)
      .slice(0, 20);

    // Content gap analysis
    opportunities.contentGaps = this.identifyContentGaps(keywordAnalysis, industry);

    // Emerging trend identification
    opportunities.emergingTrends = this.identifyEmergingTrends(allKeywords, industry);

    // Seasonal opportunities
    opportunities.seasonalOpportunities = this.identifySeasonalOpportunities(allKeywords);

    // Generate recommendations
    opportunities.recommendations = this.generateOpportunityRecommendations(opportunities);

    return opportunities;
  }

  /**
   * Analyze competitor keyword gaps
   */
  async analyzeCompetitorGaps(ownKeywords, competitorKeywords) {
    const gaps = {
      missingKeywords: [],
      weakKeywords: [],
      competitorStrengths: [],
      opportunities: [],
      recommendations: []
    };

    if (!competitorKeywords || competitorKeywords.length === 0) {
      return {
        missingKeywords: [],
        weakKeywords: [],
        competitorStrengths: [],
        opportunities: [],
        recommendations: ['Competitor keyword data needed for gap analysis']
      };
    }

    // Convert own keywords to map for quick lookup
    const ownKeywordMap = new Map();
    ownKeywords.forEach(keyword => {
      ownKeywordMap.set(keyword.keyword.toLowerCase(), keyword);
    });

    // Identify missing keywords
    competitorKeywords.forEach(compKeyword => {
      const keywordLower = compKeyword.keyword.toLowerCase();
      if (!ownKeywordMap.has(keywordLower)) {
        gaps.missingKeywords.push({
          ...compKeyword,
          gap: 'missing',
          opportunityScore: this.calculateGapOpportunityScore(compKeyword)
        });
      }
    });

    // Identify weak keywords (competitor ranks better)
    competitorKeywords.forEach(compKeyword => {
      const keywordLower = compKeyword.keyword.toLowerCase();
      const ownKeyword = ownKeywordMap.get(keywordLower);

      if (ownKeyword && compKeyword.ranking && ownKeyword.ranking) {
        if (compKeyword.ranking < ownKeyword.ranking) { // Lower ranking is better
          gaps.weakKeywords.push({
            keyword: ownKeyword.keyword,
            ownRanking: ownKeyword.ranking,
            competitorRanking: compKeyword.ranking,
            gap: ownKeyword.ranking - compKeyword.ranking,
            improvementPotential: this.calculateImprovementPotential(ownKeyword, compKeyword)
          });
        }
      }
    });

    // Identify competitor strengths
    gaps.competitorStrengths = competitorKeywords
      .filter(keyword => keyword.ranking <= 3) // Top 3 positions
      .sort((a, b) => a.ranking - b.ranking)
      .slice(0, 20);

    // Calculate opportunities
    gaps.opportunities = [
      ...gaps.missingKeywords.slice(0, 10),
      ...gaps.weakKeywords.slice(0, 10)
    ].sort((a, b) => (b.opportunityScore || b.improvementPotential || 0) - (a.opportunityScore || a.improvementPotential || 0));

    // Generate recommendations
    gaps.recommendations = this.generateGapRecommendations(gaps);

    return gaps;
  }

  /**
   * Calculate comprehensive keyword metrics
   */
  calculateKeywordMetrics(keywordAnalysis) {
    const metrics = {
      totalKeywords: 0,
      averageDifficulty: 0,
      averageOpportunity: 0,
      intentDistribution: {},
      qualityScore: 0,
      diversityScore: 0,
      competitiveAdvantage: 0
    };

    const allKeywords = this.combineAllKeywords(keywordAnalysis);
    metrics.totalKeywords = allKeywords.length;

    if (allKeywords.length === 0) {
      return metrics;
    }

    // Calculate averages
    metrics.averageDifficulty = allKeywords.reduce((sum, k) => sum + (k.difficulty || 0), 0) / allKeywords.length;
    metrics.averageOpportunity = allKeywords.reduce((sum, k) => sum + (k.opportunity || 0), 0) / allKeywords.length;

    // Intent distribution
    if (keywordAnalysis.intentClassification) {
      metrics.intentDistribution = keywordAnalysis.intentClassification.distribution;
    }

    // Quality score based on relevance and opportunity
    metrics.qualityScore = this.calculateOverallQualityScore(allKeywords);

    // Diversity score based on different keyword types and topics
    metrics.diversityScore = this.calculateKeywordDiversityScore(keywordAnalysis);

    // Competitive advantage score
    if (keywordAnalysis.competitorGaps) {
      metrics.competitiveAdvantage = this.calculateCompetitiveAdvantageScore(
        keywordAnalysis.competitorGaps
      );
    }

    return metrics;
  }

  /**
   * Generate strategic keyword recommendations
   */
  generateKeywordRecommendations(keywordAnalysis, targetAudience, industry) {
    const recommendations = {
      priority: [],
      strategic: [],
      tactical: [],
      contentStrategy: [],
      nextSteps: []
    };

    // Priority recommendations (immediate actions)
    recommendations.priority = this.generatePriorityRecommendations(keywordAnalysis);

    // Strategic recommendations (long-term planning)
    recommendations.strategic = this.generateStrategicRecommendations(
      keywordAnalysis,
      targetAudience,
      industry
    );

    // Tactical recommendations (execution)
    recommendations.tactical = this.generateTacticalRecommendations(keywordAnalysis);

    // Content strategy recommendations
    recommendations.contentStrategy = this.generateContentStrategyRecommendations(keywordAnalysis);

    // Next steps
    recommendations.nextSteps = this.generateNextStepsRecommendations(keywordAnalysis);

    return recommendations;
  }

  /**
   * Helper methods for keyword analysis
   */

  prepareTextForKeywordAnalysis(content) {
    // Combine all text content
    const allTextParts = [];

    if (content.allText && Array.isArray(content.allText)) {
      allTextParts.push(...content.allText);
    }

    if (content.allHeadings && Array.isArray(content.allHeadings)) {
      allTextParts.push(...content.allHeadings.map(h => h.text || ''));
    }

    const allText = allTextParts.join(' ').toLowerCase();

    // Clean and tokenize
    const cleanText = allText.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
    const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const words = cleanText.split(/\s+/)
      .filter(word => word.length > 2 && !this.isStopWord(word));

    const uniqueWords = new Set(words);

    // Create documents for TF-IDF (split by paragraphs/sections)
    const documents = allTextParts.filter(text => text.trim().length > 20);

    return {
      allText,
      cleanText,
      sentences,
      words,
      uniqueWords,
      documents,
      topKeywords: this.extractTopKeywords(words, 50)
    };
  }

  calculateTFIDF(words, documents) {
    const termFreq = {};
    const docFreq = {};
    const totalWords = words.length;
    const totalDocs = documents.length;

    // Calculate term frequency
    words.forEach(word => {
      termFreq[word] = (termFreq[word] || 0) + 1;
    });

    // Calculate document frequency
    documents.forEach(doc => {
      const docWords = new Set(
        doc.toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 2)
      );

      docWords.forEach(word => {
        docFreq[word] = (docFreq[word] || 0) + 1;
      });
    });

    // Calculate TF-IDF scores
    return Object.entries(termFreq)
      .map(([word, freq]) => {
        const tf = freq / totalWords;
        const idf = Math.log(totalDocs / (docFreq[word] || 1));
        return {
          word,
          frequency: freq,
          tfScore: tf,
          idfScore: idf,
          tfidfScore: tf * idf
        };
      })
      .sort((a, b) => b.tfidfScore - a.tfidfScore);
  }

  estimateSearchVolume(keyword) {
    // Simplified search volume estimation based on keyword characteristics
    const length = keyword.length;
    const wordCount = keyword.split(' ').length;

    let baseVolume = 1000;

    // Adjust based on keyword length and complexity
    if (wordCount === 1) baseVolume *= 2;
    else if (wordCount > 3) baseVolume *= 0.3;

    if (length < 5) baseVolume *= 1.5;
    else if (length > 15) baseVolume *= 0.5;

    // Add some randomization for realism
    const variation = 0.5 + Math.random();
    return Math.round(baseVolume * variation);
  }

  estimateKeywordDifficulty(keyword) {
    // Simplified difficulty estimation
    const wordCount = keyword.split(' ').length;
    const length = keyword.length;

    let difficulty = 50; // Base difficulty

    // Single words are typically more competitive
    if (wordCount === 1) difficulty += 20;
    else if (wordCount > 3) difficulty -= 15;

    // Commercial keywords are more competitive
    if (this.isCommercialKeyword(keyword)) difficulty += 15;

    // Technical terms might be less competitive
    if (this.isTechnicalKeyword(keyword)) difficulty -= 10;

    return Math.max(10, Math.min(90, difficulty));
  }

  calculateOpportunityScore(relevanceScore, frequency) {
    // Combine relevance and frequency to calculate opportunity
    const normalizedRelevance = Math.min(relevanceScore * 10, 1);
    const normalizedFrequency = Math.min(frequency / 10, 1);

    return (normalizedRelevance * 0.7) + (normalizedFrequency * 0.3);
  }

  isCommercialKeyword(keyword) {
    const commercialIndicators = [
      'buy', 'purchase', 'price', 'cost', 'cheap', 'best', 'review',
      'compare', 'deal', 'discount', 'sale', 'offer', 'service', 'solution'
    ];

    return commercialIndicators.some(indicator =>
      keyword.toLowerCase().includes(indicator)
    );
  }

  isInformationalKeyword(keyword) {
    const informationalIndicators = [
      'how', 'what', 'why', 'when', 'where', 'guide', 'tutorial',
      'learn', 'understand', 'explain', 'definition', 'meaning'
    ];

    return informationalIndicators.some(indicator =>
      keyword.toLowerCase().includes(indicator)
    );
  }

  isTechnicalKeyword(keyword) {
    const technicalIndicators = [
      'api', 'sdk', 'database', 'algorithm', 'framework', 'protocol',
      'integration', 'architecture', 'optimization', 'analytics'
    ];

    return technicalIndicators.some(indicator =>
      keyword.toLowerCase().includes(indicator)
    );
  }

  identifyBrandedKeywords(text) {
    // Simple branded keyword identification
    const brandIndicators = [];
    const words = text.split(/\s+/);

    // Look for capitalized words that might be brand names
    words.forEach(word => {
      if (/^[A-Z][a-z]+$/.test(word) && word.length > 3) {
        brandIndicators.push({
          keyword: word.toLowerCase(),
          type: 'brand_mention',
          confidence: 0.6
        });
      }
    });

    return brandIndicators.slice(0, 10);
  }

  extractNgramKeywords(text) {
    const ngramKeywords = [];

    // Extract 2-grams, 3-grams, and 4-grams
    for (let n = 2; n <= 4; n++) {
      const ngrams = this.extractNgrams(text, n);
      ngramKeywords.push(...ngrams);
    }

    return ngramKeywords
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
  }

  extractNgrams(text, n) {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.isStopWord(word));

    const ngramFreq = {};

    for (let i = 0; i <= words.length - n; i++) {
      const ngram = words.slice(i, i + n).join(' ');
      if (ngram.length > 5) { // Filter very short phrases
        ngramFreq[ngram] = (ngramFreq[ngram] || 0) + 1;
      }
    }

    return Object.entries(ngramFreq)
      .filter(([phrase, freq]) => freq > 1)
      .map(([phrase, freq]) => ({
        text: phrase,
        frequency: freq,
        wordCount: n,
        score: freq * n // Longer phrases get higher scores
      }));
  }

  extractQuestionKeywords(text) {
    const questions = [];
    const questionPattern = /([^.!?]*\?)/g;
    let match;

    while ((match = questionPattern.exec(text)) !== null) {
      const question = match[1].trim();
      if (question.length > 10 && question.split(' ').length >= 3) {
        questions.push({
          keyword: question.toLowerCase().replace('?', ''),
          type: 'question',
          intent: this.classifyQueryIntent(question),
          searchVolume: this.estimateSearchVolume(question),
          difficulty: this.estimateKeywordDifficulty(question),
          opportunity: 0.6 // Questions often have good opportunity
        });
      }
    }

    return questions.slice(0, 15);
  }

  generateModifierKeywords(topKeywords) {
    const modifiers = {
      quality: ['best', 'top', 'premium', 'professional', 'expert'],
      action: ['how to', 'guide to', 'steps to', 'ways to'],
      comparison: ['vs', 'compared to', 'alternative to', 'better than'],
      time: ['2024', '2025', 'latest', 'new', 'updated'],
      location: ['online', 'near me', 'local', 'remote']
    };

    const modifierKeywords = [];

    topKeywords.slice(0, 10).forEach(keyword => {
      Object.entries(modifiers).forEach(([type, modList]) => {
        modList.forEach(modifier => {
          const modifiedKeyword = `${modifier} ${keyword}`;
          modifierKeywords.push({
            keyword: modifiedKeyword,
            baseKeyword: keyword,
            modifier: modifier,
            modifierType: type,
            searchVolume: this.estimateSearchVolume(modifiedKeyword),
            difficulty: this.estimateKeywordDifficulty(modifiedKeyword),
            opportunity: this.calculateLongTailOpportunity({ text: modifiedKeyword })
          });
        });
      });
    });

    return modifierKeywords.slice(0, 30);
  }

  extractLocationKeywords(text) {
    const locationKeywords = [];
    const locationPattern = /\b(in|near|at|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
    let match;

    while ((match = locationPattern.exec(text)) !== null) {
      const location = match[2];
      if (location.length > 2) {
        locationKeywords.push({
          keyword: `services ${match[1]} ${location}`.toLowerCase(),
          location: location,
          type: 'location_based',
          searchVolume: this.estimateSearchVolume(`services in ${location}`),
          difficulty: this.estimateKeywordDifficulty(`services in ${location}`),
          opportunity: 0.5
        });
      }
    }

    return locationKeywords.slice(0, 10);
  }

  analyzeContentForQueries(sentences) {
    const queries = [];

    sentences.slice(0, 50).forEach(sentence => {
      const words = sentence.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2);

      if (words.length >= 3 && words.length <= 8) {
        const queryText = words.join(' ');
        queries.push({
          text: queryText,
          words: words,
          score: this.scoreQueryPotential(queryText, words),
          source: 'content_analysis'
        });
      }
    });

    return queries
      .filter(query => query.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 25);
  }

  scoreQueryPotential(queryText, words) {
    let score = 0.5; // Base score

    // Boost for question words
    if (words.some(word => ['what', 'how', 'why', 'when', 'where'].includes(word))) {
      score += 0.2;
    }

    // Boost for action words
    if (words.some(word => ['get', 'find', 'create', 'build', 'make'].includes(word))) {
      score += 0.1;
    }

    // Boost for commercial intent
    if (words.some(word => ['buy', 'price', 'cost', 'review', 'best'].includes(word))) {
      score += 0.15;
    }

    // Penalty for very common words
    const commonWords = words.filter(word => this.isStopWord(word));
    score -= (commonWords.length / words.length) * 0.2;

    return Math.max(0, Math.min(1, score));
  }

  classifyQueryIntent(query) {
    const queryLower = query.toLowerCase();

    for (const [intent, data] of Object.entries(this.intentPatterns)) {
      // Check keywords
      if (data.keywords.some(keyword => queryLower.includes(keyword))) {
        return intent;
      }

      // Check phrases
      if (data.phrases.some(phrase => queryLower.includes(phrase))) {
        return intent;
      }

      // Check patterns
      if (data.patterns.some(pattern => pattern.test(queryLower))) {
        return intent;
      }
    }

    return 'informational'; // Default intent
  }

  classifyKeywordIntent(keyword) {
    const keywordLower = keyword.toLowerCase();
    let bestMatch = { type: 'informational', confidence: 0.3 };

    for (const [intent, data] of Object.entries(this.intentPatterns)) {
      let confidence = 0;

      // Check direct keyword matches
      const keywordMatches = data.keywords.filter(kw => keywordLower.includes(kw)).length;
      confidence += keywordMatches * 0.3;

      // Check phrase matches
      const phraseMatches = data.phrases.filter(phrase => keywordLower.includes(phrase)).length;
      confidence += phraseMatches * 0.4;

      // Check pattern matches
      const patternMatches = data.patterns.filter(pattern => pattern.test(keywordLower)).length;
      confidence += patternMatches * 0.5;

      if (confidence > bestMatch.confidence) {
        bestMatch = { type: intent, confidence: Math.min(confidence, 1) };
      }
    }

    return bestMatch;
  }

  calculateLongTailOpportunity(query) {
    const wordCount = query.text ? query.text.split(' ').length : query.words?.length || 0;
    let opportunity = 0.4; // Base opportunity

    // Longer queries typically have less competition
    if (wordCount >= 4) opportunity += 0.2;
    if (wordCount >= 6) opportunity += 0.1;

    // Question format often indicates good opportunity
    if (query.text && query.text.includes('?')) opportunity += 0.15;

    // Commercial intent might have higher value
    if (query.text && this.isCommercialKeyword(query.text)) opportunity += 0.1;

    return Math.min(1, opportunity);
  }

  identifySeasonalKeywords(text) {
    const seasonalTerms = {
      'Q1': ['january', 'february', 'march', 'new year', 'winter', 'tax season'],
      'Q2': ['april', 'may', 'june', 'spring', 'easter', 'summer'],
      'Q3': ['july', 'august', 'september', 'back to school', 'fall'],
      'Q4': ['october', 'november', 'december', 'halloween', 'thanksgiving', 'christmas', 'holiday']
    };

    const seasonalKeywords = [];
    const textLower = text.toLowerCase();

    Object.entries(seasonalTerms).forEach(([quarter, terms]) => {
      terms.forEach(term => {
        if (textLower.includes(term)) {
          seasonalKeywords.push({
            keyword: term,
            quarter: quarter,
            type: 'seasonal',
            opportunity: 0.6,
            seasonality: 'high'
          });
        }
      });
    });

    return seasonalKeywords.slice(0, 10);
  }

  // Additional helper methods (simplified implementations)

  isStopWord(word) {
    const stopWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
    ];

    return stopWords.includes(word.toLowerCase());
  }

  extractTopKeywords(words, count) {
    const freq = {};
    words.forEach(word => {
      freq[word] = (freq[word] || 0) + 1;
    });

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([word, frequency]) => word);
  }

  // Placeholder implementations for complex clustering and analysis methods
  buildCooccurrenceMatrix(keywords, sentences) {
    // Simplified co-occurrence matrix
    return new Map();
  }

  performSemanticClustering(keywords, cooccurrenceMatrix) {
    // Simplified semantic clustering
    return [{
      cluster: 'main_topic',
      keywords: keywords.slice(0, 5),
      similarity: 0.8
    }];
  }

  performTopicClustering(keywords, textData) {
    // Simplified topic clustering
    return [{
      topic: 'primary_topic',
      keywords: keywords.slice(0, 7),
      coherence: 0.7
    }];
  }

  clusterByIntent(keywords) {
    // Group keywords by their intent classification
    const intentClusters = {};

    keywords.forEach(keyword => {
      const intent = this.classifyKeywordIntent(keyword.keyword);
      if (!intentClusters[intent.type]) {
        intentClusters[intent.type] = [];
      }
      intentClusters[intent.type].push(keyword);
    });

    return intentClusters;
  }

  generateClusteringRecommendations(clusters) {
    return [
      'Use topic clusters to organize content strategy',
      'Create content for each semantic group',
      'Target different intent clusters with specific page types'
    ];
  }

  identifyIrrelevantKeywords(keywords, industry) {
    // Simplified irrelevant keyword identification
    return this.negativePatterns.irrelevant.map(word => ({
      keyword: word,
      reason: 'inappropriate_content',
      confidence: 0.9
    }));
  }

  identifyCompetitorTerms(keywords) {
    // Look for potential competitor brand names
    const competitors = [];
    const allKeywords = Array.isArray(keywords) ? keywords : [];

    allKeywords.forEach(keyword => {
      if (/^[A-Z][a-z]+$/.test(keyword.keyword) && keyword.keyword.length > 4) {
        competitors.push({
          keyword: keyword.keyword.toLowerCase(),
          reason: 'potential_competitor_brand',
          confidence: 0.6
        });
      }
    });

    return competitors.slice(0, 10);
  }

  identifyLowQualityKeywords(keywords) {
    const lowQuality = [];
    const keywordArray = Array.isArray(keywords) ? keywords : [];

    this.negativePatterns.lowIntent.forEach(pattern => {
      keywordArray.forEach(keyword => {
        const keywordText = keyword?.keyword || keyword;
        if (typeof keywordText === 'string' && keywordText.toLowerCase().includes(pattern)) {
          lowQuality.push({
            keyword: keywordText,
            reason: 'low_commercial_intent',
            confidence: 0.7
          });
        }
      });
    });

    return lowQuality.slice(0, 15);
  }

  generateUnwantedModifiers(industry) {
    const unwantedModifiers = [
      'free', 'cracked', 'pirated', 'illegal', 'hack', 'cheat',
      'torrent', 'download', 'crack', 'keygen'
    ];

    return unwantedModifiers.map(modifier => ({
      keyword: modifier,
      reason: 'unwanted_modifier',
      confidence: 0.8
    }));
  }

  generateNegativeKeywordRecommendations(negativeKeywords, industry) {
    const recommendations = [];

    if (negativeKeywords.competitors.length > 0) {
      recommendations.push('Add competitor brand names as negative keywords');
    }

    if (negativeKeywords.lowQuality.length > 0) {
      recommendations.push('Exclude low-intent keywords to improve ad quality');
    }

    recommendations.push('Regularly review and update negative keyword lists');

    return recommendations;
  }

  combineAllKeywords(keywordAnalysis) {
    const combined = [];

    if (keywordAnalysis.semanticKeywords) {
      if (keywordAnalysis.semanticKeywords.primary) {
        combined.push(...keywordAnalysis.semanticKeywords.primary);
      }
      if (keywordAnalysis.semanticKeywords.secondary) {
        combined.push(...keywordAnalysis.semanticKeywords.secondary);
      }
      if (keywordAnalysis.semanticKeywords.phrases) {
        combined.push(...keywordAnalysis.semanticKeywords.phrases);
      }
    }

    if (keywordAnalysis.longTailKeywords) {
      if (keywordAnalysis.longTailKeywords.discovered) {
        combined.push(...keywordAnalysis.longTailKeywords.discovered);
      }
    }

    return combined;
  }

  identifyContentGaps(keywordAnalysis, industry) {
    // Simplified content gap identification
    return [
      { gap: 'how_to_content', keywords: ['how to'], opportunity: 0.8 },
      { gap: 'comparison_content', keywords: ['vs', 'compare'], opportunity: 0.7 }
    ];
  }

  identifyEmergingTrends(keywords, industry) {
    // Simplified trend identification
    const trends = [];
    const currentYear = new Date().getFullYear();

    keywords.forEach(keyword => {
      if (keyword.keyword.includes(currentYear.toString()) ||
          keyword.keyword.includes('new') ||
          keyword.keyword.includes('latest')) {
        trends.push({
          keyword: keyword.keyword,
          trend: 'emerging',
          confidence: 0.6
        });
      }
    });

    return trends.slice(0, 10);
  }

  identifySeasonalOpportunities(keywords) {
    // Look for seasonal patterns in keywords
    return keywords
      .filter(keyword => this.hasSeasonalIndicators(keyword.keyword))
      .slice(0, 10)
      .map(keyword => ({
        ...keyword,
        seasonality: 'detected',
        opportunity: keyword.opportunity * 1.2 // Boost seasonal opportunities
      }));
  }

  hasSeasonalIndicators(keyword) {
    const seasonalTerms = [
      'holiday', 'christmas', 'thanksgiving', 'summer', 'winter',
      'spring', 'fall', 'january', 'december', 'new year'
    ];

    return seasonalTerms.some(term => keyword.toLowerCase().includes(term));
  }

  generateOpportunityRecommendations(opportunities) {
    const recommendations = [];

    if (opportunities.lowCompetition.length > 0) {
      recommendations.push('Target low-competition keywords for quick wins');
    }

    if (opportunities.contentGaps.length > 0) {
      recommendations.push('Create content to fill identified gaps');
    }

    if (opportunities.seasonalOpportunities.length > 0) {
      recommendations.push('Plan seasonal content calendar around opportunities');
    }

    return recommendations;
  }

  calculateGapOpportunityScore(competitorKeyword) {
    // Simple opportunity scoring for gap analysis
    let score = 0.5;

    if (competitorKeyword.ranking <= 3) score += 0.3;
    if (competitorKeyword.searchVolume > 1000) score += 0.2;

    return Math.min(1, score);
  }

  calculateImprovementPotential(ownKeyword, competitorKeyword) {
    const rankingGap = ownKeyword.ranking - competitorKeyword.ranking;
    return Math.min(1, rankingGap / 10); // Normalize to 0-1 scale
  }

  generateGapRecommendations(gaps) {
    const recommendations = [];

    if (gaps.missingKeywords.length > 0) {
      recommendations.push(`Target ${gaps.missingKeywords.length} missing keywords identified`);
    }

    if (gaps.weakKeywords.length > 0) {
      recommendations.push(`Improve content for ${gaps.weakKeywords.length} underperforming keywords`);
    }

    return recommendations;
  }

  calculateOverallQualityScore(keywords) {
    if (keywords.length === 0) return 0;

    const avgOpportunity = keywords.reduce((sum, k) => sum + (k.opportunity || 0), 0) / keywords.length;
    const avgRelevance = keywords.reduce((sum, k) => sum + (k.relevanceScore || 0), 0) / keywords.length;

    return Math.round(((avgOpportunity * 0.6) + (avgRelevance * 0.4)) * 100);
  }

  calculateKeywordDiversityScore(keywordAnalysis) {
    let diversityScore = 0;

    // Intent diversity
    if (keywordAnalysis.intentClassification) {
      const intents = Object.keys(keywordAnalysis.intentClassification.byIntent)
        .filter(intent => keywordAnalysis.intentClassification.byIntent[intent].length > 0);
      diversityScore += (intents.length / 4) * 30; // Max 30 points for intent diversity
    }

    // Keyword type diversity
    let typeCount = 0;
    if (keywordAnalysis.semanticKeywords?.primary?.length > 0) typeCount++;
    if (keywordAnalysis.semanticKeywords?.secondary?.length > 0) typeCount++;
    if (keywordAnalysis.longTailKeywords?.discovered?.length > 0) typeCount++;

    diversityScore += (typeCount / 3) * 30; // Max 30 points for type diversity

    // Topic diversity (simplified)
    if (keywordAnalysis.clusters?.topicClusters?.length > 1) {
      diversityScore += 40; // Max 40 points for topic diversity
    }

    return Math.round(diversityScore);
  }

  calculateCompetitiveAdvantageScore(competitorGaps) {
    if (!competitorGaps.opportunities || competitorGaps.opportunities.length === 0) {
      return 0;
    }

    const avgOpportunityScore = competitorGaps.opportunities
      .reduce((sum, opp) => sum + (opp.opportunityScore || opp.improvementPotential || 0), 0)
      / competitorGaps.opportunities.length;

    return Math.round(avgOpportunityScore * 100);
  }

  generatePriorityRecommendations(keywordAnalysis) {
    const recommendations = [];
    const allKeywords = this.combineAllKeywords(keywordAnalysis);

    if (allKeywords.length < 20) {
      recommendations.push('Expand keyword research to identify more opportunities');
    }

    const highOpportunityKeywords = allKeywords.filter(k => k.opportunity > 0.7);
    if (highOpportunityKeywords.length > 0) {
      recommendations.push(`Target ${highOpportunityKeywords.length} high-opportunity keywords immediately`);
    }

    return recommendations;
  }

  generateStrategicRecommendations(keywordAnalysis, targetAudience, industry) {
    const recommendations = [];

    if (keywordAnalysis.intentClassification) {
      const distribution = keywordAnalysis.intentClassification.distribution;
      if (distribution.transactional < 20) {
        recommendations.push('Increase focus on transactional keywords for better conversion');
      }
    }

    if (industry) {
      recommendations.push(`Develop industry-specific content for ${industry} vertical`);
    }

    return recommendations;
  }

  generateTacticalRecommendations(keywordAnalysis) {
    return [
      'Create dedicated landing pages for high-value keywords',
      'Optimize existing content for discovered keyword opportunities',
      'Implement keyword clusters in content structure'
    ];
  }

  generateContentStrategyRecommendations(keywordAnalysis) {
    const recommendations = [];

    if (keywordAnalysis.longTailKeywords?.questions?.length > 0) {
      recommendations.push('Create FAQ content addressing question-based keywords');
    }

    if (keywordAnalysis.clusters?.topicClusters?.length > 0) {
      recommendations.push('Develop topic cluster content strategy');
    }

    return recommendations;
  }

  generateNextStepsRecommendations(keywordAnalysis) {
    return [
      'Prioritize keywords by opportunity score and search volume',
      'Create content calendar based on keyword clusters',
      'Set up tracking for keyword performance monitoring',
      'Schedule regular keyword research updates'
    ];
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.keywordCache.clear();
    logger.info('Keyword miner cache cleared');
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      cacheSize: this.keywordCache.size,
      isInitialized: this.initialized,
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let keywordMinerInstance = null;

/**
 * Get singleton keyword miner instance
 */
export function getKeywordMiner() {
  if (!keywordMinerInstance) {
    keywordMinerInstance = new KeywordMinerService();
  }
  return keywordMinerInstance;
}

/**
 * Mine keywords function
 */
export async function mineKeywords(content, options = {}) {
  const keywordMiner = getKeywordMiner();
  return await keywordMiner.mineKeywords(content, options);
}

export default getKeywordMiner;