import React from 'react';
import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css";

import { authenticate, extractShopFromRequest } from "../shopify.server";
import { getAuthenticatedShop } from "../utils/auth-helpers.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Use enhanced authentication that checks backend database first
    const { shopName, fromCache } = await getAuthenticatedShop(request);
    
    console.log(`🏪 Shopify app authenticated for shop: ${shopName} ${fromCache ? '(from cache)' : '(fresh auth)'}`);

    return json({
      apiKey: process.env.SHOPIFY_API_KEY || "",
      shopName,
    });
  } catch (error) {
    // If authentication fails, let Shopify handle the redirect
    console.log(`🔐 Authentication required, delegating to Shopify auth flow`);
    
    const auth = await authenticate.admin(request);
    if (auth instanceof Response) {
      return auth;
    }
    
    const { session } = auth as any;
    const shopName = session?.shop?.replace(".myshopify.com", "");
    
    if (!shopName) {
      throw new Error("Unable to determine shop name from Shopify session");
    }

    console.log(`🏪 Shopify app authenticated for shop: ${shopName} (fallback auth)`);

    return json({
      apiKey: process.env.SHOPIFY_API_KEY || "",
      shopName,
    });
  }
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
        <div id="__shop" data-shop-name={shopName} style={{ display: "none" }} />
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
