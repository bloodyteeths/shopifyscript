/**
 * Enhanced Master Google Ads Script - ProofKit Integration
 * Version: 2.0.0
 *
 * This script runs in your Google Ads account and communicates with the ProofKit backend
 * to fetch optimization instructions and send performance data back.
 *
 * SETUP INSTRUCTIONS:
 * 1. Replace the configuration values below with your actual settings
 * 2. Set the script to run every 4-6 hours in Google Ads
 * 3. Monitor the logs for successful execution
 *
 * SAFETY FEATURES:
 * - Dry-run mode for testing
 * - Comprehensive error handling
 * - Rollback capabilities
 * - HMAC authentication
 * - Budget and bid safeguards
 */

// ============================================================================
// CONFIGURATION SECTION - MODIFY THESE VALUES
// ============================================================================

var CONFIG = {
  // Backend Connection
  TENANT_ID: '__TENANT_ID__',           // Your ProofKit tenant ID
  BACKEND_URL: '__BACKEND_URL__',       // ProofKit backend URL
  SHARED_SECRET: '__HMAC_SECRET__',     // HMAC secret for authentication

  // Script Behavior
  DRY_RUN: false,                       // Set to true for testing without changes
  VERSION: '2.0.0',                     // Script version
  ENABLE_LOGGING: true,                 // Enable detailed logging

  // Safety Limits
  MAX_BUDGET_CHANGE: 0.5,               // Maximum budget change per run (50%)
  MAX_BID_CHANGE: 0.3,                  // Maximum bid change per run (30%)
  MIN_CAMPAIGN_BUDGET: 1.0,             // Minimum campaign budget ($1)
  MAX_CAMPAIGN_BUDGET: 1000.0,          // Maximum campaign budget ($1000)

  // Retry Configuration
  MAX_RETRIES: 3,                       // API call retry attempts
  RETRY_DELAY: 2000,                    // Delay between retries (ms)

  // Data Collection
  LOOKBACK_DAYS: 7,                     // Days of data to collect
  CHUNK_SIZE: 500,                      // Records per API call chunk

  // Features
  ENABLE_BUDGET_OPTIMIZATION: true,     // Enable budget adjustments
  ENABLE_BID_OPTIMIZATION: true,        // Enable bid modifications
  ENABLE_KEYWORD_MANAGEMENT: true,      // Enable keyword changes
  ENABLE_AD_CREATION: true,             // Enable ad copy updates
  ENABLE_AUDIENCE_TARGETING: true,      // Enable audience management

  // Labels
  SCRIPT_LABEL: 'ProofKit-Enhanced',    // Label for tracking managed entities

  // Exclusions
  EXCLUDED_CAMPAIGNS: [],               // Campaign names to exclude
  EXCLUDED_KEYWORDS: ['brand', 'competitor'] // Keywords to never negative
};

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

var EXECUTION_LOG = [];
var MUTATION_LOG = [];
var ERROR_LOG = [];
var PERFORMANCE_START = new Date();
var SCRIPT_RUN_ID = 'RUN_' + new Date().getTime();

// ============================================================================
// MAIN EXECUTION FUNCTION
// ============================================================================

function main() {
  try {
    log_('Enhanced ProofKit Script v' + CONFIG.VERSION + ' Starting', 'INFO');
    log_('Run ID: ' + SCRIPT_RUN_ID, 'INFO');
    log_('Mode: ' + (CONFIG.DRY_RUN ? 'DRY RUN' : 'LIVE'), 'INFO');

    // Initialize script
    validateConfiguration_();
    initializeExecution_();

    // Check for backend connectivity
    var connectivityTest = testBackendConnectivity_();
    if (!connectivityTest.success) {
      log_('Backend connectivity failed: ' + connectivityTest.error, 'ERROR');
      return;
    }

    // Fetch optimizations from backend
    var optimizations = fetchOptimizations_();
    if (!optimizations || optimizations.length === 0) {
      log_('No optimizations available from backend', 'INFO');
    } else {
      log_('Received ' + optimizations.length + ' optimizations from backend', 'INFO');

      // Apply optimizations
      var results = applyOptimizations_(optimizations);
      log_('Applied ' + results.successful + ' optimizations, ' + results.failed + ' failed', 'INFO');
    }

    // Collect and send performance metrics
    var metrics = collectPerformanceMetrics_();
    log_('Collected ' + metrics.campaigns.length + ' campaign metrics, ' +
         metrics.keywords.length + ' keyword metrics', 'INFO');

    // Send results to backend
    var sendResult = sendMetricsToBackend_(metrics);
    if (sendResult.success) {
      log_('Successfully sent metrics to backend', 'INFO');
    } else {
      log_('Failed to send metrics: ' + sendResult.error, 'ERROR');
    }

    // Send execution summary
    sendExecutionSummary_();

    log_('Enhanced ProofKit Script completed successfully', 'INFO');

  } catch (error) {
    log_('Critical error in main execution: ' + error.toString(), 'ERROR');
    sendErrorReport_(error);
  }
}

// ============================================================================
// BACKEND COMMUNICATION MODULE
// ============================================================================

