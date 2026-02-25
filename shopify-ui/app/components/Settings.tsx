import { useState, useEffect, useCallback } from "react";
import {
  Page,
  Card,
  Layout,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Button,
  BlockStack,
  InlineStack,
  Box,
  Text,
  Banner,
  Spinner,
  Badge,
  Tabs,
  Divider,
  Toast,
  Frame,
  SettingToggle,
  DescriptionList,
} from "@shopify/polaris";
import type { AppConfig } from "../services/api.server";

interface SettingsProps {
  initialConfig?: AppConfig;
}

interface ConnectionStatus {
  shopify: {
    connected: boolean;
    shop: string;
    installedAt?: string;
    scopes?: string[];
  };
  googleAds: {
    connected: boolean;
    accountId?: string;
    accountName?: string;
    lastSync?: string;
  };
  googleSheets: {
    connected: boolean;
    sheetId?: string;
    sheetName?: string;
    lastUpdate?: string;
  };
}


const ConnectionCard: React.FC<{
  title: string;
  description: string;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  details?: React.ReactNode;
  loading?: boolean;
}> = ({
  title,
  description,
  connected,
  onConnect,
  onDisconnect,
  details,
  loading = false,
}) => {
  return (
    <Card>
      <Box padding="400">
        <InlineStack align="space-between">
          <BlockStack gap="200">
            <InlineStack gap="200">
              <Text variant="headingMd" as="h3">{title}</Text>
              <Badge tone={connected ? "success" : undefined}>
                {connected ? "Connected" : "Not Connected"}
              </Badge>
            </InlineStack>

            <Text variant="bodyMd" as="p" tone="subdued">
              {description}
            </Text>

            {details && <div style={{ marginTop: "8px" }}>{details}</div>}
          </BlockStack>

          <Button
            variant={!connected ? "primary" : undefined}
            tone={connected ? "critical" : undefined}
            onClick={connected ? onDisconnect : onConnect}
            loading={loading}
          >
            {connected ? "Disconnect" : "Connect"}
          </Button>
        </InlineStack>
      </Box>
    </Card>
  );
};

const TrackingSettings: React.FC<{
  config: AppConfig;
  onUpdate: (updates: Partial<AppConfig>) => void;
}> = ({ config, onUpdate }) => {
  const [pixelId, setPixelId] = useState(config.tracking.pixelId || "");
  const [conversionTracking, setConversionTracking] = useState(
    config.tracking.conversionTracking,
  );
  const [enhancedConversions, setEnhancedConversions] = useState(
    config.tracking.enhancedConversions,
  );
  const [consentMode, setConsentMode] = useState(config.tracking.consentMode);

  const handleSave = () => {
    onUpdate({
      tracking: {
        pixelId,
        conversionTracking,
        enhancedConversions,
        consentMode,
      },
    });
  };

  const consentModeOptions = [
    { label: "Basic (Required cookies only)", value: "basic" },
    { label: "Advanced (Marketing cookies with consent)", value: "advanced" },
    { label: "Disabled (No consent management)", value: "disabled" },
  ];

  return (
    <Card>
      <Box padding="400">
        <Text variant="headingMd" as="h3">Tracking & Analytics</Text>
      </Box>
      <Box padding="400">
        <FormLayout>
          <TextField
            label="Google Analytics Pixel ID"
            value={pixelId}
            onChange={setPixelId}
            placeholder="G-XXXXXXXXXX"
            helpText="Your Google Analytics 4 measurement ID"
            autoComplete="off"
          />

          <Checkbox
            label="Enable conversion tracking"
            checked={conversionTracking}
            onChange={setConversionTracking}
            helpText="Track purchases and other conversion events"
          />

          <Checkbox
            label="Enhanced conversions"
            checked={enhancedConversions}
            onChange={setEnhancedConversions}
            helpText="Improve conversion measurement accuracy with first-party data"
            disabled={!conversionTracking}
          />

          <Select
            label="Consent Mode"
            options={consentModeOptions}
            value={consentMode}
            onChange={(value) => setConsentMode(value as any)}
            helpText="How to handle user consent for tracking"
          />

          <Button variant="primary" onClick={handleSave}>
            Save Tracking Settings
          </Button>
        </FormLayout>
      </Box>
    </Card>
  );
};

