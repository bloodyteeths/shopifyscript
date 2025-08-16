/**
 * API Response Optimization Middleware - Production Performance Enhancement
 * 
 * Features:
 * - Response compression and optimization
 * - Content optimization and minification
 * - Response caching headers
 * - Performance monitoring
 * - Adaptive response optimization
 * - Memory-efficient streaming
 */

import zlib from 'zlib';
import { promisify } from 'util';
import logger from '../services/logger.js';

const gzip = promisify(zlib.gzip);
const deflate = promisify(zlib.deflate);
const brotliCompress = promisify(zlib.brotliCompress);

class ResponseOptimizer {
  constructor() {
    this.config = {
      compressionThreshold: Number(process.env.COMPRESSION_THRESHOLD || 1024), // 1KB
      compressionLevel: Number(process.env.COMPRESSION_LEVEL || 6),
      enableBrotli: process.env.ENABLE_BROTLI !== 'false',
      enableGzip: process.env.ENABLE_GZIP !== 'false',
      enableDeflate: process.env.ENABLE_DEFLATE !== 'false',
      cacheMaxAge: Number(process.env.RESPONSE_CACHE_MAX_AGE || 300), // 5 minutes
      performanceTarget: Number(process.env.RESPONSE_TIME_TARGET || 200), // 200ms
      enableMinification: process.env.ENABLE_MINIFICATION !== 'false',
      enableResponseMetrics: process.env.ENABLE_RESPONSE_METRICS !== 'false'
    };

    this.metrics = {
      totalRequests: 0,
      compressedResponses: 0,
      totalCompressionSavings: 0,
      avgCompressionRatio: 0,
      avgResponseTime: 0,
      totalResponseTime: 0,
      performanceTargetHits: 0,
      minifiedResponses: 0
    };

    this.compressionStats = new Map(); // Track compression performance by content type
  }

  /**
   * Main middleware function
   */
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Override res.send to intercept responses
      const originalSend = res.send.bind(res);
      const originalJson = res.json.bind(res);
      
      res.send = (data) => {
        return this.optimizeResponse(req, res, data, originalSend, startTime, 'text');
      };
      
      res.json = (data) => {
        return this.optimizeResponse(req, res, data, originalJson, startTime, 'json');
      };

