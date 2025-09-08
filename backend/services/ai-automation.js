/**
 * AI Automation Service for ProofKit SaaS
 * Provides fully automated AI workflows with token optimization and cost controls
 * 
 * Features:
 * - Automated campaign optimization scheduling per subscription tier
 * - Token usage monitoring and cost controls 
 * - Intelligent prompt optimization for minimal token usage
 * - Automated retry logic and error handling
 * - Performance threshold monitoring
 * - Tier-based automation frequencies
 */

import { getAIProviderService } from "./ai-provider.js";
import { getRSAGenerator } from "./rsa-generator.js";
import { getNegativeAnalyzer } from "./negative-analyzer.js";
import analyticsTiers from "./analytics-tiers.js";
import { getCurrentSubscription } from "../middleware/subscription-check.js";

/**
 * AI Automation Service with comprehensive cost controls
 */
export class AIAutomationService {
  constructor() {
    this.aiService = getAIProviderService();
    this.rsaGenerator = getRSAGenerator();
    this.negativeAnalyzer = getNegativeAnalyzer();
    
    // Token usage tracking
    this.tokenUsage = new Map(); // tenant -> usage stats
    this.costThresholds = new Map(); // tenant -> cost limits
    this.lastOptimization = new Map(); // tenant -> last optimization time
    this.automationQueue = new Map(); // tenant -> queued tasks
    
    // Cost control settings
    this.defaultCostLimits = {
      starter: { daily: 1.00, monthly: 20.00 },     // $1/day, $20/month
      professional: { daily: 5.00, monthly: 100.00 }, // $5/day, $100/month
      enterprise: { daily: 20.00, monthly: 500.00 }   // $20/day, $500/month
    };
    
    // Optimization frequencies by tier (in minutes)
    this.optimizationFrequencies = {
      starter: 1440,      // 24 hours
      professional: 480,  // 8 hours
      enterprise: 240     // 4 hours
    };
    
    // Prompt cache for cost optimization
    this.promptCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    
    // Performance tracking
    this.performanceMetrics = new Map();
    
    this.isRunning = false;
    this.automationInterval = null;
  }

  /**
   * Start the AI automation service
   */
  async start() {
    if (this.isRunning) {
      console.log("AI automation service is already running");
      return;
    }

    this.isRunning = true;
    console.log("🤖 Starting AI automation service...");

    // Run automation check every 5 minutes
    this.automationInterval = setInterval(async () => {
      await this.runAutomationCycle();
    }, 5 * 60 * 1000);

    // Initial run
    await this.runAutomationCycle();
    console.log("✅ AI automation service started successfully");
  }

