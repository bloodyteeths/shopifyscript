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
    const { session, admin } = await authenticate.admin(request);
    const shopName = session?.shop?.replace(".myshopify.com", "");

    if (!shopName) {
      throw new Error("Unable to determine shop name from Shopify session");
    }

    console.log(`Checking subscription status for shop: ${shopName}`);

    // Query current app installation and active subscriptions using 2024-10 API
    let hasActivePayment = false;
    let currentSubscription = null;
    let subscriptionTier = null;
    let trialDaysRemaining = null;
    let isInTrial = false;

    try {
      const subscriptionQuery = `
        query GetCurrentAppSubscription {
          currentAppInstallation {
            activeSubscriptions {
              id
              name
              status
              createdAt
              currentPeriodEnd
              trialDays
              test
              lineItems {
                id
                plan {
                  pricingDetails {
                    ... on AppRecurringPricing {
                      price {
                        amount
                        currencyCode
                      }
                      interval
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await admin.graphql(subscriptionQuery);
      const result = await response.json();

      console.log('Subscription query result:', JSON.stringify(result, null, 2));

      if (result.data?.currentAppInstallation?.activeSubscriptions?.length > 0) {
        currentSubscription = result.data.currentAppInstallation.activeSubscriptions[0];
        hasActivePayment = currentSubscription.status === 'ACTIVE';
        
        // Determine tier based on price amount
        const priceAmount = parseFloat(currentSubscription.lineItems[0]?.plan?.pricingDetails?.price?.amount || 0);
        
        if (priceAmount === 29) subscriptionTier = 'starter';
        else if (priceAmount === 79) subscriptionTier = 'professional';  
        else if (priceAmount === 199) subscriptionTier = 'enterprise';
        
        // Calculate trial status
        if (currentSubscription.trialDays > 0) {
          const createdAt = new Date(currentSubscription.createdAt);
          const trialEndDate = new Date(createdAt.getTime() + (currentSubscription.trialDays * 24 * 60 * 60 * 1000));
          const now = new Date();
          
          isInTrial = now < trialEndDate;
          trialDaysRemaining = isInTrial ? Math.ceil((trialEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : 0;
        }
        
        console.log(`✅ Subscription found: tier=${subscriptionTier}, status=${currentSubscription.status}, trial=${isInTrial}, daysLeft=${trialDaysRemaining}`);
      } else {
        console.log(`❌ No active subscription found for shop: ${shopName}`);
      }

    } catch (error) {
      console.error("Error fetching subscription status:", error);
    }

    return json({
      shopName,
      hasActivePayment,
      currentSubscription,
      subscriptionTier,
      isInTrial,
      trialDaysRemaining,
      pricingTiers: PRICING_TIERS,
      appHandle: process.env.SHOPIFY_APP_HANDLE || "proofkit-autopilot",
      shouldRedirectToPlans: !hasActivePayment && !isInTrial
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
    hasActivePayment,
    currentSubscription,
    subscriptionTier,
    isInTrial,
    trialDaysRemaining,
    pricingTiers,
    appHandle,
    shouldRedirectToPlans
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
    console.log('Redirecting to managed pricing');
    console.log('App handle:', appHandle);
    console.log('Shop name:', shopName);
    
    // Use the session shop domain from loader (more reliable)
    const shopDomain = `${shopName}.myshopify.com`;
    const pricingPath = `/admin/charges/${appHandle}/pricing_plans`;
    const fullUrl = `https://${shopDomain}${pricingPath}`;
    
    console.log('Full pricing URL:', fullUrl);
    
    // Simple approach: open in new tab (most reliable)
    try {
      window.open(fullUrl, '_blank');
      console.log('✅ Opened pricing page in new tab');
    } catch (error) {
      console.error('❌ Failed to open pricing page:', error);
      
      // Show instructions to user
      alert(`Please visit your Shopify admin and go to:\nSettings → Billing → Apps → ProofKit\n\nOr visit: ${fullUrl}`);
    }
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

  const renderSubscriptionStatus = () => {
    // No subscription at all
    if (!hasActivePayment && !isInTrial) {
      return (
        <div style={{ 
          background: "#fff2cc", 
          border: "1px solid #ffc107", 
          padding: "24px", 
          borderRadius: "8px", 
          marginBottom: "32px",
          textAlign: "center"
        }}>
          <h3 style={{ margin: "0 0 16px 0" }}>Choose Your Plan</h3>
          <p style={{ margin: "0 0 20px 0", fontSize: "16px" }}>
            Start your 14-day free trial to access ProofKit's powerful features.
          </p>
          <button
            onClick={redirectToManagedPricing}
            style={{
              padding: "16px 32px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "18px",
              fontWeight: "bold"
            }}
          >
            Start Free Trial
          </button>
        </div>
      );
    }

    // In trial period
    if (isInTrial) {
      const tier = subscriptionTier ? pricingTiers[subscriptionTier.toUpperCase()] : null;
      return (
        <div style={{ 
          background: "#e8f5e8", 
          border: "1px solid #4caf50", 
          padding: "24px", 
          borderRadius: "8px", 
          marginBottom: "32px"
        }}>
          <h3 style={{ margin: "0 0 16px 0" }}>🎉 Free Trial Active</h3>
          <div style={{ marginBottom: "16px" }}>
            <p style={{ margin: "0 0 8px 0", fontSize: "16px" }}>
              <strong>Current Plan:</strong> {tier?.name || 'Unknown'} (${tier?.price}/month)
            </p>
            <p style={{ margin: "0 0 8px 0", fontSize: "16px" }}>
              <strong>Trial Days Remaining:</strong> {trialDaysRemaining} days
            </p>
            <p style={{ margin: "0", fontSize: "14px", color: "#666" }}>
              Trial ends: {new Date(new Date(currentSubscription.createdAt).getTime() + (currentSubscription.trialDays * 24 * 60 * 60 * 1000)).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={redirectToManagedPricing}
            style={{
              padding: "12px 24px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            Manage Subscription
          </button>
        </div>
      );
    }

    // Active paid subscription
    if (hasActivePayment) {
      const tier = subscriptionTier ? pricingTiers[subscriptionTier.toUpperCase()] : null;
      return (
        <div style={{ 
          background: "#e8f5e8", 
          border: "1px solid #4caf50", 
          padding: "24px", 
          borderRadius: "8px", 
          marginBottom: "32px"
        }}>
          <h3 style={{ margin: "0 0 16px 0" }}>✅ Active Subscription</h3>
          <div style={{ marginBottom: "16px" }}>
            <p style={{ margin: "0 0 8px 0", fontSize: "16px" }}>
              <strong>Current Plan:</strong> {tier?.name || 'Unknown'} (${tier?.price}/month)
            </p>
            <p style={{ margin: "0 0 8px 0", fontSize: "16px" }}>
              <strong>Status:</strong> {currentSubscription.status}
            </p>
            <p style={{ margin: "0", fontSize: "14px", color: "#666" }}>
              Next billing: {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={redirectToManagedPricing}
            style={{
              padding: "12px 24px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            Change Plan
          </button>
        </div>
      );
    }

    // Fallback
    return (
      <div style={{ 
        background: "#f8f9fa", 
        border: "1px solid #dee2e6", 
        padding: "24px", 
        borderRadius: "8px", 
        marginBottom: "32px",
        textAlign: "center"
      }}>
        <h3 style={{ margin: "0 0 16px 0" }}>Subscription Status Unknown</h3>
        <button
          onClick={redirectToManagedPricing}
          style={{
            padding: "16px 32px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px"
          }}
        >
          Check Subscription Status
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

      {renderSubscriptionStatus()}
      
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

        {/* Debug information */}
        <div style={{ marginTop: "16px", padding: "16px", backgroundColor: "#f0f0f0", borderRadius: "4px", fontSize: "12px" }}>
          <h4>Debug Info:</h4>
          <p>App Handle: {appHandle}</p>
          <p>Shop: {shopName}</p>
          <p>Has Active Payment: {hasActivePayment ? 'Yes' : 'No'}</p>
          <p>Subscription Tier: {subscriptionTier || 'None'}</p>
          <p>In Trial: {isInTrial ? 'Yes' : 'No'}</p>
          <p>Trial Days Remaining: {trialDaysRemaining || 'N/A'}</p>
          <p>Should Redirect to Plans: {shouldRedirectToPlans ? 'Yes' : 'No'}</p>
          {currentSubscription && (
            <p>Subscription ID: {currentSubscription.id}</p>
          )}
        </div>
        
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