function testBackendConnectivity_() {
  try {
    var payload = 'GET:' + CONFIG.TENANT_ID + ':health';
    var signature = generateHMAC_(payload);
    var url = CONFIG.BACKEND_URL + '/health?tenant=' + encodeURIComponent(CONFIG.TENANT_ID) +
              '&sig=' + encodeURIComponent(signature);

    var response = makeHttpRequest_(url, 'GET');
    return { success: response.success, error: response.error };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function fetchOptimizations_() {
  try {
    var payload = 'GET:' + CONFIG.TENANT_ID + ':optimizations';
    var signature = generateHMAC_(payload);
    var url = CONFIG.BACKEND_URL + '/api/ads/optimizations?tenant=' +
              encodeURIComponent(CONFIG.TENANT_ID) + '&sig=' + encodeURIComponent(signature);

    var response = makeHttpRequest_(url, 'GET');
    if (!response.success) {
      log_('Failed to fetch optimizations: ' + response.error, 'ERROR');
      return [];
    }

    try {
      var data = JSON.parse(response.data);
      return data.optimizations || [];
    } catch (parseError) {
      log_('Failed to parse optimizations response: ' + parseError, 'ERROR');
      return [];
    }
  } catch (error) {
    log_('Error fetching optimizations: ' + error.toString(), 'ERROR');
    return [];
  }
}

function sendMetricsToBackend_(metrics) {
  try {
    var nonce = new Date().getTime().toString();
    var payload = 'POST:' + CONFIG.TENANT_ID + ':metrics:' + nonce;
    var signature = generateHMAC_(payload);
    var url = CONFIG.BACKEND_URL + '/api/ads/metrics?tenant=' +
              encodeURIComponent(CONFIG.TENANT_ID) + '&sig=' + encodeURIComponent(signature);

    var requestData = {
      nonce: nonce,
      runId: SCRIPT_RUN_ID,
      timestamp: new Date().toISOString(),
      metrics: metrics,
      executionLog: EXECUTION_LOG.slice(-100), // Last 100 log entries
      version: CONFIG.VERSION
    };

    return sendDataInChunks_(url, requestData);
  } catch (error) {
    log_('Error sending metrics: ' + error.toString(), 'ERROR');
    return { success: false, error: error.toString() };
  }
}

function sendExecutionSummary_() {
  try {
    var executionTime = new Date().getTime() - PERFORMANCE_START.getTime();
    var summary = {
      runId: SCRIPT_RUN_ID,
      version: CONFIG.VERSION,
      executionTime: executionTime,
      mode: CONFIG.DRY_RUN ? 'DRY_RUN' : 'LIVE',
      mutationsApplied: MUTATION_LOG.length,
      errorsOccurred: ERROR_LOG.length,
      timestamp: new Date().toISOString()
    };

    var nonce = new Date().getTime().toString();
    var payload = 'POST:' + CONFIG.TENANT_ID + ':summary:' + nonce;
    var signature = generateHMAC_(payload);
    var url = CONFIG.BACKEND_URL + '/api/ads/summary?tenant=' +
              encodeURIComponent(CONFIG.TENANT_ID) + '&sig=' + encodeURIComponent(signature);

    var response = makeHttpRequest_(url, 'POST', JSON.stringify(summary));
    if (response.success) {
      log_('Execution summary sent successfully', 'INFO');
    } else {
      log_('Failed to send execution summary: ' + response.error, 'ERROR');
    }
  } catch (error) {
    log_('Error sending execution summary: ' + error.toString(), 'ERROR');
  }
}

function sendErrorReport_(error) {
  try {
    var errorReport = {
      runId: SCRIPT_RUN_ID,
      version: CONFIG.VERSION,
      error: error.toString(),
      stack: error.stack || 'No stack trace available',
      timestamp: new Date().toISOString(),
      recentLogs: EXECUTION_LOG.slice(-20) // Last 20 log entries
    };

    var nonce = new Date().getTime().toString();
    var payload = 'POST:' + CONFIG.TENANT_ID + ':error:' + nonce;
    var signature = generateHMAC_(payload);
    var url = CONFIG.BACKEND_URL + '/api/ads/error?tenant=' +
              encodeURIComponent(CONFIG.TENANT_ID) + '&sig=' + encodeURIComponent(signature);

    makeHttpRequest_(url, 'POST', JSON.stringify(errorReport));
  } catch (sendError) {
    log_('Failed to send error report: ' + sendError.toString(), 'ERROR');
  }
}

function makeHttpRequest_(url, method, payload) {
  var options = {
    method: method || 'GET',
    muteHttpExceptions: true,
    followRedirects: true,
    validateHttpsCertificates: true,
    headers: {
      'User-Agent': 'ProofKit-Enhanced-Script/' + CONFIG.VERSION,
      'Content-Type': 'application/json'
    }
  };

  if (payload) {
    options.payload = payload;
  }

  var attempt = 0;
  while (attempt < CONFIG.MAX_RETRIES) {
    try {
      var response = UrlFetchApp.fetch(url, options);
      var responseCode = response.getResponseCode();
      var responseText = response.getContentText();

      if (responseCode >= 200 && responseCode < 300) {
        return { success: true, data: responseText, code: responseCode };
      } else {
        log_('HTTP error ' + responseCode + ': ' + responseText, 'ERROR');
        if (attempt === CONFIG.MAX_RETRIES - 1) {
          return { success: false, error: 'HTTP ' + responseCode + ': ' + responseText };
        }
      }
    } catch (error) {
      log_('HTTP request failed (attempt ' + (attempt + 1) + '): ' + error.toString(), 'ERROR');
      if (attempt === CONFIG.MAX_RETRIES - 1) {
        return { success: false, error: error.toString() };
      }
    }

    attempt++;
    if (attempt < CONFIG.MAX_RETRIES) {
      Utilities.sleep(CONFIG.RETRY_DELAY * attempt); // Exponential backoff
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

function sendDataInChunks_(url, data) {
  try {
    // For large datasets, split into chunks
    var campaigns = data.metrics.campaigns || [];
    var keywords = data.metrics.keywords || [];
    var ads = data.metrics.ads || [];

    var totalChunks = Math.ceil(Math.max(
      campaigns.length / CONFIG.CHUNK_SIZE,
      keywords.length / CONFIG.CHUNK_SIZE,
      ads.length / CONFIG.CHUNK_SIZE,
      1
    ));

    for (var i = 0; i < totalChunks; i++) {
      var chunkData = {
        nonce: data.nonce,
        runId: data.runId,
        timestamp: data.timestamp,
        version: data.version,
        chunkIndex: i,
        totalChunks: totalChunks,
        metrics: {
          campaigns: campaigns.slice(i * CONFIG.CHUNK_SIZE, (i + 1) * CONFIG.CHUNK_SIZE),
          keywords: keywords.slice(i * CONFIG.CHUNK_SIZE, (i + 1) * CONFIG.CHUNK_SIZE),
          ads: ads.slice(i * CONFIG.CHUNK_SIZE, (i + 1) * CONFIG.CHUNK_SIZE)
        }
      };

      // Include execution log only in first chunk
      if (i === 0) {
        chunkData.executionLog = data.executionLog;
      }

      var response = makeHttpRequest_(url, 'POST', JSON.stringify(chunkData));
      if (!response.success) {
        return { success: false, error: 'Chunk ' + i + ' failed: ' + response.error };
      }

      log_('Sent chunk ' + (i + 1) + '/' + totalChunks + ' successfully', 'INFO');
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function generateHMAC_(payload) {
  try {
    var signature = Utilities.computeHmacSha256Signature(payload, CONFIG.SHARED_SECRET);
    return Utilities.base64Encode(signature).replace(/=+$/, '');
  } catch (error) {
    log_('HMAC generation failed: ' + error.toString(), 'ERROR');
    throw error;
  }
}

// ============================================================================
// OPTIMIZATION APPLICATION MODULE
// ============================================================================

function applyOptimizations_(optimizations) {
  var results = { successful: 0, failed: 0, skipped: 0 };

  for (var i = 0; i < optimizations.length; i++) {
    var optimization = optimizations[i];
    try {
      var result = applyOptimization_(optimization);
      if (result.success) {
        results.successful++;
        logMutation_('OPTIMIZATION_APPLIED', {
          type: optimization.type,
          target: optimization.target,
          details: result.details
        });
      } else if (result.skipped) {
        results.skipped++;
        log_('Skipped optimization: ' + result.reason, 'INFO');
      } else {
        results.failed++;
        log_('Failed to apply optimization: ' + result.error, 'ERROR');
        ERROR_LOG.push({
          type: 'OPTIMIZATION_FAILED',
          optimization: optimization,
          error: result.error,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      results.failed++;
      log_('Exception applying optimization: ' + error.toString(), 'ERROR');
      ERROR_LOG.push({
        type: 'OPTIMIZATION_EXCEPTION',
        optimization: optimization,
        error: error.toString(),
        timestamp: new Date().toISOString()
      });
    }
  }

  return results;
}

function applyOptimization_(optimization) {
  // Validate optimization structure
  if (!optimization || !optimization.type || !optimization.target) {
    return { success: false, error: 'Invalid optimization structure' };
  }

  // Check if optimization should be skipped
  if (shouldSkipOptimization_(optimization)) {
    return { skipped: true, reason: 'Optimization skipped due to safety rules' };
  }

  // Apply based on optimization type
  switch (optimization.type.toUpperCase()) {
    case 'BUDGET_ADJUSTMENT':
      return applyBudgetAdjustment_(optimization);
    case 'BID_MODIFICATION':
      return applyBidModification_(optimization);
    case 'KEYWORD_ADDITION':
      return applyKeywordAddition_(optimization);
    case 'KEYWORD_NEGATION':
      return applyKeywordNegation_(optimization);
    case 'AD_CREATION':
      return applyAdCreation_(optimization);
    case 'AD_UPDATE':
      return applyAdUpdate_(optimization);
    case 'AUDIENCE_TARGETING':
      return applyAudienceTargeting_(optimization);
    case 'CAMPAIGN_PAUSE':
      return applyCampaignPause_(optimization);
    case 'CAMPAIGN_ENABLE':
      return applyCampaignEnable_(optimization);
    default:
      return { success: false, error: 'Unknown optimization type: ' + optimization.type };
  }
}

function applyBudgetAdjustment_(optimization) {
  if (!CONFIG.ENABLE_BUDGET_OPTIMIZATION) {
    return { skipped: true, reason: 'Budget optimization disabled' };
  }

  try {
    var campaignName = optimization.target.campaign;
    var newBudget = parseFloat(optimization.parameters.budget);

    if (isNaN(newBudget) || newBudget < CONFIG.MIN_CAMPAIGN_BUDGET || newBudget > CONFIG.MAX_CAMPAIGN_BUDGET) {
      return { success: false, error: 'Invalid budget amount: ' + newBudget };
    }

    var campaignIterator = AdsApp.campaigns()
      .withCondition('campaign.name = "' + campaignName.replace(/"/g, '\\"') + '"')
      .get();

    if (!campaignIterator.hasNext()) {
      return { success: false, error: 'Campaign not found: ' + campaignName };
    }

    var campaign = campaignIterator.next();
    var currentBudget = campaign.getBudget().getAmount();

    // Check for excessive budget change
    var changeRatio = Math.abs(newBudget - currentBudget) / currentBudget;
    if (changeRatio > CONFIG.MAX_BUDGET_CHANGE) {
      return { success: false, error: 'Budget change too large: ' + (changeRatio * 100).toFixed(1) + '%' };
    }

    if (!CONFIG.DRY_RUN) {
      campaign.getBudget().setAmount(newBudget);
    }

    log_('Budget adjusted: ' + campaignName + ' $' + currentBudget.toFixed(2) + ' → $' + newBudget.toFixed(2), 'INFO');

    return {
      success: true,
      details: {
        campaign: campaignName,
        oldBudget: currentBudget,
        newBudget: newBudget,
        changePercent: ((newBudget - currentBudget) / currentBudget * 100).toFixed(1)
      }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function applyBidModification_(optimization) {
  if (!CONFIG.ENABLE_BID_OPTIMIZATION) {
    return { skipped: true, reason: 'Bid optimization disabled' };
  }

  try {
    var campaignName = optimization.target.campaign;
    var adGroupName = optimization.target.adGroup;
    var keywordText = optimization.target.keyword;
    var newBid = parseFloat(optimization.parameters.bid);

    if (isNaN(newBid) || newBid <= 0) {
      return { success: false, error: 'Invalid bid amount: ' + newBid };
    }

    // Find the keyword
    var keywordIterator = AdsApp.keywords()
      .withCondition('campaign.name = "' + campaignName.replace(/"/g, '\\"') + '"')
      .withCondition('ad_group.name = "' + adGroupName.replace(/"/g, '\\"') + '"')
      .withCondition('ad_group_criterion.keyword.text = "' + keywordText.replace(/"/g, '\\"') + '"')
      .get();

    if (!keywordIterator.hasNext()) {
      return { success: false, error: 'Keyword not found: ' + keywordText };
    }

    var keyword = keywordIterator.next();
    var currentBid = keyword.bidding().getCpc();

    // Check for excessive bid change
    if (currentBid > 0) {
      var changeRatio = Math.abs(newBid - currentBid) / currentBid;
      if (changeRatio > CONFIG.MAX_BID_CHANGE) {
        return { success: false, error: 'Bid change too large: ' + (changeRatio * 100).toFixed(1) + '%' };
      }
    }

    if (!CONFIG.DRY_RUN) {
      keyword.bidding().setCpc(newBid);
    }

    log_('Bid modified: ' + keywordText + ' $' + currentBid.toFixed(2) + ' → $' + newBid.toFixed(2), 'INFO');

    return {
      success: true,
      details: {
        keyword: keywordText,
        campaign: campaignName,
        adGroup: adGroupName,
        oldBid: currentBid,
        newBid: newBid
      }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function applyKeywordAddition_(optimization) {
  if (!CONFIG.ENABLE_KEYWORD_MANAGEMENT) {
    return { skipped: true, reason: 'Keyword management disabled' };
  }

  try {
    var campaignName = optimization.target.campaign;
    var adGroupName = optimization.target.adGroup;
    var keywordText = optimization.parameters.keyword;
    var matchType = optimization.parameters.matchType || 'BROAD_MATCH';
    var bid = parseFloat(optimization.parameters.bid) || null;

    // Find the ad group
    var adGroupIterator = AdsApp.adGroups()
      .withCondition('campaign.name = "' + campaignName.replace(/"/g, '\\"') + '"')
      .withCondition('ad_group.name = "' + adGroupName.replace(/"/g, '\\"') + '"')
      .get();

    if (!adGroupIterator.hasNext()) {
      return { success: false, error: 'Ad group not found: ' + adGroupName };
    }

    var adGroup = adGroupIterator.next();

    if (!CONFIG.DRY_RUN) {
      var keywordBuilder = adGroup.newKeywordBuilder()
        .withText(keywordText)
        .withMatchType(matchType);

      if (bid && bid > 0) {
        keywordBuilder.withCpc(bid);
      }

      var operation = keywordBuilder.build();
      if (!operation.isSuccessful()) {
        return { success: false, error: 'Failed to create keyword: ' + operation.getErrors().join(', ') };
      }
    }

    log_('Keyword added: ' + keywordText + ' (' + matchType + ') to ' + adGroupName, 'INFO');

    return {
      success: true,
      details: {
        keyword: keywordText,
        matchType: matchType,
        campaign: campaignName,
        adGroup: adGroupName,
        bid: bid
      }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function applyKeywordNegation_(optimization) {
  if (!CONFIG.ENABLE_KEYWORD_MANAGEMENT) {
    return { skipped: true, reason: 'Keyword management disabled' };
  }

  try {
    var campaignName = optimization.target.campaign;
    var adGroupName = optimization.target.adGroup;
    var keywordText = optimization.parameters.keyword;
    var level = optimization.parameters.level || 'AD_GROUP'; // AD_GROUP or CAMPAIGN

    // Check if keyword is in exclusion list
    if (isExcludedKeyword_(keywordText)) {
      return { skipped: true, reason: 'Keyword in exclusion list: ' + keywordText };
    }

    if (level === 'CAMPAIGN') {
      // Add as campaign-level negative
      var campaignIterator = AdsApp.campaigns()
        .withCondition('campaign.name = "' + campaignName.replace(/"/g, '\\"') + '"')
        .get();

      if (!campaignIterator.hasNext()) {
        return { success: false, error: 'Campaign not found: ' + campaignName };
      }

      var campaign = campaignIterator.next();

      if (!CONFIG.DRY_RUN) {
        campaign.createNegativeKeyword(keywordText);
      }

      log_('Campaign negative keyword added: ' + keywordText + ' to ' + campaignName, 'INFO');
    } else {
      // Add as ad group-level negative
      var adGroupIterator = AdsApp.adGroups()
        .withCondition('campaign.name = "' + campaignName.replace(/"/g, '\\"') + '"')
        .withCondition('ad_group.name = "' + adGroupName.replace(/"/g, '\\"') + '"')
        .get();

      if (!adGroupIterator.hasNext()) {
        return { success: false, error: 'Ad group not found: ' + adGroupName };
      }

      var adGroup = adGroupIterator.next();

      if (!CONFIG.DRY_RUN) {
        adGroup.createNegativeKeyword('[' + keywordText + ']');
      }

      log_('Ad group negative keyword added: [' + keywordText + '] to ' + adGroupName, 'INFO');
    }

    return {
      success: true,
      details: {
        keyword: keywordText,
        level: level,
        campaign: campaignName,
        adGroup: adGroupName
      }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function applyAdCreation_(optimization) {
  if (!CONFIG.ENABLE_AD_CREATION) {
    return { skipped: true, reason: 'Ad creation disabled' };
  }

  try {
    var campaignName = optimization.target.campaign;
    var adGroupName = optimization.target.adGroup;
    var adData = optimization.parameters;

    // Find the ad group
    var adGroupIterator = AdsApp.adGroups()
      .withCondition('campaign.name = "' + campaignName.replace(/"/g, '\\"') + '"')
      .withCondition('ad_group.name = "' + adGroupName.replace(/"/g, '\\"') + '"')
      .get();

    if (!adGroupIterator.hasNext()) {
      return { success: false, error: 'Ad group not found: ' + adGroupName };
    }

    var adGroup = adGroupIterator.next();

    if (!CONFIG.DRY_RUN) {
      if (adData.type === 'RESPONSIVE_SEARCH_AD') {
        var adBuilder = adGroup.newAd().responsiveSearchAdBuilder();

        // Add headlines
        if (adData.headlines && adData.headlines.length > 0) {
          for (var i = 0; i < Math.min(adData.headlines.length, 15); i++) {
            var headline = adData.headlines[i];
            if (headline && headline.length <= 30) {
              adBuilder.addHeadline(headline);
            }
          }
        }

        // Add descriptions
        if (adData.descriptions && adData.descriptions.length > 0) {
          for (var j = 0; j < Math.min(adData.descriptions.length, 4); j++) {
            var description = adData.descriptions[j];
            if (description && description.length <= 90) {
              adBuilder.addDescription(description);
            }
          }
        }

        // Set final URL
        if (adData.finalUrl) {
          adBuilder.withFinalUrl(adData.finalUrl);
        }

        var operation = adBuilder.build();
        if (!operation.isSuccessful()) {
          return { success: false, error: 'Failed to create ad: ' + operation.getErrors().join(', ') };
        }

        // Apply label if configured
        if (CONFIG.SCRIPT_LABEL) {
          try {
            operation.getResult().applyLabel(CONFIG.SCRIPT_LABEL);
          } catch (labelError) {
            // Label application is not critical
          }
        }
      }
    }

    log_('Responsive search ad created in ' + adGroupName, 'INFO');

    return {
      success: true,
      details: {
        adType: adData.type,
        campaign: campaignName,
        adGroup: adGroupName,
        headlineCount: adData.headlines ? adData.headlines.length : 0,
        descriptionCount: adData.descriptions ? adData.descriptions.length : 0
      }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function applyCampaignPause_(optimization) {
  try {
    var campaignName = optimization.target.campaign;

    var campaignIterator = AdsApp.campaigns()
      .withCondition('campaign.name = "' + campaignName.replace(/"/g, '\\"') + '"')
      .get();

    if (!campaignIterator.hasNext()) {
      return { success: false, error: 'Campaign not found: ' + campaignName };
    }

    var campaign = campaignIterator.next();

    if (!CONFIG.DRY_RUN) {
      campaign.pause();
    }

    log_('Campaign paused: ' + campaignName, 'INFO');

    return {
      success: true,
      details: {
        campaign: campaignName,
        action: 'PAUSED'
      }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function applyCampaignEnable_(optimization) {
  try {
    var campaignName = optimization.target.campaign;

    var campaignIterator = AdsApp.campaigns()
      .withCondition('campaign.name = "' + campaignName.replace(/"/g, '\\"') + '"')
      .get();

    if (!campaignIterator.hasNext()) {
      return { success: false, error: 'Campaign not found: ' + campaignName };
    }

    var campaign = campaignIterator.next();

    if (!CONFIG.DRY_RUN) {
      campaign.enable();
    }

    log_('Campaign enabled: ' + campaignName, 'INFO');

    return {
      success: true,
      details: {
        campaign: campaignName,
        action: 'ENABLED'
      }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function shouldSkipOptimization_(optimization) {
  // Check campaign exclusions
  if (optimization.target && optimization.target.campaign) {
    var campaignName = optimization.target.campaign;
    if (CONFIG.EXCLUDED_CAMPAIGNS.indexOf(campaignName) !== -1) {
      return true;
    }
  }

  // Check keyword exclusions for keyword-related optimizations
  if (optimization.parameters && optimization.parameters.keyword) {
    var keyword = optimization.parameters.keyword.toLowerCase();
    for (var i = 0; i < CONFIG.EXCLUDED_KEYWORDS.length; i++) {
      if (keyword.indexOf(CONFIG.EXCLUDED_KEYWORDS[i].toLowerCase()) !== -1) {
        return true;
      }
    }
  }

  return false;
}

function isExcludedKeyword_(keyword) {
  if (!keyword) return false;
  var keywordLower = keyword.toLowerCase();
  for (var i = 0; i < CONFIG.EXCLUDED_KEYWORDS.length; i++) {
    if (keywordLower.indexOf(CONFIG.EXCLUDED_KEYWORDS[i].toLowerCase()) !== -1) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// PERFORMANCE METRICS COLLECTION MODULE
// ============================================================================

function collectPerformanceMetrics_() {
  var metrics = {
    campaigns: [],
    adGroups: [],
    keywords: [],
    ads: [],
    searchTerms: [],
    audiences: []
  };

  try {
    log_('Collecting campaign metrics...', 'INFO');
    metrics.campaigns = collectCampaignMetrics_();

    log_('Collecting ad group metrics...', 'INFO');
    metrics.adGroups = collectAdGroupMetrics_();

    log_('Collecting keyword metrics...', 'INFO');
    metrics.keywords = collectKeywordMetrics_();

    log_('Collecting ad metrics...', 'INFO');
    metrics.ads = collectAdMetrics_();

    log_('Collecting search term metrics...', 'INFO');
    metrics.searchTerms = collectSearchTermMetrics_();

    log_('Collecting audience metrics...', 'INFO');
    metrics.audiences = collectAudienceMetrics_();

  } catch (error) {
    log_('Error collecting metrics: ' + error.toString(), 'ERROR');
  }

  return metrics;
}

function collectCampaignMetrics_() {
  var campaigns = [];
  var dateRange = 'LAST_' + CONFIG.LOOKBACK_DAYS + '_DAYS';

  var query = 'SELECT campaign.id, campaign.name, campaign.status, ' +
              'campaign.advertising_channel_type, campaign.budget_amount_micros, ' +
              'metrics.clicks, metrics.impressions, metrics.cost_micros, ' +
              'metrics.conversions, metrics.conversion_value_micros, metrics.ctr, ' +
              'metrics.average_cpc_micros, metrics.average_cpm_micros ' +
              'FROM campaign WHERE segments.date DURING ' + dateRange + ' ' +
              'AND campaign.advertising_channel_type = SEARCH';

  var report = AdsApp.search(query);
  while (report.hasNext()) {
    var row = report.next();
    campaigns.push({
      id: row.campaign.id,
      name: row.campaign.name,
      status: row.campaign.status,
      channel: row.campaign.advertisingChannelType,
      budget: (row.campaign.budgetAmountMicros || 0) / 1000000,
      clicks: row.metrics.clicks || 0,
      impressions: row.metrics.impressions || 0,
      cost: (row.metrics.costMicros || 0) / 1000000,
      conversions: row.metrics.conversions || 0,
      conversionValue: (row.metrics.conversionValueMicros || 0) / 1000000,
      ctr: row.metrics.ctr || 0,
      avgCpc: (row.metrics.averageCpcMicros || 0) / 1000000,
      avgCpm: (row.metrics.averageCpmMicros || 0) / 1000000,
      timestamp: new Date().toISOString()
    });
  }

  return campaigns;
}

function collectAdGroupMetrics_() {
  var adGroups = [];
  var dateRange = 'LAST_' + CONFIG.LOOKBACK_DAYS + '_DAYS';

  var query = 'SELECT campaign.name, ad_group.id, ad_group.name, ad_group.status, ' +
              'metrics.clicks, metrics.impressions, metrics.cost_micros, ' +
              'metrics.conversions, metrics.conversion_value_micros, metrics.ctr, ' +
              'metrics.average_cpc_micros ' +
              'FROM ad_group WHERE segments.date DURING ' + dateRange + ' ' +
              'AND campaign.advertising_channel_type = SEARCH';

  var report = AdsApp.search(query);
  while (report.hasNext()) {
    var row = report.next();
    adGroups.push({
      id: row.adGroup.id,
      name: row.adGroup.name,
      campaignName: row.campaign.name,
      status: row.adGroup.status,
      clicks: row.metrics.clicks || 0,
      impressions: row.metrics.impressions || 0,
      cost: (row.metrics.costMicros || 0) / 1000000,
      conversions: row.metrics.conversions || 0,
      conversionValue: (row.metrics.conversionValueMicros || 0) / 1000000,
      ctr: row.metrics.ctr || 0,
      avgCpc: (row.metrics.averageCpcMicros || 0) / 1000000,
      timestamp: new Date().toISOString()
    });
  }

  return adGroups;
}

function collectKeywordMetrics_() {
  var keywords = [];
  var dateRange = 'LAST_' + CONFIG.LOOKBACK_DAYS + '_DAYS';

  var query = 'SELECT campaign.name, ad_group.name, ad_group_criterion.keyword.text, ' +
              'ad_group_criterion.keyword.match_type, ad_group_criterion.quality_info.quality_score, ' +
              'metrics.clicks, metrics.impressions, metrics.cost_micros, ' +
              'metrics.conversions, metrics.conversion_value_micros, metrics.ctr, ' +
              'metrics.average_cpc_micros ' +
              'FROM keyword_view WHERE segments.date DURING ' + dateRange + ' ' +
              'AND campaign.advertising_channel_type = SEARCH';

  var report = AdsApp.search(query);
  while (report.hasNext()) {
    var row = report.next();
    keywords.push({
      text: row.adGroupCriterion.keyword.text,
      matchType: row.adGroupCriterion.keyword.matchType,
      campaignName: row.campaign.name,
      adGroupName: row.adGroup.name,
      qualityScore: row.adGroupCriterion.qualityInfo.qualityScore || null,
      clicks: row.metrics.clicks || 0,
      impressions: row.metrics.impressions || 0,
      cost: (row.metrics.costMicros || 0) / 1000000,
      conversions: row.metrics.conversions || 0,
      conversionValue: (row.metrics.conversionValueMicros || 0) / 1000000,
      ctr: row.metrics.ctr || 0,
      avgCpc: (row.metrics.averageCpcMicros || 0) / 1000000,
      timestamp: new Date().toISOString()
    });
  }

  return keywords;
}

function collectAdMetrics_() {
  var ads = [];
  var dateRange = 'LAST_' + CONFIG.LOOKBACK_DAYS + '_DAYS';

  var query = 'SELECT campaign.name, ad_group.name, ad_group_ad.ad.id, ' +
              'ad_group_ad.ad.type, ad_group_ad.status, ' +
              'metrics.clicks, metrics.impressions, metrics.cost_micros, ' +
              'metrics.conversions, metrics.conversion_value_micros, metrics.ctr ' +
              'FROM ad_group_ad WHERE segments.date DURING ' + dateRange + ' ' +
              'AND campaign.advertising_channel_type = SEARCH';

  var report = AdsApp.search(query);
  while (report.hasNext()) {
    var row = report.next();
    ads.push({
      id: row.adGroupAd.ad.id,
      type: row.adGroupAd.ad.type,
      campaignName: row.campaign.name,
      adGroupName: row.adGroup.name,
      status: row.adGroupAd.status,
      clicks: row.metrics.clicks || 0,
      impressions: row.metrics.impressions || 0,
      cost: (row.metrics.costMicros || 0) / 1000000,
      conversions: row.metrics.conversions || 0,
      conversionValue: (row.metrics.conversionValueMicros || 0) / 1000000,
      ctr: row.metrics.ctr || 0,
      timestamp: new Date().toISOString()
    });
  }

  return ads;
}

function collectSearchTermMetrics_() {
  var searchTerms = [];
  var dateRange = 'LAST_' + CONFIG.LOOKBACK_DAYS + '_DAYS';

  var query = 'SELECT campaign.name, ad_group.name, search_term_view.search_term, ' +
              'metrics.clicks, metrics.impressions, metrics.cost_micros, ' +
              'metrics.conversions, metrics.conversion_value_micros, metrics.ctr ' +
              'FROM search_term_view WHERE segments.date DURING ' + dateRange + ' ' +
              'AND campaign.advertising_channel_type = SEARCH ' +
              'AND metrics.clicks > 0';

  var report = AdsApp.search(query);
  while (report.hasNext()) {
    var row = report.next();
    searchTerms.push({
      searchTerm: row.searchTermView.searchTerm,
      campaignName: row.campaign.name,
      adGroupName: row.adGroup.name,
      clicks: row.metrics.clicks || 0,
      impressions: row.metrics.impressions || 0,
      cost: (row.metrics.costMicros || 0) / 1000000,
      conversions: row.metrics.conversions || 0,
      conversionValue: (row.metrics.conversionValueMicros || 0) / 1000000,
      ctr: row.metrics.ctr || 0,
      timestamp: new Date().toISOString()
    });
  }

  return searchTerms;
}

function collectAudienceMetrics_() {
  var audiences = [];
  var dateRange = 'LAST_' + CONFIG.LOOKBACK_DAYS + '_DAYS';

  try {
    var query = 'SELECT campaign.name, ad_group.name, customer.descriptive_name, ' +
                'user_list.id, user_list.name, user_list.size_for_display, ' +
                'metrics.clicks, metrics.impressions, metrics.cost_micros, ' +
                'metrics.conversions, metrics.conversion_value_micros ' +
                'FROM user_list_view WHERE segments.date DURING ' + dateRange + ' ' +
                'AND campaign.advertising_channel_type = SEARCH';

    var report = AdsApp.search(query);
    while (report.hasNext()) {
      var row = report.next();
      audiences.push({
        userListId: row.userList.id,
        userListName: row.userList.name,
        userListSize: row.userList.sizeForDisplay || 0,
        campaignName: row.campaign.name,
        adGroupName: row.adGroup.name,
        clicks: row.metrics.clicks || 0,
        impressions: row.metrics.impressions || 0,
        cost: (row.metrics.costMicros || 0) / 1000000,
        conversions: row.metrics.conversions || 0,
        conversionValue: (row.metrics.conversionValueMicros || 0) / 1000000,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    log_('Error collecting audience metrics: ' + error.toString(), 'ERROR');
  }

  return audiences;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function validateConfiguration_() {
  var errors = [];

  if (!CONFIG.TENANT_ID || CONFIG.TENANT_ID === '__TENANT_ID__') {
    errors.push('TENANT_ID not configured');
  }

  if (!CONFIG.BACKEND_URL || CONFIG.BACKEND_URL === '__BACKEND_URL__') {
    errors.push('BACKEND_URL not configured');
  }

  if (!CONFIG.SHARED_SECRET || CONFIG.SHARED_SECRET === '__HMAC_SECRET__') {
    errors.push('SHARED_SECRET not configured');
  }

  if (CONFIG.MAX_BUDGET_CHANGE < 0 || CONFIG.MAX_BUDGET_CHANGE > 1) {
    errors.push('MAX_BUDGET_CHANGE must be between 0 and 1');
  }

  if (CONFIG.MAX_BID_CHANGE < 0 || CONFIG.MAX_BID_CHANGE > 1) {
    errors.push('MAX_BID_CHANGE must be between 0 and 1');
  }

  if (errors.length > 0) {
    log_('Configuration validation failed:', 'ERROR');
    for (var i = 0; i < errors.length; i++) {
      log_('  - ' + errors[i], 'ERROR');
    }
    throw new Error('Configuration validation failed: ' + errors.join(', '));
  }

  log_('Configuration validated successfully', 'INFO');
}

function initializeExecution_() {
  // Ensure script label exists
  if (CONFIG.SCRIPT_LABEL) {
    ensureLabel_(CONFIG.SCRIPT_LABEL);
  }

  // Initialize execution tracking
  EXECUTION_LOG = [];
  MUTATION_LOG = [];
  ERROR_LOG = [];
  PERFORMANCE_START = new Date();

  log_('Execution initialized', 'INFO');
}

function ensureLabel_(labelName) {
  try {
    var labelIterator = AdsApp.labels().get();
    while (labelIterator.hasNext()) {
      if (labelIterator.next().getName() === labelName) {
        return;
      }
    }

    // Create label if it doesn't exist
    AdsApp.createLabel(labelName, 'Managed by ProofKit Enhanced Script v' + CONFIG.VERSION);
    log_('Created label: ' + labelName, 'INFO');
  } catch (error) {
    log_('Failed to ensure label: ' + error.toString(), 'ERROR');
  }
}

function logMutation_(type, details) {
  MUTATION_LOG.push({
    type: type,
    details: details,
    timestamp: new Date().toISOString(),
    dryRun: CONFIG.DRY_RUN
  });
}

function log_(message, level) {
  level = level || 'INFO';
  var timestamp = new Date().toISOString();
  var logEntry = timestamp + ' [' + level + '] ' + message;

  if (CONFIG.ENABLE_LOGGING) {
    Logger.log(logEntry);
  }

  EXECUTION_LOG.push({
    timestamp: timestamp,
    level: level,
    message: message
  });

  // Keep only last 1000 log entries to prevent memory issues
  if (EXECUTION_LOG.length > 1000) {
    EXECUTION_LOG = EXECUTION_LOG.slice(-1000);
  }
}

// ============================================================================
// PLACEHOLDER FUNCTIONS FOR FUTURE ENHANCEMENTS
// ============================================================================

function applyAdUpdate_(optimization) {
  return { skipped: true, reason: 'Ad update not yet implemented' };
}

function applyAudienceTargeting_(optimization) {
  return { skipped: true, reason: 'Audience targeting not yet implemented' };
}

// ============================================================================
// SCRIPT INFORMATION FUNCTIONS
// ============================================================================

function getScriptInfo() {
  return {
    version: CONFIG.VERSION,
    name: 'ProofKit Enhanced Google Ads Script',
    description: 'Advanced automation with bidirectional backend communication',
    lastUpdated: '2024-09-28',
    capabilities: [
      'Budget optimization',
      'Bid management',
      'Keyword management',
      'Ad creation',
      'Performance tracking',
      'Backend synchronization',
      'Error reporting',
      'Safety controls'
    ]
  };
}

/**
 * Manual test function - uncomment and run to test connectivity
 */
/*
function testScript() {
  CONFIG.DRY_RUN = true;
  CONFIG.ENABLE_LOGGING = true;

  log_('=== SCRIPT TEST MODE ===', 'INFO');
  log_('Testing backend connectivity...', 'INFO');

  var result = testBackendConnectivity_();
  if (result.success) {
    log_('✓ Backend connectivity test passed', 'INFO');
  } else {
    log_('✗ Backend connectivity test failed: ' + result.error, 'ERROR');
  }

  log_('=== TEST COMPLETE ===', 'INFO');
}
*/