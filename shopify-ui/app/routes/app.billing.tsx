import React from "react";
import type { HeadersFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { authenticate } from "../shopify.server";

// Pricing tiers from backend billing service
const PRICING_TIERS = {
  STARTER: {
    id: "starter",
    name: "Starter",
    price: 29,
    features: [
      "Instant safe starter campaigns",
      "Daily optimizer with budget caps",
      "Auto-block money-wasting queries",
      "Brand protection",
      "Pixel health check (GA4 + Google Ads)",
      "Weekly email summary",
      "Slack/email alerts",
      "Full audit trail in Google Sheet",
      "Campaign/ad group exclusions"
    ],
    limits: {
      campaigns: 5,
      adGroups: 25,
      keywords: 500,
      monthlySpend: 5000,
    },
  },
  PRO: {
    id: "pro", 
    name: "Pro",
    price: 99,
    badge: "POPULAR",
    features: [
      "Everything in Starter, plus:",
      "AI ad copywriter (RSA) with 30/90 limits",
      "RSA Test Queue with significance testing",
      "Keyword Promotions (search terms to keywords)",
      "Phrase-level waste blocker (n-grams)",
      "Budget pacer with guardrails",
      "Sitelinks/Callouts/Snippets drafts",
      "AI landing page section drafts",
      "Plain-English change explanations"
    ],
    limits: {
      campaigns: 20,
      adGroups: 100,
      keywords: 2000,
      monthlySpend: 25000,
    },
  },
  GROWTH: {
    id: "growth",
    name: "Growth", 
    price: 249,
    features: [
      "Everything in Pro, plus:",
      "Asset Library (pooled headlines/descriptions)",
      "Geo & daypart optimization hints",
      "Promo page generator (AI landing pages)",
      "Brand/Non-brand mapping",
      "Pacer rules editor",
      "Multi-store support",
      "Team roles and advanced alerts",
      "Looker Studio template"
    ],
    limits: {
      campaigns: 50,
      adGroups: 250,
      keywords: 5000,
      monthlySpend: 100000,
      stores: 3,
      teamMembers: 5,
    },
  },
  ENTERPRISE: {
    id: "enterprise",
    name: "Enterprise",
    price: 699,
    features: [
      "Everything in Growth, plus:",
      "Custom rules & guardrails",
      "Server-side tagging consultation",
      "Private model prompts",
      "Onboarding/implementation help",
      "SSO and audit logs export",
      "SLA support"
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

    // Check current subscription status using Shopify Billing API
    let currentSubscription = null;
    let subscriptionStatus = "none";
    let currentTier = null;
    let trialEndsAt = null;
    
    try {
      // Query current app installation and active subscriptions
      const subscriptionsQuery = `
        query {
          currentAppInstallation {
            id
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
                  id
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

      const response = await admin.graphql(subscriptionsQuery);
      const data = await response.json();
      
      if (data.data?.currentAppInstallation?.activeSubscriptions?.length > 0) {
        currentSubscription = data.data.currentAppInstallation.activeSubscriptions[0];
        subscriptionStatus = currentSubscription.status.toLowerCase();
        
        // Determine tier based on price
        const amount = parseFloat(currentSubscription.lineItems[0]?.plan?.pricingDetails?.price?.amount || 0);
        currentTier = Object.values(PRICING_TIERS).find(tier => tier.price === amount)?.id || null;
        
        // Check if in trial period
        if (currentSubscription.trialDays > 0) {
          const createdAt = new Date(currentSubscription.createdAt);
          trialEndsAt = new Date(createdAt.getTime() + (currentSubscription.trialDays * 24 * 60 * 60 * 1000));
        }
      }
    } catch (error) {
      console.error("Error fetching subscription status:", error);
    }

    return json({
      shopName,
      currentSubscription,
      subscriptionStatus,
      currentTier,
      trialEndsAt,
      pricingTiers: PRICING_TIERS,
    });
  } catch (error) {
    console.error("Billing page loader error:", error);
    throw new Response("Authentication required", { status: 401 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session, admin } = await authenticate.admin(request);
    const shopName = session?.shop?.replace(".myshopify.com", "");
    
    if (!shopName) {
      return json({ success: false, error: "Authentication required" });
    }

    const formData = await request.formData();
    const actionType = formData.get("actionType");
    const tierId = formData.get("tierId");

    if (actionType === "subscribe" && tierId) {
      try {
        const tier = Object.values(PRICING_TIERS).find(t => t.id === tierId);
        if (!tier) {
          return json({ success: false, error: "Invalid pricing tier" });
        }

        // Create Shopify app subscription
        const subscriptionMutation = `
          mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $test: Boolean) {
            appSubscriptionCreate(name: $name, lineItems: $lineItems, returnUrl: $returnUrl, test: $test) {
              appSubscription {
                id
                name
                status
              }
              confirmationUrl
              userErrors {
                field
                message
              }
            }
          }
        `;

        const variables = {
          name: `ProofKit ${tier.name} Plan`,
          lineItems: [
            {
              plan: {
                appRecurringPricingDetails: {
                  price: {
                    amount: tier.price,
                    currencyCode: "USD",
                  },
                  interval: "EVERY_30_DAYS",
                },
              },
            },
          ],
          returnUrl: `${process.env.SHOPIFY_APP_URL}/app/billing?subscription=success`,
          test: process.env.SHOPIFY_BILLING_TEST === "true",
        };

        const response = await admin.graphql(subscriptionMutation, { variables });
        const result = await response.json();

        if (result.data?.appSubscriptionCreate?.userErrors?.length > 0) {
          return json({ 
            success: false, 
            error: result.data.appSubscriptionCreate.userErrors[0].message 
          });
        }

        if (result.data?.appSubscriptionCreate?.confirmationUrl) {
          return json({
            success: true,
            redirectUrl: result.data.appSubscriptionCreate.confirmationUrl,
            tier: tier.name,
          });
        }

        return json({ success: false, error: "Failed to create subscription" });
        
      } catch (error) {
        console.error("Subscription creation error:", error);
        return json({ success: false, error: "Subscription creation failed" });
      }
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
    currentSubscription, 
    subscriptionStatus, 
    currentTier, 
    trialEndsAt,
    pricingTiers 
  } = useLoaderData<typeof loader>();
  
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Handle redirect after successful subscription creation
  React.useEffect(() => {
    if (actionData?.success && actionData?.redirectUrl) {
      window.top?.location.assign(actionData.redirectUrl);
    }
  }, [actionData]);

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

  const renderCurrentPlan = () => {
    if (!currentTier || subscriptionStatus === "none") {
      return (
        <div style={{ 
          background: "#fff2cc", 
          border: "1px solid #ffc107", 
          padding: "16px", 
          borderRadius: "8px", 
          marginBottom: "24px" 
        }}>
          <h3 style={{ margin: "0 0 8px 0" }}>No Active Subscription</h3>
          <p style={{ margin: 0 }}>Choose a plan below to start using ProofKit's premium features.</p>
        </div>
      );
    }

    const tier = pricingTiers[currentTier.toUpperCase()];
    const isTrialing = trialEndsAt && new Date() < new Date(trialEndsAt);
    
    return (
      <div style={{ 
        background: isTrialing ? "#e3f2fd" : "#e8f5e8", 
        border: `1px solid ${isTrialing ? "#2196f3" : "#4caf50"}`, 
        padding: "16px", 
        borderRadius: "8px", 
        marginBottom: "24px" 
      }}>
        <h3 style={{ margin: "0 0 8px 0" }}>Current Plan: {tier?.name}</h3>
        <p style={{ margin: "0 0 8px 0" }}>${tier?.price}/month</p>
        {isTrialing && (
          <p style={{ margin: "0 0 8px 0" }}>
            Trial ends: {new Date(trialEndsAt).toLocaleDateString()}
          </p>
        )}
        <p style={{ margin: 0 }}>Status: {subscriptionStatus}</p>
      </div>
    );
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>Billing & Subscription</h1>
      <p style={{ color: "#666", marginBottom: "32px" }}>
        Manage your ProofKit subscription for {shopName}
      </p>

      {renderCurrentPlan()}
      
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
        <h2>Choose Your Plan</h2>
        <p style={{ color: "#666", marginBottom: "24px" }}>
          All plans include a 14-day free trial. Cancel anytime.
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

              <div>
                {currentTier === tier.id ? (
                  <button 
                    disabled 
                    style={{ 
                      width: "100%", 
                      padding: "12px", 
                      backgroundColor: "#e0e0e0", 
                      border: "none", 
                      borderRadius: "4px",
                      cursor: "not-allowed"
                    }}
                  >
                    Current Plan
                  </button>
                ) : (
                  <Form method="post">
                    <input type="hidden" name="actionType" value="subscribe" />
                    <input type="hidden" name="tierId" value={tier.id} />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{
                        width: "100%",
                        padding: "12px",
                        backgroundColor: tier.id === "pro" ? "#1976d2" : "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: isSubmitting ? "not-allowed" : "pointer",
                        fontSize: "16px"
                      }}
                    >
                      {isSubmitting ? "Processing..." : `${currentTier ? "Switch to" : "Start"} ${tier.name}`}
                    </button>
                  </Form>
                )}
              </div>
            </div>
          ))}
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