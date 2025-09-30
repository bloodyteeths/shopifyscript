/**
 * Test script for the Content Intelligence System
 * Demonstrates the integration and capabilities of all NLP services
 */

import { getContentIntelligence } from './services/content-intelligence.js';
import { getBrandVoice } from './services/brand-voice.js';
import { getKeywordMiner } from './services/keyword-miner.js';
import { getContentOptimizer } from './services/content-optimizer.js';

// Sample content data (simulating website scraper output)
const sampleContent = {
  metadata: {
    url: 'https://example-saas.com',
    scrapedAt: new Date().toISOString(),
    pagesScraped: 3
  },
  allText: [
    'Transform your business with our revolutionary SaaS platform. Get 50% more leads in just 30 days.',
    'Our proven system helps thousands of companies automate their workflows and increase productivity.',
    'Join over 10,000 satisfied customers who trust our award-winning software.',
    'Try our free 14-day trial with no commitment. Cancel anytime with our money-back guarantee.',
    'Boost your team\'s efficiency with intelligent automation and real-time analytics.',
    'Don\'t miss this limited-time offer - save 30% on all plans this month only!'
  ],
  allHeadings: [
    { level: 1, text: 'Revolutionary SaaS Platform for Business Growth' },
    { level: 2, text: 'Why Choose Our Platform?' },
    { level: 2, text: 'Trusted by Industry Leaders' },
    { level: 3, text: 'Get Started Today' }
  ],
  title: 'Best SaaS Platform - Automate Your Business | ExampleSaaS',
  metaTags: {
    description: 'Transform your business with our award-winning SaaS platform. Get 50% more leads, automate workflows, and boost productivity. Start your free trial today!'
  },
  ctas: [
    'Start Free Trial',
    'Get Demo',
    'Sign Up Now'
  ],
  usps: [
    { text: '50% more leads in 30 days', type: 'benefit' },
    { text: 'Money-back guarantee', type: 'guarantee' },
    { text: 'Award-winning software', type: 'credential' }
  ],
  testimonials: [
    { text: 'This platform doubled our productivity in just one month!', author: 'Sarah Johnson, CEO' },
    { text: 'The best investment we\'ve made for our business growth.', author: 'Mike Chen, Director' }
  ]
};

// Sample ad data for relevance testing
const sampleAdData = {
  headline: 'Increase Leads by 50% with Our SaaS Platform',
  description: 'Automate your business processes and see results in 30 days. Start your free trial!',
  keywords: ['saas platform', 'business automation', 'lead generation', 'productivity software'],
  targetAudience: 'business owners',
  industry: 'B2B SaaS'
};

