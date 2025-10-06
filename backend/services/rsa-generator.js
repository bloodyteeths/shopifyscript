/**
 * RSA Content Generator Service for Ads Autopilot AI SaaS
 * Generates intelligent RSA content with 30/90 character validation
 * Now enhanced with website content extraction for dynamic, specific ads
 */

import { getAIProviderService } from "./ai-provider.js";
import { validateRSA } from "../lib/validators.js";
import { getContentIndexer } from "./content-indexer.js";
import { getDynamicCopyGenerator } from "./dynamic-copy.js";
import { getABTestingService } from "./ab-tester.js";
import { getMessageAdapter } from "./message-adapter.js";

/**
 * RSA Content Generator with intelligent validation and optimization
 */
export class RSAContentGenerator {
  constructor() {
    this.aiService = getAIProviderService();
    this.contentIndexer = getContentIndexer();
    this.dynamicCopyGenerator = getDynamicCopyGenerator();
    this.abTester = getABTestingService();
    this.messageAdapter = getMessageAdapter();
    this.generationStats = {
      totalGenerated: 0,
      validGenerated: 0,
      rejectedByValidation: 0,
      withWebsiteContent: 0,
      withDynamicCopy: 0,
      withSegmentation: 0,
      withABTesting: 0,
    };
  }

  /**
   * Generate RSA content for a specific theme/business
   * Enhanced with ALL data sources and dynamic copy generation
   */
  async generateRSAContent(options = {}) {
    const {
      theme = "Business",
      industry = "general",
      keywords = [],
      tone = "professional",
      headlineCount = 15,
      descriptionCount = 4,
      includeOffers = true,
      includeBranding = true,
      playbookPrompt = "",
      targetCPA = null,
      targetROAS = null,
      businessStrategy = "protect",
      tenant = null,
      useWebsiteContent = true,
      useDynamicCopy = true,
      generateVariations = true,
      createABTest = false,
      targetSegment = null,
    } = options;

    try {
      // ENHANCED: Use dynamic copy generator if available and tenant is provided
      if (tenant && useDynamicCopy) {
        console.log('Using dynamic copy generator with ALL data sources');

        // Generate comprehensive copy using all 5 data sources
        const dynamicResult = await this.dynamicCopyGenerator.generateComprehensiveCopy(tenant, {
          theme,
          industry,
          keywords,
          headlineCount,
          descriptionCount,
          generateVariations,
          includeAllSegments: !targetSegment,
          targetSegment,
          includeTimeVariations: true
        });

        if (dynamicResult.success) {
          this.generationStats.withDynamicCopy++;
          if (dynamicResult.dataSources.customerSegmentation) {
            this.generationStats.withSegmentation++;
          }

          // Process and validate the generated copy
          const processedContent = this.processAndValidateContent(dynamicResult.baseCopy);

          // Optionally create A/B test with variations
          let abTest = null;
          if (createABTest && generateVariations && dynamicResult.variations) {
            abTest = await this._createABTestFromVariations(tenant, theme, {
              base: processedContent,
              variations: dynamicResult.variations
            });

            if (abTest && abTest.success) {
              this.generationStats.withABTesting++;
            }
          }

          this.updateStats(processedContent);

          return {
            success: true,
            content: processedContent,

            // Include all variations
            variations: dynamicResult.variations,

            // Data source information
            dataSources: dynamicResult.dataSources,

            // Quality metrics
            qualityScores: dynamicResult.qualityScores,

            // A/B test info
            abTest,

            // Metadata
            metadata: dynamicResult.metadata,
            recommendations: dynamicResult.recommendations,

            // Stats
            stats: { ...this.generationStats }
          };
        }
      }

      // FALLBACK: Use original method if dynamic copy fails or is not enabled
      console.log('Using standard RSA generation method');

      // Try to get website content for this tenant
      let websiteContent = null;
      if (tenant && useWebsiteContent) {
        try {
          websiteContent = await this.contentIndexer.getAllContentForAds(tenant);
          if (websiteContent && websiteContent.totalItems > 0) {
            this.generationStats.withWebsiteContent++;
            console.log(`Using ${websiteContent.totalItems} website content items for RSA generation`);
          }
        } catch (error) {
          console.warn('Failed to fetch website content, using generic generation:', error.message);
        }
      }

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
        businessStrategy,
        websiteContent,
      });

