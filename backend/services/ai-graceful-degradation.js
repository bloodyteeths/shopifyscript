/**
 * AI Graceful Degradation Service
 * Provides fallback strategies when AI services are unavailable or failing
 */

import { performance } from 'perf_hooks';

/**
 * Degradation strategies
 */
export const DegradationStrategies = {
  CACHED_RESPONSES: 'cached_responses',
  SIMPLIFIED_AI: 'simplified_ai',
  TEMPLATE_RESPONSES: 'template_responses',
  MANUAL_FALLBACK: 'manual_fallback',
  QUEUE_FOR_LATER: 'queue_for_later',
  NO_AI: 'no_ai'
};

/**
 * Service availability levels
 */
export const ServiceLevels = {
  FULL: 'full',           // All AI features available
  DEGRADED: 'degraded',   // Limited AI features
  MINIMAL: 'minimal',     // Basic AI with templates
  OFFLINE: 'offline'      // No AI, fallback only
};

/**
 * AI Graceful Degradation Service
 */
class AIGracefulDegradationService {
  constructor(options = {}) {
    this.options = {
      cacheEnabled: options.cacheEnabled !== false,
      cacheTTL: options.cacheTTL || 24 * 60 * 60 * 1000, // 24 hours
      maxCacheSize: options.maxCacheSize || 1000,
      enableTemplates: options.enableTemplates !== false,
      enableQueueing: options.enableQueueing !== false,
      queueMaxSize: options.queueMaxSize || 100,
      ...options
    };

    // Response cache for AI calls
    this.responseCache = new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;

    // Template responses for common scenarios
    this.templates = new Map();
    this.initializeTemplates();

    // Queue for failed requests to retry later
    this.requestQueue = [];

    // Service level tracking
    this.currentServiceLevel = ServiceLevels.FULL;
    this.degradationHistory = [];

    // Metrics
    this.metrics = {
      totalRequests: 0,
      aiSuccesses: 0,
      cacheHits: 0,
      templateUsage: 0,
      queuedRequests: 0,
      degradationEvents: 0
    };
  }

  /**
   * Initialize template responses for common scenarios
   */
  initializeTemplates() {
    // RSA Templates
    this.templates.set('rsa_headlines', [
      'Boost Your Business Results',
      'Professional Solutions Available',
      'Expert Service You Trust',
      'Quality Results Delivered',
      'Get Started Today',
      'Transform Your Business',
      'Proven Success Strategies',
      'Professional Expertise',
      'Results That Matter',
      'Your Success Partner',
      'Quality Service Guaranteed',
      'Expert Solutions',
      'Grow Your Business',
      'Professional Results',
      'Trusted Expertise'
    ]);

    this.templates.set('rsa_descriptions', [
      'Discover professional solutions designed to help your business succeed.',
      'Get expert guidance and proven strategies for your business needs.',
      'Professional service with guaranteed results and customer satisfaction.',
      'Transform your business with our comprehensive solutions and expertise.'
    ]);

    // Negative keyword suggestions
    this.templates.set('negative_keywords', [
      'free', 'cheap', 'discount', 'sale', 'job', 'jobs', 'career', 'careers',
      'DIY', 'how to', 'tutorial', 'guide', 'course', 'training', 'learn',
      'beginner', 'basic', 'simple', 'easy', 'quick', 'fast'
    ]);

    // Business analysis templates
    this.templates.set('business_analysis', {
      summary: 'Your campaign performance shows consistent activity with opportunities for optimization.',
      recommendations: [
        'Monitor your top-performing keywords and consider increasing bids for better visibility.',
        'Review your ad copy performance and test new variations.',
        'Analyze your conversion paths to identify potential improvements.',
        'Consider expanding your keyword list with related terms.'
      ],
      insights: [
        'Focus on your highest-converting campaigns',
        'Review your budget allocation across campaigns',
        'Monitor your quality scores for optimization opportunities'
      ]
    });

    // Email templates
    this.templates.set('email_subject', 'Weekly Campaign Performance Summary');
    this.templates.set('email_greeting', 'Here\'s your weekly campaign performance summary:');

    // Error messages for users
    this.templates.set('user_messages', {
      ai_unavailable: 'AI analysis is temporarily unavailable. We\'re using our backup analysis system.',
      limited_features: 'Some AI features are currently limited. Basic functionality is still available.',
      cached_response: 'Showing recent analysis results while AI services are being restored.',
      template_response: 'Using template analysis while AI services are temporarily unavailable.'
    });
  }

