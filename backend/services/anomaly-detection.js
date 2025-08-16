/**
 * Anomaly Detection Service for ProofKit SaaS
 * Intelligent monitoring of spend, CPA, and performance metrics
 * with configurable thresholds and machine learning-based detection
 */

import logger from './logger.js';
import { getDoc, ensureSheet } from '../sheets.js';

/**
 * Anomaly Detection Service
 */
export class AnomalyDetectionService {
  constructor() {
    this.thresholds = {
      // Default thresholds - can be overridden per tenant
      cpa_spike_percent: 50,           // Alert if CPA increases by 50%
      cost_spike_percent: 75,          // Alert if daily cost increases by 75%
      conversion_drop_percent: 30,     // Alert if conversions drop by 30%
      ctr_drop_percent: 25,           // Alert if CTR drops by 25%
      cost_daily_threshold: 1000,     // Alert if daily cost exceeds $1000
      cost_weekly_threshold: 5000,    // Alert if weekly cost exceeds $5000
      zero_conversions_hours: 24,     // Alert if no conversions for 24 hours
      low_conversion_rate_percent: 1  // Alert if conversion rate falls below 1%
    };
    
    this.alertHistory = new Map();
    this.suppressionPeriods = new Map();
  }

  /**
   * Set custom thresholds for a tenant
   */
  setThresholds(tenant, customThresholds) {
    if (!this.thresholds[tenant]) {
      this.thresholds[tenant] = { ...this.thresholds };
    }
    Object.assign(this.thresholds[tenant], customThresholds);
    
    logger.info('Updated anomaly detection thresholds', { 
      tenant, 
      thresholds: this.thresholds[tenant] 
    });
  }

  /**
   * Get thresholds for a specific tenant
   */
  getThresholds(tenant) {
    return this.thresholds[tenant] || this.thresholds;
  }

