import { useState, useEffect, useCallback } from 'react';
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
  ButtonGroup,
  Modal,
  TextContainer,
  List,
  Icon,
  Toast,
  Frame,
  SettingToggle,
  DescriptionList,
  Link,
  CalloutCard,
  ProgressBar,
} from '@shopify/polaris';
import type { AppConfig } from '../services/api.server';

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

interface NotificationSettings {
  email: boolean;
  webhook?: string;
  slackWebhook?: string;
  performance: boolean;
  budgetAlerts: boolean;
  campaignUpdates: boolean;
  weeklyReports: boolean;
}

const ConnectionCard: React.FC<{
  title: string;
  description: string;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  details?: React.ReactNode;
  loading?: boolean;
}> = ({ title, description, connected, onConnect, onDisconnect, details, loading = false }) => {
  return (
    <Card>
      <Card.Section>
        <Stack distribution="equalSpacing">
          <Stack vertical spacing="tight">
            <Stack spacing="tight">
              <Text variant="headingMd">{title}</Text>
              <Badge status={connected ? 'success' : 'subdued'}>
                {connected ? 'Connected' : 'Not Connected'}
              </Badge>
            </Stack>
            
            <Text variant="bodyMd" color="subdued">
              {description}
            </Text>
            
            {details && (
              <div style={{ marginTop: '8px' }}>
                {details}
              </div>
            )}
          </Stack>

          <Button
            primary={!connected}
            destructive={connected}
            onClick={connected ? onDisconnect : onConnect}
            loading={loading}
          >
            {connected ? 'Disconnect' : 'Connect'}
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
  const [pixelId, setPixelId] = useState(config.tracking.pixelId || '');
  const [conversionTracking, setConversionTracking] = useState(config.tracking.conversionTracking);
  const [enhancedConversions, setEnhancedConversions] = useState(config.tracking.enhancedConversions);
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
    { label: 'Basic (Required cookies only)', value: 'basic' },
    { label: 'Advanced (Marketing cookies with consent)', value: 'advanced' },
    { label: 'Disabled (No consent management)', value: 'disabled' },
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
  const [autopilotEnabled, setAutopilotEnabled] = useState(config.automation.autopilotEnabled);
  const [bidOptimization, setBidOptimization] = useState(config.automation.bidOptimization);
  const [budgetOptimization, setBudgetOptimization] = useState(config.automation.budgetOptimization);
  const [keywordExpansion, setKeywordExpansion] = useState(config.automation.keywordExpansion);

  const handleSave = () => {
    onUpdate({
      automation: {
        autopilotEnabled,
        bidOptimization,
        budgetOptimization,
        keywordExpansion,
      },
    });
  };

  return (
    <Card title="Automation & Autopilot">
      <Card.Section>
        <FormLayout>
          <SettingToggle
            action={{
              content: autopilotEnabled ? 'Disable' : 'Enable',
              onAction: () => setAutopilotEnabled(!autopilotEnabled),
            }}
            enabled={autopilotEnabled}
          >
            <Text variant="headingMd">Autopilot Mode</Text>
            <Text variant="bodyMd" color="subdued">
              Let ProofKit automatically optimize your campaigns based on performance data.
            </Text>
          </SettingToggle>

          {autopilotEnabled && (
            <>
              <Divider />
              
              <Text variant="headingMd">Automation Features</Text>
              
              <Checkbox
                label="Bid optimization"
                checked={bidOptimization}
                onChange={setBidOptimization}
                helpText="Automatically adjust bids to maximize ROAS"
              />

              <Checkbox
                label="Budget optimization"
                checked={budgetOptimization}
                onChange={setBudgetOptimization}
                helpText="Redistribute budget between campaigns based on performance"
              />

              <Checkbox
                label="Keyword expansion"
                checked={keywordExpansion}
                onChange={setKeywordExpansion}
                helpText="Automatically discover and add high-performing keywords"
              />
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

const NotificationSettings: React.FC<{
  config: AppConfig;
  onUpdate: (updates: Partial<AppConfig>) => void;
}> = ({ config, onUpdate }) => {
  const [email, setEmail] = useState(config.notifications.email);
  const [webhook, setWebhook] = useState(config.notifications.webhook || '');
  const [slackWebhook, setSlackWebhook] = useState(config.notifications.slackWebhook || '');

  const handleSave = () => {
    onUpdate({
      notifications: {
        email,
        webhook: webhook || undefined,
        slackWebhook: slackWebhook || undefined,
      },
    });
  };

  const testWebhook = async (url: string, type: 'webhook' | 'slack') => {
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, type }),
      });
      
      if (response.ok) {
        // Show success toast
      } else {
        // Show error toast
      }
    } catch (error) {
      // Show error toast
    }
  };

  return (
    <Card title="Notifications">
      <Card.Section>
        <FormLayout>
          <Checkbox
            label="Email notifications"
            checked={email}
            onChange={setEmail}
            helpText="Receive notifications via email"
          />

          <TextField
            label="Webhook URL"
            value={webhook}
            onChange={setWebhook}
            placeholder="https://your-api.com/webhook"
            helpText="Send notifications to your custom webhook endpoint"
            connectedRight={
              webhook ? (
                <Button onClick={() => testWebhook(webhook, 'webhook')}>
                  Test
                </Button>
              ) : undefined
            }
          />

          <TextField
            label="Slack Webhook URL"
            value={slackWebhook}
            onChange={setSlackWebhook}
            placeholder="https://hooks.slack.com/services/..."
            helpText="Send notifications to your Slack channel"
            connectedRight={
              slackWebhook ? (
                <Button onClick={() => testWebhook(slackWebhook, 'slack')}>
                  Test
                </Button>
              ) : undefined
            }
          />

          <Button primary onClick={handleSave}>
            Save Notification Settings
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
      term: 'Shop Domain',
      description: config.shopify.shop,
    },
    {
      term: 'App Installed',
      description: new Date(config.shopify.installedAt).toLocaleDateString(),
    },
    {
      term: 'Google Ads Account',
      description: config.googleAds.connected ? 
        (config.googleAds.accountId || 'Connected') : 
        'Not connected',
    },
    {
      term: 'Last Sync',
      description: config.googleAds.lastSync ? 
        new Date(config.googleAds.lastSync).toLocaleString() : 
        'Never',
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

const DataExport: React.FC = () => {
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  const handleExport = async (type: 'campaigns' | 'audiences' | 'insights' | 'all') => {
    setExportLoading(type);
    try {
      const response = await fetch(`/api/export/${type}`, { method: 'POST' });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `proofkit-${type}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportLoading(null);
    }
  };

  const exportOptions = [
    {
      title: 'Campaign Data',
      description: 'Export all campaign performance data',
      type: 'campaigns' as const,
    },
    {
      title: 'Audience Data',
      description: 'Export audience definitions and performance',
      type: 'audiences' as const,
    },
    {
      title: 'Insights & Analytics',
      description: 'Export detailed analytics and insights',
      type: 'insights' as const,
    },
    {
      title: 'Complete Data Export',
      description: 'Export all data in a comprehensive package',
      type: 'all' as const,
    },
  ];

  return (
    <Card title="Data Export">
      <Card.Section>
        <Stack vertical>
          <Text variant="bodyMd" color="subdued">
            Export your data for analysis, backup, or migration purposes.
          </Text>
          
          <Stack vertical spacing="tight">
            {exportOptions.map((option) => (
              <Card key={option.type} subdued>
                <Card.Section>
                  <Stack distribution="equalSpacing">
                    <Stack vertical spacing="extraTight">
                      <Text variant="bodyMd" fontWeight="semibold">
                        {option.title}
                      </Text>
                      <Text variant="bodySm" color="subdued">
                        {option.description}
                      </Text>
                    </Stack>
                    
                    <Button
                      onClick={() => handleExport(option.type)}
                      loading={exportLoading === option.type}
                    >
                      Export CSV
                    </Button>
                  </Stack>
                </Card.Section>
              </Card>
            ))}
          </Stack>
        </Stack>
      </Card.Section>
    </Card>
  );
};

const DangerZone: React.FC<{
  onResetData: () => void;
  onDeleteAccount: () => void;
}> = ({ onResetData, onDeleteAccount }) => {
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <>
      <Card title="Danger Zone">
        <Card.Section>
          <Stack vertical>
            <Banner status="warning" title="Destructive Actions">
              <p>These actions cannot be undone. Please proceed with caution.</p>
            </Banner>
            
            <Stack distribution="equalSpacing">
              <Stack vertical spacing="extraTight">
                <Text variant="bodyMd" fontWeight="semibold">Reset All Data</Text>
                <Text variant="bodySm" color="subdued">
                  Clear all campaigns, audiences, and analytics data. App settings will be preserved.
                </Text>
              </Stack>
              
              <Button destructive onClick={() => setShowResetModal(true)}>
                Reset Data
              </Button>
            </Stack>
            
            <Divider />
            
            <Stack distribution="equalSpacing">
              <Stack vertical spacing="extraTight">
                <Text variant="bodyMd" fontWeight="semibold">Delete Account</Text>
                <Text variant="bodySm" color="subdued">
                  Permanently delete your ProofKit account and all associated data.
                </Text>
              </Stack>
              
              <Button destructive onClick={() => setShowDeleteModal(true)}>
                Delete Account
              </Button>
            </Stack>
          </Stack>
        </Card.Section>
      </Card>

      <Modal
        open={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset All Data"
        primaryAction={{
          content: 'Reset Data',
          destructive: true,
          onAction: () => {
            onResetData();
            setShowResetModal(false);
          },
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowResetModal(false),
          },
        ]}
      >
        <Modal.Section>
          <TextContainer>
            <p>
              This will permanently delete all your campaigns, audiences, and analytics data. 
              Your app settings and integrations will be preserved.
            </p>
            <p>
              <strong>This action cannot be undone.</strong>
            </p>
          </TextContainer>
        </Modal.Section>
      </Modal>

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
        primaryAction={{
          content: 'Delete Account',
          destructive: true,
          onAction: () => {
            onDeleteAccount();
            setShowDeleteModal(false);
          },
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowDeleteModal(false),
          },
        ]}
      >
        <Modal.Section>
          <TextContainer>
            <p>
              This will permanently delete your ProofKit account and all associated data, 
              including campaigns, audiences, analytics, and settings.
            </p>
            <p>
              You will be immediately logged out and will need to reinstall the app 
              to use ProofKit again.
            </p>
            <p>
              <strong>This action cannot be undone.</strong>
            </p>
          </TextContainer>
        </Modal.Section>
      </Modal>
    </>
  );
};

export const Settings: React.FC<SettingsProps> = ({ initialConfig }) => {
  const [config, setConfig] = useState<AppConfig | null>(initialConfig || null);
  const [loading, setLoading] = useState(!initialConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Connection states
  const [connectionStates, setConnectionStates] = useState<ConnectionStatus>({
    shopify: {
      connected: true,
      shop: config?.shopify.shop || '',
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
      
      const response = await fetch('/api/config');
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.data);
        setConnectionStates(prev => ({
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
        setError(data.error || 'Failed to load configuration');
      }
    } catch (err) {
      setError('Network error while loading configuration');
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
      setSaving(true);
      
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setConfig(prev => ({ ...prev!, ...updates }));
        setToastMessage('Settings saved successfully');
        setToastActive(true);
      } else {
        setError(result.error || 'Failed to save settings');
      }
    } catch (err) {
      setError('Network error while saving settings');
    } finally {
      setSaving(false);
    }
  };

  // Connection handlers
  const handleGoogleAdsConnect = async () => {
    try {
      const response = await fetch('/api/integrations/google-ads/auth-url', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      setError('Failed to initiate Google Ads connection');
    }
  };

  const handleGoogleSheetsConnect = async () => {
    try {
      const response = await fetch('/api/integrations/google-sheets/auth-url', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      setError('Failed to initiate Google Sheets connection');
    }
  };

  const handleDisconnect = async (service: 'google-ads' | 'google-sheets') => {
    try {
      const response = await fetch(`/api/integrations/${service}/disconnect`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setConnectionStates(prev => ({
          ...prev,
          [service === 'google-ads' ? 'googleAds' : 'googleSheets']: {
            connected: false,
          },
        }));
        setToastMessage(`${service === 'google-ads' ? 'Google Ads' : 'Google Sheets'} disconnected`);
        setToastActive(true);
      }
    } catch (error) {
      setError(`Failed to disconnect ${service}`);
    }
  };

  // Destructive actions
  const handleResetData = async () => {
    try {
      const response = await fetch('/api/reset-data', { method: 'POST' });
      
      if (response.ok) {
        setToastMessage('All data has been reset');
        setToastActive(true);
      }
    } catch (error) {
      setError('Failed to reset data');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch('/api/delete-account', { method: 'POST' });
      
      if (response.ok) {
        window.location.href = '/';
      }
    } catch (error) {
      setError('Failed to delete account');
    }
  };

  const tabs = [
    { id: 'general', content: 'General', accessibilityLabel: 'General settings' },
    { id: 'integrations', content: 'Integrations', accessibilityLabel: 'Integration settings' },
    { id: 'tracking', content: 'Tracking', accessibilityLabel: 'Tracking settings' },
    { id: 'automation', content: 'Automation', accessibilityLabel: 'Automation settings' },
    { id: 'notifications', content: 'Notifications', accessibilityLabel: 'Notification settings' },
    { id: 'data', content: 'Data & Privacy', accessibilityLabel: 'Data and privacy settings' },
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
          <p>{error || 'Failed to load configuration'}</p>
          <Button onClick={loadConfig}>Retry</Button>
        </Banner>
      </Page>
    );
  }

  const toastMarkup = toastActive ? (
    <Toast
      content={toastMessage}
      onDismiss={() => setToastActive(false)}
    />
  ) : null;

  return (
    <Frame>
      <Page
        title="Settings"
        subtitle="Manage your ProofKit configuration and integrations"
        secondaryActions={[
          {
            content: 'Refresh',
            onAction: loadConfig,
          },
        ]}
      >
        <Layout>
          <Layout.Section>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              {selectedTab === 0 && (
                <Layout>
                  <Layout.Section oneHalf>
                    <AccountInfo config={config} />
                  </Layout.Section>
                  
                  <Layout.Section oneHalf>
                    <Card title="App Status">
                      <Card.Section>
                        <Stack vertical>
                          <Stack distribution="equalSpacing">
                            <Text variant="bodyMd">Shopify Integration</Text>
                            <Badge status="success">Active</Badge>
                          </Stack>
                          
                          <Stack distribution="equalSpacing">
                            <Text variant="bodyMd">Google Ads</Text>
                            <Badge status={config.googleAds.connected ? 'success' : 'subdued'}>
                              {config.googleAds.connected ? 'Connected' : 'Not Connected'}
                            </Badge>
                          </Stack>
                          
                          <Stack distribution="equalSpacing">
                            <Text variant="bodyMd">Tracking Active</Text>
                            <Badge status={config.tracking.conversionTracking ? 'success' : 'subdued'}>
                              {config.tracking.conversionTracking ? 'Yes' : 'No'}
                            </Badge>
                          </Stack>
                          
                          <Stack distribution="equalSpacing">
                            <Text variant="bodyMd">Autopilot</Text>
                            <Badge status={config.automation.autopilotEnabled ? 'success' : 'subdued'}>
                              {config.automation.autopilotEnabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </Stack>
                        </Stack>
                      </Card.Section>
                    </Card>
                  </Layout.Section>
                </Layout>
              )}

              {selectedTab === 1 && (
                <Layout>
                  <Layout.Section>
                    <Stack vertical>
                      <ConnectionCard
                        title="Google Ads"
                        description="Connect your Google Ads account to sync campaigns and performance data"
                        connected={connectionStates.googleAds.connected}
                        onConnect={handleGoogleAdsConnect}
                        onDisconnect={() => handleDisconnect('google-ads')}
                        details={
                          connectionStates.googleAds.connected && (
                            <Stack vertical spacing="extraTight">
                              {connectionStates.googleAds.accountId && (
                                <Text variant="bodySm">
                                  Account ID: {connectionStates.googleAds.accountId}
                                </Text>
                              )}
                              {connectionStates.googleAds.lastSync && (
                                <Text variant="bodySm" color="subdued">
                                  Last sync: {new Date(connectionStates.googleAds.lastSync).toLocaleString()}
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
                        onDisconnect={() => handleDisconnect('google-sheets')}
                        details={
                          connectionStates.googleSheets.connected && (
                            <Stack vertical spacing="extraTight">
                              {connectionStates.googleSheets.sheetName && (
                                <Text variant="bodySm">
                                  Sheet: {connectionStates.googleSheets.sheetName}
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

              {selectedTab === 2 && (
                <Layout>
                  <Layout.Section>
                    <TrackingSettings config={config} onUpdate={updateConfig} />
                  </Layout.Section>
                </Layout>
              )}

              {selectedTab === 3 && (
                <Layout>
                  <Layout.Section>
                    <AutomationSettings config={config} onUpdate={updateConfig} />
                  </Layout.Section>
                </Layout>
              )}

              {selectedTab === 4 && (
                <Layout>
                  <Layout.Section>
                    <NotificationSettings config={config} onUpdate={updateConfig} />
                  </Layout.Section>
                </Layout>
              )}

              {selectedTab === 5 && (
                <Layout>
                  <Layout.Section oneHalf>
                    <DataExport />
                  </Layout.Section>
                  
                  <Layout.Section oneHalf>
                    <DangerZone
                      onResetData={handleResetData}
                      onDeleteAccount={handleDeleteAccount}
                    />
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