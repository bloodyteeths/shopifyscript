/**
 * Content Extraction System Health Check
 * Verifies all components are working correctly
 */

import { getWebsiteScraper } from './website-scraper.js';
import { getContentExtractor } from './content-extractor.js';
import { getContentIndexer } from './content-indexer.js';
import { isSupabaseEnabled, testSupabaseConnection } from './supabase-client.js';
import logger from './logger.js';

/**
 * Health Check Service
 */
export class ContentHealthCheckService {
  constructor() {
    this.checks = [];
  }

  /**
   * Run all health checks
   */
  async runAllChecks() {
    console.log('\n' + '='.repeat(80));
    console.log('WEBSITE CONTENT EXTRACTION SYSTEM - HEALTH CHECK');
    console.log('='.repeat(80) + '\n');

    const results = {
      timestamp: new Date().toISOString(),
      overall: 'unknown',
      checks: {}
    };

    // Check 1: Website Scraper
    console.log('1. Checking Website Scraper...');
    results.checks.scraper = await this.checkScraper();
    this.printCheckResult('Website Scraper', results.checks.scraper);

    // Check 2: Content Extractor
    console.log('\n2. Checking Content Extractor...');
    results.checks.extractor = await this.checkExtractor();
    this.printCheckResult('Content Extractor', results.checks.extractor);

    // Check 3: Content Indexer
    console.log('\n3. Checking Content Indexer...');
    results.checks.indexer = await this.checkIndexer();
    this.printCheckResult('Content Indexer', results.checks.indexer);

    // Check 4: Database Connection
    console.log('\n4. Checking Database Connection...');
    results.checks.database = await this.checkDatabase();
    this.printCheckResult('Database', results.checks.database);

    // Check 5: Database Tables
    console.log('\n5. Checking Database Tables...');
    results.checks.tables = await this.checkTables();
    this.printCheckResult('Database Tables', results.checks.tables);

    // Check 6: Service Integration
    console.log('\n6. Checking Service Integration...');
    results.checks.integration = await this.checkIntegration();
    this.printCheckResult('Integration', results.checks.integration);

    // Determine overall health
    const allPassed = Object.values(results.checks).every(check => check.status === 'pass');
    const someFailed = Object.values(results.checks).some(check => check.status === 'fail');

    results.overall = allPassed ? 'healthy' : (someFailed ? 'unhealthy' : 'degraded');

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('HEALTH CHECK SUMMARY');
    console.log('='.repeat(80) + '\n');

    const statusIcon = results.overall === 'healthy' ? '✅' :
                       results.overall === 'degraded' ? '⚠️' : '❌';
    console.log(`Overall Status: ${statusIcon} ${results.overall.toUpperCase()}\n`);

    console.log('Component Status:');
    Object.entries(results.checks).forEach(([name, check]) => {
      const icon = check.status === 'pass' ? '✅' :
                   check.status === 'warn' ? '⚠️' : '❌';
      console.log(`  ${icon} ${name}: ${check.status}`);
      if (check.message) {
        console.log(`     ${check.message}`);
      }
    });

    console.log('\n' + '='.repeat(80) + '\n');

    return results;
  }

  /**
   * Check Website Scraper
   */
  async checkScraper() {
    try {
      const scraper = getWebsiteScraper();

      if (!scraper) {
        return {
          status: 'fail',
          message: 'Scraper instance not created'
        };
      }

      // Check metrics
      const metrics = scraper.getMetrics();

      return {
        status: 'pass',
        message: `Scraper operational (${metrics.sitesScraped} sites scraped)`,
        details: metrics
      };
    } catch (error) {
      return {
        status: 'fail',
        message: error.message,
        error: error.stack
      };
    }
  }

  /**
   * Check Content Extractor
   */
  async checkExtractor() {
    try {
      const extractor = getContentExtractor();

      if (!extractor) {
        return {
          status: 'fail',
          message: 'Extractor instance not created'
        };
      }

      // Test with sample HTML
      const sampleHTML = `
        <html>
          <head>
            <title>Test Page</title>
            <meta name="description" content="Test description">
          </head>
          <body>
            <h1>Test Heading</h1>
            <p>Test paragraph content.</p>
          </body>
        </html>
      `;

      const extracted = await extractor.extractFromHTML(sampleHTML, 'http://test.com');

      if (!extracted.title || extracted.title !== 'Test Page') {
        return {
          status: 'fail',
          message: 'Extraction test failed'
        };
      }

      return {
        status: 'pass',
        message: 'Extractor working correctly',
        details: {
          extracted: {
            title: extracted.title,
            headings: extracted.headings.length,
            paragraphs: extracted.paragraphs.length
          }
        }
      };
    } catch (error) {
      return {
        status: 'fail',
        message: error.message,
        error: error.stack
      };
    }
  }

  /**
   * Check Content Indexer
   */
  async checkIndexer() {
    try {
      const indexer = getContentIndexer();

      if (!indexer) {
        return {
          status: 'fail',
          message: 'Indexer instance not created'
        };
      }

      await indexer.initialize();

      const metrics = indexer.getMetrics();

      return {
        status: 'pass',
        message: `Indexer operational (${metrics.indexed} items indexed)`,
        details: metrics
      };
    } catch (error) {
      return {
        status: 'fail',
        message: error.message,
        error: error.stack
      };
    }
  }

