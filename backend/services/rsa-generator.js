/**
 * RSA Content Generator Service for ProofKit SaaS
 * Generates intelligent RSA content with 30/90 character validation
 */

import { getAIProviderService } from './ai-provider.js';
import { validateRSA } from '../lib/validators.js';

/**
 * RSA Content Generator with intelligent validation and optimization
 */
export class RSAContentGenerator {
  constructor() {
    this.aiService = getAIProviderService();
    this.generationStats = {
      totalGenerated: 0,
      validGenerated: 0,
      rejectedByValidation: 0
    };
  }

  /**
   * Generate RSA content for a specific theme/business
   */
  async generateRSAContent(options = {}) {
    const {
      theme = 'Business',
      industry = 'general',
      keywords = [],
      tone = 'professional',
      headlineCount = 15,
      descriptionCount = 4,
      includeOffers = true,
      includeBranding = true,
      playbookPrompt = '',
      targetCPA = null,
      targetROAS = null,
      businessStrategy = 'protect'
    } = options;

    const prompt = this.buildRSAPrompt({
      theme,
      industry,
      keywords,
      tone,
      headlineCount,
      descriptionCount,
      includeOffers,
      includeBranding,
      playbookPrompt,
      targetCPA,
      targetROAS,
      businessStrategy
    });

    try {
      const rawContent = await this.aiService.generateStructuredContent(prompt, 'json');
      
      if (!rawContent || !rawContent.headlines || !rawContent.descriptions) {
        throw new Error('Invalid response format from AI provider');
      }

      const processedContent = this.processAndValidateContent(rawContent);
      this.updateStats(processedContent);

      return {
        success: true,
        content: processedContent,
        stats: { ...this.generationStats }
      };
    } catch (error) {
      console.error('RSA generation failed:', error);
      return {
        success: false,
        error: error.message,
        fallback: this.generateFallbackContent(options)
      };
    }
  }

  /**
   * Build intelligent prompt for RSA generation
   */
  buildRSAPrompt(options) {
    const {
      theme,
      industry,
      keywords,
      tone,
      headlineCount,
      descriptionCount,
      includeOffers,
      includeBranding,
      playbookPrompt,
      targetCPA,
      targetROAS,
      businessStrategy
    } = options;

    const keywordText = keywords.length > 0 ? ` Focus on these keywords: ${keywords.join(', ')}.` : '';
    const offerText = includeOffers ? ' Include compelling offers and calls-to-action.' : '';
    const brandingText = includeBranding ? ' Include trust signals and brand elements.' : '';
    
    // Business strategy context
    let strategyText = '';
    if (playbookPrompt && playbookPrompt.trim()) {
      strategyText = ` Business Strategy Context: ${playbookPrompt.trim()}.`;
    }
    
    // Performance targets context
    let targetText = '';
    if (targetCPA || targetROAS) {
      const targets = [];
      if (targetCPA) targets.push(`target CPA of $${targetCPA}`);
      if (targetROAS) targets.push(`target ROAS of ${targetROAS}x`);
      targetText = ` Performance Targets: Optimize for ${targets.join(' and ')}.`;
    }
    
    // Strategy-based tone adjustment
    let adjustedTone = tone;
    if (businessStrategy === 'scale' || businessStrategy === 'grow') {
      adjustedTone = tone === 'professional' ? 'confident and growth-oriented' : `${tone} with growth focus`;
    } else if (businessStrategy === 'protect') {
      adjustedTone = tone === 'professional' ? 'trustworthy and reliable' : `${tone} with trust emphasis`;
    }

    return `Generate Google Ads RSA (Responsive Search Ads) content for a ${industry} business with theme "${theme}". 
    
Requirements:
- Generate ${headlineCount} unique headlines (each 30 characters or less)
- Generate ${descriptionCount} unique descriptions (each 90 characters or less)
- Use ${adjustedTone} tone
- Ensure variety in messaging and approaches
- Include strong calls-to-action
${keywordText}${offerText}${brandingText}${strategyText}${targetText}

${strategyText ? 'IMPORTANT: Align all messaging with the provided business strategy context.' : ''}
${targetText ? 'IMPORTANT: Create ads that will appeal to users likely to meet the performance targets.' : ''}

Return ONLY valid JSON in this exact format:
{
  "headlines": ["headline 1", "headline 2", ...],
  "descriptions": ["description 1", "description 2", ...]
}

Headlines must be under 30 characters. Descriptions must be under 90 characters. No additional text outside the JSON.`;
  }

