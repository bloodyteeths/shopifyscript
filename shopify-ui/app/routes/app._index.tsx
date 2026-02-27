import React from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  InlineGrid,
  Badge,
  Banner,
  Button,
  DataTable,
  Divider,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import {
  checkSubscriptionStatus,
  type SubscriptionInfo,
} from "../utils/subscription.server";
import { backendFetch } from "../server/hmac.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session, admin } = await authenticate.admin(request);
    const shopName = session?.shop?.replace(".myshopify.com", "");

    if (!shopName) {
      throw new Error("Unable to determine shop name from Shopify session");
    }

    // Check for post-subscription redirect
    const url = new URL(request.url);
    const chargeId = url.searchParams.get("charge_id");
    const isPostSubscription = !!chargeId;

    // Check subscription status
    let subscriptionInfo: SubscriptionInfo = {
      hasActivePayment: false,
      isInTrial: false,
      trialDaysRemaining: null,
      subscriptionTier: null,
      subscriptionStatus: "checking",
      subscriptionId: null,
      currentPeriodEnd: null,
      needsSubscription: true,
    };

    try {
      subscriptionInfo = await checkSubscriptionStatus(admin);

      // Sync tier with backend (non-blocking)
      if (session?.accessToken && shopName) {
        backendFetch(
          "/billing/shopify/sync-tier",
          "POST",
          {
            shop: session.shop,
            accessToken: session.accessToken,
          },
          shopName,
        ).catch(() => {});
      }
    } catch {
      // Allow access if subscription check fails
    }

    const appHandle =
      process.env.SHOPIFY_APP_HANDLE || "adsautopilot-autopilot";
    const planSelectionUrl = `https://admin.shopify.com/store/${shopName}/charges/${appHandle}/pricing_plans`;

    // Fetch Google Ads data
    let googleAds: {
      connected: boolean;
      connectionStatus: Record<string, unknown> | null;
      metrics: Record<string, number> | null;
      campaigns: Array<Record<string, unknown>>;
    } = {
      connected: false,
      connectionStatus: null,
      metrics: null,
      campaigns: [],
    };

    try {
      const connRes = await backendFetch(
        "/google-ads/connection-status",
        "GET",
        undefined,
        shopName,
      );

      const connJson = connRes.json;
      const isConnected =
        connRes.status === 200 && connJson?.ok && connJson?.connected === true;

      googleAds.connected = isConnected;
      googleAds.connectionStatus = connJson;

      if (isConnected) {
        const [metricsRes, campaignsRes] = await Promise.all([
          backendFetch(
            "/google-ads/metrics?dateRange=LAST_30_DAYS",
            "GET",
            undefined,
            shopName,
          ),
          backendFetch("/google-ads/campaigns", "GET", undefined, shopName),
        ]);

        if (metricsRes.status === 200 && metricsRes.json?.ok) {
          // Backend returns { metrics: { totals: {...}, byCampaign, byDate } }
          const metricsData = metricsRes.json.metrics;
          googleAds.metrics = metricsData?.totals || metricsData || null;
        }

        if (campaignsRes.status === 200 && campaignsRes.json?.ok) {
          googleAds.campaigns = campaignsRes.json.campaigns || [];
        }
      }
    } catch {
      // Non-blocking
    }

    return json({
      shopName,
      subscriptionInfo,
      planSelectionUrl,
      googleAds,
    });
  } catch {
    throw new Response(null, {
      status: 302,
      headers: { Location: "/auth/login" },
    });
  }
};

// -- Helpers ------------------------------------------------------------------

function fmtNum(val: number | null | undefined): string {
  if (val == null) return "--";
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString();
}

