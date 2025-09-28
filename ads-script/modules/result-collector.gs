/**
 * Result Collector Module for ProofKit Enhanced Script
 *
 * This module collects comprehensive performance metrics from Google Ads
 * and formats them for transmission to the ProofKit backend.
 *
 * Features:
 * - Comprehensive data collection across all entity types
 * - Configurable date ranges and data granularity
 * - Efficient data aggregation and formatting
 * - Error handling and data validation
 * - Support for custom metrics and dimensions
 */

// ============================================================================
// MAIN COLLECTION ORCHESTRATOR
// ============================================================================

/**
 * Collects all performance metrics from the Google Ads account
 */
function collectAllPerformanceMetrics(config) {
  var startTime = new Date().getTime();
  log_('Starting comprehensive metrics collection...', 'INFO');

  var metrics = {
    account: {},
    campaigns: [],
    adGroups: [],
    keywords: [],
    ads: [],
    searchTerms: [],
    audiences: [],
    demographics: [],
    extensions: [],
    placements: [],
    topics: [],
    collectionMetadata: {
      timestamp: new Date().toISOString(),
      dateRange: config.LOOKBACK_DAYS || 7,
      version: config.VERSION || '2.0.0',
      runId: config.RUN_ID || generateRunId(),
      account: getAccountInfo()
    }
  };

  try {
    // Collect account-level information
    log_('Collecting account information...', 'INFO');
    metrics.account = collectAccountMetrics(config);

    // Collect campaign metrics
    log_('Collecting campaign metrics...', 'INFO');
    metrics.campaigns = collectCampaignMetrics(config);

    // Collect ad group metrics
    log_('Collecting ad group metrics...', 'INFO');
    metrics.adGroups = collectAdGroupMetrics(config);

    // Collect keyword metrics
    log_('Collecting keyword metrics...', 'INFO');
    metrics.keywords = collectKeywordMetrics(config);

    // Collect ad metrics
    log_('Collecting ad metrics...', 'INFO');
    metrics.ads = collectAdMetrics(config);

    // Collect search term metrics
    log_('Collecting search term metrics...', 'INFO');
    metrics.searchTerms = collectSearchTermMetrics(config);

    // Collect audience metrics
    log_('Collecting audience metrics...', 'INFO');
    metrics.audiences = collectAudienceMetrics(config);

    // Collect demographic metrics
    log_('Collecting demographic metrics...', 'INFO');
    metrics.demographics = collectDemographicMetrics(config);

    // Collect extension metrics
    log_('Collecting extension metrics...', 'INFO');
    metrics.extensions = collectExtensionMetrics(config);

    // Collect additional targeting metrics if enabled
    if (config.ENABLE_ADVANCED_METRICS) {
      log_('Collecting advanced targeting metrics...', 'INFO');
      metrics.placements = collectPlacementMetrics(config);
      metrics.topics = collectTopicMetrics(config);
    }

    var duration = new Date().getTime() - startTime;
    log_('Metrics collection completed in ' + duration + 'ms', 'INFO');

    // Add collection summary
    metrics.collectionMetadata.duration = duration;
    metrics.collectionMetadata.summary = generateCollectionSummary(metrics);

  } catch (error) {
    log_('Error during metrics collection: ' + error.toString(), 'ERROR');
    metrics.collectionMetadata.error = error.toString();
  }

  return metrics;
}

// ============================================================================
// ACCOUNT METRICS
// ============================================================================

/**
 * Collects account-level metrics and information
 */
