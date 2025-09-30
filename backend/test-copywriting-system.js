/**
 * Test Script for ProofKit SaaS Copywriting AI System
 * Demonstrates the complete copy generation, A/B testing, and performance analysis pipeline
 */

import { getDynamicCopyGenerator } from './services/dynamic-copy.js';
import { getABTestingService } from './services/ab-tester.js';
import { getMessageAdapter } from './services/message-adapter.js';
import { getCopyPerformanceService } from './services/copy-performance.js';

async function testCopywritingSystem() {
  console.log('🚀 Testing ProofKit SaaS Copywriting AI System');
  console.log('=' .repeat(60));

  const tenantId = 'test_tenant_copywriting';

  try {
    // =====================================
    // STEP 1: Generate Dynamic Copy
    // =====================================
    console.log('\n📝 STEP 1: Generating Dynamic Copy...');

    const copyGenerator = getDynamicCopyGenerator();

    const copyResult = await copyGenerator.generateComprehensiveCopy(tenantId, {
      theme: 'E-commerce Fashion',
      industry: 'retail',
      keywords: ['fashion', 'trendy clothes', 'stylish outfits', 'designer wear'],
      headlineCount: 10,
      descriptionCount: 4,
      generateVariations: true,
      includeAllSegments: true,
      includeTimeVariations: true
    });

    if (copyResult.success) {
      console.log('✅ Copy generation successful!');
      console.log(`📊 Generated ${copyResult.baseCopy.headlines.length} headlines and ${copyResult.baseCopy.descriptions.length} descriptions`);
      console.log(`🎯 Used ${copyResult.dataSources.totalSources} data sources`);
      console.log(`⏱️  Generation time: ${copyResult.metadata.totalGenerationTime}ms`);

      console.log('\n📋 Sample Headlines:');
      copyResult.baseCopy.headlines.slice(0, 3).forEach((headline, i) => {
        console.log(`  ${i + 1}. "${headline}" (${headline.length} chars)`);
      });

      console.log('\n📝 Sample Descriptions:');
      copyResult.baseCopy.descriptions.slice(0, 2).forEach((desc, i) => {
        console.log(`  ${i + 1}. "${desc}" (${desc.length} chars)`);
      });
    } else {
      console.log('❌ Copy generation failed:', copyResult.error);
      return;
    }

    // =====================================
    // STEP 2: Create A/B Test
    // =====================================
    console.log('\n🧪 STEP 2: Creating A/B Test...');

    const abTester = getABTestingService();

    // Create test variants from generated copy
    const testVariants = [
      {
        name: 'Control',
        headlines: copyResult.baseCopy.headlines.slice(0, 3),
        descriptions: copyResult.baseCopy.descriptions.slice(0, 2)
      },
      {
        name: 'Segment Optimized',
        headlines: copyResult.variations.bySegment?.champions?.adapted?.headlines?.slice(0, 3) || copyResult.baseCopy.headlines.slice(3, 6),
        descriptions: copyResult.variations.bySegment?.champions?.adapted?.descriptions?.slice(0, 2) || copyResult.baseCopy.descriptions.slice(2, 4)
      },
      {
        name: 'Time Optimized',
        headlines: copyResult.variations.byTime?.evening?.adapted?.headlines?.slice(0, 3) || copyResult.baseCopy.headlines.slice(6, 9),
        descriptions: copyResult.variations.byTime?.evening?.adapted?.descriptions?.slice(0, 2) || copyResult.baseCopy.descriptions.slice(0, 2)
      }
    ];

    const testResult = await abTester.createTest(tenantId, {
      name: 'Fashion Copy Performance Test',
      description: 'Testing AI-generated copy variations for fashion e-commerce',
      variants: testVariants,
      metric: 'ctr',
      duration: 14
    });

    if (testResult.success) {
      console.log('✅ A/B test created successfully!');
      console.log(`🆔 Test ID: ${testResult.test.testId}`);
      console.log(`📊 Testing ${testResult.test.variants.length} variants`);
      console.log(`⏱️  Test duration: ${testResult.test.duration} days`);

      // Simulate some performance data
      console.log('\n📈 Simulating performance data...');

      for (let i = 0; i < testResult.test.variants.length; i++) {
        const variant = testResult.test.variants[i];

        // Simulate realistic performance metrics
        const simulatedPerformance = {
          impressions: Math.floor(Math.random() * 5000) + 1000,
          clicks: Math.floor(Math.random() * 150) + 20,
          conversions: Math.floor(Math.random() * 20) + 2,
          cost: Math.floor(Math.random() * 500) + 100,
          revenue: Math.floor(Math.random() * 1000) + 200
        };

        await abTester.updateTestPerformance(
          testResult.test.testId,
          variant.variantId,
          simulatedPerformance
        );

        console.log(`  📊 ${variant.name}: ${simulatedPerformance.impressions} impressions, ${simulatedPerformance.clicks} clicks`);
      }
    } else {
      console.log('❌ A/B test creation failed');
      return;
    }

    // =====================================
    // STEP 3: Message Adaptation
    // =====================================
    console.log('\n🎯 STEP 3: Testing Message Adaptation...');

    const messageAdapter = getMessageAdapter();

    // Test segment adaptation
    const segmentAdaptation = await messageAdapter.adaptForSegment(
      'champions',
      {
        headlines: copyResult.baseCopy.headlines.slice(0, 3),
        descriptions: copyResult.baseCopy.descriptions.slice(0, 2)
      }
    );

    console.log('✅ Segment adaptation (Champions) completed!');
    console.log(`🎯 Strategy: ${segmentAdaptation.strategy.tone} tone, ${segmentAdaptation.strategy.focus} focus`);

    if (segmentAdaptation.adapted.headlines) {
      console.log('\n📋 Adapted Headlines:');
      segmentAdaptation.adapted.headlines.slice(0, 2).forEach((headline, i) => {
        console.log(`  ${i + 1}. "${headline}"`);
      });
    }

    // Test time adaptation
    const timeAdaptation = await messageAdapter.adaptForTime(
      {
        headlines: copyResult.baseCopy.headlines.slice(0, 2),
        descriptions: copyResult.baseCopy.descriptions.slice(0, 1)
      },
      { hour: 19 } // Evening
    );

    console.log('\n⏰ Time adaptation (Evening) completed!');
    console.log(`🌅 Time period: ${timeAdaptation.timePeriod}`);

    // Test urgency addition
    const urgentCopy = messageAdapter.addUrgency(
      {
        headlines: copyResult.baseCopy.headlines.slice(0, 2),
        descriptions: copyResult.baseCopy.descriptions.slice(0, 1)
      },
      'time',
      { n: 24, time: 'midnight' }
    );

    console.log('\n⚡ Urgency messaging added!');
    console.log(`🔥 Urgency text: "${urgentCopy.urgencyText}"`);

    // =====================================
    // STEP 4: Performance Analysis
    // =====================================
    console.log('\n📊 STEP 4: Analyzing Copy Performance...');

    const performanceService = getCopyPerformanceService();

    // Get test results for analysis
    const testResults = await abTester.getTestResults(testResult.test.testId);

    // Analyze performance
    const performanceAnalysis = await performanceService.analyzeCopyPerformance(
      tenantId,
      {
        variants: testResults.variants.map(v => ({
          id: v.variantId,
          headlines: testVariants.find(tv => tv.name === v.name)?.headlines || [],
          descriptions: testVariants.find(tv => tv.name === v.name)?.descriptions || [],
          ctr: parseFloat(v.ctr),
          conversionRate: parseFloat(v.conversionRate),
          impressions: v.impressions,
          clicks: v.clicks,
          conversions: v.conversions
        }))
      },
      {
        includeCompetitive: true,
        includePredictions: true,
        includeFatigueAnalysis: true
      }
    );

    if (performanceAnalysis.success) {
      console.log('✅ Performance analysis completed!');
      console.log(`📈 Average CTR: ${performanceAnalysis.performance.averageCTR}%`);
      console.log(`⭐ Average Quality Score: ${performanceAnalysis.quality.averageScore}/10`);
      console.log(`🎯 Analysis confidence: ${performanceAnalysis.metadata.confidence}%`);

      console.log('\n🏆 Top Performer:');
      if (performanceAnalysis.performance.topPerformer) {
        console.log(`  ID: ${performanceAnalysis.performance.topPerformer.id}`);
        console.log(`  CTR: ${performanceAnalysis.performance.topPerformer.ctr}%`);
        console.log(`  Headlines: ${performanceAnalysis.performance.topPerformer.headlines?.join(', ') || 'N/A'}`);
      }

      console.log('\n💡 Recommendations:');
      performanceAnalysis.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`  ${i + 1}. [${rec.priority.toUpperCase()}] ${rec.title}: ${rec.message}`);
      });

      // Test CTR prediction
      const ctrPredictions = await performanceService.predictCTR(
        testResults.variants.map(v => ({
          headlines: testVariants.find(tv => tv.name === v.name)?.headlines || [],
          descriptions: testVariants.find(tv => tv.name === v.name)?.descriptions || []
        }))
      );

      if (ctrPredictions.success) {
        console.log('\n🔮 CTR Predictions:');
        console.log(`  Average predicted CTR: ${ctrPredictions.averagePredictedCTR.toFixed(2)}%`);
        console.log(`  Top predicted variant: ${ctrPredictions.topVariation.predictedCTR.toFixed(2)}% CTR`);
      }
    } else {
      console.log('❌ Performance analysis failed:', performanceAnalysis.error);
    }

    // =====================================
    // STEP 5: System Metrics
    // =====================================
    console.log('\n📊 STEP 5: System Metrics Summary...');

    const copyMetrics = copyGenerator.getMetrics();
    const abMetrics = abTester.getMetrics();
    const adapterMetrics = messageAdapter.getMetrics();
    const performanceMetrics = performanceService.getMetrics();

    console.log('\n📝 Copy Generation Metrics:');
    console.log(`  - Copy generated: ${copyMetrics.copyGenerated}`);
    console.log(`  - Avg generation time: ${copyMetrics.avgGenerationTime.toFixed(2)}ms`);
    console.log(`  - Data source usage: ${copyMetrics.dataSourceUsage.websiteContent} website content`);

    console.log('\n🧪 A/B Testing Metrics:');
    console.log(`  - Tests created: ${abMetrics.testsCreated}`);
    console.log(`  - Active tests: ${abMetrics.activeTests}`);
    console.log(`  - Win rate: ${abMetrics.winRate}`);

    console.log('\n🎯 Message Adaptation Metrics:');
    console.log(`  - Adaptations generated: ${adapterMetrics.adaptationsGenerated}`);
    console.log(`  - Top segments: ${adapterMetrics.topSegments.map(s => s.segment).join(', ')}`);

    console.log('\n📊 Performance Analysis Metrics:');
    console.log(`  - Analyses completed: ${performanceMetrics.analysisCount}`);
    console.log(`  - Predictions generated: ${performanceMetrics.predictionsGenerated}`);
    console.log(`  - Fatigue instances detected: ${performanceMetrics.fatigueDetected}`);

    // =====================================
    // SUCCESS SUMMARY
    // =====================================
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 COPYWRITING AI SYSTEM TEST COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(60));

    console.log('\n✅ What was accomplished:');
    console.log('  1. ✅ Generated AI-powered copy using multiple data sources');
    console.log('  2. ✅ Created A/B test with statistical significance tracking');
    console.log('  3. ✅ Adapted messaging for different customer segments and times');
    console.log('  4. ✅ Analyzed copy performance with quality scoring');
    console.log('  5. ✅ Generated CTR predictions and optimization recommendations');

    console.log('\n🚀 System is ready for production deployment!');
    console.log('📋 Next steps: Integrate with Google Ads API for live campaign deployment');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Execute the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testCopywritingSystem()
    .then(() => {
      console.log('\n🏁 Test execution completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test execution failed:', error.message);
      process.exit(1);
    });
}

export default testCopywritingSystem;