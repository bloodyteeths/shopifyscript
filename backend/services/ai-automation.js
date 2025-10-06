/**
 * AI Automation Service for Ads Autopilot AI SaaS
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
import tenantRegistry from "./tenant-registry.js";
import dataStore from "./data-store.js";
import { getCompetitorIntelligenceService } from "./competitor-intelligence.js";
import { getSERPMonitorService } from "./serp-monitor.js";
import { getAdSpyService } from "./ad-spy.js";
import demographicProfiler from "./demographic-profiler.js";
import customerSegmentation from "./customer-segmentation.js";
import audienceBuilder from "./audience-builder.js";
import { broadcastToTenant, WS_EVENTS, MESSAGE_PRIORITY } from "./websocket-server.js";

/**
 * AI Automation Service with comprehensive cost controls
 */
export class AIAutomationService {
  constructor() {
    this.aiService = getAIProviderService();
    this.rsaGenerator = getRSAGenerator();
    this.negativeAnalyzer = getNegativeAnalyzer();
    this.competitorIntelligence = getCompetitorIntelligenceService();
    this.serpMonitor = getSERPMonitorService();
    this.adSpy = getAdSpyService();

    // Customer intelligence services
    this.demographicProfiler = demographicProfiler;
    this.customerSegmentation = customerSegmentation;
    this.audienceBuilder = audienceBuilder;

    // Token usage tracking
    this.tokenUsage = new Map(); // tenant -> usage stats
    this.costThresholds = new Map(); // tenant -> cost limits
    this.lastOptimization = new Map(); // tenant -> last optimization time
    this.automationQueue = new Map(); // tenant -> queued tasks
    this.lastAudienceSync = new Map(); // tenant -> last audience sync time
    
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

    // Add competitor intelligence tasks for professional+ tiers
    if (await this.shouldRunCompetitorIntelligence(tenant, tier)) {
      tasks.push(this.runCompetitorIntelligenceAutomation(tenant, tier));
    }

    // Add customer intelligence and audience sync for professional+ tiers
    if (await this.shouldRunAudienceSync(tenant, tier)) {
      tasks.push(this.runAudienceSyncAutomation(tenant, tier));
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
    const optimizationId = `rsa-${tenant}-${Date.now()}`;

    // Emit optimization created event
    await broadcastToTenant(tenant, {
      type: WS_EVENTS.OPTIMIZATION_CREATED,
      optimizationId,
      campaign: 'RSA Generation',
      details: {
        type: 'rsa_generation',
        tier,
        startTime: new Date().toISOString()
      }
    }, MESSAGE_PRIORITY.NORMAL);

    try {
      // Get optimized generation parameters based on tier
      const params = this.getOptimizedRSAParams(tier);

      // Use cached prompts when possible
      const cacheKey = `rsa-${tenant}-${JSON.stringify(params)}`;
      const cached = this.promptCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`♻️  Using cached RSA content for ${tenant}`);

        // Emit optimization applied event for cached result
        await broadcastToTenant(tenant, {
          type: WS_EVENTS.OPTIMIZATION_APPLIED,
          optimizationId,
          campaign: 'RSA Generation',
          details: {
            type: 'rsa_generation',
            cached: true,
            result: cached.result
          }
        }, MESSAGE_PRIORITY.NORMAL);

        return cached.result;
      }

      // Generate RSA content with optimized prompts and website content
      const result = await this.rsaGenerator.generateRSAContent({
        theme: params.theme,
        industry: "general",
        tone: "professional",
        headlineCount: params.headlineCount,
        descriptionCount: params.descriptionCount,
        tenant: tenant, // Pass tenant for website content lookup
        useWebsiteContent: true, // Enable website content integration
        // Use shorter, optimized prompts for cost savings
        playbookPrompt: "", // Remove verbose prompts for automation
      });

      // Cache successful results
      if (result.success) {
        this.promptCache.set(cacheKey, {
          result,
          timestamp: Date.now()
        });

        // Emit optimization applied event for successful generation
        await broadcastToTenant(tenant, {
          type: WS_EVENTS.OPTIMIZATION_APPLIED,
          optimizationId,
          campaign: 'RSA Generation',
          details: {
            type: 'rsa_generation',
            cached: false,
            result,
            tokensUsed: await this.getCurrentTokenUsage(tenant) - startTokens
          }
        }, MESSAGE_PRIORITY.NORMAL);
      } else {
        // Emit optimization failed event
        await broadcastToTenant(tenant, {
          type: WS_EVENTS.OPTIMIZATION_FAILED,
          optimizationId,
          campaign: 'RSA Generation',
          details: {
            type: 'rsa_generation',
            error: result.error || 'Generation failed',
            tokensUsed: await this.getCurrentTokenUsage(tenant) - startTokens
          }
        }, MESSAGE_PRIORITY.HIGH);
      }

      const tokensUsed = await this.getCurrentTokenUsage(tenant) - startTokens;
      await this.recordTokenUsage(tenant, 'rsa_generation', tokensUsed);

      console.log(`✅ RSA generation completed for ${tenant}: ${tokensUsed} tokens`);
      return result;

    } catch (error) {
      console.error(`❌ RSA generation failed for ${tenant}:`, error.message);

      // Emit optimization failed event
      await broadcastToTenant(tenant, {
        type: WS_EVENTS.OPTIMIZATION_FAILED,
        optimizationId,
        campaign: 'RSA Generation',
        details: {
          type: 'rsa_generation',
          error: error.message,
          tokensUsed: await this.getCurrentTokenUsage(tenant) - startTokens
        }
      }, MESSAGE_PRIORITY.HIGH);

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
   * Get recent search terms for analysis (UPDATED: Uses data-store)
   */
  async getRecentSearchTerms(tenant, tier) {
    try {
      const maxTerms = this.getMaxSearchTermsForTier(tier);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days

      // Get search terms from data-store (Supabase-first, Sheets-fallback)
      const searchTerms = await dataStore.getSearchTerms(tenant, {
        startDate,
        endDate,
        limit: maxTerms
      });

      return searchTerms;
    } catch (error) {
      console.error(`Failed to get search terms for ${tenant}:`, error.message);
      // Return empty array on error
      return [];
    }
  }

  /**
   * Get campaign performance data (UPDATED: Uses data-store)
   */
  async getCampaignPerformanceData(tenant) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days

      // Get metrics from data-store (Supabase-first, Sheets-fallback)
      const metrics = await dataStore.getMetrics(tenant, startDate, endDate, 'campaign');

      // Transform metrics into campaign performance objects
      const campaigns = [];
      const campaignMap = new Map();

      metrics.forEach(metric => {
        const key = metric.campaign_name || metric.entity_name;
        if (!key) return;

        if (!campaignMap.has(key)) {
          campaignMap.set(key, {
            id: metric.entity_id || key,
            name: key,
            cost: 0,
            conversions: 0,
            clicks: 0,
            impressions: 0,
            cpa: 0
          });
        }

        const campaign = campaignMap.get(key);
        campaign.cost += (metric.cost_micros || 0) / 1000000; // Convert from micros
        campaign.conversions += metric.conversions || 0;
        campaign.clicks += metric.clicks || 0;
        campaign.impressions += metric.impressions || 0;
      });

      // Calculate CPA for each campaign
      campaignMap.forEach(campaign => {
        campaign.cpa = campaign.conversions > 0
          ? campaign.cost / campaign.conversions
          : 0;
        campaigns.push(campaign);
      });

      return campaigns;
    } catch (error) {
      console.error(`Failed to get campaign performance for ${tenant}:`, error.message);
      return [];
    }
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

