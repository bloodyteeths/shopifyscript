/**
 * Advanced AI Provider Service for ProofKit SaaS
 * Multi-provider support with intelligent fallbacks and optimization
 */

import { getAIProvider as getBaseProvider } from "../lib/aiProvider.js";
import { recordTokenUsage, checkBudgetLimit } from "./token-monitor.js";

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
   * Generate text with advanced error handling, retry logic, and token monitoring
   */
  async generateText(prompt, options = {}) {
    const { tenant, operation = 'text_generation', ...aiOptions } = options;
    const startTime = Date.now();
    
    // Check budget limits if tenant provided
    if (tenant) {
      const budgetCheck = checkBudgetLimit(tenant, this.estimateTokens(prompt));
      if (!budgetCheck.allowed) {
        console.warn(`🚫 AI request blocked for ${tenant}: ${budgetCheck.reason}`);
        throw new Error(`Budget limit exceeded: ${budgetCheck.reason}. Remaining: $${budgetCheck.remaining?.toFixed(2)}`);
      }
    }

    try {
      await this.initialize();

      // Optimize prompt for cost efficiency
      const optimizedPrompt = this.optimizePromptForCosts(prompt);
      const result = await this.provider.generateText(optimizedPrompt, aiOptions);

      // Calculate token usage
      const duration = Date.now() - startTime;
      const inputTokens = this.estimateTokens(optimizedPrompt);
      const outputTokens = this.estimateTokens(result);
      
      // Record token usage if tenant provided
      if (tenant && operation) {
        await recordTokenUsage(tenant, operation, {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          provider: this.provider?.provider || 'unknown',
          model: aiOptions.model || 'default',
          prompt: optimizedPrompt,
          response: result,
          duration
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

      console.log(`✅ AI generation completed: ${inputTokens + outputTokens} tokens, ${duration}ms`);
      return result;
    } catch (error) {
      this.metrics.failures++;
      console.error("AI generation failed:", error);

      // Return empty string on failure to maintain compatibility
      return "";
    }
  }

  /**
   * Generate structured content with validation
   */
  async generateStructuredContent(prompt, expectedFormat = "json") {
    const content = await this.generateText(prompt);

    if (!content) return null;

    try {
      if (expectedFormat === "json") {
        return JSON.parse(content);
      }
      return content;
    } catch (error) {
      console.warn("Failed to parse structured content:", error);
      return content; // Return raw content if parsing fails
    }
  }

  /**
   * Generate multiple variations in parallel
   */
  async generateVariations(basePrompt, count = 3, options = {}) {
    const promises = Array(count)
      .fill(null)
      .map((_, i) =>
        this.generateText(`${basePrompt} (Variation ${i + 1})`, options),
      );

    try {
      const results = await Promise.all(promises);
      return results.filter((result) => result && result.trim().length > 0);
    } catch (error) {
      console.error("Failed to generate variations:", error);
      return [];
    }
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
   * Generate text with automatic retry and fallback models for cost optimization
   */
  async generateTextWithFallback(prompt, options = {}) {
    const { tenant, maxRetries = 2, fallbackModels = [], ...aiOptions } = options;
    
    const models = [aiOptions.model || 'default', ...fallbackModels];
    let lastError;

    for (let i = 0; i < Math.min(models.length, maxRetries + 1); i++) {
      try {
        const modelOptions = { ...aiOptions, model: models[i] };
        const result = await this.generateText(prompt, { tenant, ...modelOptions });
        
        if (result && result.trim()) {
          if (i > 0) {
            console.log(`✅ Succeeded with fallback model ${models[i]} after ${i} attempts`);
          }
          return result;
        }
      } catch (error) {
        lastError = error;
        console.warn(`❌ Attempt ${i + 1} failed with model ${models[i]}: ${error.message}`);
        
        // If it's a budget error, don't retry
        if (error.message.includes('Budget limit exceeded')) {
          throw error;
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
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
 * Quick generation function for simple use cases
 */
export async function generateAIContent(prompt, options = {}) {
  const service = getAIProviderService();
  return await service.generateText(prompt, options);
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
      if (!process.env.GOOGLE_API_KEY) {
        errors.push("Google API key not found (GOOGLE_API_KEY)");
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
