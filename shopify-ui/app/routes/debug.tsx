import { json } from "@remix-run/node";

export async function loader() {
  return json({
    env: {
      SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY ? "SET" : "MISSING",
      SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET ? "SET" : "MISSING",
      SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || "MISSING",
      NODE_ENV: process.env.NODE_ENV || "MISSING",
      SCOPES: process.env.SCOPES || "MISSING",
    },
    nodeVersion: process.version,
  });
}

export default function Debug() {
  return <div>Debug route - check logs for environment info</div>;
}
