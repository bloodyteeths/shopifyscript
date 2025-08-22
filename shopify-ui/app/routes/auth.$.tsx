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
          shopName =
            (rShopParam && rShopParam.replace(".myshopify.com", "")) ||
            (rHost && extractShopFromHost(rHost)) ||
            null;
          if (rHost && !url.searchParams.get("host")) {
            url.searchParams.set("host", rHost);
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
