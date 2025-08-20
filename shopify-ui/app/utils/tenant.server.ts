/**
 * Production-Ready Tenant Detection for Shopify SaaS
 * Extracts tenant ID from Shopify session, shop domain, or request context
 */

import { validateShopName } from './shop-config';

/**
 * Extract tenant ID from request
 * Production-ready multi-tenant detection with user-input priority
 */
export async function getTenantFromRequest(request: Request): Promise<string> {
  try {
    const url = new URL(request.url);
    
    // Method 1: Extract from URL parameters (highest priority - user input)
    const shopParam = url.searchParams.get('shop') || url.searchParams.get('shopName') || url.searchParams.get('tenant');
    if (shopParam) {
      // Convert "mystore.myshopify.com" -> "mystore" if needed
      const tenantId = shopParam.replace('.myshopify.com', '');
      if (validateShopName(tenantId)) {
        console.log(`🏪 Detected tenant from URL param: ${tenantId}`);
        return tenantId;
      }
    }

    // Method 2: Check cookies for persisted shop name
    const cookieHeader = request.headers.get('cookie') || '';
    if (cookieHeader) {
      try {
        const parts = cookieHeader.split(';');
        for (const part of parts) {
          const [rawKey, ...rest] = part.trim().split('=');
          const key = (rawKey || '').trim();
          if (key === 'proofkit_shop_name') {
            const value = decodeURIComponent(rest.join('='));
            if (value && validateShopName(value)) {
              console.log(`🍪 Detected tenant from cookie: ${value}`);
              return value;
            }
          }
        }
      } catch (e) {
        // ignore cookie parse errors
      }
    }

    // Method 3: Extract from Shopify session headers
    const shopifyShop = request.headers.get('x-shopify-shop-domain');
    if (shopifyShop) {
      const tenantId = shopifyShop.replace('.myshopify.com', '');
      if (validateShopName(tenantId)) {
        console.log(`🛍️ Detected tenant from Shopify header: ${tenantId}`);
        return tenantId;
      }
    }

    // Method 4: Extract from subdomain (if using subdomain routing)
    const host = request.headers.get('host') || '';
    if (host.includes('.proofkit.com')) {
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'app' && validateShopName(subdomain)) {
        console.log(`🌐 Detected tenant from subdomain: ${subdomain}`);
        return subdomain;
      }
    }

    // Method 5: Check for explicit tenant in headers (for testing/APIs)
    const explicitTenant = request.headers.get('x-proofkit-tenant');
    if (explicitTenant && validateShopName(explicitTenant)) {
      console.log(`🔧 Detected tenant from header: ${explicitTenant}`);
      return explicitTenant;
    }
    
    // Development fallback ONLY - do not override user input
    if (process.env.NODE_ENV === 'development') {
      const devTenant = process.env.DEFAULT_DEV_TENANT || process.env.TENANT_ID;
      if (devTenant && validateShopName(devTenant)) {
        console.log(`⚠️ Using development fallback tenant: ${devTenant}`);
        return devTenant;
      }
      // Even in dev, fall back to proofkit only if nothing else works
      console.log(`⚠️ Using hardcoded development fallback: proofkit`);
      return 'proofkit';
    }
    
    // Production: no valid tenant found - should trigger setup
    throw new Error('No valid tenant found - setup required');
    
  } catch (error) {
    console.error('Tenant detection failed:', error.message);
    
    // Only use fallback in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚠️ Error fallback - using development default`);
      return process.env.DEFAULT_DEV_TENANT || process.env.TENANT_ID || 'proofkit';
    }
    
    throw error;
  }
}

/**
 * Extract tenant ID from shop domain
 * Converts "mystore.myshopify.com" -> "mystore"
 */
export function shopDomainToTenantId(shopDomain: string): string {
  if (!shopDomain) {
    throw new Error('Shop domain is required');
  }
  
  // Remove .myshopify.com suffix
  const tenantId = shopDomain.replace('.myshopify.com', '');
  
  // Validate tenant ID format
  if (!tenantId || tenantId.length < 1) {
    throw new Error('Invalid shop domain format');
  }
  
  return tenantId;
}

/**
 * Generate Google Sheet ID for tenant
 * Each tenant gets their own Google Sheet for data isolation
 */
export function getTenantSheetId(tenantId: string): string {
  // In production, this would be stored in a database mapping tenants to Sheet IDs
  // For now, use environment variable mapping
  
  const sheetMappings = {
    'proofkit': process.env.DEV_SHEET_ID || process.env.DEFAULT_SHEET_ID,
    'dev-tenant': process.env.DEV_SHEET_ID,
    'demo-store': process.env.DEMO_SHEET_ID,
    // Add more tenant -> sheet mappings as needed
  };
  
  return sheetMappings[tenantId] || process.env.DEFAULT_SHEET_ID || '';
}

/**
 * Validate tenant access permissions
 * Ensure the requesting user has access to this tenant's data
 */
export async function validateTenantAccess(request: Request, tenantId: string): Promise<boolean> {
  try {
    if (process.env.NODE_ENV === 'development') {
      // Allow all access in development
      return true;
    }
    
    // In production, validate that the Shopify session matches the tenant
    const { session } = await authenticate.admin(request);
    const sessionTenantId = session?.shop?.replace('.myshopify.com', '');
    
    return sessionTenantId === tenantId;
    
  } catch (error) {
    console.error('Tenant access validation failed:', error.message);
    return false;
  }
}

/**
 * Development helper to list available tenants
 */
export function getAvailableDevTenants(): string[] {
  if (process.env.NODE_ENV !== 'development') {
    return [];
  }
  
  return [
    process.env.TENANT_ID || 'proofkit',
    'dev-tenant',
    'demo-store',
    'test-shop'
  ];
}