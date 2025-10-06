import * as React from "react";
import { useLoaderData, useActionData, useNavigation, Form } from "@remix-run/react";
import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { checkTenantSetup } from "../utils/tenant.server";
import { getServerShopName } from "../utils/shop-config";
import { backendFetchText } from "../server/hmac.server";
import {
  getShopNameOrNull,
  isShopSetupNeeded,
  dismissShopSetupForSession,
} from "../utils/shop-config";
import { ShopSetupBanner } from "../components/ShopSetupBanner";
import { ClientOnly } from "../components/ClientOnly";
import { checkSubscriptionStatus, hasFeatureAccess } from "../utils/subscription.server";
import { CampaignSetupForm } from "../components/CampaignSetupForm";
import { MLAutopilotDashboard } from "../components/MLAutopilotDashboard";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Standard Shopify authentication following best practices
    const { session, admin } = await authenticate.admin(request);

    const shopName = session?.shop?.replace(".myshopify.com", "");

    if (!shopName) {
      throw new Error("Unable to determine shop name from Shopify session");
    }

    console.log(`Autopilot loaded for shop: ${shopName}`);

    // Check subscription status for feature access control (with error handling)
    let subscriptionInfo = {
      hasActivePayment: false,
      isInTrial: false,
      trialDaysRemaining: null,
      subscriptionTier: null,
      subscriptionStatus: 'checking',
      subscriptionId: null,
      currentPeriodEnd: null,
      needsSubscription: true
    };
    
    let availableFeatures = {
      scriptGeneration: true, // Allow basic script generation
      advancedSettings: false,
      realTimeAnalytics: false,
      customRules: false
    };

    try {
      subscriptionInfo = await checkSubscriptionStatus(admin);
      
      // Determine available features based on subscription
      availableFeatures = {
        scriptGeneration: hasFeatureAccess(subscriptionInfo, 'ai_campaign_optimization'),
        advancedSettings: hasFeatureAccess(subscriptionInfo, 'advanced_ai_optimization'),
        realTimeAnalytics: hasFeatureAccess(subscriptionInfo, 'real_time_performance_analytics'),
        customRules: hasFeatureAccess(subscriptionInfo, 'custom_ai_optimization_rules')
      };

      console.log(`🔐 Feature access for ${shopName}:`, availableFeatures);
      
    } catch (subscriptionError) {
      console.error('Subscription check failed on autopilot, using basic access:', subscriptionError);
      // Allow basic access if subscription check fails
    }

    // Check campaign limits based on subscription tier
    let campaignLimits = {
      current: 0,
      limit: 5, // Default to starter limit
      tier: subscriptionInfo.subscriptionTier || 'starter',
      canCreate: true,
      upgradeUrl: '/app/billing'
    };

    try {
      // Call backend to check campaign limits
      const { backendFetch } = await import("../server/hmac.server");
      const limitsResponse = await backendFetch("/campaign-limits", "GET", undefined, shopName);
      
      if (limitsResponse.ok) {
        const limits = await limitsResponse.json();
        campaignLimits = {
          current: limits.currentCount || 0,
          limit: limits.limit || 5,
          tier: limits.tier || 'starter',
          canCreate: limits.allowed || false,
          upgradeUrl: limits.upgradeUrl || '/app/billing'
        };
      }
    } catch (limitsError) {
      console.error('Campaign limits check failed:', limitsError);
      // Continue with default limits
    }

    // Return config with authenticated shop name for client
    const config = {
      backendUrl:
        process.env.BACKEND_PUBLIC_URL ||
        "https://ads-autopilot-backend.vercel.app/api",
      shopName, // Authenticated shop name from Shopify session
    };

    return json({ 
      config, 
      shopName, 
      subscriptionInfo,
      availableFeatures,
      campaignLimits
    });
    
  } catch (authError) {
    console.error("Autopilot authentication error:", authError);
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
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    // Get authenticated shop name from Shopify session
    const { session } = await authenticate.admin(request);
    const currentShopName = session?.shop?.replace(".myshopify.com", "");

    if (!currentShopName) {
      console.error("No shop name found in Shopify session");
      return json({ success: false, error: "Authentication required" });
    }

    const formData = await request.formData();
    const actionType = formData.get("actionType");

    if (actionType === "generateScript") {
      console.log(`Server action generating script for shop: ${currentShopName}`);

      const mode = formData.get("mode") || "protect";
      const budget = formData.get("budget") || "20.00";
      const cpc = formData.get("cpc") || "0.50";
      const url = formData.get("url") || "";
      const advancedConfigRaw = formData.get("advancedConfig");

      // Parse advanced config if provided
      let advancedConfig = null;
      if (advancedConfigRaw) {
        try {
          advancedConfig = JSON.parse(advancedConfigRaw.toString());
          console.log("Advanced config received:", advancedConfig);
        } catch (e) {
          console.error("Failed to parse advanced config:", e);
        }
      }

      try {
        // Build query parameters to pass user settings
        const scriptParams = new URLSearchParams({
          budget: String(budget || "20.00"),
          cpc: String(cpc || "0.50"),
          landing_url: String(url || "")
        }).toString();

        // Fetch the real script using authenticated backend call with parameters
        const realScript = await backendFetchText(
          `/ads-script/raw?${scriptParams}`,
          "GET",
          undefined,
          currentShopName,
        );

        console.log(
          `Script fetch result for ${currentShopName}: length=${realScript?.length || 0}, isHTML=${realScript?.includes("<html") || false}`,
        );
        console.log(`Script preview (first 200 chars):`, realScript?.substring(0, 200));

        if (
          realScript &&
          realScript.length > 1000 &&
          !realScript.includes("<html")
        ) {
          console.log(`Script validation passed for ${currentShopName}`);

          // If we have advanced config, inject the customized values into the script
          let customizedScript = realScript;

          if (advancedConfig) {
            // Generate campaign elements based on user config
            const generateKeywords = (config) => {
              const { mainProducts, businessType, keywordStrategy, customKeywords, businessName } = config;
              if (keywordStrategy === 'custom' && customKeywords) {
                return customKeywords.split(',').map(k => k.trim());
              }

              const keywords = [];
              const products = mainProducts.toLowerCase().split(',').map(p => p.trim());

              switch (keywordStrategy) {
                case 'brand':
                  keywords.push(businessName.toLowerCase());
                  keywords.push(`${businessName.toLowerCase()} store`);
                  keywords.push(`${businessName.toLowerCase()} online`);
                  break;
                case 'competitor':
                  products.forEach(product => {
                    keywords.push(`best ${product}`);
                    keywords.push(`${product} reviews`);
                    keywords.push(`${product} comparison`);
                  });
                  break;
                default: // 'auto'
                  products.forEach(product => {
                    keywords.push(product);
                    keywords.push(`buy ${product}`);
                    keywords.push(`${product} online`);
                    keywords.push(`${product} sale`);
                  });
              }
              return keywords;
            };

            const generateHeadlines = (config) => {
              const { businessName, mainProducts, adTone, hasOffer, offerText, goal } = config;
              const headlines = [];
              const products = mainProducts.split(',')[0].trim();

              headlines.push(`${businessName} Official Site`);
              headlines.push(`Shop ${businessName} Today`);

              switch (adTone) {
                case 'professional':
                  headlines.push('Trusted Quality Since 2020');
                  headlines.push('Professional Solutions');
                  headlines.push('Expert Recommended');
                  break;
                case 'urgent':
                  headlines.push('Limited Time Offer!');
                  headlines.push('Sale Ends Soon');
                  headlines.push(`Don't Miss Out!`);
                  break;
                case 'luxury':
                  headlines.push('Exclusive Collection');
                  headlines.push('Premium Quality');
                  headlines.push('Luxury Experience');
                  break;
                default: // 'friendly'
                  headlines.push('Free Shipping Available');
                  headlines.push('Loved by Customers');
                  headlines.push('Join Our Community');
              }

              if (hasOffer && offerText) {
                headlines.push(offerText.substring(0, 30));
              }

              headlines.push(`Best ${products} Online`);
              headlines.push(`Shop ${products} Now`);

              return headlines.map(h => h.substring(0, 30)).slice(0, 15);
            };

            const generateDescriptions = (config) => {
              const { targetAudience, mainProducts, adTone, hasOffer, offerText, businessType } = config;
              const descriptions = [];

              switch (adTone) {
                case 'professional':
                  descriptions.push(`Professional service for ${targetAudience}. Quality guaranteed.`);
                  descriptions.push('Industry expertise you can trust. Contact our specialists today.');
                  break;
                case 'urgent':
                  descriptions.push(`Limited time offers for ${targetAudience}. Shop now before it's too late!`);
                  descriptions.push(`Sale ends soon! Don't miss these incredible deals. Order today!`);
                  break;
                case 'luxury':
                  descriptions.push(`Exclusive ${mainProducts} for discerning ${targetAudience}.`);
                  descriptions.push('Experience luxury shopping. Premium quality, exceptional service.');
                  break;
                default: // 'friendly'
                  descriptions.push(`Perfect ${mainProducts} for ${targetAudience}. Shop with confidence!`);
                  descriptions.push('Join thousands of happy customers. Fast shipping & easy returns!');
              }

              if (hasOffer && offerText) {
                descriptions.push(`Special offer: ${offerText}. Limited time only!`);
              }

              return descriptions.map(d => d.substring(0, 90)).slice(0, 4);
            };

            // Generate customized campaign elements
            const keywords = generateKeywords(advancedConfig);
            const headlines = generateHeadlines(advancedConfig);
            const descriptions = generateDescriptions(advancedConfig);

            // Inject the generated content into the script
            // Simply prepend the configuration to the script
            const configData = {
              businessName: advancedConfig.businessName,
              businessType: advancedConfig.businessType,
              mainProducts: advancedConfig.mainProducts,
              targetAudience: advancedConfig.targetAudience,
              goal: advancedConfig.goal,
              alwaysOn: advancedConfig.alwaysOn,
              businessHours: advancedConfig.businessHours,
              keywordStrategy: advancedConfig.keywordStrategy,
              adTone: advancedConfig.adTone,
              hasOffer: advancedConfig.hasOffer,
              offerText: advancedConfig.offerText,
              dailyBudget: advancedConfig.dailyBudget,
              targetCPC: advancedConfig.targetCPC,
              generatedKeywords: keywords,
              generatedHeadlines: headlines,
              generatedDescriptions: descriptions
            };

            const configScript = `// ========= USER CAMPAIGN CONFIGURATION =========
// This configuration was generated from your Advanced Setup Form
var USER_CONFIG = ${JSON.stringify(configData, null, 2)};

// Use these values in campaign creation
var USER_BUDGET = ${advancedConfig.dailyBudget};
var USER_CPC = ${advancedConfig.targetCPC};
var USER_KEYWORDS = ${JSON.stringify(keywords)};
var USER_HEADLINES = ${JSON.stringify(headlines)};
var USER_DESCRIPTIONS = ${JSON.stringify(descriptions)};
// ================================================\n\n`;

            customizedScript = configScript + realScript;
          }

          const personalizedScript = `/** Ads Autopilot AI - Google Ads Script (${advancedConfig ? 'Advanced' : mode} mode)
 * Shop: ${currentShopName}
 * Generated: ${new Date().toISOString()}
 * Budget Cap: $${advancedConfig ? advancedConfig.dailyBudget : budget}/day
 * CPC Ceiling: $${advancedConfig ? advancedConfig.targetCPC.toFixed(2) : cpc}
 * Landing URL: ${url || "Not specified"}
 * Script Size: ${Math.round(customizedScript.length / 1024)}KB
${advancedConfig ? ` * Business Type: ${advancedConfig.businessType}
 * Target: ${advancedConfig.targetAudience}
 * Products: ${advancedConfig.mainProducts}` : ''}
 */

${customizedScript}

// Script personalized with your settings:
// - Mode: ${advancedConfig ? 'Advanced' : mode}
// - Budget: $${advancedConfig ? advancedConfig.dailyBudget : budget}/day
// - CPC: $${advancedConfig ? advancedConfig.targetCPC.toFixed(2) : cpc}
// - URL: ${url || "default"}${
  advancedConfig ? `\n// - Business: ${advancedConfig.businessName}
// - Products: ${advancedConfig.mainProducts}
// - Goal: ${advancedConfig.goal}` : ''
}`;

          const response = {
            success: true,
            script: personalizedScript,
            size: Math.round(personalizedScript.length / 1024),
            shopName: currentShopName,
          };
          console.log(`Returning success response:`, { 
            success: response.success, 
            scriptLength: response.script.length, 
            size: response.size, 
            shopName: response.shopName 
          });
          return json(response);
        } else {
          console.log(
            `Script validation failed for ${currentShopName}: length=${realScript?.length || 0}, hasHTML=${realScript?.includes("<html") || false}`,
          );
          return json({
            success: false,
            error: "Failed to fetch complete script from backend",
            debug: {
              length: realScript?.length || 0,
              isHTML: realScript?.includes("<html") || false,
              preview: realScript?.substring(0, 200) || "No content"
            }
          });
        }
      } catch (error) {
        console.error(
          `Action script fetch failed for ${currentShopName}:`,
          error.message,
        );
        return json({ 
          success: false, 
          error: error.message || "Backend fetch failed",
          stack: error.stack
        });
      }
    }

    return json({ success: false, error: "Unknown action type" });
  } catch (authError) {
    console.error("Autopilot action authentication failed:", authError);
    return json({ 
      success: false, 
      error: "Authentication failed - please reload the page" 
    });
  }
}

export default function Autopilot() {
  const { config, shopName: serverShopName, campaignLimits } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [mode, setMode] = React.useState("protect");
  const [budget, setBudget] = React.useState("20.00");
  const [cpc, setCpc] = React.useState("0.50");
  const [url, setUrl] = React.useState("");
  const [showAdvancedForm, setShowAdvancedForm] = React.useState(false);
  // Shop setup banner removed - using Shopify authenticated shop name

  const [toast, setToast] = React.useState("");
  const [scriptCode, setScriptCode] = React.useState("");
  const [showScript, setShowScript] = React.useState(false);
  const [shopName, setShopName] = React.useState<string | null>(null);
  const [generatedAds, setGeneratedAds] = React.useState<any>(null);
  const [showGeneratedAds, setShowGeneratedAds] = React.useState(false);
  const [isGeneratingAds, setIsGeneratingAds] = React.useState(false);
  const [mlState, setMLState] = React.useState(null);
  const [showMLDashboard, setShowMLDashboard] = React.useState(false);
  
  // Disable debug state changes that cause hydration issues
  // React.useEffect(() => {
  //   console.log('State update:', { 
  //     showScript, 
  //     scriptCodeLength: scriptCode.length,
  //     shopName,
  //     toast 
  //   });
  // }, [showScript, scriptCode, shopName, toast]);
  
  const isGeneratingScript = navigation.state === "submitting" &&
    navigation.formData?.get("actionType") === "generateScript";

  // Function to generate AI ads using the backend endpoint
  const generateAIAds = async () => {
    if (!shopName) {
      setToast("Error: Shop name not available");
      return;
    }

    setIsGeneratingAds(true);
    setToast("Generating AI ads...");

    try {
      const { backendFetch } = await import("../server/hmac.server");
      const response = await backendFetch("/ai/generate/rsa", "POST", {
        theme: "Business",
        industry: "ecommerce",
        keywords: ["shop", "online", "store"],
        tone: "professional",
        headlineCount: 15,
        descriptionCount: 4
      }, shopName);

      if (response.ok) {
        const result = await response.json();
        if (result.ok) {
          setGeneratedAds(result);
          setShowGeneratedAds(true);
          setToast(`Generated ${result.headlines?.length || 0} headlines and ${result.descriptions?.length || 0} descriptions`);
        } else {
          setToast("Error: " + result.error);
        }
      } else {
        setToast("Error: Failed to generate AI ads");
      }
    } catch (error) {
      console.error("AI ads generation error:", error);
      setToast("Error: " + error.message);
    } finally {
      setIsGeneratingAds(false);
    }
  };

  // Function to fetch ML autopilot state
  const fetchMLState = async () => {
    if (!shopName) return;

    try {
      const { backendFetch } = await import("../server/hmac.server");
      const response = await backendFetch("/jobs/autopilot_tick", "POST", {
        nonce: Date.now()
      }, shopName + "?dry=1"); // Dry run to get insights

      if (response.ok) {
        const result = await response.json();
        if (result.ok && result.ml) {
          setMLState(result.ml);
          setToast("ML state updated");
        }
      }
    } catch (error) {
      console.error("Failed to fetch ML state:", error);
      setToast("Error: Failed to fetch ML insights");
    }
  };

  // Function to accept generated AI ads
  const acceptAIAds = async () => {
    if (!generatedAds || !shopName) {
      setToast("Error: No ads to accept");
      return;
    }

    try {
      const { backendFetch } = await import("../server/hmac.server");
      const response = await backendFetch("/ai/accept", "POST", {
        items: [{
          theme: "generated",
          headlines_pipe: generatedAds.headlines?.join("|") || "",
          descriptions_pipe: generatedAds.descriptions?.join("|") || "",
          source: "ai_generated"
        }]
      }, shopName);

      if (response.ok) {
        const result = await response.json();
        if (result.ok && result.accepted > 0) {
          setToast(`Accepted ${result.accepted} AI-generated ad sets`);
          setShowGeneratedAds(false);
          setGeneratedAds(null);
        } else {
          setToast("Error: " + (result.error || "Failed to accept ads"));
        }
      } else {
        setToast("Error: Failed to accept AI ads");
      }
    } catch (error) {
      console.error("AI ads acceptance error:", error);
      setToast("Error: " + error.message);
    }
  };

  // Use authenticated shop name from Shopify session
  React.useEffect(() => {
    setShopName(serverShopName); // Always use authenticated shop name
  }, [serverShopName]);

  // Handle action data from server with localStorage persistence
  React.useEffect(() => {
    if (actionData?.success) {
      setScriptCode(actionData.script);
      setShowScript(true);
      setToast(`Script generated: ${actionData.size}KB`);
      
      // Store in localStorage for persistence (client-side only)
      try {
        localStorage.setItem('adsautopilot_generated_script', actionData.script);
        localStorage.setItem('adsautopilot_script_meta', JSON.stringify({
          size: actionData.size,
          shopName: actionData.shopName,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('Failed to store script:', e);
      }
    } else if (actionData?.error) {
      setToast("Error: " + actionData.error);
    }
  }, [actionData]);

  // Load stored script on page load (client-side only)
  React.useEffect(() => {
    try {
      const storedScript = localStorage.getItem('adsautopilot_generated_script');
      const storedMeta = localStorage.getItem('adsautopilot_script_meta');
      if (storedScript && storedMeta) {
        const meta = JSON.parse(storedMeta);
        const hourAgo = Date.now() - (60 * 60 * 1000);
        if (meta.timestamp > hourAgo) {
          setScriptCode(storedScript);
          setShowScript(true);
          setToast(`Loaded ${meta.size}KB script`);
        } else {
          localStorage.removeItem('adsautopilot_generated_script');
          localStorage.removeItem('adsautopilot_script_meta');
        }
      }
    } catch (e) {
      console.warn('localStorage error:', e);
    }
  }, []);

  function run() {
    // Demo functionality - shows configuration
    const config = `Configuration:
Mode: ${mode}
Budget: $${budget}/day
CPC: $${cpc}
URL: ${url}
Shop: ${shopName || "unknown"}`;
    alert(
      `Autopilot would be enabled with:\n\n${config}\n\nIn production, this would start the automation.`,
    );
    setToast("Demo: Configuration shown (would enable in production)");
  }

  // Script generation now handled by server action - no client-side function needed

  return (
    <div>
      <h1>Autopilot</h1>

      {/* Campaign Limits Warning */}
      {campaignLimits && !campaignLimits.canCreate && (
        <div style={{ 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '6px', 
          padding: '16px', 
          margin: '16px 0',
          color: '#dc2626'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
            Campaign Limit Reached
          </h3>
          <p style={{ margin: '0 0 12px 0' }}>
            Your {campaignLimits.tier} plan allows up to {campaignLimits.limit} campaigns. 
            You currently have {campaignLimits.current} active campaigns.
          </p>
          <a 
            href={campaignLimits.upgradeUrl} 
            style={{ 
              backgroundColor: '#dc2626', 
              color: 'white', 
              padding: '8px 16px', 
              borderRadius: '4px', 
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            Upgrade Now
          </a>
        </div>
      )}

      {/* Campaign Usage Display for Users Near Limit */}
      {campaignLimits && campaignLimits.canCreate && campaignLimits.remaining <= 2 && campaignLimits.limit !== -1 && (
        <div style={{ 
          backgroundColor: '#fef3c7', 
          border: '1px solid #fcd34d', 
          borderRadius: '6px', 
          padding: '16px', 
          margin: '16px 0',
          color: '#d97706'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
            Campaign Usage Warning
          </h3>
          <p style={{ margin: '0 0 12px 0' }}>
            You are using {campaignLimits.current} of {campaignLimits.limit} campaigns in your {campaignLimits.tier} plan.
            {campaignLimits.remaining > 0 && ` You have ${campaignLimits.remaining} campaigns remaining.`}
          </p>
          <a 
            href={campaignLimits.upgradeUrl} 
            style={{ 
              backgroundColor: '#d97706', 
              color: 'white', 
              padding: '8px 16px', 
              borderRadius: '4px', 
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            Upgrade for More Campaigns
          </a>
        </div>
      )}

      {/* Shop automatically detected from Shopify authentication */}

      {/* Toggle between simple and advanced forms */}
      {toast && <p style={{ color: "#28a745", padding: "8px", background: "#d4edda", borderRadius: "4px" }}>{toast}</p>}

      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => setShowAdvancedForm(!showAdvancedForm)}
          style={{
            background: showAdvancedForm ? "#28a745" : "#007bff",
            color: "white",
            padding: "8px 16px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          {showAdvancedForm ? "Switch to Simple Mode" : "Switch to Advanced Setup"}
        </button>
      </div>

      {showAdvancedForm ? (
        <CampaignSetupForm
          shopName={shopName || serverShopName || ""}
          onGenerate={(config) => {
            // Convert advanced config to simple form values
            setBudget(config.dailyBudget.toString());
            setCpc(config.targetCPC.toString());
            setUrl(config.hasOffer ? config.offerText : url || "");

            // Map goal correctly
            let mappedMode = "protect";
            if (config.goal === "sales") mappedMode = "scale";
            else if (config.goal === "traffic") mappedMode = "grow";
            else if (config.goal === "leads") mappedMode = "protect";
            setMode(mappedMode);

            // Create and submit form programmatically
            const form = document.createElement("form");
            form.method = "POST";
            form.style.display = "none";

            const fields = {
              actionType: "generateScript",
              mode: mappedMode,
              budget: config.dailyBudget.toString(),
              cpc: config.targetCPC.toString(),
              url: url || "",
              advancedConfig: JSON.stringify(config)
            };

            Object.entries(fields).forEach(([name, value]) => {
              const input = document.createElement("input");
              input.type = "hidden";
              input.name = name;
              input.value = value;
              form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();
          }}
        />
      ) : (
        <>
          <section style={{ border: "1px solid #eee", padding: 12 }}>
            <h3>Goal</h3>
            <label>
              <input
                type="radio"
                name="goal"
                value="protect"
                checked={mode === "protect"}
                onChange={() => setMode("protect")}
              />{" "}
              Protect (Conservative)
            </label>
            <br />
            <label>
              <input
                type="radio"
                name="goal"
                value="grow"
                checked={mode === "grow"}
                onChange={() => setMode("grow")}
              />{" "}
              Grow (Balanced)
            </label>
            <br />
            <label>
              <input
                type="radio"
                name="goal"
                value="scale"
                checked={mode === "scale"}
                onChange={() => setMode("scale")}
              />{" "}
              Scale (Aggressive)
            </label>
          </section>
          <section style={{ border: "1px solid #eee", padding: 12 }}>
            <h3>Budget & CPC</h3>
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "14px", color: "#666" }}>Daily Budget</label>
                <input
                  type="number"
                  step="0.01"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="$ per day"
                  style={{ width: "100%", padding: "6px" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "14px", color: "#666" }}>Max CPC</label>
                <input
                  type="number"
                  step="0.01"
                  value={cpc}
                  onChange={(e) => setCpc(e.target.value)}
                  placeholder="Max CPC"
                  style={{ width: "100%", padding: "6px" }}
                />
              </div>
            </div>
          </section>
          <section style={{ border: "1px solid #eee", padding: 12 }}>
            <h3>Landing URL</h3>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              style={{ width: "100%", padding: "6px" }}
            />
          </section>
        </>
      )}
      <div
        style={{
          marginTop: 8,
          padding: 12,
          background: "#e7f3ff",
          borderRadius: 4,
          marginBottom: 16,
        }}
      >
        <h4 style={{ margin: "0 0 8px 0", color: "#0c5460" }}>
          Autopilot Status
        </h4>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              background: "#28a745",
              color: "white",
              padding: "4px 8px",
              borderRadius: "12px",
              fontSize: "12px",
            }}
          >
            ACTIVE
          </span>
          <span>
            Automation running for:{" "}
            <strong>{shopName || serverShopName || "Loading..."}</strong>
          </span>
        </div>
        <div style={{ fontSize: "14px", color: "#666" }}>
          Budget optimization: Active
          <br />
          AI analysis: Running every 15min
          <br />
          Performance monitoring: Continuous
          <br />Script updates: Available below
        </div>
      </div>

      {!showAdvancedForm && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Form method="post">
              <input type="hidden" name="actionType" value="generateScript" />
              <input type="hidden" name="mode" value={mode} />
              <input type="hidden" name="budget" value={budget} />
              <input type="hidden" name="cpc" value={cpc} />
              <input type="hidden" name="url" value={url} />
              <button
                type="submit"
                disabled={isGeneratingScript || (campaignLimits && !campaignLimits.canCreate)}
                style={{
                  background: (isGeneratingScript || (campaignLimits && !campaignLimits.canCreate)) ? "#6c757d" : "#007bff",
                  color: "white",
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: (isGeneratingScript || (campaignLimits && !campaignLimits.canCreate)) ? "not-allowed" : "pointer",
                  fontSize: "16px",
                }}
                title={campaignLimits && !campaignLimits.canCreate ? `Campaign limit reached. Upgrade your ${campaignLimits.tier} plan to create more campaigns.` : undefined}
              >
                {isGeneratingScript ? "Generating..." :
                 (campaignLimits && !campaignLimits.canCreate) ? "Campaign Limit Reached" :
                 "Generate Current Script"}
              </button>
            </Form>
            <button
              onClick={generateAIAds}
              disabled={isGeneratingAds || !shopName}
              style={{
                background: isGeneratingAds ? "#6c757d" : "#28a745",
                color: "white",
                padding: "12px 24px",
                border: "none",
                borderRadius: "4px",
                cursor: (isGeneratingAds || !shopName) ? "not-allowed" : "pointer",
                fontSize: "16px",
              }}
              title={!shopName ? "Shop name not available" : "Generate AI-powered ad content"}
            >
              {isGeneratingAds ? "Generating AI Ads..." : "Generate AI Ads"}
            </button>
            <button
              onClick={() => {
                setShowMLDashboard(!showMLDashboard);
                if (!showMLDashboard && !mlState) {
                  fetchMLState();
                }
              }}
              style={{
                background: "#6f42c1",
                color: "white",
                padding: "12px 24px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "16px",
              }}
              title="View ML Autopilot insights and controls"
            >
              {showMLDashboard ? "Hide ML Dashboard" : "Show ML Dashboard"}
            </button>
          </div>
        </div>
      )}
      {/* Temporarily show script directly from action data for testing */}
      {actionData?.success && (
        <div style={{ 
          background: "#d4edda", 
          border: "1px solid #c3e6cb", 
          padding: "12px", 
          marginTop: "12px",
          borderRadius: "4px"
        }}>
          <h3>Script Generated Successfully!</h3>
          <p>Size: {actionData.size}KB for shop: {actionData.shopName}</p>
          <details>
            <summary>View Script (Click to expand)</summary>
            <textarea
              readOnly
              value={actionData.script}
              style={{
                width: "100%",
                height: 300,
                fontFamily: "monospace",
                fontSize: "12px",
                marginTop: "8px"
              }}
            />
          </details>
        </div>
      )}
      {/* AI Generated Ads Display */}
      {showGeneratedAds && generatedAds && (
        <section style={{
          border: "1px solid #28a745",
          padding: 12,
          marginTop: 12,
          borderRadius: "4px",
          background: "#f8fff9"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}>
            <h3>AI Generated Ads</h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={acceptAIAds}
                style={{
                  background: "#28a745",
                  color: "white",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Accept & Apply
              </button>
              <button
                onClick={() => {
                  setShowGeneratedAds(false);
                  setGeneratedAds(null);
                  setToast("AI ads cleared");
                }}
                style={{
                  background: "#6c757d",
                  color: "white",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Reject
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <h4 style={{ margin: "0 0 8px 0", color: "#28a745" }}>Headlines ({generatedAds.headlines?.length || 0})</h4>
              <div style={{
                maxHeight: 200,
                overflowY: "auto",
                background: "white",
                border: "1px solid #ddd",
                borderRadius: "4px",
                padding: "8px"
              }}>
                {generatedAds.headlines?.map((headline, index) => (
                  <div key={index} style={{
                    padding: "4px 8px",
                    borderBottom: index < (generatedAds.headlines?.length || 0) - 1 ? "1px solid #eee" : "none",
                    fontSize: "14px"
                  }}>
                    {headline}
                  </div>
                )) || <p>No headlines generated</p>}
              </div>
            </div>

            <div>
              <h4 style={{ margin: "0 0 8px 0", color: "#28a745" }}>Descriptions ({generatedAds.descriptions?.length || 0})</h4>
              <div style={{
                maxHeight: 200,
                overflowY: "auto",
                background: "white",
                border: "1px solid #ddd",
                borderRadius: "4px",
                padding: "8px"
              }}>
                {generatedAds.descriptions?.map((description, index) => (
                  <div key={index} style={{
                    padding: "4px 8px",
                    borderBottom: index < (generatedAds.descriptions?.length || 0) - 1 ? "1px solid #eee" : "none",
                    fontSize: "14px"
                  }}>
                    {description}
                  </div>
                )) || <p>No descriptions generated</p>}
              </div>
            </div>
          </div>

          <div style={{ marginTop: "12px", padding: "8px", background: "#e6f7ff", borderRadius: "4px", fontSize: "12px", color: "#0c5460" }}>
            <strong>Preview:</strong> These AI-generated ads will be added to your asset library and can be used in your Google Ads campaigns.
            Click "Accept & Apply" to save them or "Reject" to generate new ones.
          </div>
        </section>
      )}

      {/* ML Autopilot Dashboard */}
      {showMLDashboard && (
        <ClientOnly>
          <MLAutopilotDashboard
            shopName={shopName || serverShopName || ""}
            mlState={mlState}
            onRefresh={fetchMLState}
          />
        </ClientOnly>
      )}

      {showScript && (
        <section
          style={{ border: "1px solid #eee", padding: 12, marginTop: 12 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <h3>
              Google Ads Script ({Math.round(scriptCode.length / 1024)}KB)
            </h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => {
                  navigator.clipboard
                    .writeText(scriptCode)
                    .then(() => {
                      setToast("Script copied to clipboard!");
                    })
                    .catch(() => {
                      setToast("Copy failed - select text manually");
                    });
                }}
                style={{
                  background: "#28a745",
                  color: "white",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Copy Script
              </button>
              <button
                onClick={() => {
                  setShowScript(false);
                  setScriptCode("");
                  try {
                    localStorage.removeItem('adsautopilot_generated_script');
                    localStorage.removeItem('adsautopilot_script_meta');
                  } catch (e) {
                    console.warn('Failed to clear localStorage:', e);
                  }
                  setToast("Script cleared");
                }}
                style={{
                  background: "#6c757d",
                  color: "white",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            </div>
          </div>
          <textarea
            readOnly
            value={scriptCode}
            style={{
              width: "100%",
              height: 300,
              fontFamily: "monospace",
              fontSize: "12px",
            }}
            placeholder="Script will appear here when loaded..."
          />
          <ol>
            <li>Google Ads → Tools → Bulk actions → Scripts → + New script</li>
            <li>Paste, Authorize, then Preview first</li>
            <li>If ok, Run once, then Schedule daily</li>
          </ol>
        </section>
      )}
    </div>
  );
}
