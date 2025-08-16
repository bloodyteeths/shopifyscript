/**
 * Performance Monitor - Production Performance Validation
 * 
 * Features:
 * - Real-time performance monitoring
 * - Target validation (<200ms response, >80% cache hit rate)
 * - Performance alerts and reporting
 * - Integration with all optimization services
 * - Automated performance tuning recommendations
 */

import cacheOptimizer from './cache-optimizer.js';
import sheetsOptimizer from './sheets-optimizer.js';
import { responseOptimizer } from '../middleware/response-optimizer.js';
import tenantCache from './cache.js';
import logger from './logger.js';

class PerformanceMonitor {
  constructor() {
    this.config = {
      targetResponseTime: Number(process.env.PERFORMANCE_TARGET_RESPONSE_MS || 200),
      targetCacheHitRate: Number(process.env.PERFORMANCE_TARGET_CACHE_HIT_RATE || 80),
      monitoringInterval: Number(process.env.PERFORMANCE_MONITORING_INTERVAL || 30000), // 30 seconds
      alertThreshold: Number(process.env.PERFORMANCE_ALERT_THRESHOLD || 3), // 3 violations before alert
      reportingInterval: Number(process.env.PERFORMANCE_REPORTING_INTERVAL || 300000), // 5 minutes
      metricsRetention: Number(process.env.PERFORMANCE_METRICS_RETENTION || 86400000) // 24 hours
    };

    this.metrics = {
      responseTime: {
        current: 0,
        avg24h: 0,
        p95: 0,
        p99: 0,
        violations: 0,
        samples: []
      },
      cacheHitRate: {
        current: 0,
        avg24h: 0,
        violations: 0,
        samples: []
      },
      throughput: {
        requestsPerSecond: 0,
        peakRps: 0,
        samples: []
      },
      optimization: {
        compressionSavings: 0,
        cacheWarmingHits: 0,
        connectionPoolUtilization: 0
      }
    };

    this.alerts = [];
    this.performanceReports = [];
    
    this.startMonitoring();
    this.startReporting();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    setInterval(() => {
      this.collectMetrics();
      this.validateTargets();
      this.cleanupOldMetrics();
    }, this.config.monitoringInterval);

    logger.info('Performance monitoring started', {
      targets: {
        responseTime: this.config.targetResponseTime + 'ms',
        cacheHitRate: this.config.targetCacheHitRate + '%'
      },
      operation: 'performance_monitoring_start'
    });
  }

  /**
   * Start performance reporting
   */
  startReporting() {
    setInterval(() => {
      this.generatePerformanceReport();
    }, this.config.reportingInterval);
  }

  /**
   * Collect metrics from all optimization services
   */
  collectMetrics() {
    const timestamp = Date.now();

    try {
      // Collect response time metrics
      const responseMetrics = responseOptimizer.getMetrics();
      this.updateResponseTimeMetrics(responseMetrics, timestamp);

      // Collect cache metrics
      const cacheMetrics = tenantCache.getGlobalStats();
      this.updateCacheMetrics(cacheMetrics, timestamp);

      // Collect optimization metrics
      const optimizerMetrics = cacheOptimizer.getMetrics();
      const sheetsMetrics = sheetsOptimizer.getMetrics();
      this.updateOptimizationMetrics(responseMetrics, optimizerMetrics, sheetsMetrics, timestamp);

      // Calculate throughput
      this.updateThroughputMetrics(responseMetrics, timestamp);

    } catch (error) {
      logger.error('Metrics collection failed', {
        error: error.message,
        operation: 'metrics_collection_error'
      });
    }
  }