function collectAccountMetrics(config) {
  try {
    var account = AdsApp.currentAccount();
    var dateRange = 'LAST_' + (config.LOOKBACK_DAYS || 7) + '_DAYS';

    // Basic account info
    var accountInfo = {
      customerId: account.getCustomerId(),
      name: account.getName(),
      timeZone: account.getTimeZone(),
      currencyCode: account.getCurrencyCode(),
      dateRange: dateRange,
      timestamp: new Date().toISOString()
    };

    // Collect account-level performance metrics
    var query = 'SELECT customer.id, customer.descriptive_name, customer.currency_code, ' +
                'customer.time_zone, metrics.clicks, metrics.impressions, ' +
                'metrics.cost_micros, metrics.conversions, metrics.conversion_value_micros, ' +
                'metrics.ctr, metrics.average_cpc_micros, metrics.average_cpm_micros, ' +
                'metrics.search_impression_share, metrics.search_budget_lost_impression_share, ' +
                'metrics.search_rank_lost_impression_share ' +
                'FROM customer WHERE segments.date DURING ' + dateRange;

    var report = AdsApp.search(query);
    if (report.hasNext()) {
      var row = report.next();
      accountInfo.performance = {
        clicks: row.metrics.clicks || 0,
        impressions: row.metrics.impressions || 0,
        cost: (row.metrics.costMicros || 0) / 1000000,
        conversions: row.metrics.conversions || 0,
        conversionValue: (row.metrics.conversionValueMicros || 0) / 1000000,
        ctr: row.metrics.ctr || 0,
        avgCpc: (row.metrics.averageCpcMicros || 0) / 1000000,
        avgCpm: (row.metrics.averageCpmMicros || 0) / 1000000,
        searchImpressionShare: row.metrics.searchImpressionShare || 0,
        searchBudgetLostImpressionShare: row.metrics.searchBudgetLostImpressionShare || 0,
        searchRankLostImpressionShare: row.metrics.searchRankLostImpressionShare || 0
      };
    }

    // Add derived metrics
    if (accountInfo.performance) {
      accountInfo.performance.cpc = accountInfo.performance.clicks > 0 ?
        accountInfo.performance.cost / accountInfo.performance.clicks : 0;
      accountInfo.performance.cpm = accountInfo.performance.impressions > 0 ?
        (accountInfo.performance.cost / accountInfo.performance.impressions) * 1000 : 0;
      accountInfo.performance.conversionRate = accountInfo.performance.clicks > 0 ?
        accountInfo.performance.conversions / accountInfo.performance.clicks : 0;
      accountInfo.performance.costPerConversion = accountInfo.performance.conversions > 0 ?
        accountInfo.performance.cost / accountInfo.performance.conversions : 0;
      accountInfo.performance.roas = accountInfo.performance.cost > 0 ?
        accountInfo.performance.conversionValue / accountInfo.performance.cost : 0;
    }

    return accountInfo;
  } catch (error) {
    log_('Error collecting account metrics: ' + error.toString(), 'ERROR');
    return { error: error.toString() };
  }
}

// ============================================================================
// CAMPAIGN METRICS
// ============================================================================

/**
 * Collects comprehensive campaign metrics
 */
function collectCampaignMetrics(config) {
  var campaigns = [];
  var dateRange = 'LAST_' + (config.LOOKBACK_DAYS || 7) + '_DAYS';

  try {
    var query = 'SELECT campaign.id, campaign.name, campaign.status, ' +
                'campaign.advertising_channel_type, campaign.advertising_channel_sub_type, ' +
                'campaign.budget_amount_micros, campaign.target_spend.target_spend_micros, ' +
                'campaign.maximize_conversions.target_cpa_micros, ' +
                'bidding_strategy.type, bidding_strategy.name, ' +
                'metrics.clicks, metrics.impressions, metrics.cost_micros, ' +
                'metrics.conversions, metrics.conversion_value_micros, metrics.ctr, ' +
                'metrics.average_cpc_micros, metrics.average_cpm_micros, ' +
                'metrics.search_impression_share, metrics.search_budget_lost_impression_share, ' +
                'metrics.search_rank_lost_impression_share, metrics.search_exact_match_impression_share ' +
                'FROM campaign WHERE segments.date DURING ' + dateRange + ' ' +
                'AND campaign.advertising_channel_type = SEARCH';

    var report = AdsApp.search(query);
    while (report.hasNext()) {
      var row = report.next();

      var campaign = {
        id: row.campaign.id,
        name: row.campaign.name,
        status: row.campaign.status,
        channelType: row.campaign.advertisingChannelType,
        channelSubType: row.campaign.advertisingChannelSubType || null,
        budget: (row.campaign.budgetAmountMicros || 0) / 1000000,
        targetSpend: (row.campaign.targetSpend ? row.campaign.targetSpend.targetSpendMicros : 0) / 1000000,
        targetCpa: (row.campaign.maximizeConversions ? row.campaign.maximizeConversions.targetCpaMicros : 0) / 1000000,
        biddingStrategy: {
          type: row.biddingStrategy.type || null,
          name: row.biddingStrategy.name || null
        },
        performance: {
          clicks: row.metrics.clicks || 0,
          impressions: row.metrics.impressions || 0,
          cost: (row.metrics.costMicros || 0) / 1000000,
          conversions: row.metrics.conversions || 0,
          conversionValue: (row.metrics.conversionValueMicros || 0) / 1000000,
          ctr: row.metrics.ctr || 0,
          avgCpc: (row.metrics.averageCpcMicros || 0) / 1000000,
          avgCpm: (row.metrics.averageCpmMicros || 0) / 1000000,
          searchImpressionShare: row.metrics.searchImpressionShare || 0,
          searchBudgetLostImpressionShare: row.metrics.searchBudgetLostImpressionShare || 0,
          searchRankLostImpressionShare: row.metrics.searchRankLostImpressionShare || 0,
          searchExactMatchImpressionShare: row.metrics.searchExactMatchImpressionShare || 0
        },
        timestamp: new Date().toISOString()
      };

      // Add derived metrics
      addDerivedMetrics(campaign.performance);

      // Add additional campaign details
      campaign.additional = collectAdditionalCampaignDetails(row.campaign.id, config);

      campaigns.push(campaign);
    }

    log_('Collected metrics for ' + campaigns.length + ' campaigns', 'INFO');
    return campaigns;

  } catch (error) {
    log_('Error collecting campaign metrics: ' + error.toString(), 'ERROR');
    return [];
  }
}

