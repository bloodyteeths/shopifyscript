// NEW IMPROVED VERSION OF collectPerf_() function
// This version collects data for EACH time period separately with period labels
// Location: Replace lines 598-780 in embedded-script-v2.js

function collectPerf_() {
  var rows = [];

  try {
    // First check if we need to enable paused campaigns
    var pausedCampaigns = AdsApp.campaigns()
      .withCondition("AdvertisingChannelType = SEARCH")
      .withCondition("Status = PAUSED")
      .get();

    var enabledCount = 0;
    while (pausedCampaigns.hasNext()) {
      var pausedCamp = pausedCampaigns.next();
      if (pausedCamp.getBudget().getAmount() >= 1 && pausedCamp.adGroups().get().hasNext()) {
        try {
          if (typeof USER_CONFIG !== 'undefined' && USER_CONFIG && USER_CONFIG.alwaysOn) {
            pausedCamp.enable();
            enabledCount++;
            log_("Enabled campaign: " + pausedCamp.getName());
          }
        } catch(e) {
          log_("Could not enable campaign " + pausedCamp.getName() + ": " + e);
        }
      }
    }
    if (enabledCount > 0) {
      log_("Enabled " + enabledCount + " paused campaigns");
    }

    // ✅ FIX: Collect data for EACH period separately
    var periods = ["TODAY", "YESTERDAY", "LAST_7_DAYS", "LAST_30_DAYS"];

    log_("Collecting metrics for " + periods.length + " time periods...");

    var campaigns = AdsApp.campaigns()
      .withCondition("AdvertisingChannelType = SEARCH")
      .withCondition("Status IN ['ENABLED', 'PAUSED']")
      .get();

    while (campaigns.hasNext()) {
      var campaign = campaigns.next();
      var campaignId = campaign.getId();
      var campaignName = campaign.getName();
      var campaignStatus = campaign.isEnabled() ? "ENABLED" : "PAUSED";

      // ✅ NEW: Collect stats for EACH period separately
      for (var p = 0; p < periods.length; p++) {
        var period = periods[p];

        try {
          var stats = campaign.getStatsFor(period);
          var impressions = stats.getImpressions();

          // Only record if there's actual data for this period
          if (impressions > 0 || stats.getClicks() > 0 || stats.getCost() > 0) {
            // ✅ NEW: Add period as the FIRST field in the row
            rows.push([
              period,                      // Period label (NEW!)
              new Date(),                  // date
              'campaign',                  // level
              campaignName,                // campaign
              '',                          // ad_group
              campaignId,                  // id
              campaignName,                // name
              stats.getClicks(),           // clicks
              stats.getCost(),             // cost
              stats.getConversions(),      // conversions
              stats.getImpressions(),      // impr
              stats.getCtr()               // ctr
            ]);

            log_("Campaign [" + period + "] " + campaignName + " - Impr: " + impressions + ", Clicks: " + stats.getClicks());
          }
        } catch (e) {
          // Period may not have data yet, that's OK
          if (period === "TODAY") {
            // TODAY should always be attempted, log if it fails
            log_("Error getting " + period + " stats for " + campaignName + ": " + e);
          }
        }
      }

      // Get ad groups for this campaign
      var adGroups = campaign.adGroups()
        .withCondition("Status IN ['ENABLED', 'PAUSED']")
        .get();

      while (adGroups.hasNext()) {
        var adGroup = adGroups.next();
        var adGroupId = adGroup.getId();
        var adGroupName = adGroup.getName();

        // ✅ NEW: Collect ad group stats for EACH period
        for (var p = 0; p < periods.length; p++) {
          var period = periods[p];

          try {
            var agStats = adGroup.getStatsFor(period);

            if (agStats.getImpressions() > 0 || agStats.getClicks() > 0) {
              // ✅ NEW: Add period as the FIRST field
              rows.push([
                period,                      // Period label (NEW!)
                new Date(),                  // date
                'ad_group',                  // level
                campaignName,                // campaign
                adGroupName,                 // ad_group
                adGroupId,                   // id
                adGroupName,                 // name
                agStats.getClicks(),         // clicks
                agStats.getCost(),           // cost
                agStats.getConversions(),    // conversions
                agStats.getImpressions(),    // impr
                agStats.getCtr()             // ctr
              ]);
            }
          } catch (e) {
            // Continue to next period
          }
        }
      }
    }

    log_("✅ Collected " + rows.length + " metric rows across all periods");

    // If no rows collected, try Report API as well
    if (rows.length === 0) {
      log_("⚠️ No data from Legacy API, trying Report API...");
      try {
        // Try TODAY first, then fall back to LAST_7_DAYS
        var reportPeriods = ["TODAY", "LAST_7_DAYS"];

        for (var rp = 0; rp < reportPeriods.length; rp++) {
          var reportPeriod = reportPeriods[rp];

          var report = AdsApp.report(
            "SELECT CampaignName, CampaignId, Clicks, Cost, Conversions, Impressions, Ctr " +
            "FROM CAMPAIGN_PERFORMANCE_REPORT " +
            "WHERE CampaignStatus IN ['ENABLED', 'PAUSED'] " +
            "DURING " + reportPeriod
          );

          var reportRows = report.rows();
          var reportCount = 0;

          while (reportRows.hasNext()) {
            var row = reportRows.next();

            // ✅ NEW: Add period label to report data
            rows.push([
              reportPeriod,                                    // Period label (NEW!)
              new Date(),                                      // date
              'campaign',                                      // level
              row['CampaignName'],                            // campaign
              '',                                             // ad_group
              row['CampaignId'],                              // id
              row['CampaignName'],                            // name
              parseInt(row['Clicks']) || 0,                   // clicks
              parseFloat(row['Cost']) || 0,                   // cost
              parseFloat(row['Conversions']) || 0,            // conversions
              parseInt(row['Impressions']) || 0,              // impr
              parseFloat(row['Ctr']) || 0                     // ctr
            ]);
            reportCount++;
          }

          log_("Report API [" + reportPeriod + "]: collected " + reportCount + " rows");

          if (reportCount > 0) {
            break; // Got data, no need to try other periods
          }
        }
      } catch (e) {
        log_("Report API error: " + e);
      }
    }

  } catch (e) {
    log_("❌ Fatal error in collectPerf_: " + e);
  }

  return rows;
}

