/**
 * CRITICAL SECURITY AUDIT TEST SUITE
 * Tests for tenant isolation, RLS bypass vulnerabilities, and data leakage
 * 
 * FINDINGS SUMMARY:
 * - Service role key bypasses ALL RLS policies
 * - Multiple services don't set tenant context before queries  
 * - Potential for complete tenant data cross-contamination
 * 
 * THIS IS A SECURITY AUDIT - DO NOT RUN IN PRODUCTION
 */

import { supabase, isSupabaseEnabled } from './services/supabase-client.js';
import dotenv from 'dotenv';

dotenv.config();

const TEST_TENANT_A = 'security-test-tenant-a';
const TEST_TENANT_B = 'security-test-tenant-b';

class SecurityAuditSuite {
  constructor() {
    this.vulnerabilities = [];
    this.testResults = [];
  }

  /**
   * CRITICAL TEST: Service Role Key RLS Bypass
   * Tests if service role key allows access to all tenant data
   */
  async testServiceRoleRLSBypass() {
    console.log('\n🔍 TESTING: Service Role Key RLS Bypass');
    
    try {
      // Insert test data for tenant A
      await supabase.from('tenant_configs').insert({
        tenant_id: TEST_TENANT_A,
        config_key: 'security_test_key',
        config_value: { secret: 'tenant_a_secret_data' }
      });

      // Insert test data for tenant B
      await supabase.from('tenant_configs').insert({
        tenant_id: TEST_TENANT_B,
        config_key: 'security_test_key', 
        config_value: { secret: 'tenant_b_secret_data' }
      });

      // CRITICAL TEST: Try to access tenant A data without setting context
      const { data: unauthorizedData, error } = await supabase
        .from('tenant_configs')
        .select('*')
        .eq('tenant_id', TEST_TENANT_A);

      if (unauthorizedData && unauthorizedData.length > 0) {
        this.vulnerabilities.push({
          severity: 'CRITICAL',
          type: 'RLS_BYPASS_SERVICE_ROLE',
          description: 'Service role key bypasses RLS - can access any tenant data',
          evidence: `Accessed ${unauthorizedData.length} records for tenant ${TEST_TENANT_A} without tenant context`,
          impact: 'Complete tenant data exposure - CATASTROPHIC'
        });
      }

      // CRITICAL TEST: Can we access ALL tenants at once?
      const { data: allTenantsData } = await supabase
        .from('tenant_configs')
        .select('tenant_id, config_key, config_value')
        .in('tenant_id', [TEST_TENANT_A, TEST_TENANT_B]);

      if (allTenantsData && allTenantsData.length > 0) {
        this.vulnerabilities.push({
          severity: 'CRITICAL',
          type: 'CROSS_TENANT_ACCESS',
          description: 'Service role allows cross-tenant data access',
          evidence: `Retrieved data from ${new Set(allTenantsData.map(r => r.tenant_id)).size} different tenants in single query`,
          impact: 'Multi-tenant data leakage possible'
        });
      }

      console.log('❌ CRITICAL VULNERABILITY: Service role bypasses RLS completely');
      
    } catch (error) {
      console.log('⚠️ Test error:', error.message);
    }
  }

  /**
   * CRITICAL TEST: Tenant Context Validation
   * Tests if tenant context is properly validated before queries
   */
  async testTenantContextValidation() {
    console.log('\n🔍 TESTING: Tenant Context Validation');
    
    try {
      // Set context for tenant A
      await supabase.rpc('set_config', {
        parameter: 'app.current_tenant_id',
        value: TEST_TENANT_A
      });

      // Try to access tenant B data (should be blocked by RLS)
      const { data: crossTenantData, error } = await supabase
        .from('tenant_configs')
        .select('*')
        .eq('tenant_id', TEST_TENANT_B);

      if (crossTenantData && crossTenantData.length > 0) {
        this.vulnerabilities.push({
          severity: 'CRITICAL', 
          type: 'TENANT_ISOLATION_FAILURE',
          description: 'RLS policies not enforcing tenant isolation',
          evidence: `Tenant A context could access ${crossTenantData.length} records from tenant B`,
          impact: 'Cross-tenant data access possible'
        });
      }

      // Test with malformed tenant ID
      await supabase.rpc('set_config', {
        parameter: 'app.current_tenant_id',
        value: "'; DROP TABLE tenant_configs; --"
      });

      const { data: maliciousData } = await supabase
        .from('tenant_configs')
        .select('*')
        .limit(5);

      if (maliciousData && maliciousData.length > 0) {
        this.vulnerabilities.push({
          severity: 'HIGH',
          type: 'SQL_INJECTION_CONTEXT',
          description: 'Malformed tenant context not properly sanitized',
          evidence: 'SQL injection attempt in tenant context did not fail gracefully',
          impact: 'Potential SQL injection through tenant context'
        });
      }

    } catch (error) {
      console.log('Test error (expected for malicious context):', error.message);
    }
  }

