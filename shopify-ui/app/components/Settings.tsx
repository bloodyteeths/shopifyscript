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
  Stack,
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
      <Card.Section>
        <Stack distribution="equalSpacing">
          <Stack vertical spacing="tight">
            <Stack spacing="tight">
              <Text variant="headingMd">{title}</Text>
              <Badge status={connected ? "success" : "subdued"}>
                {connected ? "Connected" : "Not Connected"}
              </Badge>
            </Stack>

            <Text variant="bodyMd" color="subdued">
              {description}
            </Text>

            {details && <div style={{ marginTop: "8px" }}>{details}</div>}
          </Stack>

          <Button
            primary={!connected}
            destructive={connected}
            onClick={connected ? onDisconnect : onConnect}
            loading={loading}
          >
            {connected ? "Disconnect" : "Connect"}
          </Button>
        </Stack>
      </Card.Section>
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
    <Card title="Tracking & Analytics">
      <Card.Section>
        <FormLayout>
          <TextField
            label="Google Analytics Pixel ID"
            value={pixelId}
            onChange={setPixelId}
            placeholder="G-XXXXXXXXXX"
            helpText="Your Google Analytics 4 measurement ID"
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

          <Button primary onClick={handleSave}>
            Save Tracking Settings
          </Button>
        </FormLayout>
      </Card.Section>
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
    <Card title="Automation & Autopilot">
      <Card.Section>
        <FormLayout>
          <SettingToggle
            action={{
              content: autopilotEnabled ? "Disable" : "Enable",
              onAction: () => setAutopilotEnabled(!autopilotEnabled),
            }}
            enabled={autopilotEnabled}
          >
            <Text variant="headingMd">Autopilot Mode</Text>
            <Text variant="bodyMd" color="subdued">
              Let Ads Autopilot AI automatically optimize your campaigns based on
              performance data.
            </Text>
          </SettingToggle>

          {autopilotEnabled && (
            <>
              <Divider />

              <Banner status="info" title="Advanced Automation Features">
                <p>
                  Additional automation features including bid optimization, budget
                  optimization, and keyword expansion are coming soon.
                </p>
              </Banner>
            </>
          )}

          <Button primary onClick={handleSave}>
            Save Automation Settings
          </Button>
        </FormLayout>
      </Card.Section>
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
    <Card title="Account Information">
      <Card.Section>
        <DescriptionList items={accountDetails} />
      </Card.Section>
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
              <Card.Section>
                <Stack alignment="center">
                  <Spinner size="large" />
                  <Text>Loading settings...</Text>
                </Stack>
              </Card.Section>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (error || !config) {
    return (
      <Page title="Settings">
        <Banner status="critical" title="Error loading settings">
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
                    <Card title="Shopify Connection">
                      <Card.Section>
                        <Stack distribution="equalSpacing">
                          <Stack vertical spacing="tight">
                            <Stack spacing="tight">
                              <Text variant="headingMd">Shopify</Text>
                              <Badge status="success">Connected</Badge>
                            </Stack>

                            <Text variant="bodyMd" color="subdued">
                              Your Shopify store is connected and active
                            </Text>

                            <div style={{ marginTop: "8px" }}>
                              <Stack vertical spacing="extraTight">
                                <Text variant="bodySm">
                                  Shop: {connectionStates.shopify.shop}
                                </Text>
                                {connectionStates.shopify.installedAt && (
                                  <Text variant="bodySm" color="subdued">
                                    Installed:{" "}
                                    {new Date(
                                      connectionStates.shopify.installedAt,
                                    ).toLocaleDateString()}
                                  </Text>
                                )}
                              </Stack>
                            </div>
                          </Stack>
                        </Stack>
                      </Card.Section>
                    </Card>
                  </Layout.Section>

                  <Layout.Section>
                    <Stack vertical>
                      <ConnectionCard
                        title="Google Ads"
                        description="Connect your Google Ads account to sync campaigns and performance data"
                        connected={connectionStates.googleAds.connected}
                        onConnect={handleGoogleAdsConnect}
                        onDisconnect={() => handleDisconnect("google-ads")}
                        details={
                          connectionStates.googleAds.connected && (
                            <Stack vertical spacing="extraTight">
                              {connectionStates.googleAds.accountId && (
                                <Text variant="bodySm">
                                  Account ID:{" "}
                                  {connectionStates.googleAds.accountId}
                                </Text>
                              )}
                              {connectionStates.googleAds.lastSync && (
                                <Text variant="bodySm" color="subdued">
                                  Last sync:{" "}
                                  {new Date(
                                    connectionStates.googleAds.lastSync,
                                  ).toLocaleString()}
                                </Text>
                              )}
                            </Stack>
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
                            <Stack vertical spacing="extraTight">
                              {connectionStates.googleSheets.sheetName && (
                                <Text variant="bodySm">
                                  Sheet:{" "}
                                  {connectionStates.googleSheets.sheetName}
                                </Text>
                              )}
                            </Stack>
                          )
                        }
                      />
                    </Stack>
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
