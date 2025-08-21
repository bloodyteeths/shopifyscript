import React, { useEffect, useState } from "react";
import {
  Card,
  Page,
  Layout,
  Button,
  Badge,
  Text,
  Stack,
  Banner,
  Spinner,
  Modal,
  DataTable,
} from "@shopify/polaris";
import AppShell from "../components/AppShell.jsx";

const PRICING_TIERS = [
  {
    id: "starter",
    name: "Starter",
    price: 29,
    description:
      "Perfect for small stores getting started with Google Ads automation",
    features: [
      'Instant "safe starter" Search campaigns',
      "Daily optimizer with budget caps",
      "Auto-block money-wasting queries",
      "Brand protection",
      "Pixel health check",
      "Weekly email summary",
      "Slack/email alerts",
      "Full audit trail",
      "Campaign exclusions",
    ],
    limits: {
      campaigns: 5,
      adGroups: 25,
      keywords: 500,
      monthlySpend: 5000,
    },
  },
  {
    id: "pro",
    name: "Pro",
    price: 99,
    description:
      "Advanced features for growing stores that want AI-powered optimization",
    features: [
      "Everything in Starter",
      "AI ad copywriter (RSA)",
      "RSA Test Queue with significance testing",
      "Keyword Promotions from search terms",
      "Phrase-level waste blocker",
      "Budget pacer with guardrails",
      "Sitelinks/Callouts/Snippets drafts",
      "AI landing page section drafts",
      "Plain-English change notes",
    ],
    limits: {
      campaigns: 20,
      adGroups: 100,
      keywords: 2000,
      monthlySpend: 25000,
    },
    popular: true,
  },
  {
    id: "growth",
    name: "Growth",
    price: 249,
    description:
      "Comprehensive tools for multi-store operations and team collaboration",
    features: [
      "Everything in Pro",
      "Asset Library with themed pools",
      "Geo & daypart optimization hints",
      "Promo page generator",
      "Brand/Non-brand mapping",
      "Pacer rules editor",
      "Multi-store support",
      "Team roles & advanced alerts",
      "Looker Studio template",
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
  {
    id: "enterprise",
    name: "Enterprise",
    price: 699,
    description: "Custom solutions for high-volume advertisers and agencies",
    features: [
      "Everything in Growth",
      "Custom rules & guardrails",
      "Server-side tagging consultation",
      "Private model prompts",
      "Onboarding/implementation help",
      "SSO & audit logs export",
      "SLA support",
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
];

export default function BillingPage() {
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadCurrentSubscription();
  }, []);

  async function loadCurrentSubscription() {
    try {
      setLoading(true);
      const response = await fetch(
        "/api/billing/shopify/subscription/" + window.location.hostname,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${await getAccessToken()}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setCurrentSubscription(data.subscription);
      } else {
        throw new Error("Failed to load subscription");
      }
    } catch (err) {
      console.error("Error loading subscription:", err);
      setError("Failed to load subscription information");
    } finally {
      setLoading(false);
    }
  }

  async function subscribe(tierIndex) {
    try {
      setActionLoading(true);
      setError("");

      const response = await fetch("/api/billing/shopify/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shop: window.location.hostname,
          accessToken: await getAccessToken(),
          tierIndex,
          returnUrl: window.location.origin + "/billing?success=true",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to Shopify billing confirmation
        window.top.location.href = data.confirmationUrl;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create subscription");
      }
    } catch (err) {
      console.error("Error creating subscription:", err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function changePlan(newTierIndex) {
    if (!currentSubscription) return;

    try {
      setActionLoading(true);
      setError("");

      const response = await fetch(
        `/api/billing/shopify/subscription/${currentSubscription.id}/change`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shop: window.location.hostname,
            accessToken: await getAccessToken(),
            newTierIndex,
            returnUrl: window.location.origin + "/billing?updated=true",
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        // Redirect to Shopify billing confirmation
        window.top.location.href = data.confirmationUrl;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to change subscription");
      }
    } catch (err) {
      console.error("Error changing subscription:", err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function cancelSubscription() {
    if (!currentSubscription) return;

    try {
      setActionLoading(true);
      setError("");

      const response = await fetch(
        `/api/billing/shopify/subscription/${currentSubscription.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shop: window.location.hostname,
            accessToken: await getAccessToken(),
          }),
        },
      );

      if (response.ok) {
        setSuccess("Subscription canceled successfully");
        setShowCancelModal(false);
        await loadCurrentSubscription();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel subscription");
      }
    } catch (err) {
      console.error("Error canceling subscription:", err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function getAccessToken() {
    // In a real Shopify app, you'd get this from your app's authentication
    // For now, we'll assume it's available in the session or environment
    return window.shopifyAccessToken || process.env.SHOPIFY_ACCESS_TOKEN;
  }

  function getCurrentTier() {
    if (!currentSubscription) return null;
    return PRICING_TIERS.find(
      (tier) => tier.price === parseFloat(currentSubscription.amount),
    );
  }

  function formatLimits(limits) {
    return Object.entries(limits).map(([key, value]) => [
      key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()),
      value === -1 ? "Unlimited" : value.toLocaleString(),
    ]);
  }

  if (loading) {
    return (
      <AppShell>
        <Page title="Billing">
          <Layout>
            <Layout.Section>
              <Card>
                <div style={{ padding: "2rem", textAlign: "center" }}>
                  <Spinner size="large" />
                  <Text as="p" variant="bodyMd">
                    Loading billing information...
                  </Text>
                </div>
              </Card>
            </Layout.Section>
          </Layout>
        </Page>
      </AppShell>
    );
  }

  const currentTier = getCurrentTier();

  return (
    <AppShell>
      <Page
        title="Billing & Subscription"
        subtitle="Manage your ProofKit subscription and billing preferences"
      >
        <Layout>
          {error && (
            <Layout.Section>
              <Banner status="critical" title="Error">
                <p>{error}</p>
              </Banner>
            </Layout.Section>
          )}

          {success && (
            <Layout.Section>
              <Banner status="success" title="Success">
                <p>{success}</p>
              </Banner>
            </Layout.Section>
          )}

          {currentSubscription && (
            <Layout.Section>
              <Card title="Current Subscription">
                <div style={{ padding: "1rem" }}>
                  <Stack distribution="equalSpacing" alignment="center">
                    <Stack vertical spacing="tight">
                      <Text as="h3" variant="headingMd">
                        {currentTier?.name || "Unknown Plan"}
                      </Text>
                      <Text as="p" variant="bodyMd" color="subdued">
                        ${currentSubscription.amount}/month
                      </Text>
                      <Badge
                        status={
                          currentSubscription.status === "ACTIVE"
                            ? "success"
                            : "critical"
                        }
                      >
                        {currentSubscription.status}
                      </Badge>
                    </Stack>
                    <Stack vertical spacing="tight">
                      <Text as="p" variant="bodyMd">
                        <strong>Next billing:</strong>{" "}
                        {new Date(
                          currentSubscription.currentPeriodEnd,
                        ).toLocaleDateString()}
                      </Text>
                      <Button
                        destructive
                        onClick={() => setShowCancelModal(true)}
                        loading={actionLoading}
                      >
                        Cancel Subscription
                      </Button>
                    </Stack>
                  </Stack>
                </div>
              </Card>
            </Layout.Section>
          )}

          <Layout.Section>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "1rem",
              }}
            >
              {PRICING_TIERS.map((tier, index) => {
                const isCurrentTier = currentTier?.id === tier.id;
                const isUpgrade =
                  currentTier &&
                  PRICING_TIERS.findIndex((t) => t.id === currentTier.id) <
                    index;
                const isDowngrade =
                  currentTier &&
                  PRICING_TIERS.findIndex((t) => t.id === currentTier.id) >
                    index;

                return (
                  <Card key={tier.id} title={tier.name}>
                    <div style={{ padding: "1rem" }}>
                      <Stack vertical spacing="loose">
                        <Stack distribution="equalSpacing" alignment="center">
                          <Text as="h2" variant="headingLg">
                            ${tier.price}
                          </Text>
                          {tier.popular && <Badge status="info">Popular</Badge>}
                          {isCurrentTier && (
                            <Badge status="success">Current Plan</Badge>
                          )}
                        </Stack>

                        <Text as="p" variant="bodyMd" color="subdued">
                          {tier.description}
                        </Text>

                        <div>
                          <Text as="h4" variant="headingXs">
                            Features:
                          </Text>
                          <ul
                            style={{ margin: "0.5rem 0", paddingLeft: "1rem" }}
                          >
                            {tier.features.slice(0, 5).map((feature, i) => (
                              <li key={i}>
                                <Text as="span" variant="bodySm">
                                  {feature}
                                </Text>
                              </li>
                            ))}
                            {tier.features.length > 5 && (
                              <li>
                                <Text as="span" variant="bodySm">
                                  + {tier.features.length - 5} more features
                                </Text>
                              </li>
                            )}
                          </ul>
                        </div>

                        <div>
                          <Text as="h4" variant="headingXs">
                            Limits:
                          </Text>
                          <DataTable
                            columnContentTypes={["text", "text"]}
                            headings={["Resource", "Limit"]}
                            rows={formatLimits(tier.limits).slice(0, 3)}
                          />
                        </div>

                        <div style={{ marginTop: "auto" }}>
                          {!currentSubscription && (
                            <Button
                              primary
                              fullWidth
                              onClick={() => subscribe(index)}
                              loading={actionLoading}
                            >
                              Subscribe to {tier.name}
                            </Button>
                          )}
                          {currentSubscription && !isCurrentTier && (
                            <Button
                              primary={isUpgrade}
                              outline={isDowngrade}
                              fullWidth
                              onClick={() => changePlan(index)}
                              loading={actionLoading}
                            >
                              {isUpgrade ? "Upgrade" : "Downgrade"} to{" "}
                              {tier.name}
                            </Button>
                          )}
                          {isCurrentTier && (
                            <Button fullWidth disabled>
                              Current Plan
                            </Button>
                          )}
                        </div>
                      </Stack>
                    </div>
                  </Card>
                );
              })}
            </div>
          </Layout.Section>
        </Layout>

        <Modal
          open={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          title="Cancel Subscription"
          primaryAction={{
            content: "Cancel Subscription",
            destructive: true,
            onAction: cancelSubscription,
            loading: actionLoading,
          }}
          secondaryActions={[
            {
              content: "Keep Subscription",
              onAction: () => setShowCancelModal(false),
            },
          ]}
        >
          <Modal.Section>
            <Text as="p" variant="bodyMd">
              Are you sure you want to cancel your subscription? You'll lose
              access to all premium features at the end of your current billing
              period.
            </Text>
          </Modal.Section>
        </Modal>
      </Page>
    </AppShell>
  );
}