      next();
    };
  }

  /**
   * Optimize response with compression and caching
   */
  async optimizeResponse(req, res, data, originalMethod, startTime, dataType) {
    try {
      let optimizedData = data;
      let contentType = res.get('Content-Type') || (dataType === 'json' ? 'application/json' : 'text/plain');
      
      // Convert data to string if needed
      if (typeof data === 'object' && dataType === 'json') {
        optimizedData = JSON.stringify(data);
        contentType = 'application/json';
      } else if (typeof data !== 'string') {
        optimizedData = String(data);
      }

      // Apply optimizations
      optimizedData = await this.applyOptimizations(optimizedData, contentType, req, res);
      
      // Set cache headers
      this.setCacheHeaders(req, res);
      
      // Apply compression
      const compressedResult = await this.compressResponse(optimizedData, req, res);
      
      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateMetrics(req, res, data, compressedResult, responseTime);
      
      // Log performance info
      this.logPerformance(req, res, responseTime, compressedResult);
      
      // Send response
      if (compressedResult.compressed) {
        res.set('Content-Encoding', compressedResult.encoding);
        res.set('Content-Length', compressedResult.data.length);
        return res.end(compressedResult.data);
      } else {
        return originalMethod(compressedResult.data);
      }
      
    } catch (error) {
      logger.error('Response optimization failed', {
        path: req.path,
        error: error.message,
        operation: 'response_optimization_error'
      });
      
      // Fallback to original method
      return originalMethod(data);
    }
  }

  /**
   * Apply various optimizations to response data
   */
  async applyOptimizations(data, contentType, req, res) {
    let optimized = data;
    
    // Apply minification for appropriate content types
    if (this.config.enableMinification) {
      optimized = this.minifyContent(optimized, contentType);
    }
    
    // Apply content-specific optimizations
    optimized = this.optimizeContentType(optimized, contentType);
    
    // Apply response-specific optimizations
    optimized = this.optimizeForEndpoint(optimized, req.path);
    
    return optimized;
  }

  /**
   * Minify content based on content type
   */
  minifyContent(data, contentType) {
    try {
      if (contentType.includes('application/json')) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        this.metrics.minifiedResponses++;
        return JSON.stringify(parsed); // Already minified by default
      }
      
      if (contentType.includes('text/html')) {
        // Basic HTML minification
        return data
          .replace(/>\s+</g, '><')
          .replace(/\s+/g, ' ')
          .trim();
      }
      
      if (contentType.includes('text/css')) {
        // Basic CSS minification
        return data
          .replace(/\s+/g, ' ')
          .replace(/;\s*}/g, '}')
          .replace(/{\s*/g, '{')
          .replace(/;\s*/g, ';')
          .trim();
      }
      
      if (contentType.includes('application/javascript') || contentType.includes('text/javascript')) {
        // Basic JS minification (remove comments and extra whitespace)
        return data
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, '')
          .replace(/\s+/g, ' ')
          .trim();
      }
      
      return data;
    } catch (error) {
      logger.warn('Minification failed', {
        contentType,
        error: error.message,
        operation: 'minification_error'
      });
      return data;
    }
  }

  /**
   * Optimize content based on type
   */
  optimizeContentType(data, contentType) {
    if (contentType.includes('application/json')) {
      return this.optimizeJsonResponse(data);
    }
    
    if (contentType.includes('text/html')) {
      return this.optimizeHtmlResponse(data);
    }
    
    return data;
  }

  /**
   * Optimize JSON responses
   */
  optimizeJsonResponse(data) {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Remove null/undefined values in arrays
      if (Array.isArray(parsed)) {
        return JSON.stringify(parsed.filter(item => item != null));
      }
      
      // Remove null/undefined properties from objects
      if (typeof parsed === 'object' && parsed !== null) {
        const cleaned = {};
        for (const [key, value] of Object.entries(parsed)) {
          if (value != null) {
            cleaned[key] = value;
          }
        }
        return JSON.stringify(cleaned);
      }
      
      return data;
    } catch (error) {
      return data;
    }
  }

  /**
   * Optimize HTML responses
   */
  optimizeHtmlResponse(data) {
    // Remove comments and excessive whitespace
    return data
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Optimize based on specific endpoints
   */
  optimizeForEndpoint(data, path) {
    // API-specific optimizations
    if (path.startsWith('/api/insights')) {
      return this.optimizeInsightsResponse(data);
    }
    
    if (path.startsWith('/api/summary')) {
      return this.optimizeSummaryResponse(data);
    }
    
    return data;
  }

  /**
   * Optimize insights API responses
   */
  optimizeInsightsResponse(data) {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (parsed && parsed.data && Array.isArray(parsed.data)) {
        // Limit precision for numeric values
        parsed.data = parsed.data.map(item => {
          if (typeof item === 'object') {
            for (const [key, value] of Object.entries(item)) {
              if (typeof value === 'number' && !Number.isInteger(value)) {
                item[key] = Number(value.toFixed(2));
              }
            }
          }
          return item;
        });
      }
      
      return JSON.stringify(parsed);
    } catch (error) {
      return data;
    }
  }

  /**
   * Optimize summary API responses
   */
  optimizeSummaryResponse(data) {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Remove detailed timestamps, keep only dates
      if (parsed && parsed.timestamp) {
        parsed.date = new Date(parsed.timestamp).toISOString().split('T')[0];
        delete parsed.timestamp;
      }
      
      return JSON.stringify(parsed);
    } catch (error) {
      return data;
    }
  }

  /**
   * Set appropriate cache headers
   */
  setCacheHeaders(req, res) {
    const path = req.path;
    let maxAge = this.config.cacheMaxAge;
    
    // Different cache strategies for different endpoints
    if (path.startsWith('/api/config')) {
      maxAge = 60; // 1 minute for config
    } else if (path.startsWith('/api/insights')) {
      maxAge = 300; // 5 minutes for insights
    } else if (path.startsWith('/api/summary')) {
      maxAge = 600; // 10 minutes for summaries
    } else if (path.startsWith('/api/run-logs')) {
      maxAge = 30; // 30 seconds for logs
    }
    
    // Set cache headers
    res.set('Cache-Control', `public, max-age=${maxAge}`);
    res.set('ETag', this.generateETag(req));
    
    // Add performance headers
    res.set('X-Response-Optimized', 'true');
    res.set('X-Cache-Strategy', maxAge.toString());
  }

  /**
   * Generate ETag for response
   */
  generateETag(req) {
    const etag = Buffer.from(`${req.path}:${Date.now()}`).toString('base64');
    return `"${etag}"`;
  }

  /**
   * Compress response based on Accept-Encoding
   */
  async compressResponse(data, req, res) {
    const dataSize = Buffer.byteLength(data, 'utf8');
    
    // Skip compression for small responses
    if (dataSize < this.config.compressionThreshold) {
      return { data, compressed: false, originalSize: dataSize, compressedSize: dataSize };
    }
    
    const acceptEncoding = req.get('Accept-Encoding') || '';
    let encoding = null;
    let compressedData = null;
    
    try {
      // Choose best compression method
      if (this.config.enableBrotli && acceptEncoding.includes('br')) {
        encoding = 'br';
        compressedData = await brotliCompress(data, {
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: this.config.compressionLevel
          }
        });
      } else if (this.config.enableGzip && acceptEncoding.includes('gzip')) {
        encoding = 'gzip';
        compressedData = await gzip(data, { level: this.config.compressionLevel });
      } else if (this.config.enableDeflate && acceptEncoding.includes('deflate')) {
        encoding = 'deflate';
        compressedData = await deflate(data, { level: this.config.compressionLevel });
      }
      
      if (compressedData) {
        const compressedSize = compressedData.length;
        const compressionRatio = (dataSize - compressedSize) / dataSize;
        
        // Update compression stats
        this.updateCompressionStats(encoding, dataSize, compressedSize, compressionRatio);
        
        return {
          data: compressedData,
          compressed: true,
          encoding,
          originalSize: dataSize,
          compressedSize,
          compressionRatio
        };
      }
    } catch (error) {
      logger.warn('Compression failed', {
        encoding,
        error: error.message,
        dataSize,
        operation: 'compression_error'
      });
    }
    
    // Return uncompressed if compression failed or not supported
    return { data, compressed: false, originalSize: dataSize, compressedSize: dataSize };
  }

  /**
   * Update compression statistics
   */
  updateCompressionStats(encoding, originalSize, compressedSize, ratio) {
    if (!this.compressionStats.has(encoding)) {
      this.compressionStats.set(encoding, {
        uses: 0,
        totalOriginalSize: 0,
        totalCompressedSize: 0,
        avgRatio: 0
      });
    }
    
    const stats = this.compressionStats.get(encoding);
    stats.uses++;
    stats.totalOriginalSize += originalSize;
    stats.totalCompressedSize += compressedSize;
    stats.avgRatio = (stats.totalOriginalSize - stats.totalCompressedSize) / stats.totalOriginalSize;
  }

  /**
   * Update response metrics
   */
  updateMetrics(req, res, originalData, compressedResult, responseTime) {
    if (!this.config.enableResponseMetrics) return;
    
    this.metrics.totalRequests++;
    this.metrics.totalResponseTime += responseTime;
    this.metrics.avgResponseTime = this.metrics.totalResponseTime / this.metrics.totalRequests;
    
    if (responseTime <= this.config.performanceTarget) {
      this.metrics.performanceTargetHits++;
    }
    
    if (compressedResult.compressed) {
      this.metrics.compressedResponses++;
      this.metrics.totalCompressionSavings += (compressedResult.originalSize - compressedResult.compressedSize);
      this.metrics.avgCompressionRatio = this.metrics.totalCompressionSavings / 
        (this.metrics.compressedResponses * compressedResult.originalSize);
    }
  }

  /**
   * Log performance information
   */
  logPerformance(req, res, responseTime, compressedResult) {
    const performanceInfo = {
      path: req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      originalSize: compressedResult.originalSize,
      compressedSize: compressedResult.compressedSize,
      compressed: compressedResult.compressed,
      encoding: compressedResult.encoding,
      compressionRatio: compressedResult.compressionRatio ? 
        (compressedResult.compressionRatio * 100).toFixed(1) + '%' : 'N/A',
      operation: 'response_optimization'
    };
    
    if (responseTime > this.config.performanceTarget) {
      logger.warn('Slow response detected', performanceInfo);
    } else {
      logger.debug('Response optimized', performanceInfo);
    }
  }

  /**
   * Get optimization metrics
   */
  getMetrics() {
    const compressionStatsObj = {};
    for (const [encoding, stats] of this.compressionStats) {
      compressionStatsObj[encoding] = {
        ...stats,
        avgRatio: (stats.avgRatio * 100).toFixed(1) + '%'
      };
    }
    
    return {
      ...this.metrics,
      avgResponseTime: Number(this.metrics.avgResponseTime.toFixed(2)),
      avgCompressionRatio: (this.metrics.avgCompressionRatio * 100).toFixed(1) + '%',
      performanceTargetHitRate: this.metrics.totalRequests > 0 ? 
        (this.metrics.performanceTargetHits / this.metrics.totalRequests * 100).toFixed(1) + '%' : '0%',
      compressionRate: this.metrics.totalRequests > 0 ?
        (this.metrics.compressedResponses / this.metrics.totalRequests * 100).toFixed(1) + '%' : '0%',
      totalCompressionSavings: `${(this.metrics.totalCompressionSavings / 1024).toFixed(1)} KB`,
      compressionStats: compressionStatsObj,
      config: this.config
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      compressedResponses: 0,
      totalCompressionSavings: 0,
      avgCompressionRatio: 0,
      avgResponseTime: 0,
      totalResponseTime: 0,
      performanceTargetHits: 0,
      minifiedResponses: 0
    };
    this.compressionStats.clear();
  }

  /**
   * Configure optimization settings
   */
  configure(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Response optimizer reconfigured', {
      config: this.config,
      operation: 'response_optimizer_config'
    });
  }
}

// Export singleton instance and middleware
const responseOptimizer = new ResponseOptimizer();

export default responseOptimizer.middleware();
export { responseOptimizer, ResponseOptimizer };