// ✅ NEW: Helper function to collect device metrics with period tracking
function collectDeviceMetrics_() {
  var rows = [];
  var periods = ["TODAY", "YESTERDAY", "LAST_7_DAYS", "LAST_30_DAYS"];

  try {
    for (var p = 0; p < periods.length; p++) {
      var period = periods[p];

      try {
        var report = AdsApp.report(
          "SELECT CampaignId, CampaignName, Device, Clicks, Impressions, Conversions, Cost, Ctr " +
          "FROM CAMPAIGN_PERFORMANCE_REPORT " +
          "WHERE CampaignStatus IN ['ENABLED', 'PAUSED'] " +
          "DURING " + period
        );

        var reportRows = report.rows();
        while (reportRows.hasNext()) {
          var row = reportRows.next();
          var device = row['Device'] || 'UNKNOWN';

          // Normalize device names
          if (device.indexOf('MOBILE') >= 0 || device.indexOf('HIGH_END_MOBILE') >= 0) {
            device = 'mobile';
          } else if (device.indexOf('TABLET') >= 0) {
            device = 'tablet';
          } else if (device.indexOf('DESKTOP') >= 0 || device.indexOf('COMPUTERS') >= 0) {
            device = 'desktop';
          } else {
            device = 'other';
          }

          rows.push([
            period,                                    // period
            new Date(),                                // date
            row['CampaignId'],                        // campaign_id
            row['CampaignName'],                      // campaign_name
            device,                                    // device_type
            parseInt(row['Clicks']) || 0,             // clicks
            parseInt(row['Impressions']) || 0,        // impressions
            parseFloat(row['Conversions']) || 0,      // conversions
            parseFloat(row['Cost']) || 0,             // cost
            parseFloat(row['Ctr']) || 0               // ctr
          ]);
        }
      } catch (e) {
        log_("Device metrics error [" + period + "]: " + e);
      }
    }

    log_("✅ Collected " + rows.length + " device metric rows");
  } catch (e) {
    log_("❌ Fatal error in collectDeviceMetrics_: " + e);
  }

  return rows;
}