function fmtCurrency(val: number | null | undefined): string {
  if (val == null) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

function fmtPct(val: number | null | undefined): string {
  if (val == null) return "--";
  return `${val.toFixed(2)}%`;
}

function fmtRoas(val: number | null | undefined): string {
  if (val == null) return "--";
  return `${val.toFixed(2)}x`;
}

function statusBadge(status: string) {
  if (status === "ENABLED") return <Badge tone="success">Active</Badge>;
  if (status === "PAUSED") return <Badge tone="warning">Paused</Badge>;
  if (status === "REMOVED") return <Badge tone="critical">Removed</Badge>;
  return <Badge>{status || "Unknown"}</Badge>;
}

// -- Component ----------------------------------------------------------------

export default function Dashboard() {
  const { shopName, subscriptionInfo, planSelectionUrl, googleAds } =
    useLoaderData<typeof loader>();

  const metrics = googleAds?.metrics;
  const campaigns = googleAds?.campaigns || [];
  const connected = googleAds?.connected;

  return (
    <Page title="Dashboard">
      <BlockStack gap="400">
        {/* Subscription Banner */}
        {subscriptionInfo?.needsSubscription && (
          <Banner
            title="Start Your 14-Day Free Trial"
            tone="warning"
            action={{
              content: "Choose a Plan",
              url: planSelectionUrl,
              target: "_top",
            }}
          >
            <p>
              Get AI-powered Google Ads optimization for your store. No credit
              card required.
            </p>
          </Banner>
        )}

        {subscriptionInfo?.isInTrial && (
          <Banner title="Free Trial Active" tone="info">
            <p>
              {subscriptionInfo.subscriptionTier?.toUpperCase()} plan —{" "}
              {subscriptionInfo.trialDaysRemaining} days remaining
            </p>
          </Banner>
        )}

        {/* Google Ads Connection */}
        {!connected && (
          <Banner
            title="Connect Your Google Ads Account"
            tone="warning"
            action={{
              content: "Connect Google Ads",
              url: "/app/connect-google",
            }}
          >
            <p>
              Link your Google Ads account to see performance data and enable AI
              optimization.
            </p>
          </Banner>
        )}

        {connected && (
          <Banner
            title="Google Ads Connected"
            tone="success"
            action={{
              content: "Manage",
              url: "/app/connect-google",
            }}
          >
            <p>
              Account{" "}
              {String(googleAds?.connectionStatus?.customerId ||
                googleAds?.connectionStatus?.customer_id ||
                "")}{" "}
              is linked and syncing data.
            </p>
          </Banner>
        )}

        {/* KPI Cards */}
        {connected && (
          <InlineGrid columns={{ xs: 2, sm: 2, md: 4 }} gap="400">
            <KpiCard
              label="Ad Spend"
              value={fmtCurrency(metrics?.cost)}
              sub="Last 30 days"
            />
            <KpiCard
              label="Clicks"
              value={fmtNum(metrics?.clicks)}
              sub={`CTR ${fmtPct(metrics?.ctr)}`}
            />
            <KpiCard
              label="Conversions"
              value={fmtNum(metrics?.conversions)}
              sub="Last 30 days"
              highlight
            />
            <KpiCard
              label="ROAS"
              value={fmtRoas(metrics?.roas)}
              sub="Return on ad spend"
              highlight
            />
          </InlineGrid>
        )}

        {/* Main Content */}
        <Layout>
          {/* Top Campaigns */}
          <Layout.Section>
            {connected && campaigns.length > 0 ? (
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Top Campaigns
                    </Text>
                    <Button url="/app/campaigns" variant="plain">
                      View all ({String(campaigns.length)})
                    </Button>
                  </InlineStack>
                  <DataTable
                    columnContentTypes={[
                      "text",
                      "text",
                      "numeric",
                      "numeric",
                      "numeric",
                    ]}
                    headings={[
                      "Campaign",
                      "Status",
                      "Spend",
                      "Clicks",
                      "Conv.",
                    ]}
                    rows={campaigns.slice(0, 5).map((c: any) => [
                      c.name || "Unnamed",
                      statusBadge(c.status),
                      fmtCurrency(c.cost),
                      fmtNum(c.clicks),
                      fmtNum(c.conversions),
                    ])}
                  />
                </BlockStack>
              </Card>
            ) : connected ? (
              <Card>
                <BlockStack gap="300" inlineAlign="center">
                  <Text as="p" variant="bodyMd" tone="subdued">
                    No campaigns found. Create your first campaign to get
                    started.
                  </Text>
                  <Button url="/app/campaigns" variant="primary">
                    Create Campaign
                  </Button>
                </BlockStack>
              </Card>
            ) : (
              <Card>
                <BlockStack gap="300" inlineAlign="center">
                  <Text as="h2" variant="headingMd">
                    Get Started
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Connect your Google Ads account to see campaign performance,
                    generate AI ad copy, and enable autopilot optimization.
                  </Text>
                  <Button url="/app/connect-google" variant="primary">
                    Connect Google Ads
                  </Button>
                </BlockStack>
              </Card>
            )}
          </Layout.Section>

          {/* Sidebar */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              {/* Quick Actions */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Quick Actions
                  </Text>
                  <Button
                    url="/app/campaigns"
                    variant="primary"
                    fullWidth
                    disabled={!connected}
                  >
                    Create Campaign
                  </Button>
                  <Button
                    url="/app/ai-tools"
                    fullWidth
                    disabled={!connected}
                  >
                    Generate Ad Copy
                  </Button>
                  <Button url="/app/settings" fullWidth>
                    Configure Autopilot
                  </Button>
                </BlockStack>
              </Card>

              {/* Plan Info */}
              {subscriptionInfo?.subscriptionTier && (
                <Card>
                  <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        Your Plan
                      </Text>
                      <Badge
                        tone={
                          subscriptionInfo.subscriptionTier === "enterprise"
                            ? "info"
                            : subscriptionInfo.subscriptionTier ===
                                "professional"
                              ? "success"
                              : undefined
                        }
                      >
                        {subscriptionInfo.subscriptionTier.toUpperCase()}
                      </Badge>
                    </InlineStack>
                    <Divider />
                    <Text as="p" variant="bodySm" tone="subdued">
                      {subscriptionInfo.subscriptionTier === "starter" &&
                        "5 campaigns, 7-day data retention"}
                      {subscriptionInfo.subscriptionTier === "professional" &&
                        "25 campaigns, 30-day data retention"}
                      {subscriptionInfo.subscriptionTier === "enterprise" &&
                        "Unlimited campaigns, 90-day data retention"}
                    </Text>
                    <Button url="/app/settings" variant="plain" fullWidth>
                      Manage Subscription
                    </Button>
                  </BlockStack>
                </Card>
              )}
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

// -- KPI Card -----------------------------------------------------------------

function KpiCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <Card>
      <BlockStack gap="100">
        <Text as="p" variant="bodySm" tone="subdued">
          {label}
        </Text>
        <Text
          as="p"
          variant="headingLg"
          fontWeight="bold"
          tone={highlight ? "success" : undefined}
        >
          {value}
        </Text>
        <Text as="p" variant="bodySm" tone="subdued">
          {sub}
        </Text>
      </BlockStack>
    </Card>
  );
}