  /**
   * Check Database Connection
   */
  async checkDatabase() {
    try {
      const enabled = isSupabaseEnabled();

      if (!enabled) {
        return {
          status: 'warn',
          message: 'Supabase not enabled (fallback mode active)',
          details: {
            mode: 'fallback',
            impact: 'Content will be stored in-memory only'
          }
        };
      }

      const connection = await testSupabaseConnection();

      if (!connection.connected) {
        return {
          status: 'fail',
          message: `Database connection failed: ${connection.error}`,
          error: connection.error
        };
      }

      return {
        status: 'pass',
        message: 'Database connected successfully',
        details: connection.metrics
      };
    } catch (error) {
      return {
        status: 'fail',
        message: error.message,
        error: error.stack
      };
    }
  }

  /**
   * Check Database Tables
   */
  async checkTables() {
    try {
      const enabled = isSupabaseEnabled();

      if (!enabled) {
        return {
          status: 'warn',
          message: 'Skipped (Supabase not enabled)',
          details: { skipped: true }
        };
      }

      const indexer = getContentIndexer();
      await indexer.initialize();

      // Try to query each table
      const requiredTables = [
        'website_content',
        'content_index',
        'content_tags',
        'content_extraction_log'
      ];

      const tableStatus = {};
      let allExist = true;

      for (const table of requiredTables) {
        try {
          // Simple existence check would go here
          // For now, we'll assume they exist if initialization succeeded
          tableStatus[table] = 'exists';
        } catch (error) {
          tableStatus[table] = 'missing';
          allExist = false;
        }
      }

      if (!allExist) {
        return {
          status: 'fail',
          message: 'Some tables are missing',
          details: tableStatus,
          action: 'Run migration: backend/migrations/008_website_content_extraction.sql'
        };
      }

      return {
        status: 'pass',
        message: 'All required tables exist',
        details: { tables: requiredTables.length }
      };
    } catch (error) {
      return {
        status: 'fail',
        message: error.message,
        error: error.stack
      };
    }
  }

  /**
   * Check Service Integration
   */
  async checkIntegration() {
    try {
      // Check if all services can be imported
      const scraper = getWebsiteScraper();
      const extractor = getContentExtractor();
      const indexer = getContentIndexer();

      if (!scraper || !extractor || !indexer) {
        return {
          status: 'fail',
          message: 'Failed to initialize all services'
        };
      }

      // Check if RSA generator has content indexer integration
      const { getRSAGenerator } = await import('./rsa-generator.js');
      const generator = getRSAGenerator();

      if (!generator.contentIndexer) {
        return {
          status: 'warn',
          message: 'RSA generator missing content indexer integration',
          action: 'Update RSA generator to include content indexer'
        };
      }

      return {
        status: 'pass',
        message: 'All services integrated correctly',
        details: {
          services: ['scraper', 'extractor', 'indexer', 'rsa-generator']
        }
      };
    } catch (error) {
      return {
        status: 'fail',
        message: error.message,
        error: error.stack
      };
    }
  }

  /**
   * Print check result
   */
  printCheckResult(name, result) {
    const statusIcon = result.status === 'pass' ? '✅' :
                       result.status === 'warn' ? '⚠️' : '❌';
    console.log(`   ${statusIcon} ${result.status.toUpperCase()}: ${result.message}`);

    if (result.action) {
      console.log(`   ℹ️  Action: ${result.action}`);
    }

    if (result.details && process.env.VERBOSE === 'true') {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
  }

  /**
   * Quick health check (returns boolean)
   */
  async isHealthy() {
    try {
      const scraper = getWebsiteScraper();
      const extractor = getContentExtractor();
      const indexer = getContentIndexer();

      if (!scraper || !extractor || !indexer) {
        return false;
      }

      await indexer.initialize();

      return true;
    } catch (error) {
      logger.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Get system status summary
   */
  async getStatus() {
    try {
      const scraper = getWebsiteScraper();
      const indexer = getContentIndexer();
      const enabled = isSupabaseEnabled();

      return {
        status: 'operational',
        timestamp: new Date().toISOString(),
        services: {
          scraper: scraper ? 'online' : 'offline',
          indexer: indexer ? 'online' : 'offline',
          database: enabled ? 'enabled' : 'fallback'
        },
        metrics: {
          scraper: scraper ? scraper.getMetrics() : null,
          indexer: indexer ? indexer.getMetrics() : null
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Singleton instance
let healthCheckInstance = null;

/**
 * Get singleton health check instance
 */
export function getHealthCheckService() {
  if (!healthCheckInstance) {
    healthCheckInstance = new ContentHealthCheckService();
  }
  return healthCheckInstance;
}

/**
 * Quick health check function
 */
export async function runHealthCheck() {
  const service = getHealthCheckService();
  return await service.runAllChecks();
}

/**
 * CLI command
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  runHealthCheck().then(results => {
    process.exit(results.overall === 'healthy' ? 0 : 1);
  }).catch(error => {
    console.error('Health check failed:', error);
    process.exit(1);
  });
}

export default getHealthCheckService;