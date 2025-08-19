import { json, type ActionFunctionArgs } from '@remix-run/node';
import { backendFetchText } from '../server/hmac.server';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const body = await request.json();
    const { mode, budget, cpc, url, tenant } = body;
    
    // Use tenant passed from frontend, or extract from Shopify context
    let currentTenant = tenant || 'dev-tenant'; // use passed tenant first
    
    // Try to get shop from URL parameters (Shopify embedded app)
    const requestUrl = new URL(request.url);
    const shopParam = requestUrl.searchParams.get('shop');
    if (shopParam) {
      currentTenant = shopParam.replace('.myshopify.com', '');
    }
    
    // Check headers for Shopify shop domain
    const shopifyShop = request.headers.get('x-shopify-shop-domain') || 
                       request.headers.get('shopify-shop-domain');
    if (shopifyShop) {
      currentTenant = shopifyShop.replace('.myshopify.com', '');
    }
    
    // Extract from referrer (Shopify admin context)
    const referrer = request.headers.get('referer');
    if (referrer && referrer.includes('admin.shopify.com/store/')) {
      const match = referrer.match(/admin\.shopify\.com\/store\/([^\/\?]+)/);
      if (match) {
        currentTenant = match[1];
        console.log(`🏪 Script generation for shop: ${currentTenant}`);
      }
    }
    
    // Extract from Shopify host parameter (base64 encoded)
    const hostParam = requestUrl.searchParams.get('host');
    if (hostParam) {
      try {
        const decodedHost = Buffer.from(hostParam, 'base64').toString();
        console.log(`🔍 Decoded host parameter: ${decodedHost}`);
        if (decodedHost.includes('admin.shopify.com/store/')) {
          const match = decodedHost.match(/admin\.shopify\.com\/store\/([^\/\?]+)/);
          if (match) {
            currentTenant = match[1];
            console.log(`🏪 Script generation for shop: ${currentTenant}`);
          }
        }
      } catch (e) {
        console.log('Failed to decode host parameter:', e.message);
      }
    }
    
    console.log(`🔄 Generating script for tenant: ${currentTenant}`);
    
    // Use the proper backend fetch function with the detected tenant
    const { backendFetchText } = await import('../server/hmac.server');
    console.log(`🔗 Fetching script from backend for tenant: ${currentTenant}`);
    
    let realScript;
    try {
      realScript = await backendFetchText('/ads-script/raw', 'GET', undefined, currentTenant);
      console.log(`✅ Backend fetch completed for ${currentTenant}, script length: ${realScript?.length || 0}`);
    } catch (error) {
      console.log(`❌ Backend fetch failed for ${currentTenant}:`, error.message);
      throw error;
    }
    
    if (realScript && realScript.length > 1000 && !realScript.includes('<html'))  {
      const personalizedScript = `/** ProofKit Google Ads Script - Personalized for ${mode} mode
 * Tenant: ${currentTenant}
 * Generated: ${new Date().toISOString()}
 * Budget Cap: $${budget}/day
 * CPC Ceiling: $${cpc}
 * Landing URL: ${url || 'Not specified'}
 * Script Size: ${Math.round(realScript.length / 1024)}KB
 */

${realScript}

// Script personalized with your settings:
// - Mode: ${mode}
// - Budget: $${budget}/day  
// - CPC: $${cpc}
// - URL: ${url || 'default'}`;

      return json({ 
        success: true, 
        script: personalizedScript,
        size: Math.round(personalizedScript.length / 1024),
        tenant: currentTenant
      });
    } else {
      return json({ success: false, error: 'Failed to fetch complete script' });
    }
  } catch (error) {
    return json({ success: false, error: error.message });
  }
}