  /**
   * Stop the AI automation service
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.automationInterval) {
      clearInterval(this.automationInterval);
      this.automationInterval = null;
    }
    console.log("🛑 AI automation service stopped");
  }

  /**
   * Run automation cycle for all tenants
   */
  async runAutomationCycle() {
    if (!this.isRunning) return;

    console.log("🔄 Running AI automation cycle...");
    const startTime = Date.now();
    let processed = 0;
    let errors = 0;

    try {
      // Get all active tenants (this would come from your tenant management system)
      const tenants = await this.getActiveTenants();
      
      for (const tenant of tenants) {
        try {
          await this.processTenantAutomation(tenant);
          processed++;
        } catch (error) {
          console.error(`❌ Automation failed for tenant ${tenant}:`, error.message);
          errors++;
          await this.logError(tenant, 'automation_cycle', error);
        }
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Automation cycle completed: ${processed} processed, ${errors} errors, ${duration}ms`);
      
    } catch (error) {
      console.error("❌ Automation cycle failed:", error);
    }
  }

  /**
   * Process automation for a specific tenant
   */
  async processTenantAutomation(tenant) {
    // Check cost limits first
    if (await this.isOverCostLimit(tenant)) {
      console.log(`💰 Skipping automation for ${tenant} - over cost limit`);
      return;
    }

    // Get tenant subscription tier
    const subscription = await getCurrentSubscription(tenant);
    const tier = subscription?.tier || 'starter';
    
    // Check if optimization is due
    if (!await this.isOptimizationDue(tenant, tier)) {
      return;
    }

    console.log(`🎯 Processing automation for tenant ${tenant} (${tier} tier)`);
    
    const startTime = Date.now();
    const tasks = [];

    // Queue optimization tasks based on tier
    if (await this.shouldRunRSAGeneration(tenant, tier)) {
      tasks.push(this.runAutomatedRSAGeneration(tenant, tier));
    }

    if (await this.shouldRunNegativeAnalysis(tenant, tier)) {
      tasks.push(this.runAutomatedNegativeAnalysis(tenant, tier));
    }

    if (await this.shouldRunCampaignOptimization(tenant, tier)) {
      tasks.push(this.runAutomatedCampaignOptimization(tenant, tier));
    }

    // Execute tasks with cost monitoring
    const results = await Promise.allSettled(tasks);
    
    // Update metrics
    const duration = Date.now() - startTime;
    await this.updatePerformanceMetrics(tenant, {
      tasksCompleted: results.filter(r => r.status === 'fulfilled').length,
      tasksErrored: results.filter(r => r.status === 'rejected').length,
      duration,
      tier
    });

    // Update last optimization time
    this.lastOptimization.set(tenant, Date.now());
    
    console.log(`✅ Completed automation for ${tenant}: ${results.length} tasks, ${duration}ms`);
  }

  /**
   * Run automated RSA generation with cost optimization
   */
  async runAutomatedRSAGeneration(tenant, tier) {
    console.log(`📝 Running automated RSA generation for ${tenant}`);
    
    const startTokens = await this.getCurrentTokenUsage(tenant);
    
    try {
      // Get optimized generation parameters based on tier
      const params = this.getOptimizedRSAParams(tier);
      
      // Use cached prompts when possible
      const cacheKey = `rsa-${tenant}-${JSON.stringify(params)}`;
      const cached = this.promptCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`♻️  Using cached RSA content for ${tenant}`);
        return cached.result;
      }
      
      // Generate RSA content with optimized prompts
      const result = await this.rsaGenerator.generateRSAContent({
        theme: params.theme,
        industry: "general",
        tone: "professional",
        headlineCount: params.headlineCount,
        descriptionCount: params.descriptionCount,
        // Use shorter, optimized prompts for cost savings
        playbookPrompt: "", // Remove verbose prompts for automation
      });

      // Cache successful results
      if (result.success) {
        this.promptCache.set(cacheKey, {
          result,
          timestamp: Date.now()
        });
      }

      const tokensUsed = await this.getCurrentTokenUsage(tenant) - startTokens;
      await this.recordTokenUsage(tenant, 'rsa_generation', tokensUsed);
      
      console.log(`✅ RSA generation completed for ${tenant}: ${tokensUsed} tokens`);
      return result;
      
    } catch (error) {
      console.error(`❌ RSA generation failed for ${tenant}:`, error.message);
      throw error;
    }
  }

  /**
   * Run automated negative keyword analysis with cost optimization
   */
  async runAutomatedNegativeAnalysis(tenant, tier) {
    console.log(`🔍 Running automated negative analysis for ${tenant}`);
    
    const startTokens = await this.getCurrentTokenUsage(tenant);
    
    try {
      // Get search terms data (limited for cost control)
      const searchTerms = await this.getRecentSearchTerms(tenant, tier);
      
      if (searchTerms.length === 0) {
        console.log(`ℹ️  No search terms found for ${tenant}, skipping negative analysis`);
        return { success: true, candidates: [], reason: 'no_data' };
      }

      // Analyze with cost-optimized settings
      const analysisOptions = {
        industry: "general",
        costThreshold: 5.0,
        clickThreshold: 3,
        useAI: tier !== 'starter', // Only use AI for paid tiers
        includeCommonNegatives: true,
        // Remove verbose business context for automation to save tokens
        playbookPrompt: "", 
        desiredKeywords: [],
      };

      const result = await this.negativeAnalyzer.analyzeSearchTerms(
        searchTerms.slice(0, this.getMaxSearchTermsForTier(tier)), // Limit data for cost control
        analysisOptions
      );

      const tokensUsed = await this.getCurrentTokenUsage(tenant) - startTokens;
      await this.recordTokenUsage(tenant, 'negative_analysis', tokensUsed);
      
      console.log(`✅ Negative analysis completed for ${tenant}: ${tokensUsed} tokens, ${result.candidates?.length || 0} candidates`);
      return result;
      
    } catch (error) {
      console.error(`❌ Negative analysis failed for ${tenant}:`, error.message);
      throw error;
    }
  }

  /**
   * Run automated campaign optimization
   */
  async runAutomatedCampaignOptimization(tenant, tier) {
    console.log(`⚡ Running automated campaign optimization for ${tenant}`);
    
    try {
      // Get campaign performance data
      const campaigns = await this.getCampaignPerformanceData(tenant);
      const optimizations = [];
      
      for (const campaign of campaigns) {
        // Apply tier-appropriate optimization logic
        const optimization = await this.optimizeCampaign(campaign, tier);
        if (optimization) {
          optimizations.push(optimization);
        }
      }

      // Apply optimizations if any found
      if (optimizations.length > 0) {
        console.log(`🎯 Applying ${optimizations.length} optimizations for ${tenant}`);
        await this.applyOptimizations(tenant, optimizations);
      }

      return { success: true, optimizations };
      
    } catch (error) {
      console.error(`❌ Campaign optimization failed for ${tenant}:`, error.message);
      throw error;
    }
  }

  /**
   * Check if tenant is over cost limit
   */
  async isOverCostLimit(tenant) {
    const usage = this.tokenUsage.get(tenant) || { daily: 0, monthly: 0 };
    const subscription = await getCurrentSubscription(tenant);
    const tier = subscription?.tier || 'starter';
    const limits = this.defaultCostLimits[tier];
    
    if (usage.daily >= limits.daily || usage.monthly >= limits.monthly) {
      await this.logCostLimitExceeded(tenant, tier, usage, limits);
      return true;
    }
    
    return false;
  }

  /**
   * Check if optimization is due for tenant
   */
  async isOptimizationDue(tenant, tier) {
    const lastRun = this.lastOptimization.get(tenant);
    if (!lastRun) return true; // First run
    
    const frequency = this.optimizationFrequencies[tier] * 60 * 1000; // Convert to ms
    const timeSinceLastRun = Date.now() - lastRun;
    
    return timeSinceLastRun >= frequency;
  }

  /**
   * Get optimized RSA parameters based on tier
   */
  getOptimizedRSAParams(tier) {
    const params = {
      starter: {
        theme: "Business",
        headlineCount: 5,    // Reduced for cost savings
        descriptionCount: 2,  // Reduced for cost savings
      },
      professional: {
        theme: "Business",
        headlineCount: 10,
        descriptionCount: 3,
      },
      enterprise: {
        theme: "Business", 
        headlineCount: 15,
        descriptionCount: 4,
      }
    };
    
    return params[tier] || params.starter;
  }

  /**
   * Get maximum search terms to analyze based on tier (for cost control)
   */
  getMaxSearchTermsForTier(tier) {
    const limits = {
      starter: 10,      // Very limited for cost control
      professional: 25, // Moderate limit
      enterprise: 50    // Higher limit for enterprise
    };
    
    return limits[tier] || limits.starter;
  }

  /**
   * Record token usage for cost monitoring
   */
  async recordTokenUsage(tenant, operation, tokens) {
    if (!this.tokenUsage.has(tenant)) {
      this.tokenUsage.set(tenant, {
        daily: 0,
        monthly: 0,
        byOperation: {},
        lastReset: Date.now()
      });
    }
    
    const usage = this.tokenUsage.get(tenant);
    const cost = tokens * 0.0001; // Approximate cost per token
    
    usage.daily += cost;
    usage.monthly += cost;
    
    if (!usage.byOperation[operation]) {
      usage.byOperation[operation] = { tokens: 0, cost: 0, calls: 0 };
    }
    
    usage.byOperation[operation].tokens += tokens;
    usage.byOperation[operation].cost += cost;
    usage.byOperation[operation].calls += 1;
    
    // Reset daily counter if needed
    const now = new Date();
    const lastReset = new Date(usage.lastReset);
    if (now.toDateString() !== lastReset.toDateString()) {
      usage.daily = cost;
      usage.lastReset = Date.now();
    }
  }

  /**
   * Get current token usage for a tenant (mock implementation)
   */
  async getCurrentTokenUsage(tenant) {
    // This would integrate with your actual AI provider's token counting
    return Math.floor(Math.random() * 100); // Mock value
  }

  /**
   * Get recent search terms for analysis
   */
  async getRecentSearchTerms(tenant, tier) {
    // This would integrate with your sheets service or database
    // For now, return mock data
    const mockTerms = [
      { search_term: "free software", cost: 5.0, clicks: 3, conversions: 0 },
      { search_term: "business solutions", cost: 2.5, clicks: 5, conversions: 1 },
      { search_term: "discount codes", cost: 3.0, clicks: 2, conversions: 0 },
    ];
    
    return mockTerms.slice(0, this.getMaxSearchTermsForTier(tier));
  }

  /**
   * Get campaign performance data
   */
  async getCampaignPerformanceData(tenant) {
    // This would integrate with your metrics system
    return [
      {
        id: 'campaign1',
        name: 'Test Campaign',
        cost: 100,
        conversions: 5,
        clicks: 200,
        cpa: 20
      }
    ];
  }

  /**
   * Optimize individual campaign based on tier capabilities
   */
  async optimizeCampaign(campaign, tier) {
    const tierCapabilities = await analyticsTiers.getTierFeatures(campaign.tenant || 'default');
    
    // Only enterprise tier gets full automated optimization
    if (tier !== 'enterprise' || !tierCapabilities.automatedBidManagement) {
      return null;
    }

    // Simple optimization logic
    if (campaign.cpa > 25 && campaign.conversions > 0) {
      return {
        type: 'bid_reduction',
        campaign: campaign.id,
        currentBid: campaign.cost / campaign.clicks,
        newBid: (campaign.cost / campaign.clicks) * 0.9,
        reason: `High CPA (${campaign.cpa}) - reducing bids by 10%`
      };
    }

    return null;
  }

  /**
   * Apply optimizations to campaigns
   */
  async applyOptimizations(tenant, optimizations) {
    // This would integrate with your campaign management system
    console.log(`📊 Applying ${optimizations.length} optimizations for ${tenant}:`, 
                optimizations.map(o => o.type));
  }

  /**
   * Check if specific automation should run
   */
  async shouldRunRSAGeneration(tenant, tier) {
    // RSA generation runs for all tiers but with different frequencies
    return true;
  }

  async shouldRunNegativeAnalysis(tenant, tier) {
    // Negative analysis runs for professional+ tiers
    return tier === 'professional' || tier === 'enterprise';
  }

  async shouldRunCampaignOptimization(tenant, tier) {
    // Campaign optimization only for enterprise tier
    return tier === 'enterprise';
  }

  /**
   * Get active tenants for automation
   */
  async getActiveTenants() {
    // This would come from your tenant management system
    // For now, return a mock list
    return ['tenant1', 'tenant2', 'tenant3'];
  }

  /**
   * Update performance metrics
   */
  async updatePerformanceMetrics(tenant, metrics) {
    if (!this.performanceMetrics.has(tenant)) {
      this.performanceMetrics.set(tenant, {
        totalRuns: 0,
        averageDuration: 0,
        successRate: 0,
        totalTasks: 0,
        totalErrors: 0
      });
    }

    const perf = this.performanceMetrics.get(tenant);
    perf.totalRuns++;
    perf.averageDuration = (perf.averageDuration * (perf.totalRuns - 1) + metrics.duration) / perf.totalRuns;
    perf.totalTasks += metrics.tasksCompleted + metrics.tasksErrored;
    perf.totalErrors += metrics.tasksErrored;
    perf.successRate = ((perf.totalTasks - perf.totalErrors) / perf.totalTasks) * 100;
  }

  /**
   * Log cost limit exceeded
   */
  async logCostLimitExceeded(tenant, tier, usage, limits) {
    console.warn(`💰 Cost limit exceeded for ${tenant} (${tier}):`, {
      daily: `$${usage.daily.toFixed(2)} / $${limits.daily.toFixed(2)}`,
      monthly: `$${usage.monthly.toFixed(2)} / $${limits.monthly.toFixed(2)}`
    });
  }

  /**
   * Log automation errors
   */
  async logError(tenant, operation, error) {
    console.error(`❌ Automation error for ${tenant}:`, {
      operation,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get automation status and metrics
   */
  getStatus() {
    return {
      running: this.isRunning,
      totalTenants: this.tokenUsage.size,
      tokenUsage: Object.fromEntries(this.tokenUsage),
      performanceMetrics: Object.fromEntries(this.performanceMetrics),
      cacheSize: this.promptCache.size,
      costLimits: this.defaultCostLimits,
      optimizationFrequencies: this.optimizationFrequencies
    };
  }

  /**
   * Get tenant-specific automation status
   */
  getTenantStatus(tenant) {
    return {
      tokenUsage: this.tokenUsage.get(tenant) || {},
      lastOptimization: this.lastOptimization.get(tenant),
      performanceMetrics: this.performanceMetrics.get(tenant) || {},
      queuedTasks: this.automationQueue.get(tenant) || []
    };
  }

  /**
   * Clear tenant data (for cleanup)
   */
  clearTenantData(tenant) {
    this.tokenUsage.delete(tenant);
    this.lastOptimization.delete(tenant);
    this.performanceMetrics.delete(tenant);
    this.automationQueue.delete(tenant);
  }
}

// Export singleton instance
let aiAutomationInstance = null;

/**
 * Get singleton AI automation service instance
 */
export function getAIAutomationService() {
  if (!aiAutomationInstance) {
    aiAutomationInstance = new AIAutomationService();
  }
  return aiAutomationInstance;
}

/**
 * Initialize and start AI automation service
 */
export async function startAIAutomation() {
  const service = getAIAutomationService();
  await service.start();
  return service;
}

/**
 * Stop AI automation service
 */
export function stopAIAutomation() {
  const service = getAIAutomationService();
  service.stop();
}

export default getAIAutomationService;