      const rawContent = await this.aiService.generateStructuredContent(
        prompt,
        "json",
      );

      if (!rawContent || !rawContent.headlines || !rawContent.descriptions) {
        throw new Error("Invalid response format from AI provider");
      }

      const processedContent = this.processAndValidateContent(rawContent);
      this.updateStats(processedContent);

      return {
        success: true,
        content: processedContent,
        stats: { ...this.generationStats },
        usedWebsiteContent: !!websiteContent,
        websiteContentSummary: websiteContent ? {
          products: websiteContent.products.length,
          testimonials: websiteContent.testimonials.length,
          offers: websiteContent.offers.length,
          usps: websiteContent.usps.length
        } : null
      };
    } catch (error) {
      console.error("RSA generation failed:", error);
      return {
        success: false,
        error: error.message,
        fallback: this.generateFallbackContent(options),
      };
    }
  }

  /**
   * Build intelligent prompt for RSA generation
   * Enhanced with website content for specific, compelling ads
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
      businessStrategy,
      websiteContent,
    } = options;

    const keywordText =
      keywords.length > 0
        ? ` Focus on these keywords: ${keywords.join(", ")}.`
        : "";
    const offerText = includeOffers
      ? " Include compelling offers and calls-to-action."
      : "";
    const brandingText = includeBranding
      ? " Include trust signals and brand elements."
      : "";

    // Business strategy context
    let strategyText = "";
    if (playbookPrompt && playbookPrompt.trim()) {
      strategyText = ` Business Strategy Context: ${playbookPrompt.trim()}.`;
    }

    // Performance targets context
    let targetText = "";
    if (targetCPA || targetROAS) {
      const targets = [];
      if (targetCPA) targets.push(`target CPA of $${targetCPA}`);
      if (targetROAS) targets.push(`target ROAS of ${targetROAS}x`);
      targetText = ` Performance Targets: Optimize for ${targets.join(" and ")}.`;
    }

    // Website content context (NEW!)
    let websiteContentText = "";
    if (websiteContent && websiteContent.totalItems > 0) {
      websiteContentText = this.buildWebsiteContentContext(websiteContent);
    }

    // Strategy-based tone adjustment
    let adjustedTone = tone;
    if (businessStrategy === "scale" || businessStrategy === "grow") {
      adjustedTone =
        tone === "professional"
          ? "confident and growth-oriented"
          : `${tone} with growth focus`;
    } else if (businessStrategy === "protect") {
      adjustedTone =
        tone === "professional"
          ? "trustworthy and reliable"
          : `${tone} with trust emphasis`;
    }

    return `Generate Google Ads RSA (Responsive Search Ads) content for a ${industry} business with theme "${theme}".

Requirements:
- Generate ${headlineCount} unique headlines (each 30 characters or less)
- Generate ${descriptionCount} unique descriptions (each 90 characters or less)
- Use ${adjustedTone} tone
- Ensure variety in messaging and approaches
- Include strong calls-to-action
${keywordText}${offerText}${brandingText}${strategyText}${targetText}

${websiteContentText}

${strategyText ? "IMPORTANT: Align all messaging with the provided business strategy context." : ""}
${targetText ? "IMPORTANT: Create ads that will appeal to users likely to meet the performance targets." : ""}
${websiteContentText ? "IMPORTANT: Use the actual website content provided above to create specific, compelling ads. Reference real products, offers, and USPs." : ""}

Return ONLY valid JSON in this exact format:
{
  "headlines": ["headline 1", "headline 2", ...],
  "descriptions": ["description 1", "description 2", ...]
}

Headlines must be under 30 characters. Descriptions must be under 90 characters. No additional text outside the JSON.`;
  }

  /**
   * Build website content context for AI prompt
   */
  buildWebsiteContentContext(websiteContent) {
    let context = "\n\nWEBSITE CONTENT (Use this real business data to create specific ads):\n";

    // Add products
    if (websiteContent.products && websiteContent.products.length > 0) {
      context += "\nProducts/Services:\n";
      websiteContent.products.slice(0, 5).forEach(product => {
        const item = product.metadata || product;
        context += `- ${product.title || item.name}`;
        if (item.price) context += ` ($${item.price})`;
        if (product.content) context += ` - ${product.content.substring(0, 100)}`;
        context += "\n";
      });
    }

    // Add USPs
    if (websiteContent.usps && websiteContent.usps.length > 0) {
      context += "\nUnique Selling Points:\n";
      websiteContent.usps.slice(0, 5).forEach(usp => {
        context += `- ${usp.title || usp.content}\n`;
      });
    }

    // Add offers
    if (websiteContent.offers && websiteContent.offers.length > 0) {
      context += "\nCurrent Offers:\n";
      websiteContent.offers.slice(0, 3).forEach(offer => {
        context += `- ${offer.title || offer.content}\n`;
      });
    }

    // Add guarantees
    if (websiteContent.guarantees && websiteContent.guarantees.length > 0) {
      context += "\nGuarantees:\n";
      websiteContent.guarantees.slice(0, 2).forEach(guarantee => {
        context += `- ${guarantee.title || guarantee.content}\n`;
      });
    }

    // Add winning hooks
    if (websiteContent.hooks && websiteContent.hooks.length > 0) {
      context += "\nWinning Headlines/Hooks from Website:\n";
      websiteContent.hooks.slice(0, 5).forEach(hook => {
        context += `- ${hook.title || hook.content}\n`;
      });
    }

    // Add CTAs
    if (websiteContent.ctas && websiteContent.ctas.length > 0) {
      context += "\nEffective CTAs from Website:\n";
      context += websiteContent.ctas.slice(0, 5).join(", ") + "\n";
    }

    // Add brand voice if available
    if (websiteContent.brandVoice && websiteContent.brandVoice.primaryTone) {
      context += `\nBrand Voice: ${websiteContent.brandVoice.primaryTone} tone`;
      if (websiteContent.brandVoice.commonPhrases && websiteContent.brandVoice.commonPhrases.length > 0) {
        context += `\nCommon Phrases: ${websiteContent.brandVoice.commonPhrases.slice(0, 3).map(p => p.phrase).join(", ")}`;
      }
      context += "\n";
    }

    // Add testimonial snippets
    if (websiteContent.testimonials && websiteContent.testimonials.length > 0) {
      context += "\nCustomer Testimonials (for social proof in descriptions):\n";
      websiteContent.testimonials.slice(0, 2).forEach(testimonial => {
        const snippet = (testimonial.content || testimonial.title).substring(0, 80);
        context += `- "${snippet}..." - ${testimonial.metadata?.author || 'Customer'}\n`;
      });
    }

    return context;
  }

  /**
   * Process and validate generated content
   */
  processAndValidateContent(rawContent) {
    const headlines = this.validateAndCleanHeadlines(
      rawContent.headlines || [],
    );
    const descriptions = this.validateAndCleanDescriptions(
      rawContent.descriptions || [],
    );

    // Use existing RSA validator for comprehensive validation
    const validation = validateRSA(headlines, descriptions);

    return {
      headlines: validation.clipped?.h || headlines,
      descriptions: validation.clipped?.d || descriptions,
      validation: validation,
      quality: this.assessContentQuality(headlines, descriptions),
      suggestions: this.generateImprovementSuggestions(headlines, descriptions),
    };
  }

  /**
   * Validate and clean headlines
   */
  validateAndCleanHeadlines(headlines) {
    return headlines
      .filter((h) => typeof h === "string" && h.trim().length > 0)
      .map((h) => h.trim())
      .filter((h) => h.length <= 30)
      .slice(0, 15); // Max 15 headlines for RSA
  }

  /**
   * Validate and clean descriptions
   */
  validateAndCleanDescriptions(descriptions) {
    return descriptions
      .filter((d) => typeof d === "string" && d.trim().length > 0)
      .map((d) => d.trim())
      .filter((d) => d.length <= 90)
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
        keywordCoverage: 0,
      },
    };

    // Variety assessment
    const uniqueHeadlines = new Set(headlines.map((h) => h.toLowerCase()));
    const uniqueDescriptions = new Set(
      descriptions.map((d) => d.toLowerCase()),
    );
    score.breakdown.variety = Math.min(
      100,
      (uniqueHeadlines.size / headlines.length) * 100,
    );

    // Length optimization assessment
    const avgHeadlineLength =
      headlines.reduce((sum, h) => sum + h.length, 0) / headlines.length;
    const avgDescriptionLength =
      descriptions.reduce((sum, d) => sum + d.length, 0) / descriptions.length;
    score.breakdown.length = Math.min(
      100,
      (avgHeadlineLength / 30 + avgDescriptionLength / 90) * 50,
    );

    // Call-to-action assessment
    const ctaWords = [
      "get",
      "buy",
      "shop",
      "call",
      "visit",
      "try",
      "start",
      "learn",
      "download",
      "sign up",
    ];
    const ctaCount = [...headlines, ...descriptions].filter((text) =>
      ctaWords.some((cta) => text.toLowerCase().includes(cta)),
    ).length;
    score.breakdown.callsToAction = Math.min(
      100,
      (ctaCount / (headlines.length + descriptions.length)) * 200,
    );

    score.total =
      Object.values(score.breakdown).reduce((sum, val) => sum + val, 0) /
      Object.keys(score.breakdown).length;

    return score;
  }

  /**
   * Generate improvement suggestions
   */
  generateImprovementSuggestions(headlines, descriptions) {
    const suggestions = [];

    if (headlines.length < 10) {
      suggestions.push(
        "Consider generating more headlines for better ad performance",
      );
    }

    if (descriptions.length < 3) {
      suggestions.push(
        "Add more descriptions to provide Google with more options",
      );
    }

    const shortHeadlines = headlines.filter((h) => h.length < 20).length;
    if (shortHeadlines / headlines.length > 0.7) {
      suggestions.push(
        "Consider using more characters in headlines for better messaging",
      );
    }

    const shortDescriptions = descriptions.filter((d) => d.length < 60).length;
    if (shortDescriptions / descriptions.length > 0.5) {
      suggestions.push(
        "Consider longer descriptions to provide more compelling details",
      );
    }

    return suggestions;
  }

  /**
   * Generate fallback content when AI fails
   */
  generateFallbackContent(options) {
    const { theme = "Business", industry = "general" } = options;

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
        `${theme} Today`,
      ].slice(0, 10),
      descriptions: [
        `Professional ${theme.toLowerCase()} services for your business. Get started today.`,
        `Quality ${theme.toLowerCase()} solutions with expert support. Contact us now.`,
        `Trusted ${theme.toLowerCase()} provider with proven results. Learn more today.`,
      ],
      validation: { ok: true, errors: [], warnings: [] },
      quality: {
        total: 60,
        breakdown: {
          variety: 60,
          length: 60,
          callsToAction: 60,
          keywordCoverage: 60,
        },
      },
      suggestions: [
        "This is fallback content. Configure AI provider for better results.",
      ],
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
        `${baseTheme} Expert`,
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
      rejectedByValidation: 0,
      withWebsiteContent: 0,
      withDynamicCopy: 0,
      withSegmentation: 0,
      withABTesting: 0,
    };
  }

  /**
   * Create A/B test from generated variations
   * @private
   */
  async _createABTestFromVariations(tenantId, theme, copyData) {
    try {
      const { base, variations } = copyData;

      // Create test variants from base + top variations
      const testVariants = [
        {
          name: 'Base Copy',
          headlines: base.headlines,
          descriptions: base.descriptions
        }
      ];

      // Add segment variations (top 2)
      if (variations.bySegment) {
        const segmentKeys = Object.keys(variations.bySegment).slice(0, 2);
        segmentKeys.forEach((segment, idx) => {
          const segmentCopy = variations.bySegment[segment];
          testVariants.push({
            name: `${segment} Segment`,
            headlines: segmentCopy.headlines || base.headlines,
            descriptions: segmentCopy.descriptions || base.descriptions
          });
        });
      }

      // Add time variation
      if (variations.byTime) {
        const timeKeys = Object.keys(variations.byTime).slice(0, 1);
        if (timeKeys.length > 0) {
          const timeCopy = variations.byTime[timeKeys[0]];
          testVariants.push({
            name: `${timeKeys[0]} Time-Optimized`,
            headlines: timeCopy.headlines || base.headlines,
            descriptions: timeCopy.descriptions || base.descriptions
          });
        }
      }

      // Create A/B test
      const testResult = await this.abTester.createTest(tenantId, {
        name: `RSA Copy Test - ${theme}`,
        description: `A/B test for ${theme} RSA variations`,
        variants: testVariants.slice(0, 4), // Max 4 variants
        metric: 'ctr',
        duration: 14
      });

      return testResult;

    } catch (error) {
      console.error('Failed to create A/B test from variations:', error);
      return null;
    }
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
        fallback: generator.generateFallbackContent({ theme, ...options }),
      });
    }
  }

  return results;
}