/**
 * Collects additional campaign details like labels, targeting settings
 */
function collectAdditionalCampaignDetails(campaignId, config) {
  var details = {
    labels: [],
    geoTargets: [],
    adSchedules: [],
    negativeKeywordLists: []
  };

  try {
    // Get campaign labels
    var campaignIterator = AdsApp.campaigns().withIds([parseInt(campaignId)]).get();
    if (campaignIterator.hasNext()) {
      var campaign = campaignIterator.next();

      // Collect labels
      var labelIterator = campaign.labels().get();
      while (labelIterator.hasNext()) {
        details.labels.push(labelIterator.next().getName());
      }

      // Collect geo targets
      var geoIterator = campaign.targeting().targetedLocations().get();
      while (geoIterator.hasNext()) {
        var location = geoIterator.next();
        details.geoTargets.push({
          id: location.getId(),
          name: location.getName(),
          targetType: location.getTargetType()
        });
      }

      // Collect ad schedules
      var scheduleIterator = campaign.targeting().adSchedules().get();
      while (scheduleIterator.hasNext()) {
        var schedule = scheduleIterator.next();
        details.adSchedules.push({
          dayOfWeek: schedule.getDayOfWeek(),
          startHour: schedule.getStartHour(),
          startMinute: schedule.getStartMinute(),
          endHour: schedule.getEndHour(),
          endMinute: schedule.getEndMinute(),
          bidModifier: schedule.getBidModifier()
        });
      }

      // Collect negative keyword lists
      var negListIterator = campaign.negativeKeywordLists().get();
      while (negListIterator.hasNext()) {
        var negList = negListIterator.next();
        details.negativeKeywordLists.push({
          id: negList.getId(),
          name: negList.getName()
        });
      }
    }
  } catch (error) {
    log_('Error collecting additional campaign details for ' + campaignId + ': ' + error.toString(), 'WARN');
  }

  return details;
}

// ============================================================================
// AD GROUP METRICS
// ============================================================================

/**
 * Collects comprehensive ad group metrics
 */
