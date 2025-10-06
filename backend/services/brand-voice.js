/**
 * Brand Voice Profile Generator for Ads Autopilot AI SaaS
 * Advanced brand personality detection, tone analysis, and voice profiling
 *
 * Features:
 * - Brand personality detection (Big Five + brand archetypes)
 * - Tone of voice profiling and consistency scoring
 * - Vocabulary analysis and style guide generation
 * - Competitor voice comparison and differentiation
 * - Voice consistency monitoring across content
 * - Brand positioning and messaging framework
 */

import logger from './logger.js';
import { getContentIntelligence } from './content-intelligence.js';

/**
 * Brand Voice Profile Generator Service
 */
export class BrandVoiceService {
  constructor() {
    this.initialized = false;
    this.contentIntelligence = null;

    // Brand archetypes with characteristics
    this.brandArchetypes = {
      innocent: {
        traits: ['honest', 'pure', 'simple', 'optimistic', 'wholesome'],
        toneIndicators: ['happy', 'pure', 'simple', 'clean', 'fresh', 'honest'],
        vocabulary: ['pure', 'natural', 'simple', 'clean', 'fresh', 'wholesome'],
        messageThemes: ['purity', 'simplicity', 'goodness', 'optimism']
      },
      explorer: {
        traits: ['adventurous', 'free', 'pioneering', 'brave', 'individualistic'],
        toneIndicators: ['adventure', 'freedom', 'explore', 'discover', 'journey'],
        vocabulary: ['adventure', 'explore', 'discover', 'freedom', 'journey', 'pioneer'],
        messageThemes: ['freedom', 'exploration', 'adventure', 'discovery']
      },
      sage: {
        traits: ['wise', 'knowledgeable', 'thoughtful', 'expert', 'analytical'],
        toneIndicators: ['wisdom', 'knowledge', 'insight', 'understanding', 'expertise'],
        vocabulary: ['wisdom', 'insight', 'knowledge', 'understanding', 'expertise', 'analysis'],
        messageThemes: ['wisdom', 'knowledge', 'understanding', 'insight']
      },
      hero: {
        traits: ['courageous', 'determined', 'honorable', 'inspiring', 'triumphant'],
        toneIndicators: ['courage', 'determination', 'victory', 'triumph', 'overcome'],
        vocabulary: ['courage', 'strength', 'victory', 'triumph', 'overcome', 'achieve'],
        messageThemes: ['courage', 'triumph', 'achievement', 'overcoming challenges']
      },
      outlaw: {
        traits: ['rebellious', 'revolutionary', 'wild', 'disruptive', 'free'],
        toneIndicators: ['rebel', 'revolution', 'disrupt', 'break', 'challenge'],
        vocabulary: ['rebel', 'disrupt', 'revolution', 'break', 'challenge', 'unconventional'],
        messageThemes: ['rebellion', 'disruption', 'breaking rules', 'revolution']
      },
      magician: {
        traits: ['visionary', 'imaginative', 'inventive', 'transformative', 'charismatic'],
        toneIndicators: ['magic', 'transform', 'create', 'imagine', 'vision'],
        vocabulary: ['magic', 'transform', 'create', 'imagine', 'vision', 'revolutionary'],
        messageThemes: ['transformation', 'vision', 'magic', 'creation']
      },
      regular: {
        traits: ['down-to-earth', 'friendly', 'genuine', 'practical', 'humble'],
        toneIndicators: ['real', 'genuine', 'practical', 'everyday', 'normal'],
        vocabulary: ['real', 'genuine', 'practical', 'everyday', 'normal', 'down-to-earth'],
        messageThemes: ['authenticity', 'relatability', 'practicality', 'normalcy']
      },
      lover: {
        traits: ['passionate', 'romantic', 'committed', 'intimate', 'warm'],
        toneIndicators: ['love', 'passion', 'beautiful', 'romantic', 'intimate'],
        vocabulary: ['love', 'passion', 'beautiful', 'romantic', 'intimate', 'cherish'],
        messageThemes: ['love', 'passion', 'beauty', 'relationships']
      },
      jester: {
        traits: ['fun', 'humorous', 'irreverent', 'entertaining', 'lighthearted'],
        toneIndicators: ['fun', 'funny', 'humor', 'laugh', 'entertaining'],
        vocabulary: ['fun', 'funny', 'humor', 'laugh', 'entertaining', 'playful'],
        messageThemes: ['fun', 'humor', 'entertainment', 'joy']
      },
      caregiver: {
        traits: ['caring', 'nurturing', 'protective', 'generous', 'compassionate'],
        toneIndicators: ['care', 'nurture', 'protect', 'help', 'support'],
        vocabulary: ['care', 'nurture', 'protect', 'help', 'support', 'compassion'],
        messageThemes: ['care', 'nurturing', 'protection', 'support']
      },
      creator: {
        traits: ['creative', 'artistic', 'imaginative', 'original', 'expressive'],
        toneIndicators: ['create', 'design', 'artistic', 'original', 'innovative'],
        vocabulary: ['create', 'design', 'artistic', 'original', 'innovative', 'craft'],
        messageThemes: ['creativity', 'artistry', 'originality', 'self-expression']
      },
      ruler: {
        traits: ['authoritative', 'responsible', 'organized', 'stable', 'prestigious'],
        toneIndicators: ['leadership', 'authority', 'control', 'excellence', 'prestige'],
        vocabulary: ['leadership', 'authority', 'control', 'excellence', 'prestige', 'power'],
        messageThemes: ['leadership', 'authority', 'excellence', 'control']
      }
    };

    // Tone dimensions for profiling
    this.toneDimensions = {
      formality: {
        formal: ['professional', 'business', 'corporate', 'official', 'proper'],
        casual: ['friendly', 'relaxed', 'informal', 'easy-going', 'conversational']
      },
      enthusiasm: {
        excited: ['amazing', 'incredible', 'fantastic', 'awesome', 'thrilled'],
        calm: ['steady', 'composed', 'balanced', 'measured', 'thoughtful']
      },
      empathy: {
        warm: ['caring', 'understanding', 'supportive', 'compassionate', 'kind'],
        analytical: ['logical', 'objective', 'factual', 'systematic', 'precise']
      },
      confidence: {
        confident: ['strong', 'powerful', 'definitive', 'certain', 'bold'],
        humble: ['modest', 'gentle', 'considerate', 'respectful', 'careful']
      }
    };

    // Voice consistency metrics
    this.consistencyMetrics = {
      vocabulary: 0.8, // Same words usage consistency
      sentiment: 0.7,  // Emotional tone consistency
      formality: 0.9,  // Formality level consistency
      structure: 0.6   // Sentence structure consistency
    };

    // Cache for brand profiles
    this.profileCache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1 hour
  }

