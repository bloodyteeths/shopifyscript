/**
 * Backend Synchronization Module for Ads Autopilot AI Enhanced Script
 *
 * This module handles all communication with the Ads Autopilot AI backend,
 * including authentication, data transfer, and error handling.
 *
 * Features:
 * - HMAC-based authentication
 * - Exponential backoff retry logic
 * - Data chunking for large payloads
 * - Comprehensive error handling
 * - Connection health monitoring
 */

// ============================================================================
// BACKEND COMMUNICATION CORE
// ============================================================================

/**
 * Main backend synchronization function
 * Orchestrates the entire sync process with the Ads Autopilot AI backend
 */
function syncWithBackend(config) {
  var syncResult = {
    success: false,
    optimizations: [],
    metricsSent: false,
    errors: [],
    duration: 0
  };

  var startTime = new Date().getTime();

  try {
    log_('Starting backend synchronization...', 'INFO');

    // Step 1: Health check
    var healthCheck = performHealthCheck(config);
    if (!healthCheck.success) {
      syncResult.errors.push('Health check failed: ' + healthCheck.error);
      return syncResult;
    }

    // Step 2: Fetch optimizations
    var optimizationResult = fetchOptimizationsFromBackend(config);
    if (optimizationResult.success) {
      syncResult.optimizations = optimizationResult.data;
      log_('Fetched ' + syncResult.optimizations.length + ' optimizations', 'INFO');
    } else {
      syncResult.errors.push('Failed to fetch optimizations: ' + optimizationResult.error);
    }

    // Step 3: Send metrics (regardless of optimization fetch success)
    var metricsResult = sendMetricsToBackend(config);
    if (metricsResult.success) {
      syncResult.metricsSent = true;
      log_('Successfully sent metrics to backend', 'INFO');
    } else {
      syncResult.errors.push('Failed to send metrics: ' + metricsResult.error);
    }

    // Overall success if at least one operation succeeded
    syncResult.success = (optimizationResult.success || metricsResult.success);

  } catch (error) {
    log_('Critical error in backend sync: ' + error.toString(), 'ERROR');
    syncResult.errors.push('Critical sync error: ' + error.toString());
  }

  syncResult.duration = new Date().getTime() - startTime;
  log_('Backend sync completed in ' + syncResult.duration + 'ms', 'INFO');

  return syncResult;
}

/**
 * Performs a health check with the backend
 */