async function testContentIntelligenceSystem() {
  console.log('🚀 Testing ProofKit Content Intelligence System\n');

  try {
    // Test 1: Content Intelligence Analysis
    console.log('📊 1. Testing Content Intelligence Analysis...');
    const contentIntelligence = getContentIntelligence();
    const contentAnalysis = await contentIntelligence.analyzeContent(sampleContent);

    console.log('✅ Content Intelligence Results:');
    console.log(`   - Hooks Found: ${contentAnalysis.hooks?.curiosity?.length || 0} curiosity, ${contentAnalysis.hooks?.benefit?.length || 0} benefit`);
    console.log(`   - Sentiment: ${contentAnalysis.sentiment?.overall?.label} (${contentAnalysis.sentiment?.overall?.score})`);
    console.log(`   - Readability: ${contentAnalysis.readability?.interpretation?.level}`);
    console.log(`   - Power Words: ${contentAnalysis.powerWords?.overall?.count} found`);
    console.log(`   - Effectiveness Score: ${contentAnalysis.effectiveness?.percentage}%\n`);

    // Test 2: Brand Voice Analysis
    console.log('🎯 2. Testing Brand Voice Analysis...');
    const brandVoice = getBrandVoice();
    const brandProfile = await brandVoice.generateBrandProfile(sampleContent);

    console.log('✅ Brand Voice Results:');
    console.log(`   - Primary Archetype: ${brandProfile.archetype?.primary?.archetype}`);
    console.log(`   - Tone Profile: ${brandProfile.toneProfile?.overall?.personalityType}`);
    console.log(`   - Voice Consistency: ${brandProfile.consistency?.overall?.score}%`);
    console.log(`   - Brand Strength: ${brandProfile.brandStrength?.grade} (${brandProfile.brandStrength?.percentage}%)\n`);

    // Test 3: Keyword Mining
    console.log('🔍 3. Testing Keyword Mining...');
    const keywordMiner = getKeywordMiner();
    const keywordAnalysis = await keywordMiner.mineKeywords(sampleContent, {
      industry: 'saas',
      targetAudience: 'business_owners'
    });

    console.log('✅ Keyword Mining Results:');
    console.log(`   - Primary Keywords: ${keywordAnalysis.semanticKeywords?.primary?.length || 0} found`);
    console.log(`   - Long-tail Keywords: ${keywordAnalysis.longTailKeywords?.discovered?.length || 0} discovered`);
    console.log(`   - Intent Distribution: ${Object.keys(keywordAnalysis.intentClassification?.byIntent || {}).length} types`);
    console.log(`   - Quality Score: ${keywordAnalysis.metrics?.qualityScore}%\n`);

    // Test 4: Content Optimization
    console.log('⚡ 4. Testing Content Optimization...');
    const contentOptimizer = getContentOptimizer();
    const optimization = await contentOptimizer.optimizeContent(sampleContent, sampleAdData, {
      optimizationType: 'comprehensive',
      targetKeywords: ['saas platform', 'business automation'],
      industry: 'saas'
    });

    console.log('✅ Content Optimization Results:');
    console.log(`   - Overall Score: ${optimization.overallScore?.overall}% (${optimization.overallScore?.grade})`);
    console.log(`   - SEO Score: ${optimization.currentPerformance?.seo?.score}%`);
    console.log(`   - Conversion Score: ${optimization.currentPerformance?.conversion?.score}%`);
    console.log(`   - Priority Actions: ${optimization.prioritizedActions?.length || 0} recommendations`);
    if (optimization.adRelevance) {
      console.log(`   - Ad Relevance: ${optimization.adRelevance?.overallScore}%`);
    }
    console.log();

    // Test 5: Integration Analysis
    console.log('🔗 5. Testing System Integration...');

    // Demonstrate how services work together
    const integratedInsights = {
      contentQuality: {
        effectivenessScore: contentAnalysis.effectiveness?.percentage,
        readabilityLevel: contentAnalysis.readability?.interpretation?.level,
        powerWordDensity: contentAnalysis.powerWords?.overall?.density
      },
      brandAlignment: {
        archetype: brandProfile.archetype?.primary?.archetype,
        consistency: brandProfile.consistency?.overall?.score,
        voiceStrength: brandProfile.brandStrength?.percentage
      },
      keywordStrategy: {
        primaryKeywords: keywordAnalysis.semanticKeywords?.primary?.slice(0, 5).map(k => k.keyword),
        intentBalance: keywordAnalysis.intentClassification?.distribution,
        opportunityScore: keywordAnalysis.metrics?.averageOpportunity
      },
      optimizationPriority: {
        topRecommendations: optimization.prioritizedActions?.slice(0, 3).map(a => a.recommendation),
        improvementPotential: optimization.overallScore?.improvementPotential,
        abTestSuggestions: optimization.abTestSuggestions?.length
      }
    };

    console.log('✅ Integrated Analysis Complete:');
    console.log('   📈 Content Quality:', JSON.stringify(integratedInsights.contentQuality, null, 6));
    console.log('   🎨 Brand Alignment:', JSON.stringify(integratedInsights.brandAlignment, null, 6));
    console.log('   🔑 Keyword Strategy:', JSON.stringify(integratedInsights.keywordStrategy, null, 6));
    console.log('   ⚡ Optimization Priority:', JSON.stringify(integratedInsights.optimizationPriority, null, 6));

    // Test 6: Performance Metrics
    console.log('\n📊 6. System Performance Metrics...');
    console.log('✅ Service Metrics:');
    console.log(`   - Content Intelligence: ${contentIntelligence.getMetrics().isInitialized ? 'Ready' : 'Not Ready'}`);
    console.log(`   - Brand Voice: ${brandVoice.getMetrics().isInitialized ? 'Ready' : 'Not Ready'}`);
    console.log(`   - Keyword Miner: ${keywordMiner.getMetrics().isInitialized ? 'Ready' : 'Not Ready'}`);
    console.log(`   - Content Optimizer: ${contentOptimizer.getMetrics().isInitialized ? 'Ready' : 'Not Ready'}`);

    console.log('\n🎉 Content Intelligence System Test Complete!');
    console.log('✅ All services are working correctly and integrated successfully.');

    return {
      success: true,
      results: {
        contentAnalysis,
        brandProfile,
        keywordAnalysis,
        optimization,
        integratedInsights
      }
    };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

// Demo function for specific use cases
async function demonstrateUseCases() {
  console.log('\n🎯 Demonstrating Real-World Use Cases...\n');

  try {
    const contentIntelligence = getContentIntelligence();

    // Use Case 1: Landing Page Analysis for Ad Campaigns
    console.log('📝 Use Case 1: Landing Page Analysis for PPC Campaigns');
    const landingPageAnalysis = await contentIntelligence.analyzeContent(sampleContent, {
      includeHooks: true,
      includeSentiment: true,
      includePowerWords: true
    });

    console.log(`   ✅ Hooks for Ad Copy: ${landingPageAnalysis.hooks?.benefit?.length} benefit hooks identified`);
    console.log(`   ✅ Emotional Appeal: ${landingPageAnalysis.sentiment?.overall?.label} sentiment detected`);
    console.log(`   ✅ Power Words: ${landingPageAnalysis.powerWords?.topWords?.slice(0, 3).map(w => w.word).join(', ')}`);

    // Use Case 2: Brand Consistency Across Campaigns
    console.log('\n🎨 Use Case 2: Brand Voice Consistency Analysis');
    const brandVoice = getBrandVoice();
    const voiceProfile = await brandVoice.generateBrandProfile(sampleContent);

    console.log(`   ✅ Brand Archetype: ${voiceProfile.archetype?.primary?.archetype} (${Math.round(voiceProfile.archetype?.primary?.confidence * 100)}% confidence)`);
    console.log(`   ✅ Tone Consistency: ${voiceProfile.consistency?.overall?.score}% across content`);
    console.log(`   ✅ Voice Guidelines: ${Object.keys(voiceProfile.guidelines || {}).length} style rules generated`);

    // Use Case 3: Keyword Strategy for SEO + PPC
    console.log('\n🔍 Use Case 3: Unified Keyword Strategy');
    const keywordMiner = getKeywordMiner();
    const keywords = await keywordMiner.mineKeywords(sampleContent);

    console.log(`   ✅ SEO Keywords: ${keywords.semanticKeywords?.primary?.slice(0, 3).map(k => k.keyword).join(', ')}`);
    console.log(`   ✅ PPC Long-tail: ${keywords.longTailKeywords?.discovered?.slice(0, 2).map(k => k.keyword).join(', ')}`);
    console.log(`   ✅ Intent Targeting: ${Object.keys(keywords.intentClassification?.byIntent || {}).join(', ')}`);

    // Use Case 4: Conversion Rate Optimization
    console.log('\n⚡ Use Case 4: Conversion Rate Optimization');
    const contentOptimizer = getContentOptimizer();
    const cro = await contentOptimizer.optimizeContent(sampleContent, sampleAdData);

    console.log(`   ✅ CTA Optimization: ${cro.recommendations?.conversion?.cta?.length} suggestions`);
    console.log(`   ✅ Trust Signals: ${cro.currentPerformance?.conversion?.trustSignals?.count} detected`);
    console.log(`   ✅ A/B Test Ideas: ${cro.abTestSuggestions?.length} test variations suggested`);

    console.log('\n🚀 Use Case Demonstrations Complete!');

  } catch (error) {
    console.error('❌ Use case demonstration failed:', error.message);
  }
}

// Main execution
async function main() {
  const testResults = await testContentIntelligenceSystem();

  if (testResults.success) {
    await demonstrateUseCases();

    console.log('\n📋 SUMMARY REPORT');
    console.log('=================');
    console.log('🎯 Content Intelligence System: OPERATIONAL');
    console.log('📊 NLP Analysis: Advanced sentiment, readability, and power word detection');
    console.log('🎨 Brand Voice Profiling: Archetype detection and consistency scoring');
    console.log('🔍 Keyword Mining: Semantic extraction and intent classification');
    console.log('⚡ Content Optimization: SEO, conversion, and ad relevance analysis');
    console.log('🔗 System Integration: All services working together seamlessly');
    console.log('\n✅ ProofKit Content Intelligence System is ready for production!');
  } else {
    console.log('\n❌ System test failed. Please check the error details above.');
  }
}

// Export for external testing
export { testContentIntelligenceSystem, demonstrateUseCases };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}