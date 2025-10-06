/**
 * Optimization Applier Module for Ads Autopilot AI Enhanced Script
 *
 * This module safely applies optimization instructions from the backend
 * with comprehensive validation, safety checks, and rollback capabilities.
 *
 * Features:
 * - Safe optimization application with validation
 * - Rollback capabilities for failed operations
 * - Comprehensive safety checks and limits
 * - Detailed logging and mutation tracking
 * - Support for all major optimization types
 */

// ============================================================================
// OPTIMIZATION APPLICATION CORE
// ============================================================================

/**
 * Main optimization application orchestrator
 */
function applyOptimizationsSafely(optimizations, config) {
  var results = {
    total: optimizations.length,
    successful: 0,
    failed: 0,
    skipped: 0,
    rollbacks: 0,
    details: [],
    errors: [],
    duration: 0
  };

  var startTime = new Date().getTime();
  log_('Starting optimization application for ' + optimizations.length + ' optimizations', 'INFO');

  // Pre-application validation
  var validationResult = validateOptimizationsBatch(optimizations, config);
  if (!validationResult.success) {
    results.errors.push('Batch validation failed: ' + validationResult.error);
    return results;
  }

  // Apply optimizations with safety checks
  for (var i = 0; i < optimizations.length; i++) {
    var optimization = optimizations[i];
    var optimizationId = 'OPT_' + (i + 1) + '_' + new Date().getTime();

    try {
      log_('Applying optimization ' + (i + 1) + '/' + optimizations.length + ': ' + optimization.type, 'INFO');

      var result = applyOptimizationSafely(optimization, config, optimizationId);

      if (result.success) {
        results.successful++;
        results.details.push({
          id: optimizationId,
          type: optimization.type,
          status: 'SUCCESS',
          details: result.details,
          rollbackInfo: result.rollbackInfo
        });
      } else if (result.skipped) {
        results.skipped++;
        results.details.push({
          id: optimizationId,
          type: optimization.type,
          status: 'SKIPPED',
          reason: result.reason
        });
      } else {
        results.failed++;
        results.errors.push({
          id: optimizationId,
          type: optimization.type,
          error: result.error,
          rollbackAttempted: result.rollbackAttempted
        });

        if (result.rollbackAttempted) {
          results.rollbacks++;
        }
      }

    } catch (error) {
      results.failed++;
      results.errors.push({
        id: optimizationId,
        type: optimization.type,
        error: 'Exception: ' + error.toString(),
        rollbackAttempted: false
      });

      log_('Exception applying optimization: ' + error.toString(), 'ERROR');
    }

    // Progress logging every 10 optimizations
    if ((i + 1) % 10 === 0 || i === optimizations.length - 1) {
      log_('Progress: ' + (i + 1) + '/' + optimizations.length + ' optimizations processed', 'INFO');
    }
  }

  results.duration = new Date().getTime() - startTime;
  log_('Optimization application completed in ' + results.duration + 'ms', 'INFO');
  log_('Results: ' + results.successful + ' successful, ' + results.failed + ' failed, ' +
       results.skipped + ' skipped, ' + results.rollbacks + ' rollbacks', 'INFO');

  return results;
}

/**
 * Safely applies a single optimization with validation and rollback support
 */
function applyOptimizationSafely(optimization, config, optimizationId) {
  // Pre-application validation
  var validation = validateSingleOptimization(optimization, config);
  if (!validation.valid) {
    return { success: false, skipped: true, reason: validation.reason };
  }

  // Safety check
  if (shouldSkipOptimizationForSafety(optimization, config)) {
    return { success: false, skipped: true, reason: 'Skipped for safety reasons' };
  }

  // Get current state for rollback
  var rollbackInfo = captureRollbackState(optimization, config);

  try {
    // Apply the optimization based on type
    var result = applyOptimizationByType(optimization, config, rollbackInfo);

    if (result.success) {
      // Log successful mutation
      logOptimizationMutation(optimization, result, optimizationId, config);
      return {
        success: true,
        details: result.details,
        rollbackInfo: rollbackInfo
      };
    } else {
      // Attempt rollback if needed
      if (result.requiresRollback && rollbackInfo.captured) {
        var rollbackResult = performRollback(rollbackInfo, config);
        return {
          success: false,
          error: result.error,
          rollbackAttempted: true,
          rollbackSuccess: rollbackResult.success
        };
      } else {
        return {
          success: false,
          error: result.error,
          rollbackAttempted: false
        };
      }
    }

  } catch (error) {
    // Emergency rollback on exception
    if (rollbackInfo.captured) {
      var rollbackResult = performRollback(rollbackInfo, config);
      return {
        success: false,
        error: 'Exception: ' + error.toString(),
        rollbackAttempted: true,
        rollbackSuccess: rollbackResult.success
      };
    } else {
      return {
        success: false,
        error: 'Exception: ' + error.toString(),
        rollbackAttempted: false
      };
    }
  }
}

