/**
 * Advanced Security Middleware
 * Provides comprehensive security including DDoS protection, rate limiting,
 * input validation, and threat detection
 */

import crypto from "crypto";
import { getDoc, ensureSheet } from "../services/sheets.js";

// CSP Nonce store for request-specific nonces
const cspNonces = new Map();

class SecurityMiddleware {
  constructor() {
    // DDoS Protection
    this.ddosProtection = {
      enabled: true,
      thresholds: {
        requests_per_second: Number(process.env.DDOS_RPS_THRESHOLD || 50),
        requests_per_minute: Number(process.env.DDOS_RPM_THRESHOLD || 1000),
        concurrent_connections: Number(
          process.env.DDOS_CONCURRENT_THRESHOLD || 100,
        ),
        payload_size_mb: Number(process.env.DDOS_PAYLOAD_SIZE_MB || 10),
      },
      blacklist: new Set(),
      greylist: new Map(), // IP -> { strikes, firstStrike, lastActivity }
      whitelist: new Set(),
      activeBans: new Map(), // IP -> banUntil timestamp
      connectionCount: new Map(), // IP -> count
      requestCounts: new Map(), // IP -> { second: count, minute: count, lastReset }
      suspiciousPatterns: new Map(), // IP -> pattern detection data
    };

    // Rate Limiting (enhanced from existing)
    this.rateLimiting = {
      enabled: true,
      buckets: new Map(),
      dynamicLimits: new Map(), // tenant -> adjusted limits based on behavior
      burstAllowance: new Map(), // temporary burst capacity
      priorityQueues: new Map(), // different queues for different request types
    };

    // Input Validation & Sanitization
    this.inputValidation = {
      enabled: true,
      maxFieldLength: 10000,
      maxFields: 100,
      allowedChars: /^[a-zA-Z0-9\s\-_@.,!?()[\]{}:;'"\/\\+=]*$/,
      sqlInjectionPatterns: [
        /(\bUNION\b.*\bSELECT\b)|(\bSELECT\b.*\bFROM\b)|(\bINSERT\b.*\bINTO\b)|(\bUPDATE\b.*\bSET\b)|(\bDELETE\b.*\bFROM\b)/i,
        /(\bDROP\b.*\bTABLE\b)|(\bALTER\b.*\bTABLE\b)|(\bCREATE\b.*\bTABLE\b)/i,
        /(\bEXEC\b)|(\bEXECUTE\b)|(\bSP_\w+)/i,
        /(\\x[0-9a-f]{2})|(%[0-9a-f]{2})|(\\\w)/i,
      ],
      xssPatterns: [
        /<script[^>]*>.*?<\/script>/gi,
        /<iframe[^>]*>.*?<\/iframe>/gi,
        /on\w+\s*=\s*["'].*?["']/gi,
        /javascript:/gi,
        /<img[^>]+src\s*=\s*["']javascript:/gi,
      ],
      commandInjectionPatterns: [
        /(\||;|&|`|\$\(|\${)/,
        /(bash|sh|cmd|powershell|wget|curl|nc|netcat)/i,
        /(rm\s|del\s|format\s|fdisk)/i,
      ],
    };

    // Threat Detection
    this.threatDetection = {
      enabled: true,
      anomalyThresholds: {
        requestSizeVariance: 10, // Standard deviations from normal
        timingVariance: 5,
        patternSimilarity: 0.8,
      },
      knownAttackPatterns: new Map(),
      behaviorBaselines: new Map(), // IP -> normal behavior patterns
      alertQueue: [],
    };

    // Enhanced Security Headers Configuration
    this.securityHeaders = {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "0", // Disabled in favor of CSP
      "Strict-Transport-Security":
        "max-age=63072000; includeSubDomains; preload",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy":
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=()",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Permitted-Cross-Domain-Policies": "none",
      "X-Download-Options": "noopen",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    };

    // CSP Configuration with environment-specific policies
    this.cspConfig = {
      production: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'strict-dynamic'"],
        "style-src": ["'self'", "'unsafe-inline'"], // Required for many CSS frameworks
        "img-src": ["'self'", "data:", "https:"],
        "font-src": ["'self'", "https:"],
        "connect-src": ["'self'", "https:"],
        "media-src": ["'self'"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"],
        "frame-ancestors": ["'none'"],
        "frame-src": ["'none'"],
        "worker-src": ["'self'"],
        "manifest-src": ["'self'"],
        "upgrade-insecure-requests": true,
        "block-all-mixed-content": true,
        "report-uri": "/api/csp-report",
        "report-to": "csp-endpoint",
      },
      development: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-eval'", "'strict-dynamic'"], // unsafe-eval for dev tools
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "https:", "http:"],
        "font-src": ["'self'", "https:", "http:"],
        "connect-src": ["'self'", "https:", "http:", "ws:", "wss:"],
        "media-src": ["'self'"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"],
        "frame-ancestors": ["'none'"],
        "frame-src": ["'none'"],
        "worker-src": ["'self'"],
        "manifest-src": ["'self'"],
        "report-uri": "/api/csp-report",
      },
    };

    // Initialize security monitoring
    this.initializeMonitoring();
  }

  /**
   * Main security middleware function
   */
  middleware() {
    return async (req, res, next) => {
      const startTime = Date.now();
      const clientIP = this.getClientIP(req);
      const userAgent = req.headers["user-agent"] || "unknown";

      try {
        // Apply security headers
        this.applySecurityHeaders(res, req);

        // Check if IP is banned
        if (this.isIPBanned(clientIP)) {
          return this.blockRequest(
            res,
            "IP_BANNED",
            "IP address is temporarily banned",
          );
        }

        // DDoS Protection
        const ddosCheck = await this.checkDDoSProtection(req, clientIP);
        if (!ddosCheck.allowed) {
          return this.blockRequest(res, "DDOS_PROTECTION", ddosCheck.reason);
        }

        // Rate Limiting (enhanced)
        const rateLimitCheck = await this.checkEnhancedRateLimit(req, clientIP);
        if (!rateLimitCheck.allowed) {
          return this.blockRequest(
            res,
            "RATE_LIMITED",
            rateLimitCheck.reason,
            rateLimitCheck.retryAfter,
          );
        }

        // Input Validation & Sanitization
        const inputCheck = this.validateAndSanitizeInput(req);
        if (!inputCheck.valid) {
          await this.logSecurityEvent(clientIP, "MALICIOUS_INPUT", {
            violations: inputCheck.violations,
            path: req.path,
            userAgent: userAgent,
          });
          return this.blockRequest(res, "INVALID_INPUT", inputCheck.reason);
        }

        // Threat Detection (disabled in development)
        if (process.env.NODE_ENV !== "development") {
          const threatCheck = await this.detectThreats(req, clientIP);
          if (threatCheck.threatDetected) {
            await this.logSecurityEvent(clientIP, "THREAT_DETECTED", {
              threats: threatCheck.threats,
              path: req.path,
              severity: threatCheck.severity,
            });

            if (threatCheck.severity === "HIGH") {
              return this.blockRequest(
                res,
                "THREAT_DETECTED",
                threatCheck.reason,
              );
            }
          }
        }

        // Update behavior tracking
        this.updateBehaviorTracking(clientIP, req, startTime);

        // Add security context to request
        req.security = {
          clientIP: clientIP,
          threats: [], // Empty in development mode
          riskScore: this.calculateRiskScore(clientIP, req),
          timestamp: Date.now(),
        };

        next();
      } catch (error) {
        console.error("Security: Error in security middleware:", error);
        await this.logSecurityEvent(clientIP, "MIDDLEWARE_ERROR", {
          error: error.message,
          path: req.path,
        });

        // Fail securely - continue with request but log the error
        next();
      }
    };
  }

  /**
   * DDoS Protection Implementation
   */
  async checkDDoSProtection(req, clientIP) {
    const now = Date.now();
    const userAgent = req.headers["user-agent"] || "unknown";

    // Check whitelist
    if (this.ddosProtection.whitelist.has(clientIP)) {
      return { allowed: true };
    }

    // Check blacklist
    if (this.ddosProtection.blacklist.has(clientIP)) {
      return { allowed: false, reason: "IP blacklisted" };
    }

    // Check active bans
    const banUntil = this.ddosProtection.activeBans.get(clientIP);
    if (banUntil && now < banUntil) {
      return { allowed: false, reason: "IP temporarily banned" };
    } else if (banUntil && now >= banUntil) {
      this.ddosProtection.activeBans.delete(clientIP);
    }

    // Check payload size
    const contentLength = parseInt(req.headers["content-length"] || "0");
    if (
      contentLength >
      this.ddosProtection.thresholds.payload_size_mb * 1024 * 1024
    ) {
      await this.addStrike(clientIP, "LARGE_PAYLOAD");
      return { allowed: false, reason: "Payload too large" };
    }

    // Track concurrent connections
    this.updateConnectionCount(clientIP, 1);
    const concurrentConnections =
      this.ddosProtection.connectionCount.get(clientIP) || 0;
    if (
      concurrentConnections >
      this.ddosProtection.thresholds.concurrent_connections
    ) {
      await this.addStrike(clientIP, "TOO_MANY_CONNECTIONS");
      return { allowed: false, reason: "Too many concurrent connections" };
    }

    // Track request frequency
    const requestCounts = this.ddosProtection.requestCounts.get(clientIP) || {
      second: 0,
      minute: 0,
      lastReset: now,
    };

    // Reset counters if needed
    if (now - requestCounts.lastReset > 60000) {
      // 1 minute
      requestCounts.minute = 0;
      requestCounts.second = 0;
      requestCounts.lastReset = now;
    } else if (now - requestCounts.lastReset > 1000) {
      // 1 second
      requestCounts.second = 0;
    }

    requestCounts.second++;
    requestCounts.minute++;
    this.ddosProtection.requestCounts.set(clientIP, requestCounts);

    // Check thresholds
    if (
      requestCounts.second > this.ddosProtection.thresholds.requests_per_second
    ) {
      await this.addStrike(clientIP, "HIGH_FREQUENCY_REQUESTS");
      return { allowed: false, reason: "Too many requests per second" };
    }

    if (
      requestCounts.minute > this.ddosProtection.thresholds.requests_per_minute
    ) {
      await this.addStrike(clientIP, "HIGH_VOLUME_REQUESTS");
      return { allowed: false, reason: "Too many requests per minute" };
    }

    // Pattern detection for sophisticated attacks
    const suspiciousActivity = this.detectSuspiciousPatterns(clientIP, req);
    if (suspiciousActivity.detected) {
      await this.addStrike(clientIP, suspiciousActivity.type);
      if (suspiciousActivity.severity === "HIGH") {
        return { allowed: false, reason: suspiciousActivity.reason };
      }
    }

    return { allowed: true };
  }

  /**
   * Enhanced Rate Limiting with Dynamic Adjustment
   */
  async checkEnhancedRateLimit(req, clientIP) {
    const tenantId = req.query?.tenant || req.body?.tenant || "default";
    const endpoint = this.normalizeEndpoint(req.path);
    const now = Date.now();

    // Get dynamic limits (adjusted based on tenant behavior)
    const limits = this.getDynamicLimits(tenantId, endpoint);
    const key = `${tenantId}:${endpoint}:${clientIP}`;

    // Check for burst allowance
    const burstKey = `${tenantId}:${clientIP}`;
    const burstAllowance = this.rateLimiting.burstAllowance.get(burstKey) || 0;

    const bucket = this.rateLimiting.buckets.get(key) || {
      count: 0,
      resetTime: now + limits.window,
      firstRequest: now,
      burstUsed: 0,
    };

    // Reset bucket if window expired
    if (now >= bucket.resetTime) {
      bucket.count = 0;
      bucket.resetTime = now + limits.window;
      bucket.firstRequest = now;
      bucket.burstUsed = 0;
    }

    bucket.count++;

    // Check if over normal limit
    if (bucket.count > limits.max) {
      // Try to use burst allowance
      if (burstAllowance > bucket.burstUsed) {
        bucket.burstUsed++;
        this.rateLimiting.burstAllowance.set(burstKey, burstAllowance - 1);
      } else {
        // Rate limited
        this.rateLimiting.buckets.set(key, bucket);

        const retryAfter = Math.ceil((bucket.resetTime - now) / 1000);
        return {
          allowed: false,
          reason: "Rate limit exceeded",
          retryAfter: retryAfter,
        };
      }
    }

    this.rateLimiting.buckets.set(key, bucket);

    // Adjust limits based on behavior
    this.adjustDynamicLimits(tenantId, endpoint, bucket);

    return { allowed: true };
  }

  /**
   * Input Validation & Sanitization
   */
  validateAndSanitizeInput(req) {
    const violations = [];

    try {
      // Validate query parameters
      if (req.query) {
        const queryViolations = this.validateObject(req.query, "query");
        violations.push(...queryViolations);
      }

      // Validate request body
      if (req.body) {
        const bodyViolations = this.validateObject(req.body, "body");
        violations.push(...bodyViolations);
      }

      // Validate headers for malicious content
      const headerViolations = this.validateHeaders(req.headers);
      violations.push(...headerViolations);

      // Check for overall request structure anomalies
      const structureViolations = this.validateRequestStructure(req);
      violations.push(...structureViolations);

      if (violations.length > 0) {
        return {
          valid: false,
          violations: violations,
          reason: `Input validation failed: ${violations.map((v) => v.type).join(", ")}`,
        };
      }

      return { valid: true };
    } catch (error) {
      console.error("Security: Error in input validation:", error);
      return {
        valid: false,
        violations: [
          { type: "VALIDATION_ERROR", field: "unknown", value: "error" },
        ],
        reason: "Input validation error",
      };
    }
  }

  /**
   * Threat Detection Engine
   */
  async detectThreats(req, clientIP) {
    const threats = [];
    let severity = "LOW";
    const userAgent = req.headers["user-agent"] || "unknown";

    // Check for known attack patterns
    const knownPatternThreats = this.checkKnownAttackPatterns(req);
    threats.push(...knownPatternThreats);

    // Behavioral anomaly detection
    const behaviorThreats = this.detectBehavioralAnomalies(clientIP, req);
    threats.push(...behaviorThreats);

    // Check for bot activity
    const botThreats = this.detectBotActivity(req, userAgent);
    threats.push(...botThreats);

    // Check for reconnaissance activities
    const reconThreats = this.detectReconnaissance(clientIP, req);
    threats.push(...reconThreats);

    // Check for credential stuffing / brute force
    const bruteForceThreats = this.detectBruteForce(clientIP, req);
    threats.push(...bruteForceThreats);

    // Determine overall severity
    if (threats.some((t) => t.severity === "HIGH")) {
      severity = "HIGH";
    } else if (threats.some((t) => t.severity === "MEDIUM")) {
      severity = "MEDIUM";
    }

    return {
      threatDetected: threats.length > 0,
      threats: threats,
      severity: severity,
      reason:
        threats.length > 0
          ? `Threats detected: ${threats.map((t) => t.type).join(", ")}`
          : null,
    };
  }

  /**
   * Helper Methods
   */

  getClientIP(req) {
    return (
      req.headers["cf-connecting-ip"] ||
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.headers["x-real-ip"] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      "unknown"
    );
  }

  applySecurityHeaders(res, req = null) {
    // Apply base security headers
    Object.entries(this.securityHeaders).forEach(([header, value]) => {
      res.setHeader(header, value);
    });

    // Generate and apply CSP with nonce
    if (req) {
      const cspHeader = this.generateCSPHeader(req);
      res.setHeader("Content-Security-Policy", cspHeader);

      // Also set report-only header for monitoring
      const reportOnlyCSP = this.generateCSPHeader(req, true);
      res.setHeader("Content-Security-Policy-Report-Only", reportOnlyCSP);
    }

    // Add additional dynamic headers
    res.setHeader("X-Request-ID", crypto.randomUUID());
    res.setHeader("X-Security-Timestamp", Date.now().toString());
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-DNS-Prefetch-Control", "off");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    res.setHeader("X-Download-Options", "noopen");
  }

  blockRequest(res, code, reason, retryAfter = null) {
    const response = {
      success: false,
      error: "security_violation",
      code: code,
      message: reason,
      timestamp: new Date().toISOString(),
    };

    if (retryAfter) {
      res.setHeader("Retry-After", retryAfter);
      response.retryAfter = retryAfter;
    }

    res.setHeader("X-Security-Block", code);

    // Use different status codes based on violation type
    let statusCode = 403;
    if (code === "RATE_LIMITED" || code === "DDOS_PROTECTION") {
      statusCode = 429;
    } else if (code === "INVALID_INPUT") {
      statusCode = 400;
    }

    return res.status(statusCode).json(response);
  }

  isIPBanned(clientIP) {
    const now = Date.now();
    const banUntil = this.ddosProtection.activeBans.get(clientIP);
    return banUntil && now < banUntil;
  }

  async addStrike(clientIP, reason) {
    const now = Date.now();
    const greylistEntry = this.ddosProtection.greylist.get(clientIP) || {
      strikes: 0,
      firstStrike: now,
      lastActivity: now,
    };

    greylistEntry.strikes++;
    greylistEntry.lastActivity = now;

    this.ddosProtection.greylist.set(clientIP, greylistEntry);

    // Progressive punishment
    if (greylistEntry.strikes >= 10) {
      // Ban for 1 hour
      this.ddosProtection.activeBans.set(clientIP, now + 60 * 60 * 1000);
      this.ddosProtection.blacklist.add(clientIP);
    } else if (greylistEntry.strikes >= 5) {
      // Ban for 10 minutes
      this.ddosProtection.activeBans.set(clientIP, now + 10 * 60 * 1000);
    }

    await this.logSecurityEvent(clientIP, "STRIKE_ADDED", {
      reason: reason,
      totalStrikes: greylistEntry.strikes,
      timeWindow: now - greylistEntry.firstStrike,
    });
  }

  updateConnectionCount(clientIP, delta) {
    const current = this.ddosProtection.connectionCount.get(clientIP) || 0;
    const newCount = Math.max(0, current + delta);

    if (newCount === 0) {
      this.ddosProtection.connectionCount.delete(clientIP);
    } else {
      this.ddosProtection.connectionCount.set(clientIP, newCount);
    }
  }

  detectSuspiciousPatterns(clientIP, req) {
    const userAgent = req.headers["user-agent"] || "unknown";
    const patterns = this.ddosProtection.suspiciousPatterns.get(clientIP) || {
      userAgents: new Set(),
      endpoints: new Set(),
      methods: new Set(),
      timings: [],
      lastActivity: Date.now(),
    };

    patterns.userAgents.add(userAgent);
    patterns.endpoints.add(req.path);
    patterns.methods.add(req.method);
    patterns.timings.push(Date.now());
    patterns.lastActivity = Date.now();

    // Keep only recent timings (last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    patterns.timings = patterns.timings.filter((t) => t > fiveMinutesAgo);

    this.ddosProtection.suspiciousPatterns.set(clientIP, patterns);

    // Detect patterns
    if (patterns.userAgents.size > 5) {
      return {
        detected: true,
        type: "MULTIPLE_USER_AGENTS",
        severity: "MEDIUM",
        reason: "Multiple user agents from same IP",
      };
    }

    if (patterns.endpoints.size > 20) {
      return {
        detected: true,
        type: "ENDPOINT_SCANNING",
        severity: "HIGH",
        reason: "Scanning multiple endpoints",
      };
    }

    if (patterns.timings.length > 100) {
      return {
        detected: true,
        type: "HIGH_FREQUENCY_PATTERN",
        severity: "HIGH",
        reason: "Abnormally high request frequency",
      };
    }

    return { detected: false };
  }

  validateObject(obj, context) {
    const violations = [];

    if (!obj || typeof obj !== "object") {
      return violations;
    }

    const flatObj = this.flattenObject(obj);
    const fieldCount = Object.keys(flatObj).length;

    if (fieldCount > this.inputValidation.maxFields) {
      violations.push({
        type: "TOO_MANY_FIELDS",
        context: context,
        count: fieldCount,
        limit: this.inputValidation.maxFields,
      });
    }

    for (const [field, value] of Object.entries(flatObj)) {
      const stringValue = String(value);

      // Check field length
      if (stringValue.length > this.inputValidation.maxFieldLength) {
        violations.push({
          type: "FIELD_TOO_LONG",
          field: field,
          length: stringValue.length,
          limit: this.inputValidation.maxFieldLength,
        });
      }

      // Check for SQL injection
      for (const pattern of this.inputValidation.sqlInjectionPatterns) {
        if (pattern.test(stringValue)) {
          violations.push({
            type: "SQL_INJECTION",
            field: field,
            value: stringValue.substring(0, 100) + "...",
          });
        }
      }

      // Check for XSS
      for (const pattern of this.inputValidation.xssPatterns) {
        if (pattern.test(stringValue)) {
          violations.push({
            type: "XSS_ATTEMPT",
            field: field,
            value: stringValue.substring(0, 100) + "...",
          });
        }
      }

      // Check for command injection
      for (const pattern of this.inputValidation.commandInjectionPatterns) {
        if (pattern.test(stringValue)) {
          violations.push({
            type: "COMMAND_INJECTION",
            field: field,
            value: stringValue.substring(0, 100) + "...",
          });
        }
      }

      // Check character set
      if (!this.inputValidation.allowedChars.test(stringValue)) {
        violations.push({
          type: "INVALID_CHARACTERS",
          field: field,
          value: stringValue.substring(0, 100) + "...",
        });
      }
    }

    return violations;
  }

  validateHeaders(headers) {
    const violations = [];
    const suspiciousHeaders = [
      "x-forwarded-host",
      "x-original-host",
      "x-rewrite-url",
    ];

    for (const [name, value] of Object.entries(headers)) {
      const headerName = name.toLowerCase();
      const headerValue = String(value);

      // Check for header injection
      if (headerValue.includes("\r") || headerValue.includes("\n")) {
        violations.push({
          type: "HEADER_INJECTION",
          field: `header:${headerName}`,
          value: headerValue.substring(0, 100) + "...",
        });
      }

      // Check suspicious headers
      if (suspiciousHeaders.includes(headerName)) {
        violations.push({
          type: "SUSPICIOUS_HEADER",
          field: `header:${headerName}`,
          value: headerValue,
        });
      }

      // Check user agent for known bad patterns
      if (headerName === "user-agent") {
        const badPatterns = [
          /sqlmap/i,
          /nikto/i,
          /nmap/i,
          /masscan/i,
          /nessus/i,
          /openvas/i,
          /acunetix/i,
          /burpsuite/i,
          /grabber/i,
          /morfeus/i,
          /w3af/i,
        ];

        for (const pattern of badPatterns) {
          if (pattern.test(headerValue)) {
            violations.push({
              type: "MALICIOUS_USER_AGENT",
              field: "header:user-agent",
              value: headerValue,
            });
          }
        }
      }
    }

    return violations;
  }

  validateRequestStructure(req) {
    const violations = [];

    // Check for unusual request combinations
    if (req.method === "GET" && req.headers["content-length"]) {
      violations.push({
        type: "UNUSUAL_GET_WITH_BODY",
        method: req.method,
        hasBody: true,
      });
    }

    // Check for oversized headers
    const headerSize = JSON.stringify(req.headers).length;
    if (headerSize > 8192) {
      // 8KB
      violations.push({
        type: "OVERSIZED_HEADERS",
        size: headerSize,
        limit: 8192,
      });
    }

    return violations;
  }

  flattenObject(obj, prefix = "") {
    const flattened = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === "object" && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    }

    return flattened;
  }

  checkKnownAttackPatterns(req) {
    const threats = [];
    const path = req.path.toLowerCase();
    const query = JSON.stringify(req.query || {}).toLowerCase();
    const body = JSON.stringify(req.body || {}).toLowerCase();
    const combined = `${path} ${query} ${body}`;

    // Common attack patterns
    const attackPatterns = [
      {
        pattern: /\.\.\/|\.\.\\|\.\.%2f|\.\.%5c/i,
        type: "DIRECTORY_TRAVERSAL",
        severity: "HIGH",
      },
      {
        pattern: /\/proc\/|\/etc\/passwd|\/etc\/shadow/i,
        type: "FILE_ACCESS_ATTEMPT",
        severity: "HIGH",
      },
      {
        pattern: /phpinfo|eval\(|base64_decode|exec\(/i,
        type: "CODE_INJECTION",
        severity: "HIGH",
      },
      {
        pattern: /\bwget\b|\bcurl\b|\bscp\b|\bsftp\b/i,
        type: "REMOTE_ACCESS_ATTEMPT",
        severity: "HIGH",
      },
      {
        pattern: /<script|javascript:|vbscript:|onload=|onerror=/i,
        type: "XSS_ATTEMPT",
        severity: "MEDIUM",
      },
      {
        pattern: /union.*select|insert.*into|delete.*from|drop.*table/i,
        type: "SQL_INJECTION",
        severity: "HIGH",
      },
      {
        pattern: /\${|<%|%{|#\{/i,
        type: "TEMPLATE_INJECTION",
        severity: "MEDIUM",
      },
      {
        pattern: /\.php|\.asp|\.jsp|\.cgi/i,
        type: "FILE_EXTENSION_PROBE",
        severity: "LOW",
      },
    ];

    for (const { pattern, type, severity } of attackPatterns) {
      if (pattern.test(combined)) {
        threats.push({ type, severity, pattern: pattern.source });
      }
    }

    return threats;
  }

  detectBehavioralAnomalies(clientIP, req) {
    const threats = [];
    const baseline = this.threatDetection.behaviorBaselines.get(clientIP);

    if (!baseline) {
      // Initialize baseline
      this.threatDetection.behaviorBaselines.set(clientIP, {
        requestSizes: [],
        timingPatterns: [],
        endpointPatterns: new Set(),
        methodDistribution: new Map(),
        firstSeen: Date.now(),
        requestCount: 1,
      });
      return threats;
    }

    // Update baseline
    const requestSize = JSON.stringify(req.body || {}).length;
    baseline.requestSizes.push(requestSize);
    baseline.endpointPatterns.add(req.path);
    baseline.methodDistribution.set(
      req.method,
      (baseline.methodDistribution.get(req.method) || 0) + 1,
    );
    baseline.requestCount++;

    // Keep only recent data (last 100 requests)
    if (baseline.requestSizes.length > 100) {
      baseline.requestSizes = baseline.requestSizes.slice(-100);
    }

    // Anomaly detection (only after sufficient baseline data)
    if (baseline.requestCount > 20) {
      const avgSize =
        baseline.requestSizes.reduce((a, b) => a + b, 0) /
        baseline.requestSizes.length;
      const variance =
        baseline.requestSizes.reduce(
          (sum, size) => sum + Math.pow(size - avgSize, 2),
          0,
        ) / baseline.requestSizes.length;
      const stdDev = Math.sqrt(variance);

      if (
        stdDev > 0 &&
        Math.abs(requestSize - avgSize) >
          this.threatDetection.anomalyThresholds.requestSizeVariance * stdDev
      ) {
        threats.push({
          type: "REQUEST_SIZE_ANOMALY",
          severity: "MEDIUM",
          details: {
            currentSize: requestSize,
            avgSize,
            deviation: Math.abs(requestSize - avgSize) / stdDev,
          },
        });
      }

      // Check for endpoint scanning behavior
      if (baseline.endpointPatterns.size > 50) {
        threats.push({
          type: "ENDPOINT_ENUMERATION",
          severity: "HIGH",
          details: {
            uniqueEndpoints: baseline.endpointPatterns.size,
            requests: baseline.requestCount,
          },
        });
      }
    }

    return threats;
  }

  detectBotActivity(req, userAgent) {
    const threats = [];

    // Bot user agent patterns
    const botPatterns = [
      /bot|crawler|spider|scraper/i,
      /python|curl|wget|libwww|lwp/i,
      /^$/, // Empty user agent
      /^Mozilla\/5\.0$/, // Generic Mozilla string
    ];

    for (const pattern of botPatterns) {
      if (pattern.test(userAgent)) {
        threats.push({
          type: "BOT_ACTIVITY",
          severity: "LOW",
          details: { userAgent, pattern: pattern.source },
        });
        break;
      }
    }

    // Check for bot-like request patterns
    if (!req.headers.accept || !req.headers["accept-language"]) {
      threats.push({
        type: "MISSING_BROWSER_HEADERS",
        severity: "MEDIUM",
        details: {
          missingHeaders: ["accept", "accept-language"].filter(
            (h) => !req.headers[h],
          ),
        },
      });
    }

    return threats;
  }

  detectReconnaissance(clientIP, req) {
    const threats = [];
    const path = req.path.toLowerCase();

    // Common reconnaissance paths
    const reconPaths = [
      /\/admin|\/wp-admin|\/administrator/i,
      /\/login|\/signin|\/auth/i,
      /\/config|\/settings|\/setup/i,
      /\/api|\/v1|\/v2|\/rest/i,
      /\/backup|\/bak|\/old/i,
      /\/test|\/dev|\/debug/i,
      /\/.env|\/\.git|\/\.svn/i,
    ];

    for (const pattern of reconPaths) {
      if (pattern.test(path)) {
        threats.push({
          type: "RECONNAISSANCE",
          severity: "MEDIUM",
          details: { path, pattern: pattern.source },
        });
      }
    }

    // Check for status code probing
    if (
      path.includes("404") ||
      path.includes("500") ||
      path.includes("error")
    ) {
      threats.push({
        type: "ERROR_PAGE_PROBING",
        severity: "LOW",
        details: { path },
      });
    }

    return threats;
  }

  detectBruteForce(clientIP, req) {
    const threats = [];
    const path = req.path.toLowerCase();

    // Check for authentication endpoints
    const authEndpoints = ["/login", "/signin", "/auth", "/api/auth"];
    const isAuthEndpoint = authEndpoints.some((endpoint) =>
      path.includes(endpoint),
    );

    if (isAuthEndpoint && req.method === "POST") {
      // Track authentication attempts
      const authKey = `auth:${clientIP}`;
      const attempts = this.ddosProtection.suspiciousPatterns.get(authKey) || {
        count: 0,
        firstAttempt: Date.now(),
        lastAttempt: Date.now(),
      };

      attempts.count++;
      attempts.lastAttempt = Date.now();

      this.ddosProtection.suspiciousPatterns.set(authKey, attempts);

      // Check for brute force pattern
      const timeWindow = attempts.lastAttempt - attempts.firstAttempt;
      if (attempts.count > 10 && timeWindow < 5 * 60 * 1000) {
        // 10 attempts in 5 minutes
        threats.push({
          type: "BRUTE_FORCE_ATTACK",
          severity: "HIGH",
          details: { attempts: attempts.count, timeWindow: timeWindow },
        });
      }
    }

    return threats;
  }

  getDynamicLimits(tenantId, endpoint) {
    // Base limits
    const baseLimits = {
      window: 60000, // 1 minute
      max: 60,
    };

    // Get dynamic adjustments
    const dynamicKey = `${tenantId}:${endpoint}`;
    const adjustments = this.rateLimiting.dynamicLimits.get(dynamicKey) || {
      multiplier: 1.0,
    };

    return {
      window: baseLimits.window,
      max: Math.floor(baseLimits.max * adjustments.multiplier),
    };
  }

  adjustDynamicLimits(tenantId, endpoint, bucket) {
    const dynamicKey = `${tenantId}:${endpoint}`;
    const current = this.rateLimiting.dynamicLimits.get(dynamicKey) || {
      multiplier: 1.0,
      adjustedAt: Date.now(),
    };

    // Adjust based on usage patterns
    const usageRatio =
      (bucket.count / (bucket.resetTime - bucket.firstRequest)) * 1000; // requests per second

    if (usageRatio > 0.8) {
      // High usage - decrease limits
      current.multiplier = Math.max(0.1, current.multiplier * 0.9);
    } else if (usageRatio < 0.2) {
      // Low usage - increase limits
      current.multiplier = Math.min(2.0, current.multiplier * 1.1);
    }

    current.adjustedAt = Date.now();
    this.rateLimiting.dynamicLimits.set(dynamicKey, current);
  }

  normalizeEndpoint(path) {
    // Group similar endpoints
    return path.replace(/\/\d+/g, "/:id").replace(/\?.*$/, "");
  }

  updateBehaviorTracking(clientIP, req, startTime) {
    const processingTime = Date.now() - startTime;

    // Update request timing baseline
    const baseline = this.threatDetection.behaviorBaselines.get(clientIP);
    if (baseline) {
      baseline.timingPatterns.push(processingTime);
      if (baseline.timingPatterns.length > 50) {
        baseline.timingPatterns = baseline.timingPatterns.slice(-50);
      }
    }
  }

  calculateRiskScore(clientIP, req) {
    let score = 0;

    // Base score
    score += 10;

    // IP reputation
    if (this.ddosProtection.greylist.has(clientIP)) {
      score += this.ddosProtection.greylist.get(clientIP).strikes * 10;
    }

    // Request characteristics
    const userAgent = req.headers["user-agent"] || "";
    if (!userAgent || userAgent.length < 10) {
      score += 20;
    }

    // Path characteristics
    if (req.path.includes("admin") || req.path.includes("api")) {
      score += 15;
    }

    // Method
    if (req.method !== "GET" && req.method !== "POST") {
      score += 10;
    }

    return Math.min(100, score);
  }

  async logSecurityEvent(clientIP, eventType, details) {
    const event = {
      timestamp: new Date().toISOString(),
      client_ip: this.hashIP(clientIP),
      event_type: eventType,
      details: JSON.stringify(details),
      severity: this.getEventSeverity(eventType),
    };

    try {
      // Store in threat detection logs
      const doc = await getDoc();
      if (doc) {
        const sheet = await ensureSheet(doc, "SECURITY_EVENTS", [
          "timestamp",
          "client_ip",
          "event_type",
          "details",
          "severity",
        ]);
        await sheet.addRow(event);
      }
    } catch (error) {
      console.error("Security: Error logging security event:", error);
    }

    // Add to alert queue for high severity events
    if (event.severity === "HIGH") {
      this.threatDetection.alertQueue.push(event);
    }

    console.log(
      `Security: Event logged - ${eventType} for IP ${clientIP.substring(0, 8)}***`,
    );
  }

  hashIP(ip) {
    return crypto
      .createHash("sha256")
      .update(String(ip))
      .digest("hex")
      .substring(0, 12);
  }

  getEventSeverity(eventType) {
    const severityMap = {
      STRIKE_ADDED: "MEDIUM",
      MALICIOUS_INPUT: "HIGH",
      THREAT_DETECTED: "HIGH",
      MIDDLEWARE_ERROR: "LOW",
      BRUTE_FORCE_ATTACK: "HIGH",
      SQL_INJECTION: "HIGH",
      XSS_ATTEMPT: "MEDIUM",
      COMMAND_INJECTION: "HIGH",
      DIRECTORY_TRAVERSAL: "HIGH",
    };

    return severityMap[eventType] || "MEDIUM";
  }

  initializeMonitoring() {
    // Cleanup expired entries every 5 minutes
    setInterval(
      () => {
        this.cleanupExpiredEntries();
      },
      5 * 60 * 1000,
    );

    // Process alert queue every minute
    setInterval(() => {
      this.processAlertQueue();
    }, 60 * 1000);
  }

  cleanupExpiredEntries() {
    const now = Date.now();
    const expiryTime = 60 * 60 * 1000; // 1 hour

    // Cleanup greylist
    for (const [ip, entry] of this.ddosProtection.greylist) {
      if (now - entry.lastActivity > expiryTime) {
        this.ddosProtection.greylist.delete(ip);
      }
    }

    // Cleanup rate limiting buckets
    for (const [key, bucket] of this.rateLimiting.buckets) {
      if (now > bucket.resetTime + expiryTime) {
        this.rateLimiting.buckets.delete(key);
      }
    }

    // Cleanup behavior baselines
    for (const [ip, baseline] of this.threatDetection.behaviorBaselines) {
      if (now - baseline.firstSeen > 24 * 60 * 60 * 1000) {
        // 24 hours
        this.threatDetection.behaviorBaselines.delete(ip);
      }
    }
  }

  processAlertQueue() {
    if (this.threatDetection.alertQueue.length === 0) {
      return;
    }

    const alerts = this.threatDetection.alertQueue.splice(0, 10); // Process up to 10 alerts

    // Here you would integrate with your alerting system
    // For now, just log the high severity events
    alerts.forEach((alert) => {
      console.warn(
        `Security Alert: ${alert.event_type} from IP ${alert.client_ip}`,
      );
    });
  }

  /**
   * Get security statistics and status
   */
  /**
   * Generate CSP nonce for request
   */
  generateCSPNonce(req) {
    const requestId = req.headers["x-request-id"] || crypto.randomUUID();
    const nonce = crypto.randomBytes(16).toString("base64");

    // Store nonce for this request
    cspNonces.set(requestId, nonce);

    // Clean up old nonces (older than 5 minutes)
    setTimeout(
      () => {
        cspNonces.delete(requestId);
      },
      5 * 60 * 1000,
    );

    return nonce;
  }

  /**
   * Generate CSP header based on environment and request
   */
  generateCSPHeader(req, reportOnly = false) {
    const environment = process.env.NODE_ENV || "development";
    const config = this.cspConfig[environment] || this.cspConfig.development;

    // Generate nonce for this request
    const nonce = this.generateCSPNonce(req);
    req.cspNonce = nonce; // Make nonce available to the application

    const directives = [];

    Object.entries(config).forEach(([directive, values]) => {
      if (directive === "upgrade-insecure-requests" && values) {
        directives.push("upgrade-insecure-requests");
      } else if (directive === "block-all-mixed-content" && values) {
        directives.push("block-all-mixed-content");
      } else if (directive === "report-uri" || directive === "report-to") {
        if (!reportOnly) {
          // Only add reporting to main CSP, not report-only
          directives.push(`${directive} ${values}`);
        }
      } else if (Array.isArray(values)) {
        let directiveValues = [...values];

        // Add nonce to script-src and style-src
        if (directive === "script-src") {
          directiveValues.push(`'nonce-${nonce}'`);
          // Remove unsafe-inline when nonce is present (for modern browsers)
          directiveValues = directiveValues.filter(
            (v) => v !== "'unsafe-inline'",
          );
        } else if (directive === "style-src") {
          directiveValues.push(`'nonce-${nonce}'`);
        }

        directives.push(`${directive} ${directiveValues.join(" ")}`);
      }
    });

    return directives.join("; ");
  }

  /**
   * Validate CSP for specific content
   */
  validateCSPContent(content, type = "script") {
    if (type === "script") {
      // Check for inline event handlers
      const inlineHandlers = /on\w+\s*=\s*[\"'].*?[\"']/gi;
      if (inlineHandlers.test(content)) {
        return {
          valid: false,
          violations: ["Inline event handlers detected"],
          recommendation:
            "Use addEventListener instead of inline event handlers",
        };
      }

      // Check for javascript: URLs
      const javascriptUrls = /javascript:/gi;
      if (javascriptUrls.test(content)) {
        return {
          valid: false,
          violations: ["javascript: URLs detected"],
          recommendation: "Replace javascript: URLs with proper event handlers",
        };
      }
    }

    return { valid: true, violations: [], recommendation: null };
  }

  /**
   * Security health check
   */
  performSecurityHealthCheck() {
    const checks = {
      csp_configuration: this.validateCSPConfiguration(),
      security_headers: this.validateSecurityHeaders(),
      threat_detection: this.validateThreatDetection(),
      rate_limiting: this.validateRateLimiting(),
      environment_security: this.validateEnvironmentSecurity(),
    };

    const overallHealth = Object.values(checks).every(
      (check) => check.status === "healthy",
    )
      ? "healthy"
      : "degraded";

    return {
      status: overallHealth,
      timestamp: new Date().toISOString(),
      checks: checks,
    };
  }

  validateCSPConfiguration() {
    try {
      const env = process.env.NODE_ENV || "development";
      const config = this.cspConfig[env];

      if (!config) {
        return {
          status: "unhealthy",
          message: "No CSP configuration found for environment",
        };
      }

      // Check for unsafe directives in production
      if (env === "production") {
        const scriptSrc = config["script-src"] || [];
        if (
          scriptSrc.includes("'unsafe-inline'") ||
          scriptSrc.includes("'unsafe-eval'")
        ) {
          return {
            status: "degraded",
            message: "Unsafe CSP directives detected in production",
          };
        }
      }

      return { status: "healthy", message: "CSP configuration is secure" };
    } catch (error) {
      return {
        status: "unhealthy",
        message: `CSP validation error: ${error.message}`,
      };
    }
  }

  validateSecurityHeaders() {
    try {
      const requiredHeaders = [
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Strict-Transport-Security",
        "Referrer-Policy",
      ];

      const missingHeaders = requiredHeaders.filter(
        (header) => !this.securityHeaders[header],
      );

      if (missingHeaders.length > 0) {
        return {
          status: "degraded",
          message: `Missing headers: ${missingHeaders.join(", ")}`,
        };
      }

      return {
        status: "healthy",
        message: "All required security headers configured",
      };
    } catch (error) {
      return {
        status: "unhealthy",
        message: `Header validation error: ${error.message}`,
      };
    }
  }

  validateThreatDetection() {
    try {
      if (!this.threatDetection.enabled) {
        return { status: "degraded", message: "Threat detection is disabled" };
      }

      return { status: "healthy", message: "Threat detection is active" };
    } catch (error) {
      return {
        status: "unhealthy",
        message: `Threat detection error: ${error.message}`,
      };
    }
  }

  validateRateLimiting() {
    try {
      if (!this.rateLimiting.enabled) {
        return { status: "degraded", message: "Rate limiting is disabled" };
      }

      return { status: "healthy", message: "Rate limiting is active" };
    } catch (error) {
      return {
        status: "unhealthy",
        message: `Rate limiting error: ${error.message}`,
      };
    }
  }

  validateEnvironmentSecurity() {
    try {
      const env = process.env.NODE_ENV || "development";
      const warnings = [];

      if (env === "production") {
        if (
          !process.env.HMAC_SECRET ||
          process.env.HMAC_SECRET === "change_me"
        ) {
          warnings.push("Insecure HMAC secret");
        }

        if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
          warnings.push("TLS certificate validation disabled");
        }
      }

      if (warnings.length > 0) {
        return {
          status: "degraded",
          message: `Security warnings: ${warnings.join(", ")}`,
        };
      }

      return {
        status: "healthy",
        message: "Environment security configuration is secure",
      };
    } catch (error) {
      return {
        status: "unhealthy",
        message: `Environment validation error: ${error.message}`,
      };
    }
  }

  getSecurityStats() {
    return {
      ddos_protection: {
        blacklisted_ips: this.ddosProtection.blacklist.size,
        greylisted_ips: this.ddosProtection.greylist.size,
        active_bans: this.ddosProtection.activeBans.size,
        active_connections: Array.from(
          this.ddosProtection.connectionCount.values(),
        ).reduce((a, b) => a + b, 0),
      },
      rate_limiting: {
        active_buckets: this.rateLimiting.buckets.size,
        dynamic_adjustments: this.rateLimiting.dynamicLimits.size,
      },
      threat_detection: {
        behavior_baselines: this.threatDetection.behaviorBaselines.size,
        pending_alerts: this.threatDetection.alertQueue.length,
      },
      csp: {
        active_nonces: cspNonces.size,
        environment: process.env.NODE_ENV || "development",
      },
    };
  }
}

// Singleton instance
const securityMiddleware = new SecurityMiddleware();

export default securityMiddleware;
export { SecurityMiddleware };
