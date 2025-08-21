import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { MemorySessionStorage } from "@shopify/shopify-app-session-storage-memory";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(",") || ["read_products", "write_products"],
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new MemorySessionStorage(),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
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
    const decoded = Buffer.from(host, 'base64').toString('utf-8');
    
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
    console.error('Failed to decode host parameter:', error);
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
  const host = url.searchParams.get('host');
  if (host) {
    const shopFromHost = extractShopFromHost(host);
    if (shopFromHost) return shopFromHost;
  }
  
  // 2. Check direct shop parameter
  const shop = url.searchParams.get('shop');
  if (shop) {
    // Remove .myshopify.com suffix if present
    return shop.replace('.myshopify.com', '');
  }
  
  // 3. Check embedded parameter
  const embedded = url.searchParams.get('embedded');
  if (embedded === '1') {
    // Try to get shop from other parameters when embedded
    const shopName = url.searchParams.get('shopName') || url.searchParams.get('tenant');
    if (shopName) return shopName;
  }
  
  return null;
}