import React from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css";

import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    console.log(`🏪 Dashboard loaded for shop: ${new URL(request.url).searchParams.get('shop') || 'unknown'}`);
    
    // Standard Shopify authentication following best practices
    const { session } = await authenticate.admin(request);

    const shopName = session?.shop?.replace(".myshopify.com", "");

    if (!shopName) {
      console.error("❌ No shop name found in session:", session);
      throw new Error("Unable to determine shop name from Shopify session");
    }

    console.log(`🏪 Shopify app authenticated for shop: ${shopName}`);

    return json({
      apiKey: process.env.SHOPIFY_API_KEY || "",
      shopName,
    });
  } catch (error) {
    console.error("🚨 App route authentication error:", error);
    console.error("Request URL:", request.url);
    
    // Redirect to auth with shop context if possible
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop') || url.searchParams.get('host');
    const authUrl = shop ? `/auth/login?shop=${shop}` : '/auth/login';
    
    throw new Response(null, {
      status: 302,
      headers: { Location: authUrl }
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
        <div
          id="__shop"
          data-shop-name={shopName}
          style={{ display: "none" }}
        />
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
