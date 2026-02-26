import React, { useState, useEffect, useCallback } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Banner,
  Badge,
  Checkbox,
  Select,
  TextField,
  Divider,
  Spinner,
  DataTable,
  Box,
} from "@shopify/polaris";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AutopilotControlsProps {
  tenantId: string;
  backendUrl: string;
  /** Pre-loaded autopilot status from the route loader (avoids extra round-trip) */
  initialStatus?: AutopilotStatus | null;
  /** Pre-loaded autopilot history from the route loader */
  initialHistory?: AutopilotHistoryEntry[];
  /** Campaign list for the exclude-campaigns multi-select */
  campaignNames?: string[];
}

interface AutopilotStatus {
  enabled: boolean;
  aggressiveness: "conservative" | "moderate" | "aggressive";
  autoApprove: boolean;
  maxDailyBudgetChangePct: number;
  maxBidChangePct: number;
  excludedCampaigns: string[];
  lastRun?: {
    timestamp: string;
    actionsTaken: number;
    nextScheduled: string;
  } | null;
}

interface AutopilotHistoryEntry {
  id: string;
  timestamp: string;
  actionType: string;
  campaign: string;
  detail: string;
  status: "applied" | "skipped" | "error";
}

type AggressivenessLevel = "conservative" | "moderate" | "aggressive";

const AGGRESSIVENESS_OPTIONS = [
  { label: "Conservative -- only add negatives, no bid changes", value: "conservative" },
  { label: "Moderate -- negatives + small bid adjustments", value: "moderate" },
  { label: "Aggressive -- all optimizations including budget changes", value: "aggressive" },
];

