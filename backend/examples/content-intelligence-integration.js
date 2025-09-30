/**
 * ProofKit Content Intelligence Integration Example
 * Demonstrates how to use all NLP services together for comprehensive ad copy analysis
 */

import { getWebsiteScraper } from '../services/website-scraper.js';
import { getContentIntelligence } from '../services/content-intelligence.js';
import { getBrandVoice } from '../services/brand-voice.js';
import { getKeywordMiner } from '../services/keyword-miner.js';
import { getContentOptimizer } from '../services/content-optimizer.js';

/**
 * Complete Content Intelligence Analysis Pipeline
 * This function shows how to integrate all services for ad copy generation
 */
export async function analyzeWebsiteForAdCopy(websiteUrl, options = {}) {
  const {
    tenant = 'example-tenant',
    industry = null,
    targetAudience = null,
    competitorUrls = [],
    adCampaignType = 'search', // 'search', 'display', 'social'
  } = options;

  console.log(`🚀 Starting comprehensive analysis for: ${websiteUrl}`);

  try {
    // Step 1: Scrape website content
    console.log('📄 Step 1: Scraping website content...');
    const scraper = getWebsiteScraper();
    const websiteContent = await scraper.scrapeWebsite(websiteUrl, {
      tenant,
      includeProducts: true,
      includeTestimonials: true,
      includeOffers: true,
      includeBrandVoice: true
    });

    console.log(`   ✅ Scraped ${websiteContent.metadata.pagesScraped} pages`);
    console.log(`   ✅ Found ${websiteContent.products.length} products`);
    console.log(`   ✅ Found ${websiteContent.testimonials.length} testimonials`);

    // Step 2: Analyze content intelligence
    console.log('\n🧠 Step 2: Analyzing content intelligence...');
    const contentIntelligence = getContentIntelligence();
    const contentAnalysis = await contentIntelligence.analyzeContent(websiteContent, {
      includeHooks: true,
      includeSentiment: true,
      includeReadability: true,
      includeTones: true,
      includePowerWords: true,
      includeTopics: true,
      cacheKey: `content-${tenant}-${websiteUrl}`
    });

    console.log(`   ✅ Content effectiveness: ${contentAnalysis.effectiveness?.percentage}%`);
    console.log(`   ✅ Sentiment: ${contentAnalysis.sentiment?.overall?.label}`);
    console.log(`   ✅ Power words found: ${contentAnalysis.powerWords?.overall?.count}`);

    // Step 3: Generate brand voice profile
    console.log('\n🎨 Step 3: Generating brand voice profile...');
    const brandVoice = getBrandVoice();
    const brandProfile = await brandVoice.generateBrandProfile(websiteContent, {
      includeArchetype: true,
      includeToneProfile: true,
      includeVocabulary: true,
      includeConsistency: true,
      includeGuidelines: true,
      cacheKey: `brand-${tenant}-${websiteUrl}`
    });

    console.log(`   ✅ Brand archetype: ${brandProfile.archetype?.primary?.archetype}`);
    console.log(`   ✅ Voice consistency: ${brandProfile.consistency?.overall?.score}%`);
    console.log(`   ✅ Brand strength: ${brandProfile.brandStrength?.grade}`);

    // Step 4: Mine keywords
    console.log('\n🔍 Step 4: Mining keywords...');
    const keywordMiner = getKeywordMiner();
    const keywordAnalysis = await keywordMiner.mineKeywords(websiteContent, {
      includeSemanticKeywords: true,
      includeLongTail: true,
      includeIntentClassification: true,
      includeClustering: true,
      includeNegativeKeywords: true,
      includeOpportunities: true,
      industry,
      targetAudience,
      cacheKey: `keywords-${tenant}-${websiteUrl}`
    });

    console.log(`   ✅ Primary keywords: ${keywordAnalysis.semanticKeywords?.primary?.length || 0}`);
    console.log(`   ✅ Long-tail opportunities: ${keywordAnalysis.longTailKeywords?.discovered?.length || 0}`);
    console.log(`   ✅ Quality score: ${keywordAnalysis.metrics?.qualityScore}%`);

    // Step 5: Optimize content
    console.log('\n⚡ Step 5: Optimizing content...');
    const contentOptimizer = getContentOptimizer();
    const optimization = await contentOptimizer.optimizeContent(websiteContent, null, {
      optimizationType: 'comprehensive',
      targetKeywords: keywordAnalysis.semanticKeywords?.primary?.slice(0, 5).map(k => k.keyword) || [],
      targetAudience,
      industry,
      cacheKey: `optimization-${tenant}-${websiteUrl}`
    });

    console.log(`   ✅ Overall optimization score: ${optimization.overallScore?.overall}%`);
    console.log(`   ✅ Priority actions: ${optimization.prioritizedActions?.length}`);
    console.log(`   ✅ A/B test suggestions: ${optimization.abTestSuggestions?.length}`);

    // Step 6: Generate ad copy recommendations
    console.log('\n📝 Step 6: Generating ad copy recommendations...');
    const adCopyRecommendations = generateAdCopyRecommendations({
      websiteContent,
      contentAnalysis,
      brandProfile,
      keywordAnalysis,
      optimization,
      adCampaignType,
      industry,
      targetAudience
    });

    console.log(`   ✅ Generated ${adCopyRecommendations.headlines.length} headline variations`);
    console.log(`   ✅ Generated ${adCopyRecommendations.descriptions.length} description variations`);
    console.log(`   ✅ Identified ${adCopyRecommendations.targetKeywords.length} target keywords`);

    // Step 7: Create comprehensive report
    const comprehensiveReport = {
      metadata: {
        websiteUrl,
        tenant,
        analyzedAt: new Date().toISOString(),
        industry,
        targetAudience,
        adCampaignType
      },
      website: {
        content: websiteContent,
        quality: {
          effectiveness: contentAnalysis.effectiveness?.percentage,
          readability: contentAnalysis.readability?.interpretation?.level,
          sentiment: contentAnalysis.sentiment?.overall?.label
        }
      },
      brand: {
        archetype: brandProfile.archetype?.primary?.archetype,
        personality: brandProfile.toneProfile?.overall?.personalityType,
        consistency: brandProfile.consistency?.overall?.score,
        strength: brandProfile.brandStrength?.percentage
      },
      keywords: {
        primary: keywordAnalysis.semanticKeywords?.primary?.slice(0, 10) || [],
        longTail: keywordAnalysis.longTailKeywords?.discovered?.slice(0, 15) || [],
        intentDistribution: keywordAnalysis.intentClassification?.distribution || {},
        opportunities: keywordAnalysis.opportunities?.highOpportunity?.slice(0, 10) || []
      },
      optimization: {
        score: optimization.overallScore?.overall,
        grade: optimization.overallScore?.grade,
        seoScore: optimization.currentPerformance?.seo?.score,
        conversionScore: optimization.currentPerformance?.conversion?.score,
        topRecommendations: optimization.prioritizedActions?.slice(0, 5) || []
      },
      adCopy: adCopyRecommendations,
      insights: generateActionableInsights({
        contentAnalysis,
        brandProfile,
        keywordAnalysis,
        optimization,
        adCampaignType
      })
    };

    console.log('\n✅ Comprehensive analysis complete!');
    return comprehensiveReport;

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    throw error;
  }
}