function collectAdGroupMetrics(config) {
  var adGroups = [];
  var dateRange = 'LAST_' + (config.LOOKBACK_DAYS || 7) + '_DAYS';

  try {
    var query = 'SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ' +
                'ad_group.status, ad_group.type, ad_group.cpc_bid_micros, ' +
                'ad_group.cpm_bid_micros, ad_group.target_cpa_micros, ' +
                'metrics.clicks, metrics.impressions, metrics.cost_micros, ' +
                'metrics.conversions, metrics.conversion_value_micros, metrics.ctr, ' +
                'metrics.average_cpc_micros, metrics.average_cpm_micros, ' +
                'metrics.search_impression_share ' +
                'FROM ad_group WHERE segments.date DURING ' + dateRange + ' ' +
                'AND campaign.advertising_channel_type = SEARCH';

    var report = AdsApp.search(query);
    while (report.hasNext()) {
      var row = report.next();

      var adGroup = {
        id: row.adGroup.id,
        name: row.adGroup.name,
        campaignId: row.campaign.id,
        campaignName: row.campaign.name,
        status: row.adGroup.status,
        type: row.adGroup.type || null,
        bidding: {
          cpcBid: (row.adGroup.cpcBidMicros || 0) / 1000000,
          cpmBid: (row.adGroup.cpmBidMicros || 0) / 1000000,
          targetCpa: (row.adGroup.targetCpaMicros || 0) / 1000000
        },
        performance: {
          clicks: row.metrics.clicks || 0,
          impressions: row.metrics.impressions || 0,
          cost: (row.metrics.costMicros || 0) / 1000000,
          conversions: row.metrics.conversions || 0,
          conversionValue: (row.metrics.conversionValueMicros || 0) / 1000000,
          ctr: row.metrics.ctr || 0,
          avgCpc: (row.metrics.averageCpcMicros || 0) / 1000000,
          avgCpm: (row.metrics.averageCpmMicros || 0) / 1000000,
          searchImpressionShare: row.metrics.searchImpressionShare || 0
        },
        timestamp: new Date().toISOString()
      };

      // Add derived metrics
      addDerivedMetrics(adGroup.performance);

      // Add keyword and ad counts
      adGroup.counts = collectAdGroupCounts(row.adGroup.id);

      adGroups.push(adGroup);
    }

    log_('Collected metrics for ' + adGroups.length + ' ad groups', 'INFO');
    return adGroups;

  } catch (error) {
    log_('Error collecting ad group metrics: ' + error.toString(), 'ERROR');
    return [];
  }
}

/**
 * Collects counts of keywords and ads in an ad group
 */
function collectAdGroupCounts(adGroupId) {
  var counts = {
    keywords: 0,
    negativeKeywords: 0,
    ads: 0,
    enabledAds: 0
  };

  try {
    var adGroupIterator = AdsApp.adGroups().withIds([parseInt(adGroupId)]).get();
    if (adGroupIterator.hasNext()) {
      var adGroup = adGroupIterator.next();

      // Count keywords
      var keywordIterator = adGroup.keywords().get();
      while (keywordIterator.hasNext()) {
        keywordIterator.next();
        counts.keywords++;
      }

      // Count negative keywords
      var negKeywordIterator = adGroup.negativeKeywords().get();
      while (negKeywordIterator.hasNext()) {
        negKeywordIterator.next();
        counts.negativeKeywords++;
      }

      // Count ads
      var adIterator = adGroup.ads().get();
      while (adIterator.hasNext()) {
        var ad = adIterator.next();
        counts.ads++;
        if (ad.isEnabled()) {
          counts.enabledAds++;
        }
      }
    }
  } catch (error) {
    log_('Error collecting ad group counts for ' + adGroupId + ': ' + error.toString(), 'WARN');
  }

  return counts;
}

// ============================================================================
// KEYWORD METRICS
// ============================================================================

/**
 * Collects comprehensive keyword metrics
 */