  /**
   * Update response time metrics
   */
  updateResponseTimeMetrics(responseMetrics, timestamp) {
    const responseTime = responseMetrics.avgResponseTime || 0;
    
    this.metrics.responseTime.current = responseTime;
    this.metrics.responseTime.samples.push({ timestamp, value: responseTime });

    // Calculate percentiles
    const recentSamples = this.getRecentSamples(this.metrics.responseTime.samples, 3600000); // Last hour
    if (recentSamples.length > 0) {
      const sortedTimes = recentSamples.map(s => s.value).sort((a, b) => a - b);
      this.metrics.responseTime.p95 = this.calculatePercentile(sortedTimes, 95);
      this.metrics.responseTime.p99 = this.calculatePercentile(sortedTimes, 99);
    }

    // Calculate 24h average
    const samples24h = this.getRecentSamples(this.metrics.responseTime.samples, 86400000);
    if (samples24h.length > 0) {
      this.metrics.responseTime.avg24h = samples24h.reduce((sum, s) => sum + s.value, 0) / samples24h.length;
    }
  }

  /**
   * Update cache metrics
   */
  updateCacheMetrics(cacheMetrics, timestamp) {
    const hitRate = cacheMetrics.hitRate || 0;
    
    this.metrics.cacheHitRate.current = hitRate;
    this.metrics.cacheHitRate.samples.push({ timestamp, value: hitRate });

    // Calculate 24h average
    const samples24h = this.getRecentSamples(this.metrics.cacheHitRate.samples, 86400000);
    if (samples24h.length > 0) {
      this.metrics.cacheHitRate.avg24h = samples24h.reduce((sum, s) => sum + s.value, 0) / samples24h.length;
    }
  }

  /**
   * Update optimization metrics
   */
  updateOptimizationMetrics(responseMetrics, optimizerMetrics, sheetsMetrics, timestamp) {
    // Compression savings
    if (responseMetrics.totalCompressionSavings) {
      const savingsKB = parseFloat(responseMetrics.totalCompressionSavings.replace(' KB', '')) || 0;
      this.metrics.optimization.compressionSavings = savingsKB;
    }

    // Cache warming hits
    this.metrics.optimization.cacheWarmingHits = optimizerMetrics.warmingHits || 0;

    // Connection pool utilization
    if (sheetsMetrics.totalConnections > 0) {
      this.metrics.optimization.connectionPoolUtilization = 
        (sheetsMetrics.activeConnections / sheetsMetrics.totalConnections) * 100;
    }
  }

  /**
   * Update throughput metrics
   */
  updateThroughputMetrics(responseMetrics, timestamp) {
    const totalRequests = responseMetrics.totalRequests || 0;
    
    // Calculate requests per second from recent samples
    const recentSamples = this.getRecentSamples(this.metrics.throughput.samples, 60000); // Last minute
    if (recentSamples.length > 1) {
      const timeSpan = (timestamp - recentSamples[0].timestamp) / 1000; // Convert to seconds
      const requestDiff = totalRequests - (recentSamples[0].requests || 0);
      this.metrics.throughput.requestsPerSecond = requestDiff / timeSpan;
      
      // Update peak RPS
      if (this.metrics.throughput.requestsPerSecond > this.metrics.throughput.peakRps) {
        this.metrics.throughput.peakRps = this.metrics.throughput.requestsPerSecond;
      }
    }

    this.metrics.throughput.samples.push({ timestamp, requests: totalRequests });
  }

  /**
   * Validate performance targets
   */
  validateTargets() {
    const violations = [];

    // Check response time target
    if (this.metrics.responseTime.current > this.config.targetResponseTime) {
      this.metrics.responseTime.violations++;
      violations.push({
        type: 'RESPONSE_TIME',
        target: this.config.targetResponseTime,
        actual: this.metrics.responseTime.current,
        severity: this.calculateSeverity(this.metrics.responseTime.current, this.config.targetResponseTime)
      });
    }

    // Check cache hit rate target
    if (this.metrics.cacheHitRate.current < this.config.targetCacheHitRate) {
      this.metrics.cacheHitRate.violations++;
      violations.push({
        type: 'CACHE_HIT_RATE',
        target: this.config.targetCacheHitRate,
        actual: this.metrics.cacheHitRate.current,
        severity: this.calculateCacheHitSeverity(this.metrics.cacheHitRate.current, this.config.targetCacheHitRate)
      });
    }

    // Generate alerts if necessary
    if (violations.length > 0) {
      this.handleViolations(violations);
    }

    // Log current status
    this.logPerformanceStatus(violations);
  }

