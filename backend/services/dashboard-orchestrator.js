/**
 * Dashboard Orchestrator Service for Ads Autopilot AI SaaS
 * Aggregates data from all AI services for dashboard consumption
 *
 * Features:
 * - Aggregates data from all 5 AI services
 * - Intelligent caching with <500ms response time
 * - Graceful error handling and service recovery
 * - Performance monitoring and optimization
 * - Data transformation for frontend consumption
 */

import dataStore from './data-store.js';
import dashboardCache from './dashboard-cache.js';
import dashboardTransformer from './dashboard-transformer.js';
import logger from './logger.js';

// Import AI services
import { getWebsiteScraper } from './website-scraper.js';
import { getCompetitorIntelligenceService } from './competitor-intelligence.js';
import trafficAnalyzer from './traffic-analyzer.js';
import demographicProfiler from './demographic-profiler.js';
import { getSERPMonitorService as getSerpMonitorService } from './serp-monitor.js';
import { broadcastToTenant, broadcastSystemEvent, WS_EVENTS, MESSAGE_PRIORITY } from './websocket-server.js';

// Import optimization services
import { getCampaignOptimizer } from './campaign-optimizer.js';
import { getBidManager } from './bid-manager.js';
import { getBudgetAllocator } from './budget-allocator.js';
import { getDynamicCopyGenerator as getDynamicCopyService } from './dynamic-copy.js';
import { getABTestingService } from './ab-tester.js';

// Import Google Ads client for auction insights aggregation
import * as googleAdsClient from './google-ads-client.js';

/**
 * Dashboard Orchestrator - Central data aggregation service
 */
class DashboardOrchestratorService {
  constructor() {
    this.services = null;
    this.performanceTracker = {
      requestCount: 0,
      totalResponseTime: 0,
      errorCount: 0,
      cacheHitCount: 0,
      lastHealthCheck: null
    };

    // Service availability tracking
    this.serviceHealth = new Map();

    // Response time target
    this.responseTimeTarget = 500; // 500ms

    console.log('🎯 Dashboard Orchestrator Service initialized');
  }

  /**
   * Initialize services with lazy loading
   */
  async _initializeServices() {
    if (this.services) return this.services;

    try {
      this.services = {
        // Data sources
        websiteScraper: await getWebsiteScraper(),
        competitorIntelligence: await getCompetitorIntelligenceService(),
        trafficAnalyzer,
        demographicProfiler,
        serpMonitor: await getSerpMonitorService(),

        // Optimization services
        campaignOptimizer: await getCampaignOptimizer(),
        bidManager: await getBidManager(),
        budgetAllocator: await getBudgetAllocator(),
        dynamicCopy: await getDynamicCopyService(),
        abTester: await getABTestingService()
      };

      logger.info('Dashboard orchestrator services initialized');
      return this.services;
    } catch (error) {
      logger.error('Failed to initialize dashboard services', { error: error.message });
      throw error;
    }
  }

  /**
   * =====================================
   * MAIN DASHBOARD ENDPOINTS
   * =====================================
   */