function collectKeywordMetrics(config) {
  var keywords = [];
  var dateRange = 'LAST_' + (config.LOOKBACK_DAYS || 7) + '_DAYS';

  try {
    var query = 'SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ' +
                'ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ' +
                'ad_group_criterion.quality_info.quality_score, ' +
                'ad_group_criterion.quality_info.creative_quality_score, ' +
                'ad_group_criterion.quality_info.post_click_quality_score, ' +
                'ad_group_criterion.quality_info.search_predicted_ctr, ' +
                'ad_group_criterion.status, ad_group_criterion.cpc_bid_micros, ' +
                'ad_group_criterion.final_urls, ' +
                'metrics.clicks, metrics.impressions, metrics.cost_micros, ' +
                'metrics.conversions, metrics.conversion_value_micros, metrics.ctr, ' +
                'metrics.average_cpc_micros, metrics.average_position, ' +
                'metrics.search_impression_share, metrics.search_exact_match_impression_share ' +
                'FROM keyword_view WHERE segments.date DURING ' + dateRange + ' ' +
                'AND campaign.advertising_channel_type = SEARCH';

    var report = AdsApp.search(query);
    while (report.hasNext()) {
      var row = report.next();

      var keyword = {
        text: row.adGroupCriterion.keyword.text,
        matchType: row.adGroupCriterion.keyword.matchType,
        campaignId: row.campaign.id,
        campaignName: row.campaign.name,
        adGroupId: row.adGroup.id,
        adGroupName: row.adGroup.name,
        status: row.adGroupCriterion.status,
        cpcBid: (row.adGroupCriterion.cpcBidMicros || 0) / 1000000,
        finalUrls: row.adGroupCriterion.finalUrls || [],
        qualityInfo: {
          qualityScore: row.adGroupCriterion.qualityInfo.qualityScore || null,
          creativeQualityScore: row.adGroupCriterion.qualityInfo.creativeQualityScore || null,
          postClickQualityScore: row.adGroupCriterion.qualityInfo.postClickQualityScore || null,
          searchPredictedCtr: row.adGroupCriterion.qualityInfo.searchPredictedCtr || null
        },
        performance: {
          clicks: row.metrics.clicks || 0,
          impressions: row.metrics.impressions || 0,
          cost: (row.metrics.costMicros || 0) / 1000000,
          conversions: row.metrics.conversions || 0,
          conversionValue: (row.metrics.conversionValueMicros || 0) / 1000000,
          ctr: row.metrics.ctr || 0,
          avgCpc: (row.metrics.averageCpcMicros || 0) / 1000000,
          avgPosition: row.metrics.averagePosition || 0,
          searchImpressionShare: row.metrics.searchImpressionShare || 0,
          searchExactMatchImpressionShare: row.metrics.searchExactMatchImpressionShare || 0
        },
        timestamp: new Date().toISOString()
      };

      // Add derived metrics
      addDerivedMetrics(keyword.performance);

      keywords.push(keyword);
    }

    log_('Collected metrics for ' + keywords.length + ' keywords', 'INFO');
    return keywords;

  } catch (error) {
    log_('Error collecting keyword metrics: ' + error.toString(), 'ERROR');
    return [];
  }
}

// ============================================================================
// AD METRICS
// ============================================================================

/**
 * Collects comprehensive ad metrics
 */
function collectAdMetrics(config) {
  var ads = [];
  var dateRange = 'LAST_' + (config.LOOKBACK_DAYS || 7) + '_DAYS';

  try {
    var query = 'SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ' +
                'ad_group_ad.ad.id, ad_group_ad.ad.type, ad_group_ad.status, ' +
                'ad_group_ad.ad.final_urls, ad_group_ad.ad.final_mobile_urls, ' +
                'ad_group_ad.ad.responsive_search_ad.headlines, ' +
                'ad_group_ad.ad.responsive_search_ad.descriptions, ' +
                'metrics.clicks, metrics.impressions, metrics.cost_micros, ' +
                'metrics.conversions, metrics.conversion_value_micros, metrics.ctr, ' +
                'metrics.average_cpc_micros ' +
                'FROM ad_group_ad WHERE segments.date DURING ' + dateRange + ' ' +
                'AND campaign.advertising_channel_type = SEARCH';

    var report = AdsApp.search(query);
    while (report.hasNext()) {
      var row = report.next();

      var ad = {
        id: row.adGroupAd.ad.id,
        type: row.adGroupAd.ad.type,
        campaignId: row.campaign.id,
        campaignName: row.campaign.name,
        adGroupId: row.adGroup.id,
        adGroupName: row.adGroup.name,
        status: row.adGroupAd.status,
        finalUrls: row.adGroupAd.ad.finalUrls || [],
        finalMobileUrls: row.adGroupAd.ad.finalMobileUrls || [],
        performance: {
          clicks: row.metrics.clicks || 0,
          impressions: row.metrics.impressions || 0,
          cost: (row.metrics.costMicros || 0) / 1000000,
          conversions: row.metrics.conversions || 0,
          conversionValue: (row.metrics.conversionValueMicros || 0) / 1000000,
          ctr: row.metrics.ctr || 0,
          avgCpc: (row.metrics.averageCpcMicros || 0) / 1000000
        },
        timestamp: new Date().toISOString()
      };

      // Add ad-specific content for RSAs
      if (row.adGroupAd.ad.type === 'RESPONSIVE_SEARCH_AD' && row.adGroupAd.ad.responsiveSearchAd) {
        ad.content = {
          headlines: extractAssetTexts(row.adGroupAd.ad.responsiveSearchAd.headlines),
          descriptions: extractAssetTexts(row.adGroupAd.ad.responsiveSearchAd.descriptions)
        };
      }

      // Add derived metrics
      addDerivedMetrics(ad.performance);

      ads.push(ad);
    }

    log_('Collected metrics for ' + ads.length + ' ads', 'INFO');
    return ads;

  } catch (error) {
    log_('Error collecting ad metrics: ' + error.toString(), 'ERROR');
    return [];
  }
}

