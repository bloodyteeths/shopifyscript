import { json, type ActionFunctionArgs } from '@remix-run/node';
import { backendFetchText } from '../server/hmac.server';
import { getServerShopName } from '../utils/shop-config';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const body = await request.json();
    const { mode, budget, cpc, url, shopName } = body;
    
    // Use shop name from request body or determine from server context
    const currentShopName = shopName || getServerShopName(request.headers);
    
    console.log(`🔄 Generating script for shop: ${currentShopName}`);
    
    // Use the proper backend fetch function with the detected tenant
    const { backendFetchText } = await import('../server/hmac.server');
    console.log(`🔗 Fetching script from backend for shop: ${currentShopName}`);
    
    let realScript;
    try {
      realScript = await backendFetchText('/ads-script/raw', 'GET', undefined, currentShopName);
      console.log(`✅ Backend fetch completed for ${currentShopName}, script length: ${realScript?.length || 0}`);
    } catch (error) {
      console.log(`❌ Backend fetch failed for ${currentShopName}:`, error.message);
      throw error;
    }
    
    if (realScript && realScript.length > 1000 && !realScript.includes('<html'))  {
      const personalizedScript = `/** ProofKit Google Ads Script - Personalized for ${mode} mode
 * Shop: ${currentShopName}
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
        shopName: currentShopName
      });
    } else {
      return json({ success: false, error: 'Failed to fetch complete script' });
    }
  } catch (error) {
    return json({ success: false, error: error.message });
  }
}