// ✅ NEW: Helper function to collect keyword performance with period tracking
function collectKeywordPerformance_() {
  var rows = [];
  var periods = ["TODAY", "YESTERDAY", "LAST_7_DAYS"];

  try {
    for (var p = 0; p < periods.length; p++) {
      var period = periods[p];

      try {
        var report = AdsApp.report(
          "SELECT CampaignId, AdGroupId, Criteria, KeywordMatchType, " +
          "QualityScore, Clicks, Impressions, Conversions, Cost, Ctr, AverageCpc " +
          "FROM KEYWORDS_PERFORMANCE_REPORT " +
          "WHERE Status = ENABLED " +
          "DURING " + period
        );

        var reportRows = report.rows();
        var count = 0;

        while (reportRows.hasNext() && count < 1000) {  // Limit to top 1000 keywords per period
          var row = reportRows.next();

          rows.push([
            period,                                    // period
            new Date(),                                // date
            row['CampaignId'],                        // campaign_id
            row['AdGroupId'],                         // ad_group_id
            row['Criteria'],                          // keyword
            row['KeywordMatchType'] || 'UNKNOWN',     // match_type
            parseInt(row['QualityScore']) || null,    // quality_score
            parseInt(row['Clicks']) || 0,             // clicks
            parseInt(row['Impressions']) || 0,        // impressions
            parseFloat(row['Conversions']) || 0,      // conversions
            parseFloat(row['Cost']) || 0,             // cost
            parseFloat(row['Ctr']) || 0,              // ctr
            parseFloat(row['AverageCpc']) || 0        // avg_cpc
          ]);

          count++;
        }

        log_("Keywords [" + period + "]: collected " + count + " rows");
      } catch (e) {
        log_("Keyword performance error [" + period + "]: " + e);
      }
    }

    log_("✅ Collected " + rows.length + " keyword performance rows");
  } catch (e) {
    log_("❌ Fatal error in collectKeywordPerformance_: " + e);
  }

  return rows;
}

// ✅ NEW: Simplified hourly patterns - collect TODAY's hourly data
function collectHourlyPatterns_() {
  var rows = [];

  try {
    var report = AdsApp.report(
      "SELECT CampaignId, HourOfDay, DayOfWeek, Clicks, Impressions, Conversions, Cost, Ctr " +
      "FROM CAMPAIGN_PERFORMANCE_REPORT " +
      "WHERE CampaignStatus IN ['ENABLED', 'PAUSED'] " +
      "DURING TODAY"
    );

    var reportRows = report.rows();
    while (reportRows.hasNext()) {
      var row = reportRows.next();

      rows.push([
        'TODAY',                                   // period
        new Date(),                                // date
        row['CampaignId'],                        // campaign_id
        parseInt(row['HourOfDay']) || 0,          // hour
        parseInt(row['DayOfWeek']) || 0,          // day_of_week
        parseInt(row['Clicks']) || 0,             // clicks
        parseInt(row['Impressions']) || 0,        // impressions
        parseFloat(row['Conversions']) || 0,      // conversions
        parseFloat(row['Cost']) || 0,             // cost
        parseFloat(row['Ctr']) || 0               // ctr
      ]);
    }

    log_("✅ Collected " + rows.length + " hourly pattern rows");
  } catch (e) {
    log_("❌ Hourly patterns error: " + e);
  }

  return rows;
}

// Note: Add period tracking to other collection functions similarly
// collectGeographicData_(), collectAdPerformance_(), collectConversionValue_()
// Follow the same pattern: loop through periods, add period as first field