const AGGRESSIVENESS_BADGE_TONE: Record<AggressivenessLevel, "info" | "warning" | "critical"> = {
  conservative: "info",
  moderate: "warning",
  aggressive: "critical",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AutopilotControls({
  tenantId,
  backendUrl,
  initialStatus,
  initialHistory,
  campaignNames = [],
}: AutopilotControlsProps) {
  // -- Fetchers (Remix pattern: use fetcher to POST without full-page nav) --
  const configFetcher = useFetcher();
  const runFetcher = useFetcher();
  const statusFetcher = useFetcher();
  const historyFetcher = useFetcher();

  // -- Local state derived from server data --
  const [enabled, setEnabled] = useState(initialStatus?.enabled ?? false);
  const [aggressiveness, setAggressiveness] = useState<AggressivenessLevel>(
    initialStatus?.aggressiveness ?? "moderate",
  );
  const [autoApprove, setAutoApprove] = useState(initialStatus?.autoApprove ?? false);
  const [maxDailyBudgetChangePct, setMaxDailyBudgetChangePct] = useState(
    String(initialStatus?.maxDailyBudgetChangePct ?? 20),
  );
  const [maxBidChangePct, setMaxBidChangePct] = useState(
    String(initialStatus?.maxBidChangePct ?? 30),
  );
  const [excludedCampaigns, setExcludedCampaigns] = useState<string[]>(
    initialStatus?.excludedCampaigns ?? [],
  );
  const [excludeInput, setExcludeInput] = useState("");

  const [lastRun, setLastRun] = useState(initialStatus?.lastRun ?? null);
  const [history, setHistory] = useState<AutopilotHistoryEntry[]>(initialHistory ?? []);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [runTriggered, setRunTriggered] = useState(false);

  // -- Sync fetcher responses back into local state --
  useEffect(() => {
    if (statusFetcher.data && (statusFetcher.data as any).ok !== false) {
      const d = statusFetcher.data as any;
      if (d.enabled !== undefined) setEnabled(d.enabled);
      if (d.aggressiveness) setAggressiveness(d.aggressiveness);
      if (d.autoApprove !== undefined) setAutoApprove(d.autoApprove);
      if (d.maxDailyBudgetChangePct !== undefined)
        setMaxDailyBudgetChangePct(String(d.maxDailyBudgetChangePct));
      if (d.maxBidChangePct !== undefined)
        setMaxBidChangePct(String(d.maxBidChangePct));
      if (d.excludedCampaigns) setExcludedCampaigns(d.excludedCampaigns);
      if (d.lastRun) setLastRun(d.lastRun);
    }
  }, [statusFetcher.data]);

  useEffect(() => {
    if (historyFetcher.data && Array.isArray((historyFetcher.data as any).entries)) {
      setHistory((historyFetcher.data as any).entries);
    }
  }, [historyFetcher.data]);

  useEffect(() => {
    if (configFetcher.data && (configFetcher.data as any).ok) {
      setSaveSuccess(true);
      const timer = setTimeout(() => setSaveSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [configFetcher.data]);

  useEffect(() => {
    if (runFetcher.data) {
      setRunTriggered(true);
      // Refresh status + history after a manual run
      refreshStatus();
      refreshHistory();
      const timer = setTimeout(() => setRunTriggered(false), 5000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runFetcher.data]);

  // -- Load on mount if no initial data provided --
  useEffect(() => {
    if (!initialStatus) {
      refreshStatus();
    }
    if (!initialHistory || initialHistory.length === 0) {
      refreshHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- Helpers --
  const refreshStatus = useCallback(() => {
    statusFetcher.submit(
      { _autopilotAction: "loadStatus", tenant: tenantId },
      { method: "post", action: "/app/advanced" },
    );
  }, [statusFetcher, tenantId]);

  const refreshHistory = useCallback(() => {
    historyFetcher.submit(
      { _autopilotAction: "loadHistory", tenant: tenantId },
      { method: "post", action: "/app/advanced" },
    );
  }, [historyFetcher, tenantId]);

  const handleSaveConfig = () => {
    configFetcher.submit(
      {
        _autopilotAction: "saveConfig",
        tenant: tenantId,
        enabled: enabled ? "true" : "false",
        aggressiveness,
        autoApprove: autoApprove ? "true" : "false",
        maxDailyBudgetChangePct,
        maxBidChangePct,
        excludedCampaigns: JSON.stringify(excludedCampaigns),
      },
      { method: "post", action: "/app/advanced" },
    );
  };

  const handleRunNow = () => {
    runFetcher.submit(
      { _autopilotAction: "runNow", tenant: tenantId },
      { method: "post", action: "/app/advanced" },
    );
  };

  const addExcludedCampaign = () => {
    const trimmed = excludeInput.trim();
    if (trimmed && !excludedCampaigns.includes(trimmed)) {
      setExcludedCampaigns((prev) => [...prev, trimmed]);
      setExcludeInput("");
    }
  };

  const removeExcludedCampaign = (name: string) => {
    setExcludedCampaigns((prev) => prev.filter((c) => c !== name));
  };

  const isSaving = configFetcher.state !== "idle";
  const isRunning = runFetcher.state !== "idle";
  const isLoadingStatus = statusFetcher.state !== "idle";
  const isLoadingHistory = historyFetcher.state !== "idle";

  // -- Run result summary --
  const runResult = runFetcher.data as any;
  const runResultMessage = runResult
    ? runResult.ok
      ? `Optimization complete -- ${runResult.planned?.length ?? 0} planned, ${runResult.applied?.length ?? 0} applied.`
      : `Error: ${runResult.error || "Unknown error"}`
    : null;

  // -- History table rows --
  const historyRows = history.map((entry) => [
    new Date(entry.timestamp).toLocaleString(),
    entry.actionType,
    entry.campaign,
    entry.detail,
    entry.status,
  ]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <BlockStack gap="400">
      {/* ---- Header ---- */}
      <Card>
        <Box padding="400">
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="200" blockAlign="center">
                <Text variant="headingLg" as="h2">
                  Autopilot Engine
                </Text>
                <Badge tone={enabled ? "success" : undefined}>
                  {enabled ? "Enabled" : "Disabled"}
                </Badge>
                {isLoadingStatus && <Spinner size="small" />}
              </InlineStack>
              <Button onClick={refreshStatus} disabled={isLoadingStatus}>
                Refresh Status
              </Button>
            </InlineStack>

            <Text variant="bodyMd" as="p" tone="subdued">
              Automate Google Ads optimizations with configurable guardrails. The
              autopilot engine analyzes performance data and applies changes based
              on your aggressiveness settings and budget limits.
            </Text>
          </BlockStack>
        </Box>
      </Card>

      {/* ---- Enable / Disable Toggle ---- */}
      <Card>
        <Box padding="400">
          <BlockStack gap="300">
            <Checkbox
              label="Enable Autopilot"
              helpText="When enabled, the autopilot engine will automatically optimize your campaigns on the configured schedule."
              checked={enabled}
              onChange={(val) => setEnabled(val)}
            />
          </BlockStack>
        </Box>
      </Card>

      {/* ---- Aggressiveness ---- */}
      <Card>
        <Box padding="400">
          <BlockStack gap="300">
            <Text variant="headingMd" as="h3">
              Aggressiveness Level
            </Text>
            <Select
              label="Optimization aggressiveness"
              labelHidden
              options={AGGRESSIVENESS_OPTIONS}
              value={aggressiveness}
              onChange={(val) => setAggressiveness(val as AggressivenessLevel)}
            />
            <InlineStack gap="200">
              <Badge tone={AGGRESSIVENESS_BADGE_TONE[aggressiveness]}>
                {aggressiveness.charAt(0).toUpperCase() + aggressiveness.slice(1)}
              </Badge>
              <Text variant="bodySm" as="span" tone="subdued">
                {aggressiveness === "conservative" &&
                  "Only adds negative keywords. No bid or budget changes."}
                {aggressiveness === "moderate" &&
                  "Adds negatives and makes small bid adjustments within guardrails."}
                {aggressiveness === "aggressive" &&
                  "Full optimization: negatives, bid changes, and budget adjustments."}
              </Text>
            </InlineStack>
          </BlockStack>
        </Box>
      </Card>

      {/* ---- Auto-Approve ---- */}
      <Card>
        <Box padding="400">
          <BlockStack gap="300">
            <Checkbox
              label="Auto-approve all changes"
              helpText="When enabled, optimizations are applied immediately without manual review."
              checked={autoApprove}
              onChange={(val) => setAutoApprove(val)}
            />
            {autoApprove && (
              <Banner title="Auto-approve is enabled" tone="warning">
                <p>
                  All autopilot optimization changes will be applied automatically
                  to your Google Ads campaigns without manual review. Make sure
                  your budget guardrails below are configured correctly to prevent
                  unexpected spend increases.
                </p>
              </Banner>
            )}
          </BlockStack>
        </Box>
      </Card>

      {/* ---- Budget Guardrails ---- */}
      <Card>
        <Box padding="400">
          <BlockStack gap="400">
            <Text variant="headingMd" as="h3">
              Budget Guardrails
            </Text>
            <Text variant="bodySm" as="p" tone="subdued">
              Set maximum percentage changes per optimization cycle to limit risk.
            </Text>

            <InlineStack gap="400" wrap>
              <div style={{ flex: "1 1 200px" }}>
                <TextField
                  label="Max daily budget change %"
                  type="number"
                  value={maxDailyBudgetChangePct}
                  onChange={(val) => setMaxDailyBudgetChangePct(val)}
                  suffix="%"
                  min={1}
                  max={100}
                  helpText="Default: 20%. The largest single-day budget increase or decrease allowed."
                  autoComplete="off"
                />
              </div>
              <div style={{ flex: "1 1 200px" }}>
                <TextField
                  label="Max bid change %"
                  type="number"
                  value={maxBidChangePct}
                  onChange={(val) => setMaxBidChangePct(val)}
                  suffix="%"
                  min={1}
                  max={100}
                  helpText="Default: 30%. The largest single keyword bid adjustment allowed."
                  autoComplete="off"
                />
              </div>
            </InlineStack>
          </BlockStack>
        </Box>
      </Card>

      {/* ---- Exclude Campaigns ---- */}
      <Card>
        <Box padding="400">
          <BlockStack gap="300">
            <Text variant="headingMd" as="h3">
              Exclude Campaigns
            </Text>
            <Text variant="bodySm" as="p" tone="subdued">
              Campaigns listed here will be skipped by the autopilot engine.
            </Text>

            <InlineStack gap="200" blockAlign="end">
              {campaignNames.length > 0 ? (
                <div style={{ flex: "1 1 300px" }}>
                  <Select
                    label="Select a campaign to exclude"
                    labelHidden
                    options={[
                      { label: "-- Select campaign --", value: "" },
                      ...campaignNames
                        .filter((n) => !excludedCampaigns.includes(n))
                        .map((n) => ({ label: n, value: n })),
                    ]}
                    value={excludeInput}
                    onChange={(val) => setExcludeInput(val)}
                  />
                </div>
              ) : (
                <div style={{ flex: "1 1 300px" }}>
                  <TextField
                    label="Campaign name"
                    labelHidden
                    value={excludeInput}
                    onChange={(val) => setExcludeInput(val)}
                    placeholder="Enter campaign name to exclude"
                    autoComplete="off"
                  />
                </div>
              )}
              <Button onClick={addExcludedCampaign} disabled={!excludeInput.trim()}>
                Add
              </Button>
            </InlineStack>

            {excludedCampaigns.length > 0 && (
              <BlockStack gap="100">
                {excludedCampaigns.map((name) => (
                  <InlineStack key={name} gap="200" blockAlign="center">
                    <Badge>{name}</Badge>
                    <Button
                      variant="plain"
                      tone="critical"
                      onClick={() => removeExcludedCampaign(name)}
                    >
                      Remove
                    </Button>
                  </InlineStack>
                ))}
              </BlockStack>
            )}
          </BlockStack>
        </Box>
      </Card>

      {/* ---- Save Config ---- */}
      <Card>
        <Box padding="400">
          <BlockStack gap="300">
            <InlineStack gap="200" blockAlign="center">
              <Button
                variant="primary"
                onClick={handleSaveConfig}
                loading={isSaving}
                disabled={isSaving}
              >
                Save Autopilot Configuration
              </Button>
              {saveSuccess && (
                <Badge tone="success">Configuration saved</Badge>
              )}
              {configFetcher.data != null && (configFetcher.data as any).ok === false ? (
                <Badge tone="critical">
                  {(configFetcher.data as any).error || "Save failed"}
                </Badge>
              ) : null}
            </InlineStack>
          </BlockStack>
        </Box>
      </Card>

      <Divider />

      {/* ---- Run Now ---- */}
      <Card>
        <Box padding="400">
          <BlockStack gap="300">
            <Text variant="headingMd" as="h3">
              Manual Run
            </Text>
            <Text variant="bodySm" as="p" tone="subdued">
              Trigger an immediate autopilot optimization cycle. This uses the
              current saved configuration.
            </Text>
            <InlineStack gap="200" blockAlign="center">
              <Button
                variant="primary"
                tone="success"
                onClick={handleRunNow}
                loading={isRunning}
                disabled={isRunning}
              >
                Run Optimization Now
              </Button>
              {runTriggered && runResultMessage && (
                <Badge tone={runResult?.ok ? "success" : "critical"}>
                  {runResultMessage}
                </Badge>
              )}
            </InlineStack>
          </BlockStack>
        </Box>
      </Card>

      {/* ---- Last Run Status ---- */}
      {lastRun && (
        <Card>
          <Box padding="400">
            <BlockStack gap="200">
              <Text variant="headingMd" as="h3">
                Last Run
              </Text>
              <InlineStack gap="400" wrap>
                <BlockStack gap="100">
                  <Text variant="bodySm" as="span" tone="subdued">
                    Timestamp
                  </Text>
                  <Text variant="bodyMd" as="span">
                    {new Date(lastRun.timestamp).toLocaleString()}
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text variant="bodySm" as="span" tone="subdued">
                    Actions Taken
                  </Text>
                  <Text variant="bodyMd" as="span">
                    {lastRun.actionsTaken}
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text variant="bodySm" as="span" tone="subdued">
                    Next Scheduled
                  </Text>
                  <Text variant="bodyMd" as="span">
                    {lastRun.nextScheduled
                      ? new Date(lastRun.nextScheduled).toLocaleString()
                      : "Not scheduled"}
                  </Text>
                </BlockStack>
              </InlineStack>
            </BlockStack>
          </Box>
        </Card>
      )}

      {/* ---- History ---- */}
      <Card>
        <Box padding="400">
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Text variant="headingMd" as="h3">
                Recent Autopilot Actions
              </Text>
              <InlineStack gap="200" blockAlign="center">
                {isLoadingHistory && <Spinner size="small" />}
                <Button onClick={refreshHistory} disabled={isLoadingHistory}>
                  Refresh
                </Button>
              </InlineStack>
            </InlineStack>

            {historyRows.length > 0 ? (
              <DataTable
                columnContentTypes={["text", "text", "text", "text", "text"]}
                headings={["Time", "Action", "Campaign", "Detail", "Status"]}
                rows={historyRows}
                truncate
              />
            ) : (
              <Text variant="bodySm" as="p" tone="subdued">
                No autopilot actions recorded yet. Run the optimizer or wait for
                the next scheduled cycle.
              </Text>
            )}
          </BlockStack>
        </Box>
      </Card>
    </BlockStack>
  );
}

export default AutopilotControls;
