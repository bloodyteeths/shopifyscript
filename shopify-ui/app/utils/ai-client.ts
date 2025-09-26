/**
 * Client-side utilities for AI Dashboard
 * Provides HMAC-authenticated fetch for browser environment
 */

/**
 * Helper function for HMAC-authenticated fetch from browser
 * Uses Web Crypto API for browser compatibility
 */
export async function authenticatedFetch(
  path: string,
  method: string = "GET",
  body?: any,
  shopName?: string
): Promise<Response> {
  const timestamp = Date.now();
  const tenant = shopName || process.env.TENANT_ID || "proofkit";
  const backendUrl = process.env.BACKEND_PUBLIC_URL || "http://localhost:3005/api";

  // For client-side, we need to use a different approach
  // Since we can't expose the HMAC secret to the client,
  // we need to proxy through the Shopify app's API routes
  // Remove leading slash from path if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  const proxyUrl = `/api/proxy/${cleanPath}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-Tenant-ID": tenant,
    "X-Timestamp": timestamp.toString()
  };

  const options: RequestInit = {
    method,
    headers,
    ...(body && method !== "GET" ? { body: JSON.stringify(body) } : {})
  };

  return fetch(proxyUrl, options);
}

/**
 * Direct backend fetch (for server-side rendering only)
 * This should only be used in server components or API routes
 */
export async function directBackendFetch(
  path: string,
  method: string = "GET",
  body?: any,
  shopName?: string
): Promise<Response> {
  const timestamp = Date.now();
  const tenant = shopName || process.env.TENANT_ID || "proofkit";
  const backendUrl = process.env.BACKEND_PUBLIC_URL || "http://localhost:3005/api";
  const hmacSecret = process.env.HMAC_SECRET || "f3a1c9d8b2e47a65c0fb19d7e3a9428c6de5b1a7c4f08923ab56d7e1c2f3a4b5";

  // Note: This won't work in browser - needs server-side crypto
  if (typeof window !== "undefined") {
    throw new Error("directBackendFetch can only be used server-side");
  }

  const crypto = require("crypto");
  const payload = JSON.stringify({ tenant, timestamp });
  const hmac = crypto.createHmac("sha256", hmacSecret).update(payload).digest("hex");

  const url = `${backendUrl}${path}`;
  const headers: HeadersInit = {
    "X-HMAC-Signature": hmac,
    "X-Tenant-ID": tenant,
    "X-Timestamp": timestamp.toString(),
    "Content-Type": "application/json"
  };

  const options: RequestInit = {
    method,
    headers,
    ...(body && method !== "GET" ? { body: JSON.stringify(body) } : {})
  };

  return fetch(url, options);
}