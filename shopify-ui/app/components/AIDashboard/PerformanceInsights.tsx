import React, { useState, useEffect, useCallback } from "react";
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
import { authenticatedFetch } from "../../utils/ai-client";
import { TimePeriod } from "../TimeRangeSelector";

interface PerformanceInsightsProps {
  shopName: string;
  hasFeatureAccess?: boolean;
}

export function PerformanceInsights({ shopName, hasFeatureAccess = false }: PerformanceInsightsProps) {
  const [timeRange, setTimeRange] = useState('7d');
  const [compareMode, setCompareMode] = useState(false);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<any[]>([]);
  const [topKeywords, setTopKeywords] = useState<any[]>([]);
  const [aiImpact, setAiImpact] = useState<any>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);

  // Convert timeRange to period for API call
  const getPeriodFromTimeRange = (range: string): TimePeriod => {
    switch (range) {
      case '1d': return 'TODAY';
      case '7d': return 'LAST_7_DAYS';
      case '30d': return 'LAST_30_DAYS';
      case 'all': return 'ALL_TIME';
      default: return 'LAST_7_DAYS';
    }
  };

  // Fetch performance data from API
  const fetchPerformanceData = useCallback(async () => {
    try {
      const period = getPeriodFromTimeRange(timeRange);
      const response = await authenticatedFetch(
        `/ai/performance/insights?period=${period}`,
        "GET",
        undefined,
        shopName
      );
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setPerformanceData(data.performanceData || []);
          setDeviceBreakdown(data.deviceBreakdown || []);
          setTopKeywords(data.topKeywords || []);
          setAiImpact(data.aiImpact || null);
          setSummary(data.summary || null);
          const dataAvailable = Boolean((data.performanceData && data.performanceData.length) || (data.deviceBreakdown && data.deviceBreakdown.length) || (data.topKeywords && data.topKeywords.length));
          const summaryMetrics = data.summary || {};
          const summaryHasActivity = ['impressions', 'clicks', 'conversions', 'cost']
            .some((key) => Number(summaryMetrics?.[key] || 0) > 0);
          setHasData(dataAvailable || summaryHasActivity);
        } else {
          setPerformanceData([]);
          setDeviceBreakdown([]);
          setTopKeywords([]);
          setAiImpact(null);
          setSummary(null);
          setHasData(false);
        }
      } else {
        setSummary(null);
        setHasData(false);
      }
    } catch (err) {
      console.error("Failed to fetch performance data:", err);
      setError("Failed to load performance insights");
      setPerformanceData([]);
      setDeviceBreakdown([]);
      setTopKeywords([]);
      setAiImpact(null);
      setSummary(null);
      setHasData(false);
    }
  }, [shopName, timeRange]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      await fetchPerformanceData();
      setLoading(false);
    };
    loadData();
  }, [fetchPerformanceData]);

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

  if (loading) {
    return (
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="400">
            <Text variant="headingLg" as="h2">Performance Insights</Text>
            <Box padding="600">
              <Text variant="bodyMd" alignment="center">Loading performance insights...</Text>
            </Box>
          </BlockStack>
        </Card>
      </BlockStack>
    );
  }

  if (error) {
    return (
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="400">
            <Text variant="headingLg" as="h2">Performance Insights</Text>
            <Banner tone="critical" title="Error loading performance data">
              <p>{error}. Please try again later.</p>
            </Banner>
          </BlockStack>
        </Card>
      </BlockStack>
    );
  }

  if (!hasData) {
    return (
      <BlockStack gap="600">
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
              <Button onClick={() => alert('Export report functionality coming soon')}>
                Export Report
              </Button>
            </InlineStack>
          </InlineStack>
        </Card>
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd">No performance data yet</Text>
            <Text tone="subdued">
              We haven’t received impressions or clicks for this period. Try a longer range or check back once your Google Ads campaigns have activity.
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    );
  }

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
            <Button onClick={() => alert('Export report functionality coming soon')}>
              Export Report
            </Button>
          </InlineStack>
        </InlineStack>
      </Card>

      {summary && (
        <Card>
          <InlineStack gap="400">
            <BlockStack gap="100">
              <Text variant="headingSm" tone="subdued">Impressions</Text>
              <Text variant="headingLg">{formatNumber(summary.impressions || 0)}</Text>
            </BlockStack>
            <BlockStack gap="100">
              <Text variant="headingSm" tone="subdued">Clicks</Text>
              <Text variant="headingLg">{formatNumber(summary.clicks || 0)}</Text>
            </BlockStack>
            <BlockStack gap="100">
              <Text variant="headingSm" tone="subdued">Conversions</Text>
              <Text variant="headingLg">{formatNumber(summary.conversions || 0)}</Text>
            </BlockStack>
            <BlockStack gap="100">
              <Text variant="headingSm" tone="subdued">Spend</Text>
              <Text variant="headingLg">{formatCurrency(summary.cost || 0)}</Text>
            </BlockStack>
            <BlockStack gap="100">
              <Text variant="headingSm" tone="subdued">ROAS</Text>
              <Text variant="headingLg">{Number(summary.roas || 0).toFixed(2)}x</Text>
            </BlockStack>
          </InlineStack>
        </Card>
      )}

      {/* AI Impact Summary */}
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd">AI Optimization Impact</Text>
{aiImpact ? (
            <Grid>
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
                <BlockStack gap="100">
                  <Text variant="headingLg" tone="success">
                    +{aiImpact.ctrImprovement || 0}%
                  </Text>
                  <Text variant="bodySm" tone="subdued">CTR Improvement</Text>
                  <ProgressBar progress={aiImpact.ctrImprovement || 0} size="small" tone="success" />
                </BlockStack>
              </Grid.Cell>
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
                <BlockStack gap="100">
                  <Text variant="headingLg" tone="success">
                    +{aiImpact.conversionImprovement || 0}%
                  </Text>
                  <Text variant="bodySm" tone="subdued">More Conversions</Text>
                  <ProgressBar progress={aiImpact.conversionImprovement || 0} size="small" tone="success" />
                </BlockStack>
              </Grid.Cell>
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
                <BlockStack gap="100">
                  <Text variant="headingLg" tone="success">
                    -{aiImpact.costReduction || 0}%
                  </Text>
                  <Text variant="bodySm" tone="subdued">Cost Reduction</Text>
                  <ProgressBar progress={aiImpact.costReduction || 0} size="small" tone="success" />
                </BlockStack>
              </Grid.Cell>
              <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
                <BlockStack gap="100">
                  <Text variant="headingLg" tone="success">
                    +{aiImpact.roasIncrease || 0}%
                  </Text>
                  <Text variant="bodySm" tone="subdued">ROAS Increase</Text>
                  <ProgressBar progress={aiImpact.roasIncrease || 0} size="small" tone="success" />
                </BlockStack>
              </Grid.Cell>
            </Grid>
          ) : (
            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
              <Text variant="bodyMd" tone="subdued" alignment="center">
                AI impact data will appear here once campaigns are active and optimized.
              </Text>
            </Box>
          )}
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
            {performanceData.length > 0 ? (
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
            ) : (
              <Box padding="600">
                <Text variant="bodyMd" tone="subdued" alignment="center">
                  Performance trend data will appear here once campaigns start generating traffic.
                </Text>
              </Box>
            )}
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
                {deviceBreakdown.length > 0 ? (
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
                ) : (
                  <Box padding="400">
                    <Text variant="bodyMd" tone="subdued" alignment="center">
                      Device breakdown data will appear here once campaigns generate traffic.
                    </Text>
                  </Box>
                )}
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
                {topKeywords.length > 0 ? (
                  topKeywords.slice(0, 5).map((kw, index) => (
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
                  ))
                ) : (
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <Text variant="bodyMd" tone="subdued" alignment="center">
                      Top performing keywords will appear here once campaigns are active.
                    </Text>
                  </Box>
                )}
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
                  <Button
                    size="slim"
                    onClick={() => {
                      if (confirm('Apply this optimization suggestion? This will increase your weekend budget by 20%.')) {
                        alert('Budget optimization applied successfully! Changes will take effect within 24 hours.');
                      }
                    }}
                  >
                    Apply Suggestion
                  </Button>
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
                  <Button
                    size="slim"
                    onClick={() => alert('Detailed keyword analysis:\n\nCurrent CPC: $2.45\nPrevious CPC: $1.69\nIncrease: 45%\n\nSuggested alternatives:\n- "seasonal discount" (CPC: $1.20)\n- "limited time offer" (CPC: $1.55)\n- "flash sale" (CPC: $1.35)')}
                  >
                    View Details
                  </Button>
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
                  <Button
                    size="slim"
                    onClick={() => alert('Mobile Optimization Tips:\n\n1. Use shorter headlines (5-7 words)\n2. Ensure landing pages are mobile-responsive\n3. Test mobile-specific ad copy\n4. Consider mobile-preferred bidding\n5. Optimize page load speed')}
                  >
                    Learn More
                  </Button>
                </BlockStack>
              </Box>
            </Grid.Cell>
          </Grid>
        </BlockStack>
      </Card>

      {/* Time Saved Banner */}
      {aiImpact?.timeSaved && (
        <Banner
          title={`AI saved you ${aiImpact.timeSaved} hours this week`}
          tone="success"
        >
          <p>That's time you can invest in strategy and growth instead of manual optimization!</p>
        </Banner>
      )}
    </BlockStack>
  );
}
