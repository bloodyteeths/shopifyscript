import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/node";
import {
  useLoaderData,
  useActionData,
  useSubmit,
  useNavigation,
} from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  InlineGrid,
  Text,
  Badge,
  Button,
  DataTable,
  Modal,
  TextField,
  Banner,
  Spinner,
  EmptyState,
  Divider,
  Box,
} from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import { authenticate } from "../shopify.server";
import { backendFetch } from "../server/hmac.server";
import { checkSubscriptionStatus } from "../utils/subscription.server";
import type { SubscriptionInfo } from "../utils/subscription.server";
import {
  CampaignCreationWizard,
  type CampaignConfig,
} from "../components/CampaignCreationWizard";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Campaign {
  id: string;
  name: string;
  status: string; // "ENABLED", "PAUSED", "REMOVED", "UNKNOWN"
  budget: number;
  clicks: number;
  impressions: number;
  cost: number;
  conversions: number;
  ctr: number;
}

interface Metrics {
  totalSpend: number;
  totalClicks: number;
  totalConversions: number;
  averageCtr: number;
  averageCpc: number;
}

interface LoaderData {
  shopName: string;
  connected: boolean;
  campaigns: Campaign[];
  metrics: Metrics;
  subscriptionInfo: SubscriptionInfo;
  connectionError: string | null;
}

