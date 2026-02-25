import { useState, useEffect } from "react";
import {
  Card,
  Page,
  Layout,
  Text,
  Badge,
  Button,
  Select,
  Spinner,
  BlockStack,
  InlineStack,
  Box,
  ResourceList,
  ResourceItem,
  Avatar,
  ProgressBar,
  Banner,
  Link,
  Tooltip,
} from "@shopify/polaris";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import type { DashboardMetrics } from "../services/api.server";

interface DashboardProps {
  initialMetrics?: DashboardMetrics;
  refreshInterval?: number;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: "up" | "down" | "neutral";
    period: string;
  };
  prefix?: string;
  suffix?: string;
  loading?: boolean;
  color?: "success" | "warning" | "critical" | "info";
}

interface ChartColors {
  [key: string]: string;
}

const chartColors: ChartColors = {
  primary: "#5C6AC4",
  success: "#00A047",
  warning: "#EEC200",
  critical: "#D72C0D",
  neutral: "#637381",
};

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  prefix = "",
  suffix = "",
  loading = false,
  color = "info",
}) => {
  const formatValue = (val: string | number): string => {
    if (typeof val === "number") {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  const getTrendTone = (
    trend: "up" | "down" | "neutral",
  ): "success" | "critical" | "subdued" => {
    switch (trend) {
      case "up":
        return "success";
      case "down":
        return "critical";
      default:
        return "subdued";
    }
  };

  return (
    <Card>
      <Box padding="400">
        <BlockStack gap="200">
          <Text variant="headingMd" as="h3">
            {title}
          </Text>

          {loading ? (
            <InlineStack blockAlign="center" gap="200">
              <Spinner size="small" />
              <Text variant="bodyMd" as="p" tone="subdued">
                Loading...
              </Text>
            </InlineStack>
          ) : (
            <>
              <Text variant="headingXl" as="h1">
                {prefix}
                {formatValue(value)}
                {suffix}
              </Text>

              {change && (
                <InlineStack gap="100" blockAlign="center">
                  <Text variant="bodyMd" as="span" tone={getTrendTone(change.trend)}>
                    {change.trend === "up" && "\u2197"}
                    {change.trend === "down" && "\u2198"}
                    {change.trend === "neutral" && "\u2192"}
                    {Math.abs(change.value)}%
                  </Text>
                  <Text variant="bodySm" as="span" tone="subdued">
                    vs {change.period}
                  </Text>
                </InlineStack>
              )}
            </>
          )}
        </BlockStack>
      </Box>
    </Card>
  );
};

const TrendChart: React.FC<{
  data: Array<{ date: string; value: number }>;
  title: string;
  color?: string;
  type?: "line" | "area";
}> = ({ data, title, color = chartColors.primary, type = "line" }) => {
  return (
    <Card>
      <Box padding="400">
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">
            {title}
          </Text>
          <div style={{ height: "200px", width: "100%" }}>
            <ResponsiveContainer>
              {type === "area" ? (
                <AreaChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RechartsTooltip
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString()
                    }
                    formatter={(value: any) => [value.toLocaleString(), title]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    fill={color}
                    fillOpacity={0.3}
                  />
                </AreaChart>
              ) : (
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RechartsTooltip
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString()
                    }
                    formatter={(value: any) => [value.toLocaleString(), title]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </BlockStack>
      </Box>
    </Card>
  );
};

const PerformanceDonut: React.FC<{
  data: Array<{ name: string; value: number; color: string }>;
  title: string;
}> = ({ data, title }) => {
  return (
    <Card>
      <Box padding="400">
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">
            {title}
          </Text>
          <div style={{ height: "200px", width: "100%" }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(1)}%`
                  }
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value: any) => [value.toLocaleString(), "Count"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </BlockStack>
      </Box>
    </Card>
  );
};

const QuickActions: React.FC<{
  onCreateCampaign: () => void;
  onCreateAudience: () => void;
  onViewInsights: () => void;
  onRunAutopilot: () => void;
}> = ({
  onCreateCampaign,
  onCreateAudience,
  onViewInsights,
  onRunAutopilot,
}) => {
  return (
    <Card>
      <Box padding="400">
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">
            Quick Actions
          </Text>
          <BlockStack gap="200">
            <Button variant="primary" onClick={onCreateCampaign}>
              Create Campaign
            </Button>
            <Button onClick={onCreateAudience}>Build Audience</Button>
            <Button onClick={onViewInsights}>View Insights</Button>
            <Button onClick={onRunAutopilot}>Run Autopilot</Button>
          </BlockStack>
        </BlockStack>
      </Box>
    </Card>
  );
};

const RecentActivity: React.FC<{
  activities: Array<{
    id: string;
    type: "campaign" | "audience" | "conversion" | "optimization";
    title: string;
    description: string;
    timestamp: string;
    status?: "success" | "warning" | "critical";
  }>;
}> = ({ activities }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "campaign":
        return "";
      case "audience":
        return "";
      case "conversion":
        return "";
      case "optimization":
        return "\u26A1";
      default:
        return "";
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    const statusMap = {
      success: { tone: "success" as const, text: "Success" },
      warning: { tone: "warning" as const, text: "Warning" },
      critical: { tone: "critical" as const, text: "Error" },
    };

    const config = statusMap[status as keyof typeof statusMap];
    return config ? <Badge tone={config.tone}>{config.text}</Badge> : null;
  };

  return (
    <Card>
      <Box padding="400">
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">
            Recent Activity
          </Text>
          <ResourceList
            resourceName={{ singular: "activity", plural: "activities" }}
            items={activities}
            renderItem={(activity) => {
              const { id, type, title, description, timestamp, status } =
                activity;

              return (
                <ResourceItem
                  id={id}
                  onClick={() => {}}
                  media={
                    <Avatar
                      size="md"
                      initials={getActivityIcon(type)}
                    />
                  }
                  accessibilityLabel={`View details for ${title}`}
                >
                  <InlineStack align="space-evenly">
                    <BlockStack gap="100">
                      <Text variant="bodyMd" as="p" fontWeight="semibold">
                        {title}
                      </Text>
                      <Text variant="bodySm" as="span" tone="subdued">
                        {description}
                      </Text>
                      <Text variant="bodySm" as="span" tone="subdued">
                        {new Date(timestamp).toLocaleString()}
                      </Text>
                    </BlockStack>
                    {getStatusBadge(status)}
                  </InlineStack>
                </ResourceItem>
              );
            }}
          />
        </BlockStack>
      </Box>
    </Card>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({
  initialMetrics,
  refreshInterval = 30000, // 30 seconds
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(
    initialMetrics || null,
  );
  const [loading, setLoading] = useState(!initialMetrics);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("30d");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Refresh metrics
  const refreshMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/dashboard/metrics?range=${dateRange}`);
      const data = await response.json();

      if (data.success) {
        setMetrics(data.data);
        setLastRefresh(new Date());
      } else {
        setError(data.error || "Failed to fetch metrics");
      }
    } catch (err: unknown) {
      setError("Network error while fetching metrics");
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(refreshMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, dateRange]);

  // Initial load if no initial metrics
  useEffect(() => {
    if (!initialMetrics) {
      refreshMetrics();
    }
  }, [dateRange]);

  const dateRangeOptions = [
    { label: "Last 7 days", value: "7d" },
    { label: "Last 30 days", value: "30d" },
    { label: "Last 90 days", value: "90d" },
  ];

  const handleQuickAction = {
    createCampaign: () => (window.location.href = "/app/campaigns/new"),
    createAudience: () => (window.location.href = "/app/audiences/new"),
    viewInsights: () => (window.location.href = "/app/insights"),
    runAutopilot: async () => {
      try {
        await fetch("/api/autopilot/run", { method: "POST" });
        // Show success notification
      } catch (err: unknown) {
        // Show error notification
      }
    },
  };

  // Mock recent activities (replace with real data)
  const recentActivities = [
    {
      id: "1",
      type: "campaign" as const,
      title: "Summer Sale Campaign",
      description: "Campaign performance increased by 15%",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      status: "success" as const,
    },
    {
      id: "2",
      type: "audience" as const,
      title: "High-Value Customers",
      description: "New audience created with 2.5K users",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: "3",
      type: "optimization" as const,
      title: "Bid Optimization",
      description: "Autopilot adjusted bids for better ROAS",
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      status: "success" as const,
    },
  ];

  if (error) {
    return (
      <Page title="Dashboard">
        <Banner tone="critical" title="Error loading dashboard">
          <p>{error}</p>
          <Button onClick={refreshMetrics}>Retry</Button>
        </Banner>
      </Page>
    );
  }

  const [showMoreMetrics, setShowMoreMetrics] = useState(false);

  return (
    <Page
      title="Dashboard"
      subtitle={`Last updated: ${lastRefresh.toLocaleTimeString()}`}
      primaryAction={{
        content: "Refresh",
        onAction: refreshMetrics,
        loading,
      }}
    >
      <Layout>
        <Layout.Section>
          <InlineStack align="end">
            <Select
              label="Date range"
              options={dateRangeOptions}
              value={dateRange}
              onChange={(value) => setDateRange(value)}
            />
          </InlineStack>
        </Layout.Section>

        {/* Primary Metrics - Top 3 */}
        <Layout.Section>
          <Layout>
            <Layout.Section variant="oneThird">
              <MetricCard
                title="Revenue"
                value={metrics?.revenue || 0}
                prefix="$"
                loading={loading}
                change={
                  metrics
                    ? {
                        value: 15.7,
                        trend: "up",
                        period: "last period",
                      }
                    : undefined
                }
              />
            </Layout.Section>

            <Layout.Section variant="oneThird">
              <MetricCard
                title="Conversions"
                value={metrics?.conversions || 0}
                loading={loading}
                change={
                  metrics
                    ? {
                        value: 8.3,
                        trend: "up",
                        period: "last period",
                      }
                    : undefined
                }
              />
            </Layout.Section>

            <Layout.Section variant="oneThird">
              <MetricCard
                title="ROAS"
                value={metrics?.performance?.avgCpc ? ((metrics?.revenue || 0) / (metrics?.performance?.avgCpc * (metrics?.totalVisitors || 1))).toFixed(2) : 0}
                suffix="x"
                loading={loading}
                change={
                  metrics
                    ? {
                        value: 5.4,
                        trend: "up",
                        period: "last period",
                      }
                    : undefined
                }
              />
            </Layout.Section>
          </Layout>
        </Layout.Section>

        {/* Revenue Trend Chart */}
        <Layout.Section>
          {metrics?.trends?.revenue && (
            <TrendChart
              data={metrics.trends.revenue}
              title="Revenue Trend"
              color={chartColors.success}
              type="area"
            />
          )}
        </Layout.Section>

        {/* Collapsible More Metrics Section */}
        <Layout.Section>
          <Card>
            <Box padding="400">
              <Button
                onClick={() => setShowMoreMetrics(!showMoreMetrics)}
                disclosure={showMoreMetrics ? "up" : "down"}
                fullWidth
              >
                {showMoreMetrics ? "Hide" : "View More Metrics"}
              </Button>
            </Box>
            {showMoreMetrics && (
              <>
                <Box padding="400">
                  <Layout>
                    <Layout.Section variant="oneThird">
                      <MetricCard
                        title="Total Visitors"
                        value={metrics?.totalVisitors || 0}
                        loading={loading}
                        change={
                          metrics
                            ? {
                                value: 12.5,
                                trend: "up",
                                period: "last period",
                              }
                            : undefined
                        }
                      />
                    </Layout.Section>

                    <Layout.Section variant="oneThird">
                      <MetricCard
                        title="Conversion Rate"
                        value={metrics?.conversionRate || 0}
                        suffix="%"
                        loading={loading}
                        change={
                          metrics
                            ? {
                                value: 2.1,
                                trend: "down",
                                period: "last period",
                              }
                            : undefined
                        }
                      />
                    </Layout.Section>

                    <Layout.Section variant="oneThird">
                      <MetricCard
                        title="Average CPC"
                        value={metrics?.performance?.avgCpc || 0}
                        prefix="$"
                        loading={loading}
                        change={
                          metrics
                            ? {
                                value: 5.2,
                                trend: "down",
                                period: "last period",
                              }
                            : undefined
                        }
                      />
                    </Layout.Section>
                  </Layout>
                </Box>

                <Box padding="400">
                  <Layout>
                    <Layout.Section variant="oneHalf">
                      <MetricCard
                        title="Click-Through Rate"
                        value={metrics?.performance?.ctr || 0}
                        suffix="%"
                        loading={loading}
                        change={
                          metrics
                            ? {
                                value: 3.4,
                                trend: "up",
                                period: "last period",
                              }
                            : undefined
                        }
                      />
                    </Layout.Section>

                    <Layout.Section variant="oneHalf">
                      <PerformanceDonut
                        title="Campaign Status"
                        data={[
                          {
                            name: "Active",
                            value: metrics?.campaigns?.active || 0,
                            color: chartColors.success,
                          },
                          {
                            name: "Paused",
                            value: metrics?.campaigns?.paused || 0,
                            color: chartColors.warning,
                          },
                        ]}
                      />
                    </Layout.Section>
                  </Layout>
                </Box>
              </>
            )}
          </Card>
        </Layout.Section>

        {/* Recent Activity - Limited to 3 items */}
        <Layout.Section>
          <RecentActivity activities={recentActivities.slice(0, 3)} />
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default Dashboard;
