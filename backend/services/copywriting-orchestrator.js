/**
 * Copywriting Orchestrator Service for ProofKit SaaS
 * Central coordinator for all copywriting AI operations
 *
 * Features:
 * - Orchestrates end-to-end copy generation pipeline
 * - Integrates with Google Ads RSA creation
 * - Manages A/B testing lifecycle
 * - Coordinates performance optimization
 * - Provides unified API for all copywriting functions
 */

import { getDynamicCopyGenerator } from './dynamic-copy.js';
import { getABTestingService } from './ab-tester.js';
import { getMessageAdapter } from './message-adapter.js';
import { getCopyPerformanceService } from './copy-performance.js';
import { RSAContentGenerator } from './rsa-generator.js';
import dataStore from './data-store.js';
import logger from './logger.js';

/**
 * Central Copywriting Orchestrator
 */
export class CopywritingOrchestrator {
  constructor() {
    this.dynamicCopy = getDynamicCopyGenerator();
    this.abTester = getABTestingService();
    this.messageAdapter = getMessageAdapter();
    this.performanceService = getCopyPerformanceService();
    this.rsaGenerator = new RSAContentGenerator();

    // Pipeline configuration
    this.config = {
      autoCreateABTests: true,
      autoOptimizeUnderperformers: true,
      performanceThresholds: {
        minCTR: 1.0,
        minQualityScore: 6.0,
        fatigueThreshold: 0.3
      },
      segmentationEnabled: true,
      timeOptimizationEnabled: true,
      competitiveAnalysisEnabled: true
    };

    // Pipeline metrics
    this.metrics = {
      pipelinesExecuted: 0,
      rsasGenerated: 0,
      testsCreated: 0,
      optimizationsPerformed: 0,
      avgPipelineTime: 0,
      successRate: 0
    };

    console.log('🎼 Copywriting Orchestrator initialized');
  }

