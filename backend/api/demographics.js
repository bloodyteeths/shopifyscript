/**
 * Demographics API Endpoint
 * Comprehensive customer intelligence and demographic profiling
 *
 * Features:
 * - Real-time demographic insights
 * - Customer segmentation analysis
 * - Audience building and export
 * - Lookalike audience generation
 * - Privacy-compliant data handling
 * - Performance tracking and recommendations
 */

import express from 'express';
import { json, logAccess } from '../utils/response.js';
import { verify } from '../utils/hmac.js';
import demographicProfiler from '../services/demographic-profiler.js';
import customerSegmentation from '../services/customer-segmentation.js';
import audienceBuilder from '../services/audience-builder.js';
import logger from '../services/logger.js';

const router = express.Router();

/**
 * GET /api/demographics/:tenantId
 * Generate comprehensive demographic profile and insights
 */
router.get('/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const { sig, refresh, minOrders, minSpend, includeIndividuals, format } = req.query;
  const payload = `GET:${tenantId}:demographics`;

  if (!tenantId || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }

  const startTime = Date.now();

  try {
    logger.info('Demographics API request', {
      tenantId,
      refresh: refresh === 'true',
      minOrders: Number(minOrders || 0),
      minSpend: Number(minSpend || 0)
    });

    // Generate demographic profile
    const demographicProfile = await demographicProfiler.generateDemographicProfile(tenantId, {
      refreshCache: refresh === 'true',
      minOrders: Number(minOrders || 0),
      minSpend: Number(minSpend || 0),
      includeIndividuals: includeIndividuals === 'true'
    });

    // Generate customer segmentation
    const segmentation = await customerSegmentation.segmentCustomers(tenantId, {
      refreshCache: refresh === 'true',
      includeCustomerIds: false,
      minOrders: Number(minOrders || 0)
    });

    // Build audience definitions
    const audiences = await audienceBuilder.buildAudiences(tenantId, {
      refreshCache: refresh === 'true',
      includeCustomerMatch: true,
      includeLookalikes: true,
      includeExclusions: true,
      minCustomers: 100,
      exportFormat: format || 'google_ads'
    });

    // Combine comprehensive insights
    const response = {
      ok: true,
      tenantId,
      generatedAt: new Date().toISOString(),
      executionTime: Date.now() - startTime,

      // Core demographic analysis
      demographics: demographicProfile,

      // Customer segmentation insights
      segmentation: {
        ...segmentation,
        // Add segment distribution summary
        summary: {
          totalSegments: Object.keys(segmentation.rfmSegments || {}).length,
          highValueSegments: Object.entries(segmentation.rfmSegments || {})
            .filter(([key, seg]) => ['Champions', 'Loyal Customers', 'Cannot Lose Them'].includes(key))
            .reduce((acc, [key, seg]) => {
              acc[key] = {
                count: seg.customerCount,
                revenue: seg.totalRevenue,
                avgOrderValue: seg.avgOrderValue
              };
              return acc;
            }, {}),
          atRiskSegments: Object.entries(segmentation.rfmSegments || {})
            .filter(([key, seg]) => ['At Risk', 'About to Sleep', 'Needs Attention'].includes(key))
            .reduce((acc, [key, seg]) => {
              acc[key] = {
                count: seg.customerCount,
                revenue: seg.totalRevenue,
                avgRecencyDays: seg.avgRecencyDays
              };
              return acc;
            }, {})
        }
      },

      // Audience building results
      audiences: {
        ...audiences,
        // Add audience readiness summary
        readiness: {
          customerMatchReady: Object.values(audiences.customerMatchLists || {})
            .filter(list => list.eligible).length,
          totalCustomerMatchLists: Object.keys(audiences.customerMatchLists || {}).length,
          lookalikeAudiencesAvailable: Object.keys(audiences.lookalikeAudiences || {}).length,
          exclusionListsCreated: Object.keys(audiences.exclusionLists || {}).length,
          totalUniqueCustomers: audiences.metrics?.totalCustomersInAudiences || 0
        }
      },

      // Strategic insights and recommendations
      insights: {
        // Demographic insights
        topDemographics: {
          ageGroups: Object.entries(demographicProfile.demographics?.ageDistribution || {})
            .sort((a, b) => Number(b[1].percentage) - Number(a[1].percentage))
            .slice(0, 3)
            .map(([age, data]) => ({
              ageRange: age,
              percentage: data.percentage,
              avgOrderValue: data.avgOrderValue,
              targeting: `Target ${age} age group with ${data.percentage}% of customers`
            })),
          topInterests: Object.entries(demographicProfile.interests || {})
            .sort((a, b) => Number(b[1].percentage) - Number(a[1].percentage))
            .slice(0, 5)
            .map(([interest, data]) => ({
              interest,
              percentage: data.percentage,
              avgOrderValue: data.avgOrderValue,
              targeting: `Create ${interest} themed campaigns for ${data.percentage}% market share`
            }))
        },

        // Value-based insights
        revenueOpportunities: {
          vipCustomers: {
            count: segmentation.specialGroups?.vip?.count || 0,
            revenue: segmentation.specialGroups?.vip?.totalRevenue || 0,
            recommendation: 'Implement VIP loyalty program and exclusive offers'
          },
          atRiskRevenue: {
            count: segmentation.specialGroups?.atRisk?.count || 0,
            potentialLoss: segmentation.specialGroups?.atRisk?.potentialLostRevenue || 0,
            recommendation: 'Launch immediate win-back campaigns with 20-30% discounts'
          },
          winBackOpportunity: {
            count: segmentation.specialGroups?.winBack?.count || 0,
            potentialRevenue: segmentation.specialGroups?.winBack?.potentialRevenue || 0,
            recommendation: 'Create targeted re-engagement campaigns for dormant high-value customers'
          }
        },

        // Audience targeting insights
        adTargeting: {
          readyToLaunch: Object.values(audiences.customerMatchLists || {})
            .filter(list => list.eligible)
            .map(list => ({
              name: list.name,
              size: list.size,
              strategy: list.targetingStrategy,
              priority: list.name.includes('VIP') ? 'high' :
                       list.name.includes('At-Risk') ? 'urgent' : 'medium'
            })),
          growthOpportunities: Object.values(audiences.lookalikeAudiences || {})
            .map(audience => ({
              name: audience.name,
              seedSize: audience.seedAudienceSize,
              expansionRatio: audience.expansionRatio,
              strategy: audience.targetingStrategy,
              projectedReach: `${audience.seedAudienceSize * (audience.expansionRatio === '1%' ? 100 : audience.expansionRatio === '3%' ? 33 : 20)} potential customers`
            }))
        }
      },

      // Performance metrics
      metrics: {
        demographic: demographicProfiler.getMetrics(),
        segmentation: customerSegmentation.getMetrics(),
        audienceBuilder: audienceBuilder.getMetrics(),
        totalExecutionTime: Date.now() - startTime
      }
    };

    // Log success metrics
    logger.info('Demographics API response generated', {
      tenantId,
      customerCount: demographicProfile.totalCustomers,
      segmentCount: Object.keys(segmentation.rfmSegments || {}).length,
      audienceCount: audiences.metrics?.totalAudiences || 0,
      executionTime: response.executionTime
    });

    logAccess(req, res, 'demographics', {
      tenantId,
      customerCount: demographicProfile.totalCustomers,
      executionTime: response.executionTime
    });

    res.json(response);

  } catch (error) {
    logger.error('Demographics API error', {
      tenantId,
      error: error.message,
      stack: error.stack,
      executionTime: Date.now() - startTime
    });

    res.status(500).json({
      ok: false,
      error: 'Failed to generate demographic insights',
      message: error.message,
      executionTime: Date.now() - startTime
    });
  }
});

