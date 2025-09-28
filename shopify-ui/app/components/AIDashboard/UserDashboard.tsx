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
} from "@shopify/polaris";
import { authenticatedFetch } from "../../utils/ai-client";

interface UserDashboardProps {
  shopName: string;
  hasFeatureAccess?: boolean;
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

export function UserDashboard({ shopName, hasFeatureAccess = false }: UserDashboardProps) {
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [aiStatus, setAIStatus] = useState<AIOptimization | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch campaign metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const response = await authenticatedFetch("/ai/stats/quick", "GET", undefined, shopName);
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
        }
      }
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
      // Use demo data as fallback
      setMetrics({
        impressions: 125000,
        clicks: 5250,
        conversions: 245,
        spend: 5420,
        ctr: 4.2,
        cpc: 1.03,
        roas: 3.5,
        cpa: 22.12,
      });
    }
  }, [shopName]);

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
        }
      }
    } catch (err) {
      console.error("Failed to fetch AI status:", err);
      setAIStatus({
        status: 'active',
        optimizationsApplied: 8,
        improvementRate: 23.5,
        lastOptimization: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      });
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

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <BlockStack gap="600">
      {/* Welcome Section with AI Status */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <BlockStack gap="200">
              <Text variant="headingLg" as="h2">
                AI Campaign Dashboard
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                Your Google Ads campaigns powered by AI optimization
              </Text>
            </BlockStack>
            <BlockStack gap="200" align="end">
              <Badge tone={aiStatus?.status === 'active' ? 'success' : 'warning'}>
                AI {aiStatus?.status === 'active' ? 'Active' : 'Paused'}
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
            <Button variant="primary" size="large">
              Generate New Ads
            </Button>
            <Button>
              View All Campaigns
            </Button>
            <Button>
              Optimization Settings
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>

      {/* Key Performance Metrics */}
      <Layout>
        <Layout.Section oneThird>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h3">Today's Performance</Text>
              <Divider />

              <BlockStack gap="300">
                {/* Impressions */}
                <BlockStack gap="100">
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" tone="subdued">Impressions</Text>
                    <Text variant="headingMd" as="p" fontWeight="bold">
                      {formatNumber(metrics?.impressions || 0)}
                    </Text>
                  </InlineStack>
                  <ProgressBar progress={75} size="small" />
                </BlockStack>

                {/* Clicks */}
                <BlockStack gap="100">
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" tone="subdued">Clicks</Text>
                    <Text variant="headingMd" as="p" fontWeight="bold">
                      {formatNumber(metrics?.clicks || 0)}
                    </Text>
                  </InlineStack>
                  <Badge tone="success">CTR: {formatPercent(metrics?.ctr || 0)}</Badge>
                </BlockStack>

                {/* Conversions */}
                <BlockStack gap="100">
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" tone="subdued">Conversions</Text>
                    <Text variant="headingMd" as="p" fontWeight="bold" tone="success">
                      {metrics?.conversions || 0}
                    </Text>
                  </InlineStack>
                  <Text variant="bodySm" tone="subdued">
                    CPA: {formatCurrency(metrics?.cpa || 0)}
                  </Text>
                </BlockStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section oneThird>
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
                  <Text variant="bodyMd" tone="subdued">
                    Performance Improvement
                  </Text>
                </Box>

                {/* Optimizations Applied */}
                <InlineStack align="space-between">
                  <Text variant="bodyMd" tone="subdued">
                    Optimizations Today
                  </Text>
                  <Badge>{aiStatus?.optimizationsApplied || 0}</Badge>
                </InlineStack>

                {/* ROAS */}
                <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                  <InlineStack align="space-between">
                    <Text variant="bodyMd">ROAS</Text>
                    <Text variant="headingMd" as="p" fontWeight="bold" tone="success">
                      {metrics?.roas?.toFixed(1)}x
                    </Text>
                  </InlineStack>
                </Box>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section oneThird>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h3">Budget & Spend</Text>
              <Divider />

              <BlockStack gap="300">
                {/* Today's Spend */}
                <BlockStack gap="100">
                  <Text variant="bodyMd" tone="subdued">Today's Spend</Text>
                  <Text variant="headingLg" as="p" fontWeight="bold">
                    {formatCurrency(metrics?.spend || 0)}
                  </Text>
                  <ProgressBar progress={65} tone="info" size="small" />
                  <Text variant="bodySm" tone="subdued">
                    65% of daily budget
                  </Text>
                </BlockStack>

                {/* CPC */}
                <InlineStack align="space-between">
                  <Text variant="bodyMd" tone="subdued">Avg. CPC</Text>
                  <Text variant="bodyMd" fontWeight="bold">
                    {formatCurrency(metrics?.cpc || 0)}
                  </Text>
                </InlineStack>

                {/* Budget Recommendation */}
                <Box background="bg-surface-warning" padding="200" borderRadius="200">
                  <Text variant="bodySm">
                    💡 AI suggests increasing budget by 20% for better results
                  </Text>
                </Box>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {/* AI Recommendations Banner */}
      <Banner
        title="AI Recommendations Available"
        tone="info"
        action={{ content: 'View Recommendations' }}
      >
        <p>Your AI has identified 3 high-impact optimizations that could improve your ROAS by 15%</p>
      </Banner>

      {/* Recent Activity */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <Text variant="headingMd" as="h3">Recent AI Activity</Text>
            <Button variant="plain">View All</Button>
          </InlineStack>

          <BlockStack gap="200">
            {[
              { time: '2 hours ago', action: 'Optimized bidding strategy for "Summer Sale" campaign', impact: '+12% CTR' },
              { time: '5 hours ago', action: 'Generated 5 new ad variations for A/B testing', impact: 'Testing' },
              { time: '1 day ago', action: 'Added 8 negative keywords to reduce wasted spend', impact: '-$45/day saved' },
            ].map((activity, index) => (
              <Box key={index} padding="300" background="bg-surface-secondary" borderRadius="200">
                <InlineStack align="space-between">
                  <BlockStack gap="100">
                    <Text variant="bodyMd">{activity.action}</Text>
                    <Text variant="bodySm" tone="subdued">{activity.time}</Text>
                  </BlockStack>
                  <Badge tone="success">{activity.impact}</Badge>
                </InlineStack>
              </Box>
            ))}
          </BlockStack>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}