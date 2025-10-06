/**
 * Advanced AI Provider Service for Ads Autopilot AI SaaS
 * Multi-provider support with intelligent fallbacks and optimization
 */

import { getAIProvider as getBaseProvider } from "../lib/aiProvider.js";
import { recordTokenUsage, checkBudgetLimit } from "./token-monitor.js";
import { getAIErrorHandler } from "../middleware/ai-error-handler.js";
import { getAIErrorRecoveryService } from "./ai-error-recovery.js";
import { getTierBudgetManager } from "./tier-budget-manager.js";

/**
 * Enhanced AI provider with advanced features
 */
export class AIProviderService {
  constructor() {
    this.provider = null;
    this.initialized = false;
    this.metrics = {
      calls: 0,
      failures: 0,
      totalTokens: 0,
      avgResponseTime: 0,
    };
  }

  /**
   * Initialize AI provider with error handling and validation
   */
  async initialize() {
    if (this.initialized && this.provider) return this.provider;

    try {
      this.provider = await getBaseProvider();
      this.initialized = true;
      return this.provider;
    } catch (error) {
      this.initialized = false;
      throw new Error(`Failed to initialize AI provider: ${error.message}`);
    }
  }

  /**
   * Generate text with advanced error handling, recovery, and token monitoring
   */
  async generateText(prompt, options = {}) {
    const { tenant, operation = 'text_generation', maxRetries = 3, agentType = 'basic_optimization', ...aiOptions } = options;
    const startTime = Date.now();

    // Use tier-based budget manager for multi-tenant support
    const tierManager = getTierBudgetManager();
    const skipBudgetCheck = process.env.AI_SKIP_BUDGET_CHECK === 'true' || process.env.NODE_ENV === 'development';

    if (tenant && !skipBudgetCheck) {
      // Check tier-based limits
      const estimatedTokens = this.estimateTokens(prompt);
      const tierCheck = await tierManager.canMakeAICall(tenant, agentType, estimatedTokens);

      if (!tierCheck.allowed) {
        console.warn(`🚫 AI request blocked for ${tenant}: ${tierCheck.reason}`);

        // Return graceful fallback for tier limits
        if (tierCheck.upgrade) {
          console.log(`💡 Upgrade suggestion for ${tenant}: ${tierCheck.upgrade.benefit} (${tierCheck.upgrade.tier} - $${tierCheck.upgrade.price}/mo)`);
        }

        throw new Error(`AI limit exceeded: ${tierCheck.reason}. ${tierCheck.resetIn ? `Resets in ${tierCheck.resetIn}` : ''}`);
      }

      console.log(`✅ AI request approved for ${tenant} (${tierCheck.tier} tier, priority: ${tierCheck.priority})`);
    } else if (skipBudgetCheck) {
      console.log(`💰 Budget check skipped for ${tenant || 'unknown'} (development mode or AI_SKIP_BUDGET_CHECK=true)`);
    }

    let lastError;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        await this.initialize();

        // Optimize prompt for cost efficiency
        const optimizedPrompt = this.optimizePromptForCosts(prompt);
        const result = await this.provider.generateText(optimizedPrompt, aiOptions);

        // Validate result is not empty
        if (!result || result.trim().length === 0) {
          throw new Error('AI provider returned empty response');
        }

        // Calculate token usage
        const duration = Date.now() - startTime;
        const inputTokens = this.estimateTokens(optimizedPrompt);
        const outputTokens = this.estimateTokens(result);

        // Record token usage if tenant provided
        if (tenant && operation) {
          const totalTokens = inputTokens + outputTokens;
          const estimatedCost = (totalTokens / 1000) * 0.000375; // Gemini pricing

          // Record with tier budget manager
          if (!skipBudgetCheck) {
            await tierManager.recordAICall(tenant, agentType, totalTokens, estimatedCost);
          }

          // Also record with existing token monitor for detailed tracking
          await recordTokenUsage(tenant, operation, {
            inputTokens,
            outputTokens,
            totalTokens,
            provider: this.provider?.provider || 'unknown',
            model: aiOptions.model || 'default',
            prompt: optimizedPrompt,
            response: result,
            duration,
            attempt: attempt + 1
          });
        }

        // Update metrics
        this.metrics.calls++;
        this.metrics.totalTokens += inputTokens + outputTokens;
        const responseTime = duration;
        this.metrics.avgResponseTime =
          (this.metrics.avgResponseTime * (this.metrics.calls - 1) +
            responseTime) /
          this.metrics.calls;

        console.log(`✅ AI generation completed: ${inputTokens + outputTokens} tokens, ${duration}ms (attempt ${attempt + 1})`);
        return result;
      } catch (error) {
        lastError = error;
        attempt++;
        this.metrics.failures++;

        console.warn(`❌ AI generation failed (attempt ${attempt}/${maxRetries}): ${error.message}`);

        // Don't retry if it's a budget or auth error
        if (error.message.includes('Budget limit exceeded') ||
            error.message.includes('API key') ||
            error.message.includes('unauthorized') ||
            error.message.includes('forbidden')) {
          break;
        }

        // Exponential backoff before retry
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`⏱️  Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed - log with error handler and throw
    const errorHandler = getAIErrorHandler();
    const finalError = new Error(`AI generation failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
    finalError.originalError = lastError;
    finalError.attempts = attempt;
    finalError.provider = this.provider?.provider || 'unknown';
    finalError.tenant = tenant;
    finalError.operation = operation;

    // Log error with centralized error handler
    errorHandler.logError(finalError, {
      tenant,
      operation,
      provider: this.provider?.provider
    });

    console.error(`🚨 AI generation failed completely:`, finalError);
    throw finalError;
  }