// ============================================================================
// SEARCH TERM METRICS
// ============================================================================

/**
 * Collects search term metrics for query optimization
 */
function collectSearchTermMetrics(config) {
  var searchTerms = [];
  var dateRange = 'LAST_' + (config.LOOKBACK_DAYS || 7) + '_DAYS';

  try {
    var query = 'SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ' +
                'search_term_view.search_term, search_term_view.status, ' +
                'metrics.clicks, metrics.impressions, metrics.cost_micros, ' +
                'metrics.conversions, metrics.conversion_value_micros, metrics.ctr, ' +
                'metrics.average_cpc_micros ' +
                'FROM search_term_view WHERE segments.date DURING ' + dateRange + ' ' +
                'AND campaign.advertising_channel_type = SEARCH ' +
                'AND metrics.impressions > 0';

    var report = AdsApp.search(query);
    while (report.hasNext()) {
      var row = report.next();

      var searchTerm = {
        searchTerm: row.searchTermView.searchTerm,
        status: row.searchTermView.status,
        campaignId: row.campaign.id,
        campaignName: row.campaign.name,
        adGroupId: row.adGroup.id,
        adGroupName: row.adGroup.name,
        performance: {
          clicks: row.metrics.clicks || 0,
          impressions: row.metrics.impressions || 0,
          cost: (row.metrics.costMicros || 0) / 1000000,
          conversions: row.metrics.conversions || 0,
          conversionValue: (row.metrics.conversionValueMicros || 0) / 1000000,
          ctr: row.metrics.ctr || 0,
          avgCpc: (row.metrics.averageCpcMicros || 0) / 1000000
        },
        timestamp: new Date().toISOString()
      };

      // Add derived metrics
      addDerivedMetrics(searchTerm.performance);

      // Add optimization flags
      searchTerm.optimizationFlags = {
        highCostNoConversions: searchTerm.performance.cost > 5 && searchTerm.performance.conversions === 0,
        lowCtr: searchTerm.performance.ctr < 0.01,
        highCpc: searchTerm.performance.avgCpc > 2,
        potentialNegative: searchTerm.performance.clicks > 5 && searchTerm.performance.conversions === 0
      };

      searchTerms.push(searchTerm);
    }

    log_('Collected metrics for ' + searchTerms.length + ' search terms', 'INFO');
    return searchTerms;

  } catch (error) {
    log_('Error collecting search term metrics: ' + error.toString(), 'ERROR');
    return [];
  }
}

// ============================================================================
// AUDIENCE METRICS
// ============================================================================

/**
 * Collects audience targeting metrics
 */
function collectAudienceMetrics(config) {
  var audiences = [];
  var dateRange = 'LAST_' + (config.LOOKBACK_DAYS || 7) + '_DAYS';

  try {
    var query = 'SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ' +
                'user_list.id, user_list.name, user_list.type, user_list.size_for_display, ' +
                'user_list.size_for_search, criteria.user_list.user_list, ' +
                'metrics.clicks, metrics.impressions, metrics.cost_micros, ' +
                'metrics.conversions, metrics.conversion_value_micros, metrics.ctr, ' +
                'metrics.average_cpc_micros ' +
                'FROM user_list_view WHERE segments.date DURING ' + dateRange + ' ' +
                'AND campaign.advertising_channel_type = SEARCH';

    var report = AdsApp.search(query);
    while (report.hasNext()) {
      var row = report.next();

      var audience = {
        userListId: row.userList.id,
        userListName: row.userList.name,
        userListType: row.userList.type,
        sizeForDisplay: row.userList.sizeForDisplay || 0,
        sizeForSearch: row.userList.sizeForSearch || 0,
        campaignId: row.campaign.id,
        campaignName: row.campaign.name,
        adGroupId: row.adGroup.id,
        adGroupName: row.adGroup.name,
        performance: {
          clicks: row.metrics.clicks || 0,
          impressions: row.metrics.impressions || 0,
          cost: (row.metrics.costMicros || 0) / 1000000,
          conversions: row.metrics.conversions || 0,
          conversionValue: (row.metrics.conversionValueMicros || 0) / 1000000,
          ctr: row.metrics.ctr || 0,
          avgCpc: (row.metrics.averageCpcMicros || 0) / 1000000
        },
        timestamp: new Date().toISOString()
      };

      // Add derived metrics
      addDerivedMetrics(audience.performance);

      audiences.push(audience);
    }

    log_('Collected metrics for ' + audiences.length + ' audience segments', 'INFO');
    return audiences;

  } catch (error) {
    log_('Error collecting audience metrics: ' + error.toString(), 'ERROR');
    return [];
  }
}

