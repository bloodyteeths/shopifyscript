#!/usr/bin/env node
/**
 * Test Campaign Count Enforcement
 * This script tests the campaign limit enforcement for all tiers
 */

import { canCreateCampaign, recordCampaignCreation, getCampaignCount, clearInMemoryCampaigns } from './services/campaign-counter.js';
import subscriptionCheck from './middleware/subscription-check.js';
const { getCurrentSubscription } = subscriptionCheck;

async function testCampaignLimits() {
  console.log('🧪 Testing Campaign Count Enforcement');
  console.log('=====================================\n');

  // Clear all in-memory campaigns before testing
  clearInMemoryCampaigns();
  console.log('🧹 Cleared all in-memory campaigns for clean test environment\n');

  const testTenants = [
    { tenant: 'test-starter', tier: 'starter', expectedLimit: 5 },
    { tenant: 'test-professional', tier: 'professional', expectedLimit: 25 },
    { tenant: 'test-enterprise', tier: 'enterprise', expectedLimit: -1 } // unlimited
  ];

  for (const { tenant, tier, expectedLimit } of testTenants) {
    console.log(`Testing ${tier.toUpperCase()} tier (tenant: ${tenant})`);
    console.log('-'.repeat(50));
    
    // Clear campaigns for this tenant to start fresh
    clearInMemoryCampaigns(tenant);

    try {
      // Test 1: Check initial campaign count
      console.log('1. Checking initial campaign count...');
      const initialCount = await getCampaignCount(tenant);
      console.log(`   Initial count: ${initialCount}`);

      // Test 2: Check if can create campaign
      console.log('2. Checking campaign creation permission...');
      const permission = await canCreateCampaign(tenant, tier);
      console.log(`   Can create: ${permission.allowed}`);
      console.log(`   Current count: ${permission.currentCount || 0}`);
      console.log(`   Limit: ${permission.limit === -1 ? 'unlimited' : permission.limit}`);
      if (!permission.allowed) {
        console.log(`   Reason: ${permission.reason}`);
        console.log(`   Upgrade URL: ${permission.upgradeUrl}`);
      }

      // Test 3: Simulate creating campaigns up to the limit
      if (expectedLimit > 0) {
        console.log(`3. Simulating campaign creation up to limit (${expectedLimit})...`);
        
        let campaignsCreated = 0;
        const currentCount = permission.currentCount || 0;
        
        // Create campaigns up to the limit
        for (let i = currentCount; i < expectedLimit; i++) {
          const canCreate = await canCreateCampaign(tenant, tier);
          if (canCreate.allowed) {
            await recordCampaignCreation(tenant, `test_campaign_${i + 1}`, tier);
            campaignsCreated++;
            console.log(`   ✅ Created campaign ${i + 1}/${expectedLimit}`);
          } else {
            console.log(`   ❌ Cannot create campaign ${i + 1} - limit reached`);
            break;
          }
        }

        // Test 4: Try to create one more (should fail)
        console.log('4. Attempting to exceed limit...');
        const overLimitCheck = await canCreateCampaign(tenant, tier);
        if (overLimitCheck.allowed) {
          console.log(`   ❌ ERROR: Should not allow creation beyond limit!`);
        } else {
          console.log(`   ✅ Correctly blocked creation beyond limit`);
          console.log(`   Reason: ${overLimitCheck.reason}`);
        }
      } else {
        // Enterprise tier - test unlimited
        console.log('3. Testing unlimited campaigns (Enterprise)...');
        console.log('   Creating 10 test campaigns...');
        
        for (let i = 0; i < 10; i++) {
          const canCreate = await canCreateCampaign(tenant, tier);
          if (canCreate.allowed) {
            await recordCampaignCreation(tenant, `enterprise_test_campaign_${i + 1}`, tier);
            console.log(`   ✅ Created enterprise campaign ${i + 1}/10`);
          } else {
            console.log(`   ❌ ERROR: Enterprise should have unlimited access!`);
            break;
          }
        }
      }

      console.log(`\n✅ ${tier.toUpperCase()} tier test completed\n`);

    } catch (error) {
      console.error(`❌ Error testing ${tier} tier:`, error);
      console.log('');
    }
  }
}

// Run tests
testCampaignLimits()
  .then(() => {
    console.log('🎉 Campaign limits testing completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });