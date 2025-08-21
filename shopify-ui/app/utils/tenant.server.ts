/**
 * Production-Ready Tenant Detection for Shopify SaaS
 * Extracts tenant ID from Shopify session, shop domain, or request context
 */

import { authenticate, extractShopFromRequest } from '../shopify.server';
import { getTenantConfig, initializeTenant, getTenantSheetId as getDbTenantSheetId, isSetupCompleted } from './database.server';

/**
 * Extract tenant ID from request using Shopify authentication
 * Now uses proper Shopify session instead of manual shop input
 */
export async function getTenantFromRequest(request: Request): Promise<string> {
  try {
    // Method 1: Try to get shop from authenticated Shopify session (highest priority)
    try {
      const { session } = await authenticate.admin(request);
      if (session?.shop) {
        const tenantId = session.shop.replace('.myshopify.com', '');
        console.log(`🏪 Detected tenant from Shopify session: ${tenantId}`);
        
        // Initialize tenant in database if not exists
        initializeTenant(tenantId, session.shop);
        
        return tenantId;
      }
    } catch (authError) {
      // Authentication failed, try other methods
      console.log('🔐 Shopify authentication failed, trying alternative methods');
    }
    
    // Method 2: Extract from Shopify URL parameters (host, shop, etc.)
    const shopFromRequest = extractShopFromRequest(request);
    if (shopFromRequest) {
      console.log(`🔗 Detected tenant from Shopify request params: ${shopFromRequest}`);
      return shopFromRequest;
    }

    // Method 3: Check explicit tenant in headers (for testing/APIs)
    const explicitTenant = request.headers.get('x-proofkit-tenant');
    if (explicitTenant) {
      console.log(`🔧 Detected tenant from header: ${explicitTenant}`);
      return explicitTenant;
    }
    
    // Method 4: Extract from subdomain (if using subdomain routing)
    const host = request.headers.get('host') || '';
    if (host.includes('.proofkit.com')) {
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
        console.log(`🌐 Detected tenant from subdomain: ${subdomain}`);
        return subdomain;
      }
    }
    
    // Development fallback ONLY
    if (process.env.NODE_ENV === 'development') {
      const devTenant = process.env.DEFAULT_DEV_TENANT || process.env.TENANT_ID;
      if (devTenant) {
        console.log(`⚠️ Using development fallback tenant: ${devTenant}`);
        return devTenant;
      }
      // Even in dev, fall back to proofkit only if nothing else works
      console.log(`⚠️ Using hardcoded development fallback: proofkit`);
      return 'proofkit';
    }
    
    // Production: no valid tenant found - this should not happen with proper Shopify authentication
    throw new Error('No valid shop found - Shopify authentication required');
    
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
 * Now uses database storage with environment fallback
 */
export function getTenantSheetId(tenantId: string): string {
  return getDbTenantSheetId(tenantId);
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
 * Check if tenant has completed initial setup
 */
export function checkTenantSetup(tenantId: string): boolean {
  return isSetupCompleted(tenantId);
}

/**
 * Get tenant configuration from database
 */
export function getTenantConfiguration(tenantId: string) {
  return getTenantConfig(tenantId);
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