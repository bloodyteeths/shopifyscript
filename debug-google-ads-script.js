/**
 * DEBUG SCRIPT - Run this in Google Ads to see actual data structure
 * This will help us understand why values are showing as 0
 */

function main() {
  console.log("=== DEBUGGING GOOGLE ADS API RESPONSE ===");

  // Test Campaign Query
  console.log("\n1. Testing Campaign Data:");
  var campaignQuery = "SELECT campaign.id, campaign.name, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.impressions, metrics.ctr, segments.date FROM campaign WHERE segments.date DURING LAST_7_DAYS AND campaign.advertising_channel_type = SEARCH LIMIT 1";

  try {
    var campaignIterator = AdsApp.search(campaignQuery);
    if (campaignIterator.hasNext()) {
      var campaign = campaignIterator.next();

      console.log("\n📊 Raw Campaign Object Keys:");
      for (var key in campaign) {
        console.log("  - " + key + ": " + typeof campaign[key]);
      }

      console.log("\n📊 Campaign Fields:");
      console.log("  campaign object: " + JSON.stringify(campaign.campaign || "undefined"));
      console.log("  metrics object: " + JSON.stringify(campaign.metrics || "undefined"));
      console.log("  segments object: " + JSON.stringify(campaign.segments || "undefined"));

      // Try different ways to access metrics
      console.log("\n📊 Testing Metrics Access:");
      console.log("  campaign.metrics: " + JSON.stringify(campaign.metrics));
      console.log("  campaign['metrics']: " + JSON.stringify(campaign['metrics']));

      if (campaign.metrics) {
        console.log("  campaign.metrics.clicks: " + campaign.metrics.clicks);
        console.log("  campaign.metrics.cost_micros: " + campaign.metrics.cost_micros);
        console.log("  campaign.metrics.costMicros: " + campaign.metrics.costMicros);
        console.log("  campaign.metrics.impressions: " + campaign.metrics.impressions);
        console.log("  campaign.metrics.conversions: " + campaign.metrics.conversions);
        console.log("  campaign.metrics.ctr: " + campaign.metrics.ctr);
      }

      console.log("\n📊 Full campaign object stringified:");
      console.log(JSON.stringify(campaign, null, 2));
    } else {
      console.log("❌ No campaigns found");
    }
  } catch (e) {
    console.log("❌ Campaign query error: " + e.toString());
  }

  // Test Ad Group Query
  console.log("\n\n2. Testing Ad Group Data:");
  var adGroupQuery = "SELECT campaign.name, ad_group.id, ad_group.name, metrics.clicks, metrics.cost_micros, segments.date FROM ad_group WHERE segments.date DURING LAST_7_DAYS AND campaign.advertising_channel_type = SEARCH LIMIT 1";

  try {
    var adGroupIterator = AdsApp.search(adGroupQuery);
    if (adGroupIterator.hasNext()) {
      var adGroup = adGroupIterator.next();

      console.log("\n📊 Raw Ad Group Object Keys:");
      for (var key in adGroup) {
        console.log("  - " + key + ": " + typeof adGroup[key]);
      }

      console.log("\n📊 Ad Group Fields:");
      console.log("  adGroup object: " + JSON.stringify(adGroup.adGroup || adGroup.ad_group || "undefined"));
      console.log("  metrics object: " + JSON.stringify(adGroup.metrics || "undefined"));

      console.log("\n📊 Full ad group object stringified:");
      console.log(JSON.stringify(adGroup, null, 2));
    } else {
      console.log("❌ No ad groups found");
    }
  } catch (e) {
    console.log("❌ Ad group query error: " + e.toString());
  }

  // Test Legacy API approach
  console.log("\n\n3. Testing Legacy API Approach:");
  try {
    var campaigns = AdsApp.campaigns()
      .withCondition("Status IN ['ENABLED', 'PAUSED']")
      .withCondition("AdvertisingChannelType = SEARCH")
      .forDateRange("LAST_7_DAYS")
      .withLimit(1)
      .get();

    if (campaigns.hasNext()) {
      var camp = campaigns.next();
      var stats = camp.getStatsFor("LAST_7_DAYS");

      console.log("\n📊 Legacy API Stats:");
      console.log("  Campaign Name: " + camp.getName());
      console.log("  Clicks: " + stats.getClicks());
      console.log("  Cost: " + stats.getCost());
      console.log("  Conversions: " + stats.getConversions());
      console.log("  Impressions: " + stats.getImpressions());
      console.log("  Ctr: " + stats.getCtr());
      console.log("  Average Cpc: " + stats.getAverageCpc());
    }
  } catch (e) {
    console.log("❌ Legacy API error: " + e.toString());
  }
}