/**
 * GET /api/demographics/:tenantId/segments
 * Get detailed customer segmentation analysis
 */
router.get('/:tenantId/segments', async (req, res) => {
  const { tenantId } = req.params;
  const { sig, refresh, includeCustomers, minOrders } = req.query;
  const payload = `GET:${tenantId}:demographics_segments`;

  if (!tenantId || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }

  try {
    const segmentation = await customerSegmentation.segmentCustomers(tenantId, {
      refreshCache: refresh === 'true',
      includeCustomerIds: includeCustomers === 'true',
      minOrders: Number(minOrders || 0)
    });

    logAccess(req, res, 'demographics_segments', { tenantId });
    res.json({ ok: true, ...segmentation });

  } catch (error) {
    logger.error('Demographics segments API error', {
      tenantId,
      error: error.message
    });

    res.status(500).json({
      ok: false,
      error: 'Failed to generate customer segmentation',
      message: error.message
    });
  }
});

/**
 * GET /api/demographics/:tenantId/audiences
 * Get audience building and targeting recommendations
 */
router.get('/:tenantId/audiences', async (req, res) => {
  const { tenantId } = req.params;
  const { sig, refresh, format, includeCustomerMatch, includeLookalikes, includeExclusions } = req.query;
  const payload = `GET:${tenantId}:demographics_audiences`;

  if (!tenantId || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }

  try {
    const audiences = await audienceBuilder.buildAudiences(tenantId, {
      refreshCache: refresh === 'true',
      includeCustomerMatch: includeCustomerMatch !== 'false',
      includeLookalikes: includeLookalikes !== 'false',
      includeExclusions: includeExclusions !== 'false',
      exportFormat: format || 'google_ads'
    });

    logAccess(req, res, 'demographics_audiences', { tenantId });
    res.json({ ok: true, ...audiences });

  } catch (error) {
    logger.error('Demographics audiences API error', {
      tenantId,
      error: error.message
    });

    res.status(500).json({
      ok: false,
      error: 'Failed to build audiences',
      message: error.message
    });
  }
});

