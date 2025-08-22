import { json, type ActionFunctionArgs } from "@remix-run/node";
import { backendFetchText } from "../server/hmac.server";
import { getServerShopName } from "../utils/shop-config";

export async function action({ request }: ActionFunctionArgs) {
  try {
    console.log(`🎯 Script generation API called - Method: ${request.method}, URL: ${request.url}`);
    
    const body = await request.json();
    const { mode, budget, cpc, url, shopName } = body;
    
    console.log(`📝 Request body parsed:`, { mode, budget, cpc, url, shopName });

    // Use shop name from request body or determine from server context
    const currentShopName =
      shopName || getServerShopName(request.headers, request.url);

    console.log(`🔄 Generating script for shop: ${currentShopName}`);

    // Use the proper backend fetch function with the detected tenant
    const { backendFetchText, backendFetch } = await import(
      "../server/hmac.server"
    );
    console.log(`🔗 Fetching script from backend for shop: ${currentShopName}`);

    let realScript;
    try {
      realScript = await backendFetchText(
        "/ads-script/raw",
        "GET",
        undefined,
        currentShopName,
      );
      console.log(
        `✅ Backend fetch completed for ${currentShopName}, script length: ${realScript?.length || 0}`,
      );
      // Bootstrap Sheets tabs by reading config once for this tenant (auto-creates CONFIG_*)
      try {
        console.log(
          `🧰 Bootstrapping Sheets tabs via /config for ${currentShopName}`,
        );
        await backendFetch("/config", "GET", undefined, currentShopName);
      } catch (e) {
        console.log(
          `⚠️ Config bootstrap call failed for ${currentShopName}:`,
          (e as any)?.message || e,
        );
      }
    } catch (error) {
      console.log(
        `❌ Backend fetch failed for ${currentShopName}:`,
        error.message,
      );
      throw error;
    }

    // Require a minimum script length to ensure full master.gs (avoid embedded 13KB fallback)
    if (
      realScript &&
      realScript.length > 30000 &&
      !realScript.includes("<html")
    ) {
      const personalizedScript = `/** ProofKit Google Ads Script - Personalized for ${mode} mode
 * Shop: ${currentShopName}
 * Generated: ${new Date().toISOString()}
 * Budget Cap: $${budget}/day
 * CPC Ceiling: $${cpc}
 * Landing URL: ${url || "Not specified"}
 * Script Size: ${Math.round(realScript.length / 1024)}KB
 */

${realScript}

// Script personalized with your settings:
// - Mode: ${mode}
// - Budget: $${budget}/day  
// - CPC: $${cpc}
// - URL: ${url || "default"}`;

      return json({
        success: true,
        script: personalizedScript,
        size: Math.round(personalizedScript.length / 1024),
        shopName: currentShopName,
      });
    } else {
      console.log(`❌ Script validation failed - length: ${realScript?.length || 0}, isHTML: ${realScript?.includes("<html") || false}`);
      return json({ 
        success: false, 
        error: "Failed to fetch complete script - backend may be returning fallback content",
        debug: {
          length: realScript?.length || 0,
          isHTML: realScript?.includes("<html") || false,
          preview: realScript?.substring(0, 200) || "No content"
        }
      });
    }
  } catch (error) {
    console.error(`❌ Script generation error:`, error);
    return json({ 
      success: false, 
      error: error.message || "Unknown error during script generation",
      stack: error.stack
    });
  }
}

// Add loader to handle GET requests gracefully
export async function loader() {
  return json({
    success: false,
    error: "This endpoint requires POST method for script generation"
  });
}
