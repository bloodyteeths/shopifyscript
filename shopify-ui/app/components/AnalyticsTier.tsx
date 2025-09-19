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
  LegacyStack as Stack,
  Grid,
} from '@shopify/polaris';
import {
  ViewIcon,
  ChartLineIcon,
  RefreshIcon,
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
      } catch (error) {
        console.error('Real-time update failed:', error);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [tenant, isRealTimeEnabled, refreshInterval]);

  const getTierBadgeColor = (tierName: string) => {
    switch (tierName) {
      case 'starter': return 'info';
      case 'professional': return 'success';
      case 'enterprise': return 'attention';
      default: return 'info';
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
            <Stack>
              <Text variant="headingMd">Clicks</Text>
              <Text variant="heading2xl" as="h2">
                {formatNumber(kpi.clicks)}
              </Text>
              <Text variant="bodyMd" color="subdued">
                Total clicks
              </Text>
            </Stack>
          </Card>
        </Grid.Cell>

        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2, lg: 2, xl: 2}}>
          <Card>
            <Stack>
              <Text variant="headingMd">Cost</Text>
              <Text variant="heading2xl" as="h2">
                {formatCurrency(kpi.cost)}
              </Text>
              <Text variant="bodyMd" color="subdued">
                Total spend
              </Text>
            </Stack>
          </Card>
        </Grid.Cell>

        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2, lg: 2, xl: 2}}>
          <Card>
            <Stack>
              <Text variant="headingMd">Conversions</Text>
              <Text variant="heading2xl" as="h2">
                {formatNumber(kpi.conversions)}
              </Text>
              <Text variant="bodyMd" color="subdued">
                Total conversions
              </Text>
            </Stack>
          </Card>
        </Grid.Cell>

        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2, lg: 2, xl: 2}}>
          <Card>
            <Stack>
              <Text variant="headingMd">CTR</Text>
              <Text variant="heading2xl" as="h2">
                {(kpi.ctr * 100).toFixed(2)}%
              </Text>
              <Text variant="bodyMd" color="subdued">
                Click-through rate
              </Text>
            </Stack>
          </Card>
        </Grid.Cell>

        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2, lg: 2, xl: 2}}>
          <Card>
            <Stack>
              <Text variant="headingMd">CPC</Text>
              <Text variant="heading2xl" as="h2">
                {formatCurrency(kpi.cpc)}
              </Text>
              <Text variant="bodyMd" color="subdued">
                Cost per click
              </Text>
            </Stack>
          </Card>
        </Grid.Cell>

        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 2, lg: 2, xl: 2}}>
          <Card>
            <Stack>
              <Text variant="headingMd">CPA</Text>
              <Text variant="heading2xl" as="h2">
                {formatCurrency(kpi.cpa)}
              </Text>
              <Text variant="bodyMd" color="subdued">
                Cost per acquisition
              </Text>
            </Stack>
          </Card>
        </Grid.Cell>
      </Grid>
    );
  };

  const renderROASMetrics = () => {
    if (!data.roas?.basic) return null;

    const { basic, advanced } = data.roas;

    return (
      <Card sectioned>
        <Stack>
          <Stack horizontal alignment="center">
            <Text variant="headingLg">ROAS Analytics</Text>
            <Badge status={getTierBadgeColor(tier) as any}>
              {getTierDisplayName(tier)}
            </Badge>
          </Stack>

          <Grid>
            <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 4, lg: 4, xl: 4}}>
              <Stack>
                <Text variant="headingMd">Basic ROAS</Text>
                <Text variant="heading2xl" as="h2" color={basic.roas >= 2 ? 'success' : 'critical'}>
                  {basic.roas.toFixed(2)}x
                </Text>
                <Text variant="bodyMd" color="subdued">
                  Revenue: {formatCurrency(basic.revenue)}
                </Text>
                <Text variant="bodyMd" color="subdued">
                  Profit: {formatCurrency(basic.profit)}
                </Text>
              </Stack>
            </Grid.Cell>

            {advanced && tier !== 'starter' && (
              <>
                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 4, lg: 4, xl: 4}}>
                  <Stack>
                    <Stack horizontal alignment="center">
                      <Text variant="headingMd">LTV ROAS</Text>
                      <Tooltip content="Lifetime Value based ROAS calculation">
                        <Button plain monochrome icon={ViewIcon} />
                      </Tooltip>
                    </Stack>
                    <Text variant="heading2xl" as="h2" color={advanced.ltvRoas >= 4 ? 'success' : 'warning'}>
                      {advanced.ltvRoas.toFixed(2)}x
                    </Text>
                    <Text variant="bodyMd" color="subdued">
                      Long-term profitability
                    </Text>
                  </Stack>
                </Grid.Cell>

                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 4, lg: 4, xl: 4}}>
                  <Stack>
                    <Stack horizontal alignment="center">
                      <Text variant="headingMd">Margin ROAS</Text>
                      <Tooltip content="Profit margin adjusted ROAS">
                        <Button plain monochrome icon={ChartLineIcon} />
                      </Tooltip>
                    </Stack>
                    <Text variant="heading2xl" as="h2">
                      {advanced.marginRoas.toFixed(2)}x
                    </Text>
                    <Text variant="bodyMd" color="subdued">
                      After-margin profitability
                    </Text>
                  </Stack>
                </Grid.Cell>
              </>
            )}
          </Grid>
        </Stack>
      </Card>
    );
  };

  const renderRealTimeStatus = () => {
    if (!isRealTimeEnabled) return null;

    return (
      <Card sectioned>
        <Stack horizontal alignment="center" distribution="equalSpacing">
          <Stack horizontal alignment="center">
            <div style={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              backgroundColor: '#00A47C',
              animation: 'pulse 2s infinite'
            }} />
            <Text variant="bodyMd" color="success">
              Real-time updates active
            </Text>
          </Stack>
          <Stack horizontal alignment="center">
            <Text variant="bodySm" color="subdued">
              Last update: {lastUpdate.toLocaleTimeString()}
            </Text>
            <Button 
              plain 
              onClick={onDataRefresh}
              loading={loading}
              disabled={loading}
            >
              Refresh
            </Button>
          </Stack>
        </Stack>
      </Card>
    );
  };

  const renderUpgradePrompts = () => {
    if (!data.upgradePrompts || data.upgradePrompts.length === 0) return null;

    return (
      <Stack sectioned>
        {data.upgradePrompts.map((prompt, index) => (
          <Banner
            key={index}
            status="info"
            action={{
              content: `Upgrade to ${getTierDisplayName(prompt.requiredTier)}`,
              onAction: () => onUpgrade?.(prompt.requiredTier),
            }}
          >
            <Text variant="bodyMd">{prompt.message}</Text>
          </Banner>
        ))}
      </Stack>
    );
  };

  const renderTierStatus = () => (
    <Card sectioned>
      <Stack horizontal alignment="center" distribution="equalSpacing">
        <Stack horizontal alignment="center">
          <Text variant="headingMd">Analytics Tier</Text>
          <Badge status={getTierBadgeColor(tier) as any}>
            {getTierDisplayName(tier)}
          </Badge>
        </Stack>
        
        <Stack horizontal alignment="center">
          {tier !== 'enterprise' && (
            <Button
              primary
              onClick={() => onUpgrade?.(tier === 'starter' ? 'professional' : 'enterprise')}
            >
              {tier === 'starter' ? 'Upgrade to Professional' : 'Upgrade to Enterprise'}
            </Button>
          )}
          
          <Button
            plain
            icon={SettingsMajor}
            onClick={() => {/* Navigate to billing settings */}}
          >
            Manage Plan
          </Button>
        </Stack>
      </Stack>
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
      <Card sectioned>
        <Stack>
          <Text variant="headingMd">Unlock More Analytics Features</Text>
          <Grid>
            <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}>
              <Stack>
                <Text variant="headingXs">Current Plan: {getTierDisplayName(tier)}</Text>
                {features[tier as keyof typeof features].map((feature, index) => (
                  <Text key={index} variant="bodyMd" color="subdued">
                    ✓ {feature}
                  </Text>
                ))}
              </Stack>
            </Grid.Cell>
            <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}>
              <Stack>
                <Text variant="headingXs">{getTierDisplayName(nextTier)} Plan</Text>
                {features[nextTier as keyof typeof features].map((feature, index) => (
                  <Text key={index} variant="bodyMd">
                    ✓ {feature}
                  </Text>
                ))}
                <Button
                  primary
                  size="slim"
                  onClick={() => onUpgrade?.(nextTier)}
                >
                  Upgrade to {getTierDisplayName(nextTier)}
                </Button>
              </Stack>
            </Grid.Cell>
          </Grid>
        </Stack>
      </Card>
    );
  };

  return (
    <Layout>
      <Layout.Section>
        <Stack>
          {renderTierStatus()}
          {renderUpgradePrompts()}
          {renderRealTimeStatus()}
          {renderBasicKPIs()}
          {renderROASMetrics()}
          {renderTierComparison()}
        </Stack>
      </Layout.Section>
    </Layout>
  );
}

export default AnalyticsTier;