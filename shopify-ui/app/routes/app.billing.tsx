import React from "react";
import type { HeadersFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import {
  Card,
  Layout,
  Page,
  Text,
  Button,
  Badge,
  Stack,
  Banner,
  List,
  Divider,
  ButtonGroup,
  Icon,
} from "@shopify/polaris";
import { CreditCardMajor, CheckMajor, XSmallMinor } from "@shopify/polaris-icons";

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
    <List>
      {features.map((feature, index) => (
        <List.Item key={index}>
          <Stack spacing="tight" alignment="leading">
            <Icon source={CheckMajor} color="success" />
            <Text variant="bodyMd">{feature}</Text>
          </Stack>
        </List.Item>
      ))}
    </List>
  );

  const renderCurrentPlan = () => {
    if (!currentTier || subscriptionStatus === "none") {
      return (
        <Banner status="warning">
          <Text variant="headingMd">No Active Subscription</Text>
          <Text>Choose a plan below to start using ProofKit's premium features.</Text>
        </Banner>
      );
    }

    const tier = pricingTiers[currentTier.toUpperCase()];
    const isTrialing = trialEndsAt && new Date() < new Date(trialEndsAt);
    
    return (
      <Banner status={isTrialing ? "info" : "success"}>
        <Stack spacing="tight">
          <Stack spacing="none" alignment="leading">
            <Text variant="headingMd">Current Plan: {tier?.name}</Text>
            <Text>${tier?.price}/month</Text>
          </Stack>
          {isTrialing && (
            <Text>
              Trial ends: {new Date(trialEndsAt).toLocaleDateString()}
            </Text>
          )}
          <Text>Status: {subscriptionStatus}</Text>
        </Stack>
      </Banner>
    );
  };

  return (
    <Page
      title="Billing & Subscription"
      subtitle={`Manage your ProofKit subscription for ${shopName}`}
    >
      <Layout>
        <Layout.Section>
          {renderCurrentPlan()}
          
          {actionData?.error && (
            <Banner status="critical">
              <Text>{actionData.error}</Text>
            </Banner>
          )}
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Stack spacing="loose">
              <Text variant="headingLg">Choose Your Plan</Text>
              <Text variant="bodyMd" color="subdued">
                All plans include a 14-day free trial. Cancel anytime.
              </Text>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
                {Object.values(pricingTiers).map((tier) => (
                  <Card key={tier.id} sectioned>
                    <Stack spacing="loose">
                      <Stack spacing="tight">
                        <Stack alignment="center" distribution="equalSpacing">
                          <Text variant="headingMd">{tier.name}</Text>
                          {tier.badge && (
                            <Badge status="success">{tier.badge}</Badge>
                          )}
                        </Stack>
                        
                        <Stack alignment="baseline" spacing="tight">
                          <Text variant="headingLg">${tier.price}</Text>
                          <Text variant="bodyMd" color="subdued">/month</Text>
                        </Stack>
                      </Stack>

                      <Divider />

                      <Stack spacing="tight">
                        <Text variant="headingSm">Features:</Text>
                        {renderFeatureList(tier.features.slice(0, 5))}
                        {tier.features.length > 5 && (
                          <Text variant="bodyMd" color="subdued">
                            + {tier.features.length - 5} more features
                          </Text>
                        )}
                      </Stack>

                      <Divider />

                      <Stack spacing="tight">
                        <Text variant="headingSm">Limits:</Text>
                        <List>
                          <List.Item>Campaigns: {tier.limits.campaigns}</List.Item>
                          <List.Item>Ad Groups: {tier.limits.adGroups}</List.Item>
                          <List.Item>Keywords: {tier.limits.keywords}</List.Item>
                          <List.Item>Monthly Spend: {formatPrice(tier.limits.monthlySpend)}</List.Item>
                        </List>
                      </Stack>

                      <div style={{ marginTop: "auto" }}>
                        {currentTier === tier.id ? (
                          <Button disabled fullWidth>
                            Current Plan
                          </Button>
                        ) : (
                          <Form method="post">
                            <input type="hidden" name="actionType" value="subscribe" />
                            <input type="hidden" name="tierId" value={tier.id} />
                            <Button
                              submit
                              primary={tier.id === "pro"}
                              loading={isSubmitting}
                              disabled={isSubmitting}
                              fullWidth
                            >
                              {currentTier ? "Switch to" : "Start"} {tier.name}
                            </Button>
                          </Form>
                        )}
                      </div>
                    </Stack>
                  </Card>
                ))}
              </div>
            </Stack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card sectioned>
            <Stack spacing="loose">
              <Text variant="headingMd">Billing Information</Text>
              
              <Stack spacing="tight">
                <Text variant="bodyMd">
                  • All subscriptions are managed through Shopify
                </Text>
                <Text variant="bodyMd">
                  • Charges appear on your Shopify Partner account
                </Text>
                <Text variant="bodyMd">
                  • Cancel or modify anytime through your Partner Dashboard
                </Text>
                <Text variant="bodyMd">
                  • 14-day free trial on all plans
                </Text>
              </Stack>
              
              {currentSubscription && (
                <Stack spacing="tight">
                  <Text variant="headingSm">Current Subscription Details:</Text>
                  <Text variant="bodyMd">
                    Subscription ID: {currentSubscription.id}
                  </Text>
                  <Text variant="bodyMd">
                    Next billing: {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}
                  </Text>
                </Stack>
              )}
            </Stack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export const ErrorBoundary = boundary.error;
export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};