  async shouldRunCompetitorIntelligence(tenant, tier) {
    // Competitor intelligence for professional+ tiers
    return tier === 'professional' || tier === 'enterprise';
  }

  async shouldRunAudienceSync(tenant, tier) {
    // Audience sync for professional+ tiers
    if (tier !== 'professional' && tier !== 'enterprise') {
      return false;
    }

    // Check last sync time - daily for professional, every 6 hours for enterprise
    const lastSync = this.lastAudienceSync.get(tenant);
    const syncInterval = tier === 'enterprise' ? 6 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    if (!lastSync || Date.now() - lastSync > syncInterval) {
      return true;
    }

    return false;
  }

  /**
   * Run audience sync automation with customer intelligence
   */
  async runAudienceSyncAutomation(tenant, tier) {
    console.log(`👥 Running audience sync automation for ${tenant}`);

    const startTime = Date.now();

    try {
      // Step 1: Generate demographic profile
      console.log(`📊 Generating demographic profile for ${tenant}`);
      const demographics = await this.demographicProfiler.generateDemographicProfile(tenant, {
        refreshCache: true,
        minOrders: 1,
        minSpend: 0,
        includeIndividuals: false
      });

      await dataStore.addLog(tenant, 'info',
        `Demographic profile generated: ${demographics.totalCustomers} customers analyzed`,
        {
          highValueProfiles: demographics.highValueProfiles?.count || 0,
          topInterests: demographics.interests ? Object.keys(demographics.interests).slice(0, 3) : []
        }
      );

      // Step 2: Perform customer segmentation
      console.log(`🎯 Segmenting customers for ${tenant}`);
      const segmentation = await this.customerSegmentation.segmentCustomers(tenant, {
        refreshCache: true,
        includeCustomerIds: false,
        minOrders: 1
      });

      await dataStore.addLog(tenant, 'info',
        `Customer segmentation completed: ${segmentation.totalCustomers} customers segmented`,
        {
          segments: Object.keys(segmentation.rfmSegments || {}).length,
          vipCount: segmentation.specialGroups?.vip?.count || 0,
          atRiskCount: segmentation.specialGroups?.atRisk?.count || 0
        }
      );

      // Step 3: Build audiences for Google Ads
      console.log(`🎨 Building audiences for ${tenant}`);
      const audiences = await this.audienceBuilder.buildAudiences(tenant, {
        refreshCache: true,
        includeCustomerMatch: true,
        includeLookalikes: tier === 'enterprise', // Lookalikes only for enterprise
        includeExclusions: true,
        minCustomers: 100,
        exportFormat: 'google_ads'
      });

      // Log audience build results
      const audienceMetrics = audiences.metrics || {};
      await dataStore.addLog(tenant, 'info',
        `Audiences built: ${audienceMetrics.totalAudiences || 0} audiences created`,
        {
          totalCustomers: audiences.totalCustomers,
          customerMatchLists: audiences.customerMatchLists ? Object.keys(audiences.customerMatchLists).length : 0,
          lookalikeAudiences: audiences.lookalikeAudiences ? Object.keys(audiences.lookalikeAudiences).length : 0,
          exclusionLists: audiences.exclusionLists ? Object.keys(audiences.exclusionLists).length : 0
        }
      );

      // Step 4: Store audience recommendations for user review
      if (audiences.recommendations && audiences.recommendations.length > 0) {
        await dataStore.setTenantConfig(tenant, 'audience_recommendations', {
          recommendations: audiences.recommendations,
          generatedAt: new Date().toISOString(),
          demographics: demographics.highValueProfiles,
          segmentation: segmentation.specialGroups
        });

        // Log urgent recommendations
        const urgentRecs = audiences.recommendations.filter(r => r.priority === 'urgent' || r.priority === 'high');
        if (urgentRecs.length > 0) {
          await dataStore.addLog(tenant, 'warning',
            `${urgentRecs.length} high-priority audience recommendations available`,
            { recommendations: urgentRecs.map(r => r.title) }
          );
        }
      }

      // Step 5: Store segmentation insights
      if (segmentation.insights && segmentation.insights.length > 0) {
        const urgentInsights = segmentation.insights.filter(i => i.priority === 'urgent');
        if (urgentInsights.length > 0) {
          await dataStore.addLog(tenant, 'warning',
            `${urgentInsights.length} urgent customer insights require action`,
            { insights: urgentInsights.map(i => i.message) }
          );
        }
      }

      // Update last sync time
      this.lastAudienceSync.set(tenant, Date.now());

      const duration = Date.now() - startTime;
      console.log(`✅ Audience sync completed for ${tenant}: ${duration}ms`);

      return {
        success: true,
        demographics,
        segmentation,
        audiences,
        duration
      };

    } catch (error) {
      console.error(`❌ Audience sync failed for ${tenant}:`, error.message);
      await dataStore.addLog(tenant, 'error',
        `Audience sync automation failed: ${error.message}`,
        { error: error.stack }
      );
      throw error;
    }
  }

