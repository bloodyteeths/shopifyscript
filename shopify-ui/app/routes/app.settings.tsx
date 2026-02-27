import { useState, useEffect, useCallback } from "react";
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
  Tabs,
  Card,
  BlockStack,
  InlineStack,
  InlineGrid,
  Text,
  TextField,
  Select,
  Button,
  Banner,
  Badge,
  Box,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { backendFetch } from "../server/hmac.server";
import {
  checkSubscriptionStatus,
  type SubscriptionInfo,
} from "../utils/subscription.server";
import { AutopilotControls } from "../components/AutopilotControls";

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

interface PlanDef {
  name: string;
  price: number;
  badge?: string;
  features: string[];
}

const PLANS: PlanDef[] = [
  {
    name: "Starter",
    price: 29,
    features: [
      "5 campaigns",
      "7-day data retention",
      "Email support",
      "Basic optimization",
      "Weekly reports",
    ],
  },
  {
    name: "Professional",
    price: 79,
    badge: "Most Popular",
    features: [
      "25 campaigns",
      "30-day data retention",
      "Priority support",
      "Advanced AI optimization",
      "Daily reports",
    ],
  },
  {
    name: "Enterprise",
    price: 199,
    features: [
      "Unlimited campaigns",
      "90-day data retention",
      "Phone + email support",
      "Full automation suite",
      "Custom reports",
    ],
  },
];

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const shopName = session?.shop?.replace(".myshopify.com", "") || "";

  // Parallel data fetches
  const [subscriptionInfo, connectionResult, configResult] =
    await Promise.allSettled([
      checkSubscriptionStatus(admin),
      backendFetch("/google-ads/connection-status", "GET", undefined, shopName),
      backendFetch("/config", "GET", undefined, shopName),
    ]);

  const subscription: SubscriptionInfo =
    subscriptionInfo.status === "fulfilled"
      ? subscriptionInfo.value
      : {
          hasActivePayment: false,
          isInTrial: false,
          trialDaysRemaining: null,
          subscriptionTier: null,
          subscriptionStatus: "none",
          subscriptionId: null,
          currentPeriodEnd: null,
          needsSubscription: true,
        };

  const connectionData =
    connectionResult.status === "fulfilled"
      ? connectionResult.value.json || {}
      : {};

  const configData =
    configResult.status === "fulfilled"
      ? configResult.value.json?.config || {}
      : {};

  // Autopilot pre-load
  const [autopilotStatusResult, autopilotHistoryResult, campaignsResult] =
    await Promise.allSettled([
      backendFetch(
        "/google-ads/autopilot/status",
        "GET",
        undefined,
        shopName,
      ),
      backendFetch(
        "/google-ads/autopilot/history",
        "GET",
        undefined,
        shopName,
      ),
      backendFetch("/campaigns", "GET", undefined, shopName),
    ]);

  const autopilotStatus =
    autopilotStatusResult.status === "fulfilled"
      ? autopilotStatusResult.value.json || null
      : null;

  const autopilotHistory =
    autopilotHistoryResult.status === "fulfilled"
      ? autopilotHistoryResult.value.json?.entries || []
      : [];

  const campaignNames: string[] =
    campaignsResult.status === "fulfilled"
      ? (campaignsResult.value.json?.campaigns || [])
          .map((c: any) => c.name || c.campaign_name || c.id || "")
          .filter(Boolean)
      : [];

  const appHandle =
    process.env.SHOPIFY_APP_HANDLE || "adsautopilot-autopilot";
  const planSelectionUrl = `https://admin.shopify.com/store/${shopName}/charges/${appHandle}/pricing_plans`;

  return json({
    shopName,
    subscription,
    connectionData,
    configData,
    autopilotStatus,
    autopilotHistory,
    campaignNames,
    planSelectionUrl,
    backendUrl:
      process.env.BACKEND_PUBLIC_URL ||
      "https://ads-autopilot-backend.vercel.app/api",
  });
}

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shopName = session?.shop?.replace(".myshopify.com", "") || "";

  const fd = await request.formData();
  const intent = String(fd.get("intent") || "");

  // --- Autopilot Controls sub-actions (forwarded from the component) ---
  const autopilotAction = fd.get("_autopilotAction");
  if (autopilotAction === "loadStatus") {
    const tenant = String(fd.get("tenant") || shopName);
    const r = await backendFetch(
      "/google-ads/autopilot/status",
      "GET",
      undefined,
      tenant,
    );
    return json(r.json || { ok: false, error: "No data" });
  }
  if (autopilotAction === "loadHistory") {
    const tenant = String(fd.get("tenant") || shopName);
    const r = await backendFetch(
      "/google-ads/autopilot/history",
      "GET",
      undefined,
      tenant,
    );
    return json(r.json || { ok: false, entries: [] });
  }
  if (autopilotAction === "saveConfig") {
    const tenant = String(fd.get("tenant") || shopName);
    const configPayload = {
      nonce: Date.now(),
      enabled: fd.get("enabled") === "true",
      aggressiveness: String(fd.get("aggressiveness") || "moderate"),
      autoApprove: fd.get("autoApprove") === "true",
      maxDailyBudgetChangePct: Number(
        fd.get("maxDailyBudgetChangePct") || 20,
      ),
      maxBidChangePct: Number(fd.get("maxBidChangePct") || 30),
      excludedCampaigns: JSON.parse(
        String(fd.get("excludedCampaigns") || "[]"),
      ),
    };
    const r = await backendFetch(
      "/google-ads/autopilot/config",
      "POST",
      configPayload,
      tenant,
    );
    return json(r.json || { ok: false, error: "Save failed" });
  }
  if (autopilotAction === "runNow") {
    const tenant = String(fd.get("tenant") || shopName);
    const r = await backendFetch(
      "/google-ads/optimize",
      "POST",
      { nonce: Date.now() },
      tenant,
    );
    return json(r.json || { ok: false, error: "Run failed" });
  }

  // --- Page-level intents ---
  if (intent === "save_targets") {
    const schedule = String(fd.get("schedule") || "daily");
    const targetCpa = String(fd.get("targetCpa") || "");
    const targetRoas = String(fd.get("targetRoas") || "");

    const settings: Record<string, string> = {
      AP_SCHEDULE: schedule,
      AP_TARGET_CPA: targetCpa,
      AP_TARGET_ROAS: targetRoas,
    };

    const result = await backendFetch(
      "/upsertConfig",
      "POST",
      { nonce: Date.now(), settings },
      shopName,
    );

    if (!result.json?.ok) {
      return json(
        {
          ok: false,
          intent,
          error: result.json?.error || "Failed to save targets",
        },
        { status: 500 },
      );
    }

    return json({ ok: true, intent, message: "Optimization targets saved." });
  }

  if (intent === "run_optimization") {
    const tickResult = await backendFetch(
      "/jobs/autopilot_tick?force=1",
      "POST",
      { nonce: Date.now() },
      shopName,
    );

    return json({
      ok: true,
      intent,
      planned: tickResult.json?.planned || [],
      applied: tickResult.json?.applied || [],
      skipped: tickResult.json?.skipped || false,
      reason: tickResult.json?.reason || "",
      message: "Optimization run complete.",
    });
  }

  return json({ ok: false, error: "Unknown intent" }, { status: 400 });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Settings() {
  const {
    shopName,
    subscription,
    connectionData,
    configData,
    autopilotStatus,
    autopilotHistory,
    campaignNames,
    planSelectionUrl,
    backendUrl,
  } = useLoaderData<typeof loader>();

  const actionData = useActionData<typeof action>() as any;
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";

  const [selectedTab, setSelectedTab] = useState(0);

  // Optimization targets form state
  const [schedule, setSchedule] = useState(
    configData?.AP_SCHEDULE || "daily",
  );
  const [targetCpa, setTargetCpa] = useState(
    String(configData?.AP_TARGET_CPA || ""),
  );
  const [targetRoas, setTargetRoas] = useState(
    String(configData?.AP_TARGET_ROAS || ""),
  );

  // Toast-like feedback
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!actionData) return;
    if (actionData.intent === "save_targets" && actionData.ok) {
      setFeedback("Optimization targets saved successfully.");
    } else if (actionData.intent === "run_optimization" && actionData.ok) {
      const planned = actionData.planned?.length || 0;
      const applied = actionData.applied?.length || 0;
      if (actionData.skipped) {
        setFeedback(`Optimization skipped: ${actionData.reason || "not scheduled"}`);
      } else {
        setFeedback(
          `Optimization complete: ${planned} planned, ${applied} applied.`,
        );
      }
    } else if (actionData.error) {
      setFeedback(`Error: ${actionData.error}`);
    }
    const timer = setTimeout(() => setFeedback(""), 5000);
    return () => clearTimeout(timer);
  }, [actionData]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleSaveTargets = useCallback(() => {
    const fd = new FormData();
    fd.set("intent", "save_targets");
    fd.set("schedule", schedule);
    fd.set("targetCpa", targetCpa);
    fd.set("targetRoas", targetRoas);
    submit(fd, { method: "post" });
  }, [submit, schedule, targetCpa, targetRoas]);

  // -----------------------------------------------------------------------
  // Tab definitions
  // -----------------------------------------------------------------------

  const tabs = [
    { id: "autopilot", content: "Autopilot" },
    { id: "subscription", content: "Subscription" },
    { id: "account", content: "Account" },
  ];

  // -----------------------------------------------------------------------
  // Subscription helpers
  // -----------------------------------------------------------------------

  const currentTierName = subscription.subscriptionTier
    ? subscription.subscriptionTier.charAt(0).toUpperCase() +
      subscription.subscriptionTier.slice(1)
    : null;

  function renderSubscriptionBanner() {
    if (subscription.needsSubscription && !subscription.isInTrial) {
      return (
        <Banner
          title="No active subscription"
          tone="warning"
          action={{
            content: "Start Free Trial",
            url: planSelectionUrl,
            target: "_top",
          }}
        >
          <p>
            Start your 14-day free trial to unlock all Ads Autopilot features.
          </p>
        </Banner>
      );
    }

    if (subscription.isInTrial) {
      return (
        <Banner title="Free Trial Active" tone="info">
          <p>
            You are on the <strong>{currentTierName}</strong> plan.{" "}
            {subscription.trialDaysRemaining != null &&
              `${subscription.trialDaysRemaining} day${subscription.trialDaysRemaining !== 1 ? "s" : ""} remaining.`}
          </p>
        </Banner>
      );
    }

    if (subscription.hasActivePayment) {
      return (
        <Banner title="Active Subscription" tone="success">
          <p>
            You are on the <strong>{currentTierName}</strong> plan. Status:{" "}
            {subscription.subscriptionStatus}
          </p>
        </Banner>
      );
    }

    return null;
  }

  function renderPlanCards() {
    return (
      <InlineGrid columns={3} gap="400">
        {PLANS.map((plan) => {
          const isCurrent =
            subscription.subscriptionTier?.toLowerCase() ===
            plan.name.toLowerCase();

          return (
            <Card key={plan.name} background={isCurrent ? "bg-surface-selected" : undefined}>
              <Box padding="400">
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="headingMd" as="h3">
                      {plan.name}
                    </Text>
                    <InlineStack gap="200">
                      {plan.badge && (
                        <Badge tone="info">{plan.badge}</Badge>
                      )}
                      {isCurrent && (
                        <Badge tone="success">Current Plan</Badge>
                      )}
                    </InlineStack>
                  </InlineStack>

                  <Text variant="headingLg" as="p">
                    ${plan.price}
                    <Text variant="bodySm" as="span" tone="subdued">
                      /mo
                    </Text>
                  </Text>

                  <Divider />

                  <BlockStack gap="200">
                    {plan.features.map((feature) => (
                      <InlineStack key={feature} gap="200" blockAlign="center">
                        <Text variant="bodyMd" as="span">
                          {feature}
                        </Text>
                      </InlineStack>
                    ))}
                  </BlockStack>
                </BlockStack>
              </Box>
            </Card>
          );
        })}
      </InlineGrid>
    );
  }

  // -----------------------------------------------------------------------
  // Connection helpers
  // -----------------------------------------------------------------------

  const isGoogleConnected =
    connectionData?.connected === true ||
    connectionData?.status === "connected";
  const googleAccountId = connectionData?.accountId || connectionData?.customerId || null;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <Page title="Settings">
      <BlockStack gap="400">
        {feedback && (
          <Banner
            title={feedback}
            tone={feedback.startsWith("Error") ? "critical" : "success"}
            onDismiss={() => setFeedback("")}
          />
        )}

        <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
          {/* ============================================================= */}
          {/* TAB 0: Autopilot                                              */}
          {/* ============================================================= */}
          {selectedTab === 0 && (
            <Box paddingBlockStart="400">
              <BlockStack gap="600">
                {/* AutopilotControls component */}
                <AutopilotControls
                  tenantId={shopName}
                  backendUrl={backendUrl}
                  initialStatus={autopilotStatus}
                  initialHistory={autopilotHistory}
                  campaignNames={campaignNames}
                  actionUrl="/app/settings"
                />

                {/* Optimization Targets card */}
                <Card>
                  <Box padding="400">
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h3">
                        Optimization Targets
                      </Text>

                      <Select
                        label="Schedule"
                        options={[
                          { label: "Daily", value: "daily" },
                          {
                            label: "Business Hours Only",
                            value: "weekdays_9_18",
                          },
                          { label: "Manual Only", value: "off" },
                        ]}
                        value={schedule}
                        onChange={setSchedule}
                      />

                      <TextField
                        label="Target CPA"
                        type="number"
                        value={targetCpa}
                        onChange={setTargetCpa}
                        prefix="$"
                        placeholder="e.g. 25.00"
                        autoComplete="off"
                      />

                      <TextField
                        label="Target ROAS"
                        type="number"
                        value={targetRoas}
                        onChange={setTargetRoas}
                        suffix="x"
                        placeholder="e.g. 4.0"
                        autoComplete="off"
                      />

                      <InlineStack gap="200">
                        <Button
                          variant="primary"
                          onClick={handleSaveTargets}
                          loading={
                            isSubmitting &&
                            navigation.formData?.get("intent") ===
                              "save_targets"
                          }
                          disabled={isSubmitting}
                        >
                          Save Targets
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  </Box>
                </Card>
              </BlockStack>
            </Box>
          )}

          {/* ============================================================= */}
          {/* TAB 1: Subscription                                           */}
          {/* ============================================================= */}
          {selectedTab === 1 && (
            <Box paddingBlockStart="400">
              <BlockStack gap="600">
                {renderSubscriptionBanner()}

                {renderPlanCards()}

                <InlineStack align="center">
                  <Button
                    variant="primary"
                    url={planSelectionUrl}
                    target="_top"
                  >
                    Manage Subscription
                  </Button>
                </InlineStack>
              </BlockStack>
            </Box>
          )}

          {/* ============================================================= */}
          {/* TAB 2: Account                                                */}
          {/* ============================================================= */}
          {selectedTab === 2 && (
            <Box paddingBlockStart="400">
              <BlockStack gap="600">
                {/* Shop Info */}
                <Card>
                  <Box padding="400">
                    <BlockStack gap="200">
                      <Text variant="headingMd" as="h3">
                        Shop
                      </Text>
                      <Text variant="bodyMd" as="p">
                        {shopName}.myshopify.com
                      </Text>
                    </BlockStack>
                  </Box>
                </Card>

                {/* Google Ads Connection */}
                <Card>
                  <Box padding="400">
                    <BlockStack gap="300">
                      <Text variant="headingMd" as="h3">
                        Google Ads Connection
                      </Text>

                      <InlineStack gap="200" blockAlign="center">
                        <Text variant="bodyMd" as="span">
                          Status:
                        </Text>
                        <Badge
                          tone={isGoogleConnected ? "success" : "critical"}
                        >
                          {isGoogleConnected ? "Connected" : "Not connected"}
                        </Badge>
                      </InlineStack>

                      {isGoogleConnected && googleAccountId && (
                        <Text variant="bodyMd" as="p" tone="subdued">
                          Account ID: {googleAccountId}
                        </Text>
                      )}

                      <Button url="/app/connect-google">
                        Manage Connection
                      </Button>
                    </BlockStack>
                  </Box>
                </Card>

                {/* Support */}
                <Card>
                  <Box padding="400">
                    <BlockStack gap="300">
                      <Text variant="headingMd" as="h3">
                        Support
                      </Text>
                      <Text variant="bodyMd" as="p">
                        Need help? Contact us at support@adsautopilot.com
                      </Text>
                      <Button url="mailto:support@adsautopilot.com" external>
                        Email Support
                      </Button>
                    </BlockStack>
                  </Box>
                </Card>
              </BlockStack>
            </Box>
          )}
        </Tabs>
      </BlockStack>
    </Page>
  );
}