  /**
   * Determine current service level based on AI availability
   */
  async assessServiceLevel() {
    try {
      const { getAIProviderService } = await import("./ai-provider.js");
      const { getAIErrorHandler } = await import("../middleware/ai-error-handler.js");

      const aiService = getAIProviderService();
      const errorHandler = getAIErrorHandler();

      // Test AI availability with a simple request
      const testStart = performance.now();
      try {
        await aiService.generateText("Test", { maxRetries: 1 });
        const testDuration = performance.now() - testStart;

        // Check error rate
        const healthStatus = errorHandler.getHealthStatus();
        const metrics = errorHandler.getGlobalMetrics();

        if (healthStatus === 'healthy' && testDuration < 5000) {
          return ServiceLevels.FULL;
        } else if (healthStatus === 'good' || healthStatus === 'degraded') {
          return ServiceLevels.DEGRADED;
        } else {
          return ServiceLevels.MINIMAL;
        }
      } catch (error) {
        console.warn('AI service test failed:', error.message);
        return ServiceLevels.OFFLINE;
      }
    } catch (error) {
      console.error('Service level assessment failed:', error);
      return ServiceLevels.OFFLINE;
    }
  }

  /**
   * Update service level and handle degradation
   */
  async updateServiceLevel() {
    const newLevel = await this.assessServiceLevel();

    if (newLevel !== this.currentServiceLevel) {
      this.degradationHistory.push({
        timestamp: new Date().toISOString(),
        from: this.currentServiceLevel,
        to: newLevel,
        reason: 'Service level assessment'
      });

      console.log(`🔄 AI service level changed: ${this.currentServiceLevel} → ${newLevel}`);
      this.currentServiceLevel = newLevel;
      this.metrics.degradationEvents++;

      // Alert if service is degrading significantly
      if (newLevel === ServiceLevels.OFFLINE ||
          (this.currentServiceLevel === ServiceLevels.FULL && newLevel === ServiceLevels.MINIMAL)) {
        this.alertServiceDegradation(newLevel);
      }
    }

    return newLevel;
  }

  /**
   * Generate cache key for AI requests
   */
  generateCacheKey(prompt, options = {}) {
    const { tenant, operation, model, ...otherOptions } = options;
    const optionsKey = JSON.stringify(otherOptions, Object.keys(otherOptions).sort());
    return `${operation || 'generate'}:${model || 'default'}:${Buffer.from(prompt).toString('base64').slice(0, 32)}:${optionsKey}`;
  }

  /**
   * Get cached response if available
   */
  getCachedResponse(cacheKey) {
    if (!this.options.cacheEnabled) return null;

    const cached = this.responseCache.get(cacheKey);
    if (!cached) {
      this.cacheMisses++;
      return null;
    }

    const { response, timestamp, ttl } = cached;
    if (Date.now() - timestamp > ttl) {
      this.responseCache.delete(cacheKey);
      return null;
    }

    this.cacheHits++;
    this.metrics.cacheHits++;
    console.log(`📦 Using cached AI response (${this.cacheHits}/${this.cacheHits + this.cacheMisses} hit rate)`);

    return {
      ...response,
      cached: true,
      cachedAt: new Date(timestamp).toISOString()
    };
  }

