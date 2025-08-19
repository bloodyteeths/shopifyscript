/**
 * Shop Configuration Utilities
 * 
 * Manages shop name storage and retrieval for tenant identification.
 * Replaces complex automatic Shopify tenant detection with simple manual shop name input.
 */

const SHOP_NAME_KEY = 'proofkit_shop_name';
// No default shop name - user must enter manually

/**
 * Gets the stored shop name from localStorage
 * @returns The stored shop name or null if not set
 */
export function getStoredShopName(): string | null {
  if (typeof window === 'undefined') {
    return null; // Server-side rendering
  }
  
  try {
    return localStorage.getItem(SHOP_NAME_KEY);
  } catch (error) {
    console.warn('Failed to read shop name from localStorage:', error);
    return null;
  }
}

/**
 * Stores the shop name in localStorage
 * @param shopName The shop name to store
 */
export function setStoredShopName(shopName: string): void {
  if (typeof window === 'undefined') {
    return; // Server-side rendering
  }
  
  if (!validateShopName(shopName)) {
    throw new Error('Invalid shop name provided');
  }
  
  try {
    localStorage.setItem(SHOP_NAME_KEY, shopName);
  } catch (error) {
    console.warn('Failed to store shop name in localStorage:', error);
  }
}

/**
 * Validates a shop name
 * @param shopName The shop name to validate
 * @returns True if valid, false otherwise
 */
export function validateShopName(shopName: string): boolean {
  if (!shopName || typeof shopName !== 'string') {
    return false;
  }
  
  const trimmed = shopName.trim();
  
  // Must be at least 2 characters, alphanumeric with hyphens/underscores allowed
  const validPattern = /^[a-zA-Z0-9][a-zA-Z0-9\-_]{1,63}$/;
  
  return validPattern.test(trimmed);
}

/**
 * Gets the shop name - NO fallback, user must enter manually
 * @returns The stored shop name or null if not configured
 */
export function getShopNameOrNull(): string | null {
  const stored = getStoredShopName();
  
  if (stored && validateShopName(stored)) {
    return stored;
  }
  
  return null; // Force user to enter shop name manually
}

/**
 * Clears the stored shop name
 */
export function clearStoredShopName(): void {
  if (typeof window === 'undefined') {
    return; // Server-side rendering
  }
  
  try {
    localStorage.removeItem(SHOP_NAME_KEY);
  } catch (error) {
    console.warn('Failed to clear shop name from localStorage:', error);
  }
}

/**
 * Gets shop name for server-side operations
 * Requires manual user configuration - no automatic fallbacks
 * @param requestHeaders Optional request headers to check for shop info
 * @returns Shop name for server operations or 'dev-tenant' for development
 */
export function getServerShopName(requestHeaders?: Headers): string {
  // Check if shop name is passed in headers (for API calls)
  if (requestHeaders) {
    const headerShopName = requestHeaders.get('x-shop-name');
    if (headerShopName && validateShopName(headerShopName)) {
      return headerShopName;
    }
  }
  
  // For server-side, check environment variable but avoid legacy values
  const envShopName = process.env.TENANT_ID || process.env.SHOP_NAME;
  
  if (envShopName && 
      envShopName !== 'TENANT_123' && 
      envShopName !== 'mybabybymerry' &&
      validateShopName(envShopName)) {
    return envShopName;
  }
  
  // Development fallback only - production should have proper shop name
  return 'dev-tenant';
}

/**
 * Shop configuration interface for TypeScript
 */
export interface ShopConfig {
  shopName: string;
  isDefault: boolean;
  isValid: boolean;
}

/**
 * Gets complete shop configuration
 * @returns Shop configuration object
 */
export function getShopConfig(): ShopConfig {
  const stored = getStoredShopName();
  const shopName = stored || 'dev-tenant';
  
  return {
    shopName,
    isDefault: !stored, // Default if no stored shop name
    isValid: stored ? validateShopName(stored) : false
  };
}

/**
 * Determines if shop setup is needed (first-time or using default)
 * @returns True if setup is needed
 */
export function isShopSetupNeeded(): boolean {
  if (typeof window === 'undefined') {
    return false; // Server-side rendering
  }
  
  const storedShopName = getStoredShopName();
  
  // Setup needed ONLY if:
  // 1. No stored shop name exists
  // 2. Stored shop name is invalid
  return !storedShopName || (storedShopName && !validateShopName(storedShopName));
}

/**
 * Marks shop setup as completed by storing the shop name
 * @param shopName The shop name to store
 * @returns True if successful
 */
export function completeShopSetup(shopName: string): boolean {
  try {
    if (!validateShopName(shopName)) {
      return false;
    }
    
    setStoredShopName(shopName);
    return true;
  } catch (error) {
    console.warn('Failed to complete shop setup:', error);
    return false;
  }
}