/**
 * Navigation utilities for Shopify embedded apps
 * Ensures shop context is preserved during navigation
 */
import { useLocation } from "@remix-run/react";

/**
 * Hook to get current shop context from URL parameters and shop name element
 */
export function useShopContext() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  // Get shop context from URL parameters
  const urlShop = searchParams.get('shop');
  const urlHost = searchParams.get('host');
  
  // Fallback: try to get shop from the hidden shop element (set by app.tsx)
  let fallbackShop = null;
  if (typeof window !== 'undefined') {
    const shopElement = document.getElementById('__shop');
    fallbackShop = shopElement?.getAttribute('data-shop-name');
  }
  
  return {
    shop: urlShop || (fallbackShop ? `${fallbackShop}.myshopify.com` : null),
    host: urlHost,
    embedded: searchParams.get('embedded'),
    hmac: searchParams.get('hmac'),
    session: searchParams.get('session'),
    id_token: searchParams.get('id_token'),
    timestamp: searchParams.get('timestamp'),
    locale: searchParams.get('locale'),
  };
}

/**
 * Builds a navigation URL with preserved shop context
 */
export function buildAppUrl(path: string, shopContext?: Record<string, string | null>): string {
  if (!shopContext) {
    return path;
  }

  const url = new URL(path, 'https://example.com'); // Base URL for parsing
  
  // Add shop context parameters if they exist, prioritizing critical ones
  const criticalParams = ['shop', 'host', 'embedded', 'hmac', 'session'];
  
  criticalParams.forEach(key => {
    const value = shopContext[key];
    if (value) {
      url.searchParams.set(key, value);
    }
  });
  
  // Add other parameters
  Object.entries(shopContext).forEach(([key, value]) => {
    if (value && !criticalParams.includes(key)) {
      url.searchParams.set(key, value);
    }
  });

  return `${url.pathname}${url.search}`;
}

/**
 * Gets shop context from current location for navigation
 */
export function getShopContextFromLocation(location: Location): Record<string, string | null> {
  const searchParams = new URLSearchParams(location.search);
  
  return {
    shop: searchParams.get('shop'),
    host: searchParams.get('host'),
    embedded: searchParams.get('embedded'),
    hmac: searchParams.get('hmac'),
    session: searchParams.get('session'),
    id_token: searchParams.get('id_token'),
    timestamp: searchParams.get('timestamp'),
    locale: searchParams.get('locale'),
  };
}