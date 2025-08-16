import { json, type ActionFunctionArgs } from '@remix-run/node';
import { backendFetchText } from '../server/hmac.server';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const body = await request.json();
    const { mode, budget, cpc, url } = body;
    
    // Fetch the real 45KB script using the text endpoint
    const currentTenant = process.env.TENANT_ID || 'mybabybymerry';
    const realScript = await backendFetchText('/ads-script/raw');
    
    if (realScript && realScript.length > 1000) {
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