// ============================================================================
// DEMOGRAPHIC METRICS
// ============================================================================

/**
 * Collects demographic targeting metrics
 */
function collectDemographicMetrics(config) {
  var demographics = [];
  var dateRange = 'LAST_' + (config.LOOKBACK_DAYS || 7) + '_DAYS';

  try {
    // Age demographics
    var ageQuery = 'SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ' +
                   'ad_group_criterion.age_range.type, ' +
                   'metrics.clicks, metrics.impressions, metrics.cost_micros, ' +
                   'metrics.conversions, metrics.conversion_value_micros, metrics.ctr, ' +
                   'metrics.average_cpc_micros ' +
                   'FROM age_range_view WHERE segments.date DURING ' + dateRange + ' ' +
                   'AND campaign.advertising_channel_type = SEARCH';

    var ageReport = AdsApp.search(ageQuery);
    while (ageReport.hasNext()) {
      var row = ageReport.next();

      demographics.push({
        type: 'AGE_RANGE',
        value: row.adGroupCriterion.ageRange.type,
        campaignId: row.campaign.id,
        campaignName: row.campaign.name,
        adGroupId: row.adGroup.id,
        adGroupName: row.adGroup.name,
        performance: {
          clicks: row.metrics.clicks || 0,
          impressions: row.metrics.impressions || 0,
          cost: (row.metrics.costMicros || 0) / 1000000,
          conversions: row.metrics.conversions || 0,
          conversionValue: (row.metrics.conversionValueMicros || 0) / 1000000,
          ctr: row.metrics.ctr || 0,
          avgCpc: (row.metrics.averageCpcMicros || 0) / 1000000
        },
        timestamp: new Date().toISOString()
      });
    }

    // Gender demographics
    var genderQuery = 'SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ' +
                      'ad_group_criterion.gender.type, ' +
                      'metrics.clicks, metrics.impressions, metrics.cost_micros, ' +
                      'metrics.conversions, metrics.conversion_value_micros, metrics.ctr, ' +
                      'metrics.average_cpc_micros ' +
                      'FROM gender_view WHERE segments.date DURING ' + dateRange + ' ' +
                      'AND campaign.advertising_channel_type = SEARCH';

    var genderReport = AdsApp.search(genderQuery);
    while (genderReport.hasNext()) {
      var row = genderReport.next();

      demographics.push({
        type: 'GENDER',
        value: row.adGroupCriterion.gender.type,
        campaignId: row.campaign.id,
        campaignName: row.campaign.name,
        adGroupId: row.adGroup.id,
        adGroupName: row.adGroup.name,
        performance: {
          clicks: row.metrics.clicks || 0,
          impressions: row.metrics.impressions || 0,
          cost: (row.metrics.costMicros || 0) / 1000000,
          conversions: row.metrics.conversions || 0,
          conversionValue: (row.metrics.conversionValueMicros || 0) / 1000000,
          ctr: row.metrics.ctr || 0,
          avgCpc: (row.metrics.averageCpcMicros || 0) / 1000000
        },
        timestamp: new Date().toISOString()
      });
    }

    log_('Collected metrics for ' + demographics.length + ' demographic segments', 'INFO');
    return demographics;

  } catch (error) {
    log_('Error collecting demographic metrics: ' + error.toString(), 'ERROR');
    return [];
  }
}

// ============================================================================
// EXTENSION METRICS
// ============================================================================

/**
 * Collects ad extension metrics
 */
