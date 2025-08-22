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

export async function loader({ request }: LoaderFunctionArgs) {
  // Standard Shopify authentication following best practices
  const { session } = await authenticate.admin(request);

  const shopName = session?.shop?.replace(".myshopify.com", "");

  if (!shopName) {
    throw new Error("Unable to determine shop name from Shopify session");
  }

  console.log(`🤖 Autopilot loaded for shop: ${shopName}`);

  // Return minimal config for client
  const config = {
    backendUrl:
      process.env.BACKEND_PUBLIC_URL ||
      "https://shopifyscript-backend.vercel.app/api",
    shopName,
  };

  return json({ config });
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    // Get authenticated shop name from Shopify session
    const { session } = await authenticate.admin(request);
    const currentShopName = session?.shop?.replace(".myshopify.com", "");

    if (!currentShopName) {
      console.error("❌ No shop name found in Shopify session");
      return json({ success: false, error: "Authentication required" });
    }

    const formData = await request.formData();
    const actionType = formData.get("actionType");

    if (actionType === "generateScript") {
      console.log(`🔄 Server action generating script for shop: ${currentShopName}`);

      const mode = formData.get("mode") || "protect";
      const budget = formData.get("budget") || "3.00";
      const cpc = formData.get("cpc") || "0.20";
      const url = formData.get("url") || "";

      try {
        // Fetch the real script using authenticated backend call
        const realScript = await backendFetchText(
          "/ads-script/raw",
          "GET",
          undefined,
          currentShopName,
        );

        console.log(
          `📊 Script fetch result for ${currentShopName}: length=${realScript?.length || 0}, isHTML=${realScript?.includes("<html") || false}`,
        );

        if (
          realScript &&
          realScript.length > 1000 &&
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
          console.log(
            `❌ Script validation failed for ${currentShopName}: length=${realScript?.length || 0}, hasHTML=${realScript?.includes("<html") || false}`,
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
          `❌ Action script fetch failed for ${currentShopName}:`,
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
    console.error("❌ Autopilot action authentication failed:", authError);
    return json({ 
      success: false, 
      error: "Authentication failed - please reload the page" 
    });
  }
}

export default function Autopilot() {
  const { config } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [mode, setMode] = React.useState("protect");
  const [budget, setBudget] = React.useState("3.00");
  const [cpc, setCpc] = React.useState("0.20");
  const [url, setUrl] = React.useState("");
  const [showSetupBanner, setShowSetupBanner] = React.useState(false);

  const [toast, setToast] = React.useState("");
  const [scriptCode, setScriptCode] = React.useState("");
  const [showScript, setShowScript] = React.useState(false);
  const [shopName, setShopName] = React.useState<string | null>(null);
  
  const isGeneratingScript = navigation.state === "submitting" && 
    navigation.formData?.get("actionType") === "generateScript";

  // Load shop name from localStorage on client side
  React.useEffect(() => {
    const userShopName = getShopNameOrNull();
    setShopName(userShopName);
    setShowSetupBanner(isShopSetupNeeded()); // Use proper setup check
  }, []);

  const handleSetupComplete = (newShopName: string) => {
    setShopName(newShopName);
    setShowSetupBanner(false);
    dismissShopSetupForSession(); // Prevent re-showing this session
    setToast(`Shop configured: ${newShopName}.myshopify.com`);
  };

  // Handle action data from server
  React.useEffect(() => {
    if (actionData) {
      if (actionData.success) {
        setScriptCode(actionData.script);
        setShowScript(true);
        setToast(
          `Complete ${actionData.size}KB script generated for ${actionData.shopName}`,
        );
      } else {
        setToast("Error: " + actionData.error);
        console.error("Script generation error:", actionData);
      }
    }
  }, [actionData]);

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
      <h1>🤖 Autopilot</h1>

      {/* Shop Setup Banner - fallback if setup is needed */}
      {showSetupBanner && (
        <ShopSetupBanner
          onSetupComplete={handleSetupComplete}
          showOnlyIfNeeded={true}
        />
      )}

      {/* Shop Configuration removed - shop name is now automatically detected */}

      {/* Connect Sheets section removed - using automated multi-tenant Google Sheets */}
      {toast && <p>{toast}</p>}
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
          Protect
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
          Grow
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
          Scale
        </label>
      </section>
      <section style={{ border: "1px solid #eee", padding: 12 }}>
        <h3>Budget & CPC</h3>
        <input
          type="number"
          step="0.01"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="$ per day"
        />
        <input
          type="number"
          step="0.01"
          value={cpc}
          onChange={(e) => setCpc(e.target.value)}
          placeholder="Max CPC"
        />
      </section>
      <section style={{ border: "1px solid #eee", padding: 12 }}>
        <h3>Landing URL</h3>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          style={{ width: "100%" }}
        />
      </section>
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
          🤖 Autopilot Status
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
            ✅ ALWAYS ON
          </span>
          <span>
            Automation running for:{" "}
            <strong>{shopName || "Please configure shop"}</strong>
          </span>
        </div>
        <div style={{ fontSize: "14px", color: "#666" }}>
          • Budget optimization: Active
          <br />
          • AI analysis: Running every 15min
          <br />
          • Performance monitoring: Continuous
          <br />• Script updates: Available below
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <Form method="post">
          <input type="hidden" name="actionType" value="generateScript" />
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="budget" value={budget} />
          <input type="hidden" name="cpc" value={cpc} />
          <input type="hidden" name="url" value={url} />
          <button
            type="submit"
            disabled={isGeneratingScript}
            style={{
              background: isGeneratingScript ? "#6c757d" : "#007bff",
              color: "white",
              padding: "12px 24px",
              border: "none",
              borderRadius: "4px",
              cursor: isGeneratingScript ? "not-allowed" : "pointer",
              fontSize: "16px",
            }}
          >
            {isGeneratingScript ? "🔄 Generating..." : "🔄 Generate Current Script"}
          </button>
        </Form>
      </div>
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
              📋 Copy Script
            </button>
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