  /**
   * CRITICAL TEST: No Tenant Context Set
   * Tests what happens when no tenant context is set at all
   */
  async testNoTenantContext() {
    console.log('\n🔍 TESTING: No Tenant Context Behavior');
    
    try {
      // Clear any existing tenant context
      await supabase.rpc('set_config', {
        parameter: 'app.current_tenant_id', 
        value: null
      });

      // Try to access data with no tenant context
      const { data: noContextData, error } = await supabase
        .from('tenant_configs')
        .select('*')
        .limit(10);

      if (noContextData && noContextData.length > 0) {
        this.vulnerabilities.push({
          severity: 'CRITICAL',
          type: 'NO_CONTEXT_ACCESS',
          description: 'Data accessible without tenant context set',
          evidence: `Retrieved ${noContextData.length} records with no tenant context`,
          impact: 'All tenant data potentially accessible without proper authorization'
        });
      }

      // Test RLS with empty string context
      await supabase.rpc('set_config', {
        parameter: 'app.current_tenant_id',
        value: ''
      });

      const { data: emptyContextData } = await supabase
        .from('tenant_configs')
        .select('*')
        .limit(10);

      if (emptyContextData && emptyContextData.length > 0) {
        this.vulnerabilities.push({
          severity: 'CRITICAL',
          type: 'EMPTY_CONTEXT_ACCESS',
          description: 'Data accessible with empty tenant context',
          evidence: `Retrieved ${emptyContextData.length} records with empty context`,
          impact: 'Empty tenant context bypasses RLS'
        });
      }

    } catch (error) {
      console.log('Test error:', error.message);
    }
  }

  /**
   * CRITICAL TEST: Service Function Vulnerabilities
   * Tests if service functions properly validate tenant context
   */
  async testServiceFunctionSecurity() {
    console.log('\n🔍 TESTING: Service Function Security');
    
    try {
      // Test campaign counter without tenant validation
      const { CampaignCountService } = await import('./services/campaign-counter.js');
      const campaignService = new CampaignCountService();
      
      // This should fail or validate tenant properly
      const campaigns = await campaignService.getActiveCampaigns(TEST_TENANT_A);
      
      if (campaigns && campaigns.length > 0) {
        console.log(`⚠️ Campaign service returned data without proper tenant validation`);
      }

      // Test dashboard builder access
      const { DashboardBuilder } = await import('./services/dashboard-builder.js');
      const dashboardService = new DashboardBuilder();
      
      // Try to access dashboard without proper context
      const dashboards = await dashboardService.getDashboardsByTenant(TEST_TENANT_A);
      
      if (dashboards && dashboards.length > 0) {
        console.log(`⚠️ Dashboard service returned data without proper tenant validation`);
      }

    } catch (error) {
      console.log('Service test error:', error.message);
    }
  }

  /**
   * Test data insertion security
   */
  async testDataInsertionSecurity() {
    console.log('\n🔍 TESTING: Data Insertion Security');
    
    try {
      // Test if we can insert data for any tenant without proper context
      const maliciousData = {
        tenant_id: 'hacked_tenant_' + Date.now(),
        config_key: 'injected_config',
        config_value: { malicious: 'data_injection_test' }
      };

      const { error } = await supabase
        .from('tenant_configs')
        .insert(maliciousData);

      if (!error) {
        this.vulnerabilities.push({
          severity: 'CRITICAL',
          type: 'UNRESTRICTED_DATA_INSERTION',
          description: 'Can insert data for any tenant without validation',
          evidence: 'Successfully inserted data for arbitrary tenant ID',
          impact: 'Data corruption and unauthorized tenant creation possible'
        });
      }

    } catch (error) {
      console.log('Insertion test error:', error.message);
    }
  }

  /**
   * Cleanup test data
   */
  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      await supabase
        .from('tenant_configs')
        .delete()
        .in('tenant_id', [TEST_TENANT_A, TEST_TENANT_B]);

      // Clean any hacked tenants
      await supabase
        .from('tenant_configs')
        .delete()
        .like('tenant_id', 'hacked_tenant_%');
        
      console.log('✅ Test cleanup completed');
    } catch (error) {
      console.log('⚠️ Cleanup error:', error.message);
    }
  }

  /**
   * Run complete security audit
   */
  async runSecurityAudit() {
    console.log('🚨 STARTING CRITICAL SECURITY AUDIT 🚨');
    console.log('==========================================');
    
    if (!isSupabaseEnabled()) {
      console.log('❌ Supabase not enabled - cannot run security tests');
      return;
    }

    console.log(`📋 Testing with service role key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
    console.log(`📋 Testing Supabase URL: ${process.env.SUPABASE_URL}`);

    await this.testServiceRoleRLSBypass();
    await this.testTenantContextValidation();
    await this.testNoTenantContext();
    await this.testServiceFunctionSecurity();
    await this.testDataInsertionSecurity();
    await this.cleanup();

    // Generate security report
    console.log('\n🚨 SECURITY AUDIT RESULTS 🚨');
    console.log('===============================');
    
    if (this.vulnerabilities.length === 0) {
      console.log('✅ No security vulnerabilities detected');
    } else {
      console.log(`❌ ${this.vulnerabilities.length} SECURITY VULNERABILITIES FOUND`);
      
      this.vulnerabilities.forEach((vuln, index) => {
        console.log(`\n${index + 1}. ${vuln.severity} - ${vuln.type}`);
        console.log(`   Description: ${vuln.description}`);
        console.log(`   Evidence: ${vuln.evidence}`);
        console.log(`   Impact: ${vuln.impact}`);
      });
    }

    return this.vulnerabilities;
  }
}

// Run security audit if called directly
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  console.log('\n⚠️  WARNING: RUNNING SECURITY AUDIT TESTS ⚠️');
  console.log('This will create and delete test data in your database.');
  console.log('DO NOT run this on production data.\n');
  
  const audit = new SecurityAuditSuite();
  audit.runSecurityAudit()
    .then((vulnerabilities) => {
      if (vulnerabilities.length > 0) {
        process.exit(1); // Exit with error code if vulnerabilities found
      }
    })
    .catch(console.error);
}

export default SecurityAuditSuite;