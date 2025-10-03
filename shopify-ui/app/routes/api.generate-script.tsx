import { json, type ActionFunctionArgs } from "@remix-run/node";
import { backendFetchText } from "../server/hmac.server";
import { getServerShopName } from "../utils/shop-config";

export async function action({ request }: ActionFunctionArgs) {
  try {
    console.log(`Script generation API called - Method: ${request.method}, URL: ${request.url}`);

    const body = await request.json();
    const { mode, budget, cpc, url, shopName, tier } = body;

    console.log(`Request body parsed:`, { mode, budget, cpc, url, shopName, tier });

    // Use shop name from request body or determine from server context
    const currentShopName =
      shopName || getServerShopName(request.headers, request.url);

    console.log(`Generating script for shop: ${currentShopName}`);

    // Use the proper backend fetch function with the detected tenant
    const { backendFetchText, backendFetch } = await import(
      "../server/hmac.server"
    );

    // Get subscription tier if not provided
    let actualTier = tier;
    if (!actualTier) {
      try {
        // Try to get subscription info from Shopify
        const { authenticate } = await import("../shopify.server");
        const { checkSubscriptionStatus } = await import("../utils/subscription.server");
        const { admin } = await authenticate.admin(request);
        const subscriptionInfo = await checkSubscriptionStatus(admin);
        actualTier = subscriptionInfo?.subscriptionTier || "starter";
        console.log(`Detected subscription tier: ${actualTier} for ${currentShopName}`);
      } catch (tierError) {
        console.warn(`Failed to detect tier, using starter:`, tierError.message);
        actualTier = "starter";
      }
    }

    // Optional: Save user settings to backend (commented out - now passing as query params)
    // Uncomment if you want to persist settings for future sessions
    /*
    try {
      console.log(`💾 Saving user settings for ${currentShopName} (tier: ${actualTier})`);
      const saveResult = await backendFetch("/config/save-settings", "POST", {
        settings: {
          budget: String(budget),
          cpc: String(cpc),
          landing_url: String(url || ""),
          plan: actualTier
        }
      }, currentShopName);
      console.log(`✅ User settings saved for ${currentShopName}:`, saveResult.json);

      // Wait a moment for config to propagate
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Force config refresh by triggering bootstrap with new values
      const configResult = await backendFetch("/config", "GET", undefined, currentShopName);
      console.log(`🔄 Config refreshed for ${currentShopName}:`, configResult.json?.config);
    } catch (saveError) {
      console.warn(`Failed to save user settings:`, saveError.message);
      // Continue with script generation even if save fails
    }
    */

    console.log(`🔗 Fetching script from backend for shop: ${currentShopName}`);

    // Build query parameters to pass user settings directly
    const scriptParams = new URLSearchParams({
      budget: String(budget || "20.00"),
      cpc: String(cpc || "0.50"),
      landing_url: String(url || "")
    }).toString();

    let realScript;
    try {
      // Try v2 endpoint first with parameters, fallback to raw endpoint
      try {
        console.log(`🔗 Attempting to fetch from /ads-script/v2 endpoint with params: ${scriptParams}`);
        realScript = await backendFetchText(
          `/ads-script/v2?${scriptParams}`,
          "GET",
          undefined,
          currentShopName,
        );
      } catch (v2Error) {
        console.log(`⚠️ V2 endpoint failed, falling back to /ads-script/raw: ${v2Error.message}`);
        realScript = await backendFetchText(
          `/ads-script/raw?${scriptParams}`,
          "GET",
          undefined,
          currentShopName,
        );
      }
      console.log(
        `Backend fetch completed for ${currentShopName}, script length: ${realScript?.length || 0}`,
      );
      // Bootstrap Sheets tabs by reading config once for this tenant (auto-creates CONFIG_*)
      try {
        console.log(
          `🧰 Bootstrapping Sheets tabs via /config for ${currentShopName}`,
        );
        await backendFetch("/config", "GET", undefined, currentShopName);
      } catch (e) {
        console.log(
          `Config bootstrap call failed for ${currentShopName}:`,
          (e as any)?.message || e,
        );
      }
    } catch (error) {
      console.log(
        `Backend fetch failed for ${currentShopName}:`,
        error.message,
      );
      throw error;
    }

    // Validate script content (optimized script is ~26KB)
    if (
      realScript &&
      realScript.length > 20000 &&
      !realScript.includes("<html")
    ) {
      const header = `/** Ads Autopilot AI - Google Ads Script (${mode} mode)
 * Shop: ${currentShopName}
 * Generated: ${new Date().toISOString()}
 * Budget Cap: $${budget}/day
 * CPC Ceiling: $${cpc}
 * Landing URL: ${url || "Not specified"}
 * Script Size: 26KB (optimized)
 */

`;

      const footer = `

// Script personalized with your settings:
// - Mode: ${mode}
// - Budget: $${budget}/day
// - CPC: $${cpc}
// - URL: ${url || "default"}`;

      const personalizedScript = header + realScript + footer;

      return json({
        success: true,
        script: personalizedScript,
        size: Math.round(personalizedScript.length / 1024),
        shopName: currentShopName,
      });
    } else {
      console.log(`Script validation failed - length: ${realScript?.length || 0}, isHTML: ${realScript?.includes("<html") || false}`);
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
    console.error(`Script generation error:`, error);
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







