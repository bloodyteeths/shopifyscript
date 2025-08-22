import React from 'react';
import { redirect, type LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  
  // Only redirect to app if this is clearly a Shopify embedded request
  const isEmbedded = url.searchParams.get('embedded') === '1';
  const hasHmac = url.searchParams.has('hmac');
  const hasHost = url.searchParams.has('host');
  
  if (isEmbedded && hasHmac && hasHost) {
    // This is definitely a Shopify embedded request
    return redirect("/app/");
  }
  
  // For all other requests, don't redirect - show a landing page
  return null;
}

export default function Index() {
  return (
    <html>
      <head>
        <title>ProofKit - Shopify App</title>
      </head>
      <body>
        <h1>ProofKit Shopify App</h1>
        <p>This app should be accessed through the Shopify Admin panel.</p>
        <p>If you're seeing this page, please install the app through Shopify.</p>
      </body>
    </html>
  );
}