  /**
   * Get system overview - Overall system health and stats
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<object>} System overview data
   */
  async getSystemOverview(tenantId) {
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = dashboardCache.get(tenantId, 'system_overview');
      if (cached) {
        this._trackPerformance(startTime, true);
        return cached;
      }

      // Initialize services
      await this._initializeServices();

      // Aggregate data from multiple sources
      const [
        campaignData,
        metricsData,
        dataSourcesStatus,
        optimizationQueue
      ] = await Promise.allSettled([
        this._getCampaignSummary(tenantId),
        this._getMetricsSummary(tenantId),
        this._getDataSourcesStatus(tenantId),
        this._getOptimizationQueueSummary(tenantId)
      ]);

      // Transform data
      const overview = dashboardTransformer.transformSystemOverview({
        campaigns: this._extractValue(campaignData),
        metrics: this._extractValue(metricsData),
        dataSourcesStatus: this._extractValue(dataSourcesStatus),
        optimizationQueue: this._extractValue(optimizationQueue)
      });

      // Cache result
      dashboardCache.set(tenantId, 'system_overview', overview);

      this._trackPerformance(startTime, false);
      return overview;

    } catch (error) {
      this._trackError(error);
      logger.error('Failed to get system overview', {
        tenantId,
        error: error.message,
        duration: Date.now() - startTime
      });

      // Return cached data if available, otherwise empty structure
      return dashboardCache.get(tenantId, 'system_overview') ||
        dashboardTransformer.transformSystemOverview({});
    }
  }

  /**
   * Get data sources summary - Status of all 5 data sources
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<object>} Data sources summary
   */
  async getDataSourcesSummary(tenantId) {
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = dashboardCache.get(tenantId, 'data_sources_summary');
      if (cached) {
        this._trackPerformance(startTime, true);
        return cached;
      }

      // Initialize services
      await this._initializeServices();

      // Get status from all data sources
      const [
        scraperStatus,
        competitorStatus,
        trafficStatus,
        profilerStatus,
        serpStatus
      ] = await Promise.allSettled([
        this._getServiceStatus('websiteScraper', tenantId),
        this._getServiceStatus('competitorIntelligence', tenantId),
        this._getServiceStatus('trafficAnalyzer', tenantId),
        this._getServiceStatus('demographicProfiler', tenantId),
        this._getServiceStatus('serpMonitor', tenantId)
      ]);

      // Transform data
      const summary = dashboardTransformer.transformDataSourcesSummary({
        websiteScraper: this._extractValue(scraperStatus),
        competitorIntelligence: this._extractValue(competitorStatus),
        trafficAnalyzer: this._extractValue(trafficStatus),
        customerProfiler: this._extractValue(profilerStatus),
        serpMonitor: this._extractValue(serpStatus)
      });

      // Cache result
      dashboardCache.set(tenantId, 'data_sources_summary', summary);

      this._trackPerformance(startTime, false);
      return summary;

    } catch (error) {
      this._trackError(error);
      logger.error('Failed to get data sources summary', {
        tenantId,
        error: error.message,
        duration: Date.now() - startTime
      });

      return dashboardTransformer.transformDataSourcesSummary({});
    }
  }

  /**
   * Get optimization queue - Pending and applied optimizations
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<object>} Optimization queue data
   */
  async getOptimizationQueue(tenantId) {
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = dashboardCache.get(tenantId, 'optimization_queue');
      if (cached) {
        this._trackPerformance(startTime, true);
        return cached;
      }

      // Initialize services
      await this._initializeServices();

      // Get optimization data from all engines
      const [
        campaignOptimizations,
        bidOptimizations,
        budgetOptimizations,
        copyOptimizations,
        testOptimizations
      ] = await Promise.allSettled([
        this._getCampaignOptimizations(tenantId),
        this._getBidOptimizations(tenantId),
        this._getBudgetOptimizations(tenantId),
        this._getCopyOptimizations(tenantId),
        this._getTestOptimizations(tenantId)
      ]);

      // Combine all optimizations
      const allOptimizations = [
        ...this._extractValue(campaignOptimizations),
        ...this._extractValue(bidOptimizations),
        ...this._extractValue(budgetOptimizations),
        ...this._extractValue(copyOptimizations),
        ...this._extractValue(testOptimizations)
      ];

      // Transform data
      const queue = dashboardTransformer.transformOptimizationQueue(allOptimizations);

      // Cache result
      dashboardCache.set(tenantId, 'optimization_queue', queue);

      this._trackPerformance(startTime, false);
      return queue;

    } catch (error) {
      this._trackError(error);
      logger.error('Failed to get optimization queue', {
        tenantId,
        error: error.message,
        duration: Date.now() - startTime
      });

      return dashboardTransformer.transformOptimizationQueue([]);
    }
  }

  /**
   * Get performance metrics - ROI, conversions, etc.
   * @param {string} tenantId - Tenant identifier
   * @param {string} timeframe - Time period (7d, 30d, 90d)
   * @returns {Promise<object>} Performance metrics data
   */
  async getPerformanceMetrics(tenantId, timeframe = '7d') {
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = dashboardCache.get(tenantId, 'performance_metrics', { timeframe });
      if (cached) {
        this._trackPerformance(startTime, true);
        return cached;
      }

      // Calculate date range
      const { startDate, endDate } = this._getDateRange(timeframe);

      // Get metrics data
      const [
        metricsData,
        conversionData,
        revenueData
      ] = await Promise.allSettled([
        dataStore.getMetrics(tenantId, startDate, endDate),
        this._getConversionData(tenantId, startDate, endDate),
        this._getRevenueData(tenantId, startDate, endDate)
      ]);

      // Transform data
      const metrics = dashboardTransformer.transformPerformanceMetrics(
        this._extractValue(metricsData),
        timeframe
      );

      // Add conversion and revenue data
      metrics.conversions = this._extractValue(conversionData);
      metrics.revenue = this._extractValue(revenueData);

      // Cache result
      dashboardCache.set(tenantId, 'performance_metrics', metrics, { timeframe });

      this._trackPerformance(startTime, false);
      return metrics;

    } catch (error) {
      this._trackError(error);
      logger.error('Failed to get performance metrics', {
        tenantId,
        timeframe,
        error: error.message,
        duration: Date.now() - startTime
      });

      return dashboardTransformer.transformPerformanceMetrics([], timeframe);
    }
  }

  /**
   * Get activity feed - Recent AI actions
   * @param {string} tenantId - Tenant identifier
   * @param {number} limit - Number of activities to return
   * @returns {Promise<object>} Activity feed data
   */
  async getActivityFeed(tenantId, limit = 50) {
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = dashboardCache.get(tenantId, 'activity_feed', { limit });
      if (cached) {
        this._trackPerformance(startTime, true);
        return cached;
      }

      // Get activity logs from all services
      const [
        runLogs,
        optimizationLogs,
        systemLogs
      ] = await Promise.allSettled([
        dataStore.getLogs(tenantId, { logType: 'mutation', limit }),
        this._getOptimizationLogs(tenantId, limit),
        this._getSystemLogs(tenantId, limit)
      ]);

      // Combine all activities
      const allActivities = [
        ...this._extractValue(runLogs),
        ...this._extractValue(optimizationLogs),
        ...this._extractValue(systemLogs)
      ];

      // Transform data
      const feed = dashboardTransformer.transformActivityFeed(allActivities, limit);

      // Cache result
      dashboardCache.set(tenantId, 'activity_feed', feed, { limit });

      this._trackPerformance(startTime, false);
      return feed;

    } catch (error) {
      this._trackError(error);
      logger.error('Failed to get activity feed', {
        tenantId,
        limit,
        error: error.message,
        duration: Date.now() - startTime
      });

      return dashboardTransformer.transformActivityFeed([], limit);
    }
  }

  /**
   * =====================================
   * DATA-SOURCE INSIGHT ENDPOINTS
   * (called by /api/dashboard/insights routes)
   * =====================================
   */

  /**
   * Get competitor insights — aggregates Google Ads auction insights
   * across all active campaigns and transforms them into the
   * CompetitorIntelData shape the frontend expects.
   *
   * @param {string} tenantId
   * @param {object} options
   * @returns {Promise<object>}
   */
  async getCompetitorInsights(tenantId, options = {}) {
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = dashboardCache.get(tenantId, 'competitor_insights');
      if (cached) {
        this._trackPerformance(startTime, true);
        return { ...cached, fromCache: true };
      }

      // 1. Fetch all active campaigns for the tenant
      let campaigns = [];
      try {
        campaigns = await googleAdsClient.listCampaigns(tenantId);
      } catch (err) {
        logger.warn('Could not list campaigns for competitor insights', {
          tenantId,
          error: err.message
        });
      }

      const activeCampaigns = campaigns.filter(c =>
        c.status === 'ENABLED' || c.status === 'ACTIVE'
      );

      // 2. Fetch auction insights for each active campaign (in parallel)
      const auctionResults = await Promise.allSettled(
        activeCampaigns.map(c =>
          googleAdsClient.getAuctionInsights(tenantId, c.id)
            .then(insights => ({ campaignId: c.id, campaignName: c.name, insights }))
        )
      );

      // 3. Aggregate auction insights across campaigns — deduplicate by domain
      const domainMap = new Map();
      for (const result of auctionResults) {
        if (result.status !== 'fulfilled') continue;
        const { campaignName, insights } = result.value;
        for (const row of (insights || [])) {
          const domain = row.displayDomain;
          if (!domain) continue;

          if (!domainMap.has(domain)) {
            domainMap.set(domain, {
              domain,
              impressionShares: [],
              overlapRates: [],
              positionAboveRates: [],
              topImpressionPcts: [],
              absTopImpressionPcts: [],
              outrankingShares: [],
              campaigns: new Set()
            });
          }
          const entry = domainMap.get(domain);
          entry.impressionShares.push(row.impressionShare);
          entry.overlapRates.push(row.overlapRate);
          entry.positionAboveRates.push(row.positionAboveRate);
          entry.topImpressionPcts.push(row.topImpressionPct);
          entry.absTopImpressionPcts.push(row.absTopImpressionPct);
          entry.outrankingShares.push(row.outrankingShare);
          entry.campaigns.add(campaignName);
        }
      }

      // 4. Transform into CompetitorProfile-compatible shape
      const avg = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

      const competitors = Array.from(domainMap.values())
        .map((entry, idx) => {
          const avgImprShare = avg(entry.impressionShares);
          const avgOverlap = avg(entry.overlapRates);
          const avgOutranking = avg(entry.outrankingShares);

          // Derive threat level from outranking share
          let threatLevel = 'low';
          if (avgOutranking > 0.5) threatLevel = 'high';
          else if (avgOutranking > 0.25) threatLevel = 'medium';

          return {
            id: `comp-${idx}`,
            name: entry.domain.replace(/\.\w+$/, '').replace(/^www\./, ''),
            domain: entry.domain,
            threatLevel,
            estimatedRevenue: 0,
            employeeCount: 0,
            marketPosition: {
              x: Number((avgImprShare * 100).toFixed(1)),
              y: Number((avgOutranking * 100).toFixed(1))
            },
            lastUpdated: new Date().toISOString(),
            auctionMetrics: {
              impressionShare: Number(avgImprShare.toFixed(4)),
              overlapRate: Number(avg(entry.overlapRates).toFixed(4)),
              positionAboveRate: Number(avg(entry.positionAboveRates).toFixed(4)),
              topImpressionPct: Number(avg(entry.topImpressionPcts).toFixed(4)),
              absTopImpressionPct: Number(avg(entry.absTopImpressionPcts).toFixed(4)),
              outrankingShare: Number(avgOutranking.toFixed(4))
            },
            campaigns: Array.from(entry.campaigns)
          };
        })
        .sort((a, b) => {
          const order = { high: 0, medium: 1, low: 2 };
          return (order[a.threatLevel] ?? 3) - (order[b.threatLevel] ?? 3);
        });

      // 5. Build threat matrix
      const threatMatrix = {
        high: competitors.filter(c => c.threatLevel === 'high'),
        medium: competitors.filter(c => c.threatLevel === 'medium'),
        low: competitors.filter(c => c.threatLevel === 'low')
      };

      // 6. Derive advantages and gaps from aggregate data
      const advantages = [];
      const gaps = [];

      // Find domains we outrank
      competitors.forEach(c => {
        if (c.auctionMetrics.outrankingShare < 0.3) {
          gaps.push({
            id: `gap-${c.id}`,
            gap: `Low outranking share vs ${c.domain}`,
            description: `${c.domain} outranks you ${((1 - c.auctionMetrics.outrankingShare) * 100).toFixed(0)}% of the time in shared auctions.`,
            impact: c.threatLevel === 'high' ? 'high' : 'medium',
            difficulty: 'medium',
            recommendation: `Review bid strategy and ad relevance for keywords where ${c.domain} competes.`
          });
        } else if (c.auctionMetrics.outrankingShare > 0.6) {
          advantages.push({
            id: `adv-${c.id}`,
            advantage: `Strong position vs ${c.domain}`,
            description: `You outrank ${c.domain} ${(c.auctionMetrics.outrankingShare * 100).toFixed(0)}% of the time.`,
            importance: c.threatLevel === 'high' ? 'high' : 'medium',
            actionable: true,
            recommendation: `Maintain position — consider broadening keyword coverage to capture more share.`
          });
        }
      });

      const competitorData = {
        competitors,
        threatMatrix,
        adCopies: [], // Ad copy analysis requires separate data source
        advantages,
        gaps,
        recentChanges: [],
        lastAnalyzed: new Date().toISOString(),
        analysisStatus: activeCampaigns.length > 0 ? 'complete' : 'no_active_campaigns',
        campaignsAnalyzed: activeCampaigns.length,
        totalCompetitors: competitors.length
      };

      // Cache result
      dashboardCache.set(tenantId, 'competitor_insights', competitorData);

      this._trackPerformance(startTime, false);
      return competitorData;

    } catch (error) {
      this._trackError(error);
      logger.error('Failed to get competitor insights', {
        tenantId,
        error: error.message,
        duration: Date.now() - startTime
      });

      // Return empty structure so the frontend still renders
      return {
        competitors: [],
        threatMatrix: { high: [], medium: [], low: [] },
        adCopies: [],
        advantages: [],
        gaps: [],
        recentChanges: [],
        lastAnalyzed: new Date().toISOString(),
        analysisStatus: 'error',
        campaignsAnalyzed: 0,
        totalCompetitors: 0
      };
    }
  }

  /**
   * Get website insights (stub — delegates to website scraper service)
   * @param {string} tenantId
   * @param {object} options
   * @returns {Promise<object>}
   */
  async getWebsiteInsights(tenantId, options = {}) {
    try {
      await this._initializeServices();
      if (this.services.websiteScraper && typeof this.services.websiteScraper.analyze === 'function') {
        return await this.services.websiteScraper.analyze(tenantId, options);
      }
      return { status: 'not_available', tenantId };
    } catch (error) {
      logger.error('getWebsiteInsights error', { tenantId, error: error.message });
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Get traffic insights (stub — delegates to traffic analyzer service)
   */
  async getTrafficInsights(tenantId, options = {}) {
    try {
      await this._initializeServices();
      if (this.services.trafficAnalyzer && typeof this.services.trafficAnalyzer.analyze === 'function') {
        return await this.services.trafficAnalyzer.analyze(tenantId, options);
      }
      return { status: 'not_available', tenantId };
    } catch (error) {
      logger.error('getTrafficInsights error', { tenantId, error: error.message });
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Get customer insights (stub — delegates to demographic profiler)
   */
  async getCustomerInsights(tenantId, options = {}) {
    try {
      await this._initializeServices();
      if (this.services.demographicProfiler && typeof this.services.demographicProfiler.profile === 'function') {
        return await this.services.demographicProfiler.profile(tenantId, options);
      }
      return { status: 'not_available', tenantId };
    } catch (error) {
      logger.error('getCustomerInsights error', { tenantId, error: error.message });
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Get SERP insights (stub — delegates to SERP monitor service)
   */
  async getSerpInsights(tenantId, options = {}) {
    try {
      await this._initializeServices();
      if (this.services.serpMonitor && typeof this.services.serpMonitor.analyze === 'function') {
        return await this.services.serpMonitor.analyze(tenantId, options);
      }
      return { status: 'not_available', tenantId };
    } catch (error) {
      logger.error('getSerpInsights error', { tenantId, error: error.message });
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Trigger a website scan (stub)
   */
  async triggerWebsiteScan(tenantId, options = {}) {
    try {
      await this._initializeServices();
      if (this.services.websiteScraper && typeof this.services.websiteScraper.scan === 'function') {
        return await this.services.websiteScraper.scan(tenantId, options);
      }
      return { status: 'not_available', tenantId };
    } catch (error) {
      logger.error('triggerWebsiteScan error', { tenantId, error: error.message });
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Add a competitor for monitoring (stub)
   */
  async addCompetitor(tenantId, options = {}) {
    try {
      await this._initializeServices();
      if (this.services.competitorIntelligence && typeof this.services.competitorIntelligence.addCompetitor === 'function') {
        return await this.services.competitorIntelligence.addCompetitor(tenantId, options);
      }
      return { status: 'not_available', tenantId };
    } catch (error) {
      logger.error('addCompetitor error', { tenantId, error: error.message });
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Remove a competitor from monitoring (stub)
   */
  async removeCompetitor(tenantId, competitorId) {
    try {
      await this._initializeServices();
      if (this.services.competitorIntelligence && typeof this.services.competitorIntelligence.removeCompetitor === 'function') {
        return await this.services.competitorIntelligence.removeCompetitor(tenantId, competitorId);
      }
      return { status: 'not_available', tenantId };
    } catch (error) {
      logger.error('removeCompetitor error', { tenantId, error: error.message });
      return { status: 'error', error: error.message };
    }
  }

  /**
   * =====================================
   * UTILITY AND HEALTH METHODS
   * =====================================
   */

  /**
   * Invalidate cache for specific data type
   */
  async invalidateCache(tenantId, dataType = null) {
    try {
      if (dataType) {
        const invalidated = dashboardCache.invalidate(tenantId, dataType);
        logger.info('Dashboard cache invalidated', { tenantId, dataType, invalidated });
        return { invalidated, dataType };
      } else {
        const invalidated = dashboardCache.invalidateTenant(tenantId);
        logger.info('Dashboard cache tenant invalidated', { tenantId, invalidated });
        return { invalidated, scope: 'tenant' };
      }
    } catch (error) {
      logger.error('Failed to invalidate cache', { tenantId, dataType, error: error.message });
      throw error;
    }
  }

  /**
   * Get service health and performance metrics
   */
  async getServiceHealth() {
    try {
      // Update health checks
      await this._performHealthChecks();

      const avgResponseTime = this.performanceTracker.requestCount > 0
        ? this.performanceTracker.totalResponseTime / this.performanceTracker.requestCount
        : 0;

      const errorRate = this.performanceTracker.requestCount > 0
        ? (this.performanceTracker.errorCount / this.performanceTracker.requestCount) * 100
        : 0;

      const cacheHitRate = this.performanceTracker.requestCount > 0
        ? (this.performanceTracker.cacheHitCount / this.performanceTracker.requestCount) * 100
        : 0;

      const overallStatus = errorRate < 5 && avgResponseTime < this.responseTimeTarget ? 'healthy' : 'degraded';
      const healthData = {
        status: overallStatus,
        performance: {
          avgResponseTime: Math.round(avgResponseTime),
          errorRate: Number(errorRate.toFixed(2)),
          cacheHitRate: Number(cacheHitRate.toFixed(2)),
          requestCount: this.performanceTracker.requestCount,
          targetResponseTime: this.responseTimeTarget
        },
        services: Object.fromEntries(this.serviceHealth),
        cache: dashboardCache.getGlobalStats(),
        lastCheck: new Date().toISOString()
      };

      // Broadcast system health event
      await broadcastSystemEvent({
        type: WS_EVENTS.SYSTEM_HEALTH,
        status: overallStatus,
        services: Object.fromEntries(this.serviceHealth),
        performance: healthData.performance
      }, MESSAGE_PRIORITY.LOW);

      return healthData;
    } catch (error) {
      logger.error('Failed to get service health', { error: error.message });
      return {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Preload frequently accessed data
   */
  async preloadCache(tenantId) {
    try {
      const preloadTasks = [
        dashboardCache.preload(tenantId, 'system_overview', {}, () => this.getSystemOverview(tenantId)),
        dashboardCache.preload(tenantId, 'data_sources_summary', {}, () => this.getDataSourcesSummary(tenantId)),
        dashboardCache.preload(tenantId, 'performance_metrics', { timeframe: '7d' }, () => this.getPerformanceMetrics(tenantId, '7d'))
      ];

      await Promise.allSettled(preloadTasks);
      logger.info('Dashboard cache preloaded', { tenantId });
    } catch (error) {
      logger.error('Failed to preload cache', { tenantId, error: error.message });
    }
  }

  /**
   * =====================================
   * PRIVATE HELPER METHODS
   * =====================================
   */

  /**
   * Extract value from Promise.allSettled result
   */
  _extractValue(result, defaultValue = []) {
    if (!result) return defaultValue;
    return result.status === 'fulfilled' ? result.value : defaultValue;
  }

  /**
   * Track performance metrics
   */
  _trackPerformance(startTime, wasCacheHit) {
    const duration = Date.now() - startTime;
    this.performanceTracker.requestCount++;
    this.performanceTracker.totalResponseTime += duration;

    if (wasCacheHit) {
      this.performanceTracker.cacheHitCount++;
    }

    if (duration > this.responseTimeTarget) {
      logger.warn('Dashboard response time exceeded target', {
        duration,
        target: this.responseTimeTarget,
        wasCacheHit
      });
    }
  }

  /**
   * Track errors
   */
  _trackError(error) {
    this.performanceTracker.errorCount++;
    logger.error('Dashboard orchestrator error', { error: error.message });
  }

  /**
   * Get service status with error handling
   */
  async _getServiceStatus(serviceName, tenantId) {
    try {
      const service = this.services[serviceName];
      if (!service) {
        return { status: 'unavailable', error: 'Service not initialized' };
      }

      // Try to call a health check method if available
      if (typeof service.getStatus === 'function') {
        return await service.getStatus(tenantId);
      } else if (typeof service.healthCheck === 'function') {
        return await service.healthCheck();
      } else {
        // Default status based on service availability
        return { status: 'healthy', lastUpdate: new Date().toISOString() };
      }
    } catch (error) {
      this.serviceHealth.set(serviceName, 'unhealthy');
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Get date range for timeframe
   */
  _getDateRange(timeframe) {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeframe) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    return { startDate, endDate };
  }

  /**
   * Perform health checks on all services
   */
  async _performHealthChecks() {
    await this._initializeServices();

    const healthPromises = Object.keys(this.services).map(async serviceName => {
      try {
        const status = await this._getServiceStatus(serviceName, 'health_check');
        this.serviceHealth.set(serviceName, status.status || 'unknown');
      } catch (error) {
        this.serviceHealth.set(serviceName, 'unhealthy');
      }
    });

    await Promise.allSettled(healthPromises);
    this.performanceTracker.lastHealthCheck = new Date().toISOString();
  }

  /**
   * Stub methods for data retrieval (to be implemented based on actual service APIs)
   */
  async _getCampaignSummary(tenantId) { return []; }
  async _getMetricsSummary(tenantId) { return []; }
  async _getOptimizationQueueSummary(tenantId) { return []; }
  async _getCampaignOptimizations(tenantId) { return []; }
  async _getBidOptimizations(tenantId) { return []; }
  async _getBudgetOptimizations(tenantId) { return []; }
  async _getCopyOptimizations(tenantId) { return []; }
  async _getTestOptimizations(tenantId) { return []; }
  async _getConversionData(tenantId, startDate, endDate) { return []; }
  async _getRevenueData(tenantId, startDate, endDate) { return []; }
  async _getOptimizationLogs(tenantId, limit) { return []; }
  async _getSystemLogs(tenantId, limit) { return []; }
}

// Export singleton instance
const dashboardOrchestrator = new DashboardOrchestratorService();

export default dashboardOrchestrator;
export { DashboardOrchestratorService };