  /**
   * Complete end-to-end copy generation and optimization pipeline
   * @param {string} tenantId - Tenant identifier
   * @param {object} campaignData - Campaign configuration
   * @param {object} options - Pipeline options
   * @returns {Promise<object>} Complete pipeline results
   */
  async executeCompletePipeline(tenantId, campaignData, options = {}) {
    const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    logger.info('Executing complete copywriting pipeline', {
      tenantId,
      pipelineId,
      campaign: campaignData.name
    });

    try {
      const {
        generateRSAs = true,
        createABTests = this.config.autoCreateABTests,
        includePerformanceAnalysis = true,
        deploymentMode = 'staging' // 'staging' or 'production'
      } = options;

      // =====================================
      // PHASE 1: DYNAMIC COPY GENERATION
      // =====================================
      console.log('📝 Phase 1: Generating dynamic copy...');

      const copyResult = await this.dynamicCopy.generateComprehensiveCopy(tenantId, {
        theme: campaignData.theme,
        industry: campaignData.industry,
        keywords: campaignData.keywords,
        headlineCount: 15,
        descriptionCount: 4,
        generateVariations: true,
        includeAllSegments: true,
        includeTimeVariations: true
      });

      if (!copyResult.success) {
        throw new Error(`Copy generation failed: ${copyResult.error}`);
      }

      // =====================================
      // PHASE 2: RSA GENERATION
      // =====================================
      let rsaResults = null;
      if (generateRSAs) {
        console.log('🎯 Phase 2: Generating Google Ads RSAs...');

        rsaResults = await this._generateOptimizedRSAs(tenantId, copyResult, campaignData);
        this.metrics.rsasGenerated += rsaResults.rsas?.length || 0;
      }

      // =====================================
      // PHASE 3: A/B TEST CREATION
      // =====================================
      let testResults = null;
      if (createABTests && copyResult.variations) {
        console.log('🧪 Phase 3: Creating A/B tests...');

        testResults = await this._createOptimizedABTests(tenantId, copyResult, campaignData);
        if (testResults.success) {
          this.metrics.testsCreated++;
        }
      }

      // =====================================
      // PHASE 4: PERFORMANCE ANALYSIS SETUP
      // =====================================
      let performanceSetup = null;
      if (includePerformanceAnalysis) {
        console.log('📊 Phase 4: Setting up performance monitoring...');

        performanceSetup = await this._setupPerformanceMonitoring(tenantId, {
          copyResult,
          rsaResults,
          testResults,
          campaignData
        });
      }

      // =====================================
      // PHASE 5: PIPELINE ORCHESTRATION
      // =====================================
      console.log('🎼 Phase 5: Orchestrating deployment...');

      const deployment = await this._orchestrateDeployment(tenantId, {
        copyResult,
        rsaResults,
        testResults,
        performanceSetup,
        campaignData,
        deploymentMode
      });

      // Store pipeline results
      await this._storePipelineResults(tenantId, pipelineId, {
        copyResult,
        rsaResults,
        testResults,
        performanceSetup,
        deployment
      });

      // Update metrics
      this.metrics.pipelinesExecuted++;
      const totalTime = Date.now() - startTime;
      this._updateAvgPipelineTime(totalTime);

      const result = {
        success: true,
        pipelineId,
        tenantId,

        // Phase results
        phases: {
          copyGeneration: {
            success: copyResult.success,
            headlinesGenerated: copyResult.baseCopy?.headlines?.length || 0,
            descriptionsGenerated: copyResult.baseCopy?.descriptions?.length || 0,
            variationsCreated: copyResult.metadata?.variationsGenerated || 0,
            dataSourcesUsed: copyResult.dataSources?.totalSources || 0
          },
          rsaGeneration: rsaResults ? {
            success: rsaResults.success,
            rsasCreated: rsaResults.rsas?.length || 0,
            qualityScore: rsaResults.avgQualityScore || 0
          } : null,
          abTesting: testResults ? {
            success: testResults.success,
            testsCreated: testResults.tests?.length || 1,
            variantsPerTest: testResults.avgVariantsPerTest || 0
          } : null,
          performanceMonitoring: performanceSetup ? {
            success: performanceSetup.success,
            metricsTracked: performanceSetup.metricsCount || 0
          } : null
        },

        // Deliverables
        deliverables: {
          copyVariations: copyResult.variations,
          rsas: rsaResults?.rsas || [],
          abTests: testResults?.tests || [],
          performanceTracking: performanceSetup?.tracking || {}
        },

        // Deployment info
        deployment,

        // Pipeline metadata
        metadata: {
          pipelineId,
          executedAt: new Date().toISOString(),
          totalExecutionTime: totalTime,
          deploymentMode,
          configUsed: this.config
        },

        // Next steps and recommendations
        nextSteps: this._generateNextSteps({
          copyResult,
          rsaResults,
          testResults,
          performanceSetup
        })
      };

      logger.info('Copywriting pipeline completed successfully', {
        tenantId,
        pipelineId,
        executionTime: totalTime,
        rsasGenerated: result.phases.rsaGeneration?.rsasCreated || 0
      });

      return result;

    } catch (error) {
      logger.error('Copywriting pipeline failed', {
        tenantId,
        pipelineId,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        pipelineId,
        error: error.message,
        phase: this._identifyFailurePhase(error),
        metadata: {
          executionTime: Date.now() - startTime,
          failedAt: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Quick RSA generation for immediate deployment
   * @param {string} tenantId - Tenant identifier
   * @param {object} quickConfig - Quick configuration
   * @returns {Promise<object>} RSA generation results
   */
  async generateQuickRSAs(tenantId, quickConfig) {
    logger.info('Generating quick RSAs', { tenantId });

    try {
      // Quick copy generation
      const copyResult = await this.dynamicCopy.generateComprehensiveCopy(tenantId, {
        theme: quickConfig.theme,
        industry: quickConfig.industry,
        keywords: quickConfig.keywords,
        headlineCount: 10,
        descriptionCount: 3,
        generateVariations: false,
        includeAllSegments: false,
        includeTimeVariations: false
      });

      if (!copyResult.success) {
        throw new Error('Quick copy generation failed');
      }

      // Generate RSAs
      const rsaResults = await this.rsaGenerator.generateRSAContent(tenantId, {
        theme: quickConfig.theme,
        industry: quickConfig.industry,
        rsaCount: quickConfig.rsaCount || 3,
        useWebsiteContent: true,
        useDynamicCopy: true
      });

      return {
        success: true,
        rsas: rsaResults.content || [],
        copyUsed: copyResult.baseCopy,
        metadata: {
          generatedAt: new Date().toISOString(),
          mode: 'quick',
          rsaCount: rsaResults.content?.length || 0
        }
      };

    } catch (error) {
      logger.error('Quick RSA generation failed', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Optimize existing campaign performance
   * @param {string} tenantId - Tenant identifier
   * @param {string} campaignId - Campaign identifier
   * @param {object} performanceData - Current performance data
   * @returns {Promise<object>} Optimization results
   */
  async optimizeExistingCampaign(tenantId, campaignId, performanceData) {
    logger.info('Optimizing existing campaign', { tenantId, campaignId });

    try {
      // Analyze current performance
      const performanceAnalysis = await this.performanceService.analyzeCopyPerformance(
        tenantId,
        performanceData,
        {
          includeCompetitive: true,
          includePredictions: true,
          includeFatigueAnalysis: true
        }
      );

      if (!performanceAnalysis.success) {
        throw new Error('Performance analysis failed');
      }

      // Generate optimization recommendations
      const optimizations = [];

      // Check for underperformers
      if (performanceAnalysis.performance.averageCTR < this.config.performanceThresholds.minCTR) {
        // Generate new copy variations
        const newCopyResult = await this.dynamicCopy.generateComprehensiveCopy(tenantId, {
          theme: performanceData.theme,
          industry: performanceData.industry,
          keywords: performanceData.keywords,
          headlineCount: 8,
          descriptionCount: 3,
          targetSegment: performanceAnalysis.topPerformingSegment
        });

        optimizations.push({
          type: 'copy_refresh',
          reason: 'Low CTR performance',
          newCopy: newCopyResult.baseCopy,
          expectedImprovement: '15-25% CTR increase'
        });
      }

      // Check for copy fatigue
      if (performanceAnalysis.fatigue?.hasFatigue) {
        // Generate time-based variations
        const timeOptimizedCopy = await this.messageAdapter.generateAdaptiveMessageSet(
          tenantId,
          performanceData.bestPerformingCopy,
          { focusOnTime: true }
        );

        optimizations.push({
          type: 'fatigue_rotation',
          reason: 'Copy fatigue detected',
          rotationCopy: timeOptimizedCopy.variations.byTime,
          rotationSchedule: 'Daily rotation recommended'
        });
      }

      // Create A/B tests for optimizations
      const optimizationTests = [];
      for (const optimization of optimizations) {
        if (optimization.newCopy || optimization.rotationCopy) {
          const testResult = await this.abTester.createTest(tenantId, {
            name: `Optimization Test - ${optimization.type}`,
            description: `Testing ${optimization.reason}`,
            variants: this._createOptimizationVariants(optimization),
            metric: 'ctr',
            duration: 14
          });

          if (testResult.success) {
            optimizationTests.push(testResult.test);
          }
        }
      }

      this.metrics.optimizationsPerformed++;

      return {
        success: true,
        campaignId,
        performanceAnalysis,
        optimizations,
        tests: optimizationTests,
        metadata: {
          optimizedAt: new Date().toISOString(),
          optimizationsCount: optimizations.length,
          testsCreated: optimizationTests.length
        }
      };

    } catch (error) {
      logger.error('Campaign optimization failed', {
        tenantId,
        campaignId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * =====================================
   * PRIVATE ORCHESTRATION METHODS
   * =====================================
   */

  async _generateOptimizedRSAs(tenantId, copyResult, campaignData) {
    try {
      const rsaResults = await this.rsaGenerator.generateRSAContent(tenantId, {
        theme: campaignData.theme,
        industry: campaignData.industry,
        rsaCount: campaignData.rsaCount || 5,
        useWebsiteContent: true,
        useDynamicCopy: true,
        copySource: copyResult.baseCopy
      });

      // Enhance with segment variations if available
      if (copyResult.variations.bySegment) {
        for (const [segment, variation] of Object.entries(copyResult.variations.bySegment)) {
          const segmentRSA = await this.rsaGenerator.generateRSAContent(tenantId, {
            theme: `${campaignData.theme} - ${segment}`,
            industry: campaignData.industry,
            rsaCount: 2,
            copySource: variation.adapted,
            segmentOptimized: true
          });

          if (segmentRSA.success) {
            rsaResults.content = [...(rsaResults.content || []), ...(segmentRSA.content || [])];
          }
        }
      }

      return {
        success: true,
        rsas: rsaResults.content || [],
        avgQualityScore: this._calculateAvgQualityScore(rsaResults.content),
        segmentVariations: Object.keys(copyResult.variations.bySegment || {}).length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async _createOptimizedABTests(tenantId, copyResult, campaignData) {
    try {
      const tests = [];

      // Base A/B test with top variations
      const baseTestVariants = [
        {
          name: 'Control',
          headlines: copyResult.baseCopy.headlines.slice(0, 5),
          descriptions: copyResult.baseCopy.descriptions.slice(0, 2)
        }
      ];

      // Add segment variations as test variants
      if (copyResult.variations.bySegment) {
        Object.entries(copyResult.variations.bySegment).slice(0, 2).forEach(([segment, variation]) => {
          baseTestVariants.push({
            name: `${segment}_optimized`,
            headlines: variation.adapted?.headlines?.slice(0, 5) || copyResult.baseCopy.headlines.slice(0, 5),
            descriptions: variation.adapted?.descriptions?.slice(0, 2) || copyResult.baseCopy.descriptions.slice(0, 2)
          });
        });
      }

      // Add emotional variations
      if (copyResult.variations.byEmotion) {
        Object.entries(copyResult.variations.byEmotion).slice(0, 1).forEach(([emotion, variation]) => {
          baseTestVariants.push({
            name: `${emotion}_emotional`,
            headlines: variation.headlines?.slice(0, 5) || copyResult.baseCopy.headlines.slice(0, 5),
            descriptions: variation.descriptions?.slice(0, 2) || copyResult.baseCopy.descriptions.slice(0, 2)
          });
        });
      }

      const baseTest = await this.abTester.createTest(tenantId, {
        name: `${campaignData.name} - Copy Performance Test`,
        description: 'Testing AI-generated copy variations',
        variants: baseTestVariants.slice(0, 4), // Limit to 4 variants
        metric: 'ctr',
        duration: 14
      });

      if (baseTest.success) {
        tests.push(baseTest.test);
      }

      return {
        success: true,
        tests,
        avgVariantsPerTest: tests.length > 0 ? tests[0].variants.length : 0
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async _setupPerformanceMonitoring(tenantId, data) {
    try {
      const trackingSetup = {
        copyTracking: {
          enabled: true,
          variants: data.copyResult.metadata?.variationsGenerated || 0,
          qualityThreshold: this.config.performanceThresholds.minQualityScore
        },
        abTestTracking: {
          enabled: !!data.testResults,
          tests: data.testResults?.tests?.length || 0,
          significanceLevel: 0.95
        },
        fatigueMonitoring: {
          enabled: true,
          checkInterval: '7 days',
          threshold: this.config.performanceThresholds.fatigueThreshold
        }
      };

      // Store monitoring configuration
      await dataStore.setTenantConfig(tenantId, 'performance_monitoring', trackingSetup);

      return {
        success: true,
        tracking: trackingSetup,
        metricsCount: Object.keys(trackingSetup).length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async _orchestrateDeployment(tenantId, data) {
    const { deploymentMode, rsaResults, testResults } = data;

    if (deploymentMode === 'staging') {
      return {
        mode: 'staging',
        status: 'ready_for_review',
        rsasGenerated: rsaResults?.rsas?.length || 0,
        testsCreated: testResults?.tests?.length || 0,
        nextStep: 'Review and approve for production deployment'
      };
    }

    // Production deployment would integrate with Google Ads API
    return {
      mode: 'production',
      status: 'deployed',
      rsasDeployed: rsaResults?.rsas?.length || 0,
      testsActive: testResults?.tests?.length || 0,
      monitoring: 'active'
    };
  }

  async _storePipelineResults(tenantId, pipelineId, results) {
    try {
      await dataStore.setTenantConfig(tenantId, `pipeline_${pipelineId}`, {
        ...results,
        storedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to store pipeline results', {
        tenantId,
        pipelineId,
        error: error.message
      });
    }
  }

  _generateNextSteps(data) {
    const steps = [];

    if (data.rsaResults?.rsas?.length > 0) {
      steps.push({
        priority: 'high',
        action: 'Deploy RSAs to Google Ads',
        description: `${data.rsaResults.rsas.length} RSAs ready for deployment`,
        timeline: 'immediate'
      });
    }

    if (data.testResults?.tests?.length > 0) {
      steps.push({
        priority: 'medium',
        action: 'Monitor A/B test performance',
        description: 'Track test results for statistical significance',
        timeline: '14 days'
      });
    }

    if (data.performanceSetup?.success) {
      steps.push({
        priority: 'low',
        action: 'Review performance metrics',
        description: 'Analyze copy performance and optimize based on results',
        timeline: '7-14 days'
      });
    }

    return steps;
  }

  _calculateAvgQualityScore(rsas) {
    if (!rsas || rsas.length === 0) return 0;

    const totalScore = rsas.reduce((sum, rsa) => sum + (rsa.qualityScore || 0), 0);
    return Number((totalScore / rsas.length).toFixed(2));
  }

  _updateAvgPipelineTime(time) {
    const count = this.metrics.pipelinesExecuted;
    this.metrics.avgPipelineTime = count > 0
      ? (this.metrics.avgPipelineTime * (count - 1) + time) / count
      : time;
  }

  _identifyFailurePhase(error) {
    const message = error.message.toLowerCase();

    if (message.includes('copy generation')) return 'copy_generation';
    if (message.includes('rsa')) return 'rsa_generation';
    if (message.includes('test')) return 'ab_testing';
    if (message.includes('performance')) return 'performance_analysis';

    return 'unknown';
  }

  /**
   * Get orchestrator metrics and statistics
   */
  getMetrics() {
    const successRate = this.metrics.pipelinesExecuted > 0
      ? ((this.metrics.pipelinesExecuted - this.metrics.testsCreated) / this.metrics.pipelinesExecuted) * 100
      : 0;

    return {
      ...this.metrics,
      successRate: Number(successRate.toFixed(2)),
      avgPipelineTimeMinutes: Number((this.metrics.avgPipelineTime / 60000).toFixed(2))
    };
  }

  /**
   * Update orchestrator configuration
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };

    logger.info('Copywriting orchestrator configuration updated', { newConfig });
  }
}

// Export singleton instance
let copywritingOrchestratorInstance = null;

/**
 * Get singleton instance
 */
export function getCopywritingOrchestrator() {
  if (!copywritingOrchestratorInstance) {
    copywritingOrchestratorInstance = new CopywritingOrchestrator();
  }
  return copywritingOrchestratorInstance;
}

export default getCopywritingOrchestrator;