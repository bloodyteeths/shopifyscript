import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import {
  authenticate,
  extractShopFromRequest,
  extractShopFromHost,
} from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Extract shop/host for robust OAuth
    const url = new URL(request.url);
    const host = url.searchParams.get("host") || undefined;
    let shopName = extractShopFromRequest(request);
    if (!shopName && host) {
      shopName = extractShopFromHost(host) || null;
    }
    if (!shopName) {
      // Try Referer header (Shopify iframe navigation often includes host/hmac).
      const referer = request.headers.get("referer");
      if (referer) {
        try {
          const r = new URL(referer);
          const rHost = r.searchParams.get("host") || undefined;
          const rShopParam = r.searchParams.get("shop") || undefined;
          
          // Extract shop from different sources in referer
          if (rShopParam) {
            shopName = rShopParam.replace(".myshopify.com", "");
          } else if (rHost) {
            shopName = extractShopFromHost(rHost);
          }
          
          // If still no shop, try to extract from referer domain
          if (!shopName) {
            const domainMatch = referer.match(/\/\/([^.]+)\.myshopify\.com/);
            if (domainMatch && domainMatch[1]) {
              shopName = domainMatch[1];
            }
          }
          
          // Copy critical Shopify params from referer to current request
          if (rHost && !url.searchParams.get("host")) {
            url.searchParams.set("host", rHost);
          }
          const rHmac = r.searchParams.get("hmac");
          if (rHmac && !url.searchParams.get("hmac")) {
            url.searchParams.set("hmac", rHmac);
          }
        } catch {}
      }
    }

    console.log(`🔐 Shopify OAuth request for shop: ${shopName || "unknown"}`);

    // If we still don't have required params for Remix auth, construct a clean auth URL
    if (!host || !url.searchParams.get("id")) {
      // Ensure minimal params for Shopify's auth handler
      if (shopName && !url.searchParams.get("shop")) {
        url.searchParams.set("shop", `${shopName}.myshopify.com`);
      }
    }

    // Authenticate using Shopify's 2025 embedded auth strategy
    const auth = await authenticate.admin(request);
    if (auth instanceof Response) {
      return auth;
    }
    return null;
  } catch (error) {
    console.error("🚨 Auth route error:", error);
    console.error("Request URL:", request.url);
    console.error("Request headers:", Object.fromEntries(request.headers.entries()));
    
    // If auth fails, redirect to login with error context
    return redirect(`/auth/login?error=auth_failed&shop=${extractShopFromRequest(request) || 'unknown'}`);
  }
};
