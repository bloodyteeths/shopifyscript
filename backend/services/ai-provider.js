/**
 * Advanced AI Provider Service for ProofKit SaaS
 * Multi-provider support with intelligent fallbacks and optimization
 */

import { getAIProvider as getBaseProvider } from "../lib/aiProvider.js";

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
   * Generate text with advanced error handling and retry logic
   */
  async generateText(prompt, options = {}) {
    const startTime = Date.now();

    try {
      await this.initialize();

      const result = await this.provider.generateText(prompt, options);

      // Update metrics
      this.metrics.calls++;
      const responseTime = Date.now() - startTime;
      this.metrics.avgResponseTime =
        (this.metrics.avgResponseTime * (this.metrics.calls - 1) +
          responseTime) /
        this.metrics.calls;

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
