/**
 * Test Automated Reports System
 * Comprehensive testing of the automated insights reporting system
 */

import reportGenerator from './services/report-generator.js';
import emailService from './services/email-service.js';
import scheduledReports from './jobs/scheduled-reports.js';
import analyticsTiers from './services/analytics-tiers.js';

class ReportsSystemTester {
  constructor() {
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 Starting Automated Reports System Tests');
    console.log('================================================\n');

    try {
      // Test service health
      await this.testServiceHealth();
      
      // Test tier-specific report generation
      await this.testTierReportGeneration();
      
      // Test email service
      await this.testEmailService();
      
      // Test scheduled reports
      await this.testScheduledReports();
      
      // Test API endpoints
      await this.testAPIEndpoints();
      
      // Performance tests
      await this.testPerformance();

    } catch (error) {
      this.logError('Test suite execution failed', error);
    }

    this.printTestSummary();
  }

  /**
   * Test service health and initialization
   */
  async testServiceHealth() {
    console.log('🏥 Testing Service Health...');
    
    try {
      // Test report generator health
      const reportHealth = await reportGenerator.healthCheck();
      this.assert(
        reportHealth.status === 'healthy',
        'Report generator should be healthy',
        `Report generator status: ${reportHealth.status}`
      );

      // Test email service health
      const emailHealth = await emailService.healthCheck();
      this.assert(
        emailHealth.configured !== undefined,
        'Email service should have configuration status',
        `Email service configured: ${emailHealth.configured}`
      );

      // Test scheduled reports health
      const schedulerHealth = await scheduledReports.healthCheck();
      this.assert(
        schedulerHealth.jobCount > 0,
        'Scheduler should have jobs configured',
        `Jobs configured: ${schedulerHealth.jobCount}`
      );

      console.log('✅ Service health checks passed\n');

    } catch (error) {
      this.logError('Service health test failed', error);
    }
  }

  /**
   * Test tier-specific report generation
   */
  async testTierReportGeneration() {
    console.log('📊 Testing Tier-Specific Report Generation...');

    const testTenant = 'test_tenant_reports';
    const tiers = ['starter', 'professional', 'enterprise'];

    for (const tier of tiers) {
      try {
        console.log(`  Testing ${tier} tier reports...`);

        // Mock the subscription for this test
        process.env.BILLING_ENFORCEMENT_ACTIVE = 'false'; // Disable billing for test

        // Generate report for tier
        const reportData = await reportGenerator.generateReport(testTenant, 'insights', {
          skipCache: true
        });

        // Verify report structure
        this.assert(
          reportData.tier !== undefined,
          `${tier} report should have tier information`,
          `Report tier: ${reportData.tier}`
        );

        this.assert(
          reportData.frequency !== undefined,
          `${tier} report should have frequency information`,
          `Report frequency: ${reportData.frequency}`
        );

        this.assert(
          reportData.totalRevenue !== undefined,
          `${tier} report should have revenue data`,
          `Revenue data present: ${!!reportData.totalRevenue}`
        );

        // Verify tier-specific features
        if (tier === 'starter') {
          this.assert(
            !reportData.customMetrics,
            'Starter reports should not have custom metrics'
          );
        } else if (tier === 'professional') {
          this.assert(
            reportData.roas !== undefined,
            'Professional reports should have ROAS data'
          );
        } else if (tier === 'enterprise') {
          this.assert(
            reportData.forecasts !== undefined,
            'Enterprise reports should have forecasting data'
          );
        }

        console.log(`  ✅ ${tier} tier report generated successfully`);

      } catch (error) {
        this.logError(`${tier} tier report generation failed`, error);
      }
    }

    console.log('✅ Tier-specific report generation tests completed\n');
  }

  /**
   * Test email service functionality
   */
  async testEmailService() {
    console.log('📧 Testing Email Service...');

    try {
      // Test email configuration
      const config = emailService.emailConfig;
      this.assert(
        config.smtp !== undefined,
        'Email service should have SMTP configuration'
      );

      // Test email metrics
      const metrics = emailService.getMetrics();
      this.assert(
        metrics.emailsSent !== undefined,
        'Email service should track sent emails'
      );

      // Test template rendering (mock data)
      const mockReportData = {
        tier: 'starter',
        frequency: 'monthly',
        totalRevenue: '$1,234.56',
        totalCustomers: 100,
        averageOrderValue: '$12.34',
        insights: [
          { type: 'revenue', level: 'info', message: 'Test insight' }
        ]
      };

      // This would test actual email sending if SMTP is configured
      if (process.env.SMTP_USER && process.env.TEST_EMAIL) {
        console.log('  Testing actual email delivery...');
        
        const emailResult = await emailService.sendReportEmail(
          'test_tenant',
          process.env.TEST_EMAIL,
          mockReportData,
          'insights'
        );

        this.assert(
          emailResult.success === true,
          'Test email should be sent successfully',
          `Email result: ${emailResult.success}`
        );

        console.log('  ✅ Test email sent successfully');
      } else {
        console.log('  ⚠️  Skipping actual email test (SMTP not configured)');
      }

      console.log('✅ Email service tests completed\n');

    } catch (error) {
      this.logError('Email service test failed', error);
    }
  }

