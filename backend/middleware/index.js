import cors from "cors";
import express from "express";
import fs from "fs";
import { logAccess } from "../utils/response.js";

// ----- Simple cache middleware -----
const _cache = new Map();
const _ttlFor = (p) => {
  if (p.startsWith("/api/insights"))
    return Number(process.env.INSIGHTS_CACHE_TTL_SEC || "60");
  if (p.startsWith("/api/config"))
    return Number(process.env.CONFIG_CACHE_TTL_SEC || "15");
  if (p.startsWith("/api/run-logs"))
    return Number(process.env.RUNLOGS_CACHE_TTL_SEC || "10");
  return 0;
};

export function cacheMiddleware(req, res, next) {
  if (req.method !== "GET") return next();
  const ttl = _ttlFor(req.path);
  if (!ttl) return next();

  const key = req.originalUrl;
  const now = Date.now();
  const hit = _cache.get(key);

  if (hit && hit.exp > now) {
    try {
      res.set("x-cache", "HIT");
      res.set("cache-control", `public, max-age=${ttl}`);
    } catch {}
    try {
      res.status(hit.status).type(hit.type).send(hit.body);
    } catch {}
    return;
  }

  const _send = res.send.bind(res);
  res.send = (body) => {
    try {
      const type = res.get("content-type") || "";
      const status = res.statusCode || 200;
      _cache.set(key, { body, type, status, exp: now + ttl * 1000 });
      res.set("x-cache", "MISS");
      res.set("cache-control", `public, max-age=${ttl}`);
    } catch {}
    return _send(body);
  };
  next();
}

// ----- CORS middleware -----
export function corsMiddleware() {
  return cors({
    origin: (origin, cb) => {
      const allowed = (process.env.ALLOWED_ORIGINS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!origin || !allowed.length) return cb(null, true);
      return cb(null, allowed.includes(origin));
    },
  });
}

// ----- Security headers middleware -----
export function securityMiddleware(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
}

// ----- Request logging middleware -----
export function requestLoggingMiddleware(req, res, next) {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const path = req.path;
    const method = req.method;
    console.log(`[req] ${method} ${path} ip=${Array.isArray(ip) ? ip[0] : ip}`);
  } catch {}
  next();
}

// ----- Rate limiting middleware -----
const rateWindowMs = 60_000;
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX || 60);
const rateBuckets = new Map(); // key → { start: epochMs, count: number }

export function rateLimitMiddleware(req, res, next) {
  const ip =
    (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "ip") + "";
  const tenant =
    req.query && req.query.tenant ? String(req.query.tenant) : "no-tenant";
  const key = `${ip}:${tenant}`;
  const now = Date.now();

  const bucket = rateBuckets.get(key) || { start: now, count: 0 };
  if (now - bucket.start > rateWindowMs) {
    bucket.start = now;
    bucket.count = 0;
  }

  bucket.count += 1;
  rateBuckets.set(key, bucket);

  if (bucket.count > rateLimitMax) {
    return res.status(429).json({ ok: false, error: "rate_limited" });
  }

  next();
}

// ----- Trust proxy middleware -----
export function trustProxyMiddleware(app) {
  app.set("trust proxy", 1);
}

// ----- Body parser middleware -----
export function bodyParserMiddleware() {
  return express.json({ limit: "2mb" });
}

// ----- Error handling middleware (must be last) -----
export function errorHandlerMiddleware(err, req, res, next) {
  if (!err) return next();

  try {
    logAccess(req, 500, "api error");
  } catch {}

  return res.status(500).json({
    ok: false,
    code: "ERR",
    error: String(err),
  });
}

// ----- 404 handler middleware (must be after all routes) -----
export function notFoundMiddleware(req, res) {
  try {
    logAccess(req, 404, "api not_found");
  } catch {}

  return res.status(404).json({
    ok: false,
    code: "NOT_FOUND",
  });
}

// ----- Application setup function -----
export function setupMiddleware(app) {
  // Trust proxy
  trustProxyMiddleware(app);

  // CORS
  app.use(corsMiddleware());

  // Body parser
  app.use(bodyParserMiddleware());

  // Cache (before security and logging)
  app.use(cacheMiddleware);

  // Security headers
  app.use(securityMiddleware);

  // Request logging
  app.use(requestLoggingMiddleware);

  // Rate limiting
  app.use(rateLimitMiddleware);
}

// ----- Error handling setup (call after all routes) -----
export function setupErrorHandling(app) {
  // Error handler for /api routes
  app.use("/api", errorHandlerMiddleware);

  // 404 handler for /api routes
  app.use("/api", notFoundMiddleware);
}
