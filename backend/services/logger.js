/**
 * ProofKit SaaS Structured Logging & Observability Service
 * Advanced logging system with structured data, metrics, and observability
 * Supports multiple log levels, formats, and outputs
 */

import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Log Levels
 */
export const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace'
};

/**
 * Log Level Priorities (higher number = higher priority)
 */
const LOG_PRIORITIES = {
  [LogLevel.ERROR]: 5,
  [LogLevel.WARN]: 4,
  [LogLevel.INFO]: 3,
  [LogLevel.DEBUG]: 2,
  [LogLevel.TRACE]: 1
};

/**
 * Logger Class
 */
class Logger {
  constructor(options = {}) {
    this.options = {
      level: options.level || LogLevel.INFO,
      format: options.format || 'json',
      enableConsole: options.enableConsole !== false,
      enableFile: options.enableFile || false,
      enableMetrics: options.enableMetrics !== false,
      logDir: options.logDir || join(dirname(__dirname), '..', 'logs'),
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
      maxFiles: options.maxFiles || 5,
      includeTrace: options.includeTrace || false,
      ...options
    };

    this.context = {
      service: options.service || 'proofkit-saas',
      version: options.version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      hostname: os.hostname(),
      pid: process.pid
    };

    this.metrics = {
      totalLogs: 0,
      errorCount: 0,
      warnCount: 0,
      infoCount: 0,
      debugCount: 0,
      traceCount: 0,
      startTime: Date.now(),
      lastLog: null
    };

    this.fileStreams = new Map();
    this.isInitialized = false;

    // Performance tracking
    this.requestMetrics = new Map();
    this.performanceMarks = new Map();

    this.init();
  }

  /**
   * Initialize logger
   */
  async init() {
    if (this.options.enableFile) {
      await this.initializeFileLogging();
    }

    this.isInitialized = true;
    this.info('Logger initialized', { 
      options: this.options,
      context: this.context 
    });
  }

  /**
   * Initialize file logging
   */
  async initializeFileLogging() {
    try {
      await mkdir(this.options.logDir, { recursive: true });
      
      // Create separate streams for different log levels
      const logFiles = ['all', 'error', 'warn'];
      
      for (const type of logFiles) {
        const filename = join(this.options.logDir, `${type}.log`);
        const stream = createWriteStream(filename, { flags: 'a' });
        this.fileStreams.set(type, stream);
      }
    } catch (error) {
      console.error('Failed to initialize file logging:', error);
    }
  }

  /**
   * Create structured log entry
   */
  createLogEntry(level, message, data = {}, context = {}) {
    const timestamp = new Date().toISOString();
    const traceId = context.traceId || this.generateTraceId();
    
    const entry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      service: this.context.service,
      version: this.context.version,
      environment: this.context.environment,
      hostname: this.context.hostname,
      pid: this.context.pid,
      traceId,
      ...data
    };

    // Add stack trace for errors
    if (level === LogLevel.ERROR && data.error) {
      entry.stack = data.error.stack;
      entry.errorName = data.error.name;
      entry.errorMessage = data.error.message;
    }

    // Add request context if available
    if (context.req) {
      entry.request = this.extractRequestInfo(context.req);
    }

    // Add response context if available
    if (context.res) {
      entry.response = this.extractResponseInfo(context.res);
    }

    // Add performance metrics if available
    if (context.performance) {
      entry.performance = context.performance;
    }

