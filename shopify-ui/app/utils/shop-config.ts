/**
 * Shop Configuration Utilities
 *
 * Manages shop name storage and retrieval for tenant identification.
 * Replaces complex automatic Shopify tenant detection with simple manual shop name input.
 */

const SHOP_NAME_KEY = "proofkit_shop_name";
// No default shop name - user must enter manually

/**
 * Gets the stored shop name from localStorage
 * @returns The stored shop name or null if not set
 */
export function getStoredShopName(): string | null {
  if (typeof window === "undefined") {
    return null; // Server-side rendering
  }

  try {
    return localStorage.getItem(SHOP_NAME_KEY);
  } catch (error) {
    console.warn("Failed to read shop name from localStorage:", error);
    return null;
  }
}

/**
 * Stores the shop name in localStorage
 * @param shopName The shop name to store
 */
export function setStoredShopName(shopName: string): void {
  if (typeof window === "undefined") {
    return; // Server-side rendering
  }

  if (!validateShopName(shopName)) {
    throw new Error("Invalid shop name provided");
  }

  try {
    localStorage.setItem(SHOP_NAME_KEY, shopName);
    // Mark that user explicitly set this shop name
    localStorage.setItem(`${SHOP_NAME_KEY}_user_set`, "true");

    // Persist to cookie so server can read it in loaders (Advanced page, etc.)
    try {
      const maxAge = 60 * 60 * 24 * 365; // 1 year
      document.cookie = `${SHOP_NAME_KEY}=${encodeURIComponent(shopName)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
      // Also set a flag cookie to indicate user set this
      document.cookie = `${SHOP_NAME_KEY}_user_set=true; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
    } catch (e) {
      // no-op if cookies unavailable
    }
  } catch (error) {
    console.warn("Failed to store shop name in localStorage:", error);
  }
}

/**
 * Validates a shop name
 * @param shopName The shop name to validate
 * @returns True if valid, false otherwise
 */
export function validateShopName(shopName: string): boolean {
  if (!shopName || typeof shopName !== "string") {
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
 * Returns a valid shop name or a safe default when none is configured
 */
export function getShopNameOrDefault(): string {
  const stored = getStoredShopName();
  if (stored && validateShopName(stored)) {
    return stored;
  }
  // Use environment TENANT_ID or fallback to proofkit
  return process.env.TENANT_ID || "proofkit";
}

/**
 * Clears the stored shop name
 */
export function clearStoredShopName(): void {
  if (typeof window === "undefined") {
    return; // Server-side rendering
  }

  try {
    localStorage.removeItem(SHOP_NAME_KEY);
    localStorage.removeItem(`${SHOP_NAME_KEY}_user_set`);

    // Expire the cookies
    try {
      document.cookie = `${SHOP_NAME_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
      document.cookie = `${SHOP_NAME_KEY}_user_set=; Path=/; Max-Age=0; SameSite=Lax`;
    } catch (e) {
      // ignore
    }
  } catch (error) {
    console.warn("Failed to clear shop name from localStorage:", error);
  }
}

/**
 * Gets shop name for server-side operations
 * Prioritizes user input over defaults, with better URL param support
 * @param requestHeaders Optional request headers to check for shop info
 * @param requestUrl Optional request URL to check for shop query params
 * @returns Shop name for server operations
 */
export function getServerShopName(
  requestHeaders?: Headers,
  requestUrl?: string,
): string {
  // 1. First check URL query parameters (highest priority for user input)
  if (requestUrl) {
    try {
      const url = new URL(requestUrl);
      const shopParam =
        url.searchParams.get("shop") ||
        url.searchParams.get("shopName") ||
        url.searchParams.get("tenant");
      if (shopParam && validateShopName(shopParam)) {
        return shopParam;
      }
    } catch (e) {
      // ignore URL parsing errors
    }
  }

  // 2. Check if shop name is passed in headers (for API calls)
  if (requestHeaders) {
    const headerShopName = requestHeaders.get("x-shop-name");
    if (headerShopName && validateShopName(headerShopName)) {
      return headerShopName;
    }

    // 3. Check cookies (set by client when saving shop name)
    const cookieHeader =
      requestHeaders.get("cookie") || requestHeaders.get("Cookie") || "";
    if (cookieHeader) {
      try {
        const parts = cookieHeader.split(";");
        for (const part of parts) {
          const [rawKey, ...rest] = part.trim().split("=");
          const key = (rawKey || "").trim();
          if (key === SHOP_NAME_KEY) {
            const value = decodeURIComponent(rest.join("="));
            if (value && validateShopName(value)) {
              return value;
            }
          }
        }
      } catch (e) {
        // ignore cookie parse errors
      }
    }
  }

  // 4. Check environment variable but avoid legacy values
  const envShopName = process.env.TENANT_ID || process.env.SHOP_NAME;
  if (
    envShopName &&
    envShopName !== "TENANT_123" &&
    envShopName !== "mybabybymerry" &&
    validateShopName(envShopName)
  ) {
    return envShopName;
  }

  // 5. Last resort: return 'proofkit' but only in development
  if (process.env.NODE_ENV === "development") {
    return "proofkit";
  }

  // 6. In production, we need a valid shop name - this should trigger setup
  throw new Error("No valid shop name found - setup required");
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
  const shopName = stored || process.env.TENANT_ID || "proofkit";

  return {
    shopName,
    isDefault: !stored, // Default if no stored shop name
    isValid: stored ? validateShopName(stored) : false,
  };
}

/**
 * Determines if shop setup is needed (first-time or using default)
 * @returns True if setup is needed
 */
export function isShopSetupNeeded(): boolean {
  if (typeof window === "undefined") {
    return false; // Server-side rendering
  }

  // Check if user explicitly dismissed setup for this session
  try {
    const setupDismissed = sessionStorage.getItem("proofkit_setup_dismissed");
    if (setupDismissed === "true") {
      return false;
    }
  } catch (e) {
    // sessionStorage not available
  }

  const storedShopName = getStoredShopName();

  // Setup needed if:
  // 1. No stored shop name exists
  // 2. Stored shop name is invalid
  // 3. Stored shop name is just the default development value
  if (!storedShopName || !validateShopName(storedShopName)) {
    return true;
  }

  // If we're only using the default 'proofkit' and no explicit user choice was made
  const defaultTenant = process.env.TENANT_ID || "proofkit";
  if (
    storedShopName === defaultTenant &&
    !localStorage.getItem(`${SHOP_NAME_KEY}_user_set`)
  ) {
    return true;
  }

  return false;
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
    // Mark that user explicitly set this shop name
    try {
      localStorage.setItem(`${SHOP_NAME_KEY}_user_set`, "true");
    } catch (e) {
      // localStorage not available
    }
    return true;
  } catch (error) {
    console.warn("Failed to complete shop setup:", error);
    return false;
  }
}

/**
 * Dismisses shop setup for the current session
 * This prevents setup banners from showing again until next page load
 */
export function dismissShopSetupForSession(): void {
  try {
    sessionStorage.setItem("proofkit_setup_dismissed", "true");
  } catch (e) {
    // sessionStorage not available
  }
}
