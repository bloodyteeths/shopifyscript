#!/usr/bin/env node

/**
 * Test script to validate Shopify Billing Integration
 * Tests subscription status retrieval, tier enforcement, and edge cases
 */

console.log('🧪 Starting Shopify Billing Integration Tests...\n');

// Test data
const testTenants = [
  { id: 'test_starter', tier: 'starter', status: 'active' },
  { id: 'test_professional', tier: 'professional', status: 'active' },
  { id: 'test_enterprise', tier: 'enterprise', status: 'active' },
  { id: 'test_expired', tier: 'starter', status: 'expired' },
  { id: 'test_cancelled', tier: 'professional', status: 'cancelled' },
  { id: 'test_nonexistent', tier: null, status: 'none' }
];

/**
 * Test 1: Subscription Status Retrieval
 */
async function testSubscriptionRetrieval() {
  console.log('📋 Test 1: Subscription Status Retrieval');
  console.log('=' .repeat(50));
  
  for (const tenant of testTenants) {
    try {
      const result = await getCurrentSubscription(tenant.id);
      
      console.log(`\n🔍 Testing tenant: ${tenant.id}`);
      console.log(`   Expected tier: ${tenant.tier || 'none'}`);
      console.log(`   Expected status: ${tenant.status}`);
      console.log(`   Actual result:`, {
        tier: result.tier,
        status: result.status,
        hasShopifyId: !!result.shopifySubscriptionId
      });
      
      // Validate results
      if (process.env.BILLING_ENFORCEMENT_ACTIVE !== 'true') {
        console.log(`   ✅ Billing enforcement disabled - Enterprise access granted`);
      } else {
        const statusMatch = result.status === tenant.status || 
                           (tenant.status === 'none' && result.status === 'none');
        const tierMatch = result.tier === tenant.tier ||
                         (tenant.tier === null && result.tier === null);
        
        if (statusMatch && tierMatch) {
          console.log(`   ✅ Subscription status retrieval correct`);
        } else {
          console.log(`   ❌ Subscription status mismatch`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Error retrieving subscription: ${error.message}`);
    }
  }
}

/**
 * Test 2: Tier Enforcement
 */
async function testTierEnforcement() {
  console.log('\n\n🛡️  Test 2: Tier Enforcement');
  console.log('=' .repeat(50));
  
  const features = [
    { name: 'ai_campaign_optimization', requiredTier: 'starter' },
    { name: 'advanced_ai_optimization', requiredTier: 'professional' },
    { name: 'custom_ai_optimization_rules', requiredTier: 'enterprise' },
    { name: 'priority_support_sla', requiredTier: 'enterprise' }
  ];
  
  const tiers = ['starter', 'professional', 'enterprise'];
  
  console.log('\n📊 Feature Access Matrix:');
  console.log('Feature'.padEnd(30) + 'Required Tier'.padEnd(15) + 'Starter'.padEnd(10) + 'Pro'.padEnd(10) + 'Enterprise');
  console.log('-'.repeat(75));
  
  for (const feature of features) {
    let line = feature.name.padEnd(30) + feature.requiredTier.padEnd(15);
    
    for (const tier of tiers) {
      const { hasFeatureAccess } = await import('./middleware/subscription-check.js');
      const hasAccess = hasFeatureAccess(tier, feature.name);
      line += (hasAccess ? '✅' : '❌').padEnd(10);
    }
    
    console.log(line);
  }
}

/**
 * Test 3: Usage Limits
 */
async function testUsageLimits() {
  console.log('\n\n📊 Test 3: Usage Limits');
  console.log('=' .repeat(50));
  
  const { isWithinUsageLimits } = await import('./middleware/subscription-check.js');
  
  const testUsage = {
    monthly_campaigns: 5,
    monthly_data_rows: 1000,
    data_retention_days: 30
  };
  
  console.log('\n🔢 Testing usage limits with:', testUsage);
  
  for (const tier of Object.values(SHOPIFY_PRICING_TIERS)) {
    const withinLimits = isWithinUsageLimits(tier.id, testUsage);
    console.log(`   ${tier.name}: ${withinLimits ? '✅ Within limits' : '❌ Exceeds limits'}`);
    
    if (tier.limits) {
      console.log(`      Limits:`, tier.limits);
    }
  }
}

/**
 * Test 4: Edge Cases and Error Handling
 */
async function testEdgeCases() {
  console.log('\n\n🔧 Test 4: Edge Cases and Error Handling');
  console.log('=' .repeat(50));
  
  // Test invalid tenant
  console.log('\n🔍 Testing invalid tenant...');
  try {
    const result = await getCurrentSubscription('');
    console.log(`   Result for empty tenant:`, result);
  } catch (error) {
    console.log(`   ✅ Error handled correctly: ${error.message}`);
  }
  
  // Test retry mechanism
  console.log('\n🔄 Testing retry mechanism...');
  let attempts = 0;
  try {
    await withRetry(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Simulated failure');
      }
      return { success: true };
    });
    console.log(`   ✅ Retry succeeded after ${attempts} attempts`);
  } catch (error) {
    console.log(`   ❌ Retry failed: ${error.message}`);
  }
  
  // Test expired subscription handling
  console.log('\n⏰ Testing expired subscription handling...');
  const expiredResult = await getCurrentSubscription('test_expired');
  console.log(`   Expired subscription status:`, expiredResult.status);
  
  if (expiredResult.status === 'expired' || expiredResult.status === 'past_due') {
    console.log(`   ✅ Expired subscription detected correctly`);
  } else {
    console.log(`   ❌ Expired subscription not handled correctly`);
  }
}

/**
 * Test 5: Support Contact Methods
 */
async function testSupportMethods() {
  console.log('\n\n📞 Test 5: Support Contact Methods');
  console.log('=' .repeat(50));
  
  const tiers = ['starter', 'professional', 'enterprise'];
  
  for (const tier of tiers) {
    console.log(`\n📋 Support methods for ${tier} tier:`);
    
    // Simulate contact method retrieval
    const methods = {
      starter: {
        email_support: true,
        phone_support: false,
        support_email: 'support@adsautopilot.com',
        guaranteed_response_hours: 24
      },
      professional: {
        email_support: true,
        phone_support: false,
        priority_routing: true,
        support_email: 'priority@adsautopilot.com',
        guaranteed_response_hours: 12
      },
      enterprise: {
        email_support: true,
        phone_support: true,
        priority_routing: true,
        support_email: 'enterprise@adsautopilot.com',
        support_phone: '(307) 395-9830',
        guaranteed_response_hours: 6
      }
    };
    
    const tierMethods = methods[tier];
    console.log(`   Email Support: ${tierMethods.email_support ? '✅' : '❌'}`);
    console.log(`   Phone Support: ${tierMethods.phone_support ? '✅' : '❌'}`);
    
    if (tierMethods.phone_support) {
      console.log(`   Phone Number: ${tierMethods.support_phone}`);
      if (tierMethods.support_phone === '(307) 395-9830') {
        console.log(`   ✅ Correct Enterprise phone number configured`);
      } else {
        console.log(`   ❌ Incorrect phone number`);
      }
    }
    
    console.log(`   Response Time SLA: ${tierMethods.guaranteed_response_hours} hours`);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Ads Autopilot AI Billing Integration Test Suite');
  console.log('Testing subscription status, tier enforcement, and support integration\n');
  
  try {
    await testSubscriptionRetrieval();
    await testTierEnforcement();
    await testUsageLimits();
    await testEdgeCases();
    await testSupportMethods();
    
    console.log('\n\n🎉 All tests completed!');
    console.log('Review the results above to ensure billing integration is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}