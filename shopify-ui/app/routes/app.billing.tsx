import React from "react";
import type { HeadersFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { authenticate } from "../shopify.server";

// Pricing tiers matching Partner Dashboard configuration
const PRICING_TIERS = {
  STARTER: {
    id: "starter",
    name: "Starter",
    price: 29,
    features: [
      "AI campaign optimization",
      "Basic performance analytics", 
      "Up to 5 campaigns",
      "Email support",
      "7-day data retention",
      "Basic ROAS tracking",
      "Campaign monitoring",
      "Monthly insights reports"
    ],
    limits: {
      campaigns: 5,
      adGroups: 25,
      keywords: 500,
      monthlySpend: 5000,
    },
  },
  PROFESSIONAL: {
    id: "professional", 
    name: "Professional",
    price: 79,
    badge: "POPULAR",
    features: [
      "Everything in Starter, plus:",
      "Advanced AI optimization",
      "Real-time performance analytics",
      "Up to 25 campaigns",
      "Priority email support", 
      "30-day data retention",
      "Advanced ROAS analytics",
      "Automated bid management",
      "Weekly insights reports"
    ],
    limits: {
      campaigns: 25,
      adGroups: 100,
      keywords: 2000,
      monthlySpend: 25000,
    },
  },
  ENTERPRISE: {
    id: "enterprise",
    name: "Enterprise",
    price: 199,
    features: [
      "Everything in Professional, plus:",
      "Custom AI optimization rules",
      "Advanced performance analytics",
      "Unlimited campaigns",
      "Priority support with SLA",
      "90-day data retention",
      "Custom ROAS tracking",
      "Advanced automation features",
      "Custom reporting"
    ],
    limits: {
      campaigns: "Unlimited",
      adGroups: "Unlimited", 
      keywords: "Unlimited",
      monthlySpend: "Unlimited",
      stores: "Unlimited",
      teamMembers: "Unlimited",
    },
  },
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const shopName = session?.shop?.replace(".myshopify.com", "");

    if (!shopName) {
      throw new Error("Unable to determine shop name from Shopify session");
    }

    // For managed pricing apps, we'll show the billing page without checking subscription status
    // The actual subscription enforcement will happen in the backend middleware
    console.log(`Billing page loaded for shop: ${shopName}`);

    return json({
      shopName,
      pricingTiers: PRICING_TIERS,
      appHandle: process.env.SHOPIFY_APP_HANDLE || "proofkit-autopilot",
      managedPricingUrl: `shopify://admin/charges/${process.env.SHOPIFY_APP_HANDLE || "proofkit-autopilot"}/pricing_plans`
    });
  } catch (error) {
    console.error("Billing page loader error:", error);
    throw new Response("Authentication required", { status: 401 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const shopName = session?.shop?.replace(".myshopify.com", "");
    
    if (!shopName) {
      return json({ success: false, error: "Authentication required" });
    }

    const formData = await request.formData();
    const actionType = formData.get("actionType");

    if (actionType === "redirect_to_plans") {
      // For managed pricing apps, redirect to Shopify's hosted plan selection page
      const appHandle = process.env.SHOPIFY_APP_HANDLE || "proofkit-autopilot";
      
      return json({
        success: true,
        redirectUrl: `shopify://admin/charges/${appHandle}/pricing_plans`,
        target: "_top" // Required for external redirect
      });
    }

    return json({ success: false, error: "Invalid action" });
  } catch (error) {
    console.error("Billing action error:", error);
    return json({ success: false, error: "Authentication required" });
  }
};

export default function Billing() {
  const { 
    shopName,
    pricingTiers,
    appHandle,
    managedPricingUrl
  } = useLoaderData<typeof loader>();
  
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Handle redirect to managed pricing page
  React.useEffect(() => {
    if (actionData?.success && actionData?.redirectUrl) {
      window.top?.location.assign(actionData.redirectUrl);
    }
  }, [actionData]);

  // Redirect to Shopify's managed pricing page
  const redirectToManagedPricing = () => {
    console.log('Redirecting to managed pricing:', managedPricingUrl);
    window.top?.location.assign(managedPricingUrl);
  };

  const formatPrice = (price: number | string) => {
    if (price === "Unlimited") return price;
    return typeof price === 'number' ? `$${price.toLocaleString()}` : price;
  };

  const renderFeatureList = (features: string[]) => (
    <ul style={{ margin: 0, paddingLeft: '20px' }}>
      {features.map((feature, index) => (
        <li key={index} style={{ marginBottom: '8px', fontSize: '14px' }}>
          ✓ {feature}
        </li>
      ))}
    </ul>
  );

  const renderManagedPricingInfo = () => {
    return (
      <div style={{ 
        background: "#e3f2fd", 
        border: "1px solid #2196f3", 
        padding: "24px", 
        borderRadius: "8px", 
        marginBottom: "32px",
        textAlign: "center"
      }}>
        <h3 style={{ margin: "0 0 16px 0" }}>Subscription Management</h3>
        <p style={{ margin: "0 0 20px 0", fontSize: "16px" }}>
          ProofKit uses Shopify's secure managed pricing system.
          <br />
          View and manage your subscription through Shopify's billing dashboard.
        </p>
        <button
          onClick={redirectToManagedPricing}
          style={{
            padding: "16px 32px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "18px",
            fontWeight: "bold"
          }}
        >
          View Plans & Manage Subscription
        </button>
      </div>
    );
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>Billing & Subscription</h1>
      <p style={{ color: "#666", marginBottom: "32px" }}>
        Manage your ProofKit subscription for {shopName}
      </p>

      {renderManagedPricingInfo()}
      
      {actionData?.error && (
        <div style={{ 
          background: "#ffebee", 
          border: "1px solid #f44336", 
          padding: "16px", 
          borderRadius: "8px", 
          marginBottom: "24px" 
        }}>
          <p style={{ margin: 0, color: "#d32f2f" }}>{actionData.error}</p>
        </div>
      )}

      <div style={{ marginBottom: "32px" }}>
        <h2>Available Plans</h2>
        <p style={{ color: "#666", marginBottom: "24px" }}>
          All plans include a 14-day free trial. Pricing and subscriptions are managed by Shopify.
        </p>
        
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
          gap: "20px" 
        }}>
          {Object.values(pricingTiers).map((tier) => (
            <div key={tier.id} style={{ 
              border: "1px solid #e0e0e0", 
              borderRadius: "8px", 
              padding: "24px",
              backgroundColor: "white"
            }}>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h3 style={{ margin: 0 }}>{tier.name}</h3>
                  {tier.badge && (
                    <span style={{ 
                      background: "#4caf50", 
                      color: "white", 
                      padding: "4px 8px", 
                      borderRadius: "12px", 
                      fontSize: "12px" 
                    }}>
                      {tier.badge}
                    </span>
                  )}
                </div>
                
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <span style={{ fontSize: "32px", fontWeight: "bold" }}>${tier.price}</span>
                  <span style={{ color: "#666" }}>/month</span>
                </div>
              </div>

              <hr style={{ border: "none", borderTop: "1px solid #e0e0e0", margin: "16px 0" }} />

              <div style={{ marginBottom: "16px" }}>
                <h4 style={{ margin: "0 0 12px 0" }}>Features:</h4>
                {renderFeatureList(tier.features.slice(0, 5))}
                {tier.features.length > 5 && (
                  <p style={{ color: "#666", fontSize: "14px", margin: "8px 0 0 0" }}>
                    + {tier.features.length - 5} more features
                  </p>
                )}
              </div>

              <hr style={{ border: "none", borderTop: "1px solid #e0e0e0", margin: "16px 0" }} />

              <div style={{ marginBottom: "24px" }}>
                <h4 style={{ margin: "0 0 12px 0" }}>Limits:</h4>
                <ul style={{ margin: 0, paddingLeft: "20px" }}>
                  <li>Campaigns: {tier.limits.campaigns}</li>
                  <li>Ad Groups: {tier.limits.adGroups}</li>
                  <li>Keywords: {tier.limits.keywords}</li>
                  <li>Monthly Spend: {formatPrice(tier.limits.monthlySpend)}</li>
                </ul>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ 
          textAlign: "center", 
          marginTop: "24px", 
          padding: "20px", 
          backgroundColor: "#f8f9fa", 
          borderRadius: "8px" 
        }}>
          <p style={{ margin: "0 0 16px 0", fontSize: "16px" }}>
            Ready to select your plan?
          </p>
          <button
            onClick={redirectToManagedPricing}
            style={{
              padding: "16px 32px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "18px",
              fontWeight: "bold"
            }}
          >
            View Plans & Subscribe
          </button>
        </div>
      </div>

      <div style={{ 
        border: "1px solid #e0e0e0", 
        borderRadius: "8px", 
        padding: "24px",
        backgroundColor: "white"
      }}>
        <h3>Billing Information</h3>
        
        <ul style={{ paddingLeft: "20px" }}>
          <li>All subscriptions are managed through Shopify</li>
          <li>Charges appear on your Shopify Partner account</li>
          <li>Cancel or modify anytime through your Partner Dashboard</li>
          <li>14-day free trial on all plans</li>
        </ul>
        
        {currentSubscription && (
          <div style={{ marginTop: "16px", padding: "16px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
            <h4>Current Subscription Details:</h4>
            <p>Subscription ID: {currentSubscription.id}</p>
            <p>Next billing: {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export const ErrorBoundary = boundary.error;
export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};