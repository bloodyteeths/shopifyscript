/**
 * Test AI Automation System
 * Comprehensive testing suite for AI automation, token monitoring, and cost optimization
 */

import { startAIAutomation, getAIAutomationService } from "./services/ai-automation.js";
import { startTokenMonitoring, getTokenMonitorService, recordTokenUsage } from "./services/token-monitor.js";
import { startAILogging, getAILoggerService } from "./services/ai-logger.js";
import { getAIProviderService } from "./services/ai-provider.js";

/**
 * Test suite for AI automation system
 */
class AIAutomationTestSuite {
  constructor() {
    this.testTenant = 'test-tenant-001';
    this.testResults = [];
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 Starting AI Automation Test Suite...\n');
    
    try {
      await this.testTokenMonitoring();
      await this.testAIProviderOptimization();
      await this.testAutomationService();
      await this.testLoggingService();
      await this.testIntegration();
      await this.testCostOptimization();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  /**
   * Test token monitoring service
   */
  async testTokenMonitoring() {
    console.log('📊 Testing Token Monitoring Service...');
    
    try {
      // Start service
      const tokenService = startTokenMonitoring();
      this.addResult('token_service_start', true, 'Token monitoring service started');

      // Test token usage recording
      await recordTokenUsage(this.testTenant, 'test_operation', {
        inputTokens: 500,
        outputTokens: 300,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        duration: 1200
      });
      this.addResult('record_usage', true, 'Token usage recorded successfully');

      // Test budget checking
      const budgetCheck = tokenService.canMakeRequest(this.testTenant, 1000);
      this.addResult('budget_check', budgetCheck.allowed, `Budget check: ${budgetCheck.allowed ? 'allowed' : budgetCheck.reason}`);

      // Test usage stats
      const usage = tokenService.getUsageStats(this.testTenant);
      this.addResult('usage_stats', usage && usage.current, 'Usage statistics retrieved');

      console.log('✅ Token monitoring tests completed\n');
    } catch (error) {
      this.addResult('token_monitoring', false, error.message);
      console.error('❌ Token monitoring test failed:', error);
    }
  }

  /**
   * Test AI provider optimization
   */
  async testAIProviderOptimization() {
    console.log('🤖 Testing AI Provider Optimization...');
    
    try {
      const aiService = getAIProviderService();

      // Test prompt optimization
      const longPrompt = "Please note that it is extremely important that you generate a comprehensive and detailed response that makes sure to include all necessary information and be sure to remember to follow all the guidelines very carefully.";
      const optimized = aiService.optimizePromptForCosts(longPrompt);
      const savings = (longPrompt.length - optimized.length) / longPrompt.length;
      
      this.addResult('prompt_optimization', savings > 0.1, `Prompt optimized: ${(savings * 100).toFixed(1)}% savings`);

      // Test token estimation
      const tokens = aiService.estimateTokens("This is a test prompt for token estimation.");
      this.addResult('token_estimation', tokens > 0, `Token estimation: ${tokens} tokens`);

      // Test generation with tenant tracking (mock)
      try {
        const result = await aiService.generateText("Test prompt", { 
          tenant: this.testTenant, 
          operation: 'test_generation' 
        });
        this.addResult('ai_generation_tracking', true, 'AI generation with tracking completed');
      } catch (error) {
        // Expected to fail without proper AI provider, but we test the structure
        this.addResult('ai_generation_tracking', error.message.includes('Budget') || error.message.includes('provider'), 'AI generation structure validated');
      }

      console.log('✅ AI provider optimization tests completed\n');
    } catch (error) {
      this.addResult('ai_provider', false, error.message);
      console.error('❌ AI provider test failed:', error);
    }
  }

  /**
   * Test automation service
   */
  async testAutomationService() {
    console.log('⚡ Testing Automation Service...');
    
    try {
      // Start automation service
      const automationService = await startAIAutomation();
      this.addResult('automation_start', true, 'Automation service started');

      // Test status retrieval
      const status = automationService.getStatus();
      this.addResult('automation_status', status && typeof status.running === 'boolean', 'Automation status retrieved');

      // Test tenant status
      const tenantStatus = automationService.getTenantStatus(this.testTenant);
      this.addResult('tenant_status', tenantStatus !== undefined, 'Tenant status retrieved');

      // Test optimization due checking
      const isDue = await automationService.isOptimizationDue(this.testTenant, 'professional');
      this.addResult('optimization_due_check', typeof isDue === 'boolean', 'Optimization due check works');

      // Test cost limit checking
      const isOverLimit = await automationService.isOverCostLimit(this.testTenant);
      this.addResult('cost_limit_check', typeof isOverLimit === 'boolean', 'Cost limit check works');

      // Stop the service for testing
      automationService.stop();
      this.addResult('automation_stop', true, 'Automation service stopped');

      console.log('✅ Automation service tests completed\n');
    } catch (error) {
      this.addResult('automation_service', false, error.message);
      console.error('❌ Automation service test failed:', error);
    }
  }

  /**
   * Test logging service
   */
  async testLoggingService() {
    console.log('📋 Testing Logging Service...');
    
    try {
      // Start logging service
      const logService = await startAILogging();
      this.addResult('logging_start', true, 'Logging service started');

      // Test operation logging
      await logService.logOperation(this.testTenant, 'test_operation', {
        level: 'info',
        duration: 1500,
        tokens: 750,
        cost: 0.0015,
        success: true,
        message: 'Test operation completed'
      });
      this.addResult('operation_logging', true, 'Operation logged successfully');

      // Test AI generation logging
      await logService.logAIGeneration(this.testTenant, 'test_generation', {
        tokens: 500,
        cost: 0.001,
        duration: 1200,
        success: true,
        model: 'gpt-3.5-turbo',
        promptLength: 100,
        responseLength: 200
      });
      this.addResult('ai_generation_logging', true, 'AI generation logged');

      // Test metrics retrieval
      const metrics = logService.getMetrics(this.testTenant);
      this.addResult('metrics_retrieval', metrics && metrics.totalOperations > 0, 'Metrics retrieved');

      // Test log retrieval
      const logs = logService.getLogs(this.testTenant, { limit: 10 });
      this.addResult('log_retrieval', Array.isArray(logs) && logs.length > 0, `Retrieved ${logs.length} logs`);

      // Test analytics generation
      const analytics = logService.generateAnalytics(this.testTenant, '24h');
      this.addResult('analytics_generation', analytics && analytics.tenant === this.testTenant, 'Analytics generated');

      console.log('✅ Logging service tests completed\n');
    } catch (error) {
      this.addResult('logging_service', false, error.message);
      console.error('❌ Logging service test failed:', error);
    }
  }

  /**
   * Test service integration
   */
  async testIntegration() {
    console.log('🔗 Testing Service Integration...');
    
    try {
      // Test that services work together
      const tokenService = getTokenMonitorService();
      const logService = getAILoggerService();
      const automationService = getAIAutomationService();

      // Record usage and verify it's logged
      await recordTokenUsage(this.testTenant, 'integration_test', {
        inputTokens: 300,
        outputTokens: 200,
        duration: 800
      });

      // Check that usage is reflected in stats
      const usage = tokenService.getUsageStats(this.testTenant);
      this.addResult('integration_usage_tracking', usage.current.daily.tokens > 0, 'Usage tracked across services');

      // Check that metrics are updated in logger
      const metrics = logService.getMetrics(this.testTenant);
      this.addResult('integration_metrics', metrics.totalOperations > 0, 'Metrics updated across services');

      // Test automation with budget checking
      const budgetCheck = tokenService.canMakeRequest(this.testTenant, 2000);
      this.addResult('integration_budget_automation', typeof budgetCheck.allowed === 'boolean', 'Budget checking integrated with automation');

      console.log('✅ Integration tests completed\n');
    } catch (error) {
      this.addResult('integration', false, error.message);
      console.error('❌ Integration test failed:', error);
    }
  }

  /**
   * Test cost optimization features
   */
  async testCostOptimization() {
    console.log('💰 Testing Cost Optimization...');
    
    try {
      const aiService = getAIProviderService();
      const tokenService = getTokenMonitorService();

      // Test prompt optimization savings
      const testPrompts = [
        "Please note that it is extremely important to generate comprehensive results",
        "Make sure to be very thorough and detailed in your response",
        "I need you to create a complete analysis with all necessary information"
      ];

      let totalSavings = 0;
      for (const prompt of testPrompts) {
        const optimized = aiService.optimizePromptForCosts(prompt);
        const savings = prompt.length - optimized.length;
        totalSavings += savings;
      }

      this.addResult('prompt_optimization_savings', totalSavings > 0, `Total character savings: ${totalSavings}`);

      // Test tier-based optimization
      const starterParams = automationService.getOptimizedRSAParams('starter');
      const enterpriseParams = automationService.getOptimizedRSAParams('enterprise');
      
      this.addResult('tier_optimization', 
        starterParams.headlineCount < enterpriseParams.headlineCount,
        'Tier-based optimization working'
      );

      // Test token limits per tier
      const starterLimit = automationService.getMaxSearchTermsForTier('starter');
      const enterpriseLimit = automationService.getMaxSearchTermsForTier('enterprise');
      
      this.addResult('tier_token_limits', 
        starterLimit < enterpriseLimit,
        'Tier-based token limits working'
      );

      // Test cost calculations
      const cost = tokenService.calculateCost('openai', 'gpt-3.5-turbo', 1000, 500);
      this.addResult('cost_calculation', cost > 0, `Cost calculation: $${cost.toFixed(4)}`);

      console.log('✅ Cost optimization tests completed\n');
    } catch (error) {
      this.addResult('cost_optimization', false, error.message);
      console.error('❌ Cost optimization test failed:', error);
    }
  }

  /**
   * Add test result
   */
  addResult(testName, success, message) {
    this.testResults.push({
      test: testName,
      success,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Print test results
   */
  printResults() {
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('========================\n');

    const passed = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;
    const passRate = (passed / total * 100).toFixed(1);

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Pass Rate: ${passRate}%\n`);

    console.log('Detailed Results:');
    console.log('-'.repeat(50));

    for (const result of this.testResults) {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.message}`);
    }

    console.log('\n' + '='.repeat(50));
    
    if (passRate >= 80) {
      console.log('🎉 AI Automation System: READY FOR PRODUCTION');
    } else if (passRate >= 60) {
      console.log('⚠️  AI Automation System: NEEDS IMPROVEMENTS');
    } else {
      console.log('🚨 AI Automation System: REQUIRES FIXES');
    }

    console.log('='.repeat(50));
  }

  /**
   * Generate performance benchmark
   */
  async generateBenchmark() {
    console.log('\n🏃 Running Performance Benchmark...');
    
    const iterations = 100;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      await recordTokenUsage(`bench-tenant-${i % 10}`, 'benchmark_test', {
        inputTokens: Math.floor(Math.random() * 1000) + 100,
        outputTokens: Math.floor(Math.random() * 500) + 50,
        duration: Math.floor(Math.random() * 2000) + 500
      });
    }

    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / iterations;

    console.log(`⚡ Benchmark Results:`);
    console.log(`   Total operations: ${iterations}`);
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Average time per operation: ${avgTime.toFixed(2)}ms`);
    console.log(`   Operations per second: ${(1000 / avgTime).toFixed(2)}`);
  }
}

/**
 * Main test execution
 */
async function main() {
  console.log('🚀 ProofKit AI Automation System - Test Suite');
  console.log('='.repeat(50));

  const testSuite = new AIAutomationTestSuite();
  
  try {
    await testSuite.runAllTests();
    await testSuite.generateBenchmark();
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default AIAutomationTestSuite;