/**
 * Generate ad copy recommendations based on all analyses
 */
function generateAdCopyRecommendations(analysisData) {
  const {
    websiteContent,
    contentAnalysis,
    brandProfile,
    keywordAnalysis,
    optimization,
    adCampaignType,
    industry,
    targetAudience
  } = analysisData;

  const recommendations = {
    headlines: [],
    descriptions: [],
    targetKeywords: [],
    negativeKeywords: [],
    callsToAction: [],
    brandMessages: [],
    landingPageAlignment: {}
  };

  // Generate headlines based on content hooks and brand voice
  const hooks = contentAnalysis.hooks || {};
  const archetype = brandProfile.archetype?.primary?.archetype || 'professional';

  // Benefit-focused headlines
  if (hooks.benefit && hooks.benefit.length > 0) {
    hooks.benefit.slice(0, 3).forEach(hook => {
      recommendations.headlines.push({
        type: 'benefit',
        text: hook.text,
        confidence: hook.confidence,
        brandAlignment: 'high'
      });
    });
  }

  // Social proof headlines
  if (hooks.socialProof && hooks.socialProof.length > 0) {
    hooks.socialProof.slice(0, 2).forEach(hook => {
      recommendations.headlines.push({
        type: 'social_proof',
        text: hook.text,
        confidence: hook.confidence,
        brandAlignment: 'high'
      });
    });
  }

  // Keyword-optimized headlines
  const primaryKeywords = keywordAnalysis.semanticKeywords?.primary || [];
  primaryKeywords.slice(0, 5).forEach(keyword => {
    recommendations.headlines.push({
      type: 'keyword_optimized',
      text: `${keyword.keyword} - ${getArchetypeMessage(archetype)}`,
      confidence: 0.8,
      brandAlignment: 'medium',
      targetKeyword: keyword.keyword
    });
  });

  // Generate descriptions
  const valueProps = websiteContent.usps || [];
  valueProps.slice(0, 3).forEach(usp => {
    recommendations.descriptions.push({
      type: 'value_proposition',
      text: usp.text,
      confidence: 0.9,
      brandAlignment: 'high'
    });
  });

  // Add urgency-based descriptions if brand supports it
  if (archetype === 'outlaw' || archetype === 'hero') {
    recommendations.descriptions.push({
      type: 'urgency',
      text: 'Limited time offer - Transform your business today!',
      confidence: 0.7,
      brandAlignment: 'medium'
    });
  }

  // Target keywords from analysis
  recommendations.targetKeywords = [
    ...primaryKeywords.slice(0, 10).map(k => ({
      keyword: k.keyword,
      opportunity: k.opportunity,
      difficulty: k.difficulty,
      intent: 'primary'
    })),
    ...(keywordAnalysis.longTailKeywords?.discovered?.slice(0, 5) || []).map(k => ({
      keyword: k.keyword,
      opportunity: k.opportunity,
      difficulty: k.difficulty,
      intent: 'long_tail'
    }))
  ];

  // Negative keywords
  recommendations.negativeKeywords = keywordAnalysis.negativeKeywords?.irrelevant?.slice(0, 20) || [];

  // CTAs based on brand voice and content
  const ctas = websiteContent.ctas || [];
  recommendations.callsToAction = [
    ...ctas.slice(0, 3),
    ...generateBrandAlignedCTAs(archetype)
  ];

  // Brand messages
  recommendations.brandMessages = generateBrandMessages(brandProfile, contentAnalysis);

  // Landing page alignment recommendations
  recommendations.landingPageAlignment = {
    keywordAlignment: calculateKeywordAlignment(recommendations.targetKeywords, websiteContent),
    messageAlignment: calculateMessageAlignment(recommendations.headlines, websiteContent),
    conversionOptimization: optimization.recommendations?.conversion || {}
  };

  return recommendations;
}