  /**
   * Process and validate generated content
   */
  processAndValidateContent(rawContent) {
    const headlines = this.validateAndCleanHeadlines(rawContent.headlines || []);
    const descriptions = this.validateAndCleanDescriptions(rawContent.descriptions || []);

    // Use existing RSA validator for comprehensive validation
    const validation = validateRSA(headlines, descriptions);

    return {
      headlines: validation.clipped?.h || headlines,
      descriptions: validation.clipped?.d || descriptions,
      validation: validation,
      quality: this.assessContentQuality(headlines, descriptions),
      suggestions: this.generateImprovementSuggestions(headlines, descriptions)
    };
  }

  /**
   * Validate and clean headlines
   */
  validateAndCleanHeadlines(headlines) {
    return headlines
      .filter(h => typeof h === 'string' && h.trim().length > 0)
      .map(h => h.trim())
      .filter(h => h.length <= 30)
      .slice(0, 15); // Max 15 headlines for RSA
  }

  /**
   * Validate and clean descriptions
   */
  validateAndCleanDescriptions(descriptions) {
    return descriptions
      .filter(d => typeof d === 'string' && d.trim().length > 0)
      .map(d => d.trim())
      .filter(d => d.length <= 90)
      .slice(0, 4); // Max 4 descriptions for RSA
  }

  /**
   * Assess content quality
   */
  assessContentQuality(headlines, descriptions) {
    const score = {
      total: 0,
      breakdown: {
        variety: 0,
        length: 0,
        callsToAction: 0,
        keywordCoverage: 0
      }
    };

    // Variety assessment
    const uniqueHeadlines = new Set(headlines.map(h => h.toLowerCase()));
    const uniqueDescriptions = new Set(descriptions.map(d => d.toLowerCase()));
    score.breakdown.variety = Math.min(100, (uniqueHeadlines.size / headlines.length) * 100);

    // Length optimization assessment
    const avgHeadlineLength = headlines.reduce((sum, h) => sum + h.length, 0) / headlines.length;
    const avgDescriptionLength = descriptions.reduce((sum, d) => sum + d.length, 0) / descriptions.length;
    score.breakdown.length = Math.min(100, ((avgHeadlineLength / 30) + (avgDescriptionLength / 90)) * 50);

    // Call-to-action assessment
    const ctaWords = ['get', 'buy', 'shop', 'call', 'visit', 'try', 'start', 'learn', 'download', 'sign up'];
    const ctaCount = [...headlines, ...descriptions].filter(text => 
      ctaWords.some(cta => text.toLowerCase().includes(cta))
    ).length;
    score.breakdown.callsToAction = Math.min(100, (ctaCount / (headlines.length + descriptions.length)) * 200);

    score.total = Object.values(score.breakdown).reduce((sum, val) => sum + val, 0) / Object.keys(score.breakdown).length;

    return score;
  }