// ============================================================================
// OPTIMIZATION TYPE HANDLERS
// ============================================================================

/**
 * Routes optimization to appropriate handler based on type
 */
function applyOptimizationByType(optimization, config, rollbackInfo) {
  var type = optimization.type.toUpperCase();

  switch (type) {
    case 'BUDGET_ADJUSTMENT':
      return applyBudgetAdjustmentSafely(optimization, config, rollbackInfo);
    case 'BID_MODIFICATION':
      return applyBidModificationSafely(optimization, config, rollbackInfo);
    case 'KEYWORD_ADDITION':
      return applyKeywordAdditionSafely(optimization, config, rollbackInfo);
    case 'KEYWORD_NEGATION':
      return applyKeywordNegationSafely(optimization, config, rollbackInfo);
    case 'AD_CREATION':
      return applyAdCreationSafely(optimization, config, rollbackInfo);
    case 'AD_UPDATE':
      return applyAdUpdateSafely(optimization, config, rollbackInfo);
    case 'AUDIENCE_TARGETING':
      return applyAudienceTargetingSafely(optimization, config, rollbackInfo);
    case 'CAMPAIGN_STATUS_CHANGE':
      return applyCampaignStatusChangeSafely(optimization, config, rollbackInfo);
    case 'AD_GROUP_STATUS_CHANGE':
      return applyAdGroupStatusChangeSafely(optimization, config, rollbackInfo);
    case 'KEYWORD_STATUS_CHANGE':
      return applyKeywordStatusChangeSafely(optimization, config, rollbackInfo);
    default:
      return { success: false, error: 'Unknown optimization type: ' + type };
  }
}

/**
 * Safely applies budget adjustments with validation
 */
function applyBudgetAdjustmentSafely(optimization, config, rollbackInfo) {
  try {
    var campaignName = optimization.target.campaign;
    var newBudget = parseFloat(optimization.parameters.budget);
    var maxChangePercent = config.MAX_BUDGET_CHANGE || 0.5;

    // Find campaign
    var campaign = findCampaignByName(campaignName);
    if (!campaign) {
      return { success: false, error: 'Campaign not found: ' + campaignName };
    }

    var currentBudget = campaign.getBudget().getAmount();

    // Validate budget limits
    if (newBudget < (config.MIN_CAMPAIGN_BUDGET || 1.0)) {
      return { success: false, error: 'Budget below minimum: $' + newBudget };
    }

    if (newBudget > (config.MAX_CAMPAIGN_BUDGET || 1000.0)) {
      return { success: false, error: 'Budget above maximum: $' + newBudget };
    }

    // Check for excessive change
    var changePercent = Math.abs(newBudget - currentBudget) / currentBudget;
    if (changePercent > maxChangePercent) {
      return { success: false, error: 'Budget change too large: ' + (changePercent * 100).toFixed(1) + '%' };
    }

    // Apply budget change
    if (!config.DRY_RUN) {
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
    return { success: false, error: error.toString(), requiresRollback: true };
  }
}

/**
 * Safely applies bid modifications with validation
 */
function applyBidModificationSafely(optimization, config, rollbackInfo) {
  try {
    var campaignName = optimization.target.campaign;
    var adGroupName = optimization.target.adGroup;
    var keywordText = optimization.target.keyword;
    var newBid = parseFloat(optimization.parameters.bid);
    var maxChangePercent = config.MAX_BID_CHANGE || 0.3;

    // Find keyword
    var keyword = findKeyword(campaignName, adGroupName, keywordText);
    if (!keyword) {
      return { success: false, error: 'Keyword not found: ' + keywordText };
    }

    var currentBid = keyword.bidding().getCpc();

    // Validate bid
    if (newBid <= 0 || newBid > 100) {
      return { success: false, error: 'Invalid bid amount: $' + newBid };
    }

    // Check for excessive change
    if (currentBid > 0) {
      var changePercent = Math.abs(newBid - currentBid) / currentBid;
      if (changePercent > maxChangePercent) {
        return { success: false, error: 'Bid change too large: ' + (changePercent * 100).toFixed(1) + '%' };
      }
    }

    // Apply bid change
    if (!config.DRY_RUN) {
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
        newBid: newBid,
        changePercent: currentBid > 0 ? ((newBid - currentBid) / currentBid * 100).toFixed(1) : 'N/A'
      }
    };

  } catch (error) {
    return { success: false, error: error.toString(), requiresRollback: true };
  }
}

