import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { MemorySessionStorage } from "@shopify/shopify-app-session-storage-memory";
import { RedisSessionStorage } from "@shopify/shopify-app-session-storage-redis";

// Use Redis session storage for persistence in serverless environment
// Falls back to MemorySessionStorage if Redis is not configured
let resolvedSessionStorage;

try {
  // Check if Redis URL is configured (will be set via Vercel KV)
  const redisUrl = process.env.KV_URL || process.env.REDIS_URL;

  if (redisUrl && redisUrl !== "${REDIS_URL}") {
    resolvedSessionStorage = new RedisSessionStorage(redisUrl);
    console.log("🔒 Using RedisSessionStorage for persistent Shopify sessions");
  } else {
    console.error("❌ CRITICAL: Redis not configured! Sessions will not persist in serverless environment.");
    console.error("Please set KV_URL or REDIS_URL environment variable.");
    resolvedSessionStorage = new MemorySessionStorage();
    console.log(
      "⚠️ Redis not configured, using MemorySessionStorage (sessions won't persist)",
    );
  }
} catch (error) {
  console.error(
    "❌ Redis session storage failed, falling back to MemorySessionStorage:",
    error,
  );
  resolvedSessionStorage = new MemorySessionStorage();
}

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(",") || ["read_products", "write_products"],
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: resolvedSessionStorage,
  distribution: AppDistribution.AppStore,
  future: {
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;

/**
 * Extract shop name from Shopify host parameter
 * The host parameter comes from Shopify as base64 encoded string
 * Format: "admin.shopify.com/store/SHOP_NAME" -> base64 encoded
 */
export function extractShopFromHost(host?: string): string | null {
  if (!host) return null;

  try {
    // Decode base64 host parameter
    const decoded = Buffer.from(host, "base64").toString("utf-8");

    // Extract shop name from "admin.shopify.com/store/SHOP_NAME" format
    const match = decoded.match(/admin\.shopify\.com\/store\/([^\/]+)/);
    if (match && match[1]) {
      return match[1];
    }

    // Alternative format: direct shop domain like "shop-name.myshopify.com"
    const directMatch = decoded.match(/^([^.]+)\.myshopify\.com/);
    if (directMatch && directMatch[1]) {
      return directMatch[1];
    }

    return null;
  } catch (error) {
    console.error("Failed to decode host parameter:", error);
    return null;
  }
}

/**
 * Extract shop name from request URL parameters
 * Shopify apps receive shop info through various parameters
 */
export function extractShopFromRequest(request: Request): string | null {
  const url = new URL(request.url);

  // 1. Check host parameter (most common in embedded apps)
  const host = url.searchParams.get("host");
  if (host) {
    const shopFromHost = extractShopFromHost(host);
    if (shopFromHost) return shopFromHost;
  }

  // 2. Check direct shop parameter
  const shop = url.searchParams.get("shop");
  if (shop) {
    // Remove .myshopify.com suffix if present
    return shop.replace(".myshopify.com", "");
  }

  // 3. Check embedded parameter
  const embedded = url.searchParams.get("embedded");
  if (embedded === "1") {
    // Try to get shop from other parameters when embedded
    const shopName =
      url.searchParams.get("shopName") || url.searchParams.get("tenant");
    if (shopName) return shopName;
  }

  // 4. Check referer header for shop context (critical for navigation)
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const r = new URL(referer);
      const rHost = r.searchParams.get("host");
      const rShop = r.searchParams.get("shop");
      
      if (rShop) {
        return rShop.replace(".myshopify.com", "");
      }
      if (rHost) {
        const shopFromRefererHost = extractShopFromHost(rHost);
        if (shopFromRefererHost) return shopFromRefererHost;
      }
      
      // Fallback: extract from known shop patterns in referer
      if (referer.includes("proofkit")) {
        return "proofkit";
      }
    } catch {}
  }

  return null;
}