interface ActionData {
  success: boolean;
  error?: string;
  campaignId?: string;
  intent?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtNum(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return "0";
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString("en-US");
}

function fmtCurrency(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

function fmtPct(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return "0.00%";
  return `${(val * 100).toFixed(2)}%`;
}

function statusBadge(status: string) {
  switch (status) {
    case "ENABLED":
      return <Badge tone="success">Enabled</Badge>;
    case "PAUSED":
      return <Badge tone="warning">Paused</Badge>;
    case "REMOVED":
      return <Badge tone="critical">Removed</Badge>;
    default:
      return <Badge>Unknown</Badge>;
  }
}

/* ------------------------------------------------------------------ */
/*  Loader                                                             */
/* ------------------------------------------------------------------ */

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { admin, session } = await authenticate.admin(request);
    const shopName = session?.shop?.replace(".myshopify.com", "");

    if (!shopName) {
      throw new Error("Unable to determine shop name from Shopify session");
    }

    // Check subscription status
    const subscriptionInfo = await checkSubscriptionStatus(admin);

    // Check Google Ads connection status
    let connected = false;
    let connectionError: string | null = null;

    try {
      const statusRes = await backendFetch(
        "/google-ads/connection-status",
        "GET",
        undefined,
        shopName,
      );

      if (statusRes.status >= 200 && statusRes.status < 300 && statusRes.json) {
        connected = !!statusRes.json.connected;
      } else {
        connectionError =
          statusRes.json?.error ||
          `Connection check returned ${statusRes.status}`;
      }
    } catch (err) {
      console.error("Failed to check Google Ads connection status:", err);
      connectionError = "Unable to check Google Ads connection status.";
    }

    // If connected, fetch campaigns and metrics in parallel
    let campaigns: Campaign[] = [];
    let metrics: Metrics = {
      totalSpend: 0,
      totalClicks: 0,
      totalConversions: 0,
      averageCtr: 0,
      averageCpc: 0,
    };

    if (connected) {
      const [campaignsRes, metricsRes] = await Promise.all([
        backendFetch("/google-ads/campaigns", "GET", undefined, shopName).catch(
          (err) => {
            console.error("Failed to fetch campaigns:", err);
            return { status: 500, json: { campaigns: [] } };
          },
        ),
        backendFetch(
          "/google-ads/metrics?dateRange=LAST_30_DAYS",
          "GET",
          undefined,
          shopName,
        ).catch((err) => {
          console.error("Failed to fetch metrics:", err);
          return { status: 500, json: {} };
        }),
      ]);

      if (
        campaignsRes.status >= 200 &&
        campaignsRes.status < 300 &&
        campaignsRes.json
      ) {
        const raw = campaignsRes.json.campaigns || campaignsRes.json || [];
        campaigns = Array.isArray(raw) ? raw : [];
      }

      if (
        metricsRes.status >= 200 &&
        metricsRes.status < 300 &&
        metricsRes.json
      ) {
        // Backend returns { ok, metrics: { totals: { cost, clicks, ... } } }
        const totals = metricsRes.json.metrics?.totals || metricsRes.json.totals || {};
        metrics = {
          totalSpend: totals.cost ?? 0,
          totalClicks: totals.clicks ?? 0,
          totalConversions: totals.conversions ?? 0,
          averageCtr: totals.ctr ?? 0,
          averageCpc: totals.cpc ?? 0,
        };
      }
    }

    return json<LoaderData>({
      shopName,
      connected,
      campaigns,
      metrics,
      subscriptionInfo,
      connectionError,
    });
  } catch (authError) {
    console.error("Campaigns authentication error:", authError);
    const url = new URL(request.url);
    const shop =
      url.searchParams.get("shop") || url.searchParams.get("host");
    const authUrl = shop ? `/auth/login?shop=${shop}` : "/auth/login";
    throw new Response(null, {
      status: 302,
      headers: { Location: authUrl },
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Action                                                             */
/* ------------------------------------------------------------------ */

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    const shopName = session?.shop?.replace(".myshopify.com", "");

    if (!shopName) {
      return json<ActionData>({
        success: false,
        error: "Authentication required",
      });
    }

    const formData = await request.formData();
    const intent = formData.get("intent") as string;

    /* ---------- create ---------- */
    if (intent === "create") {
      const name = formData.get("name") as string;
      const dailyBudget = formData.get("dailyBudget") as string;
      const keywords = formData.get("keywords") as string;
      const landingUrl = formData.get("landingUrl") as string;
      const biddingStrategy = formData.get("biddingStrategy") as string;
      const headlinesRaw = formData.get("headlines") as string;
      const descriptionsRaw = formData.get("descriptions") as string;
      const negativeKeywords = formData.get("negativeKeywords") as string;

      if (!name || !dailyBudget) {
        return json<ActionData>({
          success: false,
          error: "Campaign name and daily budget are required.",
          intent,
        });
      }

      try {
        const res = await backendFetch(
          "/google-ads/campaigns/create",
          "POST",
          {
            name,
            dailyBudget: parseFloat(dailyBudget),
            biddingStrategy: biddingStrategy || undefined,
            keywords: keywords
              ? keywords.split(",").map((k: string) => k.trim())
              : [],
            negativeKeywords: negativeKeywords
              ? negativeKeywords.split(",").map((k: string) => k.trim())
              : [],
            websiteUrl: landingUrl || undefined,
            headlines: headlinesRaw ? JSON.parse(headlinesRaw) : [],
            descriptions: descriptionsRaw ? JSON.parse(descriptionsRaw) : [],
            nonce: Date.now(),
          },
          shopName,
        );

        if (res.status >= 200 && res.status < 300 && res.json) {
          return json<ActionData>({
            success: true,
            campaignId: res.json.campaignId || res.json.campaign_id,
            intent,
          });
        }

        return json<ActionData>({
          success: false,
          error:
            res.json?.error || `Campaign creation failed (${res.status})`,
          intent,
        });
      } catch (err) {
        console.error("Failed to create campaign:", err);
        return json<ActionData>({
          success: false,
          error: "Unable to create campaign. Please try again.",
          intent,
        });
      }
    }

    /* ---------- pause ---------- */
    if (intent === "pause") {
      const campaignId = formData.get("campaignId") as string;

      if (!campaignId) {
        return json<ActionData>({
          success: false,
          error: "Campaign ID is required.",
          intent,
        });
      }

      try {
        const res = await backendFetch(
          `/google-ads/campaigns/${campaignId}/pause`,
          "POST",
          { nonce: Date.now() },
          shopName,
        );

        if (res.status >= 200 && res.status < 300) {
          return json<ActionData>({ success: true, intent });
        }

        return json<ActionData>({
          success: false,
          error: res.json?.error || `Pause failed (${res.status})`,
          intent,
        });
      } catch (err) {
        console.error("Failed to pause campaign:", err);
        return json<ActionData>({
          success: false,
          error: "Unable to pause campaign. Please try again.",
          intent,
        });
      }
    }

    /* ---------- enable ---------- */
    if (intent === "enable") {
      const campaignId = formData.get("campaignId") as string;

      if (!campaignId) {
        return json<ActionData>({
          success: false,
          error: "Campaign ID is required.",
          intent,
        });
      }

      try {
        const res = await backendFetch(
          `/google-ads/campaigns/${campaignId}/enable`,
          "POST",
          { nonce: Date.now() },
          shopName,
        );

        if (res.status >= 200 && res.status < 300) {
          return json<ActionData>({ success: true, intent });
        }

        return json<ActionData>({
          success: false,
          error: res.json?.error || `Enable failed (${res.status})`,
          intent,
        });
      } catch (err) {
        console.error("Failed to enable campaign:", err);
        return json<ActionData>({
          success: false,
          error: "Unable to enable campaign. Please try again.",
          intent,
        });
      }
    }

    /* ---------- budget ---------- */
    if (intent === "budget") {
      const campaignId = formData.get("campaignId") as string;
      const dailyBudget = formData.get("dailyBudget") as string;

      if (!campaignId || !dailyBudget) {
        return json<ActionData>({
          success: false,
          error: "Campaign ID and daily budget are required.",
          intent,
        });
      }

      try {
        const res = await backendFetch(
          `/google-ads/campaigns/${campaignId}/budget`,
          "POST",
          { dailyBudget: parseFloat(dailyBudget), nonce: Date.now() },
          shopName,
        );

        if (res.status >= 200 && res.status < 300) {
          return json<ActionData>({ success: true, intent });
        }

        return json<ActionData>({
          success: false,
          error: res.json?.error || `Budget update failed (${res.status})`,
          intent,
        });
      } catch (err) {
        console.error("Failed to update budget:", err);
        return json<ActionData>({
          success: false,
          error: "Unable to update budget. Please try again.",
          intent,
        });
      }
    }

    return json<ActionData>({
      success: false,
      error: "Unknown action",
    });
  } catch (authError) {
    console.error("Campaigns action authentication failed:", authError);
    return json<ActionData>({
      success: false,
      error: "Authentication failed - please reload the page",
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Campaigns() {
  const {
    connected,
    campaigns,
    metrics,
    connectionError,
  } = useLoaderData<typeof loader>() as LoaderData;
  const actionData = useActionData<typeof action>() as ActionData | undefined;
  const submit = useSubmit();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

  /* ----- wizard state ----- */
  const [wizardOpen, setWizardOpen] = useState(false);

  /* ----- edit budget modal state ----- */
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [editBudgetCampaignId, setEditBudgetCampaignId] = useState("");
  const [editBudgetCampaignName, setEditBudgetCampaignName] = useState("");
  const [editBudgetValue, setEditBudgetValue] = useState("");

  /* ----- banner state ----- */
  const [banner, setBanner] = useState<{
    tone: "success" | "critical";
    message: string;
  } | null>(null);

  /* ----- react to action responses ----- */
  useEffect(() => {
    if (!actionData) return;

    if (actionData.success) {
      const messages: Record<string, string> = {
        create: "Campaign created successfully.",
        pause: "Campaign paused.",
        enable: "Campaign enabled.",
        budget: "Budget updated successfully.",
      };
      setBanner({
        tone: "success",
        message:
          messages[actionData.intent || ""] || "Action completed successfully.",
      });
      setWizardOpen(false);
      setBudgetModalOpen(false);
    } else if (actionData.error) {
      setBanner({ tone: "critical", message: actionData.error });
    }
  }, [actionData]);

  /* ----- handlers ----- */
  const handleWizardSubmit = useCallback(
    (config: CampaignConfig) => {
      const fd = new FormData();
      fd.set("intent", "create");
      fd.set("name", config.name);
      fd.set("dailyBudget", String(config.dailyBudget));
      fd.set("keywords", config.keywords.join(","));
      fd.set("landingUrl", config.websiteUrl);
      fd.set("biddingStrategy", config.biddingStrategy);
      if (config.headlines.length > 0) {
        fd.set("headlines", JSON.stringify(config.headlines));
      }
      if (config.descriptions.length > 0) {
        fd.set("descriptions", JSON.stringify(config.descriptions));
      }
      if (config.negativeKeywords.length > 0) {
        fd.set("negativeKeywords", config.negativeKeywords.join(","));
      }
      submit(fd, { method: "post" });
    },
    [submit],
  );

  const handlePause = useCallback(
    (campaignId: string) => {
      const fd = new FormData();
      fd.set("intent", "pause");
      fd.set("campaignId", campaignId);
      submit(fd, { method: "post" });
    },
    [submit],
  );

  const handleEnable = useCallback(
    (campaignId: string) => {
      const fd = new FormData();
      fd.set("intent", "enable");
      fd.set("campaignId", campaignId);
      submit(fd, { method: "post" });
    },
    [submit],
  );

  const handleUpdateBudget = useCallback(() => {
    const fd = new FormData();
    fd.set("intent", "budget");
    fd.set("campaignId", editBudgetCampaignId);
    fd.set("dailyBudget", editBudgetValue);
    submit(fd, { method: "post" });
  }, [submit, editBudgetCampaignId, editBudgetValue]);

  const openBudgetModal = useCallback(
    (campaignId: string, campaignName: string, currentBudget: number) => {
      setEditBudgetCampaignId(campaignId);
      setEditBudgetCampaignName(campaignName);
      setEditBudgetValue(currentBudget.toFixed(2));
      setBudgetModalOpen(true);
    },
    [],
  );

  /* ================================================================ */
  /*  Not connected state                                              */
  /* ================================================================ */

  if (!connected) {
    return (
      <Page title="Campaigns">
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              {connectionError && (
                <Banner tone="warning" onDismiss={() => {}}>
                  <p>{connectionError}</p>
                </Banner>
              )}

              <Banner
                title="Google Ads account not connected"
                tone="warning"
                action={{
                  content: "Connect Google Ads",
                  url: "/app/connect-google",
                }}
              >
                <p>
                  Connect your Google Ads account to create and manage campaigns
                  directly from Shopify. You will be able to launch campaigns,
                  monitor performance, and adjust budgets without leaving your
                  store admin.
                </p>
              </Banner>

              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    What you can do with Campaigns
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Once connected, you can create Google Ads search campaigns,
                    pause or enable them, adjust daily budgets, and track
                    performance metrics including clicks, conversions, CTR, and
                    cost -- all from this page.
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  /* ================================================================ */
  /*  Connected state                                                  */
  /* ================================================================ */

  /* ----- DataTable rows ----- */
  const campaignRows = campaigns.map((c) => [
    c.name,
    statusBadge(c.status),
    fmtCurrency(c.budget),
    fmtNum(c.clicks),
    fmtNum(c.impressions),
    fmtCurrency(c.cost),
    fmtNum(c.conversions),
    fmtPct(c.ctr),
    <InlineStack gap="200" key={c.id}>
      {c.status === "ENABLED" ? (
        <Button
          size="slim"
          onClick={() => handlePause(c.id)}
          disabled={isSubmitting}
        >
          Pause
        </Button>
      ) : c.status === "PAUSED" ? (
        <Button
          size="slim"
          variant="primary"
          onClick={() => handleEnable(c.id)}
          disabled={isSubmitting}
        >
          Enable
        </Button>
      ) : null}
      {c.status !== "REMOVED" && (
        <Button
          size="slim"
          onClick={() => openBudgetModal(c.id, c.name, c.budget)}
          disabled={isSubmitting}
        >
          Edit Budget
        </Button>
      )}
    </InlineStack>,
  ]);

  return (
    <Page
      title="Campaigns"
      primaryAction={
        <Button
          variant="primary"
          onClick={() => setWizardOpen(true)}
          disabled={isSubmitting}
        >
          Create Campaign
        </Button>
      }
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Banners */}
            {banner && (
              <Banner tone={banner.tone} onDismiss={() => setBanner(null)}>
                <p>{banner.message}</p>
              </Banner>
            )}

            {isSubmitting && (
              <InlineStack gap="200" blockAlign="center">
                <Spinner size="small" />
                <Text as="span" variant="bodyMd">
                  Processing...
                </Text>
              </InlineStack>
            )}

            {/* ---- Performance Summary ---- */}
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Performance Summary (Last 30 Days)
              </Text>
              <InlineGrid columns={5} gap="400">
                <Card>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm" tone="subdued">
                      Total Spend
                    </Text>
                    <Text as="p" variant="headingLg">
                      {fmtCurrency(metrics.totalSpend)}
                    </Text>
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm" tone="subdued">
                      Total Clicks
                    </Text>
                    <Text as="p" variant="headingLg">
                      {fmtNum(metrics.totalClicks)}
                    </Text>
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm" tone="subdued">
                      Total Conversions
                    </Text>
                    <Text as="p" variant="headingLg">
                      {fmtNum(metrics.totalConversions)}
                    </Text>
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm" tone="subdued">
                      Avg CTR
                    </Text>
                    <Text as="p" variant="headingLg">
                      {fmtPct(metrics.averageCtr)}
                    </Text>
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm" tone="subdued">
                      Avg CPC
                    </Text>
                    <Text as="p" variant="headingLg">
                      {fmtCurrency(metrics.averageCpc)}
                    </Text>
                  </BlockStack>
                </Card>
              </InlineGrid>
            </BlockStack>

            <Divider />

            {/* ---- Campaign DataTable ---- */}
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  Campaigns ({campaigns.length})
                </Text>
              </InlineStack>

              {campaigns.length === 0 ? (
                <Card>
                  <EmptyState
                    heading="No campaigns yet"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    action={{
                      content: "Create Your First Campaign",
                      onAction: () => setWizardOpen(true),
                    }}
                  >
                    <p>
                      Create your first Google Ads campaign to start driving
                      traffic to your store.
                    </p>
                  </EmptyState>
                </Card>
              ) : (
                <Card padding="0">
                  <DataTable
                    columnContentTypes={[
                      "text",
                      "text",
                      "numeric",
                      "numeric",
                      "numeric",
                      "numeric",
                      "numeric",
                      "numeric",
                      "text",
                    ]}
                    headings={[
                      "Name",
                      "Status",
                      "Daily Budget",
                      "Clicks",
                      "Impressions",
                      "Cost",
                      "Conversions",
                      "CTR",
                      "Actions",
                    ]}
                    rows={campaignRows}
                    footerContent={`Showing ${campaigns.length} campaign${campaigns.length !== 1 ? "s" : ""}`}
                  />
                </Card>
              )}
            </BlockStack>
          </BlockStack>
        </Layout.Section>
      </Layout>

      {/* ---- Campaign Creation Wizard ---- */}
      <CampaignCreationWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSubmit={handleWizardSubmit}
        isSubmitting={isSubmitting}
      />

      {/* ---- Edit Budget Modal ---- */}
      <Modal
        open={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        title={`Update Budget: ${editBudgetCampaignName}`}
        primaryAction={{
          content: "Update Budget",
          onAction: handleUpdateBudget,
          loading: isSubmitting,
          disabled: !editBudgetValue || parseFloat(editBudgetValue) < 1,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setBudgetModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="p" variant="bodyMd">
              Set a new daily budget for{" "}
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                {editBudgetCampaignName}
              </Text>
              . Changes take effect immediately.
            </Text>
            <TextField
              label="New Daily Budget"
              type="number"
              value={editBudgetValue}
              onChange={setEditBudgetValue}
              autoComplete="off"
              min={1}
              prefix="$"
              helpText="The maximum amount you want to spend per day on this campaign."
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