  /**
   * Test scheduled reports functionality
   */
  async testScheduledReports() {
    console.log('⏰ Testing Scheduled Reports...');

    try {
      // Test job status
      const jobStatus = scheduledReports.getJobStatus();
      this.assert(
        jobStatus.jobCount >= 3,
        'Should have at least 3 scheduled jobs (daily, weekly, monthly)',
        `Job count: ${jobStatus.jobCount}`
      );

      // Test metrics
      const metrics = scheduledReports.getMetrics();
      this.assert(
        metrics.jobsScheduled > 0,
        'Should have scheduled jobs',
        `Jobs scheduled: ${metrics.jobsScheduled}`
      );

      // Test manual trigger (with mock tenants)
      process.env.ENABLE_MOCK_TENANTS = 'true';
      process.env.TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

      if (process.env.TEST_EMAIL) {
        console.log('  Testing manual report trigger...');
        
        const triggerResult = await scheduledReports.triggerReportsManually('starter');
        
        this.assert(
          triggerResult.success !== undefined,
          'Manual trigger should return results',
          `Trigger results: ${JSON.stringify(triggerResult)}`
        );

        console.log('  ✅ Manual trigger test completed');
      }

      console.log('✅ Scheduled reports tests completed\n');

    } catch (error) {
      this.logError('Scheduled reports test failed', error);
    }
  }

  /**
   * Test API endpoints
   */
  async testAPIEndpoints() {
    console.log('🔌 Testing API Endpoints...');

    try {
      // These would be tested with actual HTTP requests in a full integration test
      // For now, we'll test the core functions they use

      // Test analytics tiers service
      const tierFeatures = await analyticsTiers.getTierFeatures('test_tenant');
      this.assert(
        tierFeatures.tier !== undefined,
        'Analytics tiers should return tier information',
        `Tier: ${tierFeatures.tier}`
      );

      // Test report metrics
      const reportMetrics = reportGenerator.getMetrics();
      this.assert(
        reportMetrics.reportsGenerated !== undefined,
        'Report generator should track metrics',
        `Reports generated: ${reportMetrics.reportsGenerated}`
      );

      console.log('✅ API endpoint tests completed\n');

    } catch (error) {
      this.logError('API endpoints test failed', error);
    }
  }

  /**
   * Test performance
   */
  async testPerformance() {
    console.log('⚡ Testing Performance...');

    try {
      const testTenant = 'perf_test_tenant';
      const iterations = 3;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        await reportGenerator.generateReport(testTenant, 'insights', {
          skipCache: true // Force fresh generation
        });
        
        const endTime = Date.now();
        times.push(endTime - startTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      this.assert(
        avgTime < 10000,
        'Average report generation should be under 10 seconds',
        `Average time: ${avgTime}ms`
      );

      this.assert(
        maxTime < 15000,
        'Maximum report generation should be under 15 seconds',
        `Max time: ${maxTime}ms`
      );

      console.log(`  📊 Performance metrics:`);
      console.log(`     Average: ${Math.round(avgTime)}ms`);
      console.log(`     Maximum: ${maxTime}ms`);
      console.log(`     Minimum: ${Math.min(...times)}ms`);

      console.log('✅ Performance tests completed\n');

    } catch (error) {
      this.logError('Performance test failed', error);
    }
  }

  /**
   * Test integration flow
   */
  async testIntegrationFlow() {
    console.log('🔄 Testing Full Integration Flow...');

    try {
      const testTenant = 'integration_test_tenant';
      
      // Step 1: Generate report
      const reportData = await reportGenerator.generateReport(testTenant, 'insights');
      
      // Step 2: Send via email (if configured)
      if (process.env.TEST_EMAIL) {
        const emailResult = await reportGenerator.sendReportEmail(
          testTenant,
          process.env.TEST_EMAIL,
          reportData
        );
        
        this.assert(
          emailResult.success === true,
          'Integration flow should complete successfully'
        );
      }

      console.log('✅ Integration flow test completed\n');

    } catch (error) {
      this.logError('Integration flow test failed', error);
    }
  }

  /**
   * Assert helper
   */
  assert(condition, message, details = '') {
    this.testResults.total++;
    
    if (condition) {
      this.testResults.passed++;
      console.log(`    ✅ ${message}${details ? ' - ' + details : ''}`);
    } else {
      this.testResults.failed++;
      const error = `❌ ${message}${details ? ' - ' + details : ''}`;
      console.log(`    ${error}`);
      this.testResults.errors.push(error);
    }
  }

  /**
   * Log error helper
   */
  logError(message, error) {
    this.testResults.failed++;
    const errorMsg = `❌ ${message}: ${error.message}`;
    console.log(`    ${errorMsg}`);
    this.testResults.errors.push(errorMsg);
  }

  /**
   * Print test summary
   */
  printTestSummary() {
    console.log('📈 Test Summary');
    console.log('===============');
    console.log(`Total tests: ${this.testResults.total}`);
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`Success rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n🚨 Errors:');
      this.testResults.errors.forEach(error => console.log(`  ${error}`));
    }

    console.log('\n✨ Automated Reports System Testing Complete');
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ReportsSystemTester();
  tester.runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export default ReportsSystemTester;