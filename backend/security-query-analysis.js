/**
 * DATABASE QUERY SECURITY ANALYSIS
 * Analyzes all database queries for proper tenant context usage
 * 
 * CRITICAL FINDINGS:
 * - Multiple services bypass tenant context setting
 * - Service role key usage negates RLS policies
 * - Inconsistent security patterns across codebase
 */

import fs from 'fs';
import path from 'path';

class DatabaseQueryAnalyzer {
  constructor() {
    this.vulnerableQueries = [];
    this.secureQueries = [];
    this.analysisResults = {
      totalQueriesFound: 0,
      vulnerableQueries: 0,
      secureQueries: 0,
      criticalIssues: []
    };
  }

  /**
   * Analyze a JavaScript file for database query patterns
   */
  analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      let isInQueryBlock = false;
      let currentQuery = {
        file: filePath,
        startLine: 0,
        queryType: '',
        hasSetConfig: false,
        hasRpc: false,
        isVulnerable: false,
        context: []
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNum = i + 1;

        // Look for database queries
        if (line.includes('.from(\'') || line.includes('.from("')) {
          isInQueryBlock = true;
          currentQuery = {
            file: filePath,
            startLine: lineNum,
            queryType: this.extractTableName(line),
            hasSetConfig: false,
            hasRpc: false,
            isVulnerable: false,
            context: [line]
          };

          // Check previous 10 lines for tenant context setting
          const contextLines = Math.max(0, i - 10);
          for (let j = contextLines; j < i; j++) {
            const prevLine = lines[j].trim();
            if (prevLine.includes('set_config') || prevLine.includes('app.current_tenant_id')) {
              currentQuery.hasSetConfig = true;
            }
            if (prevLine.includes('.rpc(\'set_config\'') || prevLine.includes('.rpc("set_config"')) {
              currentQuery.hasRpc = true;
            }
          }

          this.analysisResults.totalQueriesFound++;
        }

        // Continue collecting query context
        if (isInQueryBlock) {
          currentQuery.context.push(line);

          // Check for query termination
          if (line.includes(';') || line.includes('})') || 
              (line.includes('.') && !line.includes('.from') && !line.includes('.select') && 
               !line.includes('.eq') && !line.includes('.insert') && !line.includes('.update') && 
               !line.includes('.delete') && !line.includes('.upsert'))) {
            
            // Analyze completed query
            this.analyzeQuery(currentQuery);
            isInQueryBlock = false;
          }
        }
      }

    } catch (error) {
      console.error(`Error analyzing file ${filePath}:`, error.message);
    }
  }

  /**
   * Extract table name from query line
   */
  extractTableName(line) {
    const match = line.match(/\.from\(['"](.*?)['"\]]/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Analyze individual query for security issues
   */
  analyzeQuery(query) {
    // Critical: Check if query accesses tenant-specific tables without context
    const tenantTables = [
      'tenant_configs', 'tenant_metrics', 'search_terms', 'run_logs',
      'tenant_subscriptions', 'campaign_configs', 'rsa_assets',
      'support_tickets', 'support_ticket_messages', 'custom_dashboards',
      'dashboard_widgets', 'custom_kpis', 'dashboard_access_logs',
      'automation_rules', 'custom_bid_strategies', 'automation_execution_logs',
      'advanced_reports', 'scheduled_reports'
    ];

    const isAccessingTenantData = tenantTables.includes(query.queryType);
    const hasProperContext = query.hasSetConfig || query.hasRpc;

    if (isAccessingTenantData && !hasProperContext) {
      query.isVulnerable = true;
      query.vulnerability = 'NO_TENANT_CONTEXT';
      query.severity = 'CRITICAL';
      query.description = `Accessing tenant table '${query.queryType}' without setting tenant context`;
      
      this.vulnerableQueries.push(query);
      this.analysisResults.vulnerableQueries++;

      // Add to critical issues if it's a particularly sensitive table
      if (['tenant_configs', 'tenant_metrics', 'support_tickets'].includes(query.queryType)) {
        this.analysisResults.criticalIssues.push({
          file: query.file,
          line: query.startLine,
          table: query.queryType,
          issue: 'Direct access to sensitive tenant data without RLS context',
          severity: 'CRITICAL'
        });
      }
    } else if (isAccessingTenantData && hasProperContext) {
      this.secureQueries.push(query);
      this.analysisResults.secureQueries++;
    }
  }

  /**
   * Scan all JavaScript files in the backend directory
   */
  scanBackendDirectory(backendPath = './') {
    console.log('🔍 Scanning backend directory for database queries...\n');

    const scanDirectory = (dir) => {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (file.endsWith('.js') && !file.includes('test') && !file.includes('spec')) {
          this.analyzeFile(fullPath);
        }
      });
    };

    scanDirectory(backendPath);
  }

  /**
   * Generate security analysis report
   */
  generateReport() {
    console.log('🚨 DATABASE QUERY SECURITY ANALYSIS REPORT 🚨');
    console.log('===============================================\n');

    console.log(`📊 ANALYSIS SUMMARY:`);
    console.log(`   Total Queries Found: ${this.analysisResults.totalQueriesFound}`);
    console.log(`   Vulnerable Queries: ${this.analysisResults.vulnerableQueries}`);
    console.log(`   Secure Queries: ${this.analysisResults.secureQueries}`);
    console.log(`   Critical Issues: ${this.analysisResults.criticalIssues.length}\n`);

    if (this.analysisResults.criticalIssues.length > 0) {
      console.log('🚨 CRITICAL SECURITY ISSUES:');
      console.log('============================');
      
      this.analysisResults.criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.severity} - ${issue.table.toUpperCase()}`);
        console.log(`   File: ${issue.file}:${issue.line}`);
        console.log(`   Issue: ${issue.issue}\n`);
      });
    }

    if (this.vulnerableQueries.length > 0) {
      console.log('⚠️  VULNERABLE QUERIES DETAILS:');
      console.log('==============================');
      
      this.vulnerableQueries.slice(0, 10).forEach((query, index) => {
        console.log(`${index + 1}. ${query.file}:${query.startLine}`);
        console.log(`   Table: ${query.queryType}`);
        console.log(`   Vulnerability: ${query.description}`);
        console.log(`   Query Context: ${query.context[0]}\n`);
      });

      if (this.vulnerableQueries.length > 10) {
        console.log(`   ... and ${this.vulnerableQueries.length - 10} more vulnerable queries\n`);
      }
    }

    // Security score calculation
    const securityScore = this.analysisResults.totalQueriesFound > 0 
      ? Math.round((this.analysisResults.secureQueries / this.analysisResults.totalQueriesFound) * 100)
      : 0;

    console.log(`📈 SECURITY SCORE: ${securityScore}%`);
    
    if (securityScore < 50) {
      console.log('🚨 CRITICAL: Security score below 50% - IMMEDIATE ACTION REQUIRED');
    } else if (securityScore < 80) {
      console.log('⚠️  WARNING: Security score below 80% - Improvements needed');
    } else {
      console.log('✅ Good: Security practices mostly followed');
    }

    return {
      score: securityScore,
      vulnerableQueries: this.vulnerableQueries,
      criticalIssues: this.analysisResults.criticalIssues,
      summary: this.analysisResults
    };
  }
}

// Main execution
const analyzer = new DatabaseQueryAnalyzer();

// Scan the backend directory
analyzer.scanBackendDirectory('./');

// Generate and display report  
const report = analyzer.generateReport();

// Export for use in other modules
export default {
  DatabaseQueryAnalyzer,
  report
};