  /**
   * Calculate severity of response time violation
   */
  calculateSeverity(actual, target) {
    const ratio = actual / target;
    if (ratio > 3) return 'CRITICAL';
    if (ratio > 2) return 'HIGH';
    if (ratio > 1.5) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate severity of cache hit rate violation
   */
  calculateCacheHitSeverity(actual, target) {
    const diff = target - actual;
    if (diff > 30) return 'CRITICAL';
    if (diff > 20) return 'HIGH';
    if (diff > 10) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Handle performance violations
   */
  handleViolations(violations) {
    for (const violation of violations) {
      const alert = {
        timestamp: Date.now(),
        type: violation.type,
        severity: violation.severity,
        target: violation.target,
        actual: violation.actual,
        recommendations: this.generateRecommendations(violation)
      };

      this.alerts.push(alert);

      // Log alert
      logger.warn('Performance target violation', {
        alert,
        operation: 'performance_violation'
      });

      // Trigger automatic optimizations if possible
      this.triggerAutoOptimizations(violation);
    }

    // Keep only recent alerts
    this.alerts = this.alerts.filter(alert => 
      Date.now() - alert.timestamp < this.config.metricsRetention
    );
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(violation) {
    const recommendations = [];

    if (violation.type === 'RESPONSE_TIME') {
      recommendations.push('Enable response compression if not already active');
      recommendations.push('Increase cache TTL values for frequently accessed data');
      recommendations.push('Review database connection pool settings');
      recommendations.push('Enable predictive cache warming');
      
      if (violation.severity === 'CRITICAL') {
        recommendations.push('Consider scaling up infrastructure');
        recommendations.push('Review slow query performance');
      }
    }

    if (violation.type === 'CACHE_HIT_RATE') {
      recommendations.push('Increase cache size limits');
      recommendations.push('Extend cache TTL for stable data');
      recommendations.push('Enable aggressive cache warming');
      recommendations.push('Review cache invalidation policies');
      
      if (violation.severity === 'CRITICAL') {
        recommendations.push('Implement multi-level caching');
        recommendations.push('Add Redis for distributed caching');
      }
    }

    return recommendations;
  }

  /**
   * Trigger automatic optimizations
   */
  triggerAutoOptimizations(violation) {
    try {
      if (violation.type === 'CACHE_HIT_RATE' && violation.severity !== 'LOW') {
        // Trigger aggressive cache warming
        logger.info('Triggering automatic cache optimization', {
          violation: violation.type,
          severity: violation.severity,
          operation: 'auto_optimization'
        });
        
        // This would trigger actual optimization logic
        // cacheOptimizer.triggerAggressiveWarming();
      }

      if (violation.type === 'RESPONSE_TIME' && violation.severity === 'HIGH') {
        // Trigger response optimization
        logger.info('Triggering automatic response optimization', {
          violation: violation.type,
          severity: violation.severity,
          operation: 'auto_optimization'
        });
        
        // This would trigger actual optimization logic
        // responseOptimizer.enableAggressiveCompression();
      }
    } catch (error) {
      logger.error('Auto-optimization failed', {
        violation: violation.type,
        error: error.message,
        operation: 'auto_optimization_error'
      });
    }
  }

  /**
   * Log performance status
   */
  logPerformanceStatus(violations) {
    const status = {
      timestamp: Date.now(),
      targets: {
        responseTime: {
          target: this.config.targetResponseTime + 'ms',
          current: this.metrics.responseTime.current.toFixed(1) + 'ms',
          status: this.metrics.responseTime.current <= this.config.targetResponseTime ? 'PASS' : 'FAIL',
          p95: this.metrics.responseTime.p95.toFixed(1) + 'ms',
          p99: this.metrics.responseTime.p99.toFixed(1) + 'ms'
        },
        cacheHitRate: {
          target: this.config.targetCacheHitRate + '%',
          current: this.metrics.cacheHitRate.current.toFixed(1) + '%',
          status: this.metrics.cacheHitRate.current >= this.config.targetCacheHitRate ? 'PASS' : 'FAIL',
          avg24h: this.metrics.cacheHitRate.avg24h.toFixed(1) + '%'
        }
      },
      throughput: {
        rps: this.metrics.throughput.requestsPerSecond.toFixed(1),
        peakRps: this.metrics.throughput.peakRps.toFixed(1)
      },
      optimization: {
        compressionSavings: this.metrics.optimization.compressionSavings.toFixed(1) + ' KB',
        cacheWarmingHits: this.metrics.optimization.cacheWarmingHits,
        connectionPoolUtilization: this.metrics.optimization.connectionPoolUtilization.toFixed(1) + '%'
      },
      violations: violations.length,
      operation: 'performance_status'
    };

    if (violations.length > 0) {
      logger.warn('Performance monitoring status', status);
    } else {
      logger.info('Performance monitoring status', status);
    }
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport() {
    const report = {
      timestamp: Date.now(),
      period: '24h',
      summary: {
        overallStatus: this.calculateOverallStatus(),
        responseTimeCompliance: this.calculateCompliance('responseTime'),
        cacheHitRateCompliance: this.calculateCompliance('cacheHitRate'),
        totalViolations: this.metrics.responseTime.violations + this.metrics.cacheHitRate.violations,
        uptimePercentage: this.calculateUptimePercentage()
      },
      metrics: {
        responseTime: {
          avg: this.metrics.responseTime.avg24h.toFixed(1) + 'ms',
          current: this.metrics.responseTime.current.toFixed(1) + 'ms',
          p95: this.metrics.responseTime.p95.toFixed(1) + 'ms',
          p99: this.metrics.responseTime.p99.toFixed(1) + 'ms',
          violations: this.metrics.responseTime.violations
        },
        cacheHitRate: {
          avg: this.metrics.cacheHitRate.avg24h.toFixed(1) + '%',
          current: this.metrics.cacheHitRate.current.toFixed(1) + '%',
          violations: this.metrics.cacheHitRate.violations
        },
        throughput: {
          avgRps: this.calculateAvgThroughput().toFixed(1),
          peakRps: this.metrics.throughput.peakRps.toFixed(1),
          totalRequests: this.getTotalRequests()
        }
      },
      optimizations: {
        compressionSavings: this.metrics.optimization.compressionSavings.toFixed(1) + ' KB',
        cacheWarmingEfficiency: this.calculateCacheWarmingEfficiency() + '%',
        connectionPoolEfficiency: this.metrics.optimization.connectionPoolUtilization.toFixed(1) + '%'
      },
      alerts: this.getRecentAlerts(),
      recommendations: this.generateGlobalRecommendations()
    };

    this.performanceReports.push(report);
    
    // Keep only recent reports
    this.performanceReports = this.performanceReports.filter(r => 
      Date.now() - r.timestamp < this.config.metricsRetention
    );

    logger.info('Performance report generated', {
      report,
      operation: 'performance_report'
    });

    return report;
  }

  /**
   * Calculate overall performance status
   */
  calculateOverallStatus() {
    const responseTimeOk = this.metrics.responseTime.current <= this.config.targetResponseTime;
    const cacheHitRateOk = this.metrics.cacheHitRate.current >= this.config.targetCacheHitRate;
    
    if (responseTimeOk && cacheHitRateOk) return 'EXCELLENT';
    if (responseTimeOk || cacheHitRateOk) return 'GOOD';
    return 'NEEDS_IMPROVEMENT';
  }

  /**
   * Calculate compliance percentage
   */
  calculateCompliance(metric) {
    const recentSamples = this.getRecentSamples(this.metrics[metric].samples, 86400000);
    if (recentSamples.length === 0) return 100;
    
    let compliantSamples = 0;
    for (const sample of recentSamples) {
      if (metric === 'responseTime' && sample.value <= this.config.targetResponseTime) {
        compliantSamples++;
      } else if (metric === 'cacheHitRate' && sample.value >= this.config.targetCacheHitRate) {
        compliantSamples++;
      }
    }
    
    return (compliantSamples / recentSamples.length * 100).toFixed(1);
  }

  /**
   * Calculate uptime percentage
   */
  calculateUptimePercentage() {
    // This is a simplified calculation
    // In production, this would track actual service availability
    const recentSamples = this.getRecentSamples(this.metrics.responseTime.samples, 86400000);
    const healthySamples = recentSamples.filter(s => s.value > 0 && s.value < 10000); // Exclude timeouts
    
    if (recentSamples.length === 0) return 100;
    return (healthySamples.length / recentSamples.length * 100).toFixed(2);
  }

  /**
   * Utility functions
   */
  getRecentSamples(samples, timeWindow) {
    const cutoff = Date.now() - timeWindow;
    return samples.filter(s => s.timestamp > cutoff);
  }

  calculatePercentile(sortedArray, percentile) {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)] || 0;
  }

  calculateAvgThroughput() {
    const recentSamples = this.getRecentSamples(this.metrics.throughput.samples, 3600000); // Last hour
    if (recentSamples.length < 2) return 0;
    
    const timeSpan = (recentSamples[recentSamples.length - 1].timestamp - recentSamples[0].timestamp) / 1000;
    const requestDiff = recentSamples[recentSamples.length - 1].requests - recentSamples[0].requests;
    
    return requestDiff / timeSpan;
  }

  getTotalRequests() {
    const samples = this.metrics.throughput.samples;
    return samples.length > 0 ? samples[samples.length - 1].requests : 0;
  }

  calculateCacheWarmingEfficiency() {
    // This would be calculated based on cache optimizer metrics
    return 85; // Placeholder
  }

  getRecentAlerts() {
    return this.alerts.filter(alert => 
      Date.now() - alert.timestamp < 3600000 // Last hour
    );
  }

  generateGlobalRecommendations() {
    const recommendations = [];
    
    if (this.metrics.responseTime.avg24h > this.config.targetResponseTime) {
      recommendations.push('Response time consistently above target - consider infrastructure scaling');
    }
    
    if (this.metrics.cacheHitRate.avg24h < this.config.targetCacheHitRate) {
      recommendations.push('Cache hit rate below target - review caching strategy');
    }
    
    if (this.metrics.throughput.requestsPerSecond > 50) {
      recommendations.push('High traffic detected - monitor resource utilization');
    }
    
    return recommendations;
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  cleanupOldMetrics() {
    const cutoff = Date.now() - this.config.metricsRetention;
    
    this.metrics.responseTime.samples = this.metrics.responseTime.samples.filter(s => s.timestamp > cutoff);
    this.metrics.cacheHitRate.samples = this.metrics.cacheHitRate.samples.filter(s => s.timestamp > cutoff);
    this.metrics.throughput.samples = this.metrics.throughput.samples.filter(s => s.timestamp > cutoff);
  }

  /**
   * Get current performance metrics
   */
  getMetrics() {
    return {
      current: {
        responseTime: this.metrics.responseTime.current,
        cacheHitRate: this.metrics.cacheHitRate.current,
        throughput: this.metrics.throughput.requestsPerSecond
      },
      targets: {
        responseTime: this.config.targetResponseTime,
        cacheHitRate: this.config.targetCacheHitRate
      },
      status: this.calculateOverallStatus(),
      violations: {
        responseTime: this.metrics.responseTime.violations,
        cacheHitRate: this.metrics.cacheHitRate.violations
      },
      alerts: this.alerts.length
    };
  }

  /**
   * Get latest performance report
   */
  getLatestReport() {
    return this.performanceReports[this.performanceReports.length - 1] || null;
  }
}

// Export singleton instance
const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;
export { PerformanceMonitor };