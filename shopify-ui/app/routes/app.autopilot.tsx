import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useActionData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  Text,
  Button,
  Banner,
  InlineStack,
  Badge,
  Box,
  DataTable,
  Tabs,
  Spinner,
  Modal,
  TextField,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { backendFetch } from "../server/hmac.server";
import { useState, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Campaign {
  id: string;
  name: string;
  status: number; // 2=ENABLED, 3=PAUSED, 4=REMOVED
  dailyBudget: number;
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
  connectionError: string | null;
}

interface ActionData {
  success: boolean;
  error?: string;
  campaignId?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const STATUS_LABELS: Record<number, string> = {
  2: "Enabled",
  3: "Paused",
  4: "Removed",
};

function statusBadge(status: number) {
  switch (status) {
    case 2:
      return <Badge tone="success">Enabled</Badge>;
    case 3:
      return <Badge tone="attention">Paused</Badge>;
    case 4:
      return <Badge tone="critical">Removed</Badge>;
    default:
      return <Badge>Unknown</Badge>;
  }
}

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/* ------------------------------------------------------------------ */
/*  Loader                                                             */
/* ------------------------------------------------------------------ */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    const shopName = session?.shop?.replace(".myshopify.com", "");

    if (!shopName) {
      throw new Error("Unable to determine shop name from Shopify session");
    }

    // 1. Check Google Ads connection status
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
          statusRes.json?.error || `Connection check returned ${statusRes.status}`;
      }
    } catch (err) {
      console.error("Failed to check Google Ads connection status:", err);
      connectionError = "Unable to check Google Ads connection status.";
    }

    // 2. If connected, fetch campaigns and metrics in parallel
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
        backendFetch("/google-ads/metrics", "GET", undefined, shopName).catch(
          (err) => {
            console.error("Failed to fetch metrics:", err);
            return { status: 500, json: {} };
          },
        ),
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
        metrics = {
          totalSpend: metricsRes.json.totalSpend ?? metricsRes.json.total_spend ?? 0,
          totalClicks: metricsRes.json.totalClicks ?? metricsRes.json.total_clicks ?? 0,
          totalConversions:
            metricsRes.json.totalConversions ?? metricsRes.json.total_conversions ?? 0,
          averageCtr: metricsRes.json.averageCtr ?? metricsRes.json.average_ctr ?? 0,
          averageCpc: metricsRes.json.averageCpc ?? metricsRes.json.average_cpc ?? 0,
        };
      }
    }

    return json<LoaderData>({
      shopName,
      connected,
      campaigns,
      metrics,
      connectionError,
    });
  } catch (authError) {
    console.error("Autopilot authentication error:", authError);
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop") || url.searchParams.get("host");
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
      return json<ActionData>({ success: false, error: "Authentication required" });
    }

    const formData = await request.formData();
    const intent = formData.get("intent") as string;

    /* ---------- create-campaign ---------- */
    if (intent === "create-campaign") {
      const campaignName = formData.get("campaignName") as string;
      const dailyBudget = formData.get("dailyBudget") as string;
      const targetCpc = formData.get("targetCpc") as string;
      const keywords = formData.get("keywords") as string;
      const landingUrl = formData.get("landingUrl") as string;

      if (!campaignName || !dailyBudget) {
        return json<ActionData>({
          success: false,
          error: "Campaign name and daily budget are required.",
        });
      }

      try {
        const res = await backendFetch(
          "/google-ads/campaigns/create",
          "POST",
          {
            campaignName,
            dailyBudget: parseFloat(dailyBudget),
            targetCpc: targetCpc ? parseFloat(targetCpc) : undefined,
            keywords: keywords
              ? keywords.split(",").map((k: string) => k.trim())
              : [],
            landingUrl: landingUrl || undefined,
            nonce: Date.now(),
          },
          shopName,
        );

        if (res.status >= 200 && res.status < 300 && res.json) {
          return json<ActionData>({
            success: true,
            campaignId: res.json.campaignId || res.json.campaign_id,
          });
        }

        return json<ActionData>({
          success: false,
          error: res.json?.error || `Campaign creation failed (${res.status})`,
        });
      } catch (err) {
        console.error("Failed to create campaign:", err);
        return json<ActionData>({
          success: false,
          error: "Unable to create campaign. Please try again.",
        });
      }
    }

    /* ---------- pause-campaign ---------- */
    if (intent === "pause-campaign") {
      const campaignId = formData.get("campaignId") as string;

      if (!campaignId) {
        return json<ActionData>({ success: false, error: "Campaign ID is required." });
      }

      try {
        const res = await backendFetch(
          `/google-ads/campaigns/${campaignId}/pause`,
          "POST",
          { nonce: Date.now() },
          shopName,
        );

        if (res.status >= 200 && res.status < 300) {
          return json<ActionData>({ success: true });
        }

        return json<ActionData>({
          success: false,
          error: res.json?.error || `Pause failed (${res.status})`,
        });
      } catch (err) {
        console.error("Failed to pause campaign:", err);
        return json<ActionData>({
          success: false,
          error: "Unable to pause campaign. Please try again.",
        });
      }
    }

    /* ---------- enable-campaign ---------- */
    if (intent === "enable-campaign") {
      const campaignId = formData.get("campaignId") as string;

      if (!campaignId) {
        return json<ActionData>({ success: false, error: "Campaign ID is required." });
      }

      try {
        const res = await backendFetch(
          `/google-ads/campaigns/${campaignId}/enable`,
          "POST",
          { nonce: Date.now() },
          shopName,
        );

        if (res.status >= 200 && res.status < 300) {
          return json<ActionData>({ success: true });
        }

        return json<ActionData>({
          success: false,
          error: res.json?.error || `Enable failed (${res.status})`,
        });
      } catch (err) {
        console.error("Failed to enable campaign:", err);
        return json<ActionData>({
          success: false,
          error: "Unable to enable campaign. Please try again.",
        });
      }
    }

    /* ---------- update-budget ---------- */
    if (intent === "update-budget") {
      const campaignId = formData.get("campaignId") as string;
      const dailyBudget = formData.get("dailyBudget") as string;

      if (!campaignId || !dailyBudget) {
        return json<ActionData>({
          success: false,
          error: "Campaign ID and daily budget are required.",
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
          return json<ActionData>({ success: true });
        }

        return json<ActionData>({
          success: false,
          error: res.json?.error || `Budget update failed (${res.status})`,
        });
      } catch (err) {
        console.error("Failed to update budget:", err);
        return json<ActionData>({
          success: false,
          error: "Unable to update budget. Please try again.",
        });
      }
    }

    return json<ActionData>({ success: false, error: "Unknown action" });
  } catch (authError) {
    console.error("Autopilot action authentication failed:", authError);
    return json<ActionData>({
      success: false,
      error: "Authentication failed - please reload the page",
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function Autopilot() {
  const { shopName, connected, campaigns, metrics, connectionError } =
    useLoaderData<typeof loader>() as LoaderData;
  const actionData = useActionData<typeof action>() as ActionData | undefined;
  const submit = useSubmit();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

  /* ----- tab state ----- */
  const [selectedTab, setSelectedTab] = useState(0);
  const handleTabChange = useCallback((index: number) => setSelectedTab(index), []);

  /* ----- create campaign modal ----- */
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newDailyBudget, setNewDailyBudget] = useState("20.00");
  const [newTargetCpc, setNewTargetCpc] = useState("0.50");
  const [newKeywords, setNewKeywords] = useState("");
  const [newLandingUrl, setNewLandingUrl] = useState("");

  /* ----- edit budget modal ----- */
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [editBudgetCampaignId, setEditBudgetCampaignId] = useState("");
  const [editBudgetCampaignName, setEditBudgetCampaignName] = useState("");
  const [editBudgetValue, setEditBudgetValue] = useState("");

  /* ----- banner state ----- */
  const [banner, setBanner] = useState<{
    tone: "success" | "critical" | "info" | "warning";
    message: string;
  } | null>(null);

  /* ----- handle action responses ----- */
  const prevActionData = useState<ActionData | undefined>(undefined);
  if (actionData && actionData !== prevActionData[0]) {
    prevActionData[1](actionData);
    if (actionData.success) {
      setBanner({ tone: "success", message: "Action completed successfully." });
      setCreateModalOpen(false);
      setBudgetModalOpen(false);
      // Reset create form
      setNewCampaignName("");
      setNewDailyBudget("20.00");
      setNewTargetCpc("0.50");
      setNewKeywords("");
      setNewLandingUrl("");
    } else if (actionData.error) {
      setBanner({ tone: "critical", message: actionData.error });
    }
  }

  /* ----- handlers ----- */
  const handleCreateCampaign = useCallback(() => {
    const fd = new FormData();
    fd.set("intent", "create-campaign");
    fd.set("campaignName", newCampaignName);
    fd.set("dailyBudget", newDailyBudget);
    fd.set("targetCpc", newTargetCpc);
    fd.set("keywords", newKeywords);
    fd.set("landingUrl", newLandingUrl);
    submit(fd, { method: "post" });
  }, [submit, newCampaignName, newDailyBudget, newTargetCpc, newKeywords, newLandingUrl]);

  const handlePauseCampaign = useCallback(
    (campaignId: string) => {
      const fd = new FormData();
      fd.set("intent", "pause-campaign");
      fd.set("campaignId", campaignId);
      submit(fd, { method: "post" });
    },
    [submit],
  );

  const handleEnableCampaign = useCallback(
    (campaignId: string) => {
      const fd = new FormData();
      fd.set("intent", "enable-campaign");
      fd.set("campaignId", campaignId);
      submit(fd, { method: "post" });
    },
    [submit],
  );

  const handleUpdateBudget = useCallback(() => {
    const fd = new FormData();
    fd.set("intent", "update-budget");
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
      <Page title="Autopilot" backAction={{ content: "Dashboard", url: "/app" }}>
        <BlockStack gap="400">
          {connectionError && (
            <Banner tone="warning" onDismiss={() => {}}>
              <p>{connectionError}</p>
            </Banner>
          )}

          <Banner
            title="Google Ads account not connected"
            tone="warning"
            action={{ content: "Connect Google Ads", url: "/app/connect-google" }}
          >
            <p>
              To use Autopilot, you need to connect your Google Ads account first.
              This allows us to manage campaigns, read performance data, and
              optimize bids on your behalf through the Google Ads API.
            </p>
          </Banner>

          <Card>
            <Box padding="400">
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  What Autopilot does
                </Text>
                <Text as="p" variant="bodyMd">
                  Once connected, Autopilot gives you direct control over your
                  Google Ads campaigns from within Shopify. You can create
                  campaigns, pause or enable them, adjust budgets, and track
                  performance metrics -- all without leaving your store admin.
                </Text>
                <Text as="p" variant="bodyMd">
                  In a future update, Autopilot will also include AI-driven
                  automatic optimization rules that adjust bids and budgets based
                  on your store performance.
                </Text>
              </BlockStack>
            </Box>
          </Card>
        </BlockStack>
      </Page>
    );
  }

  /* ================================================================ */
  /*  Connected state                                                  */
  /* ================================================================ */

  /* ----- Campaign rows for DataTable ----- */
  const campaignRows = campaigns.map((c) => [
    c.name,
    statusBadge(c.status),
    formatMoney(c.dailyBudget),
    String(c.clicks),
    String(c.impressions),
    formatMoney(c.cost),
    String(c.conversions),
    formatPercent(c.ctr),
    <InlineStack gap="200" key={c.id}>
      {c.status === 2 ? (
        <Button
          size="slim"
          onClick={() => handlePauseCampaign(c.id)}
          disabled={isSubmitting}
        >
          Pause
        </Button>
      ) : c.status === 3 ? (
        <Button
          size="slim"
          variant="primary"
          onClick={() => handleEnableCampaign(c.id)}
          disabled={isSubmitting}
        >
          Enable
        </Button>
      ) : null}
      {c.status !== 4 && (
        <Button
          size="slim"
          onClick={() => openBudgetModal(c.id, c.name, c.dailyBudget)}
          disabled={isSubmitting}
        >
          Edit Budget
        </Button>
      )}
    </InlineStack>,
  ]);

  /* ----- Tab content ----- */
  const tabs = [
    { id: "campaigns", content: "Campaigns", panelID: "campaigns-panel" },
    { id: "performance", content: "Performance", panelID: "performance-panel" },
    { id: "settings", content: "Settings", panelID: "settings-panel" },
  ];

  const campaignsTab = (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center">
        <Text as="h2" variant="headingMd">
          Your Campaigns ({campaigns.length})
        </Text>
        <Button
          variant="primary"
          onClick={() => setCreateModalOpen(true)}
          disabled={isSubmitting}
        >
          Create Campaign
        </Button>
      </InlineStack>

      {campaigns.length === 0 ? (
        <Card>
          <Box padding="400">
            <BlockStack gap="300" inlineAlign="center">
              <Text as="p" variant="bodyMd" alignment="center">
                No campaigns found in your Google Ads account. Create your first
                campaign to get started.
              </Text>
              <Button
                variant="primary"
                onClick={() => setCreateModalOpen(true)}
              >
                Create Your First Campaign
              </Button>
            </BlockStack>
          </Box>
        </Card>
      ) : (
        <Card>
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
              "Budget",
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
  );

  const performanceTab = (
    <BlockStack gap="400">
      <Text as="h2" variant="headingMd">
        Performance Summary
      </Text>

      <InlineStack gap="400" wrap>
        <Card>
          <Box padding="400" minWidth="160px">
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Total Spend
              </Text>
              <Text as="p" variant="headingLg">
                {formatMoney(metrics.totalSpend)}
              </Text>
            </BlockStack>
          </Box>
        </Card>

        <Card>
          <Box padding="400" minWidth="160px">
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Total Clicks
              </Text>
              <Text as="p" variant="headingLg">
                {metrics.totalClicks.toLocaleString()}
              </Text>
            </BlockStack>
          </Box>
        </Card>

        <Card>
          <Box padding="400" minWidth="160px">
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Total Conversions
              </Text>
              <Text as="p" variant="headingLg">
                {metrics.totalConversions.toLocaleString()}
              </Text>
            </BlockStack>
          </Box>
        </Card>

        <Card>
          <Box padding="400" minWidth="160px">
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Average CTR
              </Text>
              <Text as="p" variant="headingLg">
                {formatPercent(metrics.averageCtr)}
              </Text>
            </BlockStack>
          </Box>
        </Card>

        <Card>
          <Box padding="400" minWidth="160px">
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Average CPC
              </Text>
              <Text as="p" variant="headingLg">
                {formatMoney(metrics.averageCpc)}
              </Text>
            </BlockStack>
          </Box>
        </Card>
      </InlineStack>
    </BlockStack>
  );

  const settingsTab = (
    <BlockStack gap="400">
      <Text as="h2" variant="headingMd">
        Autopilot Settings
      </Text>

      <Card>
        <Box padding="400">
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingMd">
                Automatic Optimization
              </Text>
              <Badge tone="info">Coming Soon</Badge>
            </InlineStack>
            <Text as="p" variant="bodyMd">
              In Phase 4, Autopilot will include AI-powered automatic
              optimization rules. These will monitor your campaign performance
              and automatically adjust bids, budgets, and negative keywords to
              maximize your return on ad spend.
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Features planned: automatic bid adjustments, budget reallocation
              across campaigns, negative keyword discovery, ad schedule
              optimization, and performance alerts.
            </Text>
          </BlockStack>
        </Box>
      </Card>
    </BlockStack>
  );

  const tabContent = [campaignsTab, performanceTab, settingsTab];

  return (
    <Page title="Autopilot" backAction={{ content: "Dashboard", url: "/app" }}>
      <BlockStack gap="400">
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

        {/* Tabs */}
        <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
          <Box padding="400">{tabContent[selectedTab]}</Box>
        </Tabs>
      </BlockStack>

      {/* ---- Create Campaign Modal ---- */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Campaign"
        primaryAction={{
          content: "Create Campaign",
          onAction: handleCreateCampaign,
          loading: isSubmitting,
          disabled: !newCampaignName || !newDailyBudget,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setCreateModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <TextField
              label="Campaign Name"
              value={newCampaignName}
              onChange={setNewCampaignName}
              autoComplete="off"
              placeholder="e.g., Summer Sale 2025"
              helpText="A descriptive name for your campaign."
            />
            <TextField
              label="Daily Budget ($)"
              type="number"
              value={newDailyBudget}
              onChange={setNewDailyBudget}
              autoComplete="off"
              min={1}
              placeholder="20.00"
              helpText="The maximum amount you want to spend per day."
            />
            <TextField
              label="Target CPC ($)"
              type="number"
              value={newTargetCpc}
              onChange={setNewTargetCpc}
              autoComplete="off"
              min={0.01}
              step={0.01}
              placeholder="0.50"
              helpText="Maximum cost per click (optional)."
            />
            <TextField
              label="Keywords"
              value={newKeywords}
              onChange={setNewKeywords}
              autoComplete="off"
              placeholder="keyword1, keyword2, keyword3"
              helpText="Comma-separated list of keywords to target."
              multiline={2}
            />
            <TextField
              label="Landing URL"
              value={newLandingUrl}
              onChange={setNewLandingUrl}
              autoComplete="off"
              placeholder="https://your-store.myshopify.com/collections/sale"
              helpText="The page users will land on after clicking your ad."
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* ---- Edit Budget Modal ---- */}
      <Modal
        open={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        title={`Update Budget: ${editBudgetCampaignName}`}
        primaryAction={{
          content: "Update Budget",
          onAction: handleUpdateBudget,
          loading: isSubmitting,
          disabled: !editBudgetValue,
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
            <TextField
              label="New Daily Budget ($)"
              type="number"
              value={editBudgetValue}
              onChange={setEditBudgetValue}
              autoComplete="off"
              min={1}
              placeholder="20.00"
              helpText="The new maximum daily spend for this campaign."
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
