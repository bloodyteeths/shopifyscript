import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("🎫 Session token route accessed with 2025 auth strategy");
  
  try {
    // Use v3 authenticate context for 2025 compatibility
    const { session, admin } = await authenticate.admin(request);
    
    if (!session || !admin) {
      throw new Error("Authentication failed - no session or admin context");
    }
    
    console.log(`✅ Session token validated for shop: ${session.shop}`);
    
    // If authentication succeeds, redirect to the original URL
    const url = new URL(request.url);
    const shopifyReload = url.searchParams.get("shopify-reload");
    
    if (shopifyReload) {
      console.log("🔄 Redirecting to original URL:", shopifyReload);
      return new Response(null, {
        status: 302,
        headers: { 
          Location: shopifyReload,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }
    
    // Default redirect to app dashboard with session context
    return new Response(null, {
      status: 302,
      headers: { 
        Location: `/app?shop=${session.shop}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error("🚨 Session token route error:", error);
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop") || "";
    return new Response(null, {
      status: 302,
      headers: { Location: `/auth/login${shop ? `?shop=${shop}` : ''}` }
    });
  }
};

export default function SessionToken() {
  return null;
}