function collectExtensionMetrics(config) {
  var extensions = [];
  var dateRange = 'LAST_' + (config.LOOKBACK_DAYS || 7) + '_DAYS';

  try {
    var query = 'SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ' +
                'extension_feed_item.extension_type, extension_feed_item.status, ' +
                'metrics.clicks, metrics.impressions, metrics.cost_micros, ' +
                'metrics.conversions, metrics.conversion_value_micros, metrics.ctr ' +
                'FROM extension_feed_item WHERE segments.date DURING ' + dateRange + ' ' +
                'AND campaign.advertising_channel_type = SEARCH';

    var report = AdsApp.search(query);
    while (report.hasNext()) {
      var row = report.next();

      extensions.push({
        extensionType: row.extensionFeedItem.extensionType,
        status: row.extensionFeedItem.status,
        campaignId: row.campaign.id,
        campaignName: row.campaign.name,
        adGroupId: row.adGroup.id,
        adGroupName: row.adGroup.name,
        performance: {
          clicks: row.metrics.clicks || 0,
          impressions: row.metrics.impressions || 0,
          cost: (row.metrics.costMicros || 0) / 1000000,
          conversions: row.metrics.conversions || 0,
          conversionValue: (row.metrics.conversionValueMicros || 0) / 1000000,
          ctr: row.metrics.ctr || 0
        },
        timestamp: new Date().toISOString()
      });
    }

    log_('Collected metrics for ' + extensions.length + ' ad extensions', 'INFO');
    return extensions;

  } catch (error) {
    log_('Error collecting extension metrics: ' + error.toString(), 'ERROR');
    return [];
  }
}

// ============================================================================
// ADVANCED TARGETING METRICS
// ============================================================================

/**
 * Collects placement targeting metrics (for Display campaigns)
 */
function collectPlacementMetrics(config) {
  // This would be implemented for Display campaigns
  return [];
}

/**
 * Collects topic targeting metrics
 */
function collectTopicMetrics(config) {
  // This would be implemented for topic targeting
  return [];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Adds derived metrics to a performance object
 */
function addDerivedMetrics(performance) {
  // Cost per click
  performance.cpc = performance.clicks > 0 ? performance.cost / performance.clicks : 0;

  // Cost per mille (thousand impressions)
  performance.cpm = performance.impressions > 0 ? (performance.cost / performance.impressions) * 1000 : 0;

  // Conversion rate
  performance.conversionRate = performance.clicks > 0 ? performance.conversions / performance.clicks : 0;

  // Cost per conversion
  performance.costPerConversion = performance.conversions > 0 ? performance.cost / performance.conversions : 0;

  // Return on ad spend
  performance.roas = performance.cost > 0 ? performance.conversionValue / performance.cost : 0;

  // Quality indicators
  performance.qualityScore = {
    efficiency: performance.ctr > 0.02 ? 'Good' : (performance.ctr > 0.01 ? 'Average' : 'Poor'),
    costEffectiveness: performance.costPerConversion > 0 && performance.costPerConversion < 50 ? 'Good' : 'Poor'
  };
}

/**
 * Extracts text from ad assets (headlines, descriptions)
 */
function extractAssetTexts(assets) {
  var texts = [];
  if (assets && assets.length > 0) {
    for (var i = 0; i < assets.length; i++) {
      if (assets[i] && assets[i].text) {
        texts.push(assets[i].text);
      }
    }
  }
  return texts;
}

/**
 * Gets basic account information
 */
function getAccountInfo() {
  try {
    var account = AdsApp.currentAccount();
    return {
      customerId: account.getCustomerId(),
      name: account.getName(),
      timeZone: account.getTimeZone(),
      currencyCode: account.getCurrencyCode()
    };
  } catch (error) {
    return { error: error.toString() };
  }
}

/**
 * Generates a collection summary
 */
function generateCollectionSummary(metrics) {
  return {
    totalCampaigns: metrics.campaigns.length,
    totalAdGroups: metrics.adGroups.length,
    totalKeywords: metrics.keywords.length,
    totalAds: metrics.ads.length,
    totalSearchTerms: metrics.searchTerms.length,
    totalAudiences: metrics.audiences.length,
    totalDemographics: metrics.demographics.length,
    totalExtensions: metrics.extensions.length
  };
}

/**
 * Generates a unique run ID for tracking
 */
function generateRunId() {
  return 'RUN_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 9);
}