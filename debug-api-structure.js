/**
 * Enhanced Debug Script - Test different ways to access Google Ads data
 */

function main() {
  console.log("=== ENHANCED GOOGLE ADS API DEBUGGING ===");

  // Test 1: Check account structure
  console.log("\n1. Account Information:");
  try {
    var currentAccount = AdsApp.currentAccount();
    console.log("  Account ID: " + currentAccount.getCustomerId());
    console.log("  Account Name: " + currentAccount.getName());
    console.log("  Currency: " + currentAccount.getCurrencyCode());
    console.log("  TimeZone: " + currentAccount.getTimeZone());
  } catch(e) {
    console.log("  Error getting account info: " + e.toString());
  }

  // Test 2: Try different date ranges with Legacy API
  console.log("\n2. Testing Different Date Ranges (Legacy API):");
  var dateRanges = ["TODAY", "YESTERDAY", "LAST_7_DAYS", "LAST_30_DAYS", "ALL_TIME"];

  for (var i = 0; i < dateRanges.length; i++) {
    var range = dateRanges[i];
    console.log("\n  Date Range: " + range);
    try {
      var campaigns = AdsApp.campaigns()
        .withCondition("Status IN ['ENABLED', 'PAUSED', 'REMOVED']")
        .forDateRange(range)
        .withLimit(1)
        .get();

      if (campaigns.hasNext()) {
        var campaign = campaigns.next();
        var stats = campaign.getStatsFor(range);

        console.log("    Campaign: " + campaign.getName());
        console.log("    Status: " + campaign.getStatus());
        console.log("    Impressions: " + stats.getImpressions());
        console.log("    Clicks: " + stats.getClicks());
        console.log("    Cost: " + stats.getCost());
        console.log("    Conversions: " + stats.getConversions());
      } else {
        console.log("    No campaigns found for this range");
      }
    } catch(e) {
      console.log("    Error: " + e.toString());
    }
  }

  // Test 3: Check if we need to use report() method
  console.log("\n3. Testing Report API:");
  try {
    var report = AdsApp.report(
      "SELECT CampaignName, Clicks, Cost, Impressions, Conversions " +
      "FROM CAMPAIGN_PERFORMANCE_REPORT " +
      "WHERE CampaignStatus IN ['ENABLED', 'PAUSED'] " +
      "DURING LAST_30_DAYS"
    );

    var rows = report.rows();
    var rowCount = 0;
    while (rows.hasNext() && rowCount < 3) {
      var row = rows.next();
      console.log("\n  Campaign: " + row['CampaignName']);
      console.log("    Clicks: " + row['Clicks']);
      console.log("    Cost: " + row['Cost']);
      console.log("    Impressions: " + row['Impressions']);
      console.log("    Conversions: " + row['Conversions']);
      rowCount++;
    }

    if (rowCount === 0) {
      console.log("  No data from report");
    }
  } catch(e) {
    console.log("  Report API error: " + e.toString());
  }

  // Test 4: Check ad groups with different selectors
  console.log("\n4. Testing Ad Groups:");
  try {
    var adGroups = AdsApp.adGroups()
      .withCondition("Status IN ['ENABLED', 'PAUSED']")
      .forDateRange("ALL_TIME")
      .withLimit(2)
      .get();

    while (adGroups.hasNext()) {
      var adGroup = adGroups.next();
      var stats = adGroup.getStatsFor("ALL_TIME");

      console.log("\n  Ad Group: " + adGroup.getName());
      console.log("    Campaign: " + adGroup.getCampaign().getName());
      console.log("    Impressions: " + stats.getImpressions());
      console.log("    Clicks: " + stats.getClicks());
      console.log("    Cost: " + stats.getCost());
    }
  } catch(e) {
    console.log("  Ad group error: " + e.toString());
  }

  // Test 5: Check keywords for any historical data
  console.log("\n5. Testing Keywords:");
  try {
    var keywords = AdsApp.keywords()
      .withCondition("Status = ENABLED")
      .forDateRange("ALL_TIME")
      .orderBy("Impressions DESC")
      .withLimit(3)
      .get();

    while (keywords.hasNext()) {
      var keyword = keywords.next();
      var stats = keyword.getStatsFor("ALL_TIME");

      console.log("\n  Keyword: " + keyword.getText());
      console.log("    Impressions: " + stats.getImpressions());
      console.log("    Clicks: " + stats.getClicks());
      console.log("    Cost: " + stats.getCost());
    }

    if (!keywords.hasNext()) {
      console.log("  No keywords found");
    }
  } catch(e) {
    console.log("  Keyword error: " + e.toString());
  }

  // Test 6: Raw GAQL with different field combinations
  console.log("\n6. Testing GAQL Field Access:");
  var query = "SELECT campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros FROM campaign WHERE segments.date DURING LAST_30_DAYS LIMIT 5";

  try {
    var result = AdsApp.search(query);
    var count = 0;

    while (result.hasNext()) {
      var row = result.next();
      count++;

      console.log("\n  Row " + count + ":");
      console.log("    Full object: " + JSON.stringify(row));

      // Try accessing metrics different ways
      if (row.metrics) {
        console.log("    row.metrics exists");
        console.log("    row.metrics.impressions: " + row.metrics.impressions);
        console.log("    row.metrics.clicks: " + row.metrics.clicks);
        console.log("    row.metrics.cost_micros: " + row.metrics.cost_micros);

        // Try converting cost_micros
        if (row.metrics.cost_micros) {
          var costInDollars = row.metrics.cost_micros / 1000000;
          console.log("    Cost in dollars: $" + costInDollars);
        }
      }
    }

    if (count === 0) {
      console.log("  No results from GAQL query");
    }
  } catch(e) {
    console.log("  GAQL error: " + e.toString());
  }
}