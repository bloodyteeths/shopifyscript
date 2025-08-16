/**
 * Optimized Production Server - ProofKit SaaS
 * 
 * Features:
 * - Advanced caching with prediction and warming
 * - Database connection optimization for 100+ tenants
 * - Response compression and optimization
 * - Performance monitoring and validation
 * - Target: <200ms response, >80% cache hit rate
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { getDoc, ensureSheet, getDocById } from './sheets.js';
import { validateRSA } from './lib/validators.js';
import { schedulePromoteWindow, tickPromoteWindow } from './jobs/promote_window.js';
import { runWeeklySummary } from './jobs/weekly_summary.js';
import { buildSegments } from './segments/materialize.js';
import fs from 'fs';
import path from 'path';

// Security & Privacy Services
import securityMiddleware from './middleware/security.js';
import privacyService from './services/privacy.js';

// DevOps Services
import { healthService, createHealthRoutes } from './services/health.js';
import logger from './services/logger.js';
import { createEnvironment } from '../deployment/environment.js';

// Performance Optimization Services
import cacheOptimizer from './services/cache-optimizer.js';
import sheetsOptimizer from './services/sheets-optimizer.js';
import responseOptimizer from './middleware/response-optimizer.js';
import performanceMonitor from './services/performance-monitor.js';
import tenantCache from './services/cache.js';

// Routes
import configRoutes from './routes/config.js';
import insightsRoutes from './routes/insights.js';
import metricsRoutes from './routes/metrics.js';
import audiencesRoutes from './routes/audiences.js';
import aiRoutes from './routes/ai.js';
import sheetsAdminRoutes from './routes/sheets-admin.js';

// Load environment configuration
dotenv.config();
try { dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') }); } catch {}

// Initialize environment with validation
let envConfig;
try {
  envConfig = createEnvironment();
  logger.info('Environment configuration loaded successfully', {
    environment: envConfig.NODE_ENV,
    port: envConfig.config.PORT,
    optimization: 'enabled'
  });
} catch (error) {
  logger.error('Failed to load environment configuration', { error: error.message });
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

const app = express();
app.set('trust proxy', 1);

// ==== PERFORMANCE OPTIMIZATION MIDDLEWARE ====
// 1. Response optimization (compression, minification, caching headers)
app.use(responseOptimizer);

// 2. Advanced caching with predictive warming
app.use(async (req, res, next) => {
  if (req.method !== 'GET') return next();
  
  const tenant = req.query.tenant || 'default';
  const path = req.path;
  const params = req.query;
  
  // Try to get from optimized cache
  const cached = await cacheOptimizer.get(tenant, path, params);
  if (cached) {
    res.set('X-Cache', 'HIT-OPTIMIZED');
    res.set('X-Cache-Source', 'cache-optimizer');
    return res.json(cached);
  }
  
  // Override res.json to cache responses
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    // Cache the response asynchronously
    setImmediate(async () => {
      try {
        await cacheOptimizer.set(tenant, path, params, data);
      } catch (error) {
        logger.warn('Cache optimization failed', {
          tenant, path, error: error.message
        });
      }
    });
    
    res.set('X-Cache', 'MISS-OPTIMIZED');
    return originalJson(data);
  };
  
  next();
});

// 3. Request logging middleware
app.use(logger.middleware());

// 4. CORS with optimization
app.use(cors({ 
  origin: (origin, cb) => {
    const allowed = (process.env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
    if (!origin || !allowed.length) return cb(null, true);
    return cb(null, allowed.includes(origin));
  }
}));

// 5. Body parser with size limits
app.use(express.json({ limit: '2mb' }));

// 6. Security middleware
app.use(securityMiddleware.middleware());

// ==== HEALTH CHECK ROUTES ====
// Enhanced health check with performance metrics
app.get('/health', async (req, res) => {
  try {
    const health = healthService.getSystemHealth();
    const performanceMetrics = performanceMonitor.getMetrics();
    const cacheMetrics = tenantCache.getGlobalStats();
    const sheetsMetrics = sheetsOptimizer.getMetrics();
    
    const enhancedHealth = {
      ...health,
      performance: {
        status: performanceMetrics.status,
        responseTime: performanceMetrics.current.responseTime + 'ms',
        cacheHitRate: performanceMetrics.current.cacheHitRate + '%',
        targets: {
          responseTime: performanceMetrics.targets.responseTime + 'ms',
          cacheHitRate: performanceMetrics.targets.cacheHitRate + '%'
        },
        violations: performanceMetrics.violations,
        alerts: performanceMetrics.alerts
      },
      optimization: {
        cache: {
          hitRate: cacheMetrics.hitRate + '%',
          size: cacheMetrics.totalSize,
          tenants: cacheMetrics.tenantCount
        },
        database: {
          pools: sheetsMetrics.pools,
          connections: sheetsMetrics.totalConnections,
          active: sheetsMetrics.activeConnections
        }
      }
    };
    
    res.json({ ok: true, ...enhancedHealth });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(500).json({ ok: false, error: 'Health check failed' });
  }
});

// Performance metrics endpoint
app.get('/api/performance', async (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics();
    const report = performanceMonitor.getLatestReport();
    const cacheStats = tenantCache.getGlobalStats();
    const optimizerMetrics = cacheOptimizer.getMetrics();
    
    res.json({
      ok: true,
      metrics,
      report,
      cache: cacheStats,
      optimizer: optimizerMetrics,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Performance metrics failed', { error: error.message });
    res.status(500).json({ ok: false, error: 'Performance metrics unavailable' });
  }
});

// ==== HMAC VALIDATION MIDDLEWARE ====
// Optimized HMAC validation with caching
const validateHMAC = (req, res, next) => {
  const receivedHmac = req.get('x-hmac-sha256');
  const tenant = req.query.tenant;
  
  if (!receivedHmac || !tenant) {
    return res.status(400).json({ ok: false, error: 'Missing HMAC or tenant' });
  }
  
  // Cache HMAC validation results for a short time
  const hmacKey = `hmac:${tenant}:${receivedHmac}`;
  const cached = tenantCache.get('system', hmacKey);
  if (cached !== null) {
    if (cached.valid) {
      return next();
    } else {
      return res.status(401).json({ ok: false, error: 'Invalid HMAC' });
    }
  }
  
  try {
    const body = JSON.stringify(req.body);
    const secret = process.env.WEBHOOK_SECRET;
    const computedHmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedHmac, 'hex'),
      Buffer.from(computedHmac, 'hex')
    );
    
    // Cache result for 1 minute
    tenantCache.set('system', hmacKey, {}, { valid: isValid }, 60000);
    
    if (isValid) {
      next();
    } else {
      res.status(401).json({ ok: false, error: 'Invalid HMAC' });
    }
  } catch (error) {
    logger.error('HMAC validation error', { error: error.message, tenant });
    res.status(500).json({ ok: false, error: 'HMAC validation failed' });
  }
};

// ==== API ROUTES WITH OPTIMIZATION ====

// Optimized insights endpoint
app.get('/api/insights', async (req, res) => {
  const startTime = Date.now();
  const tenant = req.query.tenant || 'default';
  
  try {
    // Use optimized sheets service
    const connection = await sheetsOptimizer.getConnection(tenant);
    
    const operation = async (doc) => {
      await doc.loadInfo();
      const sheet = doc.sheetsByIndex[0];
      const rows = await sheet.getRows();
      
      // Process insights data
      return {
        totalRows: rows.length,
        lastUpdated: new Date().toISOString(),
        insights: rows.slice(-10).map(row => ({
          timestamp: row.Timestamp,
          event: row.Event,
          data: row.Data
        }))
      };
    };
    
    const data = await sheetsOptimizer.executeOperation(tenant, operation);
    const responseTime = Date.now() - startTime;
    
    res.set('X-Response-Time', responseTime + 'ms');
    res.json({ ok: true, data, responseTime });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Insights API error', { 
      tenant, 
      error: error.message, 
      responseTime,
      operation: 'insights_api_error'
    });
    res.status(500).json({ ok: false, error: 'Failed to fetch insights' });
  }
});

// Optimized upsert endpoint with HMAC validation
app.post('/api/upsert', validateHMAC, async (req, res) => {
  const startTime = Date.now();
  const tenant = req.query.tenant;
  
  try {
    const { timestamp, event, data } = req.body;
    
    const operation = async (doc) => {
      await doc.loadInfo();
      let sheet = doc.sheetsByIndex[0];
      
      if (!sheet) {
        sheet = await doc.addSheet({ title: 'Data' });
        await sheet.setHeaderRow(['Timestamp', 'Event', 'Data', 'Status']);
      }
      
      await sheet.addRow({
        Timestamp: timestamp || new Date().toISOString(),
        Event: event,
        Data: JSON.stringify(data),
        Status: 'processed'
      });
      
      return { success: true };
    };
    
    const result = await sheetsOptimizer.executeOperation(tenant, operation);
    const responseTime = Date.now() - startTime;
    
    // Invalidate related cache entries
    tenantCache.clearTenantPath(tenant, '/api/insights');
    tenantCache.clearTenantPath(tenant, '/api/summary');
    
    res.set('X-Response-Time', responseTime + 'ms');
    res.json({ ok: true, result, responseTime });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Upsert API error', { 
      tenant, 
      error: error.message, 
      responseTime,
      operation: 'upsert_api_error'
    });
    res.status(500).json({ ok: false, error: 'Failed to upsert data' });
  }
});

// Enhanced config endpoint with caching
app.get('/api/config', async (req, res) => {
  const startTime = Date.now();
  const tenant = req.query.tenant || 'default';
  
  try {
    const config = {
      tenant,
      caching: {
        enabled: true,
        ttl: '15s',
        hitRate: tenantCache.getTenantStats(tenant).hitRate + '%'
      },
      optimization: {
        compression: true,
        minification: true,
        predictiveCaching: true
      },
      performance: {
        targetResponseTime: '200ms',
        targetCacheHitRate: '80%',
        currentStatus: performanceMonitor.getMetrics().status
      },
      timestamp: new Date().toISOString()
    };
    
    const responseTime = Date.now() - startTime;
    res.set('X-Response-Time', responseTime + 'ms');
    res.json({ ok: true, config, responseTime });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Config API error', { 
      tenant, 
      error: error.message, 
      responseTime,
      operation: 'config_api_error'
    });
    res.status(500).json({ ok: false, error: 'Failed to fetch config' });
  }
});

// Run logs endpoint with optimization
app.get('/api/run-logs', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const logs = [];
    const logDir = path.join(process.cwd(), 'run_logs');
    
    if (fs.existsSync(logDir)) {
      const files = fs.readdirSync(logDir)
        .filter(f => f.endsWith('.log'))
        .sort()
        .slice(-10); // Last 10 log files
      
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(logDir, file), 'utf8');
          logs.push({
            file,
            timestamp: file.split('_')[0],
            success: !content.includes('ERROR'),
            size: content.length
          });
        } catch (readError) {
          // Skip files that can't be read
        }
      }
    }
    
    const responseTime = Date.now() - startTime;
    res.set('X-Response-Time', responseTime + 'ms');
    res.json({ ok: true, logs, responseTime });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Run logs API error', { 
      error: error.message, 
      responseTime,
      operation: 'run_logs_api_error'
    });
    res.status(500).json({ ok: false, error: 'Failed to fetch run logs' });
  }
});

// Summary endpoint with advanced caching
app.get('/api/summary', async (req, res) => {
  const startTime = Date.now();
  const tenant = req.query.tenant || 'default';
  
  try {
    const performanceMetrics = performanceMonitor.getMetrics();
    const cacheStats = tenantCache.getTenantStats(tenant);
    
    const summary = {
      tenant,
      status: 'operational',
      performance: {
        responseTime: performanceMetrics.current.responseTime + 'ms',
        cacheHitRate: performanceMetrics.current.cacheHitRate + '%',
        throughput: performanceMetrics.current.throughput + ' rps',
        status: performanceMetrics.status
      },
      optimization: {
        cacheSize: cacheStats.size,
        cacheHitRate: cacheStats.hitRate + '%',
        compressionEnabled: true,
        predictiveCachingEnabled: true
      },
      timestamp: new Date().toISOString()
    };
    
    const responseTime = Date.now() - startTime;
    res.set('X-Response-Time', responseTime + 'ms');
    res.json({ ok: true, summary, responseTime });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Summary API error', { 
      tenant, 
      error: error.message, 
      responseTime,
      operation: 'summary_api_error'
    });
    res.status(500).json({ ok: false, error: 'Failed to fetch summary' });
  }
});

// ==== ERROR HANDLING ====
// Enhanced error handling with performance logging
app.use((err, req, res, next) => {
  const responseTime = Date.now() - (req.startTime || Date.now());
  
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    responseTime,
    operation: 'unhandled_error'
  });
  
  res.status(500).json({ 
    ok: false, 
    error: 'Internal server error',
    responseTime 
  });
});

// 404 handler
app.use((req, res) => {
  const responseTime = Date.now() - (req.startTime || Date.now());
  
  res.status(404).json({ 
    ok: false, 
    error: 'Not found',
    path: req.path,
    responseTime 
  });
});

// ==== SERVER STARTUP ====
const PORT = envConfig?.config?.PORT || process.env.PORT || 3000;

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  
  try {
    // Close database connections
    await sheetsOptimizer.shutdown();
    
    // Final performance report
    const finalReport = performanceMonitor.getLatestReport();
    logger.info('Final performance report', { report: finalReport });
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
app.listen(PORT, () => {
  logger.info('Optimized ProofKit backend server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    features: {
      advancedCaching: true,
      databaseOptimization: true,
      responseOptimization: true,
      performanceMonitoring: true,
      predictiveCaching: true,
      compressionEnabled: true
    },
    targets: {
      responseTime: '<200ms',
      cacheHitRate: '>80%'
    },
    operation: 'server_start'
  });
  
  // Initial performance report
  setTimeout(() => {
    const initialReport = performanceMonitor.getLatestReport();
    if (initialReport) {
      logger.info('Initial performance baseline', { report: initialReport });
    }
  }, 5000);
});

export default app;