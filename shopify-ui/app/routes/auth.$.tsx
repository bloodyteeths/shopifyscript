import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate, extractShopFromRequest } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Extract shop name from request for logging
  const shopName = extractShopFromRequest(request);
  console.log(`🔐 Shopify OAuth request for shop: ${shopName || 'unknown'}`);
  
  // Let Shopify SDK handle the authentication flow
  await authenticate.admin(request);

  return null;
};