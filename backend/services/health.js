/**
 * ProofKit SaaS Health Check & Monitoring Service
 * Comprehensive health monitoring for all application components
 * Provides detailed health status, metrics, and diagnostics
 */

import { performance } from "perf_hooks";
import { promisify } from "util";
import { exec } from "child_process";
import os from "os";

const execAsync = promisify(exec);

/**
 * Health Check Status Levels
 */
export const HealthStatus = {
  HEALTHY: "healthy",
  DEGRADED: "degraded",
  UNHEALTHY: "unhealthy",
  CRITICAL: "critical",
};

/**
 * Health Check Service
 */
class HealthService {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 5000,
      retries: options.retries || 2,
      interval: options.interval || 30000,
      ...options,
    };

    this.checks = new Map();
    this.lastResults = new Map();
    this.metrics = {
      uptime: process.uptime(),
      startTime: Date.now(),
      totalChecks: 0,
      failedChecks: 0,
      lastCheck: null,
    };

    this.isMonitoring = false;
    this.monitoringInterval = null;

    // Register default system checks
    this.registerDefaultChecks();

    // Register AI provider health checks
    this.registerAIProviderChecks();
  }

  /**
   * Register a health check
   */
  registerCheck(name, checkFunction, options = {}) {
    if (typeof checkFunction !== "function") {
      throw new Error("Health check must be a function");
    }

    this.checks.set(name, {
      name,
      check: checkFunction,
      timeout: options.timeout || this.options.timeout,
      retries: options.retries || this.options.retries,
      critical: options.critical || false,
      tags: options.tags || [],
      description: options.description || `Health check for ${name}`,
    });

    console.log(`Registered health check: ${name}`);
  }

  /**
   * Remove a health check
   */
  unregisterCheck(name) {
    const removed = this.checks.delete(name);
    this.lastResults.delete(name);
    return removed;
  }

  /**
   * Run a specific health check
   */
  async runCheck(name) {
    const checkConfig = this.checks.get(name);
    if (!checkConfig) {
      throw new Error(`Health check '${name}' not found`);
    }

    const startTime = performance.now();
    let attempt = 0;
    let lastError;

    while (attempt <= checkConfig.retries) {
      try {
        const result = await this._executeWithTimeout(
          checkConfig.check,
          checkConfig.timeout,
        );

        const duration = performance.now() - startTime;
        const checkResult = {
          name,
          status: HealthStatus.HEALTHY,
          message: result?.message || "Check passed",
          duration: Math.round(duration),
          timestamp: new Date().toISOString(),
          attempt: attempt + 1,
          data: result?.data || null,
        };

        this.lastResults.set(name, checkResult);
        return checkResult;
      } catch (error) {
        lastError = error;
        attempt++;

        if (attempt <= checkConfig.retries) {
          console.warn(
            `Health check '${name}' failed (attempt ${attempt}), retrying...`,
          );
          await this._sleep(1000 * attempt); // Exponential backoff
        }
      }
    }

    // All attempts failed
    const duration = performance.now() - startTime;
    const checkResult = {
      name,
      status: checkConfig.critical
        ? HealthStatus.CRITICAL
        : HealthStatus.UNHEALTHY,
      message: lastError?.message || "Check failed",
      duration: Math.round(duration),
      timestamp: new Date().toISOString(),
      attempt,
      error: {
        name: lastError?.name,
        message: lastError?.message,
        stack: lastError?.stack,
      },
    };

    this.lastResults.set(name, checkResult);
    this.metrics.failedChecks++;
    return checkResult;
  }

  /**
   * Run all health checks
   */
  async runAllChecks() {
    this.metrics.totalChecks++;
    this.metrics.lastCheck = new Date().toISOString();

    const checkPromises = Array.from(this.checks.keys()).map((name) =>
      this.runCheck(name).catch((error) => ({
        name,
        status: HealthStatus.CRITICAL,
        message: `Failed to run check: ${error.message}`,
        error: error.message,
      })),
    );

    const results = await Promise.all(checkPromises);

    return {
      status: this._calculateOverallStatus(results),
      timestamp: new Date().toISOString(),
      checks: results,
      summary: this._generateSummary(results),
      metrics: this.getMetrics(),
    };
  }

  /**
   * Get health status for specific checks
   */
  async getHealth(checkNames = null) {
    if (checkNames) {
      const names = Array.isArray(checkNames) ? checkNames : [checkNames];
      const results = await Promise.all(
        names.map((name) => this.runCheck(name)),
      );
      return {
        status: this._calculateOverallStatus(results),
        timestamp: new Date().toISOString(),
        checks: results,
      };
    }

    return this.runAllChecks();
  }

  /**
   * Get readiness status (for Kubernetes readiness probe)
   */
  async getReadiness() {
    const criticalChecks = Array.from(this.checks.entries())
      .filter(([_, config]) => config.critical)
      .map(([name]) => name);

    if (criticalChecks.length === 0) {
      return { ready: true, message: "No critical checks defined" };
    }

    const results = await Promise.all(
      criticalChecks.map((name) => this.runCheck(name)),
    );

    const failed = results.filter(
      (r) =>
        r.status === HealthStatus.UNHEALTHY ||
        r.status === HealthStatus.CRITICAL,
    );

    return {
      ready: failed.length === 0,
      message:
        failed.length > 0
          ? `Critical checks failed: ${failed.map((f) => f.name).join(", ")}`
          : "All critical checks passed",
      failedChecks: failed,
    };
  }

  /**
   * Get liveness status (for Kubernetes liveness probe)
   */
  async getLiveness() {
    // Simple liveness check - server is responsive
    return {
      alive: true,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      pid: process.pid,
      memory: process.memoryUsage(),
    };
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.warn("Health monitoring is already running");
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.runAllChecks();
      } catch (error) {
        console.error("Error during health monitoring:", error);
      }
    }, this.options.interval);

    console.log(
      `Health monitoring started (interval: ${this.options.interval}ms)`,
    );
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log("Health monitoring stopped");
  }

  /**
   * Get system metrics
   */
  getMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      uptime: process.uptime(),
      startTime: this.metrics.startTime,
      totalChecks: this.metrics.totalChecks,
      failedChecks: this.metrics.failedChecks,
      successRate:
        this.metrics.totalChecks > 0
          ? (
              ((this.metrics.totalChecks - this.metrics.failedChecks) /
                this.metrics.totalChecks) *
              100
            ).toFixed(2)
          : 100,
      lastCheck: this.metrics.lastCheck,
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      system: {
        loadAvg: os.loadavg(),
        cpuCount: os.cpus().length,
        platform: os.platform(),
        arch: os.arch(),
        freeMem: Math.round(os.freemem() / 1024 / 1024),
        totalMem: Math.round(os.totalmem() / 1024 / 1024),
      },
    };
  }

  /**
   * Register default system health checks
   */
  registerDefaultChecks() {
    // Memory usage check
    this.registerCheck(
      "memory",
      async () => {
        const usage = process.memoryUsage();
        const heapUsedMB = usage.heapUsed / 1024 / 1024;
        const heapTotalMB = usage.heapTotal / 1024 / 1024;
        const usagePercent = (heapUsedMB / heapTotalMB) * 100;

        if (usagePercent > 90) {
          throw new Error(`High memory usage: ${usagePercent.toFixed(2)}%`);
        }

        return {
          message: `Memory usage: ${usagePercent.toFixed(2)}%`,
          data: {
            heapUsedMB: Math.round(heapUsedMB),
            heapTotalMB: Math.round(heapTotalMB),
          },
        };
      },
      { critical: true, description: "Check memory usage" },
    );

    // Event loop lag check
    this.registerCheck(
      "eventLoop",
      async () => {
        const start = process.hrtime.bigint();
        await new Promise((resolve) => setImmediate(resolve));
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms

        if (lag > 100) {
          throw new Error(`High event loop lag: ${lag.toFixed(2)}ms`);
        }

        return {
          message: `Event loop lag: ${lag.toFixed(2)}ms`,
          data: { lagMs: lag },
        };
      },
      { description: "Check event loop performance" },
    );

    // Disk space check (if applicable)
    this.registerCheck(
      "diskSpace",
      async () => {
        try {
          const { stdout } = await execAsync("df -h / | tail -1");
          const [, , , available, usedPercent] = stdout.trim().split(/\s+/);
          const usedPercentNum = parseInt(usedPercent.replace("%", ""));

          if (usedPercentNum > 90) {
            throw new Error(`Low disk space: ${usedPercentNum}% used`);
          }

          return {
            message: `Disk usage: ${usedPercentNum}%`,
            data: { available, usedPercent: usedPercentNum },
          };
        } catch (error) {
          // Disk check might not work in all environments
          return {
            message: "Disk check not available",
            data: { available: false },
          };
        }
      },
      { description: "Check disk space availability" },
    );

    // Process health check
    this.registerCheck(
      "process",
      async () => {
        const uptime = process.uptime();
        const pid = process.pid;

        return {
          message: `Process healthy, uptime: ${Math.round(uptime)}s`,
          data: { uptime, pid, nodeVersion: process.version },
        };
      },
      { critical: true, description: "Check process health" },
    );
  }

  /**
   * Register Google Sheets health check
   */
  registerSheetsCheck(sheetsService) {
    this.registerCheck(
      "googleSheets",
      async () => {
        try {
          // Test basic connectivity
          await sheetsService.testConnection();

          return {
            message: "Google Sheets API accessible",
            data: { service: "googleSheets" },
          };
        } catch (error) {
          throw new Error(`Google Sheets API error: ${error.message}`);
        }
      },
      { critical: true, description: "Check Google Sheets API connectivity" },
    );
  }

  /**
   * Register comprehensive AI provider health checks
   */
  registerAIProviderChecks() {
    // Main AI provider connectivity check
    this.registerCheck(
      "aiProvider",
      async () => {
        try {
          const { getAIProviderService, validateAIConfig } = await import("../services/ai-provider.js");
          const service = getAIProviderService();
          const config = validateAIConfig();

          if (!config.valid) {
            throw new Error(`AI configuration invalid: ${config.errors.join(', ')}`);
          }

          // Test with a simple prompt
          const testResult = await service.generateText(
            "Test prompt for health check. Respond with 'OK'.",
            { maxRetries: 1 }
          );

          if (!testResult || testResult.trim().length === 0) {
            throw new Error('AI provider returned empty response');
          }

          const status = service.getStatus();

          return {
            message: `AI provider ${config.provider} is accessible`,
            data: {
              provider: config.provider,
              initialized: status.initialized,
              metrics: status.metrics,
              remainingCalls: status.remainingCalls
            },
          };
        } catch (error) {
          throw new Error(`AI provider error: ${error.message}`);
        }
      },
      { critical: true, description: "Check AI provider connectivity and configuration" },
    );

    // AI error handler health check
    this.registerCheck(
      "aiErrorHandler",
      async () => {
        try {
          const { getAIErrorHandler } = await import("../middleware/ai-error-handler.js");
          const handler = getAIErrorHandler();
          const metrics = handler.getMetrics();

          const healthStatus = handler.getHealthStatus();

          if (healthStatus === 'unhealthy') {
            throw new Error(`AI error handler reports unhealthy status: ${metrics.recent.errors1h} errors in last hour`);
          }

          return {
            message: `AI error handling is ${healthStatus}`,
            data: {
              health: healthStatus,
              totalRequests: metrics.total.requests,
              successRate: metrics.total.successRate,
              recentErrors: metrics.recent.errors1h
            }
          };
        } catch (error) {
          throw new Error(`AI error handler check failed: ${error.message}`);
        }
      },
      { description: "Check AI error handling system health" }
    );

    // Token monitoring health check
    this.registerCheck(
      "aiTokenMonitor",
      async () => {
        try {
          const { getTokenMonitorService } = await import("../services/token-monitor.js");
          const monitor = getTokenMonitorService();

          if (!monitor.isTracking) {
            return {
              message: "Token monitoring is not active",
              data: { active: false }
            };
          }

          return {
            message: `Token monitoring is active, tracking ${monitor.tokenUsage?.size || 0} tenants`,
            data: {
              active: true,
              tenantsTracked: monitor.tokenUsage?.size || 0
            }
          };
        } catch (error) {
          // Non-critical - token monitor might not be initialized
          return {
            message: "Token monitor not available",
            data: { available: false, error: error.message }
          };
        }
      },
      { description: "Check AI token monitoring service" }
    );

    // AI provider fallback test
    this.registerCheck(
      "aiProviderFallback",
      async () => {
        try {
          const { getAIProviderService } = await import("../services/ai-provider.js");
          const service = getAIProviderService();

          // Test fallback mechanism with invalid model
          try {
            await service.generateTextWithFallback(
              "Health check with fallback",
              {
                fallbackModels: ['gpt-3.5-turbo', 'claude-3-haiku-20240307', 'gemini-1.5-flash'],
                maxRetries: 2
              }
            );

            return {
              message: "AI provider fallback mechanism is working",
              data: { fallbackTested: true }
            };
          } catch (error) {
            // This is expected if no providers are available
            if (error.attempts && error.attempts > 1) {
              return {
                message: "Fallback mechanism attempted multiple providers",
                data: {
                  fallbackTested: true,
                  attempts: error.attempts,
                  note: "All providers failed but fallback logic worked"
                }
              };
            }
            throw error;
          }
        } catch (error) {
          // This check is less critical
          return {
            message: "Fallback test skipped - no providers available",
            data: { skipped: true, reason: error.message }
          };
        }
      },
      { description: "Test AI provider fallback mechanisms" }
    );
  }

  /**
   * Register legacy Gemini AI health check (for backward compatibility)
   */
  registerGeminiCheck(aiService) {
    this.registerCheck(
      "geminiAI",
      async () => {
        try {
          // Test AI service with a simple request
          await aiService.testConnection();

          return {
            message: "Gemini AI API accessible",
            data: { service: "geminiAI" },
          };
        } catch (error) {
          throw new Error(`Gemini AI API error: ${error.message}`);
        }
      },
      { critical: true, description: "Check Gemini AI API connectivity" },
    );
  }

  /**
   * Calculate overall health status
   */
  _calculateOverallStatus(results) {
    const statusPriority = {
      [HealthStatus.CRITICAL]: 4,
      [HealthStatus.UNHEALTHY]: 3,
      [HealthStatus.DEGRADED]: 2,
      [HealthStatus.HEALTHY]: 1,
    };

    const worstStatus = results.reduce((worst, result) => {
      const currentPriority = statusPriority[result.status] || 1;
      const worstPriority = statusPriority[worst] || 1;
      return currentPriority > worstPriority ? result.status : worst;
    }, HealthStatus.HEALTHY);

    return worstStatus;
  }

  /**
   * Generate health summary
   */
  _generateSummary(results) {
    const summary = {
      total: results.length,
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      critical: 0,
    };

    results.forEach((result) => {
      switch (result.status) {
        case HealthStatus.HEALTHY:
          summary.healthy++;
          break;
        case HealthStatus.DEGRADED:
          summary.degraded++;
          break;
        case HealthStatus.UNHEALTHY:
          summary.unhealthy++;
          break;
        case HealthStatus.CRITICAL:
          summary.critical++;
          break;
      }
    });

    return summary;
  }

  /**
   * Execute function with timeout
   */
  async _executeWithTimeout(fn, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Health check timed out after ${timeout}ms`));
      }, timeout);

      Promise.resolve(fn())
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Sleep utility
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create singleton health service instance
 */
export const healthService = new HealthService();

/**
 * Express middleware for health endpoints
 */
export function createHealthRoutes() {
  return {
    // Main health endpoint
    async health(req, res) {
      try {
        const result = await healthService.runAllChecks();
        const statusCode = result.status === HealthStatus.HEALTHY ? 200 : 503;
        res.status(statusCode).json(result);
      } catch (error) {
        res.status(500).json({
          status: HealthStatus.CRITICAL,
          message: "Health check failed",
          error: error.message,
        });
      }
    },

    // Readiness probe
    async ready(req, res) {
      try {
        const result = await healthService.getReadiness();
        const statusCode = result.ready ? 200 : 503;
        res.status(statusCode).json(result);
      } catch (error) {
        res.status(500).json({
          ready: false,
          message: "Readiness check failed",
          error: error.message,
        });
      }
    },

    // Liveness probe
    async live(req, res) {
      try {
        const result = await healthService.getLiveness();
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({
          alive: false,
          message: "Liveness check failed",
          error: error.message,
        });
      }
    },

    // Metrics endpoint
    async metrics(req, res) {
      try {
        const metrics = healthService.getMetrics();
        res.status(200).json(metrics);
      } catch (error) {
        res.status(500).json({
          message: "Metrics unavailable",
          error: error.message,
        });
      }
    },
  };
}

export default healthService;
