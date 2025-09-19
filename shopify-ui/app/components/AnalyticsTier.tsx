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
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 16,
        marginBottom: 24,
      }}>
        <div style={{
          background: "white",
          border: "1px solid #e3e3e3",
          borderRadius: 8,
          padding: 16,
          boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)",
        }}>
          <div style={{ color: "#616161", fontSize: 12, marginBottom: 4, fontWeight: "500" }}>
            Clicks
          </div>
          <div style={{
            fontSize: 24,
            fontWeight: "600",
            color: "#202223",
            marginBottom: 4
          }}>
            {formatNumber(kpi.clicks)}
          </div>
          <div style={{ color: "#616161", fontSize: 11 }}>
            Total clicks
          </div>
        </div>

        <div style={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          transition: "all 0.3s ease"
        }}>
          <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 8, fontWeight: "500" }}>
            Cost
          </div>
          <div style={{ 
            fontSize: 32, 
            fontWeight: "700", 
            color: "#1f2937", 
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
            WebkitBackgroundClip: "text", 
            WebkitTextFillColor: "transparent",
            marginBottom: 4
          }}>
            {formatCurrency(kpi.cost)}
          </div>
          <div style={{ color: "#6b7280", fontSize: 12 }}>
            Total spend
          </div>
        </div>

        <div style={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          transition: "all 0.3s ease"
        }}>
          <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 8, fontWeight: "500" }}>
            Conversions
          </div>
          <div style={{ 
            fontSize: 32, 
            fontWeight: "700", 
            color: "#1f2937", 
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
            WebkitBackgroundClip: "text", 
            WebkitTextFillColor: "transparent",
            marginBottom: 4
          }}>
            {formatNumber(kpi.conversions)}
          </div>
          <div style={{ color: "#6b7280", fontSize: 12 }}>
            Total conversions
          </div>
        </div>

        <div style={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          transition: "all 0.3s ease"
        }}>
          <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 8, fontWeight: "500" }}>
            CTR
          </div>
          <div style={{ 
            fontSize: 32, 
            fontWeight: "700", 
            color: "#1f2937", 
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
            WebkitBackgroundClip: "text", 
            WebkitTextFillColor: "transparent",
            marginBottom: 4
          }}>
            {(kpi.ctr * 100).toFixed(2)}%
          </div>
          <div style={{ color: "#6b7280", fontSize: 12 }}>
            Click-through rate
          </div>
        </div>

        <div style={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          transition: "all 0.3s ease"
        }}>
          <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 8, fontWeight: "500" }}>
            CPC
          </div>
          <div style={{ 
            fontSize: 32, 
            fontWeight: "700", 
            color: "#1f2937", 
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
            WebkitBackgroundClip: "text", 
            WebkitTextFillColor: "transparent",
            marginBottom: 4
          }}>
            {formatCurrency(kpi.cpc)}
          </div>
          <div style={{ color: "#6b7280", fontSize: 12 }}>
            Cost per click
          </div>
        </div>

        <div style={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          transition: "all 0.3s ease"
        }}>
          <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 8, fontWeight: "500" }}>
            CPA
          </div>
          <div style={{ 
            fontSize: 32, 
            fontWeight: "700", 
            color: "#1f2937", 
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
            WebkitBackgroundClip: "text", 
            WebkitTextFillColor: "transparent",
            marginBottom: 4
          }}>
            {formatCurrency(kpi.cpa)}
          </div>
          <div style={{ color: "#6b7280", fontSize: 12 }}>
            Cost per acquisition
          </div>
        </div>
      </div>
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
            icon={SettingsIcon}
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
      <div style={{
        background: "white",
        border: "1px solid #e3e3e3",
        borderRadius: 8,
        padding: 20,
        boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)",
        marginBottom: 24,
      }}>
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ 
            fontSize: 24, 
            fontWeight: "700", 
            color: "#1f2937", 
            margin: "0 0 8px 0",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            Unlock More Analytics Features
          </h3>
          <p style={{ color: "#6b7280", fontSize: 16, margin: 0 }}>
            Upgrade to access advanced analytics and real-time insights
          </p>
        </div>
        
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 32,
        }}>
          <div style={{
            background: "#f6f6f7",
            border: "1px solid #e3e3e3",
            borderRadius: 16,
            padding: 24,
          }}>
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ 
                fontSize: 18, 
                fontWeight: "600", 
                color: "#1f2937", 
                margin: "0 0 8px 0" 
              }}>
                Current Plan: {getTierDisplayName(tier)}
              </h4>
              <div style={{
                display: "inline-block",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                padding: "4px 12px",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: "600"
              }}>
                {getTierDisplayName(tier)}
              </div>
            </div>
            <div>
              {features[tier as keyof typeof features].map((feature, index) => (
                <div key={index} style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 8,
                  color: "#6b7280",
                  fontSize: 14
                }}>
                  <span style={{ 
                    color: "#10b981", 
                    marginRight: 8, 
                    fontWeight: "bold" 
                  }}>✓</span>
                  {feature}
                </div>
              ))}
            </div>
          </div>
          
          <div style={{
            background: "#f0fbf8",
            border: "1px solid #008060",
            borderRadius: 16,
            padding: 24,
            position: "relative"
          }}>
            <div style={{
              position: "absolute",
              top: -8,
              right: 16,
              background: "#008060",
              color: "white",
              padding: "4px 12px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: "600"
            }}>
              RECOMMENDED
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ 
                fontSize: 18, 
                fontWeight: "600", 
                color: "#1f2937", 
                margin: "0 0 8px 0" 
              }}>
                {getTierDisplayName(nextTier)} Plan
              </h4>
              <div style={{
                display: "inline-block",
                background: "#008060",
                color: "white",
                padding: "4px 12px",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: "600"
              }}>
                {getTierDisplayName(nextTier)}
              </div>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              {features[nextTier as keyof typeof features].map((feature, index) => (
                <div key={index} style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 8,
                  color: "#1f2937",
                  fontSize: 14,
                  fontWeight: "500"
                }}>
                  <span style={{ 
                    color: "#10b981", 
                    marginRight: 8, 
                    fontWeight: "bold" 
                  }}>✓</span>
                  {feature}
                </div>
              ))}
            </div>
            
            <button
              onClick={() => onUpgrade?.(nextTier)}
              style={{
                background: "#008060",
                color: "white",
                border: "none",
                padding: "12px 24px",
                borderRadius: 12,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: "600",
                width: "100%",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.4)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)";
              }}
            >
              Upgrade to {getTierDisplayName(nextTier)}
            </button>
          </div>
        </div>
      </div>
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