  /**
   * Initialize the brand voice service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      this.contentIntelligence = getContentIntelligence();
      await this.contentIntelligence.initialize();

      this.initialized = true;
      logger.info('Brand voice service initialized');
    } catch (error) {
      logger.error('Failed to initialize brand voice service:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive brand voice profile
   * @param {object} content - Content from website scraper
   * @param {object} options - Analysis options
   * @returns {object} Brand voice profile
   */
  async generateBrandProfile(content, options = {}) {
    const {
      includeArchetype = true,
      includeToneProfile = true,
      includeVocabulary = true,
      includeConsistency = true,
      includeGuidelines = true,
      competitorData = null,
      cacheKey = null
    } = options;

    await this.initialize();

    try {
      // Check cache
      if (cacheKey && this.profileCache.has(cacheKey)) {
        const cached = this.profileCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          logger.info('Using cached brand profile');
          return cached.data;
        }
      }

      const startTime = performance.now();

      // Get content intelligence analysis
      const contentAnalysis = await this.contentIntelligence.analyzeContent(content, {
        includeHooks: true,
        includeSentiment: true,
        includeTones: true,
        includePowerWords: true,
        includeTopics: true
      });

      const profile = {
        metadata: {
          analyzedAt: new Date().toISOString(),
          sourcePages: content.metadata?.pagesScraped || 1,
          processingTime: 0
        }
      };

      // Generate different profile components
      if (includeArchetype) {
        profile.archetype = await this.detectBrandArchetype(content, contentAnalysis);
      }

      if (includeToneProfile) {
        profile.toneProfile = await this.analyzeToneProfile(content, contentAnalysis);
      }

      if (includeVocabulary) {
        profile.vocabulary = await this.analyzeVocabulary(content, contentAnalysis);
      }

      if (includeConsistency) {
        profile.consistency = await this.analyzeConsistency(content, contentAnalysis);
      }

      if (includeGuidelines) {
        profile.guidelines = await this.generateStyleGuide(profile);
      }

      // Competitor comparison if provided
      if (competitorData) {
        profile.competitorAnalysis = await this.compareWithCompetitors(profile, competitorData);
      }

      // Overall brand strength score
      profile.brandStrength = this.calculateBrandStrength(profile);

      // Performance tracking
      profile.metadata.processingTime = Math.round(performance.now() - startTime);

      // Cache result
      if (cacheKey) {
        this.profileCache.set(cacheKey, {
          data: profile,
          timestamp: Date.now()
        });
      }

      logger.info(`Brand profile generated in ${profile.metadata.processingTime}ms`);
      return profile;

    } catch (error) {
      logger.error('Brand profile generation failed:', error);
      throw error;
    }
  }

  /**
   * Detect brand archetype based on content analysis
   */
  async detectBrandArchetype(content, contentAnalysis) {
    const archetypeScores = {};

    // Score each archetype based on content
    for (const [archetype, data] of Object.entries(this.brandArchetypes)) {
      let score = 0;

      // Check tone indicators in content
      const contentText = this.extractAllText(content).toLowerCase();

      data.toneIndicators.forEach(indicator => {
        const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
        const matches = contentText.match(regex) || [];
        score += matches.length * 2;
      });

      // Check vocabulary usage
      data.vocabulary.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = contentText.match(regex) || [];
        score += matches.length * 1.5;
      });

      // Boost score based on emotional tones
      if (contentAnalysis.emotionalTones?.tones) {
        Object.keys(contentAnalysis.emotionalTones.tones).forEach(tone => {
          if (data.traits.includes(tone)) {
            score += contentAnalysis.emotionalTones.tones[tone].score * 10;
          }
        });
      }

      // Normalize score by content length
      const normalizedScore = score / Math.sqrt(contentText.length / 1000);
      archetypeScores[archetype] = normalizedScore;
    }

    // Find primary and secondary archetypes
    const sortedArchetypes = Object.entries(archetypeScores)
      .sort((a, b) => b[1] - a[1]);

    const primary = sortedArchetypes[0];
    const secondary = sortedArchetypes[1];

    return {
      primary: {
        archetype: primary[0],
        score: primary[1],
        traits: this.brandArchetypes[primary[0]].traits,
        confidence: this.calculateArchetypeConfidence(primary[1], sortedArchetypes)
      },
      secondary: secondary ? {
        archetype: secondary[0],
        score: secondary[1],
        traits: this.brandArchetypes[secondary[0]].traits,
        confidence: this.calculateArchetypeConfidence(secondary[1], sortedArchetypes)
      } : null,
      allScores: archetypeScores,
      recommendations: this.generateArchetypeRecommendations(primary[0], secondary?.[0])
    };
  }

  /**
   * Analyze tone profile across dimensions
   */
  async analyzeToneProfile(content, contentAnalysis) {
    const toneProfile = {
      dimensions: {},
      overall: {},
      consistency: {},
      recommendations: []
    };

    const contentText = this.extractAllText(content).toLowerCase();

    // Analyze each tone dimension
    for (const [dimension, polarities] of Object.entries(this.toneDimensions)) {
      const dimensionScores = {};

      for (const [polarity, indicators] of Object.entries(polarities)) {
        let score = 0;

        indicators.forEach(indicator => {
          const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
          const matches = contentText.match(regex) || [];
          score += matches.length;
        });

        dimensionScores[polarity] = score;
      }

      // Calculate dimension positioning
      const totalScore = Object.values(dimensionScores).reduce((sum, score) => sum + score, 0);
      const positioning = this.calculateDimensionPositioning(dimensionScores, totalScore);

      toneProfile.dimensions[dimension] = {
        scores: dimensionScores,
        positioning: positioning.position,
        strength: positioning.strength,
        confidence: totalScore > 0 ? Math.min(totalScore / 10, 1) : 0
      };
    }

    // Overall tone summary
    toneProfile.overall = {
      dominantTrait: this.getDominantTrait(toneProfile.dimensions),
      personalityType: this.classifyPersonalityType(toneProfile.dimensions),
      approachability: this.calculateApproachability(toneProfile.dimensions),
      authority: this.calculateAuthority(toneProfile.dimensions)
    };

    // Tone consistency analysis
    if (content.allText && content.allText.length > 1) {
      toneProfile.consistency = this.analyzeToneConsistency(content.allText, toneProfile.dimensions);
    }

    // Generate recommendations
    toneProfile.recommendations = this.generateToneRecommendations(toneProfile);

    return toneProfile;
  }

  /**
   * Analyze vocabulary patterns and style
   */
  async analyzeVocabulary(content, contentAnalysis) {
    const vocabulary = {
      style: {},
      complexity: {},
      patterns: {},
      uniqueness: {},
      recommendations: []
    };

    const contentText = this.extractAllText(content);
    const words = contentText.toLowerCase().split(/\s+/)
      .filter(word => word.length > 2 && !this.isStopWord(word));

    // Vocabulary style analysis
    vocabulary.style = {
      averageWordLength: this.calculateAverageWordLength(words),
      lexicalDiversity: this.calculateLexicalDiversity(words),
      technicalTerms: this.identifyTechnicalTerms(words),
      emotionalWords: this.countEmotionalWords(words),
      actionWords: this.countActionWords(words)
    };

    // Complexity analysis
    vocabulary.complexity = {
      complexWordRatio: this.calculateComplexWordRatio(words),
      syllableDistribution: this.analyzeSyllableDistribution(words),
      readingLevel: contentAnalysis.readability?.interpretation?.level || 'Unknown',
      industryJargon: this.detectIndustryJargon(words)
    };

    // Pattern analysis
    vocabulary.patterns = {
      commonPhrases: this.extractCommonPhrases(contentText),
      sentenceStarters: this.analyzeSentenceStarters(content.allText || []),
      questionPatterns: this.analyzeQuestionPatterns(contentText),
      callToActionStyle: this.analyzeCTAStyle(content.ctas || [])
    };

    // Uniqueness scoring
    vocabulary.uniqueness = {
      distinctiveWords: this.findDistinctiveWords(words),
      brandSpecificTerms: this.identifyBrandTerms(words, content),
      industryDifferentiation: this.scoreIndustryDifferentiation(words)
    };

    // Generate recommendations
    vocabulary.recommendations = this.generateVocabularyRecommendations(vocabulary);

    return vocabulary;
  }

  /**
   * Analyze brand voice consistency across content
   */
  async analyzeConsistency(content, contentAnalysis) {
    const consistency = {
      overall: {},
      bySection: {},
      metrics: {},
      issues: [],
      improvements: []
    };

    if (!content.allText || content.allText.length < 2) {
      return {
        overall: { score: 100, note: 'Insufficient content for consistency analysis' },
        bySection: {},
        metrics: {},
        issues: [],
        improvements: []
      };
    }

    // Analyze consistency across different content sections
    const sections = this.groupContentSections(content);

    for (const [sectionType, sectionContent] of Object.entries(sections)) {
      if (sectionContent.length > 0) {
        consistency.bySection[sectionType] = await this.analyzeSectionConsistency(sectionContent);
      }
    }

    // Calculate overall consistency metrics
    consistency.metrics = {
      vocabularyConsistency: this.calculateVocabularyConsistency(sections),
      toneConsistency: this.calculateToneConsistency(sections),
      formalityConsistency: this.calculateFormalityConsistency(sections),
      sentimentConsistency: this.calculateSentimentConsistency(sections)
    };

    // Overall consistency score
    consistency.overall = {
      score: this.calculateOverallConsistencyScore(consistency.metrics),
      grade: this.getConsistencyGrade(consistency.metrics),
      strengths: this.identifyConsistencyStrengths(consistency.metrics),
      weaknesses: this.identifyConsistencyWeaknesses(consistency.metrics)
    };

    // Identify specific issues
    consistency.issues = this.identifyConsistencyIssues(consistency.bySection, consistency.metrics);

    // Generate improvement suggestions
    consistency.improvements = this.generateConsistencyImprovements(consistency);

    return consistency;
  }

  /**
   * Generate comprehensive style guide
   */
  async generateStyleGuide(profile) {
    const guide = {
      brandPersonality: {},
      toneGuidelines: {},
      vocabularyRules: {},
      messagingFramework: {},
      dosDonts: {},
      examples: {}
    };

    // Brand personality section
    if (profile.archetype) {
      guide.brandPersonality = {
        primaryArchetype: profile.archetype.primary.archetype,
        coreTraits: profile.archetype.primary.traits,
        personality: this.generatePersonalityDescription(profile.archetype.primary.archetype),
        voiceCharacteristics: this.getVoiceCharacteristics(profile.archetype.primary.archetype)
      };
    }

    // Tone guidelines
    if (profile.toneProfile) {
      guide.toneGuidelines = {
        preferredTone: profile.toneProfile.overall.personalityType,
        dimensions: this.formatToneDimensions(profile.toneProfile.dimensions),
        situationalTones: this.generateSituationalToneGuide(profile.toneProfile),
        toneAdjustments: this.generateToneAdjustments(profile.toneProfile)
      };
    }

    // Vocabulary rules
    if (profile.vocabulary) {
      guide.vocabularyRules = {
        preferredWords: this.generatePreferredWordList(profile.vocabulary),
        avoidWords: this.generateWordsToAvoid(profile.vocabulary),
        industryTerms: this.generateIndustryTermGuidance(profile.vocabulary),
        complexityLevel: this.getComplexityGuidance(profile.vocabulary)
      };
    }

    // Messaging framework
    guide.messagingFramework = this.createMessagingFramework(profile);

    // Do's and Don'ts
    guide.dosDonts = this.generateDosDonts(profile);

    // Examples
    guide.examples = this.generateStyleExamples(profile);

    return guide;
  }

  /**
   * Compare brand voice with competitors
   */
  async compareWithCompetitors(brandProfile, competitorData) {
    const comparison = {
      positioning: {},
      differentiation: {},
      opportunities: [],
      threats: [],
      recommendations: []
    };

    // Analyze positioning relative to competitors
    comparison.positioning = {
      archetypeComparison: this.compareArchetypes(brandProfile.archetype, competitorData),
      tonePositioning: this.compareTonePositioning(brandProfile.toneProfile, competitorData),
      vocabularyDifferences: this.compareVocabulary(brandProfile.vocabulary, competitorData)
    };

    // Identify differentiation opportunities
    comparison.differentiation = {
      uniqueTraits: this.identifyUniqueTraits(brandProfile, competitorData),
      whiteSpaces: this.findVoiceWhiteSpaces(brandProfile, competitorData),
      strengths: this.identifyCompetitiveStrengths(brandProfile, competitorData)
    };

    // Opportunity analysis
    comparison.opportunities = this.identifyVoiceOpportunities(brandProfile, competitorData);

    // Threat analysis
    comparison.threats = this.identifyVoiceThreats(brandProfile, competitorData);

    // Strategic recommendations
    comparison.recommendations = this.generateCompetitiveRecommendations(comparison);

    return comparison;
  }

  /**
   * Calculate overall brand strength score
   */
  calculateBrandStrength(profile) {
    let score = 0;
    let maxScore = 0;

    // Archetype clarity (25% weight)
    if (profile.archetype) {
      score += (profile.archetype.primary.confidence * 100) * 0.25;
      maxScore += 25;
    }

    // Tone consistency (25% weight)
    if (profile.consistency) {
      score += profile.consistency.overall.score * 0.25;
      maxScore += 25;
    }

    // Vocabulary distinctiveness (20% weight)
    if (profile.vocabulary) {
      const distinctiveness = profile.vocabulary.uniqueness?.industryDifferentiation || 50;
      score += distinctiveness * 0.20;
      maxScore += 20;
    }

    // Tone profile strength (20% weight)
    if (profile.toneProfile) {
      const toneStrength = this.calculateToneProfileStrength(profile.toneProfile);
      score += toneStrength * 0.20;
      maxScore += 20;
    }

    // Guidelines completeness (10% weight)
    if (profile.guidelines) {
      const completeness = this.calculateGuidelineCompleteness(profile.guidelines);
      score += completeness * 0.10;
      maxScore += 10;
    }

    return {
      score: Math.round(score),
      maxScore,
      percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
      grade: this.generateBrandGrade(score, maxScore),
      interpretation: this.interpretBrandStrength(score, maxScore)
    };
  }

  /**
   * Helper methods for brand voice analysis
   */

  extractAllText(content) {
    const textParts = [];

    if (content.allText && Array.isArray(content.allText)) {
      textParts.push(...content.allText);
    }

    if (content.allHeadings && Array.isArray(content.allHeadings)) {
      textParts.push(...content.allHeadings.map(h => h.text || ''));
    }

    return textParts.join(' ');
  }

  calculateArchetypeConfidence(score, allScores) {
    if (allScores.length < 2) return 0.5;

    const topScore = allScores[0][1];
    const secondScore = allScores[1][1];

    if (topScore === 0) return 0;

    const gap = topScore - secondScore;
    const confidence = Math.min(gap / topScore, 1);

    return Math.max(0.1, confidence);
  }

  generateArchetypeRecommendations(primary, secondary) {
    const recommendations = [];

    if (primary) {
      recommendations.push(`Embrace ${primary} characteristics in your messaging`);
      recommendations.push(`Use ${this.brandArchetypes[primary].traits.join(', ')} tone elements`);
    }

    if (secondary) {
      recommendations.push(`Consider incorporating ${secondary} elements for depth`);
    }

    return recommendations;
  }

  calculateDimensionPositioning(scores, totalScore) {
    if (totalScore === 0) {
      return { position: 'neutral', strength: 0 };
    }

    const polarities = Object.keys(scores);
    const [firstPolarity, secondPolarity] = polarities;

    const firstScore = scores[firstPolarity] || 0;
    const secondScore = scores[secondPolarity] || 0;

    const dominantPolarity = firstScore > secondScore ? firstPolarity : secondPolarity;
    const strength = Math.abs(firstScore - secondScore) / totalScore;

    return {
      position: dominantPolarity,
      strength: Math.min(strength, 1)
    };
  }

  getDominantTrait(dimensions) {
    const traits = [];

    for (const [dimension, data] of Object.entries(dimensions)) {
      if (data.strength > 0.3) {
        traits.push(`${data.positioning} ${dimension}`);
      }
    }

    return traits.length > 0 ? traits.join(', ') : 'balanced';
  }

  classifyPersonalityType(dimensions) {
    const formal = dimensions.formality?.positioning === 'formal';
    const excited = dimensions.enthusiasm?.positioning === 'excited';
    const warm = dimensions.empathy?.positioning === 'warm';
    const confident = dimensions.confidence?.positioning === 'confident';

    if (formal && confident) return 'authoritative';
    if (warm && excited) return 'enthusiastic';
    if (warm && !formal) return 'friendly';
    if (confident && excited) return 'dynamic';
    if (formal && !excited) return 'professional';

    return 'balanced';
  }

  calculateApproachability(dimensions) {
    let score = 50; // Base score

    if (dimensions.formality?.positioning === 'casual') score += 20;
    if (dimensions.empathy?.positioning === 'warm') score += 20;
    if (dimensions.confidence?.positioning === 'humble') score += 10;

    return Math.min(100, score);
  }

  calculateAuthority(dimensions) {
    let score = 50; // Base score

    if (dimensions.formality?.positioning === 'formal') score += 20;
    if (dimensions.confidence?.positioning === 'confident') score += 20;
    if (dimensions.enthusiasm?.positioning === 'calm') score += 10;

    return Math.min(100, score);
  }

  isStopWord(word) {
    const stopWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
    ];

    return stopWords.includes(word.toLowerCase());
  }

  calculateAverageWordLength(words) {
    if (words.length === 0) return 0;
    return words.reduce((sum, word) => sum + word.length, 0) / words.length;
  }

  calculateLexicalDiversity(words) {
    if (words.length === 0) return 0;
    const uniqueWords = new Set(words);
    return uniqueWords.size / words.length;
  }

  identifyTechnicalTerms(words) {
    // Simplified technical term detection
    const technicalIndicators = ['api', 'software', 'algorithm', 'database', 'system'];
    return words.filter(word =>
      technicalIndicators.some(indicator => word.includes(indicator)) ||
      word.length > 12
    ).length;
  }

  countEmotionalWords(words) {
    const emotionalWords = [
      'amazing', 'incredible', 'fantastic', 'awesome', 'terrible', 'horrible',
      'wonderful', 'brilliant', 'outstanding', 'disappointing', 'frustrating'
    ];

    return words.filter(word => emotionalWords.includes(word)).length;
  }

  countActionWords(words) {
    const actionWords = [
      'create', 'build', 'develop', 'design', 'implement', 'achieve', 'deliver',
      'transform', 'optimize', 'improve', 'enhance', 'generate', 'produce'
    ];

    return words.filter(word => actionWords.includes(word)).length;
  }

  generateBrandGrade(score, maxScore) {
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

    if (percentage >= 90) return 'A+';
    if (percentage >= 85) return 'A';
    if (percentage >= 80) return 'A-';
    if (percentage >= 75) return 'B+';
    if (percentage >= 70) return 'B';
    if (percentage >= 65) return 'B-';
    if (percentage >= 60) return 'C+';
    if (percentage >= 55) return 'C';
    return 'C-';
  }

  interpretBrandStrength(score, maxScore) {
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

    if (percentage >= 85) return 'Excellent brand voice with strong consistency and clear personality';
    if (percentage >= 70) return 'Good brand voice with room for minor improvements';
    if (percentage >= 55) return 'Developing brand voice that needs refinement';
    return 'Brand voice needs significant work to establish clear identity';
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.profileCache.clear();
    logger.info('Brand voice cache cleared');
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      cacheSize: this.profileCache.size,
      isInitialized: this.initialized,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Placeholder methods for consistency analysis
   * (These would be fully implemented based on specific requirements)
   */

  groupContentSections(content) {
    return {
      headings: content.allHeadings?.map(h => h.text) || [],
      content: content.allText || [],
      ctas: content.ctas || []
    };
  }

  async analyzeSectionConsistency(sectionContent) {
    // Placeholder implementation
    return {
      averageScore: 75,
      issues: [],
      strengths: ['consistent tone']
    };
  }

  calculateVocabularyConsistency(sections) {
    // Placeholder - would implement actual vocabulary overlap analysis
    return 80;
  }

  calculateToneConsistency(sections) {
    // Placeholder - would implement tone variation analysis
    return 75;
  }

  calculateFormalityConsistency(sections) {
    // Placeholder - would implement formality level analysis
    return 85;
  }

  calculateSentimentConsistency(sections) {
    // Placeholder - would implement sentiment variation analysis
    return 70;
  }

  calculateOverallConsistencyScore(metrics) {
    const scores = Object.values(metrics);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  getConsistencyGrade(metrics) {
    const avgScore = this.calculateOverallConsistencyScore(metrics);
    if (avgScore >= 90) return 'A';
    if (avgScore >= 80) return 'B';
    if (avgScore >= 70) return 'C';
    return 'D';
  }

  identifyConsistencyStrengths(metrics) {
    return Object.entries(metrics)
      .filter(([_, score]) => score >= 80)
      .map(([metric, _]) => metric);
  }

  identifyConsistencyWeaknesses(metrics) {
    return Object.entries(metrics)
      .filter(([_, score]) => score < 70)
      .map(([metric, _]) => metric);
  }

  identifyConsistencyIssues(bySection, metrics) {
    // Placeholder implementation
    return [];
  }

  generateConsistencyImprovements(consistency) {
    // Placeholder implementation
    return ['Maintain consistent tone across all content sections'];
  }

  // Additional placeholder methods for style guide generation
  generatePersonalityDescription(archetype) {
    return this.brandArchetypes[archetype]?.traits.join(', ') || 'balanced personality';
  }

  getVoiceCharacteristics(archetype) {
    return this.brandArchetypes[archetype]?.messageThemes || [];
  }

  formatToneDimensions(dimensions) {
    const formatted = {};
    Object.entries(dimensions).forEach(([dim, data]) => {
      formatted[dim] = `${data.positioning} (${Math.round(data.strength * 100)}% strength)`;
    });
    return formatted;
  }

  generateSituationalToneGuide(toneProfile) {
    return {
      marketing: 'Use enthusiastic tone for promotional content',
      support: 'Use empathetic tone for customer service',
      technical: 'Use clear, professional tone for documentation'
    };
  }

  generateToneAdjustments(toneProfile) {
    return ['Maintain consistency across all channels'];
  }

  generatePreferredWordList(vocabulary) {
    return vocabulary.uniqueness?.distinctiveWords?.slice(0, 20) || [];
  }

  generateWordsToAvoid(vocabulary) {
    return ['avoid overly complex jargon', 'minimize negative language'];
  }

  generateIndustryTermGuidance(vocabulary) {
    return 'Use industry terms sparingly and always provide context';
  }

  getComplexityGuidance(vocabulary) {
    const avgLength = vocabulary.style?.averageWordLength || 5;
    if (avgLength > 6) return 'Consider using simpler words';
    if (avgLength < 4) return 'Consider using more descriptive words';
    return 'Vocabulary complexity is appropriate';
  }

  createMessagingFramework(profile) {
    return {
      coreMessage: 'Define based on brand archetype and tone profile',
      keyPillars: ['pillar 1', 'pillar 2', 'pillar 3'],
      audienceAlignment: 'Ensure voice matches target audience expectations'
    };
  }

  generateDosDonts(profile) {
    return {
      dos: ['Be consistent', 'Stay authentic', 'Know your audience'],
      donts: ['Avoid off-brand language', 'Don\'t be inconsistent', 'Avoid jargon without context']
    };
  }

  generateStyleExamples(profile) {
    return {
      headlines: ['Example headline in brand voice'],
      socialMedia: ['Example social media post'],
      emails: ['Example email tone']
    };
  }

  // Additional placeholder methods for competitive analysis
  compareArchetypes(brandArchetype, competitorData) {
    return { analysis: 'Archetype positioning vs competitors' };
  }

  compareTonePositioning(toneProfile, competitorData) {
    return { analysis: 'Tone positioning vs competitors' };
  }

  compareVocabulary(vocabulary, competitorData) {
    return { analysis: 'Vocabulary differences vs competitors' };
  }

  identifyUniqueTraits(brandProfile, competitorData) {
    return ['unique trait 1', 'unique trait 2'];
  }

  findVoiceWhiteSpaces(brandProfile, competitorData) {
    return ['opportunity area 1', 'opportunity area 2'];
  }

  identifyCompetitiveStrengths(brandProfile, competitorData) {
    return ['strength 1', 'strength 2'];
  }

  identifyVoiceOpportunities(brandProfile, competitorData) {
    return ['opportunity 1', 'opportunity 2'];
  }

  identifyVoiceThreats(brandProfile, competitorData) {
    return ['threat 1', 'threat 2'];
  }

  generateCompetitiveRecommendations(comparison) {
    return ['recommendation 1', 'recommendation 2'];
  }

  calculateToneProfileStrength(toneProfile) {
    // Placeholder - would calculate based on tone consistency and clarity
    return 75;
  }

  calculateGuidelineCompleteness(guidelines) {
    // Placeholder - would calculate based on guideline comprehensiveness
    return 80;
  }

  // Simplified implementations for complex analyses
  calculateComplexWordRatio(words) {
    const complexWords = words.filter(word => word.length > 7);
    return words.length > 0 ? complexWords.length / words.length : 0;
  }

  analyzeSyllableDistribution(words) {
    return {
      average: 2.5,
      distribution: { 1: 0.3, 2: 0.4, 3: 0.2, '4+': 0.1 }
    };
  }

  detectIndustryJargon(words) {
    // Simple jargon detection
    const jargonWords = words.filter(word => word.length > 10 || /tech|digital|cloud|ai/.test(word));
    return jargonWords.length;
  }

  extractCommonPhrases(text) {
    // Simple phrase extraction
    const phrases = [];
    const sentences = text.split(/[.!?]+/);

    sentences.slice(0, 10).forEach(sentence => {
      if (sentence.trim().length > 20) {
        phrases.push(sentence.trim().substring(0, 50) + '...');
      }
    });

    return phrases;
  }

  analyzeSentenceStarters(sentences) {
    const starters = {};
    sentences.slice(0, 20).forEach(sentence => {
      const words = sentence.trim().split(' ');
      if (words.length > 0) {
        const starter = words[0].toLowerCase();
        starters[starter] = (starters[starter] || 0) + 1;
      }
    });

    return Object.entries(starters)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
  }

  analyzeQuestionPatterns(text) {
    const questions = text.match(/[^.!?]*\?/g) || [];
    return {
      count: questions.length,
      types: this.classifyQuestionTypes(questions)
    };
  }

  classifyQuestionTypes(questions) {
    const types = {
      what: 0,
      how: 0,
      why: 0,
      when: 0,
      where: 0,
      who: 0,
      other: 0
    };

    questions.forEach(q => {
      const qLower = q.toLowerCase();
      if (qLower.includes('what')) types.what++;
      else if (qLower.includes('how')) types.how++;
      else if (qLower.includes('why')) types.why++;
      else if (qLower.includes('when')) types.when++;
      else if (qLower.includes('where')) types.where++;
      else if (qLower.includes('who')) types.who++;
      else types.other++;
    });

    return types;
  }

  analyzeCTAStyle(ctas) {
    return {
      averageLength: ctas.length > 0 ? ctas.reduce((sum, cta) => sum + cta.length, 0) / ctas.length : 0,
      commonPatterns: ['get', 'start', 'try', 'learn'],
      urgencyLevel: 'medium'
    };
  }

  findDistinctiveWords(words) {
    // Simple distinctive word finding
    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    return Object.entries(wordFreq)
      .filter(([word, freq]) => freq > 1 && word.length > 4)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, freq]) => ({ word, frequency: freq }));
  }

  identifyBrandTerms(words, content) {
    // Simple brand term identification
    const brandTerms = [];

    // Look for capitalized words that might be brand names
    words.forEach(word => {
      if (word.length > 2 && /^[A-Z]/.test(word)) {
        brandTerms.push(word);
      }
    });

    return brandTerms.slice(0, 10);
  }

  scoreIndustryDifferentiation(words) {
    // Placeholder scoring
    return 75;
  }

  generateVocabularyRecommendations(vocabulary) {
    const recommendations = [];

    if (vocabulary.style?.averageWordLength > 6) {
      recommendations.push('Consider using simpler words for better accessibility');
    }

    if (vocabulary.complexity?.complexWordRatio > 0.2) {
      recommendations.push('Reduce complex terminology to improve readability');
    }

    if (vocabulary.style?.lexicalDiversity < 0.5) {
      recommendations.push('Increase vocabulary variety to make content more engaging');
    }

    return recommendations;
  }

  analyzeToneConsistency(textSections, dimensions) {
    // Simplified tone consistency analysis
    return {
      score: 75,
      variance: 15,
      mostConsistent: 'formality',
      leastConsistent: 'enthusiasm'
    };
  }

  generateToneRecommendations(toneProfile) {
    const recommendations = [];

    if (toneProfile.overall?.personalityType === 'balanced') {
      recommendations.push('Consider developing a more distinctive personality');
    }

    Object.entries(toneProfile.dimensions).forEach(([dimension, data]) => {
      if (data.confidence < 0.5) {
        recommendations.push(`Strengthen ${dimension} positioning for clearer brand voice`);
      }
    });

    return recommendations;
  }
}

// Singleton instance
let brandVoiceInstance = null;

/**
 * Get singleton brand voice instance
 */
export function getBrandVoice() {
  if (!brandVoiceInstance) {
    brandVoiceInstance = new BrandVoiceService();
  }
  return brandVoiceInstance;
}

/**
 * Generate brand profile function
 */
export async function generateBrandProfile(content, options = {}) {
  const brandVoice = getBrandVoice();
  return await brandVoice.generateBrandProfile(content, options);
}

export default getBrandVoice;