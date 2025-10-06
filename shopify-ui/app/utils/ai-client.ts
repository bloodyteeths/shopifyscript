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
  // Use the actual shop name for multi-tenant support
  // This should be provided by the Shopify app context
  const tenant = shopName || (window as any).__SHOPIFY_SHOP__ || "adsautopilot";

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
 * The server environment must provide BACKEND_PUBLIC_URL and HMAC_SECRET
 */
export async function directBackendFetch(
  path: string,
  method: string = "GET",
  body?: any,
  shopName?: string
): Promise<Response> {
  // This function should only be called from server-side code
  // where environment variables are available
  if (typeof window !== "undefined") {
    throw new Error("directBackendFetch can only be used server-side");
  }

  // Server-side code should have access to process.env
  // These will be provided by the server environment (Vercel, etc)
  const backendUrl = process.env.BACKEND_PUBLIC_URL || "http://localhost:3005/api";
  const hmacSecret = process.env.HMAC_SECRET;

  if (!hmacSecret) {
    throw new Error("HMAC_SECRET environment variable is required for server-side fetch");
  }

  const timestamp = Date.now();
  const tenant = shopName || "adsautopilot";

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