/**
 * Generate actionable insights from all analyses
 */
function generateActionableInsights(analysisData) {
  const {
    contentAnalysis,
    brandProfile,
    keywordAnalysis,
    optimization,
    adCampaignType
  } = analysisData;

  const insights = {
    strengths: [],
    opportunities: [],
    threats: [],
    recommendations: []
  };

  // Identify strengths
  if (contentAnalysis.effectiveness?.percentage > 70) {
    insights.strengths.push('High content effectiveness score');
  }
  if (brandProfile.consistency?.overall?.score > 80) {
    insights.strengths.push('Consistent brand voice across content');
  }
  if (keywordAnalysis.metrics?.qualityScore > 80) {
    insights.strengths.push('Strong keyword optimization potential');
  }

  // Identify opportunities
  if (contentAnalysis.powerWords?.overall?.density < 2) {
    insights.opportunities.push('Increase power word usage for better emotional impact');
  }
  if (keywordAnalysis.longTailKeywords?.discovered?.length > 10) {
    insights.opportunities.push('Strong long-tail keyword opportunities available');
  }
  if (optimization.currentPerformance?.conversion?.score < 70) {
    insights.opportunities.push('Significant conversion optimization potential');
  }

  // Identify threats
  if (contentAnalysis.readability?.fleschReadingEase < 50) {
    insights.threats.push('Content may be too complex for target audience');
  }
  if (brandProfile.brandStrength?.percentage < 60) {
    insights.threats.push('Brand voice needs strengthening for better differentiation');
  }

  // Generate recommendations
  insights.recommendations = [
    'Optimize headlines with identified power words and hooks',
    'Align ad copy with primary brand archetype messaging',
    'Target high-opportunity long-tail keywords for better ROI',
    'Implement A/B testing for conversion optimization',
    'Maintain brand voice consistency across all touchpoints'
  ];

  // Add campaign-specific recommendations
  if (adCampaignType === 'search') {
    insights.recommendations.push('Focus on transactional keywords for search campaigns');
  } else if (adCampaignType === 'display') {
    insights.recommendations.push('Emphasize visual brand elements and emotional appeals');
  } else if (adCampaignType === 'social') {
    insights.recommendations.push('Use social proof and community language');
  }

  return insights;
}