    return entry;
  }

  /**
   * Log at specified level
   */
  log(level, message, data = {}, context = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = this.createLogEntry(level, message, data, context);
    
    // Update metrics
    this.updateMetrics(level);
    
    // Output to console
    if (this.options.enableConsole) {
      this.outputToConsole(entry);
    }

    // Output to file
    if (this.options.enableFile) {
      this.outputToFile(entry);
    }

    return entry;
  }

  /**
   * Convenience methods for different log levels
   */
  error(message, data = {}, context = {}) {
    return this.log(LogLevel.ERROR, message, data, context);
  }

  warn(message, data = {}, context = {}) {
    return this.log(LogLevel.WARN, message, data, context);
  }

  info(message, data = {}, context = {}) {
    return this.log(LogLevel.INFO, message, data, context);
  }

  debug(message, data = {}, context = {}) {
    return this.log(LogLevel.DEBUG, message, data, context);
  }

  trace(message, data = {}, context = {}) {
    return this.log(LogLevel.TRACE, message, data, context);
  }

  /**
   * Start performance measurement
   */
  startTimer(name, context = {}) {
    const startTime = performance.now();
    const traceId = context.traceId || this.generateTraceId();
    
    this.performanceMarks.set(name, {
      startTime,
      traceId,
      context
    });

    this.debug('Performance timer started', { 
      timer: name, 
      traceId 
    }, context);

    return traceId;
  }

  /**
   * End performance measurement
   */
  endTimer(name, additionalData = {}) {
    const mark = this.performanceMarks.get(name);
    if (!mark) {
      this.warn('Performance timer not found', { timer: name });
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - mark.startTime;
    
    this.performanceMarks.delete(name);

    const performanceData = {
      timer: name,
      duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
      traceId: mark.traceId,
      ...additionalData
    };

    this.info('Performance timer completed', performanceData, mark.context);

    return performanceData;
  }

  /**
   * Log HTTP request
   */
  logRequest(req, res, duration = null) {
    const requestData = {
      request: this.extractRequestInfo(req),
      response: this.extractResponseInfo(res),
      duration: duration ? Math.round(duration * 100) / 100 : null
    };

    const level = res.statusCode >= 500 ? LogLevel.ERROR : 
                  res.statusCode >= 400 ? LogLevel.WARN : 
                  LogLevel.INFO;

    const message = `HTTP ${req.method} ${req.originalUrl} - ${res.statusCode}`;
    
    this.log(level, message, requestData, { req, res });
  }

  /**
   * Log database operations
   */
  logDatabase(operation, table, duration = null, data = {}) {
    const dbData = {
      database: {
        operation,
        table,
        duration: duration ? Math.round(duration * 100) / 100 : null
      },
      ...data
    };

    this.info(`Database ${operation} on ${table}`, dbData);
  }

  /**
   * Log API calls to external services
   */
  logExternalAPI(service, endpoint, method, duration = null, data = {}) {
    const apiData = {
      externalAPI: {
        service,
        endpoint,
        method,
        duration: duration ? Math.round(duration * 100) / 100 : null
      },
      ...data
    };

    this.info(`External API call to ${service}`, apiData);
  }

  /**
   * Log business events
   */
  logEvent(eventType, eventData = {}, context = {}) {
    const eventEntry = {
      event: {
        type: eventType,
        timestamp: new Date().toISOString(),
        data: eventData
      }
    };

    this.info(`Business event: ${eventType}`, eventEntry, context);
  }

  /**
   * Log security events
   */
  logSecurity(eventType, details = {}, context = {}) {
    const securityData = {
      security: {
        event: eventType,
        details,
        timestamp: new Date().toISOString(),
        severity: details.severity || 'medium'
      }
    };

    const level = details.severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
    this.log(level, `Security event: ${eventType}`, securityData, context);
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext = {}) {
    const childLogger = Object.create(this);
    childLogger.context = { ...this.context, ...additionalContext };
    return childLogger;
  }

  /**
   * Express middleware for request logging
   */
  middleware() {
    return (req, res, next) => {
      const startTime = performance.now();
      const traceId = this.generateTraceId();
      
      // Add trace ID to request for correlation
      req.traceId = traceId;
      
      // Log incoming request
      this.info('Incoming request', {
        request: this.extractRequestInfo(req),
        traceId
      }, { req });

      // Override res.end to log when response is sent
      const originalEnd = res.end;
      res.end = function(...args) {
        const duration = performance.now() - startTime;
        
        // Log completed request
        try {
          this.logRequest(req, res, duration);
        } catch (error) {
          console.warn('Logging error:', error.message);
        }
        
        // Call original end method
        return originalEnd.apply(this, args);
      }.bind(this);

      next();
    };
  }

  /**
   * Error handling middleware
   */
  errorMiddleware() {
    return (error, req, res, next) => {
      this.error('Request error', {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        request: this.extractRequestInfo(req),
        traceId: req.traceId
      }, { req, res });

      next(error);
    };
  }

  /**
   * Extract request information
   */
  extractRequestInfo(req) {
    return {
      method: req.method,
      url: req.originalUrl || req.url,
      headers: this.sanitizeHeaders(req.headers),
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection.remoteAddress,
      query: req.query,
      params: req.params,
      body: this.sanitizeBody(req.body)
    };
  }

  /**
   * Extract response information
   */
  extractResponseInfo(res) {
    return {
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      headers: this.sanitizeHeaders(res.getHeaders())
    };
  }

  /**
   * Sanitize headers (remove sensitive data)
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize request body (remove sensitive data)
   */
  sanitizeBody(body) {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Check if should log at specified level
   */
  shouldLog(level) {
    const currentPriority = LOG_PRIORITIES[this.options.level] || 0;
    const logPriority = LOG_PRIORITIES[level] || 0;
    return logPriority >= currentPriority;
  }

  /**
   * Update metrics
   */
  updateMetrics(level) {
    this.metrics.totalLogs++;
    this.metrics.lastLog = new Date().toISOString();
    
    switch (level) {
      case LogLevel.ERROR:
        this.metrics.errorCount++;
        break;
      case LogLevel.WARN:
        this.metrics.warnCount++;
        break;
      case LogLevel.INFO:
        this.metrics.infoCount++;
        break;
      case LogLevel.DEBUG:
        this.metrics.debugCount++;
        break;
      case LogLevel.TRACE:
        this.metrics.traceCount++;
        break;
    }
  }

  /**
   * Output to console
   */
  outputToConsole(entry) {
    const output = this.options.format === 'json' 
      ? JSON.stringify(entry)
      : this.formatHuman(entry);

    switch (entry.level) {
      case 'ERROR':
        console.error(output);
        break;
      case 'WARN':
        console.warn(output);
        break;
      case 'DEBUG':
      case 'TRACE':
        console.debug(output);
        break;
      default:
        console.log(output);
    }
  }

  /**
   * Output to file
   */
  outputToFile(entry) {
    const line = JSON.stringify(entry) + '\n';
    
    // Write to all logs file
    const allStream = this.fileStreams.get('all');
    if (allStream) {
      allStream.write(line);
    }

    // Write to specific level files
    if (entry.level === 'ERROR') {
      const errorStream = this.fileStreams.get('error');
      if (errorStream) {
        errorStream.write(line);
      }
    } else if (entry.level === 'WARN') {
      const warnStream = this.fileStreams.get('warn');
      if (warnStream) {
        warnStream.write(line);
      }
    }
  }

  /**
   * Format log entry for human reading
   */
  formatHuman(entry) {
    const timestamp = new Date(entry.timestamp).toLocaleString();
    const level = entry.level.padEnd(5);
    let output = `[${timestamp}] ${level} ${entry.message}`;
    
    if (entry.traceId) {
      output += ` [${entry.traceId}]`;
    }

    if (entry.request) {
      output += ` ${entry.request.method} ${entry.request.url}`;
    }

    if (entry.performance && entry.performance.duration) {
      output += ` (${entry.performance.duration}ms)`;
    }

    return output;
  }

  /**
   * Generate trace ID
   */
  generateTraceId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  /**
   * Get logger metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime,
      memoryUsage: process.memoryUsage(),
      activeTimers: this.performanceMarks.size
    };
  }

  /**
   * Set log level
   */
  setLevel(level) {
    if (LOG_PRIORITIES[level] !== undefined) {
      this.options.level = level;
      this.info('Log level changed', { newLevel: level });
    } else {
      this.warn('Invalid log level', { attemptedLevel: level });
    }
  }

  /**
   * Flush all streams
   */
  async flush() {
    const promises = [];
    
    for (const stream of this.fileStreams.values()) {
      promises.push(new Promise((resolve) => {
        stream.end(resolve);
      }));
    }

    await Promise.all(promises);
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.info('Logger shutting down');
    await this.flush();
  }
}

/**
 * Create singleton logger instance
 */
export const logger = new Logger({
  level: process.env.LOG_LEVEL || LogLevel.INFO,
  enableFile: process.env.NODE_ENV === 'production',
  service: 'proofkit-saas',
  version: process.env.npm_package_version || '1.0.0'
});

/**
 * Create logger with custom configuration
 */
export function createLogger(options = {}) {
  return new Logger(options);
}

/**
 * Default export
 */
export default logger;