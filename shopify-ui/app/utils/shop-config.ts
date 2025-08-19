/**
 * Shop Configuration Utilities
 * 
 * Manages shop name storage and retrieval for tenant identification.
 * Replaces complex automatic Shopify tenant detection with simple manual shop name input.
 */

const SHOP_NAME_KEY = 'proofkit_shop_name';
const DEFAULT_SHOP_NAME = 'proofkit';

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
 * Gets the shop name with fallback to default
 * @returns The stored shop name or default fallback
 */
export function getShopNameOrDefault(): string {
  const stored = getStoredShopName();
  
  if (stored && validateShopName(stored)) {
    return stored;
  }
  
  return DEFAULT_SHOP_NAME;
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
 * Falls back to environment variable or default
 * @param requestHeaders Optional request headers to check for shop info
 * @returns Shop name for server operations
 */
export function getServerShopName(requestHeaders?: Headers): string {
  // Check if shop name is passed in headers (for API calls)
  if (requestHeaders) {
    const headerShopName = requestHeaders.get('x-shop-name');
    if (headerShopName && validateShopName(headerShopName)) {
      return headerShopName;
    }
  }
  
  // For server-side, check environment variable
  const envShopName = process.env.TENANT_ID || process.env.SHOP_NAME;
  
  if (envShopName && validateShopName(envShopName)) {
    return envShopName;
  }
  
  return DEFAULT_SHOP_NAME;
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
  const shopName = getShopNameOrDefault();
  const stored = getStoredShopName();
  
  return {
    shopName,
    isDefault: shopName === DEFAULT_SHOP_NAME,
    isValid: validateShopName(shopName)
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
  const currentShopName = getShopNameOrDefault();
  
  // Setup needed if:
  // 1. No stored shop name exists
  // 2. Still using default shop name 
  // 3. Stored shop name is invalid
  return !storedShopName || 
         currentShopName === DEFAULT_SHOP_NAME || 
         (storedShopName && !validateShopName(storedShopName));
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