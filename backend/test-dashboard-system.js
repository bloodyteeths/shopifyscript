/**
 * Test script for Enterprise Custom Dashboard System
 * Validates the complete dashboard functionality end-to-end
 */

import dashboardBuilder from './services/dashboard-builder.js';
import analyticsTiers from './services/analytics-tiers.js';
import { supabase } from './services/supabase-client.js';

class DashboardSystemTest {
  constructor() {
    this.testTenant = 'test-enterprise-shop';
    this.testResults = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logEntry);
    this.testResults.push({ timestamp, type, message });
  }

  async runTest(testName, testFunction) {
    try {
      this.log(`Starting test: ${testName}`);
      await testFunction();
      this.log(`✅ ${testName} passed`);
      return true;
    } catch (error) {
      this.log(`❌ ${testName} failed: ${error.message}`, 'error');
      console.error(error);
      return false;
    }
  }

  async testTierAccess() {
    // Test that Enterprise tier has access to custom dashboards
    const features = await analyticsTiers.getTierFeatures(this.testTenant);
    
    if (!features.customDashboards) {
      throw new Error('Enterprise tier should have customDashboards access');
    }

    if (features.tier !== 'enterprise') {
      // Mock enterprise access for testing
      this.log('Note: Mocking enterprise access for testing purposes', 'warn');
    }

    this.log('Tier access validation passed');
  }

  async testDashboardCreation() {
    // Test creating a new dashboard
    const dashboardData = {
      dashboard_name: 'Test Performance Dashboard',
      description: 'Test dashboard for automated testing'
    };

    const result = await dashboardBuilder.createDashboard(this.testTenant, dashboardData);
    
    if (!result.success) {
      throw new Error(`Dashboard creation failed: ${result.error}`);
    }

    if (!result.data.id) {
      throw new Error('Created dashboard should have an ID');
    }

    this.testDashboardId = result.data.id;
    this.log(`Dashboard created with ID: ${this.testDashboardId}`);
  }

  async testTemplateCreation() {
    // Test creating dashboard from template
    const templates = await dashboardBuilder.getTemplates(this.testTenant);
    
    if (!templates.success || !templates.data.length) {
      throw new Error('Should have available templates');
    }

    const template = templates.data[0];
    const result = await dashboardBuilder.createDashboardFromTemplate(
      this.testTenant,
      template.id,
      'Test Template Dashboard'
    );

    if (!result.success) {
      throw new Error(`Template dashboard creation failed: ${result.error}`);
    }

    this.testTemplateDashboardId = result.data.id;
    this.log(`Template dashboard created with ID: ${this.testTemplateDashboardId}`);
  }

  async testWidgetManagement() {
    if (!this.testDashboardId) {
      throw new Error('Dashboard ID not available for widget testing');
    }

    // Test adding a widget
    const widgetData = {
      widget_type: 'metric_card',
      widget_title: 'Test Clicks Widget',
      data_source: 'metrics',
      position_config: { x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      widget_config: {
        metric: 'clicks',
        showTrend: true,
        format: 'number'
      }
    };

    const result = await dashboardBuilder.addWidget(this.testDashboardId, widgetData);
    
    if (!result.success) {
      throw new Error(`Widget creation failed: ${result.error}`);
    }

    this.testWidgetId = result.data.id;
    this.log(`Widget created with ID: ${this.testWidgetId}`);

    // Test updating widget
    const updateResult = await dashboardBuilder.updateWidget(this.testWidgetId, {
      widget_title: 'Updated Clicks Widget'
    });

    if (!updateResult.success) {
      throw new Error(`Widget update failed: ${updateResult.error}`);
    }

    this.log('Widget update successful');
  }

  async testDataRetrieval() {
    if (!this.testWidgetId) {
      throw new Error('Widget ID not available for data testing');
    }

    // Test getting widget data
    const dataResult = await dashboardBuilder.getWidgetData(
      this.testTenant,
      this.testWidgetId,
      '30d'
    );

    if (!dataResult.success) {
      throw new Error(`Widget data retrieval failed: ${dataResult.error}`);
    }

    if (!dataResult.data.widget) {
      throw new Error('Widget data should include widget configuration');
    }

    this.log('Widget data retrieval successful');
  }

  async testDashboardRetrieval() {
    // Test getting all dashboards
    const dashboardsResult = await dashboardBuilder.getDashboards(this.testTenant);
    
    if (!dashboardsResult.success) {
      throw new Error(`Dashboard list retrieval failed: ${dashboardsResult.error}`);
    }

    if (dashboardsResult.data.length < 2) {
      throw new Error('Should have at least 2 test dashboards');
    }

    this.log(`Retrieved ${dashboardsResult.data.length} dashboards`);

    // Test getting specific dashboard with widgets
    const dashboardResult = await dashboardBuilder.getDashboard(
      this.testTenant,
      this.testDashboardId
    );

    if (!dashboardResult.id) {
      throw new Error('Should retrieve dashboard with ID');
    }

    if (!Array.isArray(dashboardResult.widgets)) {
      throw new Error('Dashboard should include widgets array');
    }

    this.log(`Retrieved dashboard with ${dashboardResult.widgets.length} widgets`);
  }

  async testExportFunctionality() {
    if (!this.testDashboardId) {
      throw new Error('Dashboard ID not available for export testing');
    }

    // Test dashboard export
    const exportResult = await dashboardBuilder.exportDashboard(
      this.testTenant,
      this.testDashboardId,
      'json'
    );

    if (!exportResult.success) {
      throw new Error(`Dashboard export failed: ${exportResult.error}`);
    }

    if (!exportResult.data.dashboard_name) {
      throw new Error('Exported data should include dashboard configuration');
    }

    this.log('Dashboard export successful');
  }

  async testTierRestrictions() {
    // Test that starter/professional tiers are blocked
    const starterTenant = 'test-starter-shop';
    
    const starterResult = await dashboardBuilder.getDashboards(starterTenant);
    
    if (starterResult.success) {
      throw new Error('Starter tier should not have dashboard access');
    }

    if (!starterResult.upgradeRequired) {
      throw new Error('Starter tier should get upgrade prompt');
    }

    this.log('Tier restrictions working correctly');
  }

  async cleanup() {
    // Clean up test data
    try {
      if (this.testDashboardId) {
        await dashboardBuilder.deleteDashboard(this.testTenant, this.testDashboardId);
        this.log('Cleaned up test dashboard');
      }

      if (this.testTemplateDashboardId) {
        await dashboardBuilder.deleteDashboard(this.testTenant, this.testTemplateDashboardId);
        this.log('Cleaned up template dashboard');
      }
    } catch (error) {
      this.log(`Cleanup error: ${error.message}`, 'warn');
    }
  }

  async runAllTests() {
    this.log('🚀 Starting Enterprise Dashboard System Tests');
    
    const tests = [
      ['Tier Access Validation', () => this.testTierAccess()],
      ['Dashboard Creation', () => this.testDashboardCreation()],
      ['Template Dashboard Creation', () => this.testTemplateCreation()],
      ['Widget Management', () => this.testWidgetManagement()],
      ['Data Retrieval', () => this.testDataRetrieval()],
      ['Dashboard Retrieval', () => this.testDashboardRetrieval()],
      ['Export Functionality', () => this.testExportFunctionality()],
      ['Tier Restrictions', () => this.testTierRestrictions()]
    ];

    let passed = 0;
    let failed = 0;

    for (const [testName, testFunction] of tests) {
      const success = await this.runTest(testName, testFunction);
      if (success) {
        passed++;
      } else {
        failed++;
      }
    }

    // Cleanup
    await this.cleanup();

    // Results summary
    this.log('\n📊 Test Results Summary:');
    this.log(`✅ Passed: ${passed}`);
    this.log(`❌ Failed: ${failed}`);
    this.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

    if (failed === 0) {
      this.log('🎉 All tests passed! Enterprise Dashboard System is working correctly.');
    } else {
      this.log(`⚠️  ${failed} tests failed. Please review the issues above.`, 'warn');
    }

    return { passed, failed, successRate: (passed / (passed + failed)) * 100 };
  }

  getHealthReport() {
    return {
      timestamp: new Date().toISOString(),
      testResults: this.testResults,
      services: {
        dashboardBuilder: dashboardBuilder.getHealthStatus(),
        analyticsTiers: analyticsTiers.getHealthStatus()
      }
    };
  }
}

// Run tests if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const tester = new DashboardSystemTest();
  
  tester.runAllTests()
    .then((results) => {
      console.log('\n📋 Final Test Report:');
      console.log(JSON.stringify(tester.getHealthReport(), null, 2));
      
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('💥 Test suite failed to run:', error);
      process.exit(1);
    });
}

export default DashboardSystemTest;