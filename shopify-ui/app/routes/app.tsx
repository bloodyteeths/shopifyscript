import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css";

import { authenticate, extractShopFromRequest } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Authenticate with Shopify
  const { session } = await authenticate.admin(request);

  // Extract shop name from session or request parameters
  let shopName = session?.shop?.replace(".myshopify.com", "");

  // Fallback: try to extract from request if session doesn't have shop
  if (!shopName) {
    shopName = extractShopFromRequest(request);
  }

  // If we still don't have a shop name, something is wrong
  if (!shopName) {
    throw new Error("Unable to determine shop name from Shopify session");
  }

  console.log(`🏪 Shopify app authenticated for shop: ${shopName}`);

  return json({
    apiKey: process.env.SHOPIFY_API_KEY || "",
    shopName,
  });
};

export default function App() {
  const { apiKey, shopName } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#f6f6f7",
          padding: "0",
        }}
      >
        {/* Store shop name in a global context for child components */}
        <div data-shop-name={shopName} style={{ display: "none" }} />
        <Outlet />
      </div>
    </AppProvider>
  );
}

// Shopify app boundary provides error handling for authentication errors
export const ErrorBoundary = boundary.error;

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
