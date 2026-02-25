/**
 * Analytics Tier Component
 * Provides tier-aware analytics UI with differentiated features
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Text,
  Badge,
  Button,
  Spinner,
  Banner,
  Layout,
  ProgressBar,
  Tooltip,
  BlockStack,
  InlineStack,
  Box,
  Grid,
} from '@shopify/polaris';
import {
  ViewIcon,
  ChartLineIcon,
  RefreshIcon,
  SettingsIcon,
} from '@shopify/polaris-icons';

interface TierFeatures {
  tier: 'starter' | 'professional' | 'enterprise';
  basicMetrics: boolean;
  realTimeUpdates: boolean;
  advancedRoas: boolean;
  customDashboards: boolean;
  customRoasModels: boolean;
  refreshInterval: number;
  maxDataPoints: number;
  chartTypes: string[];
  exportFormats: string[];
}

interface AnalyticsData {
  kpi: {
    clicks: number;
    cost: number;
    conversions: number;
    impressions: number;
    ctr: number;
    cpc: number;
    cpa: number;
  };
  roas?: {
    basic?: { roas: number; revenue: number; profit: number };
    advanced?: { ltvRoas: number; marginRoas: number };
    segmented?: { segments: any };
  };
  series?: Array<{
    t: string;
    clicks: number;
    cost: number;
    conv: number;
  }>;
  tierInfo: {
    tier: string;
    refreshInterval: number;
    realTimeEnabled: boolean;
  };
  upgradePrompts?: Array<{
    feature: string;
    message: string;
    requiredTier: string;
  }>;
}

interface AnalyticsTierProps {
  tenant: string;
  data: AnalyticsData;
  onDataRefresh?: () => void;
  onUpgrade?: (tier: string) => void;
}

export function AnalyticsTier({
  tenant,
  data,
  onDataRefresh,
  onUpgrade,
}: AnalyticsTierProps) {
  const [realTimeData, setRealTimeData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const tier = data.tierInfo?.tier || 'starter';
  const isRealTimeEnabled = data.tierInfo?.realTimeEnabled || false;
  const refreshInterval = data.tierInfo?.refreshInterval || 300000;

  // Real-time updates for Professional+ tiers
  useEffect(() => {
    if (!isRealTimeEnabled) return;

    const interval = setInterval(async () => {
      try {
        // This would call the real-time endpoint
        // const response = await fetch(`/api/insights/realtime?tenant=${tenant}`);
        // const newData = await response.json();
        // setRealTimeData(newData);
        setLastUpdate(new Date());
      } catch (error: unknown) {
        console.error('Real-time update failed:', error);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [tenant, isRealTimeEnabled, refreshInterval]);

  const getTierBadgeTone = (tierName: string) => {
    switch (tierName) {
      case 'starter': return 'info' as const;
      case 'professional': return 'success' as const;
      case 'enterprise': return 'attention' as const;
      default: return 'info' as const;
    }
  };

  const getTierDisplayName = (tierName: string) => {
    return tierName.charAt(0).toUpperCase() + tierName.slice(1);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const renderBasicKPIs = () => {
    const { kpi } = data;

    return (
      <Grid>
        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2, lg: 2, xl: 2}}>
          <Card>
            <BlockStack gap="200">
              <Text variant="headingMd" as="h3">Clicks</Text>
              <Text variant="headingXl" as="h1">
                {formatNumber(kpi.clicks)}
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                Total clicks
              </Text>
            </BlockStack>
          </Card>
        </Grid.Cell>

        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2, lg: 2, xl: 2}}>
          <Card>
            <BlockStack gap="200">
              <Text variant="headingMd" as="h3">Cost</Text>
              <Text variant="headingXl" as="h1">
                {formatCurrency(kpi.cost)}
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                Total spend
              </Text>
            </BlockStack>
          </Card>
        </Grid.Cell>

        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2, lg: 2, xl: 2}}>
          <Card>
            <BlockStack gap="200">
              <Text variant="headingMd" as="h3">Conversions</Text>
              <Text variant="headingXl" as="h1">
                {formatNumber(kpi.conversions)}
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                Total conversions
              </Text>
            </BlockStack>
          </Card>
        </Grid.Cell>

        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2, lg: 2, xl: 2}}>
          <Card>
            <BlockStack gap="200">
              <Text variant="headingMd" as="h3">CTR</Text>
              <Text variant="headingXl" as="h1">
                {(kpi.ctr * 100).toFixed(2)}%
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                Click-through rate
              </Text>
            </BlockStack>
          </Card>
        </Grid.Cell>

        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2, lg: 2, xl: 2}}>
          <Card>
            <BlockStack gap="200">
              <Text variant="headingMd" as="h3">CPC</Text>
              <Text variant="headingXl" as="h1">
                {formatCurrency(kpi.cpc)}
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                Cost per click
              </Text>
            </BlockStack>
          </Card>
        </Grid.Cell>

        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2, lg: 2, xl: 2}}>
          <Card>
            <BlockStack gap="200">
              <Text variant="headingMd" as="h3">CPA</Text>
              <Text variant="headingXl" as="h1">
                {formatCurrency(kpi.cpa)}
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                Cost per acquisition
              </Text>
            </BlockStack>
          </Card>
        </Grid.Cell>
      </Grid>
    );
  };

  const renderROASMetrics = () => {
    if (!data.roas?.basic) return null;

    const { basic, advanced } = data.roas;

    return (
      <Card>
        <Box padding="400">
          <BlockStack gap="400">
            <InlineStack blockAlign="center" gap="200">
              <Text variant="headingLg" as="h2">ROAS Analytics</Text>
              <Badge tone={getTierBadgeTone(tier)}>
                {getTierDisplayName(tier)}
              </Badge>
            </InlineStack>

            <Grid>
              <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 4, lg: 4, xl: 4}}>
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h3">Basic ROAS</Text>
                  <Text variant="headingXl" as="h1" tone={basic.roas >= 2 ? 'success' : 'critical'}>
                    {basic.roas.toFixed(2)}x
                  </Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Revenue: {formatCurrency(basic.revenue)}
                  </Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Profit: {formatCurrency(basic.profit)}
                  </Text>
                </BlockStack>
              </Grid.Cell>

              {advanced && tier !== 'starter' && (
                <>
                  <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 4, lg: 4, xl: 4}}>
                    <BlockStack gap="200">
                      <InlineStack blockAlign="center" gap="200">
                        <Text variant="headingMd" as="h3">LTV ROAS</Text>
                        <Tooltip content="Lifetime Value based ROAS calculation">
                          <Button variant="plain" icon={ViewIcon} accessibilityLabel="View LTV info" />
                        </Tooltip>
                      </InlineStack>
                      <Text variant="headingXl" as="h1" tone={advanced.ltvRoas >= 4 ? 'success' : 'caution'}>
                        {advanced.ltvRoas.toFixed(2)}x
                      </Text>
                      <Text variant="bodyMd" as="p" tone="subdued">
                        Long-term profitability
                      </Text>
                    </BlockStack>
                  </Grid.Cell>

                  <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 4, lg: 4, xl: 4}}>
                    <BlockStack gap="200">
                      <InlineStack blockAlign="center" gap="200">
                        <Text variant="headingMd" as="h3">Margin ROAS</Text>
                        <Tooltip content="Profit margin adjusted ROAS">
                          <Button variant="plain" icon={ChartLineIcon} accessibilityLabel="View Margin info" />
                        </Tooltip>
                      </InlineStack>
                      <Text variant="headingXl" as="h1">
                        {advanced.marginRoas.toFixed(2)}x
                      </Text>
                      <Text variant="bodyMd" as="p" tone="subdued">
                        After-margin profitability
                      </Text>
                    </BlockStack>
                  </Grid.Cell>
                </>
              )}
            </Grid>
          </BlockStack>
        </Box>
      </Card>
    );
  };

  const renderRealTimeStatus = () => {
    if (!isRealTimeEnabled) return null;

    return (
      <Card>
        <Box padding="400">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack blockAlign="center" gap="200">
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#00A47C',
                animation: 'pulse 2s infinite'
              }} />
              <Text variant="bodyMd" as="p" tone="success">
                Real-time updates active
              </Text>
            </InlineStack>
            <InlineStack blockAlign="center" gap="200">
              <Text variant="bodySm" as="span" tone="subdued">
                Last update: {lastUpdate.toLocaleTimeString()}
              </Text>
              <Button
                variant="plain"
                onClick={onDataRefresh}
                loading={loading}
                disabled={loading}
              >
                Refresh
              </Button>
            </InlineStack>
          </InlineStack>
        </Box>
      </Card>
    );
  };

  const renderUpgradePrompts = () => {
    if (!data.upgradePrompts || data.upgradePrompts.length === 0) return null;

    return (
      <BlockStack gap="400">
        {data.upgradePrompts.map((prompt, index) => (
          <Banner
            key={index}
            tone="info"
            action={{
              content: `Upgrade to ${getTierDisplayName(prompt.requiredTier)}`,
              onAction: () => onUpgrade?.(prompt.requiredTier),
            }}
          >
            <Text variant="bodyMd" as="p">{prompt.message}</Text>
          </Banner>
        ))}
      </BlockStack>
    );
  };

  const renderTierStatus = () => (
    <Card>
      <Box padding="400">
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack blockAlign="center" gap="200">
            <Text variant="headingMd" as="h3">Analytics Tier</Text>
            <Badge tone={getTierBadgeTone(tier)}>
              {getTierDisplayName(tier)}
            </Badge>
          </InlineStack>

          <InlineStack blockAlign="center" gap="200">
            {tier !== 'enterprise' && (
              <Button
                variant="primary"
                onClick={() => onUpgrade?.(tier === 'starter' ? 'professional' : 'enterprise')}
              >
                {tier === 'starter' ? 'Upgrade to Professional' : 'Upgrade to Enterprise'}
              </Button>
            )}

            <Button
              variant="plain"
              icon={SettingsIcon}
              onClick={() => {/* Navigate to billing settings */}}
            >
              Manage Plan
            </Button>
          </InlineStack>
        </InlineStack>
      </Box>
    </Card>
  );

  const renderTierComparison = () => {
    if (tier === 'enterprise') return null;

    const features = {
      starter: ['Basic analytics', 'Basic ROAS', 'Monthly reports'],
      professional: ['Real-time analytics', 'Advanced ROAS', 'Weekly reports', 'Attribution modeling'],
      enterprise: ['Custom dashboards', 'Custom ROAS models', 'Daily reports', 'Multi-touch attribution']
    };

    const nextTier = tier === 'starter' ? 'professional' : 'enterprise';

    return (
      <Card>
        <Box padding="400">
          <BlockStack gap="400">
            <Text variant="headingMd" as="h3">Unlock More Analytics Features</Text>
            <Grid>
              <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}>
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h4">Current Plan: {getTierDisplayName(tier)}</Text>
                  {features[tier as keyof typeof features].map((feature, index) => (
                    <Text key={index} variant="bodyMd" as="p" tone="subdued">
                      {feature}
                    </Text>
                  ))}
                </BlockStack>
              </Grid.Cell>
              <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}>
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h4">{getTierDisplayName(nextTier)} Plan</Text>
                  {features[nextTier as keyof typeof features].map((feature, index) => (
                    <Text key={index} variant="bodyMd" as="p">
                      {feature}
                    </Text>
                  ))}
                  <Button
                    variant="primary"
                    size="slim"
                    onClick={() => onUpgrade?.(nextTier)}
                  >
                    Upgrade to {getTierDisplayName(nextTier)}
                  </Button>
                </BlockStack>
              </Grid.Cell>
            </Grid>
          </BlockStack>
        </Box>
      </Card>
    );
  };

  return (
    <Layout>
      <Layout.Section>
        <BlockStack gap="400">
          {renderTierStatus()}
          {renderUpgradePrompts()}
          {renderRealTimeStatus()}
          {renderBasicKPIs()}
          {renderROASMetrics()}
          {renderTierComparison()}
        </BlockStack>
      </Layout.Section>
    </Layout>
  );
}

export default AnalyticsTier;
