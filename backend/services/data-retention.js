/**
 * Data Retention Service
 * Enforces tier-based data retention policies
 */

// Tier-based data retention periods (matching Shopify plan descriptions)
const RETENTION_PERIODS = {
  starter: 7,      // 7 days
  professional: 30, // 30 days  
  enterprise: 90   // 90 days
};

/**
 * Get data retention period for a tier
 */
export function getRetentionPeriod(tier) {
  return RETENTION_PERIODS[tier] || RETENTION_PERIODS.starter;
}

/**
 * Calculate cutoff date for data retention
 */
export function getRetentionCutoffDate(tier) {
  const retentionDays = getRetentionPeriod(tier);
  return new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));
}

/**
 * Filter data array by retention period
 */
export function filterDataByRetention(data, tier, dateField = 'date') {
  const cutoffDate = getRetentionCutoffDate(tier);
  
  return data.filter(item => {
    try {
      const itemDate = new Date(item[dateField]);
      return itemDate >= cutoffDate;
    } catch (error) {
      // If date parsing fails, include the item (safe default)
      return true;
    }
  });
}

/**
 * Filter metrics data for tier-appropriate retention
 */
export function filterMetricsByRetention(metrics, tier) {
  const cutoffDate = getRetentionCutoffDate(tier);
  
  return metrics.filter(metric => {
    try {
      // Handle different date formats
      let metricDate;
      if (metric.date) {
        metricDate = new Date(metric.date);
      } else if (metric[0]) {
        metricDate = new Date(metric[0]); // Array format
      } else {
        return true; // Include if can't determine date
      }
      
      return metricDate >= cutoffDate;
    } catch (error) {
      return true; // Include on error
    }
  });
}

/**
 * Filter search terms by retention period
 */
export function filterSearchTermsByRetention(searchTerms, tier) {
  const cutoffDate = getRetentionCutoffDate(tier);
  
  return searchTerms.filter(term => {
    try {
      const termDate = new Date(term.date || term[0]);
      return termDate >= cutoffDate;
    } catch (error) {
      return true;
    }
  });
}

/**
 * Get retention summary for user display
 */
export function getRetentionSummary(tier) {
  const days = getRetentionPeriod(tier);
  const cutoffDate = getRetentionCutoffDate(tier);
  
  return {
    tier,
    retentionDays: days,
    cutoffDate: cutoffDate.toISOString().split('T')[0],
    description: `Data from the last ${days} days`,
    upgradeMessage: tier === 'starter' ? 
      'Upgrade to Professional for 30-day retention' :
      tier === 'professional' ?
      'Upgrade to Enterprise for 90-day retention' :
      null
  };
}

/**
 * Middleware to enforce data retention on analytics endpoints
 */
export function enforceDataRetention() {
  return (req, res, next) => {
    const userTier = req.subscription?.tier || 'starter';
    const retentionInfo = getRetentionSummary(userTier);
    
    // Add retention info to request for downstream use
    req.dataRetention = retentionInfo;
    
    console.log(`🗓️ Data retention for ${userTier}: ${retentionInfo.retentionDays} days (cutoff: ${retentionInfo.cutoffDate})`);
    
    // Intercept JSON responses to filter data
    const originalJson = res.json;
    res.json = function(data) {
      if (data && typeof data === 'object') {
        // Filter metrics if present
        if (data.metrics && Array.isArray(data.metrics)) {
          const originalLength = data.metrics.length;
          data.metrics = filterMetricsByRetention(data.metrics, userTier);
          const filteredLength = data.metrics.length;
          
          if (filteredLength < originalLength) {
            console.log(`📉 Filtered metrics for ${userTier}: ${originalLength} → ${filteredLength} (${retentionInfo.retentionDays} day limit)`);
          }
        }
        
        // Filter search terms if present
        if (data.search_terms && Array.isArray(data.search_terms)) {
          const originalLength = data.search_terms.length;
          data.search_terms = filterSearchTermsByRetention(data.search_terms, userTier);
          const filteredLength = data.search_terms.length;
          
          if (filteredLength < originalLength) {
            console.log(`🔍 Filtered search terms for ${userTier}: ${originalLength} → ${filteredLength} (${retentionInfo.retentionDays} day limit)`);
          }
        }
        
        // Add retention info to response
        data._retention = retentionInfo;
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * Check if data should be visible for a tier
 */
export function isDataVisible(dataDate, tier) {
  const cutoffDate = getRetentionCutoffDate(tier);
  const itemDate = new Date(dataDate);
  
  return itemDate >= cutoffDate;
}

export default {
  getRetentionPeriod,
  getRetentionCutoffDate,
  filterDataByRetention,
  filterMetricsByRetention,
  filterSearchTermsByRetention,
  getRetentionSummary,
  enforceDataRetention,
  isDataVisible
};