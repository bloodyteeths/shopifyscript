import React from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData } from "@remix-run/react";
// @ts-expect-error moduleResolution mismatch with shopify-app-remix
import { boundary } from "@shopify/shopify-app-remix/server";
// @ts-expect-error moduleResolution mismatch with shopify-app-remix
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css";

import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const shopName = session?.shop?.replace(".myshopify.com", "");

    if (!shopName) {
      throw new Error("Unable to determine shop name from Shopify session");
    }

    return json({
      apiKey: process.env.SHOPIFY_API_KEY || "",
      shopName,
    });
  } catch (error) {
    console.error("App route authentication error:", error);

    const url = new URL(request.url);
    const shop = url.searchParams.get("shop") || url.searchParams.get("host");
    const authUrl = shop ? `/auth/login?shop=${shop}` : "/auth/login";

    throw new Response(null, {
      status: 302,
      headers: { Location: authUrl },
    });
  }
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">Dashboard</Link>
        <Link to="/app/campaigns">Campaigns</Link>
        <Link to="/app/ai-tools">AI Tools</Link>
        <Link to="/app/connect-google">Google Ads</Link>
        <Link to="/app/settings">Settings</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

export const ErrorBoundary = boundary.error;

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
