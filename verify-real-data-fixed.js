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

  var totalImpressions = 0;
  var totalCost = 0;
  var campaignCount = 0;

  while (campaigns.hasNext()) {
    var campaign = campaigns.next();
    campaignCount++;

    console.log("\nCampaign #" + campaignCount + ": " + campaign.getName());
    console.log("  ID: " + campaign.getId());

    // Check if enabled
    var isEnabled = campaign.isEnabled();
    var isPaused = campaign.isPaused();
    console.log("  Status: " + (isEnabled ? "ENABLED" : (isPaused ? "PAUSED" : "OTHER")));

    // Check multiple date ranges
    var ranges = ["ALL_TIME", "LAST_30_DAYS", "LAST_7_DAYS", "TODAY", "YESTERDAY"];
    for (var i = 0; i < ranges.length; i++) {
      try {
        var stats = campaign.getStatsFor(ranges[i]);
        var impr = stats.getImpressions();
        var clicks = stats.getClicks();
        var cost = stats.getCost();
        var conv = stats.getConversions();

        if (impr > 0 || ranges[i] === "ALL_TIME") {
          console.log("  [" + ranges[i] + "]:");
          console.log("    Impressions: " + impr);
          console.log("    Clicks: " + clicks);
          console.log("    Cost: $" + cost.toFixed(2));
          console.log("    Conversions: " + conv);

          if (ranges[i] === "ALL_TIME") {
            totalImpressions += impr;
            totalCost += cost;
          }

          // Check if these are suspiciously round numbers
          if (impr === 410038 || impr === 409043 || impr === 995) {
            console.log("    ⚠️ WARNING: This matches previously seen test data!");
          }

          // Check for suspicious patterns
          if (impr > 100000 && cost < 100) {
            console.log("    ⚠️ WARNING: Very high impressions with very low cost!");
          }

          if (clicks > 0 && cost === 0) {
            console.log("    ⚠️ WARNING: Clicks without cost - might be test data!");
          }
        }
      } catch(e) {
        console.log("  [" + ranges[i] + "]: Error - " + e.toString());
      }
    }

    // Get campaign creation date if possible
    try {
      console.log("  Start Date: " + campaign.getStartDate());
      console.log("  End Date: " + campaign.getEndDate());
    } catch(e) {
      console.log("  Date info not available");
    }

    // Check budget
    try {
      var budget = campaign.getBudget();
      console.log("  Daily Budget: $" + budget.getAmount());
    } catch(e) {
      console.log("  Budget info error: " + e);
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log("Total Campaigns: " + campaignCount);
  console.log("Total ALL_TIME Impressions: " + totalImpressions);
  console.log("Total ALL_TIME Cost: $" + totalCost.toFixed(2));

  if (totalImpressions > 400000 && totalCost > 4000) {
    console.log("⚠️ These look like the exact same numbers from before!");
    console.log("⚠️ Test search campaign 2: 410K impressions, $4900 cost");
  }

  // Method 2: Check if we have any RECENT activity
  console.log("\n=== RECENT ACTIVITY CHECK ===");
  var recentCampaigns = AdsApp.campaigns()
    .forDateRange("LAST_7_DAYS")
    .withCondition("Impressions > 0")
    .get();

  var recentCount = 0;
  while (recentCampaigns.hasNext()) {
    recentCampaigns.next();
    recentCount++;
  }

  console.log("Campaigns with impressions in LAST_7_DAYS: " + recentCount);

  if (recentCount === 0) {
    console.log("❌ NO RECENT ACTIVITY - Account appears inactive!");
    console.log("   This suggests the data might be old/historical only.");
  } else {
    console.log("✅ Account has recent activity");
  }

  // Method 3: Check account age and type
  console.log("\n=== ACCOUNT TYPE CHECK ===");
  console.log("Account ID: " + account.getCustomerId());
  console.log("Account Name: " + account.getName());

  // Check if this is a test account
  var accountName = account.getName().toLowerCase();
  if (accountName.indexOf("test") >= 0 || accountName.indexOf("demo") >= 0) {
    console.log("⚠️ Account name contains 'test' or 'demo'");
  }

  // Check timezone (can indicate account location/type)
  console.log("Timezone: " + account.getTimeZone());
}