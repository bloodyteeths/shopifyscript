/**
 * Content Intelligence Service for ProofKit SaaS
 * Advanced NLP-based content analysis for extracting winning hooks, sentiment, and copy patterns
 *
 * Features:
 * - Hook and angle extraction using linguistic patterns
 * - Sentiment analysis and emotional tone detection
 * - Readability scoring (Flesch-Kincaid, SMOG, etc.)
 * - Power word identification and impact scoring
 * - Topic modeling and content categorization
 * - TF-IDF keyword importance calculation
 * - Named entity recognition for brands/products
 * - Copy effectiveness scoring
 */

import logger from './logger.js';

/**
 * Content Intelligence Service with NLP capabilities
 */
export class ContentIntelligenceService {
  constructor() {
    this.initialized = false;

    // Power words categorized by emotional impact
    this.powerWords = {
      urgency: [
        'now', 'today', 'immediately', 'urgent', 'limited', 'hurry', 'deadline',
        'expires', 'last chance', 'final', 'ending soon', 'act fast', 'quick',
        'instant', 'rush', 'temporary', 'while supplies last', 'don\'t wait'
      ],
      scarcity: [
        'exclusive', 'rare', 'limited edition', 'only', 'few left', 'shortage',
        'scarce', 'sold out', 'almost gone', 'last few', 'limited quantity',
        'restricted', 'members only', 'invitation only', 'select few'
      ],
      emotion: [
        'amazing', 'incredible', 'stunning', 'shocking', 'unbelievable',
        'breakthrough', 'revolutionary', 'life-changing', 'mind-blowing',
        'extraordinary', 'remarkable', 'spectacular', 'phenomenal'
      ],
      trust: [
        'proven', 'tested', 'verified', 'certified', 'guaranteed', 'backed',
        'endorsed', 'recommended', 'trusted', 'reliable', 'authentic',
        'legitimate', 'established', 'reputable', 'credible'
      ],
      benefit: [
        'free', 'bonus', 'save', 'discount', 'profit', 'gain', 'advantage',
        'benefit', 'reward', 'value', 'worth', 'bargain', 'deal', 'offer'
      ]
    };

    // Hook patterns for winning copy identification
    this.hookPatterns = {
      curiosity: [
        /the\s+(\w+\s+){0,3}secret\s+to/gi,
        /what\s+(\w+\s+){0,5}don't\s+want\s+you\s+to\s+know/gi,
        /the\s+surprising\s+truth\s+about/gi,
        /why\s+(\w+\s+){0,5}never\s+tell\s+you/gi,
        /(\d+)\s+(\w+\s+){0,3}secrets?/gi,
        /discover\s+how\s+to/gi,
        /revealed:\s*/gi
      ],
      social_proof: [
        /(\d+[,\d]*)\+?\s+(customers?|clients?|users?)/gi,
        /join\s+(\d+[,\d]*)\+?\s+/gi,
        /trusted\s+by\s+(\d+[,\d]*)/gi,
        /(\d+)%\s+of\s+(customers?|people|users?)/gi,
        /featured\s+in\s+/gi,
        /as\s+seen\s+(on|in)\s+/gi
      ],
      urgency: [
        /limited\s+time\s+offer/gi,
        /ends\s+(today|tonight|soon)/gi,
        /don't\s+miss\s+(out|this)/gi,
        /act\s+(now|fast|today)/gi,
        /only\s+(\d+)\s+(days?|hours?)\s+left/gi
      ],
      benefit: [
        /get\s+(\w+\s+){0,5}\s+in\s+(just\s+)?(\d+)\s+(minutes?|hours?|days?)/gi,
        /without\s+(any|the)\s+(\w+)/gi,
        /(\d+)x\s+(faster|better|more)/gi,
        /save\s+(\$?\d+|up\s+to)/gi,
        /free\s+(\w+)/gi
      ],
      question: [
        /^(are\s+you|do\s+you|have\s+you|can\s+you|would\s+you)/gi,
        /^(what\s+if|imagine\s+if|wondering\s+how)/gi,
        /\?\s*$/gm
      ]
    };

    // Sentiment lexicon (simplified)
    this.sentimentWords = {
      positive: [
        'amazing', 'awesome', 'excellent', 'fantastic', 'great', 'love',
        'perfect', 'wonderful', 'brilliant', 'outstanding', 'superb',
        'incredible', 'magnificent', 'spectacular', 'remarkable', 'exceptional'
      ],
      negative: [
        'awful', 'terrible', 'horrible', 'bad', 'worst', 'hate', 'disgusting',
        'pathetic', 'useless', 'disappointing', 'frustrating', 'annoying'
      ]
    };

    // Emotional tone indicators
    this.emotionalTones = {
      excitement: ['exciting', 'thrilling', 'exhilarating', 'energizing', 'dynamic'],
      fear: ['scary', 'frightening', 'terrifying', 'alarming', 'concerning'],
      joy: ['happy', 'joyful', 'delighted', 'cheerful', 'blissful'],
      trust: ['reliable', 'trustworthy', 'dependable', 'honest', 'authentic'],
      anger: ['angry', 'furious', 'outraged', 'frustrated', 'annoyed'],
      sadness: ['sad', 'depressing', 'tragic', 'heartbreaking', 'disappointing']
    };

    // Readability formulas constants
    this.readabilityConstants = {
      flesch: { a: 206.835, b: 1.015, c: 84.6 },
      fleschKincaid: { a: 0.39, b: 11.8, c: 15.59 },
      gunningFog: { multiplier: 0.4 }
    };

    // Analysis cache for performance
    this.analysisCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Initialize the content intelligence service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      this.initialized = true;
      logger.info('Content intelligence service initialized');
    } catch (error) {
      logger.error('Failed to initialize content intelligence service:', error);
      throw error;
    }
  }

  /**
   * Analyze content comprehensively
   * @param {object} content - Content from website scraper
   * @param {object} options - Analysis options
   * @returns {object} Complete content analysis
   */
  async analyzeContent(content, options = {}) {
    const {
      includeHooks = true,
      includeSentiment = true,
      includeReadability = true,
      includeTones = true,
      includePowerWords = true,
      includeTopics = true,
      cacheKey = null
    } = options;

    await this.initialize();

    try {
      // Check cache
      if (cacheKey && this.analysisCache.has(cacheKey)) {
        const cached = this.analysisCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          logger.info('Using cached content analysis');
          return cached.data;
        }
      }

      const startTime = performance.now();

      // Prepare text for analysis
      const textData = this.prepareTextData(content);

      const analysis = {
        metadata: {
          analyzedAt: new Date().toISOString(),
          textLength: textData.allText.length,
          wordCount: textData.words.length,
          sentenceCount: textData.sentences.length,
          paragraphCount: textData.paragraphs.length
        }
      };

      // Run analyses based on options
      if (includeHooks) {
        analysis.hooks = await this.extractWinningHooks(textData);
      }

      if (includeSentiment) {
        analysis.sentiment = await this.analyzeSentiment(textData);
      }

      if (includeReadability) {
        analysis.readability = await this.calculateReadabilityScores(textData);
      }

      if (includeTones) {
        analysis.emotionalTones = await this.detectEmotionalTones(textData);
      }

      if (includePowerWords) {
        analysis.powerWords = await this.identifyPowerWords(textData);
      }

      if (includeTopics) {
        analysis.topics = await this.extractTopics(textData);
      }

      // Calculate overall content effectiveness score
      analysis.effectiveness = this.calculateEffectivenessScore(analysis);

      // Performance metrics
      analysis.metadata.processingTime = Math.round(performance.now() - startTime);

      // Cache result
      if (cacheKey) {
        this.analysisCache.set(cacheKey, {
          data: analysis,
          timestamp: Date.now()
        });
      }

      logger.info(`Content analysis completed in ${analysis.metadata.processingTime}ms`);
      return analysis;

    } catch (error) {
      logger.error('Content analysis failed:', error);
      throw error;
    }
  }

  /**
   * Extract winning hooks and angles from content
   */
  async extractWinningHooks(textData) {
    const hooks = {
      curiosity: [],
      socialProof: [],
      urgency: [],
      benefit: [],
      question: [],
      headlines: [],
      effectiveness: {}
    };

    // Extract hooks by pattern matching
    for (const [type, patterns] of Object.entries(this.hookPatterns)) {
      const typeKey = type.replace('_', '');

      for (const pattern of patterns) {
        const matches = [...textData.allText.matchAll(pattern)];

        matches.forEach(match => {
          const hook = {
            text: match[0].trim(),
            context: this.getContextAround(textData.allText, match.index, 100),
            confidence: this.calculateHookConfidence(match[0], type),
            pattern: pattern.source,
            location: match.index
          };

          if (hook.confidence > 0.5) {
            hooks[typeKey].push(hook);
          }
        });
      }
    }

    // Extract headline hooks (H1, H2 tags)
    if (textData.headings) {
      hooks.headlines = textData.headings
        .filter(h => h.level <= 2)
        .map(heading => ({
          text: heading.text,
          level: heading.level,
          hookTypes: this.classifyHookTypes(heading.text),
          effectiveness: this.scoreHeadlineEffectiveness(heading.text)
        }))
        .sort((a, b) => b.effectiveness - a.effectiveness);
    }

    // Calculate hook effectiveness scores
    hooks.effectiveness = {
      curiosityScore: this.calculateTypeEffectiveness(hooks.curiosity),
      socialProofScore: this.calculateTypeEffectiveness(hooks.socialProof),
      urgencyScore: this.calculateTypeEffectiveness(hooks.urgency),
      benefitScore: this.calculateTypeEffectiveness(hooks.benefit),
      questionScore: this.calculateTypeEffectiveness(hooks.question),
      overallScore: this.calculateOverallHookScore(hooks)
    };

    // Deduplicate and limit results
    for (const type of Object.keys(hooks)) {
      if (Array.isArray(hooks[type])) {
        hooks[type] = this.deduplicateHooks(hooks[type]).slice(0, 10);
      }
    }

    return hooks;
  }

  /**
   * Analyze sentiment and emotional polarity
   */
  async analyzeSentiment(textData) {
    const sentiment = {
      overall: { score: 0, label: 'neutral' },
      bySection: {},
      emotional: {},
      confidence: 0
    };

    // Analyze overall sentiment
    const overallSentiment = this.calculateSentimentScore(textData.allText);
    sentiment.overall = {
      score: overallSentiment.score,
      label: overallSentiment.label,
      positiveWords: overallSentiment.positiveWords,
      negativeWords: overallSentiment.negativeWords
    };

    // Analyze sentiment by sections (headings, paragraphs)
    if (textData.headings) {
      sentiment.bySection.headings = textData.headings.map(heading => ({
        text: heading.text,
        sentiment: this.calculateSentimentScore(heading.text)
      }));
    }

    if (textData.paragraphs) {
      sentiment.bySection.paragraphs = textData.paragraphs
        .slice(0, 20) // Limit to first 20 paragraphs
        .map((paragraph, index) => ({
          index,
          sentiment: this.calculateSentimentScore(paragraph),
          preview: paragraph.substring(0, 100) + '...'
        }));
    }

    // Calculate confidence based on word count and clear indicators
    sentiment.confidence = this.calculateSentimentConfidence(
      overallSentiment,
      textData.words.length
    );

    return sentiment;
  }

  /**
   * Calculate multiple readability scores
   */
  async calculateReadabilityScores(textData) {
    const scores = {};

    try {
      const avgSentenceLength = textData.sentences.length > 0
        ? textData.words.length / textData.sentences.length
        : 0;

      const avgSyllablesPerWord = this.calculateAverageSyllables(textData.words);
      const complexWords = this.countComplexWords(textData.words);
      const complexWordsPercentage = (complexWords / textData.words.length) * 100;

      // Flesch Reading Ease (0-100, higher = easier)
      scores.fleschReadingEase = Math.max(0, Math.min(100,
        this.readabilityConstants.flesch.a -
        (this.readabilityConstants.flesch.b * avgSentenceLength) -
        (this.readabilityConstants.flesch.c * avgSyllablesPerWord)
      ));

      // Flesch-Kincaid Grade Level
      scores.fleschKincaidGrade = Math.max(0,
        (this.readabilityConstants.fleschKincaid.a * avgSentenceLength) +
        (this.readabilityConstants.fleschKincaid.b * avgSyllablesPerWord) -
        this.readabilityConstants.fleschKincaid.c
      );

      // Gunning Fog Index
      scores.gunningFog = Math.max(0,
        this.readabilityConstants.gunningFog.multiplier *
        (avgSentenceLength + complexWordsPercentage)
      );

      // SMOG (Simplified Measure of Gobbledygook)
      scores.smog = this.calculateSMOG(textData.sentences, complexWords);

      // Automated Readability Index (ARI)
      scores.ari = this.calculateARI(textData);

      // Readability interpretation
      scores.interpretation = {
        level: this.interpretReadabilityLevel(scores.fleschReadingEase),
        grade: Math.round(scores.fleschKincaidGrade),
        recommendations: this.generateReadabilityRecommendations(scores)
      };

    } catch (error) {
      logger.error('Readability calculation failed:', error);
      scores.error = 'Failed to calculate readability scores';
    }

    return scores;
  }

  /**
   * Detect emotional tones in content
   */
  async detectEmotionalTones(textData) {
    const tones = {};
    const text = textData.allText.toLowerCase();

    // Calculate scores for each emotional tone
    for (const [tone, indicators] of Object.entries(this.emotionalTones)) {
      let score = 0;
      const foundWords = [];

      for (const indicator of indicators) {
        const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
        const matches = text.match(regex) || [];
        score += matches.length;
        if (matches.length > 0) {
          foundWords.push(indicator);
        }
      }

      // Normalize score by text length
      const normalizedScore = (score / textData.words.length) * 1000;

      tones[tone] = {
        score: normalizedScore,
        intensity: this.categorizeToneIntensity(normalizedScore),
        indicators: foundWords,
        confidence: Math.min(score / 5, 1) // Confidence based on number of indicators
      };
    }

    // Determine dominant tone
    const dominantTone = Object.entries(tones)
      .sort((a, b) => b[1].score - a[1].score)[0];

    return {
      tones,
      dominant: dominantTone ? {
        tone: dominantTone[0],
        score: dominantTone[1].score,
        confidence: dominantTone[1].confidence
      } : null,
      summary: this.generateToneSummary(tones)
    };
  }

  /**
   * Identify and score power words
   */
  async identifyPowerWords(textData) {
    const powerWordAnalysis = {
      byCategory: {},
      overall: { count: 0, density: 0, impact: 0 },
      topWords: [],
      recommendations: []
    };

    const text = textData.allText.toLowerCase();

    // Analyze each power word category
    for (const [category, words] of Object.entries(this.powerWords)) {
      const categoryData = {
        words: [],
        count: 0,
        density: 0,
        impact: 0
      };

      for (const word of words) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = text.match(regex) || [];

        if (matches.length > 0) {
          categoryData.words.push({
            word,
            count: matches.length,
            impact: this.calculateWordImpact(word, category)
          });
          categoryData.count += matches.length;
        }
      }

      // Calculate category metrics
      categoryData.density = (categoryData.count / textData.words.length) * 100;
      categoryData.impact = categoryData.words.reduce((sum, w) => sum + w.impact, 0);

      powerWordAnalysis.byCategory[category] = categoryData;
    }

    // Calculate overall metrics
    powerWordAnalysis.overall.count = Object.values(powerWordAnalysis.byCategory)
      .reduce((sum, cat) => sum + cat.count, 0);

    powerWordAnalysis.overall.density =
      (powerWordAnalysis.overall.count / textData.words.length) * 100;

    powerWordAnalysis.overall.impact = Object.values(powerWordAnalysis.byCategory)
      .reduce((sum, cat) => sum + cat.impact, 0);

    // Get top power words across all categories
    powerWordAnalysis.topWords = Object.values(powerWordAnalysis.byCategory)
      .flatMap(cat => cat.words)
      .sort((a, b) => (b.count * b.impact) - (a.count * a.impact))
      .slice(0, 20);

    // Generate recommendations
    powerWordAnalysis.recommendations = this.generatePowerWordRecommendations(
      powerWordAnalysis
    );

    return powerWordAnalysis;
  }

  /**
   * Extract topics using TF-IDF and keyword clustering
   */
  async extractTopics(textData) {
    const topics = {
      primary: [],
      secondary: [],
      keywords: [],
      entities: [],
      categories: []
    };

    try {
      // Calculate TF-IDF scores
      const tfidfScores = this.calculateTFIDF(textData.words);

      // Extract primary topics (high TF-IDF keywords)
      topics.primary = tfidfScores
        .filter(item => item.score > 0.1)
        .slice(0, 10)
        .map(item => ({
          topic: item.word,
          relevance: item.score,
          frequency: item.frequency,
          type: 'keyword'
        }));

      // Extract secondary topics (medium TF-IDF keywords)
      topics.secondary = tfidfScores
        .filter(item => item.score > 0.05 && item.score <= 0.1)
        .slice(0, 15)
        .map(item => ({
          topic: item.word,
          relevance: item.score,
          frequency: item.frequency,
          type: 'keyword'
        }));

      // Extract named entities (simplified NER)
      topics.entities = this.extractNamedEntities(textData.allText);

      // Categorize content type
      topics.categories = this.categorizeContent(textData);

      // Extract keyword phrases (2-3 word combinations)
      topics.keywords = this.extractKeywordPhrases(textData.allText);

    } catch (error) {
      logger.error('Topic extraction failed:', error);
      topics.error = 'Failed to extract topics';
    }

    return topics;
  }

  /**
   * Prepare text data for analysis
   */
  prepareTextData(content) {
    // Combine all text content
    const allTextParts = [];

    if (content.allText && Array.isArray(content.allText)) {
      allTextParts.push(...content.allText);
    }

    if (content.allHeadings) {
      allTextParts.push(...content.allHeadings.map(h => h.text || ''));
    }

    const allText = allTextParts.join(' ').toLowerCase();

    // Clean and tokenize
    const cleanText = allText.replace(/[^\w\s\.\!\?]/g, ' ').replace(/\s+/g, ' ');
    const sentences = cleanText.split(/[\.!\?]+/).filter(s => s.trim().length > 10);
    const words = cleanText.split(/\s+/)
      .filter(word => word.length > 2 && !this.isStopWord(word));

    const paragraphs = content.allText || [];

    return {
      allText,
      cleanText,
      sentences,
      words,
      paragraphs,
      headings: content.allHeadings || []
    };
  }

  /**
   * Calculate TF-IDF scores for words
   */
  calculateTFIDF(words) {
    const termFreq = {};
    const totalWords = words.length;

    // Calculate term frequency
    words.forEach(word => {
      termFreq[word] = (termFreq[word] || 0) + 1;
    });

    // Simple IDF calculation (in real implementation, use document corpus)
    const idfBase = Math.log(totalWords);

    return Object.entries(termFreq)
      .map(([word, freq]) => {
        const tf = freq / totalWords;
        const idf = idfBase - Math.log(freq);
        return {
          word,
          frequency: freq,
          score: tf * idf
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate sentiment score for text
   */
  calculateSentimentScore(text) {
    const words = text.toLowerCase().split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;
    const positiveWords = [];
    const negativeWords = [];

    words.forEach(word => {
      if (this.sentimentWords.positive.includes(word)) {
        positiveScore++;
        positiveWords.push(word);
      } else if (this.sentimentWords.negative.includes(word)) {
        negativeScore++;
        negativeWords.push(word);
      }
    });

    const totalSentimentWords = positiveScore + negativeScore;
    const score = totalSentimentWords > 0
      ? (positiveScore - negativeScore) / totalSentimentWords
      : 0;

    let label = 'neutral';
    if (score > 0.1) label = 'positive';
    else if (score < -0.1) label = 'negative';

    return {
      score: Math.round(score * 100) / 100,
      label,
      positiveWords,
      negativeWords,
      confidence: Math.min(totalSentimentWords / 10, 1)
    };
  }

  /**
   * Calculate average syllables per word
   */
  calculateAverageSyllables(words) {
    if (words.length === 0) return 0;

    const totalSyllables = words.reduce((sum, word) => {
      return sum + this.countSyllables(word);
    }, 0);

    return totalSyllables / words.length;
  }

  /**
   * Count syllables in a word (simplified)
   */
  countSyllables(word) {
    if (word.length <= 3) return 1;

    word = word.toLowerCase();
    let syllables = 0;
    let previousVowel = false;

    for (let i = 0; i < word.length; i++) {
      const isVowel = 'aeiouy'.includes(word[i]);
      if (isVowel && !previousVowel) {
        syllables++;
      }
      previousVowel = isVowel;
    }

    // Handle silent e
    if (word.endsWith('e')) {
      syllables--;
    }

    return Math.max(1, syllables);
  }

  /**
   * Count complex words (3+ syllables)
   */
  countComplexWords(words) {
    return words.filter(word => this.countSyllables(word) >= 3).length;
  }

  /**
   * Calculate SMOG readability index
   */
  calculateSMOG(sentences, complexWords) {
    if (sentences.length < 30) return 0;

    const polysyllableCount = complexWords;
    return 1.043 * Math.sqrt(polysyllableCount * (30 / sentences.length)) + 3.1291;
  }

  /**
   * Calculate ARI (Automated Readability Index)
   */
  calculateARI(textData) {
    if (textData.sentences.length === 0) return 0;

    const avgWordsPerSentence = textData.words.length / textData.sentences.length;
    const avgCharsPerWord = textData.words.reduce((sum, word) => sum + word.length, 0) / textData.words.length;

    return 4.71 * avgCharsPerWord + 0.5 * avgWordsPerSentence - 21.43;
  }

  /**
   * Extract named entities (simplified)
   */
  extractNamedEntities(text) {
    const entities = [];

    // Capitalize words (potential proper nouns)
    const properNounRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    const matches = text.match(properNounRegex) || [];

    // Filter and categorize
    const entityFreq = {};
    matches.forEach(match => {
      if (match.length > 2) {
        entityFreq[match] = (entityFreq[match] || 0) + 1;
      }
    });

    return Object.entries(entityFreq)
      .filter(([entity, freq]) => freq > 1) // Appear more than once
      .map(([entity, freq]) => ({
        entity,
        frequency: freq,
        type: this.classifyEntityType(entity),
        confidence: Math.min(freq / 5, 1)
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);
  }

  /**
   * Extract keyword phrases (n-grams)
   */
  extractKeywordPhrases(text) {
    const phrases = [];
    const words = text.toLowerCase().split(/\s+/)
      .filter(word => word.length > 2 && !this.isStopWord(word));

    // Extract 2-grams and 3-grams
    for (let n = 2; n <= 3; n++) {
      const ngramFreq = {};

      for (let i = 0; i <= words.length - n; i++) {
        const ngram = words.slice(i, i + n).join(' ');
        ngramFreq[ngram] = (ngramFreq[ngram] || 0) + 1;
      }

      // Add frequent n-grams
      Object.entries(ngramFreq)
        .filter(([phrase, freq]) => freq > 1)
        .forEach(([phrase, freq]) => {
          phrases.push({
            phrase,
            frequency: freq,
            length: n,
            score: freq * n // Longer phrases get higher scores
          });
        });
    }

    return phrases
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);
  }

  /**
   * Check if word is a stop word
   */
  isStopWord(word) {
    const stopWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we',
      'they', 'them', 'their', 'there', 'here', 'where', 'when', 'what',
      'how', 'why', 'who', 'which', 'can', 'may', 'might', 'must', 'shall'
    ];

    return stopWords.includes(word.toLowerCase());
  }

  /**
   * Calculate overall effectiveness score
   */
  calculateEffectivenessScore(analysis) {
    let score = 0;
    let maxScore = 0;

    // Hook effectiveness (30% weight)
    if (analysis.hooks) {
      score += (analysis.hooks.effectiveness?.overallScore || 0) * 0.3;
      maxScore += 30;
    }

    // Sentiment positivity (20% weight)
    if (analysis.sentiment) {
      const sentimentScore = Math.max(0, (analysis.sentiment.overall.score + 1) * 50);
      score += sentimentScore * 0.2;
      maxScore += 20;
    }

    // Readability (20% weight)
    if (analysis.readability) {
      const readabilityScore = Math.min(100, analysis.readability.fleschReadingEase || 0);
      score += readabilityScore * 0.2;
      maxScore += 20;
    }

    // Power word impact (15% weight)
    if (analysis.powerWords) {
      const powerScore = Math.min(100, (analysis.powerWords.overall.impact || 0) * 10);
      score += powerScore * 0.15;
      maxScore += 15;
    }

    // Emotional engagement (15% weight)
    if (analysis.emotionalTones) {
      const toneScore = analysis.emotionalTones.dominant?.score || 0;
      score += Math.min(100, toneScore * 100) * 0.15;
      maxScore += 15;
    }

    return {
      score: Math.round(score),
      maxScore,
      percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
      grade: this.calculateGrade(score, maxScore),
      recommendations: this.generateEffectivenessRecommendations(analysis)
    };
  }

  /**
   * Helper methods for calculations and classifications
   */

  getContextAround(text, index, length) {
    const start = Math.max(0, index - length);
    const end = Math.min(text.length, index + length);
    return text.substring(start, end).trim();
  }

  calculateHookConfidence(text, type) {
    // Simple confidence calculation based on text length and type
    let confidence = 0.5;

    if (text.length > 30) confidence += 0.1;
    if (text.length > 50) confidence += 0.1;
    if (type === 'curiosity') confidence += 0.1;
    if (type === 'social_proof') confidence += 0.2;

    return Math.min(1, confidence);
  }

  classifyHookTypes(text) {
    const types = [];
    const textLower = text.toLowerCase();

    for (const [type, patterns] of Object.entries(this.hookPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(textLower)) {
          types.push(type);
          break;
        }
      }
    }

    return types;
  }

  scoreHeadlineEffectiveness(headline) {
    let score = 50; // Base score

    // Length optimization (6-12 words is ideal)
    const wordCount = headline.split(' ').length;
    if (wordCount >= 6 && wordCount <= 12) score += 20;
    else if (wordCount >= 4 && wordCount <= 15) score += 10;

    // Power words
    const headlineLower = headline.toLowerCase();
    Object.values(this.powerWords).flat().forEach(word => {
      if (headlineLower.includes(word)) score += 5;
    });

    // Numbers
    if (/\d+/.test(headline)) score += 10;

    // Questions
    if (headline.includes('?')) score += 10;

    return Math.min(100, score);
  }

  calculateTypeEffectiveness(hooks) {
    if (!hooks || hooks.length === 0) return 0;

    const avgConfidence = hooks.reduce((sum, hook) => sum + hook.confidence, 0) / hooks.length;
    const countScore = Math.min(hooks.length / 5, 1); // Max score at 5+ hooks

    return Math.round((avgConfidence * 0.7 + countScore * 0.3) * 100);
  }

  calculateOverallHookScore(hooks) {
    const scores = [
      hooks.effectiveness.curiosityScore || 0,
      hooks.effectiveness.socialProofScore || 0,
      hooks.effectiveness.urgencyScore || 0,
      hooks.effectiveness.benefitScore || 0,
      hooks.effectiveness.questionScore || 0
    ];

    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  deduplicateHooks(hooks) {
    const seen = new Set();
    return hooks.filter(hook => {
      const normalized = hook.text.toLowerCase().trim();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }

  calculateSentimentConfidence(sentiment, wordCount) {
    const indicatorCount = sentiment.positiveWords.length + sentiment.negativeWords.length;
    const densityScore = Math.min(indicatorCount / wordCount * 100, 1);
    const absoluteScore = Math.abs(sentiment.score);

    return Math.min(1, (densityScore * 0.5) + (absoluteScore * 0.5));
  }

  interpretReadabilityLevel(fleschScore) {
    if (fleschScore >= 90) return 'Very Easy';
    if (fleschScore >= 80) return 'Easy';
    if (fleschScore >= 70) return 'Fairly Easy';
    if (fleschScore >= 60) return 'Standard';
    if (fleschScore >= 50) return 'Fairly Difficult';
    if (fleschScore >= 30) return 'Difficult';
    return 'Very Difficult';
  }

  generateReadabilityRecommendations(scores) {
    const recommendations = [];

    if (scores.fleschReadingEase < 60) {
      recommendations.push('Consider using shorter sentences to improve readability');
    }
    if (scores.fleschKincaidGrade > 12) {
      recommendations.push('Content may be too complex for general audience');
    }
    if (scores.gunningFog > 15) {
      recommendations.push('Reduce complex words to make content more accessible');
    }

    return recommendations;
  }

  categorizeToneIntensity(score) {
    if (score > 10) return 'very high';
    if (score > 5) return 'high';
    if (score > 2) return 'moderate';
    if (score > 0.5) return 'low';
    return 'very low';
  }

  generateToneSummary(tones) {
    const dominantTones = Object.entries(tones)
      .filter(([_, data]) => data.score > 1)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 3);

    if (dominantTones.length === 0) {
      return 'Content has a neutral emotional tone';
    }

    const toneNames = dominantTones.map(([tone, _]) => tone);
    return `Content primarily conveys ${toneNames.join(', ')} tones`;
  }

  calculateWordImpact(word, category) {
    // Weight different categories
    const categoryWeights = {
      urgency: 1.5,
      scarcity: 1.4,
      emotion: 1.2,
      trust: 1.3,
      benefit: 1.1
    };

    return categoryWeights[category] || 1.0;
  }

  generatePowerWordRecommendations(analysis) {
    const recommendations = [];

    if (analysis.overall.density < 1) {
      recommendations.push('Consider adding more power words to increase emotional impact');
    }

    const weakCategories = Object.entries(analysis.byCategory)
      .filter(([_, data]) => data.count === 0)
      .map(([category, _]) => category);

    if (weakCategories.length > 0) {
      recommendations.push(`Consider adding ${weakCategories.join(', ')} words to strengthen appeal`);
    }

    return recommendations;
  }

  categorizeContent(textData) {
    const categories = [];
    const text = textData.allText.toLowerCase();

    // E-commerce indicators
    if (/\b(buy|purchase|shop|cart|checkout|order)\b/.test(text)) {
      categories.push({ category: 'ecommerce', confidence: 0.8 });
    }

    // Service business indicators
    if (/\b(service|consultation|appointment|book|schedule)\b/.test(text)) {
      categories.push({ category: 'service', confidence: 0.7 });
    }

    // SaaS indicators
    if (/\b(software|platform|dashboard|api|integration)\b/.test(text)) {
      categories.push({ category: 'saas', confidence: 0.6 });
    }

    // Content/Blog indicators
    if (/\b(article|blog|guide|tutorial|tips)\b/.test(text)) {
      categories.push({ category: 'content', confidence: 0.5 });
    }

    return categories.sort((a, b) => b.confidence - a.confidence);
  }

  classifyEntityType(entity) {
    // Simple entity type classification
    if (/Inc|LLC|Corp|Company|Ltd/.test(entity)) return 'organization';
    if (/\d/.test(entity)) return 'mixed';
    if (entity.length > 15) return 'phrase';
    return 'name';
  }

  calculateGrade(score, maxScore) {
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  generateEffectivenessRecommendations(analysis) {
    const recommendations = [];

    if (analysis.hooks?.effectiveness?.overallScore < 50) {
      recommendations.push('Add more compelling hooks and headlines to capture attention');
    }

    if (analysis.sentiment?.overall.score < 0) {
      recommendations.push('Consider using more positive language to improve sentiment');
    }

    if (analysis.readability?.fleschReadingEase < 60) {
      recommendations.push('Simplify language and sentence structure for better readability');
    }

    if (analysis.powerWords?.overall.density < 1) {
      recommendations.push('Incorporate more power words to increase emotional impact');
    }

    return recommendations;
  }

  /**
   * Clear analysis cache
   */
  clearCache() {
    this.analysisCache.clear();
    logger.info('Content intelligence cache cleared');
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      cacheSize: this.analysisCache.size,
      isInitialized: this.initialized,
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let intelligenceInstance = null;

/**
 * Get singleton content intelligence instance
 */
export function getContentIntelligence() {
  if (!intelligenceInstance) {
    intelligenceInstance = new ContentIntelligenceService();
  }
  return intelligenceInstance;
}

/**
 * Analyze content function
 */
export async function analyzeContent(content, options = {}) {
  const intelligence = getContentIntelligence();
  return await intelligence.analyzeContent(content, options);
}

export default getContentIntelligence;