function performHealthCheck(config) {
  try {
    var endpoint = '/api/ads/health';
    var payload = 'GET:' + config.TENANT_ID + ':health:' + new Date().getTime();
    var signature = generateHMACSignature(payload, config.SHARED_SECRET);

    var url = buildBackendUrl(config.BACKEND_URL, endpoint, {
      tenant: config.TENANT_ID,
      sig: signature
    });

    var response = makeSecureHttpRequest(url, 'GET', null, config);

    if (response.success) {
      try {
        var data = JSON.parse(response.data);
        return {
          success: true,
          data: data,
          backendVersion: data.version || 'unknown',
          timestamp: data.timestamp || new Date().toISOString()
        };
      } catch (parseError) {
        return { success: false, error: 'Invalid health check response format' };
      }
    } else {
      return { success: false, error: response.error };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Fetches optimization instructions from the backend
 */
function fetchOptimizationsFromBackend(config) {
  try {
    var endpoint = '/api/ads/optimizations';
    var nonce = new Date().getTime().toString();
    var payload = 'GET:' + config.TENANT_ID + ':optimizations:' + nonce;
    var signature = generateHMACSignature(payload, config.SHARED_SECRET);

    var url = buildBackendUrl(config.BACKEND_URL, endpoint, {
      tenant: config.TENANT_ID,
      sig: signature,
      nonce: nonce,
      version: config.VERSION || '2.0.0'
    });

    var response = makeSecureHttpRequest(url, 'GET', null, config);

    if (response.success) {
      try {
        var data = JSON.parse(response.data);
        var optimizations = data.optimizations || [];

        // Validate optimizations
        var validOptimizations = [];
        for (var i = 0; i < optimizations.length; i++) {
          if (validateOptimization(optimizations[i])) {
            validOptimizations.push(optimizations[i]);
          } else {
            log_('Invalid optimization skipped: ' + JSON.stringify(optimizations[i]), 'WARN');
          }
        }

        return {
          success: true,
          data: validOptimizations,
          totalCount: optimizations.length,
          validCount: validOptimizations.length
        };
      } catch (parseError) {
        return { success: false, error: 'Failed to parse optimizations response: ' + parseError };
      }
    } else {
      return { success: false, error: response.error };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Sends performance metrics to the backend
 */
function sendMetricsToBackend(config, metrics) {
  try {
    if (!metrics) {
      // Collect metrics if not provided
      metrics = collectAllPerformanceMetrics(config);
    }

    var endpoint = '/api/ads/metrics';
    var nonce = new Date().getTime().toString();
    var payload = 'POST:' + config.TENANT_ID + ':metrics:' + nonce;
    var signature = generateHMACSignature(payload, config.SHARED_SECRET);

    var url = buildBackendUrl(config.BACKEND_URL, endpoint, {
      tenant: config.TENANT_ID,
      sig: signature
    });

    var requestData = {
      nonce: nonce,
      timestamp: new Date().toISOString(),
      version: config.VERSION || '2.0.0',
      runId: config.RUN_ID || generateRunId(),
      metrics: metrics,
      executionContext: getExecutionContext(config)
    };

    // Send data in chunks if it's large
    return sendLargeDataset(url, requestData, config);

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Sends execution logs to the backend for monitoring
 */
function sendExecutionLogs(config, logs, errors) {
  try {
    var endpoint = '/api/ads/logs';
    var nonce = new Date().getTime().toString();
    var payload = 'POST:' + config.TENANT_ID + ':logs:' + nonce;
    var signature = generateHMACSignature(payload, config.SHARED_SECRET);

    var url = buildBackendUrl(config.BACKEND_URL, endpoint, {
      tenant: config.TENANT_ID,
      sig: signature
    });

    var requestData = {
      nonce: nonce,
      timestamp: new Date().toISOString(),
      version: config.VERSION || '2.0.0',
      runId: config.RUN_ID || generateRunId(),
      logs: logs || [],
      errors: errors || [],
      scriptInfo: getScriptInfo(config)
    };

    var response = makeSecureHttpRequest(url, 'POST', JSON.stringify(requestData), config);
    return response;

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================================================
// HTTP REQUEST HANDLING
// ============================================================================

/**
 * Makes a secure HTTP request with retry logic and error handling
 */
function makeSecureHttpRequest(url, method, payload, config, retryCount) {
  retryCount = retryCount || 0;
  var maxRetries = config.MAX_RETRIES || 3;
  var retryDelay = config.RETRY_DELAY || 2000;

  var options = {
    method: method || 'GET',
    muteHttpExceptions: true,
    followRedirects: true,
    validateHttpsCertificates: true,
    headers: {
      'User-Agent': 'Ads Autopilot AI-Enhanced-Script/' + (config.VERSION || '2.0.0'),
      'Content-Type': 'application/json',
      'X-Script-Version': config.VERSION || '2.0.0',
      'X-Run-ID': config.RUN_ID || generateRunId()
    }
  };

  if (payload) {
    options.payload = payload;
  }

  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();

    // Check for successful response
    if (responseCode >= 200 && responseCode < 300) {
      return {
        success: true,
        data: responseText,
        code: responseCode,
        headers: response.getAllHeaders()
      };
    }

    // Handle specific error codes
    var errorMessage = 'HTTP ' + responseCode;
    if (responseText) {
      try {
        var errorData = JSON.parse(responseText);
        errorMessage += ': ' + (errorData.message || errorData.error || responseText);
      } catch (parseError) {
        errorMessage += ': ' + responseText.substring(0, 200);
      }
    }

    // Determine if we should retry
    var shouldRetry = shouldRetryRequest(responseCode, retryCount, maxRetries);
    if (shouldRetry) {
      log_('Request failed, retrying in ' + (retryDelay * (retryCount + 1)) + 'ms (attempt ' +
           (retryCount + 1) + '/' + maxRetries + ')', 'WARN');

      Utilities.sleep(retryDelay * (retryCount + 1)); // Exponential backoff
      return makeSecureHttpRequest(url, method, payload, config, retryCount + 1);
    }

    return { success: false, error: errorMessage, code: responseCode };

  } catch (error) {
    var errorMessage = 'Request exception: ' + error.toString();

    // Retry on network errors
    if (retryCount < maxRetries && isNetworkError(error)) {
      log_('Network error, retrying in ' + (retryDelay * (retryCount + 1)) + 'ms (attempt ' +
           (retryCount + 1) + '/' + maxRetries + '): ' + error.toString(), 'WARN');

      Utilities.sleep(retryDelay * (retryCount + 1));
      return makeSecureHttpRequest(url, method, payload, config, retryCount + 1);
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Determines if a request should be retried based on the response code
 */
function shouldRetryRequest(responseCode, retryCount, maxRetries) {
  if (retryCount >= maxRetries) {
    return false;
  }

  // Retry on server errors and rate limiting
  var retryableCodes = [429, 500, 502, 503, 504, 520, 521, 522, 523, 524];
  return retryableCodes.indexOf(responseCode) !== -1;
}

/**
 * Determines if an error is a network-related error that should be retried
 */
function isNetworkError(error) {
  var errorString = error.toString().toLowerCase();
  var networkErrorPatterns = [
    'timeout',
    'connection',
    'network',
    'dns',
    'socket',
    'unreachable'
  ];

  for (var i = 0; i < networkErrorPatterns.length; i++) {
    if (errorString.indexOf(networkErrorPatterns[i]) !== -1) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// DATA CHUNKING AND LARGE TRANSFERS
// ============================================================================

/**
 * Sends large datasets in chunks to avoid payload size limits
 */
function sendLargeDataset(url, data, config) {
  try {
    var chunkSize = config.CHUNK_SIZE || 500;
    var campaigns = data.metrics.campaigns || [];
    var adGroups = data.metrics.adGroups || [];
    var keywords = data.metrics.keywords || [];
    var ads = data.metrics.ads || [];
    var searchTerms = data.metrics.searchTerms || [];

    // Calculate total chunks needed
    var totalChunks = Math.max(
      Math.ceil(campaigns.length / chunkSize),
      Math.ceil(adGroups.length / chunkSize),
      Math.ceil(keywords.length / chunkSize),
      Math.ceil(ads.length / chunkSize),
      Math.ceil(searchTerms.length / chunkSize),
      1
    );

    log_('Sending data in ' + totalChunks + ' chunks...', 'INFO');

    // Send each chunk
    for (var i = 0; i < totalChunks; i++) {
      var chunkData = {
        nonce: data.nonce,
        timestamp: data.timestamp,
        version: data.version,
        runId: data.runId,
        chunkIndex: i,
        totalChunks: totalChunks,
        metrics: {
          campaigns: campaigns.slice(i * chunkSize, (i + 1) * chunkSize),
          adGroups: adGroups.slice(i * chunkSize, (i + 1) * chunkSize),
          keywords: keywords.slice(i * chunkSize, (i + 1) * chunkSize),
          ads: ads.slice(i * chunkSize, (i + 1) * chunkSize),
          searchTerms: searchTerms.slice(i * chunkSize, (i + 1) * chunkSize)
        }
      };

      // Include execution context only in first chunk
      if (i === 0) {
        chunkData.executionContext = data.executionContext;
      }

      var chunkPayload = JSON.stringify(chunkData);
      var response = makeSecureHttpRequest(url, 'POST', chunkPayload, config);

      if (!response.success) {
        log_('Failed to send chunk ' + (i + 1) + '/' + totalChunks + ': ' + response.error, 'ERROR');
        return {
          success: false,
          error: 'Chunk transfer failed at ' + (i + 1) + '/' + totalChunks + ': ' + response.error,
          chunksCompleted: i
        };
      }

      log_('Sent chunk ' + (i + 1) + '/' + totalChunks + ' successfully', 'INFO');

      // Small delay between chunks to avoid rate limiting
      if (i < totalChunks - 1) {
        Utilities.sleep(100);
      }
    }

    return {
      success: true,
      chunksCompleted: totalChunks,
      totalDataPoints: campaigns.length + adGroups.length + keywords.length + ads.length + searchTerms.length
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================================================
// AUTHENTICATION AND SECURITY
// ============================================================================

/**
 * Generates HMAC signature for authentication
 */
function generateHMACSignature(payload, secret) {
  try {
    if (!payload || !secret) {
      throw new Error('Payload and secret are required for HMAC generation');
    }

    var signature = Utilities.computeHmacSha256Signature(payload, secret);
    return Utilities.base64Encode(signature).replace(/=+$/, '');
  } catch (error) {
    log_('HMAC generation failed: ' + error.toString(), 'ERROR');
    throw error;
  }
}

/**
 * Validates the structure of an optimization object
 */
function validateOptimization(optimization) {
  if (!optimization) return false;
  if (!optimization.type) return false;
  if (!optimization.target) return false;
  if (!optimization.parameters) return false;

  // Validate target structure
  var target = optimization.target;
  if (typeof target !== 'object') return false;

  // Type-specific validation
  var type = optimization.type.toUpperCase();
  switch (type) {
    case 'BUDGET_ADJUSTMENT':
      return !!(target.campaign && optimization.parameters.budget);
    case 'BID_MODIFICATION':
      return !!(target.campaign && target.adGroup && target.keyword && optimization.parameters.bid);
    case 'KEYWORD_ADDITION':
      return !!(target.campaign && target.adGroup && optimization.parameters.keyword);
    case 'KEYWORD_NEGATION':
      return !!(optimization.parameters.keyword);
    case 'AD_CREATION':
      return !!(target.campaign && target.adGroup && optimization.parameters.type);
    case 'CAMPAIGN_PAUSE':
    case 'CAMPAIGN_ENABLE':
      return !!(target.campaign);
    default:
      return false;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Builds a complete backend URL with query parameters
 */
function buildBackendUrl(baseUrl, endpoint, params) {
  var url = baseUrl.replace(/\/$/, '') + endpoint;

  if (params && Object.keys(params).length > 0) {
    var queryString = [];
    for (var key in params) {
      if (params.hasOwnProperty(key) && params[key] !== null && params[key] !== undefined) {
        queryString.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
      }
    }
    if (queryString.length > 0) {
      url += '?' + queryString.join('&');
    }
  }

  return url;
}

/**
 * Generates a unique run ID for tracking
 */
function generateRunId() {
  return 'RUN_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Gets execution context information
 */
function getExecutionContext(config) {
  return {
    timestamp: new Date().toISOString(),
    timeZone: Session.getScriptTimeZone(),
    version: config.VERSION || '2.0.0',
    dryRun: config.DRY_RUN || false,
    account: {
      customerId: AdsApp.currentAccount().getCustomerId(),
      name: AdsApp.currentAccount().getName(),
      timeZone: AdsApp.currentAccount().getTimeZone(),
      currency: AdsApp.currentAccount().getCurrencyCode()
    }
  };
}

/**
 * Gets basic script information
 */
function getScriptInfo(config) {
  return {
    name: 'Ads Autopilot AI Enhanced Google Ads Script',
    version: config.VERSION || '2.0.0',
    modules: [
      'backend-sync',
      'optimization-applier',
      'result-collector'
    ],
    capabilities: [
      'HMAC Authentication',
      'Chunked Data Transfer',
      'Retry Logic',
      'Error Handling',
      'Health Monitoring'
    ]
  };
}

/**
 * Collects comprehensive performance metrics
 * (This would typically call functions from result-collector.gs)
 */
function collectAllPerformanceMetrics(config) {
  // This is a placeholder - actual implementation would be in result-collector.gs
  return {
    campaigns: [],
    adGroups: [],
    keywords: [],
    ads: [],
    searchTerms: [],
    audiences: []
  };
}

// ============================================================================
// ERROR REPORTING
// ============================================================================

/**
 * Sends detailed error reports to the backend
 */
function sendErrorReport(config, error, context) {
  try {
    var endpoint = '/api/ads/error';
    var nonce = new Date().getTime().toString();
    var payload = 'POST:' + config.TENANT_ID + ':error:' + nonce;
    var signature = generateHMACSignature(payload, config.SHARED_SECRET);

    var url = buildBackendUrl(config.BACKEND_URL, endpoint, {
      tenant: config.TENANT_ID,
      sig: signature
    });

    var errorReport = {
      nonce: nonce,
      timestamp: new Date().toISOString(),
      version: config.VERSION || '2.0.0',
      runId: config.RUN_ID || generateRunId(),
      error: {
        message: error.message || error.toString(),
        stack: error.stack || 'No stack trace available',
        type: error.name || 'UnknownError'
      },
      context: context || {},
      scriptInfo: getScriptInfo(config),
      accountInfo: getExecutionContext(config).account
    };

    var response = makeSecureHttpRequest(url, 'POST', JSON.stringify(errorReport), config);
    return response;

  } catch (sendError) {
    log_('Failed to send error report: ' + sendError.toString(), 'ERROR');
    return { success: false, error: sendError.toString() };
  }
}

// ============================================================================
// LOGGING SUPPORT
// ============================================================================

/**
 * Logs a message (requires log_ function to be defined in main script)
 */
function log_(message, level) {
  // This function should be defined in the main script
  if (typeof Logger !== 'undefined') {
    Logger.log(new Date().toISOString() + ' [' + (level || 'INFO') + '] ' + message);
  }
}