  /**
   * Generate structured content with validation and fallback
   */
  async generateStructuredContent(prompt, expectedFormat = "json", options = {}) {
    const { maxRetries = 3, ...aiOptions } = options;

    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const content = await this.generateText(prompt, aiOptions);

        if (!content || content.trim().length === 0) {
          throw new Error('Generated content is empty');
        }

        if (expectedFormat === "json") {
          try {
            return JSON.parse(content);
          } catch (parseError) {
            // Try to extract JSON from the response if it's embedded
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                return JSON.parse(jsonMatch[0]);
              } catch (extractError) {
                throw new Error(`Invalid JSON format in response: ${parseError.message}`);
              }
            }
            throw new Error(`Response is not valid JSON: ${parseError.message}`);
          }
        }
        return content;
      } catch (error) {
        lastError = error;
        console.warn(`❌ Structured content generation failed (attempt ${attempt + 1}/${maxRetries}): ${error.message}`);

        // If it's a parsing error, try to modify the prompt for better results
        if (error.message.includes('JSON') && attempt < maxRetries - 1) {
          prompt = `${prompt}\n\nIMPORTANT: Return ONLY valid ${expectedFormat.toUpperCase()} format with no additional text or formatting.`;
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw new Error(`Failed to generate valid structured content after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Generate multiple variations with proper error handling
   */
  async generateVariations(basePrompt, count = 3, options = {}) {
    const { batchSize = 3, ...aiOptions } = options;
    const variations = [];
    const errors = [];

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < count; i += batchSize) {
      const batchCount = Math.min(batchSize, count - i);
      const batchPromises = Array(batchCount)
        .fill(null)
        .map(async (_, j) => {
          try {
            const variationNumber = i + j + 1;
            const result = await this.generateText(
              `${basePrompt} (Variation ${variationNumber})`,
              { ...aiOptions, maxRetries: 2 }
            );
            return { index: variationNumber - 1, result, error: null };
          } catch (error) {
            return { index: i + j, result: null, error };
          }
        });

      const batchResults = await Promise.allSettled(batchPromises);

      for (const settledResult of batchResults) {
        if (settledResult.status === 'fulfilled') {
          const { result, error, index } = settledResult.value;
          if (error) {
            errors.push({ index, error: error.message });
            console.warn(`❌ Variation ${index + 1} failed: ${error.message}`);
          } else if (result && result.trim().length > 0) {
            variations.push({ index, content: result });
          }
        } else {
          errors.push({ index: i, error: settledResult.reason.message });
        }
      }

      // Add delay between batches if not the last batch
      if (i + batchSize < count) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (variations.length === 0) {
      throw new Error(`Failed to generate any variations. Errors: ${errors.map(e => e.error).join(', ')}`);
    }

    console.log(`✅ Generated ${variations.length}/${count} variations successfully`);
    return variations.sort((a, b) => a.index - b.index).map(v => v.content);
  }

  /**
   * Get provider status and metrics
   */
  getStatus() {
    return {
      initialized: this.initialized,
      provider: this.provider?.provider || "none",
      metrics: { ...this.metrics },
      remainingCalls: this.provider?.remainingCalls?.() || 0,
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      calls: 0,
      failures: 0,
      totalTokens: 0,
      avgResponseTime: 0,
    };
  }

  /**
   * Estimate token count for text (rough approximation)
   */
  estimateTokens(text) {
    if (!text || typeof text !== 'string') return 0;
    
    // Rough estimation: 1 token ≈ 4 characters for English text
    // More accurate would use tiktoken or similar, but this is good enough for monitoring
    return Math.ceil(text.length / 4);
  }

  /**
   * Optimize prompts for cost efficiency while maintaining quality
   */
  optimizePromptForCosts(prompt) {
    if (!prompt || typeof prompt !== 'string') return prompt;

    let optimized = prompt;

    // Remove excessive whitespace and line breaks
    optimized = optimized.replace(/\n\s*\n/g, '\n').trim();

    // Remove redundant phrases common in prompts
    const redundantPhrases = [
      'Please note that',
      'It is important to',
      'Make sure to',
      'Be sure to',
      'Remember to',
      'Don\'t forget to',
      'You should',
      'I want you to',
      'Your task is to',
      'Please help me',
      'Can you please',
      'I need you to'
    ];

    for (const phrase of redundantPhrases) {
      const regex = new RegExp(phrase, 'gi');
      optimized = optimized.replace(regex, '');
    }

    // Replace verbose instructions with concise ones
    const replacements = [
      ['Generate a comprehensive and detailed', 'Generate'],
      ['Create a thorough analysis of', 'Analyze'],
      ['Provide a complete overview of', 'Overview of'],
      ['Make sure the output is', 'Output should be'],
      ['Ensure that the response', 'Response should'],
      ['It is crucial that', ''],
      ['Very important:', 'Important:'],
      ['extremely important', 'important'],
      ['absolutely essential', 'essential'],
      ['Return ONLY valid JSON in this exact format', 'Return JSON:'],
      ['No additional text outside the JSON', ''],
      ['must be under', '< '],
      ['characters or less', 'chars'],
      ['Generate unique', 'Generate'],
    ];

    for (const [verbose, concise] of replacements) {
      const regex = new RegExp(verbose, 'gi');
      optimized = optimized.replace(regex, concise);
    }

    // Clean up extra spaces
    optimized = optimized.replace(/\s+/g, ' ').trim();

    // Only use optimization if it saves significant tokens (>10%)
    const originalTokens = this.estimateTokens(prompt);
    const optimizedTokens = this.estimateTokens(optimized);
    const savings = (originalTokens - optimizedTokens) / originalTokens;

    if (savings > 0.1) {
      console.log(`💰 Prompt optimized: ${originalTokens} → ${optimizedTokens} tokens (${(savings * 100).toFixed(1)}% savings)`);
      return optimized;
    }

    return prompt; // Return original if optimization didn't help much
  }

  /**
   * Generate text with error recovery, provider switching, and graceful degradation
   */
  async generateTextWithFallback(prompt, options = {}) {
    const { tenant, maxRetries = 3, fallbackModels = [], fallbackProviders = [], enableRecovery = true, ...aiOptions } = options;

    // Use error recovery service if enabled
    if (enableRecovery) {
      try {
        const recoveryService = getAIErrorRecoveryService();

        const result = await recoveryService.executeWithRecovery(
          async (provider) => {
            // Temporarily switch to the specified provider
            const originalProvider = process.env.AI_PROVIDER;
            if (provider !== originalProvider) {
              process.env.AI_PROVIDER = provider;
            }

            try {
              const providerInstance = await getBaseProvider();
              const optimizedPrompt = this.optimizePromptForCosts(prompt);
              return await providerInstance.generateText(optimizedPrompt, aiOptions);
            } finally {
              // Restore original provider
              if (originalProvider) {
                process.env.AI_PROVIDER = originalProvider;
              }
            }
          },
          {
            provider: this.provider?.provider,
            maxRetries,
            enableProviderSwitching: fallbackProviders.length > 0,
            context: { tenant, operation: options.operation || 'generateText' }
          }
        );

        // Process successful result
        if (result && result.trim()) {
          const duration = Date.now() - Date.now(); // This would need proper timing
          const inputTokens = this.estimateTokens(prompt);
          const outputTokens = this.estimateTokens(result);

          // Record token usage
          if (tenant && options.operation) {
            await recordTokenUsage(tenant, options.operation, {
              inputTokens,
              outputTokens,
              totalTokens: inputTokens + outputTokens,
              provider: this.provider?.provider || 'unknown',
              model: aiOptions.model || 'default',
              prompt,
              response: result,
              duration,
              recoveryUsed: true
            });
          }

          console.log(`✅ AI generation with recovery succeeded`);
          return result;
        }
      } catch (recoveryError) {
        console.warn('Error recovery service failed, falling back to manual fallback:', recoveryError.message);
        // Continue to manual fallback logic below
      }
    }

    // Manual fallback logic (original implementation)
    const models = [aiOptions.model || 'default', ...fallbackModels];
    const providers = fallbackProviders.length > 0 ? fallbackProviders : [null]; // null means use current provider
    let lastError;
    let attempts = [];

    // Try each provider
    for (const fallbackProvider of providers) {
      let currentProvider = this.provider;

      // Switch to fallback provider if specified
      if (fallbackProvider) {
        try {
          console.log(`🔄 Switching to fallback provider: ${fallbackProvider}`);
          const { getAIProvider } = await import("../lib/aiProvider.js");

          // Temporarily switch provider
          const originalEnvProvider = process.env.AI_PROVIDER;
          process.env.AI_PROVIDER = fallbackProvider;

          try {
            currentProvider = await getAIProvider();
          } finally {
            // Restore original provider setting
            process.env.AI_PROVIDER = originalEnvProvider;
          }
        } catch (providerError) {
          console.warn(`❌ Failed to switch to provider ${fallbackProvider}: ${providerError.message}`);
          attempts.push({ provider: fallbackProvider, model: 'n/a', error: providerError.message });
          continue;
        }
      }

      // Try each model with current provider
      for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
        const model = models[modelIndex];
        const attemptInfo = {
          provider: currentProvider?.provider || fallbackProvider || 'current',
          model,
          error: null,
          success: false
        };

        try {
          // Create temporary provider service with fallback provider
          const tempProvider = { ...this };
          tempProvider.provider = currentProvider;

          const result = await tempProvider.generateText(prompt, {
            ...aiOptions,
            model,
            tenant,
            maxRetries: Math.min(maxRetries, 2) // Limit retries per provider/model combo
          });

          if (result && result.trim()) {
            attemptInfo.success = true;
            attempts.push(attemptInfo);

            if (fallbackProvider || modelIndex > 0) {
              console.log(`✅ Succeeded with fallback ${fallbackProvider || 'provider'}, model: ${model} after ${attempts.length} attempts`);
            }
            return result;
          } else {
            throw new Error('Empty response from AI provider');
          }
        } catch (error) {
          lastError = error;
          attemptInfo.error = error.message;
          attempts.push(attemptInfo);

          console.warn(`❌ Attempt failed - Provider: ${currentProvider?.provider || 'unknown'}, Model: ${model}, Error: ${error.message}`);

          // Don't retry with other models/providers if it's a budget error
          if (error.message.includes('Budget limit exceeded') ||
              error.message.includes('API key') ||
              error.message.includes('unauthorized')) {
            throw error;
          }

          // Add delay between model attempts
          if (modelIndex < models.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      // Add delay between provider attempts
      if (providers.indexOf(fallbackProvider) < providers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // All attempts failed - try graceful degradation as final fallback
    console.warn('All provider/model fallbacks failed, attempting graceful degradation');

    try {
      const { getAIDegradationService } = await import("./ai-graceful-degradation.js");
      const degradationService = getAIDegradationService();
      const result = await degradationService.generateWithDegradation(prompt, {
        ...options,
        fallbackStrategy: 'comprehensive'
      });

      if (result && result.content) {
        console.log(`✅ Graceful degradation provided fallback response (source: ${result.source})`);

        // Return result in expected format but indicate it's from fallback
        if (typeof result.content === 'string') {
          return result.content + (result.userMessage ? `\n\n[${result.userMessage}]` : '');
        }
        return result.content;
      }
    } catch (degradationError) {
      console.error('Graceful degradation also failed:', degradationError.message);
    }

    // Complete failure - all systems exhausted
    const errorDetails = attempts.map(a => `${a.provider}/${a.model}: ${a.error}`).join('; ');
    const finalError = new Error(`All fallback attempts failed including graceful degradation. Attempts: ${errorDetails}`);
    finalError.attempts = attempts;
    finalError.lastError = lastError;

    // Log with error handler
    const errorHandler = getAIErrorHandler();
    errorHandler.logError(finalError, {
      tenant: options.tenant,
      operation: 'generateTextWithFallback',
      attempts: attempts.length
    });

    console.error(`🚨 Complete AI failure - all systems exhausted:`, finalError);
    throw finalError;
  }

  /**
   * Batch generate with cost optimization and rate limiting
   */
  async batchGenerate(prompts, options = {}) {
    const { tenant, batchSize = 5, delayBetweenBatches = 1000 } = options;
    const results = [];
    
    // Process in batches to avoid rate limits and manage costs
    for (let i = 0; i < prompts.length; i += batchSize) {
      const batch = prompts.slice(i, i + batchSize);
      
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(prompts.length / batchSize)}`);
      
      const batchResults = await Promise.allSettled(
        batch.map((prompt, index) => 
          this.generateText(prompt, { 
            ...options, 
            tenant,
            operation: `batch_generation_${i + index}`
          })
        )
      );
      
      results.push(...batchResults);
      
      // Add delay between batches if not the last batch
      if (i + batchSize < prompts.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    return results;
  }
}

// Singleton instance for application-wide use
let aiProviderInstance = null;

/**
 * Get singleton AI provider instance
 */
export function getAIProviderService() {
  if (!aiProviderInstance) {
    aiProviderInstance = new AIProviderService();
  }
  return aiProviderInstance;
}

/**
 * Quick generation function with graceful degradation
 */
export async function generateAIContent(prompt, options = {}) {
  try {
    const service = getAIProviderService();
    return await service.generateText(prompt, options);
  } catch (error) {
    // Fallback to graceful degradation service
    console.warn('Primary AI generation failed, using graceful degradation:', error.message);

    try {
      const { getAIDegradationService } = await import("./ai-graceful-degradation.js");
      const degradationService = getAIDegradationService();
      const result = await degradationService.generateWithDegradation(prompt, options);

      // If we got a result from degradation service, return the content
      if (result && result.content) {
        return result.content;
      }
    } catch (degradationError) {
      console.error('Graceful degradation also failed:', degradationError.message);
    }

    // If all else fails, throw the original error
    throw error;
  }
}

/**
 * Validate AI provider configuration
 */
export function validateAIConfig() {
  const provider = (process.env.AI_PROVIDER || "").toLowerCase();
  const errors = [];

  if (!provider) {
    errors.push("AI_PROVIDER environment variable not set");
  }

  switch (provider) {
    case "openai":
      if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_KEY) {
        errors.push("OpenAI API key not found (OPENAI_API_KEY or OPENAI_KEY)");
      }
      break;
    case "anthropic":
      if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_KEY) {
        errors.push(
          "Anthropic API key not found (ANTHROPIC_API_KEY or ANTHROPIC_KEY)",
        );
      }
      break;
    case "google":
      if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
        errors.push("Gemini/Google API key not found (GEMINI_API_KEY or GOOGLE_API_KEY)");
      }
      break;
    default:
      errors.push(`Unsupported AI provider: ${provider}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    provider,
  };
}