/**
 * Safely adds keywords with validation
 */
function applyKeywordAdditionSafely(optimization, config, rollbackInfo) {
  try {
    var campaignName = optimization.target.campaign;
    var adGroupName = optimization.target.adGroup;
    var keywordText = optimization.parameters.keyword;
    var matchType = optimization.parameters.matchType || 'BROAD_MATCH';
    var bid = optimization.parameters.bid ? parseFloat(optimization.parameters.bid) : null;

    // Find ad group
    var adGroup = findAdGroup(campaignName, adGroupName);
    if (!adGroup) {
      return { success: false, error: 'Ad group not found: ' + adGroupName };
    }

    // Check if keyword already exists
    var existingKeyword = findKeyword(campaignName, adGroupName, keywordText);
    if (existingKeyword) {
      return { success: false, error: 'Keyword already exists: ' + keywordText };
    }

    // Validate keyword text
    if (!keywordText || keywordText.length > 80) {
      return { success: false, error: 'Invalid keyword text: ' + keywordText };
    }

    // Apply keyword addition
    if (!config.DRY_RUN) {
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

      // Apply label if configured
      if (config.SCRIPT_LABEL) {
        try {
          operation.getResult().applyLabel(config.SCRIPT_LABEL);
        } catch (labelError) {
          // Label application is not critical
        }
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
    return { success: false, error: error.toString(), requiresRollback: true };
  }
}

/**
 * Safely applies keyword negation with validation
 */
function applyKeywordNegationSafely(optimization, config, rollbackInfo) {
  try {
    var campaignName = optimization.target.campaign;
    var adGroupName = optimization.target.adGroup;
    var keywordText = optimization.parameters.keyword;
    var level = optimization.parameters.level || 'AD_GROUP';
    var matchType = optimization.parameters.matchType || 'EXACT';

    // Check exclusion list
    if (isKeywordExcluded(keywordText, config)) {
      return { success: false, error: 'Keyword in exclusion list: ' + keywordText };
    }

    // Format keyword based on match type
    var formattedKeyword = formatNegativeKeyword(keywordText, matchType);

    if (level === 'CAMPAIGN') {
      var campaign = findCampaignByName(campaignName);
      if (!campaign) {
        return { success: false, error: 'Campaign not found: ' + campaignName };
      }

      // Check if negative already exists
      if (campaignHasNegativeKeyword(campaign, formattedKeyword)) {
        return { success: false, error: 'Negative keyword already exists: ' + formattedKeyword };
      }

      if (!config.DRY_RUN) {
        campaign.createNegativeKeyword(formattedKeyword);
      }

      log_('Campaign negative keyword added: ' + formattedKeyword + ' to ' + campaignName, 'INFO');
    } else {
      var adGroup = findAdGroup(campaignName, adGroupName);
      if (!adGroup) {
        return { success: false, error: 'Ad group not found: ' + adGroupName };
      }

      // Check if negative already exists
      if (adGroupHasNegativeKeyword(adGroup, formattedKeyword)) {
        return { success: false, error: 'Negative keyword already exists: ' + formattedKeyword };
      }

      if (!config.DRY_RUN) {
        adGroup.createNegativeKeyword(formattedKeyword);
      }

      log_('Ad group negative keyword added: ' + formattedKeyword + ' to ' + adGroupName, 'INFO');
    }

    return {
      success: true,
      details: {
        keyword: keywordText,
        formattedKeyword: formattedKeyword,
        level: level,
        campaign: campaignName,
        adGroup: adGroupName,
        matchType: matchType
      }
    };

  } catch (error) {
    return { success: false, error: error.toString(), requiresRollback: false };
  }
}

/**
 * Safely creates ads with validation
 */
function applyAdCreationSafely(optimization, config, rollbackInfo) {
  try {
    var campaignName = optimization.target.campaign;
    var adGroupName = optimization.target.adGroup;
    var adData = optimization.parameters;

    var adGroup = findAdGroup(campaignName, adGroupName);
    if (!adGroup) {
      return { success: false, error: 'Ad group not found: ' + adGroupName };
    }

    // Check ad limits
    var currentAdCount = countAdsInAdGroup(adGroup);
    var maxAdsPerAdGroup = config.MAX_ADS_PER_AD_GROUP || 50;
    if (currentAdCount >= maxAdsPerAdGroup) {
      return { success: false, error: 'Ad group has reached maximum ad limit: ' + maxAdsPerAdGroup };
    }

    if (!config.DRY_RUN) {
      var result = createAdByType(adGroup, adData, config);
      if (!result.success) {
        return { success: false, error: result.error, requiresRollback: false };
      }
    }

    log_('Ad created in ' + adGroupName + ' (' + adData.type + ')', 'INFO');

    return {
      success: true,
      details: {
        adType: adData.type,
        campaign: campaignName,
        adGroup: adGroupName,
        adId: config.DRY_RUN ? 'DRY_RUN' : result.adId
      }
    };

  } catch (error) {
    return { success: false, error: error.toString(), requiresRollback: true };
  }
}

// ============================================================================
// ROLLBACK SYSTEM
// ============================================================================

/**
 * Captures current state for potential rollback
 */
function captureRollbackState(optimization, config) {
  var rollbackInfo = {
    captured: false,
    type: optimization.type,
    target: optimization.target,
    originalState: null
  };

  try {
    switch (optimization.type.toUpperCase()) {
      case 'BUDGET_ADJUSTMENT':
        var campaign = findCampaignByName(optimization.target.campaign);
        if (campaign) {
          rollbackInfo.originalState = {
            budget: campaign.getBudget().getAmount()
          };
          rollbackInfo.captured = true;
        }
        break;

      case 'BID_MODIFICATION':
        var keyword = findKeyword(
          optimization.target.campaign,
          optimization.target.adGroup,
          optimization.target.keyword
        );
        if (keyword) {
          rollbackInfo.originalState = {
            bid: keyword.bidding().getCpc()
          };
          rollbackInfo.captured = true;
        }
        break;

      // Other optimization types would have their state captured here
      default:
        rollbackInfo.captured = false;
        break;
    }
  } catch (error) {
    log_('Failed to capture rollback state: ' + error.toString(), 'WARN');
    rollbackInfo.captured = false;
  }

  return rollbackInfo;
}

/**
 * Performs rollback to previous state
 */
function performRollback(rollbackInfo, config) {
  if (!rollbackInfo.captured || !rollbackInfo.originalState) {
    return { success: false, error: 'No rollback state available' };
  }

  try {
    switch (rollbackInfo.type.toUpperCase()) {
      case 'BUDGET_ADJUSTMENT':
        var campaign = findCampaignByName(rollbackInfo.target.campaign);
        if (campaign && rollbackInfo.originalState.budget) {
          if (!config.DRY_RUN) {
            campaign.getBudget().setAmount(rollbackInfo.originalState.budget);
          }
          log_('Rolled back budget for ' + rollbackInfo.target.campaign + ' to $' +
               rollbackInfo.originalState.budget.toFixed(2), 'INFO');
          return { success: true };
        }
        break;

      case 'BID_MODIFICATION':
        var keyword = findKeyword(
          rollbackInfo.target.campaign,
          rollbackInfo.target.adGroup,
          rollbackInfo.target.keyword
        );
        if (keyword && rollbackInfo.originalState.bid) {
          if (!config.DRY_RUN) {
            keyword.bidding().setCpc(rollbackInfo.originalState.bid);
          }
          log_('Rolled back bid for ' + rollbackInfo.target.keyword + ' to $' +
               rollbackInfo.originalState.bid.toFixed(2), 'INFO');
          return { success: true };
        }
        break;

      default:
        return { success: false, error: 'Rollback not implemented for type: ' + rollbackInfo.type };
    }

    return { success: false, error: 'Rollback target not found' };

  } catch (error) {
    log_('Rollback failed: ' + error.toString(), 'ERROR');
    return { success: false, error: error.toString() };
  }
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates a batch of optimizations
 */
function validateOptimizationsBatch(optimizations, config) {
  if (!optimizations || optimizations.length === 0) {
    return { success: false, error: 'No optimizations provided' };
  }

  if (optimizations.length > (config.MAX_OPTIMIZATIONS_PER_RUN || 1000)) {
    return { success: false, error: 'Too many optimizations: ' + optimizations.length };
  }

  return { success: true };
}

/**
 * Validates a single optimization
 */
function validateSingleOptimization(optimization, config) {
  if (!optimization) {
    return { valid: false, reason: 'Optimization is null or undefined' };
  }

  if (!optimization.type) {
    return { valid: false, reason: 'Optimization type is missing' };
  }

  if (!optimization.target) {
    return { valid: false, reason: 'Optimization target is missing' };
  }

  if (!optimization.parameters) {
    return { valid: false, reason: 'Optimization parameters are missing' };
  }

  // Type-specific validation
  var typeValidation = validateOptimizationByType(optimization, config);
  if (!typeValidation.valid) {
    return typeValidation;
  }

  return { valid: true };
}

/**
 * Type-specific optimization validation
 */
function validateOptimizationByType(optimization, config) {
  var type = optimization.type.toUpperCase();
  var target = optimization.target;
  var params = optimization.parameters;

  switch (type) {
    case 'BUDGET_ADJUSTMENT':
      if (!target.campaign) return { valid: false, reason: 'Campaign name required for budget adjustment' };
      if (!params.budget || isNaN(parseFloat(params.budget))) return { valid: false, reason: 'Valid budget amount required' };
      break;

    case 'BID_MODIFICATION':
      if (!target.campaign) return { valid: false, reason: 'Campaign name required for bid modification' };
      if (!target.adGroup) return { valid: false, reason: 'Ad group name required for bid modification' };
      if (!target.keyword) return { valid: false, reason: 'Keyword required for bid modification' };
      if (!params.bid || isNaN(parseFloat(params.bid))) return { valid: false, reason: 'Valid bid amount required' };
      break;

    case 'KEYWORD_ADDITION':
      if (!target.campaign) return { valid: false, reason: 'Campaign name required for keyword addition' };
      if (!target.adGroup) return { valid: false, reason: 'Ad group name required for keyword addition' };
      if (!params.keyword) return { valid: false, reason: 'Keyword text required for keyword addition' };
      break;

    case 'KEYWORD_NEGATION':
      if (!params.keyword) return { valid: false, reason: 'Keyword text required for keyword negation' };
      break;

    case 'AD_CREATION':
      if (!target.campaign) return { valid: false, reason: 'Campaign name required for ad creation' };
      if (!target.adGroup) return { valid: false, reason: 'Ad group name required for ad creation' };
      if (!params.type) return { valid: false, reason: 'Ad type required for ad creation' };
      break;

    default:
      return { valid: false, reason: 'Unknown optimization type: ' + type };
  }

  return { valid: true };
}

/**
 * Safety check to determine if optimization should be skipped
 */
function shouldSkipOptimizationForSafety(optimization, config) {
  // Check campaign exclusions
  if (optimization.target && optimization.target.campaign) {
    var excludedCampaigns = config.EXCLUDED_CAMPAIGNS || [];
    if (excludedCampaigns.indexOf(optimization.target.campaign) !== -1) {
      return true;
    }
  }

  // Check keyword exclusions
  if (optimization.parameters && optimization.parameters.keyword) {
    if (isKeywordExcluded(optimization.parameters.keyword, config)) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Finds a campaign by name
 */
function findCampaignByName(campaignName) {
  var campaignIterator = AdsApp.campaigns()
    .withCondition('campaign.name = "' + campaignName.replace(/"/g, '\\"') + '"')
    .get();

  return campaignIterator.hasNext() ? campaignIterator.next() : null;
}

/**
 * Finds an ad group by campaign and ad group name
 */
function findAdGroup(campaignName, adGroupName) {
  var adGroupIterator = AdsApp.adGroups()
    .withCondition('campaign.name = "' + campaignName.replace(/"/g, '\\"') + '"')
    .withCondition('ad_group.name = "' + adGroupName.replace(/"/g, '\\"') + '"')
    .get();

  return adGroupIterator.hasNext() ? adGroupIterator.next() : null;
}

/**
 * Finds a keyword by campaign, ad group, and keyword text
 */
function findKeyword(campaignName, adGroupName, keywordText) {
  var keywordIterator = AdsApp.keywords()
    .withCondition('campaign.name = "' + campaignName.replace(/"/g, '\\"') + '"')
    .withCondition('ad_group.name = "' + adGroupName.replace(/"/g, '\\"') + '"')
    .withCondition('ad_group_criterion.keyword.text = "' + keywordText.replace(/"/g, '\\"') + '"')
    .get();

  return keywordIterator.hasNext() ? keywordIterator.next() : null;
}

/**
 * Checks if a keyword is in the exclusion list
 */
function isKeywordExcluded(keyword, config) {
  if (!keyword) return false;
  var excludedKeywords = config.EXCLUDED_KEYWORDS || [];
  var keywordLower = keyword.toLowerCase();

  for (var i = 0; i < excludedKeywords.length; i++) {
    if (keywordLower.indexOf(excludedKeywords[i].toLowerCase()) !== -1) {
      return true;
    }
  }
  return false;
}

/**
 * Formats a negative keyword based on match type
 */
function formatNegativeKeyword(keyword, matchType) {
  switch (matchType.toUpperCase()) {
    case 'EXACT':
      return '[' + keyword + ']';
    case 'PHRASE':
      return '"' + keyword + '"';
    case 'BROAD':
    default:
      return keyword;
  }
}

/**
 * Checks if a campaign already has a specific negative keyword
 */
function campaignHasNegativeKeyword(campaign, keyword) {
  try {
    var negativeKeywords = campaign.negativeKeywords().get();
    while (negativeKeywords.hasNext()) {
      if (negativeKeywords.next().getText() === keyword) {
        return true;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Checks if an ad group already has a specific negative keyword
 */
function adGroupHasNegativeKeyword(adGroup, keyword) {
  try {
    var negativeKeywords = adGroup.negativeKeywords().get();
    while (negativeKeywords.hasNext()) {
      if (negativeKeywords.next().getText() === keyword) {
        return true;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Counts the number of ads in an ad group
 */
function countAdsInAdGroup(adGroup) {
  try {
    var count = 0;
    var ads = adGroup.ads().get();
    while (ads.hasNext()) {
      ads.next();
      count++;
    }
    return count;
  } catch (error) {
    return 0;
  }
}

/**
 * Creates an ad based on type
 */
function createAdByType(adGroup, adData, config) {
  try {
    switch (adData.type.toUpperCase()) {
      case 'RESPONSIVE_SEARCH_AD':
        return createResponsiveSearchAd(adGroup, adData, config);
      case 'EXPANDED_TEXT_AD':
        return createExpandedTextAd(adGroup, adData, config);
      default:
        return { success: false, error: 'Unsupported ad type: ' + adData.type };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Creates a responsive search ad
 */
function createResponsiveSearchAd(adGroup, adData, config) {
  try {
    var adBuilder = adGroup.newAd().responsiveSearchAdBuilder();

    // Add headlines (max 15)
    if (adData.headlines && adData.headlines.length > 0) {
      for (var i = 0; i < Math.min(adData.headlines.length, 15); i++) {
        var headline = adData.headlines[i];
        if (headline && headline.length <= 30) {
          adBuilder.addHeadline(headline);
        }
      }
    }

    // Add descriptions (max 4)
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

    // Build the ad
    var operation = adBuilder.build();
    if (!operation.isSuccessful()) {
      return { success: false, error: 'Failed to create RSA: ' + operation.getErrors().join(', ') };
    }

    var ad = operation.getResult();

    // Apply label if configured
    if (config.SCRIPT_LABEL) {
      try {
        ad.applyLabel(config.SCRIPT_LABEL);
      } catch (labelError) {
        // Label application is not critical
      }
    }

    return { success: true, adId: ad.getId() };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Logs optimization mutations for tracking
 */
function logOptimizationMutation(optimization, result, optimizationId, config) {
  // This would integrate with the main script's mutation logging
  log_('MUTATION: ' + optimization.type + ' applied successfully (ID: ' + optimizationId + ')', 'INFO');
}

/**
 * Placeholder functions for future enhancement
 */
function applyAdUpdateSafely(optimization, config, rollbackInfo) {
  return { success: false, error: 'Ad update not yet implemented' };
}

function applyAudienceTargetingSafely(optimization, config, rollbackInfo) {
  return { success: false, error: 'Audience targeting not yet implemented' };
}

function applyCampaignStatusChangeSafely(optimization, config, rollbackInfo) {
  return { success: false, error: 'Campaign status change not yet implemented' };
}

function applyAdGroupStatusChangeSafely(optimization, config, rollbackInfo) {
  return { success: false, error: 'Ad group status change not yet implemented' };
}

function applyKeywordStatusChangeSafely(optimization, config, rollbackInfo) {
  return { success: false, error: 'Keyword status change not yet implemented' };
}

function createExpandedTextAd(adGroup, adData, config) {
  return { success: false, error: 'Expanded text ads are deprecated' };
}