/**
 * Helper functions
 */

function getArchetypeMessage(archetype) {
  const messages = {
    innocent: 'Simple, Pure, Effective',
    explorer: 'Discover New Possibilities',
    sage: 'Proven Expertise & Wisdom',
    hero: 'Achieve Extraordinary Results',
    outlaw: 'Break the Rules, Get Results',
    magician: 'Transform Your Business',
    regular: 'Real Solutions for Real People',
    lover: 'Fall in Love with Results',
    jester: 'Make Work Fun Again',
    caregiver: 'We Care About Your Success',
    creator: 'Create Something Amazing',
    ruler: 'Lead Your Industry'
  };

  return messages[archetype] || 'Professional Solutions';
}

function generateBrandAlignedCTAs(archetype) {
  const ctaMap = {
    innocent: ['Get Started Simply', 'Try Risk-Free'],
    explorer: ['Explore Features', 'Discover More'],
    sage: ['Learn More', 'Get Expert Advice'],
    hero: ['Start Your Journey', 'Achieve Success'],
    outlaw: ['Break Free Now', 'Revolutionize Today'],
    magician: ['Transform Now', 'See the Magic'],
    regular: ['Get Started', 'Join Us'],
    lover: ['Fall in Love', 'Experience Joy'],
    jester: ['Have Fun', 'Enjoy the Ride'],
    caregiver: ['Let Us Help', 'Get Support'],
    creator: ['Create Now', 'Build Something'],
    ruler: ['Take Control', 'Lead the Way']
  };

  return ctaMap[archetype] || ['Get Started', 'Learn More'];
}

function generateBrandMessages(brandProfile, contentAnalysis) {
  const messages = [];
  const archetype = brandProfile.archetype?.primary?.archetype;
  const tone = brandProfile.toneProfile?.overall?.personalityType;

  if (archetype && tone) {
    messages.push(`${archetype} brand with ${tone} communication style`);
  }

  if (contentAnalysis.sentiment?.overall?.label === 'positive') {
    messages.push('Maintain positive, optimistic messaging');
  }

  if (contentAnalysis.powerWords?.byCategory?.trust?.count > 0) {
    messages.push('Emphasize trust and credibility in messaging');
  }

  return messages;
}

function calculateKeywordAlignment(targetKeywords, websiteContent) {
  // Simplified alignment calculation
  const contentText = (websiteContent.allText || []).join(' ').toLowerCase();
  const alignedKeywords = targetKeywords.filter(k =>
    contentText.includes(k.keyword.toLowerCase())
  );

  return {
    score: targetKeywords.length > 0 ? (alignedKeywords.length / targetKeywords.length) * 100 : 0,
    alignedCount: alignedKeywords.length,
    totalKeywords: targetKeywords.length
  };
}

function calculateMessageAlignment(headlines, websiteContent) {
  // Simplified message alignment calculation
  const websiteHeadlines = (websiteContent.allHeadings || []).map(h => h.text);
  const similarMessages = headlines.filter(h =>
    websiteHeadlines.some(wh =>
      wh.toLowerCase().includes(h.text.toLowerCase().split(' ')[0])
    )
  );

  return {
    score: headlines.length > 0 ? (similarMessages.length / headlines.length) * 100 : 0,
    alignedCount: similarMessages.length,
    totalMessages: headlines.length
  };
}

/**
 * Example usage function
 */
export async function exampleUsage() {
  console.log('🎯 ProofKit Content Intelligence Integration Example\n');

  // Example: Analyze a SaaS website for search ad campaigns
  const results = await analyzeWebsiteForAdCopy('https://example-saas.com', {
    tenant: 'demo-client',
    industry: 'saas',
    targetAudience: 'business_owners',
    adCampaignType: 'search'
  });

  console.log('\n📊 Analysis Results Summary:');
  console.log(`   - Brand Archetype: ${results.brand.archetype}`);
  console.log(`   - Content Quality: ${results.website.quality.effectiveness}%`);
  console.log(`   - Keyword Opportunities: ${results.keywords.opportunities.length}`);
  console.log(`   - Ad Headlines Generated: ${results.adCopy.headlines.length}`);
  console.log(`   - Optimization Score: ${results.optimization.score}%`);

  console.log('\n🎯 Top Recommendations:');
  results.insights.recommendations.slice(0, 3).forEach((rec, index) => {
    console.log(`   ${index + 1}. ${rec}`);
  });

  return results;
}

export default { analyzeWebsiteForAdCopy, exampleUsage };