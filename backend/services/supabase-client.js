/**
 * Supabase Client Service
 * Handles connection and operations for Supabase database
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with connection pooling
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Supabase credentials not configured - running in Sheets-only mode');
}

// Enhanced connection configuration for production scale
const supabaseOptions = {
  auth: {
    persistSession: false, // Disable session persistence for server-side usage
    autoRefreshToken: false, // Disable token auto-refresh
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'proofkit-backend/1.0',
    },
  },
  // Connection pooling configuration
  pooler: {
    enabled: true,
    mode: 'transaction', // Use transaction-level pooling
  },
};

export const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, supabaseOptions)
  : null;

// Connection pool management
class SupabaseConnectionPool {
  constructor() {
    this.activeConnections = 0;
    this.maxConnections = Number(process.env.SUPABASE_MAX_CONNECTIONS || 20);
    this.connectionQueue = [];
    this.connectionTimeout = Number(process.env.SUPABASE_CONNECTION_TIMEOUT || 10000);
    this.retryAttempts = Number(process.env.SUPABASE_RETRY_ATTEMPTS || 3);
    this.retryDelay = Number(process.env.SUPABASE_RETRY_DELAY || 1000);
    
    // Metrics
    this.metrics = {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      retryCount: 0,
      avgResponseTime: 0,
      connectionPoolHits: 0,
      connectionPoolMisses: 0,
    };
  }

  async executeQuery(operation, retryCount = 0) {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const startTime = Date.now();
    this.metrics.totalQueries++;

    try {
      // Check connection pool capacity
      if (this.activeConnections >= this.maxConnections) {
        this.metrics.connectionPoolMisses++;
        await this.waitForConnection();
      } else {
        this.metrics.connectionPoolHits++;
      }

      this.activeConnections++;
      
      // Execute the operation
      const result = await operation(supabase);
      
      this.metrics.successfulQueries++;
      this.updateMetrics(startTime);
      
      return result;
    } catch (error) {
      this.metrics.failedQueries++;
      
      // Retry logic for transient errors
      if (retryCount < this.retryAttempts && this.isRetryableError(error)) {
        this.metrics.retryCount++;
        console.warn(`Supabase operation failed, retrying (${retryCount + 1}/${this.retryAttempts}):`, error.message);
        
        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, retryCount);
        await this.sleep(delay);
        
        return this.executeQuery(operation, retryCount + 1);
      }
      
      throw error;
    } finally {
      this.activeConnections = Math.max(0, this.activeConnections - 1);
      this.processQueue();
    }
  }

  async waitForConnection() {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.connectionQueue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          this.connectionQueue.splice(index, 1);
        }
        reject(new Error('Connection pool timeout'));
      }, this.connectionTimeout);

      this.connectionQueue.push({ resolve, reject, timeoutId });
    });
  }

  processQueue() {
    if (this.connectionQueue.length > 0 && this.activeConnections < this.maxConnections) {
      const { resolve, timeoutId } = this.connectionQueue.shift();
      clearTimeout(timeoutId);
      resolve();
    }
  }

  isRetryableError(error) {
    const retryablePatterns = [
      'connection',
      'timeout',
      'network',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      '502', '503', '504', // Server errors
      'temporary'
    ];
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toString() || '';
    
    return retryablePatterns.some(pattern => 
      errorMessage.includes(pattern) || errorCode.includes(pattern)
    );
  }

  updateMetrics(startTime) {
    const responseTime = Date.now() - startTime;
    this.metrics.avgResponseTime = 
      (this.metrics.avgResponseTime * (this.metrics.successfulQueries - 1) + responseTime) / 
      this.metrics.successfulQueries;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getMetrics() {
    return {
      ...this.metrics,
      activeConnections: this.activeConnections,
      maxConnections: this.maxConnections,
      queueLength: this.connectionQueue.length,
      successRate: this.metrics.totalQueries > 0 
        ? (this.metrics.successfulQueries / this.metrics.totalQueries * 100).toFixed(2)
        : 0
    };
  }
}

const connectionPool = new SupabaseConnectionPool();

/**
 * Check if Supabase is enabled and configured
 */
export function isSupabaseEnabled() {
  // Check both explicit enable flag and if credentials are configured
  const explicitlyEnabled = process.env.SUPABASE_ENABLED === 'true';
  const hasCredentials = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const configured = supabase !== null;

  // Enable if either explicitly enabled OR if credentials are present (auto-enable)
  const enabled = explicitlyEnabled || (hasCredentials && configured);

  if (!enabled && hasCredentials) {
    console.log('⚠️ Supabase credentials present but SUPABASE_ENABLED not set to "true"');
  }

  return enabled;
}

/**
 * Test Supabase connection with pool management
 */
export async function testSupabaseConnection() {
  if (!supabase) {
    return { connected: false, error: 'Supabase not configured' };
  }

  try {
    const result = await connectionPool.executeQuery(async (client) => {
      const { data, error } = await client
        .from('tenant_configs')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      return data;
    });

    return { 
      connected: true, 
      error: null,
      metrics: connectionPool.getMetrics()
    };
  } catch (error) {
    return { 
      connected: false, 
      error: error.message,
      metrics: connectionPool.getMetrics()
    };
  }
}

/**
 * Create tables if they don't exist
 */
export async function ensureSupabaseTables() {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  // Table creation is handled by migrations
  // This function can be used for runtime checks
  
  const tables = [
    'tenant_configs',
    'tenant_metrics', 
    'search_terms',
    'run_logs',
    'tenant_subscriptions'
  ];
  
  const results = {};
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
        
      results[table] = !error;
    } catch (error) {
      results[table] = false;
    }
  }
  
  return results;
}

// Enhanced query execution with connection pooling
export async function executeQuery(operation) {
  return connectionPool.executeQuery(operation);
}

// Health check with detailed metrics
export async function getConnectionHealth() {
  const metrics = connectionPool.getMetrics();
  const testResult = await testSupabaseConnection();
  
  return {
    healthy: testResult.connected,
    metrics,
    timestamp: new Date().toISOString()
  };
}

export default {
  supabase,
  isSupabaseEnabled,
  testSupabaseConnection,
  ensureSupabaseTables,
  executeQuery,
  getConnectionHealth,
  connectionPool
};