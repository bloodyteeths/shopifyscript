import { redirect, type LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  
  if (!shop) {
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Install ProofKit</title></head>
        <body>
          <h1>Install ProofKit Shopify App</h1>
          <form method="get">
            <label>
              Shop Name: 
              <input name="shop" placeholder="your-store" required />
              <small>.myshopify.com</small>
            </label>
            <button type="submit">Install App</button>
          </form>
          <p><small>Enter your shop name (without .myshopify.com)</small></p>
        </body>
      </html>
      `,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  const shopDomain = shop.includes('.') ? shop : `${shop}.myshopify.com`;
  const apiKey = process.env.SHOPIFY_API_KEY;
  
  if (!apiKey || apiKey === 'placeholder_api_key') {
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Configuration Error</title></head>
        <body>
          <h1>❌ Configuration Error</h1>
          <p>SHOPIFY_API_KEY is not configured in environment variables.</p>
          <p>Please set the real API key in Vercel environment variables.</p>
          <p>Current value: ${apiKey || 'MISSING'}</p>
        </body>
      </html>
      `,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  const scopes = process.env.SCOPES || 'read_products,write_products';
  const redirectUri = `${process.env.SHOPIFY_APP_URL}/auth/callback`;

  const params = new URLSearchParams({
    client_id: apiKey,
    scope: scopes,
    redirect_uri: redirectUri,
    state: crypto.randomUUID(),
  });

  const authUrl = `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`;
  
  console.log(`🔗 Redirecting to Shopify OAuth for shop: ${shop}`);
  console.log(`🔗 Auth URL: ${authUrl}`);
  
  return redirect(authUrl);
}

export default function Install() {
  return null;
}