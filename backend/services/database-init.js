/**
 * Database Initialization for Worker Infrastructure
 * Creates necessary tables for job queue, monitoring, and persistence
 */

import { executeQuery } from './supabase-client.js';
import logger from './logger.js';

/**
 * SQL queries for creating tables
 */
const createTablesSQL = {
  jobs: `
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      data JSONB DEFAULT '{}',
      state TEXT NOT NULL DEFAULT 'pending',
      priority INTEGER DEFAULT 2,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      scheduled_for TIMESTAMPTZ DEFAULT NOW(),
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      failed_at TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ,
      dependencies TEXT[] DEFAULT '{}',
      retries INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      last_error TEXT,
      result JSONB,
      metadata JSONB DEFAULT '{}'
    );
  `,

  jobLogs: `
    CREATE TABLE IF NOT EXISTS job_logs (
      id SERIAL PRIMARY KEY,
      job_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      type TEXT NOT NULL,
      state TEXT NOT NULL,
      worker_id TEXT,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      failed_at TIMESTAMPTZ,
      duration INTEGER,
      error_message TEXT,
      result JSONB,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,

  performanceMetrics: `
    CREATE TABLE IF NOT EXISTS performance_metrics (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMPTZ NOT NULL,
      active_jobs INTEGER DEFAULT 0,
      jobs_per_minute DECIMAL DEFAULT 0,
      error_rate DECIMAL DEFAULT 0,
      average_processing_time INTEGER DEFAULT 0,
      total_jobs_completed INTEGER DEFAULT 0,
      total_jobs_failed INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,

  jobAlerts: `
    CREATE TABLE IF NOT EXISTS job_alerts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium',
      data JSONB DEFAULT '{}',
      acknowledged BOOLEAN DEFAULT FALSE,
      acknowledged_at TIMESTAMPTZ,
      acknowledged_by TEXT,
      created_at TIMESTAMPTZ NOT NULL
    );
  `,

  tenantSubscriptions: `
    CREATE TABLE IF NOT EXISTS tenant_subscriptions (
      tenant_id TEXT PRIMARY KEY,
      tier TEXT NOT NULL DEFAULT 'starter',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,

  workerMetrics: `
    CREATE TABLE IF NOT EXISTS worker_metrics (
      id SERIAL PRIMARY KEY,
      worker_id TEXT NOT NULL,
      tier TEXT NOT NULL,
      jobs_processed INTEGER DEFAULT 0,
      total_processing_time INTEGER DEFAULT 0,
      errors INTEGER DEFAULT 0,
      last_active TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `
};

/**
 * Indexes for performance optimization
 */
const createIndexesSQL = {
  jobsState: 'CREATE INDEX IF NOT EXISTS idx_jobs_state ON jobs(state);',
  jobsTenant: 'CREATE INDEX IF NOT EXISTS idx_jobs_tenant_id ON jobs(tenant_id);',
  jobsScheduled: 'CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_for ON jobs(scheduled_for);',
  jobsCreated: 'CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);',

  jobLogsJobId: 'CREATE INDEX IF NOT EXISTS idx_job_logs_job_id ON job_logs(job_id);',
  jobLogsTenant: 'CREATE INDEX IF NOT EXISTS idx_job_logs_tenant_id ON job_logs(tenant_id);',
  jobLogsState: 'CREATE INDEX IF NOT EXISTS idx_job_logs_state ON job_logs(state);',
  jobLogsCreated: 'CREATE INDEX IF NOT EXISTS idx_job_logs_created_at ON job_logs(created_at);',

  performanceTimestamp: 'CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);',

  alertsType: 'CREATE INDEX IF NOT EXISTS idx_job_alerts_type ON job_alerts(type);',
  alertsCreated: 'CREATE INDEX IF NOT EXISTS idx_job_alerts_created_at ON job_alerts(created_at);',

  workerMetricsWorker: 'CREATE INDEX IF NOT EXISTS idx_worker_metrics_worker_id ON worker_metrics(worker_id);',
  workerMetricsTier: 'CREATE INDEX IF NOT EXISTS idx_worker_metrics_tier ON worker_metrics(tier);'
};

/**
 * Database initialization functions
 */
export class DatabaseInitializer {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize all tables and indexes
   */
  async initialize() {
    if (this.initialized) {
      logger.info('Database already initialized');
      return;
    }

    try {
      logger.info('Starting database initialization for worker infrastructure');

      // Create tables
      await this.createTables();

      // Create indexes
      await this.createIndexes();

      // Create RPC functions
      await this.createRPCFunctions();

      // Seed initial data
      await this.seedInitialData();

      this.initialized = true;
      logger.info('Database initialization completed successfully');

    } catch (error) {
      logger.error('Database initialization failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Create all tables
   */
  async createTables() {
    logger.info('Creating database tables');

    for (const [tableName, sql] of Object.entries(createTablesSQL)) {
      try {
        await executeQuery(async (supabase) => {
          const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
          if (error) throw error;
        });

        logger.debug(`Created table: ${tableName}`);
      } catch (error) {
        // Try alternative approach if RPC is not available
        logger.warn(`RPC approach failed for ${tableName}, trying direct query`);
        await this.createTableDirect(tableName, sql);
      }
    }

    logger.info('All tables created successfully');
  }

  /**
   * Create table using direct query approach
   */
  async createTableDirect(tableName, sql) {
    try {
      await executeQuery(async (supabase) => {
        // For tables that might not exist, we can use a more basic approach
        const { error } = await supabase
          .from(tableName)
          .select('count')
          .limit(1);

        // If table doesn't exist, the error will indicate this
        if (error && error.code === '42P01') {
          logger.warn(`Table ${tableName} does not exist, needs manual creation`);
          // In a real implementation, you'd need to run this via SQL client or migration
          throw new Error(`Please create table ${tableName} manually: ${sql}`);
        }
      });

      logger.debug(`Table ${tableName} exists or was created`);
    } catch (error) {
      logger.error(`Failed to verify/create table ${tableName}`, {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create indexes for performance
   */
  async createIndexes() {
    logger.info('Creating database indexes');

    for (const [indexName, sql] of Object.entries(createIndexesSQL)) {
      try {
        await executeQuery(async (supabase) => {
          const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
          if (error && !error.message.includes('already exists')) {
            throw error;
          }
        });

        logger.debug(`Created index: ${indexName}`);
      } catch (error) {
        logger.warn(`Could not create index ${indexName}`, {
          error: error.message
        });
        // Continue with other indexes
      }
    }

    logger.info('Indexes creation completed');
  }

  /**
   * Create helpful RPC functions
   */
  async createRPCFunctions() {
    logger.info('Creating RPC functions');

    const functions = {
      create_jobs_table_if_not_exists: `
        CREATE OR REPLACE FUNCTION create_jobs_table_if_not_exists()
        RETURNS TEXT AS $$
        BEGIN
          IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'jobs') THEN
            ${createTablesSQL.jobs}
            RETURN 'Jobs table created';
          ELSE
            RETURN 'Jobs table already exists';
          END IF;
        END;
        $$ LANGUAGE plpgsql;
      `,

      cleanup_old_job_logs: `
        CREATE OR REPLACE FUNCTION cleanup_old_job_logs(days_to_keep INTEGER DEFAULT 30)
        RETURNS INTEGER AS $$
        DECLARE
          deleted_count INTEGER;
        BEGIN
          DELETE FROM job_logs
          WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;

          GET DIAGNOSTICS deleted_count = ROW_COUNT;
          RETURN deleted_count;
        END;
        $$ LANGUAGE plpgsql;
      `,

      cleanup_old_performance_metrics: `
        CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics(days_to_keep INTEGER DEFAULT 90)
        RETURNS INTEGER AS $$
        DECLARE
          deleted_count INTEGER;
        BEGIN
          DELETE FROM performance_metrics
          WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;

          GET DIAGNOSTICS deleted_count = ROW_COUNT;
          RETURN deleted_count;
        END;
        $$ LANGUAGE plpgsql;
      `
    };

    for (const [funcName, sql] of Object.entries(functions)) {
      try {
        await executeQuery(async (supabase) => {
          const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
          if (error) throw error;
        });

        logger.debug(`Created function: ${funcName}`);
      } catch (error) {
        logger.warn(`Could not create function ${funcName}`, {
          error: error.message
        });
      }
    }
  }

  /**
   * Seed initial data
   */
  async seedInitialData() {
    logger.info('Seeding initial data');

    try {
      // Create sample tenant subscriptions for testing
      const sampleTenants = [
        { tenant_id: 'tenant_starter_1', tier: 'starter' },
        { tenant_id: 'tenant_pro_1', tier: 'pro' },
        { tenant_id: 'tenant_enterprise_1', tier: 'enterprise' }
      ];

      for (const tenant of sampleTenants) {
        await executeQuery(async (supabase) => {
          const { error } = await supabase
            .from('tenant_subscriptions')
            .upsert([tenant], { onConflict: 'tenant_id' });

          if (error) throw error;
        });
      }

      logger.info('Initial data seeded successfully');
    } catch (error) {
      logger.warn('Could not seed initial data', {
        error: error.message
      });
      // This is not critical, so we don't throw
    }
  }

  /**
   * Health check for database
   */
  async healthCheck() {
    try {
      const tables = Object.keys(createTablesSQL);
      const results = {};

      for (const table of tables) {
        try {
          await executeQuery(async (supabase) => {
            const { data, error } = await supabase
              .from(table)
              .select('count')
              .limit(1);

            if (error) throw error;
            results[table] = 'healthy';
          });
        } catch (error) {
          results[table] = `error: ${error.message}`;
        }
      }

      return {
        status: Object.values(results).every(r => r === 'healthy') ? 'healthy' : 'degraded',
        tables: results,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Cleanup old data
   */
  async cleanup(retentionDays = 30) {
    try {
      logger.info('Starting database cleanup', { retentionDays });

      const results = {};

      // Cleanup job logs
      try {
        const jobLogsDeleted = await executeQuery(async (supabase) => {
          const { data, error } = await supabase.rpc('cleanup_old_job_logs', {
            days_to_keep: retentionDays
          });
          if (error) throw error;
          return data;
        });
        results.jobLogs = jobLogsDeleted;
      } catch (error) {
        results.jobLogs = `error: ${error.message}`;
      }

      // Cleanup performance metrics
      try {
        const metricsDeleted = await executeQuery(async (supabase) => {
          const { data, error } = await supabase.rpc('cleanup_old_performance_metrics', {
            days_to_keep: retentionDays * 3 // Keep metrics longer
          });
          if (error) throw error;
          return data;
        });
        results.performanceMetrics = metricsDeleted;
      } catch (error) {
        results.performanceMetrics = `error: ${error.message}`;
      }

      // Cleanup old alerts
      try {
        const alertsDeleted = await executeQuery(async (supabase) => {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

          const { count, error } = await supabase
            .from('job_alerts')
            .delete()
            .lt('created_at', cutoffDate.toISOString());

          if (error) throw error;
          return count;
        });
        results.alerts = alertsDeleted;
      } catch (error) {
        results.alerts = `error: ${error.message}`;
      }

      logger.info('Database cleanup completed', results);
      return results;

    } catch (error) {
      logger.error('Database cleanup failed', { error: error.message });
      throw error;
    }
  }
}

/**
 * Create and export singleton instance
 */
let dbInitializerInstance = null;

export function createDatabaseInitializer() {
  if (!dbInitializerInstance) {
    dbInitializerInstance = new DatabaseInitializer();
  }
  return dbInitializerInstance;
}

export function getDatabaseInitializer() {
  return dbInitializerInstance;
}

/**
 * Convenience function to initialize database
 */
export async function initializeDatabase() {
  const initializer = createDatabaseInitializer();
  return await initializer.initialize();
}

export default {
  DatabaseInitializer,
  createDatabaseInitializer,
  getDatabaseInitializer,
  initializeDatabase
};