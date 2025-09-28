import React, { useState, useEffect } from "react";
import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Select,
  Button,
  Badge,
  Box,
  Divider,
  Grid,
  ProgressBar,
  Banner,
  Icon,
  Layout,
} from "@shopify/polaris";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PerformanceInsightsProps {
  shopName: string;
  hasFeatureAccess?: boolean;
}

export function PerformanceInsights({ shopName, hasFeatureAccess = false }: PerformanceInsightsProps) {
  const [timeRange, setTimeRange] = useState('7d');
  const [compareMode, setCompareMode] = useState(false);

  // Mock performance data
  const performanceData = [
    { date: 'Mon', impressions: 12000, clicks: 480, conversions: 24, spend: 150, withAI: 28, withoutAI: 24 },
    { date: 'Tue', impressions: 15000, clicks: 600, conversions: 32, spend: 180, withAI: 35, withoutAI: 32 },
    { date: 'Wed', impressions: 13500, clicks: 540, conversions: 28, spend: 165, withAI: 32, withoutAI: 28 },
    { date: 'Thu', impressions: 16000, clicks: 720, conversions: 38, spend: 195, withAI: 42, withoutAI: 38 },
    { date: 'Fri', impressions: 18000, clicks: 810, conversions: 45, spend: 220, withAI: 52, withoutAI: 45 },
    { date: 'Sat', impressions: 20000, clicks: 900, conversions: 48, spend: 240, withAI: 56, withoutAI: 48 },
    { date: 'Sun', impressions: 17000, clicks: 765, conversions: 40, spend: 200, withAI: 46, withoutAI: 40 },
  ];

  const deviceBreakdown = [
    { name: 'Mobile', value: 65, color: '#5C6AC4' },
    { name: 'Desktop', value: 28, color: '#006FBB' },
    { name: 'Tablet', value: 7, color: '#47C1BF' },
  ];

  const topKeywords = [
    { keyword: 'summer sale', impressions: 25000, clicks: 1250, ctr: 5.0, cpc: 0.35, conversions: 65, position: 1.2 },
    { keyword: 'free shipping', impressions: 22000, clicks: 990, ctr: 4.5, cpc: 0.28, conversions: 48, position: 1.5 },
    { keyword: 'best deals', impressions: 18000, clicks: 720, ctr: 4.0, cpc: 0.42, conversions: 35, position: 2.1 },
    { keyword: 'discount code', impressions: 15000, clicks: 600, ctr: 4.0, cpc: 0.38, conversions: 28, position: 2.3 },
    { keyword: 'buy online', impressions: 12000, clicks: 420, ctr: 3.5, cpc: 0.45, conversions: 22, position: 2.8 },
  ];

  const aiImpact = {
    ctrImprovement: 23.5,
    conversionImprovement: 18.2,
    costReduction: 12.8,
    roasIncrease: 35.0,
    timeSaved: 15, // hours per week
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <BlockStack gap="600">
      {/* Header */}
      <Card>
        <InlineStack align="space-between">
          <BlockStack gap="200">
            <Text variant="headingLg" as="h2">Performance Insights</Text>
            <Text variant="bodyMd" tone="subdued">
              Deep analytics and AI performance tracking
            </Text>
          </BlockStack>
          <InlineStack gap="200">
            <Select
              label=""
              options={[
                { label: 'Last 7 days', value: '7d' },
                { label: 'Last 30 days', value: '30d' },
                { label: 'Last 90 days', value: '90d' },
                { label: 'This month', value: 'month' },
                { label: 'This year', value: 'year' },
              ]}
              value={timeRange}
              onChange={setTimeRange}
            />
            <Button
              pressed={compareMode}
              onClick={() => setCompareMode(!compareMode)}
            >
              Compare with/without AI
            </Button>
            <Button>Export Report</Button>
          </InlineStack>
        </InlineStack>
      </Card>

      {/* AI Impact Summary */}
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd">AI Optimization Impact</Text>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
              <BlockStack gap="100">
                <Text variant="headingLg" tone="success">
                  +{aiImpact.ctrImprovement}%
                </Text>
                <Text variant="bodySm" tone="subdued">CTR Improvement</Text>
                <ProgressBar progress={aiImpact.ctrImprovement} size="small" tone="success" />
              </BlockStack>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
              <BlockStack gap="100">
                <Text variant="headingLg" tone="success">
                  +{aiImpact.conversionImprovement}%
                </Text>
                <Text variant="bodySm" tone="subdued">More Conversions</Text>
                <ProgressBar progress={aiImpact.conversionImprovement} size="small" tone="success" />
              </BlockStack>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
              <BlockStack gap="100">
                <Text variant="headingLg" tone="success">
                  -{aiImpact.costReduction}%
                </Text>
                <Text variant="bodySm" tone="subdued">Cost Reduction</Text>
                <ProgressBar progress={aiImpact.costReduction} size="small" tone="success" />
              </BlockStack>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
              <BlockStack gap="100">
                <Text variant="headingLg" tone="success">
                  +{aiImpact.roasIncrease}%
                </Text>
                <Text variant="bodySm" tone="subdued">ROAS Increase</Text>
                <ProgressBar progress={aiImpact.roasIncrease} size="small" tone="success" />
              </BlockStack>
            </Grid.Cell>
          </Grid>
        </BlockStack>
      </Card>

      {/* Performance Chart */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <Text variant="headingMd">Performance Trend</Text>
            <InlineStack gap="200">
              <Badge>Impressions</Badge>
              <Badge tone="info">Clicks</Badge>
              <Badge tone="success">Conversions</Badge>
            </InlineStack>
          </InlineStack>

          <Box padding="400">
            <ResponsiveContainer width="100%" height={300}>
              {compareMode ? (
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="withAI" fill="#00a047" name="With AI" />
                  <Bar dataKey="withoutAI" fill="#c3c3c3" name="Without AI" />
                </BarChart>
              ) : (
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="conversions" stroke="#00a047" strokeWidth={2} />
                  <Line type="monotone" dataKey="clicks" stroke="#006fbb" strokeWidth={2} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </Box>
        </BlockStack>
      </Card>

      <Layout>
        {/* Device Breakdown */}
        <Layout.Section oneHalf>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd">Traffic by Device</Text>
              <Box padding="200">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={deviceBreakdown}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={(entry) => `${entry.name}: ${entry.value}%`}
                    >
                      {deviceBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                <Text variant="bodySm" tone="subdued">
                  💡 Mobile traffic converts 25% better with AI-optimized responsive ads
                </Text>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Top Keywords */}
        <Layout.Section oneHalf>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd">Top Performing Keywords</Text>
              <BlockStack gap="200">
                {topKeywords.slice(0, 5).map((kw, index) => (
                  <Box key={index} padding="200" background="bg-surface-secondary" borderRadius="200">
                    <InlineStack align="space-between">
                      <BlockStack gap="100">
                        <Text variant="bodyMd" fontWeight="bold">{kw.keyword}</Text>
                        <InlineStack gap="200">
                          <Text variant="bodySm" tone="subdued">
                            {formatNumber(kw.impressions)} imp
                          </Text>
                          <Badge>{kw.ctr}% CTR</Badge>
                        </InlineStack>
                      </BlockStack>
                      <BlockStack gap="100" align="end">
                        <Badge tone="success">{kw.conversions} conv</Badge>
                        <Text variant="bodySm">{formatCurrency(kw.cpc)} CPC</Text>
                      </BlockStack>
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Insights and Recommendations */}
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd">AI-Generated Insights</Text>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4 }}>
              <Box padding="300" background="bg-surface-success" borderRadius="200">
                <BlockStack gap="200">
                  <InlineStack gap="100">
                    <Text variant="headingSm">🎯 Opportunity</Text>
                  </InlineStack>
                  <Text variant="bodyMd">
                    Increase budget by 20% on weekends - conversion rate is 35% higher
                  </Text>
                  <Button size="slim">Apply Suggestion</Button>
                </BlockStack>
              </Box>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4 }}>
              <Box padding="300" background="bg-surface-warning" borderRadius="200">
                <BlockStack gap="200">
                  <InlineStack gap="100">
                    <Text variant="headingSm">⚠️ Alert</Text>
                  </InlineStack>
                  <Text variant="bodyMd">
                    "Summer sale" keyword CPC increased 45% - consider alternatives
                  </Text>
                  <Button size="slim">View Details</Button>
                </BlockStack>
              </Box>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4 }}>
              <Box padding="300" background="bg-surface-info" borderRadius="200">
                <BlockStack gap="200">
                  <InlineStack gap="100">
                    <Text variant="headingSm">💡 Trend</Text>
                  </InlineStack>
                  <Text variant="bodyMd">
                    Mobile traffic up 25% this week - optimize for mobile experience
                  </Text>
                  <Button size="slim">Learn More</Button>
                </BlockStack>
              </Box>
            </Grid.Cell>
          </Grid>
        </BlockStack>
      </Card>

      {/* Time Saved Banner */}
      <Banner
        title={`AI saved you ${aiImpact.timeSaved} hours this week`}
        tone="success"
      >
        <p>That's time you can invest in strategy and growth instead of manual optimization!</p>
      </Banner>
    </BlockStack>
  );
}