const AutomationSettings: React.FC<{
  config: AppConfig;
  onUpdate: (updates: Partial<AppConfig>) => void;
}> = ({ config, onUpdate }) => {
  const [autopilotEnabled, setAutopilotEnabled] = useState(
    config.automation.autopilotEnabled,
  );

  const handleSave = () => {
    onUpdate({
      automation: {
        autopilotEnabled,
        bidOptimization: false,
        budgetOptimization: false,
        keywordExpansion: false,
      },
    });
  };

  return (
    <Card>
      <Box padding="400">
        <Text variant="headingMd" as="h3">Automation & Autopilot</Text>
      </Box>
      <Box padding="400">
        <FormLayout>
          <SettingToggle
            action={{
              content: autopilotEnabled ? "Disable" : "Enable",
              onAction: () => setAutopilotEnabled(!autopilotEnabled),
            }}
            enabled={autopilotEnabled}
          >
            <Text variant="headingMd" as="h3">Autopilot Mode</Text>
            <Text variant="bodyMd" as="p" tone="subdued">
              Let Ads Autopilot AI automatically optimize your campaigns based on
              performance data.
            </Text>
          </SettingToggle>

          {autopilotEnabled && (
            <>
              <Divider />

              <Banner tone="info" title="Advanced Automation Features">
                <p>
                  Additional automation features including bid optimization, budget
                  optimization, and keyword expansion are coming soon.
                </p>
              </Banner>
            </>
          )}

          <Button variant="primary" onClick={handleSave}>
            Save Automation Settings
          </Button>
        </FormLayout>
      </Box>
    </Card>
  );
};


const AccountInfo: React.FC<{
  config: AppConfig;
}> = ({ config }) => {
  const accountDetails = [
    {
      term: "Shop Domain",
      description: config.shopify.shop,
    },
    {
      term: "App Installed",
      description: new Date(config.shopify.installedAt).toLocaleDateString(),
    },
    {
      term: "Google Ads Account",
      description: config.googleAds.connected
        ? config.googleAds.accountId || "Connected"
        : "Not connected",
    },
    {
      term: "Last Sync",
      description: config.googleAds.lastSync
        ? new Date(config.googleAds.lastSync).toLocaleString()
        : "Never",
    },
  ];

  return (
    <Card>
      <Box padding="400">
        <Text variant="headingMd" as="h3">Account Information</Text>
      </Box>
      <Box padding="400">
        <DescriptionList items={accountDetails} />
      </Box>
    </Card>
  );
};