  /**
   * Cache AI response
   */
  cacheResponse(cacheKey, response) {
    if (!this.options.cacheEnabled) return;

    // Implement LRU eviction if cache is full
    if (this.responseCache.size >= this.options.maxCacheSize) {
      const firstKey = this.responseCache.keys().next().value;
      this.responseCache.delete(firstKey);
    }

    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now(),
      ttl: this.options.cacheTTL
    });
  }

  /**
   * Generate AI content with graceful degradation
   */
  async generateWithDegradation(prompt, options = {}) {
    this.metrics.totalRequests++;
    const { operation = 'generate', fallbackStrategy = 'auto', ...aiOptions } = options;

    // Update service level
    await this.updateServiceLevel();

    // Generate cache key
    const cacheKey = this.generateCacheKey(prompt, options);

    // Try cached response first if service is degraded
    if (this.currentServiceLevel !== ServiceLevels.FULL) {
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        return {
          ...cached,
          serviceLevel: this.currentServiceLevel,
          source: 'cache'
        };
      }
    }

    // Try AI generation based on service level
    if (this.currentServiceLevel === ServiceLevels.FULL ||
        this.currentServiceLevel === ServiceLevels.DEGRADED) {
      try {
        const { getAIProviderService } = await import("./ai-provider.js");
        const aiService = getAIProviderService();

        const result = await aiService.generateText(prompt, {
          ...aiOptions,
          maxRetries: this.currentServiceLevel === ServiceLevels.FULL ? 3 : 1
        });

        this.metrics.aiSuccesses++;

        // Cache successful response
        const responseData = {
          content: result,
          serviceLevel: this.currentServiceLevel,
          source: 'ai',
          generatedAt: new Date().toISOString()
        };

        this.cacheResponse(cacheKey, responseData);
        return responseData;

      } catch (error) {
        console.warn(`AI generation failed (${this.currentServiceLevel}), falling back:`, error.message);

        // Try cached response as fallback
        const cached = this.getCachedResponse(cacheKey);
        if (cached) {
          return {
            ...cached,
            source: 'cache_fallback',
            aiError: error.message
          };
        }

        // Queue request for later if enabled
        if (this.options.enableQueueing) {
          this.queueRequest(prompt, options, error);
        }

        // Continue to template fallback
      }
    }

    // Use template-based responses
    if (this.options.enableTemplates) {
      const templateResponse = this.generateTemplateResponse(operation, prompt, options);
      if (templateResponse) {
        this.metrics.templateUsage++;
        return {
          ...templateResponse,
          serviceLevel: this.currentServiceLevel,
          source: 'template',
          userMessage: this.templates.get('user_messages').template_response
        };
      }
    }

    // Last resort: queue and return error with helpful message
    if (this.options.enableQueueing && this.requestQueue.length < this.options.queueMaxSize) {
      this.queueRequest(prompt, options, new Error('All fallback strategies exhausted'));

      return {
        content: null,
        serviceLevel: this.currentServiceLevel,
        source: 'queued',
        queued: true,
        userMessage: 'Your request has been queued and will be processed when AI services are restored.',
        retryAfter: 300 // 5 minutes
      };
    }

    // Complete failure
    throw new Error(`AI services unavailable and all fallback strategies exhausted. Service level: ${this.currentServiceLevel}`);
  }

  /**
   * Generate template-based response
   */
  generateTemplateResponse(operation, prompt, options) {
    switch (operation) {
      case 'rsa_generation':
        return {
          content: {
            headlines: this.templates.get('rsa_headlines').slice(0, options.headlineCount || 15),
            descriptions: this.templates.get('rsa_descriptions').slice(0, options.descriptionCount || 4)
          }
        };

      case 'negative_analysis':
        const baseNegatives = this.templates.get('negative_keywords');
        return {
          content: {
            suggested_negatives: baseNegatives.slice(0, 10),
            confidence: 'low',
            source: 'template'
          }
        };

      case 'business_analysis':
        const analysis = this.templates.get('business_analysis');
        return {
          content: {
            ...analysis,
            confidence: 'template',
            generatedAt: new Date().toISOString()
          }
        };

      case 'email_generation':
        return {
          content: {
            subject: this.templates.get('email_subject'),
            greeting: this.templates.get('email_greeting'),
            confidence: 'template'
          }
        };

      default:
        return null;
    }
  }

  /**
   * Queue request for later processing
   */
  queueRequest(prompt, options, error) {
    if (this.requestQueue.length >= this.options.queueMaxSize) {
      console.warn('Request queue is full, dropping oldest request');
      this.requestQueue.shift();
    }

    this.requestQueue.push({
      prompt,
      options,
      error: error.message,
      queuedAt: new Date().toISOString(),
      retryCount: 0
    });

    this.metrics.queuedRequests++;
    console.log(`📋 Queued AI request (${this.requestQueue.length}/${this.options.queueMaxSize})`);
  }

  /**
   * Process queued requests when service recovers
   */
  async processQueue() {
    if (this.requestQueue.length === 0) return;

    console.log(`🔄 Processing ${this.requestQueue.length} queued AI requests`);

    const results = [];
    const toRetry = [];

    for (const queuedRequest of this.requestQueue) {
      try {
        const result = await this.generateWithDegradation(
          queuedRequest.prompt,
          { ...queuedRequest.options, fromQueue: true }
        );

        results.push({
          ...queuedRequest,
          result,
          processedAt: new Date().toISOString()
        });

      } catch (error) {
        queuedRequest.retryCount++;

        if (queuedRequest.retryCount < 3) {
          toRetry.push(queuedRequest);
        } else {
          console.error(`Dropping queued request after 3 retries:`, error);
        }
      }
    }

    this.requestQueue = toRetry;

    console.log(`✅ Processed ${results.length} queued requests, ${toRetry.length} remaining`);

    return results;
  }

  /**
   * Alert about service degradation
   */
  alertServiceDegradation(level) {
    const alert = {
      timestamp: new Date().toISOString(),
      level,
      message: `AI service degraded to ${level}`,
      impact: this.getServiceLevelImpact(level),
      recommendations: this.getServiceLevelRecommendations(level)
    };

    console.warn(`🚨 AI SERVICE DEGRADATION ALERT:`, alert);

    // Here you could integrate with alerting services
    // - Send email notifications
    // - Slack/Discord webhooks
    // - PagerDuty alerts
    // - Custom monitoring dashboards
  }

  /**
   * Get impact description for service level
   */
  getServiceLevelImpact(level) {
    const impacts = {
      [ServiceLevels.FULL]: 'No impact - all AI features available',
      [ServiceLevels.DEGRADED]: 'Limited impact - reduced AI response times and features',
      [ServiceLevels.MINIMAL]: 'Moderate impact - basic AI features only, template responses used',
      [ServiceLevels.OFFLINE]: 'High impact - no AI features, fallback systems active'
    };

    return impacts[level] || 'Unknown impact';
  }

  /**
   * Get recommendations for service level
   */
  getServiceLevelRecommendations(level) {
    const recommendations = {
      [ServiceLevels.DEGRADED]: [
        'Monitor AI provider status',
        'Consider using cached responses',
        'Reduce AI request frequency'
      ],
      [ServiceLevels.MINIMAL]: [
        'Use template responses where possible',
        'Queue non-critical AI requests',
        'Check provider API limits'
      ],
      [ServiceLevels.OFFLINE]: [
        'Switch to manual processes',
        'Use cached data exclusively',
        'Contact AI provider support',
        'Consider backup AI providers'
      ]
    };

    return recommendations[level] || [];
  }

  /**
   * Get service status and metrics
   */
  getStatus() {
    return {
      serviceLevel: this.currentServiceLevel,
      lastAssessment: new Date().toISOString(),
      cache: {
        enabled: this.options.cacheEnabled,
        size: this.responseCache.size,
        maxSize: this.options.maxCacheSize,
        hitRate: this.cacheHits + this.cacheMisses > 0 ?
          (this.cacheHits / (this.cacheHits + this.cacheMisses) * 100).toFixed(2) + '%' : '0%'
      },
      queue: {
        enabled: this.options.enableQueueing,
        size: this.requestQueue.length,
        maxSize: this.options.queueMaxSize
      },
      templates: {
        enabled: this.options.enableTemplates,
        available: this.templates.size
      },
      metrics: this.metrics,
      degradationHistory: this.degradationHistory.slice(-10) // Last 10 events
    };
  }

  /**
   * Clear cache (for maintenance)
   */
  clearCache() {
    const cacheSize = this.responseCache.size;
    this.responseCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;

    console.log(`🗑️  Cleared AI response cache (${cacheSize} entries)`);

    return { cleared: cacheSize };
  }

  /**
   * Get user-friendly status message
   */
  getUserStatusMessage() {
    const messages = this.templates.get('user_messages');

    switch (this.currentServiceLevel) {
      case ServiceLevels.FULL:
        return null; // No message needed
      case ServiceLevels.DEGRADED:
        return messages.limited_features;
      case ServiceLevels.MINIMAL:
        return messages.template_response;
      case ServiceLevels.OFFLINE:
        return messages.ai_unavailable;
      default:
        return 'AI services status unknown';
    }
  }
}

// Singleton instance
let degradationServiceInstance = null;

/**
 * Get the global AI graceful degradation service
 */
export function getAIDegradationService(options = {}) {
  if (!degradationServiceInstance) {
    degradationServiceInstance = new AIGracefulDegradationService(options);
  }
  return degradationServiceInstance;
}

/**
 * Wrapper function to add graceful degradation to any AI operation
 */
export function withGracefulDegradation(operation, options = {}) {
  const service = getAIDegradationService();

  return async (prompt, aiOptions = {}) => {
    return await service.generateWithDegradation(prompt, {
      ...aiOptions,
      operation,
      ...options
    });
  };
}

export default AIGracefulDegradationService;