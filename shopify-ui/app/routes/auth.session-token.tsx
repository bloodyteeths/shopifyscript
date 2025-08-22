import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("🎫 Session token route accessed");
  
  try {
    const auth = await authenticate.admin(request);
    if (auth instanceof Response) {
      return auth;
    }
    
    // If authentication succeeds, redirect to the original URL
    const url = new URL(request.url);
    const shopifyReload = url.searchParams.get("shopify-reload");
    
    if (shopifyReload) {
      console.log("🔄 Redirecting to original URL:", shopifyReload);
      return new Response(null, {
        status: 302,
        headers: { Location: shopifyReload }
      });
    }
    
    // Default redirect to app dashboard
    return new Response(null, {
      status: 302,
      headers: { Location: "/app" }
    });
  } catch (error) {
    console.error("🚨 Session token route error:", error);
    return new Response(null, {
      status: 302,
      headers: { Location: "/auth/login" }
    });
  }
};

export default function SessionToken() {
  return null;
}