/**
 * GET /api/demographics/:tenantId/export/csv
 * Export demographic data and audiences as CSV
 */
router.get('/:tenantId/export/csv', async (req, res) => {
  const { tenantId } = req.params;
  const { sig, type } = req.query;
  const payload = `GET:${tenantId}:demographics_export_csv`;

  if (!tenantId || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }

  try {
    const exportType = type || 'all'; // 'all', 'customer_match', 'lookalike', 'exclusion'

    const csvData = await audienceBuilder.exportAudienceCSV(tenantId, exportType);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="demographics_${tenantId}_${exportType}_${Date.now()}.csv"`);

    logAccess(req, res, 'demographics_export_csv', { tenantId, type: exportType });
    res.send(csvData);

  } catch (error) {
    logger.error('Demographics CSV export error', {
      tenantId,
      error: error.message
    });

    res.status(500).json({
      ok: false,
      error: 'Failed to export demographic data',
      message: error.message
    });
  }
});

/**
 * POST /api/demographics/:tenantId/refresh
 * Force refresh of all demographic caches
 */
router.post('/:tenantId/refresh', async (req, res) => {
  const { tenantId } = req.params;
  const { sig } = req.query;
  const { nonce = Date.now() } = req.body || {};
  const payload = `POST:${tenantId}:demographics_refresh:${nonce}`;

  if (!tenantId || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }

  try {
    // Clear all caches
    demographicProfiler.clearCache(tenantId);
    customerSegmentation.clearCache(tenantId);
    audienceBuilder.clearCache(tenantId);

    logger.info('Demographics caches cleared', { tenantId });

    logAccess(req, res, 'demographics_refresh', { tenantId });
    res.json({
      ok: true,
      message: 'All demographic caches cleared successfully',
      refreshedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Demographics cache refresh error', {
      tenantId,
      error: error.message
    });

    res.status(500).json({
      ok: false,
      error: 'Failed to refresh demographic caches',
      message: error.message
    });
  }
});

/**
 * GET /api/demographics/:tenantId/insights
 * Get AI-powered demographic insights and recommendations
 */
router.get('/:tenantId/insights', async (req, res) => {
  const { tenantId } = req.params;
  const { sig, refresh } = req.query;
  const payload = `GET:${tenantId}:demographics_insights`;

  if (!tenantId || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }

  try {
    // Get comprehensive demographic data
    const [demographics, segmentation, audiences] = await Promise.all([
      demographicProfiler.generateDemographicProfile(tenantId, {
        refreshCache: refresh === 'true',
        includeIndividuals: false
      }),
      customerSegmentation.segmentCustomers(tenantId, {
        refreshCache: refresh === 'true',
        includeCustomerIds: false
      }),
      audienceBuilder.buildAudiences(tenantId, {
        refreshCache: refresh === 'true'
      })
    ]);

    // Generate strategic insights
    const insights = {
      // Market position analysis
      marketPosition: {
        customerBase: demographics.totalCustomers,
        averageOrderValue: demographics.behavior?.avgSpendPerCustomer || 0,
        customerLifetimeValue: segmentation.lifetimeValue?.avgLifetimeValue || 0,
        retentionHealth: segmentation.distribution?.segments
          ?.filter(s => ['Champions', 'Loyal Customers'].includes(s.segment))
          ?.reduce((sum, s) => sum + Number(s.percentage), 0) || 0
      },

      // Revenue optimization opportunities
      revenueOptimization: {
        vipExpansion: {
          currentVips: segmentation.specialGroups?.vip?.count || 0,
          revenue: segmentation.specialGroups?.vip?.totalRevenue || 0,
          opportunity: 'Expand VIP program to increase retention and AOV'
        },
        atRiskRecovery: {
          atRiskCustomers: segmentation.specialGroups?.atRisk?.count || 0,
          potentialLoss: segmentation.specialGroups?.atRisk?.potentialLostRevenue || 0,
          recoveryRate: '30-40%',
          recommendation: 'Implement automated win-back campaigns'
        },
        segmentGrowth: Object.entries(segmentation.rfmSegments || {})
          .filter(([key, seg]) => ['Potential Loyalists', 'Promising'].includes(key))
          .map(([key, seg]) => ({
            segment: key,
            count: seg.customerCount,
            opportunity: `Convert ${seg.customerCount} customers to higher value segments`
          }))
      },

      // Audience targeting strategy
      targetingStrategy: {
        primaryTargets: Object.values(audiences.customerMatchLists || {})
          .filter(list => list.eligible)
          .map(list => ({
            audience: list.name,
            size: list.size,
            strategy: list.targetingStrategy?.messaging || 'Targeted engagement',
            priority: list.name.includes('VIP') ? 1 :
                     list.name.includes('At-Risk') ? 2 : 3
          }))
          .sort((a, b) => a.priority - b.priority),

        expansionOpportunities: Object.values(audiences.lookalikeAudiences || {})
          .map(audience => ({
            type: audience.name,
            seedSize: audience.seedAudienceSize,
            expansionPotential: audience.expansionRatio,
            recommendation: audience.targetingStrategy?.messaging || 'Lookalike expansion'
          }))
      },

      // Demographic trends
      demographicTrends: {
        topAgeGroups: Object.entries(demographics.demographics?.ageDistribution || {})
          .sort((a, b) => Number(b[1].percentage) - Number(a[1].percentage))
          .slice(0, 3)
          .map(([age, data]) => ({
            ageRange: age,
            percentage: data.percentage,
            revenue: data.totalSpent,
            trend: 'stable' // Could be enhanced with historical data
          })),

        topInterests: Object.entries(demographics.interests || {})
          .sort((a, b) => Number(b[1].percentage) - Number(a[1].percentage))
          .slice(0, 5)
          .map(([interest, data]) => ({
            category: interest,
            marketShare: data.percentage,
            avgOrderValue: data.avgOrderValue,
            growth: 'opportunity' // Could be enhanced with trend analysis
          }))
      },

      // Action items prioritized by impact
      actionItems: [
        ...(audiences.recommendations || []),
        ...(segmentation.insights || [])
      ].sort((a, b) => {
        const priorityOrder = { urgent: 1, high: 2, medium: 3, low: 4 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }).slice(0, 10) // Top 10 most important actions
    };

    logAccess(req, res, 'demographics_insights', { tenantId });
    res.json({
      ok: true,
      tenantId,
      generatedAt: new Date().toISOString(),
      insights
    });

  } catch (error) {
    logger.error('Demographics insights API error', {
      tenantId,
      error: error.message
    });

    res.status(500).json({
      ok: false,
      error: 'Failed to generate demographic insights',
      message: error.message
    });
  }
});

/**
 * GET /api/demographics/health
 * Get service health and performance metrics
 */
router.get('/health', async (req, res) => {
  const { sig } = req.query;
  const payload = 'GET:demographics_health';

  if (!verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }

  try {
    const health = {
      ok: true,
      timestamp: new Date().toISOString(),
      services: {
        demographicProfiler: {
          status: 'healthy',
          metrics: demographicProfiler.getMetrics()
        },
        customerSegmentation: {
          status: 'healthy',
          metrics: customerSegmentation.getMetrics()
        },
        audienceBuilder: {
          status: 'healthy',
          metrics: audienceBuilder.getMetrics()
        }
      },
      systemHealth: {
        totalProfilesGenerated: demographicProfiler.getMetrics().profilesGenerated,
        totalSegmentations: customerSegmentation.getMetrics().segmentationsPerformed,
        totalAudiences: audienceBuilder.getMetrics().audiencesCreated,
        avgResponseTime: [
          demographicProfiler.getMetrics().avgProfileTime,
          customerSegmentation.getMetrics().avgExecutionTime,
          audienceBuilder.getMetrics().avgBuildTime
        ].reduce((sum, time) => sum + time, 0) / 3
      }
    };

    logAccess(req, res, 'demographics_health', {});
    res.json(health);

  } catch (error) {
    logger.error('Demographics health check error', { error: error.message });

    res.status(500).json({
      ok: false,
      error: 'Health check failed',
      message: error.message
    });
  }
});

export default router;