  /**
   * Generate improvement suggestions
   */
  generateImprovementSuggestions(headlines, descriptions) {
    const suggestions = [];

    if (headlines.length < 10) {
      suggestions.push('Consider generating more headlines for better ad performance');
    }

    if (descriptions.length < 3) {
      suggestions.push('Add more descriptions to provide Google with more options');
    }

    const shortHeadlines = headlines.filter(h => h.length < 20).length;
    if (shortHeadlines / headlines.length > 0.7) {
      suggestions.push('Consider using more characters in headlines for better messaging');
    }

    const shortDescriptions = descriptions.filter(d => d.length < 60).length;
    if (shortDescriptions / descriptions.length > 0.5) {
      suggestions.push('Consider longer descriptions to provide more compelling details');
    }

    return suggestions;
  }

  /**
   * Generate fallback content when AI fails
   */
  generateFallbackContent(options) {
    const { theme = 'Business', industry = 'general' } = options;
    
    return {
      headlines: [
        `${theme} Solutions`,
        `Best ${theme} Service`,
        `${theme} Experts`,
        `Quality ${theme}`,
        `${theme} Deals`,
        `Top ${theme} Choice`,
        `${theme} Specialists`,
        `Trusted ${theme}`,
        `${theme} Online`,
        `${theme} Today`
      ].slice(0, 10),
      descriptions: [
        `Professional ${theme.toLowerCase()} services for your business. Get started today.`,
        `Quality ${theme.toLowerCase()} solutions with expert support. Contact us now.`,
        `Trusted ${theme.toLowerCase()} provider with proven results. Learn more today.`
      ],
      validation: { ok: true, errors: [], warnings: [] },
      quality: { total: 60, breakdown: { variety: 60, length: 60, callsToAction: 60, keywordCoverage: 60 } },
      suggestions: ['This is fallback content. Configure AI provider for better results.']
    };
  }

  /**
   * Generate theme-specific variations
   */
  async generateThemeVariations(baseTheme, variationCount = 3) {
    const variations = [];
    
    for (let i = 0; i < variationCount; i++) {
      const prompt = `Generate ${i + 1} unique variation of the theme "${baseTheme}" for advertising. Return only the theme name, no additional text.`;
      
      try {
        const variation = await this.aiService.generateText(prompt);
        if (variation && variation.trim().length > 0) {
          variations.push(variation.trim());
        }
      } catch (error) {
        console.warn(`Failed to generate variation ${i + 1}:`, error);
      }
    }

    // Add fallback variations if AI failed
    if (variations.length === 0) {
      variations.push(
        `${baseTheme} Pro`,
        `${baseTheme} Plus`,
        `${baseTheme} Expert`
      );
    }

    return variations.slice(0, variationCount);
  }

  /**
   * Update generation statistics
   */
  updateStats(content) {
    this.generationStats.totalGenerated++;
    
    if (content.validation?.ok) {
      this.generationStats.validGenerated++;
    } else {
      this.generationStats.rejectedByValidation++;
    }
  }

  /**
   * Get generation statistics
   */
  getStats() {
    return { ...this.generationStats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.generationStats = {
      totalGenerated: 0,
      validGenerated: 0,
      rejectedByValidation: 0
    };
  }
}

// Export singleton instance
let rsaGeneratorInstance = null;

/**
 * Get singleton RSA generator instance
 */
export function getRSAGenerator() {
  if (!rsaGeneratorInstance) {
    rsaGeneratorInstance = new RSAContentGenerator();
  }
  return rsaGeneratorInstance;
}

/**
 * Quick generation function for simple use cases
 */
export async function generateRSA(theme, options = {}) {
  const generator = getRSAGenerator();
  return await generator.generateRSAContent({ theme, ...options });
}

/**
 * Batch generate RSA content for multiple themes
 */
export async function batchGenerateRSA(themes, options = {}) {
  const generator = getRSAGenerator();
  const results = [];

  for (const theme of themes) {
    try {
      const result = await generator.generateRSAContent({ theme, ...options });
      results.push({ theme, ...result });
    } catch (error) {
      results.push({ 
        theme, 
        success: false, 
        error: error.message,
        fallback: generator.generateFallbackContent({ theme, ...options })
      });
    }
  }

  return results;
}