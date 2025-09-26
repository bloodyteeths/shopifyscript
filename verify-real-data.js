/**
 * Verification Script - Check if Google Ads is returning real or cached data
 * Run this in Google Ads Script Editor to verify actual account data
 */

function main() {
  console.log("=== VERIFYING ACTUAL GOOGLE ADS DATA ===");
  console.log("Timestamp: " + new Date().toISOString());

  // Check account details
  var account = AdsApp.currentAccount();
  console.log("\nAccount Info:");
  console.log("  ID: " + account.getCustomerId());
  console.log("  Name: " + account.getName());
  console.log("  Currency: " + account.getCurrencyCode());

  // Method 1: Legacy API with different date ranges
  console.log("\n=== METHOD 1: Legacy API ===");
  var campaigns = AdsApp.campaigns()
    .withCondition("Status IN ['ENABLED', 'PAUSED', 'REMOVED']")
    .get();

  while (campaigns.hasNext()) {
    var campaign = campaigns.next();
    console.log("\nCampaign: " + campaign.getName());
    console.log("  Status: " + campaign.getStatus());
    console.log("  ID: " + campaign.getId());

    // Check multiple date ranges
    var ranges = ["ALL_TIME", "LAST_30_DAYS", "LAST_7_DAYS", "TODAY"];
    for (var i = 0; i < ranges.length; i++) {
      try {
        var stats = campaign.getStatsFor(ranges[i]);
        if (stats.getImpressions() > 0 || ranges[i] === "ALL_TIME") {
          console.log("  [" + ranges[i] + "]:");
          console.log("    Impressions: " + stats.getImpressions());
          console.log("    Clicks: " + stats.getClicks());
          console.log("    Cost: $" + stats.getCost());
          console.log("    Conversions: " + stats.getConversions());

          // Check if these are suspiciously round numbers
          if (stats.getImpressions() === 410038 || stats.getImpressions() === 409043) {
            console.log("    ⚠️ WARNING: Suspicious exact match to previously seen numbers!");
          }
        }
      } catch(e) {
        console.log("  [" + ranges[i] + "]: Error - " + e.toString());
      }
    }
  }

  // Method 2: Report API
  console.log("\n=== METHOD 2: Report API ===");
  try {
    var report = AdsApp.report(
      "SELECT CampaignName, Impressions, Clicks, Cost, Conversions " +
      "FROM CAMPAIGN_PERFORMANCE_REPORT " +
      "WHERE CampaignStatus IN ['ENABLED', 'PAUSED'] " +
      "DURING ALL_TIME"
    );

    var rows = report.rows();
    while (rows.hasNext()) {
      var row = rows.next();
      console.log("\nCampaign: " + row['CampaignName']);
      console.log("  Impressions: " + row['Impressions']);
      console.log("  Clicks: " + row['Clicks']);
      console.log("  Cost: " + row['Cost']);
      console.log("  Conversions: " + row['Conversions']);
    }
  } catch(e) {
    console.log("Report API Error: " + e.toString());
  }

  // Method 3: Check actual campaign settings
  console.log("\n=== METHOD 3: Campaign Settings Check ===");
  var campaignsCheck = AdsApp.campaigns().get();
  while (campaignsCheck.hasNext()) {
    var camp = campaignsCheck.next();
    console.log("\nCampaign: " + camp.getName());
    console.log("  Budget: $" + camp.getBudget().getAmount());
    console.log("  Bidding Strategy: " + camp.getBiddingStrategyType());
    console.log("  Start Date: " + camp.getStartDate());
    console.log("  End Date: " + camp.getEndDate());

    // Count ad groups
    var adGroupCount = 0;
    var adGroups = camp.adGroups().get();
    while (adGroups.hasNext()) {
      adGroups.next();
      adGroupCount++;
    }
    console.log("  Ad Groups: " + adGroupCount);
  }

  // Check if this might be test/demo account data
  console.log("\n=== DATA VALIDATION ===");
  console.log("Is this real data or test data?");
  console.log("- Check if numbers are suspiciously round");
  console.log("- Check if costs align with typical CPC");
  console.log("- Check if dates make sense");
}