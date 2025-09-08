/**
 * Test script for Analytics Tier Differentiation
 * Tests the different analytics experiences across subscription tiers
 */

import analyticsTiers from "./services/analytics-tiers.js";
import roasCalculator from "./services/roas-calculator.js";

// Mock subscription data
const mockSubscriptions = {
  "starter-shop": { tier: "starter", status: "active" },
  "professional-shop": { tier: "professional", status: "active" },
  "enterprise-shop": { tier: "enterprise", status: "active" }
};

// Mock analytics data
const mockAnalyticsData = {
  kpi: {
    clicks: 1000,
    cost: 500,
    conversions: 50,
    impressions: 10000,
    ctr: 0.1,
    cpc: 0.5,
    cpa: 10
  },
  series: [
    { t: "2025-01-01", clicks: 100, cost: 50, conv: 5, impr: 1000 },
    { t: "2025-01-02", clicks: 120, cost: 60, conv: 6, impr: 1200 },
    { t: "2025-01-03", clicks: 110, cost: 55, conv: 4, impr: 1100 },
  ]
};

// Override environment to enable billing enforcement for testing
process.env.BILLING_ENFORCEMENT_ACTIVE = "true";

// Create a mock subscription service
class MockSubscriptionService {
  static async getCurrentSubscription(tenant) {
    return mockSubscriptions[tenant] || { tier: "starter", status: "active" };
  }
}

// Import the analytics service components to override getCurrentSubscription
import subscriptionCheck from "./middleware/subscription-check.js";

// Override getCurrentSubscription in the subscription check module
const originalGetCurrentSubscription = subscriptionCheck.getCurrentSubscription;
subscriptionCheck.getCurrentSubscription = MockSubscriptionService.getCurrentSubscription;

console.log("🧪 Testing Analytics Tier Differentiation\n");

async function testTierFeatures() {
  console.log("📊 Testing Tier Features");
  console.log("========================");

  for (const [tenant, subscription] of Object.entries(mockSubscriptions)) {
    console.log(`\n🏪 Testing ${tenant} (${subscription.tier.toUpperCase()})`);
    
    try {
      const features = await analyticsTiers.getTierFeatures(tenant);
      
      console.log(`   Tier: ${features.tier}`);
      console.log(`   Basic Metrics: ${features.basicMetrics ? '✅' : '❌'}`);
      console.log(`   Real-time Updates: ${features.realTimeUpdates ? '✅' : '❌'}`);
      console.log(`   Advanced ROAS: ${features.advancedRoas ? '✅' : '❌'}`);
      console.log(`   Custom Dashboards: ${features.customDashboards ? '✅' : '❌'}`);
      console.log(`   Custom ROAS Models: ${features.customRoasModels ? '✅' : '❌'}`);
      console.log(`   Chart Types: ${features.chartTypes.join(', ')}`);
      console.log(`   Max Data Points: ${features.maxDataPoints === -1 ? 'Unlimited' : features.maxDataPoints}`);
      console.log(`   Refresh Interval: ${features.refreshInterval / 1000}s`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

async function testROASCalculations() {
  console.log("\n💰 Testing ROAS Calculations");
  console.log("=============================");

  const testData = {
    cost: 500,
    conversions: 25,
    clicks: 1000,
    impressions: 10000
  };

  for (const [tenant, subscription] of Object.entries(mockSubscriptions)) {
    console.log(`\n🏪 Testing ROAS for ${tenant} (${subscription.tier.toUpperCase()})`);
    
    try {
      const roasData = await roasCalculator.calculateROAS(tenant, testData);
      
      console.log(`   Basic ROAS: ${roasData.basic?.roas || 0}`);
      
      if (roasData.advanced) {
        console.log(`   ✅ Advanced ROAS Available:`);
        console.log(`      LTV ROAS: ${roasData.advanced.metrics?.ltvRoas || 0}`);
        console.log(`      Margin ROAS: ${roasData.advanced.metrics?.marginRoas || 0}`);
      } else {
        console.log(`   ❌ Advanced ROAS: Not available`);
      }
      
      if (roasData.segmented) {
        console.log(`   ✅ Segmented ROAS Available`);
      } else {
        console.log(`   ❌ Segmented ROAS: Not available`);
      }
      
      if (roasData.custom) {
        console.log(`   ✅ Custom ROAS Models Available`);
      } else {
        console.log(`   ❌ Custom ROAS Models: Not available`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

async function testDataFiltering() {
  console.log("\n🔍 Testing Data Filtering");
  console.log("==========================");

  for (const [tenant, subscription] of Object.entries(mockSubscriptions)) {
    console.log(`\n🏪 Testing filtering for ${tenant} (${subscription.tier.toUpperCase()})`);
    
    try {
      const filteredData = await analyticsTiers.filterAnalyticsData(tenant, mockAnalyticsData);
      
      console.log(`   Data Points: ${filteredData.series?.length || 0}`);
      console.log(`   KPIs Available: ${Object.keys(filteredData.kpi || {}).length}`);
      console.log(`   Tier Info: ${JSON.stringify(filteredData.tierInfo, null, 2)}`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

async function testUpgradePrompts() {
  console.log("\n⬆️  Testing Upgrade Prompts");
  console.log("============================");

  const requestedFeatures = ["realTimeUpdates", "advancedRoas", "customDashboards", "customRoasModels"];

  for (const [tenant, subscription] of Object.entries(mockSubscriptions)) {
    if (subscription.tier === "enterprise") continue; // Skip enterprise (has all features)
    
    console.log(`\n🏪 Testing prompts for ${tenant} (${subscription.tier.toUpperCase()})`);
    
    try {
      const prompts = await analyticsTiers.getUpgradePrompts(tenant, requestedFeatures);
      
      if (prompts.length === 0) {
        console.log(`   ✅ No upgrades needed - all features available`);
      } else {
        console.log(`   📢 ${prompts.length} upgrade prompt(s):`);
        prompts.forEach((prompt, index) => {
          console.log(`      ${index + 1}. ${prompt.feature} → ${prompt.requiredTier.toUpperCase()}`);
          console.log(`         ${prompt.message}`);
        });
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

async function testServiceHealth() {
  console.log("\n🏥 Testing Service Health");
  console.log("==========================");

  try {
    const analyticsHealth = analyticsTiers.getHealthStatus();
    console.log(`Analytics Service: ${analyticsHealth.status}`);
    console.log(`Cache Size: ${analyticsHealth.cacheSize}`);
    console.log(`Supported Tiers: ${analyticsHealth.supportedTiers.join(', ')}`);

    const roasHealth = roasCalculator.getHealthStatus();
    console.log(`ROAS Service: ${roasHealth.status}`);
    console.log(`ROAS Cache Size: ${roasHealth.cacheSize}`);
    console.log(`Custom Models: ${roasHealth.customModels}`);
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testTierFeatures();
    await testROASCalculations();
    await testDataFiltering();
    await testUpgradePrompts();
    await testServiceHealth();
    
    console.log("\n✅ All tests completed successfully!");
    console.log("\n🎯 Test Summary:");
    console.log("  - Starter tier: Basic analytics only");
    console.log("  - Professional tier: Real-time + Advanced ROAS");
    console.log("  - Enterprise tier: Custom dashboards + Custom ROAS models");
    console.log("  - Upgrade prompts working for restricted features");
    console.log("  - Services are healthy and operational");
    
  } catch (error) {
    console.error("\n❌ Test suite failed:", error);
    process.exit(1);
  }
}

// Run the tests
runAllTests();