  /**
   * Run competitor intelligence automation
   */
  async runCompetitorIntelligenceAutomation(tenant, tier) {
    console.log(`🕵️  Running competitor intelligence automation for ${tenant}`);

    const startTime = Date.now();

    try {
      // Get business context for competitor identification
      const businessContext = await dataStore.getAllTenantConfigs(tenant);
      const industry = businessContext.industry || 'general';

      // Step 1: Identify/Update competitors (weekly for professional, daily for enterprise)
      const lastCompetitorCheck = await dataStore.getTenantConfig(tenant, 'last_competitor_check', {
        defaultValue: null
      });

      const shouldUpdateCompetitors = !lastCompetitorCheck ||
        Date.now() - new Date(lastCompetitorCheck).getTime() > (tier === 'enterprise' ? 24 : 168) * 60 * 60 * 1000;

      if (shouldUpdateCompetitors) {
        console.log(`🔍 Identifying competitors for ${tenant}`);
        const competitors = await this.competitorIntelligence.identifyCompetitors(tenant, {
          industry,
          targetAudience: businessContext.target_audience
        });

        await dataStore.setTenantConfig(tenant, 'last_competitor_check', new Date());

        // Step 2: Monitor competitor domains
        if (competitors.length > 0) {
          console.log(`👀 Monitoring ${competitors.length} competitor domains`);
          const changes = await this.competitorIntelligence.monitorCompetitorDomains(tenant, competitors);

          if (changes.length > 0) {
            await dataStore.addLog(tenant, 'info',
              `Competitor intelligence: ${changes.length} changes detected`,
              { changes: changes.slice(0, 3) }
            );
          }
        }
      }

      // Step 3: Track SERP positions (for enterprise tier)
      if (tier === 'enterprise') {
        console.log(`📊 Tracking SERP positions for ${tenant}`);
        const serpData = await this.serpMonitor.trackKeywordPositions(tenant);

        // Detect new competitors
        const newCompetitors = await this.serpMonitor.detectNewCompetitors(tenant);

        if (newCompetitors.length > 0) {
          await dataStore.addLog(tenant, 'warning',
            `${newCompetitors.length} new competitors detected in search results`,
            { competitors: newCompetitors }
          );
        }
      }

      // Step 4: Analyze competitor ads (weekly)
      const lastAdAnalysis = await dataStore.getTenantConfig(tenant, 'last_ad_analysis', {
        defaultValue: null
      });

      const shouldAnalyzeAds = !lastAdAnalysis ||
        Date.now() - new Date(lastAdAnalysis).getTime() > 7 * 24 * 60 * 60 * 1000;

      if (shouldAnalyzeAds) {
        console.log(`📝 Analyzing competitor ad copy for ${tenant}`);
        const competitors = await this.competitorIntelligence._getStoredCompetitors(tenant);

        if (competitors.length > 0) {
          const adAnalysis = await this.adSpy.analyzeCompetitorAdCopy(tenant, competitors);
          await dataStore.setTenantConfig(tenant, 'last_ad_analysis', new Date());

          // Generate competitive ad recommendations
          if (adAnalysis.insights) {
            await dataStore.addLog(tenant, 'info',
              'Competitor ad analysis completed',
              {
                competitors_analyzed: adAnalysis.competitors_analyzed,
                insights: adAnalysis.insights.insights?.slice(0, 2)
              }
            );
          }
        }
      }

      // Step 5: Identify market gaps (for enterprise tier, monthly)
      if (tier === 'enterprise') {
        const lastGapAnalysis = await dataStore.getTenantConfig(tenant, 'last_gap_analysis', {
          defaultValue: null
        });

        const shouldAnalyzeGaps = !lastGapAnalysis ||
          Date.now() - new Date(lastGapAnalysis).getTime() > 30 * 24 * 60 * 60 * 1000;

        if (shouldAnalyzeGaps) {
          console.log(`🎯 Identifying market gaps for ${tenant}`);
          const gapAnalysis = await this.competitorIntelligence.identifyMarketGaps(tenant, {
            industry
          });

          await dataStore.setTenantConfig(tenant, 'last_gap_analysis', new Date());

          if (gapAnalysis.gaps && gapAnalysis.gaps.length > 0) {
            await dataStore.addLog(tenant, 'info',
              `Market gap analysis: ${gapAnalysis.gaps.length} opportunities identified`,
              { gaps: gapAnalysis.gaps.slice(0, 3) }
            );
          }
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Competitor intelligence automation completed for ${tenant}: ${duration}ms`);

      return {
        success: true,
        duration,
        tier
      };

    } catch (error) {
      console.error(`❌ Competitor intelligence automation failed for ${tenant}:`, error.message);
      throw error;
    }
  }

  /**
   * Get active tenants for automation
   */
  async getActiveTenants() {
    try {
      // Ensure tenant registry is initialized
      if (!tenantRegistry.isInitialized) {
        await tenantRegistry.initialize();
      }

      // Get all tenants from the registry
      const allTenants = tenantRegistry.getAllTenants();

      // Filter for enabled tenants only
      const activeTenants = allTenants
        .filter(tenant => tenant.enabled !== false)
        .map(tenant => tenant.id);

      console.log(`Found ${activeTenants.length} active tenants for AI automation`);
      return activeTenants;
    } catch (error) {
      console.error("Failed to get active tenants from registry:", error.message);
      // Return empty array to prevent automation failures
      return [];
    }
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
   * Log cost limit exceeded (UPDATED: Uses data-store)
   */
  async logCostLimitExceeded(tenant, tier, usage, limits) {
    console.warn(`💰 Cost limit exceeded for ${tenant} (${tier}):`, {
      daily: `$${usage.daily.toFixed(2)} / $${limits.daily.toFixed(2)}`,
      monthly: `$${usage.monthly.toFixed(2)} / $${limits.monthly.toFixed(2)}`
    });

    // Log to data-store
    await dataStore.addLog(tenant, 'warning', 'Cost limit exceeded', {
      tier,
      usage: {
        daily: usage.daily,
        monthly: usage.monthly
      },
      limits: {
        daily: limits.daily,
        monthly: limits.monthly
      }
    });
  }

  /**
   * Log automation errors (UPDATED: Uses data-store)
   */
  async logError(tenant, operation, error) {
    console.error(`❌ Automation error for ${tenant}:`, {
      operation,
      error: error.message,
      timestamp: new Date().toISOString()
    });

    // Log to data-store
    await dataStore.addLog(tenant, 'error', `Automation error: ${operation}`, {
      operation,
      error: error.message,
      stack: error.stack
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