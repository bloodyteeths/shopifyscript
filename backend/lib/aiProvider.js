import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Multi-provider AI service supporting OpenAI, Anthropic, and Google AI
 * Provides unified interface for content generation across different providers
 */

class AIProviderError extends Error {
  constructor(message, provider = "unknown") {
    super(message);
    this.name = "AIProviderError";
    this.provider = provider;
  }
}

/**
 * OpenAI provider implementation
 */
async function createOpenAIProvider() {
  const key = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  if (!key) throw new AIProviderError("OpenAI API key required", "openai");

  const model = process.env.AI_MODEL || "gpt-4o-mini";
  const temperature = Number(process.env.AI_TEMPERATURE || 0.7);
  const maxTokens = Number(process.env.AI_MAX_TOKENS || 1024);
  const maxCalls = Number(process.env.AI_MAX_CALLS_PER_RUN || 20);

  let calls = 0;

  async function generateText(prompt, options = {}) {
    if (calls >= maxCalls) return "";
    calls += 1;

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: options.model || model,
            messages: [{ role: "user", content: prompt }],
            temperature: options.temperature ?? temperature,
            max_tokens: options.maxTokens ?? maxTokens,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } catch (error) {
      console.error("OpenAI generation error:", error);
      return "";
    }
  }

  return {
    provider: "openai",
    generateText,
    remainingCalls: () => maxCalls - calls,
  };
}

/**
 * Anthropic provider implementation
 */
async function createAnthropicProvider() {
  const key = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_KEY;
  if (!key)
    throw new AIProviderError("Anthropic API key required", "anthropic");

  const model = process.env.AI_MODEL || "claude-3-haiku-20240307";
  const temperature = Number(process.env.AI_TEMPERATURE || 0.7);
  const maxTokens = Number(process.env.AI_MAX_TOKENS || 1024);
  const maxCalls = Number(process.env.AI_MAX_CALLS_PER_RUN || 20);

  let calls = 0;

  async function generateText(prompt, options = {}) {
    if (calls >= maxCalls) return "";
    calls += 1;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": key,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: options.model || model,
          max_tokens: options.maxTokens ?? maxTokens,
          temperature: options.temperature ?? temperature,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = await response.json();
      return data.content?.[0]?.text || "";
    } catch (error) {
      console.error("Anthropic generation error:", error);
      return "";
    }
  }

  return {
    provider: "anthropic",
    generateText,
    remainingCalls: () => maxCalls - calls,
  };
}

/**
 * Google AI provider implementation (enhanced from existing)
 */
async function createGoogleProvider() {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new AIProviderError("Google API key required", "google");

  const modelName = process.env.AI_MODEL || "gemini-1.5-flash";
  const temperature = Number(process.env.AI_TEMPERATURE || 0.4);
  const maxTokens = Number(process.env.AI_MAX_TOKENS || 1024);
  const maxCalls = Number(process.env.AI_MAX_CALLS_PER_RUN || 20);

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: modelName });
  let calls = 0;

  async function generateText(prompt, options = {}) {
    if (calls >= maxCalls) return "";
    calls += 1;

    try {
      const resp = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature ?? temperature,
          maxOutputTokens: options.maxTokens ?? maxTokens,
        },
      });
      return resp?.response?.text?.() || "";
    } catch (error) {
      console.error("Google AI generation error:", error);
      return "";
    }
  }

  return {
    provider: "google",
    generateText,
    remainingCalls: () => maxCalls - calls,
  };
}

/**
 * Get AI provider instance based on configuration
 * Supports fallback providers if primary fails
 */
export async function getAIProvider() {
  const provider = (process.env.AI_PROVIDER || "").toLowerCase();
  const fallbackProviders = (process.env.AI_FALLBACK_PROVIDERS || "")
    .toLowerCase()
    .split(",")
    .filter(Boolean);

  const providers = [provider, ...fallbackProviders].filter(Boolean);

  for (const p of providers) {
    try {
      switch (p) {
        case "openai":
          return await createOpenAIProvider();
        case "anthropic":
          return await createAnthropicProvider();
        case "google":
          return await createGoogleProvider();
        default:
          continue;
      }
    } catch (error) {
      console.warn(`Failed to initialize ${p} provider:`, error.message);
      continue;
    }
  }

  throw new AIProviderError(
    "No AI provider available. Set AI_PROVIDER to openai, anthropic, or google with corresponding API key.",
  );
}

/**
 * Legacy sync function for backward compatibility
 */
export function getAIProviderSync() {
  const provider = (process.env.AI_PROVIDER || "").toLowerCase();

  if (provider === "google") {
    const key = process.env.GOOGLE_API_KEY || "";
    if (!key)
      throw new Error(
        "AI disabled: set AI_PROVIDER=google and GOOGLE_API_KEY (see /docs/SECRETS.md).",
      );

    const modelName = process.env.AI_MODEL || "gemini-1.5-flash";
    const temperature = Number(process.env.AI_TEMPERATURE || 0.4);
    const maxCalls = Number(process.env.AI_MAX_CALLS_PER_RUN || 20);
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: modelName });
    let calls = 0;

    async function generateText(prompt) {
      if (calls >= maxCalls) return "";
      calls += 1;
      const resp = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens: 1024 },
      });
      return resp?.response?.text?.() || "";
    }

    return { provider: "google", generateText };
  }

  throw new Error(
    "AI disabled: set AI_PROVIDER=google and GOOGLE_API_KEY (see /docs/SECRETS.md).",
  );
}
