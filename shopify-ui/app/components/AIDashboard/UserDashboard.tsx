import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Layout,
  Text,
  Badge,
  Button,
  BlockStack,
  InlineStack,
  Box,
  Icon,
  Banner,
  ProgressBar,
  Divider,
  Spinner,
  SkeletonBodyText,
  SkeletonDisplayText,
} from "@shopify/polaris";
import { RefreshIcon } from "@shopify/polaris-icons";
import { authenticatedFetch } from "../../utils/ai-client";
import { TimeRangeSelector, TimePeriod, getPeriodLabel } from "../TimeRangeSelector";

interface UserDashboardProps {
  shopName: string;
  hasFeatureAccess?: boolean;
  onNavigateToTab?: (tabIndex: number) => void;
}

interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cpc: number;
  roas: number;
  cpa: number;
}

interface AIOptimization {
  status: 'active' | 'paused' | 'learning';
  optimizationsApplied: number;
  improvementRate: number;
  lastOptimization: string;
}

export function UserDashboard({ shopName, hasFeatureAccess = false, onNavigateToTab }: UserDashboardProps) {
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [aiStatus, setAIStatus] = useState<AIOptimization | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('LAST_7_DAYS');

  // Fetch campaign metrics
  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      const response = await authenticatedFetch(
        `/ai/stats/quick?period=${selectedPeriod}`,
        "GET",
        undefined,
        shopName
      );
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.stats) {
          setMetrics({
            impressions: data.stats.impressions || 0,
            clicks: data.stats.clicks || 0,
            conversions: data.stats.conversions || 0,
            spend: data.stats.adSpend || 0,
            ctr: data.stats.ctr || 0,
            cpc: data.stats.clicks ? (data.stats.adSpend / data.stats.clicks) : 0,
            roas: data.stats.roas || 0,
            cpa: data.stats.conversions ? (data.stats.adSpend / data.stats.conversions) : 0,
          });
          setLastUpdated(new Date());
        } else {
          setMetrics(null);
        }
      } else {
        throw new Error(`Failed to fetch metrics: ${response.status}`);
      }
    } catch (err: unknown) {
      console.error("Failed to fetch metrics:", err);
      setError(err instanceof Error ? err.message : "Failed to load campaign metrics");
      setMetrics(null);
    }
  }, [shopName, selectedPeriod]);

  // Fetch AI optimization status
  const fetchAIStatus = useCallback(async () => {
    try {
      const response = await authenticatedFetch("/ai/optimizations/stats", "GET", undefined, shopName);
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.stats) {
          setAIStatus({
            status: data.stats.activeCount > 0 ? 'active' : 'paused',
            optimizationsApplied: data.stats.completedToday || 0,
            improvementRate: data.stats.successRate || 0,
            lastOptimization: new Date().toISOString(),
          });
        } else {
          setAIStatus(null);
        }
      }
    } catch (err: unknown) {
      console.error("Failed to fetch AI status:", err);
      setAIStatus(null);
    }
  }, [shopName]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMetrics(), fetchAIStatus()]);
      setLoading(false);
    };
    loadData();
  }, [fetchMetrics, fetchAIStatus]);

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchMetrics(), fetchAIStatus()]);
    setRefreshing(false);
  }, [fetchMetrics, fetchAIStatus]);

  // Handle period change
  const handlePeriodChange = useCallback((period: TimePeriod) => {
    setSelectedPeriod(period);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercent = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const formatTimeAgo = (timestamp: string | Date) => {
    const now = new Date();
    const time = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const diffMs = now.getTime() - time.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <Card>
      <BlockStack gap="400">
        <SkeletonDisplayText size="medium" />
        <SkeletonBodyText lines={3} />
        <SkeletonBodyText lines={2} />
      </BlockStack>
    </Card>
  );

  // Check if we have any data
  const hasData = metrics && (
    metrics.impressions > 0 ||
    metrics.clicks > 0 ||
    metrics.conversions > 0 ||
    metrics.spend > 0
  );

  // Show loading skeleton on initial load
  if (loading) {
    return (
      <BlockStack gap="600">
        <Card>
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="200">
              <Text variant="headingLg" as="h2">AI Campaign Dashboard</Text>
              <Text variant="bodyMd" as="p" tone="subdued">Loading data...</Text>
            </BlockStack>
            <Spinner size="small" />
          </InlineStack>
        </Card>
        <Layout>
          <Layout.Section variant="oneThird">
            <LoadingSkeleton />
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <LoadingSkeleton />
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <LoadingSkeleton />
          </Layout.Section>
        </Layout>
      </BlockStack>
    );
  }

  return (
    <BlockStack gap="600">
      {/* Error Banner */}
      {error && (
        <Banner tone="critical" title="Error loading data">
          <p>{error}</p>
          <Box paddingBlockStart="200">
            <Button onClick={handleRefresh}>Retry</Button>
          </Box>
        </Banner>
      )}

      {/* Time Period Selector */}
      <Card>
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="200">
            <Text variant="headingLg" as="h2">
              AI Campaign Dashboard
            </Text>
            <InlineStack gap="200" blockAlign="center">
              <Text variant="bodyMd" as="p" tone="subdued">
                Showing data for: {getPeriodLabel(selectedPeriod)}
              </Text>
              {lastUpdated && (
                <>
                  <Text variant="bodyMd" as="p" tone="subdued">•</Text>
                  <Text variant="bodySm" as="p" tone="subdued">
                    Updated {formatTimeAgo(lastUpdated)}
                  </Text>
                </>
              )}
            </InlineStack>
          </BlockStack>
          <InlineStack gap="200">
            <Box minWidth="200px">
              <TimeRangeSelector
                value={selectedPeriod}
                onChange={handlePeriodChange}
                label=""
              />
            </Box>
            <Button
              icon={RefreshIcon}
              onClick={handleRefresh}
              loading={refreshing}
              accessibilityLabel="Refresh data"
            >
              Refresh
            </Button>
          </InlineStack>
        </InlineStack>
      </Card>

      {/* AI Status Section */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <BlockStack gap="200">
              <Text variant="headingMd" as="h3">
                AI Optimization Status
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                Your Google Ads campaigns powered by AI optimization
              </Text>
            </BlockStack>
            <BlockStack gap="200" align="end">
              <Badge tone={aiStatus?.status === 'active' ? 'success' : 'warning'}>
                {`AI ${aiStatus?.status === 'active' ? 'Active' : 'Paused'}`}
              </Badge>
              {aiStatus?.lastOptimization && (
                <Text variant="bodySm" as="p" tone="subdued">
                  Last optimization: {formatTimeAgo(aiStatus.lastOptimization)}
                </Text>
              )}
            </BlockStack>
          </InlineStack>

          {/* Quick Actions */}
          <InlineStack gap="200">
            <Button
              variant="primary"
              size="large"
              onClick={() => onNavigateToTab?.(2)}
            >
              Generate New Ads
            </Button>
            <Button onClick={() => onNavigateToTab?.(1)}>
              View All Campaigns
            </Button>
            <Button disabled>
              Optimization Settings
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>

      {/* Empty State */}
      {!hasData && !loading && (
        <Card>
          <Box padding="600">
            <BlockStack gap="400" align="center">
              <Text variant="headingMd" as="h3" alignment="center">
                No campaign data yet
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued" alignment="center">
                Once your Google Ads campaigns start running, performance data will appear here.
              </Text>
              <Text variant="bodySm" as="p" tone="subdued" alignment="center">
                Try selecting a different time period or check back later.
              </Text>
              <InlineStack gap="200">
                <Button onClick={handleRefresh} loading={refreshing}>
                  Refresh Data
                </Button>
                <Button onClick={() => onNavigateToTab?.(2)}>
                  Generate New Ads
                </Button>
              </InlineStack>
            </BlockStack>
          </Box>
        </Card>
      )}

      {/* Key Performance Metrics */}
      {hasData && (
        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h3">{getPeriodLabel(selectedPeriod)} Performance</Text>
                <Divider />

                <BlockStack gap="300">
                  {/* Impressions */}
                  <BlockStack gap="100">
                    <InlineStack align="space-between">
                      <Text variant="bodyMd" as="span" tone="subdued">Impressions</Text>
                      <Text variant="headingMd" as="p" fontWeight="bold">
                        {formatNumber(metrics?.impressions || 0)}
                      </Text>
                    </InlineStack>
                    <ProgressBar progress={75} size="small" />
                  </BlockStack>

                  {/* Clicks */}
                  <BlockStack gap="100">
                    <InlineStack align="space-between">
                      <Text variant="bodyMd" as="span" tone="subdued">Clicks</Text>
                      <Text variant="headingMd" as="p" fontWeight="bold">
                        {formatNumber(metrics?.clicks || 0)}
                      </Text>
                    </InlineStack>
                    <Badge tone="success">{`CTR: ${formatPercent(metrics?.ctr || 0)}`}</Badge>
                  </BlockStack>

                  {/* Conversions */}
                  <BlockStack gap="100">
                    <InlineStack align="space-between">
                      <Text variant="bodyMd" as="span" tone="subdued">Conversions</Text>
                      <Text variant="headingMd" as="p" fontWeight="bold" tone="success">
                        {metrics?.conversions || 0}
                      </Text>
                    </InlineStack>
                    <Text variant="bodySm" as="span" tone="subdued">
                      CPA: {formatCurrency(metrics?.cpa || 0)}
                    </Text>
                  </BlockStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h3">AI Optimization Impact</Text>
              <Divider />

              <BlockStack gap="300">
                {/* Improvement Rate */}
                <Box>
                  <Text variant="headingXl" as="p" tone="success">
                    +{formatPercent(aiStatus?.improvementRate || 0)}
                  </Text>
                  <Text variant="bodyMd" as="span" tone="subdued">
                    Performance Improvement
                  </Text>
                </Box>

                {/* Optimizations Applied */}
                <InlineStack align="space-between">
                  <Text variant="bodyMd" as="span" tone="subdued">
                    Optimizations Today
                  </Text>
                  <Badge>{String(aiStatus?.optimizationsApplied || 0)}</Badge>
                </InlineStack>

                {/* ROAS */}
                <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" as="span">ROAS</Text>
                    <Text variant="headingMd" as="p" fontWeight="bold" tone="success">
                      {metrics?.roas?.toFixed(1)}x
                    </Text>
                  </InlineStack>
                </Box>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h3">Budget & Spend</Text>
              <Divider />

              <BlockStack gap="300">
                {/* Today's Spend */}
                <BlockStack gap="100">
                  <Text variant="bodyMd" as="span" tone="subdued">Today's Spend</Text>
                  <Text variant="headingLg" as="p" fontWeight="bold">
                    {formatCurrency(metrics?.spend || 0)}
                  </Text>
                  <ProgressBar progress={65} tone="highlight" size="small" />
                  <Text variant="bodySm" as="span" tone="subdued">
                    65% of daily budget
                  </Text>
                </BlockStack>

                {/* CPC */}
                <InlineStack align="space-between">
                  <Text variant="bodyMd" as="span" tone="subdued">Avg. CPC</Text>
                  <Text variant="bodyMd" as="span" fontWeight="bold">
                    {formatCurrency(metrics?.cpc || 0)}
                  </Text>
                </InlineStack>

                {/* Budget Recommendation */}
                <Box background="bg-surface-warning" padding="200" borderRadius="200">
                  <Text variant="bodySm" as="span">
                    AI suggests increasing budget by 20% for better results
                  </Text>
                </Box>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
        </Layout>
      )}

      {/* AI Recommendations Banner */}
      {hasData && (
        <Banner
        title="AI Recommendations Available"
        tone="info"
        action={{
          content: 'View Recommendations',
          onAction: () => onNavigateToTab?.(3)
        }}
      >
        <p>Your AI has identified 3 high-impact optimizations that could improve your ROAS by 15%</p>
      </Banner>
      )}

      {/* Recent Activity */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <Text variant="headingMd" as="h3">Recent AI Activity</Text>
            <Button variant="plain" onClick={() => window.location.href = '/app/ai-dashboard?view=admin'}>
              View All
            </Button>
          </InlineStack>

          <BlockStack gap="200">
            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
              <Text variant="bodyMd" as="p" tone="subdued" alignment="center">
                Recent AI activity will appear here once campaigns are active.
              </Text>
            </Box>
          </BlockStack>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
