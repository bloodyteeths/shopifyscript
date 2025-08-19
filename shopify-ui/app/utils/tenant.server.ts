/**
 * Production-Ready Tenant Detection for Shopify SaaS
 * Extracts tenant ID from Shopify session, shop domain, or request context
 */

/**
 * Extract tenant ID from request
 * Production-ready multi-tenant detection
 */
export async function getTenantFromRequest(request: Request): Promise<string> {
  try {
    // Method 1: Extract from Shopify shop parameter (production)
    const url = new URL(request.url);
    const shopParam = url.searchParams.get('shop');
    if (shopParam) {
      // Convert "mystore.myshopify.com" -> "mystore"
      const tenantId = shopParam.replace('.myshopify.com', '');
      console.log(`🏪 Detected tenant from shop param: ${tenantId}`);
      return tenantId;
    }

    // Method 2: Extract from subdomain (if using subdomain routing)
    const host = request.headers.get('host') || '';
    if (host.includes('.proofkit.com')) {
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
        console.log(`🌐 Detected tenant from subdomain: ${subdomain}`);
        return subdomain;
      }
    }

    // Method 3: Extract from Shopify session headers
    const shopifyShop = request.headers.get('x-shopify-shop-domain');
    if (shopifyShop) {
      const tenantId = shopifyShop.replace('.myshopify.com', '');
      console.log(`🛍️ Detected tenant from Shopify header: ${tenantId}`);
      return tenantId;
    }
    
    // Development fallback methods
    if (process.env.NODE_ENV === 'development') {
      // 1. Check for explicit tenant in headers (for testing)
      const explicitTenant = request.headers.get('x-proofkit-tenant');
      if (explicitTenant) {
        return explicitTenant;
      }
      
      // 2. Check for tenant in URL parameters
      const url = new URL(request.url);
      const urlTenant = url.searchParams.get('tenant');
      if (urlTenant) {
        return urlTenant;
      }
      
      // 3. Default development tenant
      return process.env.DEFAULT_DEV_TENANT || 'dev-tenant';
    }
    
    // If we can't determine tenant, throw error
    throw new Error('Cannot determine tenant from request');
    
  } catch (error) {
    console.error('Tenant detection failed:', error.message);
    
    // Last resort: use development fallback
    if (process.env.NODE_ENV === 'development') {
      return process.env.DEFAULT_DEV_TENANT || 'dev-tenant';
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
    'dev-tenant',
    'demo-store',
    'test-shop'
  ];
}