export const Settings: React.FC<SettingsProps> = ({ initialConfig }) => {
  const [config, setConfig] = useState<AppConfig | null>(initialConfig || null);
  const [loading, setLoading] = useState(!initialConfig);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Connection states
  const [connectionStates, setConnectionStates] = useState<ConnectionStatus>({
    shopify: {
      connected: true,
      shop: config?.shopify.shop || "",
      installedAt: config?.shopify.installedAt,
    },
    googleAds: {
      connected: config?.googleAds.connected || false,
      accountId: config?.googleAds.accountId,
      lastSync: config?.googleAds.lastSync,
    },
    googleSheets: {
      connected: false,
    },
  });

  // Load configuration
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/config");
      const data = await response.json();

      if (data.success) {
        setConfig(data.data);
        setConnectionStates((prev) => ({
          ...prev,
          shopify: {
            connected: true,
            shop: data.data.shopify.shop,
            installedAt: data.data.shopify.installedAt,
          },
          googleAds: {
            connected: data.data.googleAds.connected,
            accountId: data.data.googleAds.accountId,
            lastSync: data.data.googleAds.lastSync,
          },
        }));
      } else {
        setError(data.error || "Failed to load configuration");
      }
    } catch (err: unknown) {
      setError("Network error while loading configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!initialConfig) {
      loadConfig();
    }
  }, []);

  // Update configuration
  const updateConfig = async (updates: Partial<AppConfig>) => {
    if (!config) return;

    try {
      const response = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (result.success) {
        setConfig((prev) => ({ ...prev!, ...updates }));
        setToastMessage("Settings saved successfully");
        setToastActive(true);
      } else {
        setError(result.error || "Failed to save settings");
      }
    } catch (err: unknown) {
      setError("Network error while saving settings");
    }
  };

  // Connection handlers
  const handleGoogleAdsConnect = async () => {
    try {
      const response = await fetch("/api/integrations/google-ads/auth-url", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = data.authUrl;
      }
    } catch (error: unknown) {
      setError("Failed to initiate Google Ads connection");
    }
  };

  const handleGoogleSheetsConnect = async () => {
    try {
      const response = await fetch("/api/integrations/google-sheets/auth-url", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = data.authUrl;
      }
    } catch (error: unknown) {
      setError("Failed to initiate Google Sheets connection");
    }
  };

  const handleDisconnect = async (service: "google-ads" | "google-sheets") => {
    try {
      const response = await fetch(`/api/integrations/${service}/disconnect`, {
        method: "POST",
      });

      if (response.ok) {
        setConnectionStates((prev) => ({
          ...prev,
          [service === "google-ads" ? "googleAds" : "googleSheets"]: {
            connected: false,
          },
        }));
        setToastMessage(
          `${service === "google-ads" ? "Google Ads" : "Google Sheets"} disconnected`,
        );
        setToastActive(true);
      }
    } catch (error: unknown) {
      setError(`Failed to disconnect ${service}`);
    }
  };

  const tabs = [
    {
      id: "connections",
      content: "Connections",
      accessibilityLabel: "Connection settings",
    },
    {
      id: "tracking-automation",
      content: "Tracking & Automation",
      accessibilityLabel: "Tracking and automation settings",
    },
    {
      id: "account",
      content: "Account",
      accessibilityLabel: "Account information",
    },
  ];

  if (loading) {
    return (
      <Page title="Settings">
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="400">
                <InlineStack blockAlign="center" gap="200">
                  <Spinner size="large" />
                  <Text as="span">Loading settings...</Text>
                </InlineStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (error || !config) {
    return (
      <Page title="Settings">
        <Banner tone="critical" title="Error loading settings">
          <p>{error || "Failed to load configuration"}</p>
          <Button onClick={loadConfig}>Retry</Button>
        </Banner>
      </Page>
    );
  }

  const toastMarkup = toastActive ? (
    <Toast content={toastMessage} onDismiss={() => setToastActive(false)} />
  ) : null;

  return (
    <Frame>
      <Page
        title="Settings"
        subtitle="Manage your Ads Autopilot AI configuration and integrations"
        secondaryActions={[
          {
            content: "Refresh",
            onAction: loadConfig,
          },
        ]}
      >
        <Layout>
          <Layout.Section>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              {selectedTab === 0 && (
                <Layout>
                  <Layout.Section>
                    <Card>
                      <Box padding="400">
                        <Text variant="headingMd" as="h3">Shopify Connection</Text>
                      </Box>
                      <Box padding="400">
                        <InlineStack align="space-between">
                          <BlockStack gap="200">
                            <InlineStack gap="200">
                              <Text variant="headingMd" as="h3">Shopify</Text>
                              <Badge tone="success">Connected</Badge>
                            </InlineStack>

                            <Text variant="bodyMd" as="p" tone="subdued">
                              Your Shopify store is connected and active
                            </Text>

                            <div style={{ marginTop: "8px" }}>
                              <BlockStack gap="100">
                                <Text variant="bodySm" as="span">
                                  Shop: {connectionStates.shopify.shop}
                                </Text>
                                {connectionStates.shopify.installedAt && (
                                  <Text variant="bodySm" as="span" tone="subdued">
                                    Installed:{" "}
                                    {new Date(
                                      connectionStates.shopify.installedAt,
                                    ).toLocaleDateString()}
                                  </Text>
                                )}
                              </BlockStack>
                            </div>
                          </BlockStack>
                        </InlineStack>
                      </Box>
                    </Card>
                  </Layout.Section>

                  <Layout.Section>
                    <BlockStack gap="400">
                      <ConnectionCard
                        title="Google Ads"
                        description="Connect your Google Ads account to sync campaigns and performance data"
                        connected={connectionStates.googleAds.connected}
                        onConnect={handleGoogleAdsConnect}
                        onDisconnect={() => handleDisconnect("google-ads")}
                        details={
                          connectionStates.googleAds.connected && (
                            <BlockStack gap="100">
                              {connectionStates.googleAds.accountId && (
                                <Text variant="bodySm" as="span">
                                  Account ID:{" "}
                                  {connectionStates.googleAds.accountId}
                                </Text>
                              )}
                              {connectionStates.googleAds.lastSync && (
                                <Text variant="bodySm" as="span" tone="subdued">
                                  Last sync:{" "}
                                  {new Date(
                                    connectionStates.googleAds.lastSync,
                                  ).toLocaleString()}
                                </Text>
                              )}
                            </BlockStack>
                          )
                        }
                      />

                      <ConnectionCard
                        title="Google Sheets"
                        description="Export data to Google Sheets for advanced analysis and reporting"
                        connected={connectionStates.googleSheets.connected}
                        onConnect={handleGoogleSheetsConnect}
                        onDisconnect={() => handleDisconnect("google-sheets")}
                        details={
                          connectionStates.googleSheets.connected && (
                            <BlockStack gap="100">
                              {connectionStates.googleSheets.sheetName && (
                                <Text variant="bodySm" as="span">
                                  Sheet:{" "}
                                  {connectionStates.googleSheets.sheetName}
                                </Text>
                              )}
                            </BlockStack>
                          )
                        }
                      />
                    </BlockStack>
                  </Layout.Section>
                </Layout>
              )}

              {selectedTab === 1 && (
                <Layout>
                  <Layout.Section>
                    <TrackingSettings config={config} onUpdate={updateConfig} />
                  </Layout.Section>

                  <Layout.Section>
                    <AutomationSettings
                      config={config}
                      onUpdate={updateConfig}
                    />
                  </Layout.Section>
                </Layout>
              )}

              {selectedTab === 2 && (
                <Layout>
                  <Layout.Section>
                    <AccountInfo config={config} />
                  </Layout.Section>
                </Layout>
              )}
            </Tabs>
          </Layout.Section>
        </Layout>
      </Page>
      {toastMarkup}
    </Frame>
  );
};

export default Settings;