  /**
   * Main anomaly detection function
   */
  async detectAnomalies(tenant, timeWindow = '24h') {
    const startTime = Date.now();
    logger.info('Starting anomaly detection', { tenant, timeWindow });

    try {
      const doc = await getDoc();
      if (!doc) {
        throw new Error('Unable to connect to Google Sheets');
      }

      // Get historical data for analysis
      const data = await this.fetchAnalysisData(doc, tenant, timeWindow);
      
      // Run different anomaly detection algorithms
      const anomalies = {
        timestamp: new Date().toISOString(),
        tenant,
        timeWindow,
        alerts: [],
        warnings: [],
        info: []
      };

      // Statistical anomaly detection
      const statisticalAnomalies = await this.detectStatisticalAnomalies(data, tenant);
      anomalies.alerts.push(...statisticalAnomalies.alerts);
      anomalies.warnings.push(...statisticalAnomalies.warnings);

      // Threshold-based detection
      const thresholdAnomalies = await this.detectThresholdAnomalies(data, tenant);
      anomalies.alerts.push(...thresholdAnomalies.alerts);
      anomalies.warnings.push(...thresholdAnomalies.warnings);

      // Pattern-based detection
      const patternAnomalies = await this.detectPatternAnomalies(data, tenant);
      anomalies.alerts.push(...patternAnomalies.alerts);
      anomalies.warnings.push(...patternAnomalies.warnings);

      // Time-based detection
      const timeAnomalies = await this.detectTimeAnomalies(data, tenant);
      anomalies.alerts.push(...timeAnomalies.alerts);
      anomalies.warnings.push(...timeAnomalies.warnings);

      // Filter suppressed alerts
      anomalies.alerts = this.filterSuppressedAlerts(anomalies.alerts, tenant);
      anomalies.warnings = this.filterSuppressedAlerts(anomalies.warnings, tenant);

      // Update alert history
      this.updateAlertHistory(tenant, anomalies);

      // Log anomaly detection results
      await this.logAnomalies(doc, tenant, anomalies);

      const duration = Date.now() - startTime;
      logger.info('Anomaly detection completed', {
        tenant,
        duration,
        alertCount: anomalies.alerts.length,
        warningCount: anomalies.warnings.length
      });

      return anomalies;

    } catch (error) {
      logger.error('Anomaly detection failed', {
        error: error.message,
        tenant,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Fetch data for anomaly analysis
   */
  async fetchAnalysisData(doc, tenant, timeWindow) {
    const windowMs = this.parseTimeWindow(timeWindow);
    const endTime = Date.now();
    const startTime = endTime - windowMs;
    const historicalStartTime = endTime - (windowMs * 4); // Get 4x the window for historical comparison

    // Get metrics sheet
    const metricsSheet = await ensureSheet(doc, `METRICS_${tenant}`, [
      'date', 'level', 'campaign', 'ad_group', 'id', 'name', 'clicks', 'cost', 'conversions', 'impr', 'ctr'
    ]);

    const rows = await metricsSheet.getRows();
    
    // Process current period data
    const currentData = this.processMetricsData(rows, startTime, endTime);
    
    // Process historical data for comparison
    const historicalData = this.processMetricsData(rows, historicalStartTime, startTime);
    
    // Calculate hourly aggregations for trend analysis
    const hourlyData = this.aggregateHourlyData(rows, startTime, endTime);
    
    return {
      current: currentData,
      historical: historicalData,
      hourly: hourlyData,
      timeWindow: { start: startTime, end: endTime, windowMs }
    };
  }

  /**
   * Statistical anomaly detection using Z-score and moving averages
   */
  async detectStatisticalAnomalies(data, tenant) {
    const anomalies = { alerts: [], warnings: [] };
    const thresholds = this.getThresholds(tenant);

    if (data.historical.length === 0) {
      return anomalies; // Need historical data for statistical analysis
    }

    // Calculate historical stats
    const stats = this.calculateStatistics(data.historical);
    
    // Check current metrics against statistical thresholds
    if (data.current.totals.cost > 0) {
      // Cost anomaly detection
      const costZScore = this.calculateZScore(data.current.totals.cost, stats.cost.mean, stats.cost.stdDev);
      if (Math.abs(costZScore) > 2.5) {
        anomalies.alerts.push({
          type: 'statistical_cost_anomaly',
          severity: Math.abs(costZScore) > 3 ? 'high' : 'medium',
          message: `Cost significantly ${costZScore > 0 ? 'above' : 'below'} normal range`,
          value: data.current.totals.cost,
          expected: stats.cost.mean,
          zScore: costZScore,
          confidence: this.zScoreToConfidence(Math.abs(costZScore))
        });
      }

      // CPA anomaly detection
      if (data.current.totals.cpa && stats.cpa.count > 0) {
        const cpaZScore = this.calculateZScore(data.current.totals.cpa, stats.cpa.mean, stats.cpa.stdDev);
        if (cpaZScore > 2) { // Only alert on high CPA, not low
          anomalies.alerts.push({
            type: 'statistical_cpa_anomaly',
            severity: cpaZScore > 3 ? 'high' : 'medium',
            message: `Cost per acquisition significantly higher than normal`,
            value: data.current.totals.cpa,
            expected: stats.cpa.mean,
            zScore: cpaZScore,
            confidence: this.zScoreToConfidence(cpaZScore)
          });
        }
      }

      // Conversion rate anomaly detection
      const conversionRate = data.current.totals.conversions / Math.max(data.current.totals.clicks, 1) * 100;
      if (stats.conversionRate.count > 0) {
        const crZScore = this.calculateZScore(conversionRate, stats.conversionRate.mean, stats.conversionRate.stdDev);
        if (crZScore < -2) { // Only alert on low conversion rates
          anomalies.warnings.push({
            type: 'statistical_conversion_rate_anomaly',
            severity: 'medium',
            message: `Conversion rate significantly below normal`,
            value: conversionRate,
            expected: stats.conversionRate.mean,
            zScore: crZScore,
            confidence: this.zScoreToConfidence(Math.abs(crZScore))
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Threshold-based anomaly detection
   */
  async detectThresholdAnomalies(data, tenant) {
    const anomalies = { alerts: [], warnings: [] };
    const thresholds = this.getThresholds(tenant);

    // Absolute cost thresholds
    if (data.current.totals.cost > thresholds.cost_daily_threshold) {
      anomalies.warnings.push({
        type: 'daily_cost_threshold',
        severity: 'medium',
        message: `Daily cost exceeded threshold of $${thresholds.cost_daily_threshold}`,
        value: data.current.totals.cost,
        threshold: thresholds.cost_daily_threshold
      });
    }

    // Zero conversions check
    if (data.current.totals.conversions === 0 && data.current.totals.cost > 50) {
      const hoursWithoutConversions = this.calculateHoursWithoutConversions(data.hourly);
      if (hoursWithoutConversions >= thresholds.zero_conversions_hours) {
        anomalies.alerts.push({
          type: 'zero_conversions',
          severity: 'high',
          message: `No conversions for ${hoursWithoutConversions} hours with $${data.current.totals.cost.toFixed(2)} in spend`,
          value: hoursWithoutConversions,
          threshold: thresholds.zero_conversions_hours
        });
      }
    }

    // Low conversion rate threshold
    const conversionRate = data.current.totals.conversions / Math.max(data.current.totals.clicks, 1) * 100;
    if (data.current.totals.clicks > 100 && conversionRate < thresholds.low_conversion_rate_percent) {
      anomalies.warnings.push({
        type: 'low_conversion_rate',
        severity: 'medium',
        message: `Conversion rate (${conversionRate.toFixed(2)}%) below threshold`,
        value: conversionRate,
        threshold: thresholds.low_conversion_rate_percent
      });
    }

    return anomalies;
  }

  /**
   * Pattern-based anomaly detection
   */
  async detectPatternAnomalies(data, tenant) {
    const anomalies = { alerts: [], warnings: [] };

    // Detect unusual spending patterns
    const spendingPattern = this.analyzeSpendingPattern(data.hourly);
    if (spendingPattern.isAnomalous) {
      anomalies.warnings.push({
        type: 'unusual_spending_pattern',
        severity: 'medium',
        message: spendingPattern.description,
        pattern: spendingPattern.pattern
      });
    }

    // Detect campaign performance divergence
    const campaignDivergence = this.detectCampaignDivergence(data.current.campaigns);
    if (campaignDivergence.length > 0) {
      campaignDivergence.forEach(divergence => {
        anomalies.warnings.push({
          type: 'campaign_performance_divergence',
          severity: 'low',
          message: divergence.message,
          campaign: divergence.campaign,
          metric: divergence.metric
        });
      });
    }

    return anomalies;
  }

  /**
   * Time-based anomaly detection
   */
  async detectTimeAnomalies(data, tenant) {
    const anomalies = { alerts: [], warnings: [] };

    // Check for unusual time-of-day patterns
    const hourlyAnomalies = this.detectHourlyAnomalies(data.hourly);
    hourlyAnomalies.forEach(anomaly => {
      anomalies.warnings.push({
        type: 'hourly_pattern_anomaly',
        severity: 'low',
        message: anomaly.message,
        hour: anomaly.hour,
        metric: anomaly.metric
      });
    });

    return anomalies;
  }

  /**
   * Process metrics data for a time period
   */
  processMetricsData(rows, startTime, endTime) {
    const totals = { clicks: 0, cost: 0, conversions: 0, impressions: 0 };
    const campaigns = new Map();
    const validRows = [];

    rows.forEach(row => {
      const rowDate = Date.parse(row.date || '');
      if (!isFinite(rowDate) || rowDate < startTime || rowDate >= endTime) return;

      const clicks = Number(row.clicks || 0);
      const cost = Number(row.cost || 0);
      const conversions = Number(row.conversions || 0);
      const impressions = Number(row.impr || 0);

      totals.clicks += clicks;
      totals.cost += cost;
      totals.conversions += conversions;
      totals.impressions += impressions;

      // Campaign aggregation
      const campaign = row.campaign || 'Unknown';
      if (!campaigns.has(campaign)) {
        campaigns.set(campaign, { clicks: 0, cost: 0, conversions: 0, impressions: 0 });
      }
      const campaignData = campaigns.get(campaign);
      campaignData.clicks += clicks;
      campaignData.cost += cost;
      campaignData.conversions += conversions;
      campaignData.impressions += impressions;

      validRows.push({
        date: rowDate,
        campaign,
        clicks,
        cost,
        conversions,
        impressions
      });
    });

    // Calculate derived metrics
    totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100) : 0;
    totals.cpa = totals.conversions > 0 ? (totals.cost / totals.conversions) : null;
    totals.conversionRate = totals.clicks > 0 ? (totals.conversions / totals.clicks * 100) : 0;

    const campaignsArray = Array.from(campaigns.entries()).map(([name, data]) => ({
      name,
      ...data,
      cpa: data.conversions > 0 ? (data.cost / data.conversions) : null,
      ctr: data.impressions > 0 ? (data.clicks / data.impressions * 100) : 0
    }));

    return {
      totals,
      campaigns: campaignsArray,
      rows: validRows,
      timeRange: { start: startTime, end: endTime }
    };
  }

  /**
   * Aggregate data by hour for trend analysis
   */
  aggregateHourlyData(rows, startTime, endTime) {
    const hourlyMap = new Map();

    rows.forEach(row => {
      const rowDate = Date.parse(row.date || '');
      if (!isFinite(rowDate) || rowDate < startTime || rowDate >= endTime) return;

      const hour = new Date(rowDate).getHours();
      const hourKey = `${new Date(rowDate).toISOString().split('T')[0]}_${hour}`;

      if (!hourlyMap.has(hourKey)) {
        hourlyMap.set(hourKey, {
          hour,
          date: new Date(rowDate).toISOString().split('T')[0],
          clicks: 0,
          cost: 0,
          conversions: 0,
          impressions: 0
        });
      }

      const hourData = hourlyMap.get(hourKey);
      hourData.clicks += Number(row.clicks || 0);
      hourData.cost += Number(row.cost || 0);
      hourData.conversions += Number(row.conversions || 0);
      hourData.impressions += Number(row.impr || 0);
    });

    return Array.from(hourlyMap.values()).sort((a, b) => 
      new Date(`${a.date}T${a.hour.toString().padStart(2, '0')}:00:00Z`).getTime() - 
      new Date(`${b.date}T${b.hour.toString().padStart(2, '0')}:00:00Z`).getTime()
    );
  }

  /**
   * Calculate statistical measures for historical data
   */
  calculateStatistics(historicalData) {
    const metrics = ['cost', 'cpa', 'conversionRate'];
    const stats = {};

    metrics.forEach(metric => {
      const values = [];
      
      if (metric === 'conversionRate') {
        historicalData.forEach(period => {
          if (period.totals.clicks > 0) {
            values.push(period.totals.conversions / period.totals.clicks * 100);
          }
        });
      } else {
        historicalData.forEach(period => {
          if (period.totals[metric] !== null && period.totals[metric] !== undefined) {
            values.push(period.totals[metric]);
          }
        });
      }

      if (values.length > 0) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        stats[metric] = {
          mean,
          stdDev,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      } else {
        stats[metric] = { mean: 0, stdDev: 0, min: 0, max: 0, count: 0 };
      }
    });

    return stats;
  }

  /**
   * Calculate Z-score for anomaly detection
   */
  calculateZScore(value, mean, stdDev) {
    if (stdDev === 0) return 0;
    return (value - mean) / stdDev;
  }

  /**
   * Convert Z-score to confidence percentage
   */
  zScoreToConfidence(zScore) {
    // Approximate confidence based on Z-score
    if (zScore >= 3) return 99.7;
    if (zScore >= 2.5) return 98.8;
    if (zScore >= 2) return 95.4;
    if (zScore >= 1.5) return 86.6;
    return 68.2;
  }

  /**
   * Calculate hours without conversions
   */
  calculateHoursWithoutConversions(hourlyData) {
    let consecutiveHours = 0;
    for (let i = hourlyData.length - 1; i >= 0; i--) {
      if (hourlyData[i].conversions === 0) {
        consecutiveHours++;
      } else {
        break;
      }
    }
    return consecutiveHours;
  }

  /**
   * Analyze spending patterns for anomalies
   */
  analyzeSpendingPattern(hourlyData) {
    if (hourlyData.length < 24) {
      return { isAnomalous: false };
    }

    // Calculate expected vs actual spending distribution
    const totalSpend = hourlyData.reduce((sum, hour) => sum + hour.cost, 0);
    const expectedHourlySpend = totalSpend / hourlyData.length;
    
    // Find hours with significantly different spending
    const anomalousHours = hourlyData.filter(hour => 
      Math.abs(hour.cost - expectedHourlySpend) > (expectedHourlySpend * 2)
    );

    if (anomalousHours.length > hourlyData.length * 0.3) {
      return {
        isAnomalous: true,
        description: `Unusual spending distribution detected with ${anomalousHours.length} anomalous hours`,
        pattern: 'irregular_distribution'
      };
    }

    return { isAnomalous: false };
  }

  /**
   * Detect campaign performance divergence
   */
  detectCampaignDivergence(campaigns) {
    if (campaigns.length < 2) return [];

    const divergences = [];
    const avgCPA = campaigns
      .filter(c => c.cpa !== null)
      .reduce((sum, c, _, arr) => sum + c.cpa / arr.length, 0);

    campaigns.forEach(campaign => {
      if (campaign.cpa !== null && avgCPA > 0) {
        const divergence = Math.abs(campaign.cpa - avgCPA) / avgCPA;
        if (divergence > 1.5) { // 150% divergence
          divergences.push({
            campaign: campaign.name,
            metric: 'cpa',
            message: `Campaign "${campaign.name}" CPA significantly different from average`,
            divergence
          });
        }
      }
    });

    return divergences;
  }

  /**
   * Detect hourly pattern anomalies
   */
  detectHourlyAnomalies(hourlyData) {
    const anomalies = [];
    
    // Group by hour of day to detect unusual patterns
    const hourlyAverages = new Map();
    
    hourlyData.forEach(data => {
      if (!hourlyAverages.has(data.hour)) {
        hourlyAverages.set(data.hour, { cost: [], clicks: [] });
      }
      hourlyAverages.get(data.hour).cost.push(data.cost);
      hourlyAverages.get(data.hour).clicks.push(data.clicks);
    });

    // Check each hour for anomalies
    hourlyAverages.forEach((data, hour) => {
      if (data.cost.length > 1) {
        const avgCost = data.cost.reduce((sum, val) => sum + val, 0) / data.cost.length;
        const maxCost = Math.max(...data.cost);
        
        if (maxCost > avgCost * 3) { // 300% above average for that hour
          anomalies.push({
            hour,
            metric: 'cost',
            message: `Unusual spending spike at hour ${hour}`
          });
        }
      }
    });

    return anomalies;
  }

  /**
   * Filter alerts that are currently suppressed
   */
  filterSuppressedAlerts(alerts, tenant) {
    const tenantSuppressions = this.suppressionPeriods.get(tenant) || new Map();
    const now = Date.now();

    return alerts.filter(alert => {
      const suppressionKey = `${alert.type}_${alert.severity}`;
      const suppressedUntil = tenantSuppressions.get(suppressionKey);
      
      if (suppressedUntil && now < suppressedUntil) {
        logger.debug('Alert suppressed', { tenant, alert: suppressionKey, suppressedUntil });
        return false;
      }
      
      return true;
    });
  }

  /**
   * Update alert history for tracking and analysis
   */
  updateAlertHistory(tenant, anomalies) {
    if (!this.alertHistory.has(tenant)) {
      this.alertHistory.set(tenant, []);
    }

    const history = this.alertHistory.get(tenant);
    history.push({
      timestamp: anomalies.timestamp,
      alertCount: anomalies.alerts.length,
      warningCount: anomalies.warnings.length,
      alerts: anomalies.alerts.map(a => ({ type: a.type, severity: a.severity }))
    });

    // Keep only last 100 entries
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  /**
   * Suppress alerts for a specific period
   */
  suppressAlert(tenant, alertType, severity, durationMs) {
    if (!this.suppressionPeriods.has(tenant)) {
      this.suppressionPeriods.set(tenant, new Map());
    }

    const suppressionKey = `${alertType}_${severity}`;
    const suppressedUntil = Date.now() + durationMs;
    
    this.suppressionPeriods.get(tenant).set(suppressionKey, suppressedUntil);
    
    logger.info('Alert suppressed', { 
      tenant, 
      alertType, 
      severity, 
      suppressedUntil: new Date(suppressedUntil).toISOString() 
    });
  }

  /**
   * Log anomalies to Google Sheets
   */
  async logAnomalies(doc, tenant, anomalies) {
    try {
      const anomalySheet = await ensureSheet(doc, `ANOMALIES_${tenant}`, [
        'timestamp', 'type', 'severity', 'message', 'value', 'threshold', 'confidence', 'metadata'
      ]);

      const allAnomalies = [...anomalies.alerts, ...anomalies.warnings];
      
      for (const anomaly of allAnomalies) {
        await anomalySheet.addRow({
          timestamp: anomalies.timestamp,
          type: anomaly.type,
          severity: anomaly.severity,
          message: anomaly.message,
          value: anomaly.value || '',
          threshold: anomaly.threshold || anomaly.expected || '',
          confidence: anomaly.confidence || '',
          metadata: JSON.stringify({
            zScore: anomaly.zScore,
            pattern: anomaly.pattern,
            campaign: anomaly.campaign,
            hour: anomaly.hour
          })
        });
      }

    } catch (error) {
      logger.error('Failed to log anomalies to sheets', { 
        error: error.message, 
        tenant 
      });
    }
  }

  /**
   * Parse time window string to milliseconds
   */
  parseTimeWindow(timeWindow) {
    const unit = timeWindow.slice(-1).toLowerCase();
    const value = parseInt(timeWindow.slice(0, -1));
    
    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'w': return value * 7 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000; // Default to 24 hours
    }
  }

  /**
   * Get anomaly detection summary for a tenant
   */
  getAnomalySummary(tenant) {
    const history = this.alertHistory.get(tenant) || [];
    const recentHistory = history.slice(-24); // Last 24 detections

    const summary = {
      tenant,
      totalRuns: history.length,
      recentRuns: recentHistory.length,
      totalAlerts: recentHistory.reduce((sum, run) => sum + run.alertCount, 0),
      totalWarnings: recentHistory.reduce((sum, run) => sum + run.warningCount, 0),
      thresholds: this.getThresholds(tenant),
      suppressions: Array.from(this.suppressionPeriods.get(tenant)?.entries() || [])
        .map(([key, until]) => ({ key, until: new Date(until).toISOString() })),
      lastRun: history.length > 0 ? history[history.length - 1] : null
    };

    return summary;
  }
}

/**
 * Singleton instance
 */
export const anomalyDetectionService = new AnomalyDetectionService();

/**
 * Default export
 */
export default anomalyDetectionService;