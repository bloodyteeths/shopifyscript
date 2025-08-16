import { useState, useEffect } from 'react';
import {
  Card,
  Page,
  Layout,
  Text,
  Badge,
  Button,
  Select,
  Spinner,
  Stack,
  DisplayText,
  TextStyle,
  ResourceList,
  ResourceItem,
  Avatar,
  ProgressBar,
  Banner,
  Link,
  Tooltip,
} from '@shopify/polaris';
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
} from 'recharts';
import type { DashboardMetrics } from '../services/api.server';

interface DashboardProps {
  initialMetrics?: DashboardMetrics;
  refreshInterval?: number;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
    period: string;
  };
  prefix?: string;
  suffix?: string;
  loading?: boolean;
  color?: 'success' | 'warning' | 'critical' | 'info';
}

interface ChartColors {
  [key: string]: string;
}

const chartColors: ChartColors = {
  primary: '#5C6AC4',
  success: '#00A047',
  warning: '#EEC200',
  critical: '#D72C0D',
  neutral: '#637381',
};

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  prefix = '',
  suffix = '',
  loading = false,
  color = 'info',
}) => {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  const getTrendColor = (trend: 'up' | 'down' | 'neutral'): 'success' | 'critical' | 'subdued' => {
    switch (trend) {
      case 'up': return 'success';
      case 'down': return 'critical';
      default: return 'subdued';
    }
  };

  return (
    <Card>
      <Card.Section>
        <Stack vertical spacing="tight">
          <Text variant="headingMd" as="h3">
            {title}
          </Text>
          
          {loading ? (
            <Stack alignment="center">
              <Spinner size="small" />
              <Text variant="bodyMd" color="subdued">Loading...</Text>
            </Stack>
          ) : (
            <>
              <DisplayText size="medium">
                {prefix}{formatValue(value)}{suffix}
              </DisplayText>
              
              {change && (
                <Stack spacing="extraTight" alignment="center">
                  <TextStyle variation={getTrendColor(change.trend)}>
                    {change.trend === 'up' && '↗'} 
                    {change.trend === 'down' && '↘'} 
                    {change.trend === 'neutral' && '→'} 
                    {Math.abs(change.value)}%
                  </TextStyle>
                  <Text variant="bodySm" color="subdued">
                    vs {change.period}
                  </Text>
                </Stack>
              )}
            </>
          )}
        </Stack>
      </Card.Section>
    </Card>
  );
};

const TrendChart: React.FC<{
  data: Array<{ date: string; value: number }>;
  title: string;
  color?: string;
  type?: 'line' | 'area';
}> = ({ data, title, color = chartColors.primary, type = 'line' }) => {
  return (
    <Card>
      <Card.Section>
        <Stack vertical>
          <Text variant="headingMd" as="h3">{title}</Text>
          <div style={{ height: '200px', width: '100%' }}>
            <ResponsiveContainer>
              {type === 'area' ? (
                <AreaChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RechartsTooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
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
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RechartsTooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
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
        </Stack>
      </Card.Section>
    </Card>
  );
};

const PerformanceDonut: React.FC<{
  data: Array<{ name: string; value: number; color: string }>;
  title: string;
}> = ({ data, title }) => {
  return (
    <Card>
      <Card.Section>
        <Stack vertical>
          <Text variant="headingMd" as="h3">{title}</Text>
          <div style={{ height: '200px', width: '100%' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: any) => [value.toLocaleString(), 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Stack>
      </Card.Section>
    </Card>
  );
};

const QuickActions: React.FC<{
  onCreateCampaign: () => void;
  onCreateAudience: () => void;
  onViewInsights: () => void;
  onRunAutopilot: () => void;
}> = ({ onCreateCampaign, onCreateAudience, onViewInsights, onRunAutopilot }) => {
  return (
    <Card>
      <Card.Section>
        <Stack vertical>
          <Text variant="headingMd" as="h3">Quick Actions</Text>
          <Stack vertical spacing="tight">
            <Button primary onClick={onCreateCampaign}>
              Create Campaign
            </Button>
            <Button onClick={onCreateAudience}>
              Build Audience
            </Button>
            <Button onClick={onViewInsights}>
              View Insights
            </Button>
            <Button onClick={onRunAutopilot}>
              Run Autopilot
            </Button>
          </Stack>
        </Stack>
      </Card.Section>
    </Card>
  );
};

const RecentActivity: React.FC<{
  activities: Array<{
    id: string;
    type: 'campaign' | 'audience' | 'conversion' | 'optimization';
    title: string;
    description: string;
    timestamp: string;
    status?: 'success' | 'warning' | 'critical';
  }>;
}> = ({ activities }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'campaign': return '📢';
      case 'audience': return '👥';
      case 'conversion': return '💰';
      case 'optimization': return '⚡';
      default: return '📊';
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const statusMap = {
      success: { color: 'success' as const, text: 'Success' },
      warning: { color: 'warning' as const, text: 'Warning' },
      critical: { color: 'critical' as const, text: 'Error' },
    };
    
    const config = statusMap[status as keyof typeof statusMap];
    return config ? <Badge status={config.color}>{config.text}</Badge> : null;
  };

  return (
    <Card>
      <Card.Section>
        <Stack vertical>
          <Text variant="headingMd" as="h3">Recent Activity</Text>
          <ResourceList
            resourceName={{ singular: 'activity', plural: 'activities' }}
            items={activities}
            renderItem={(activity) => {
              const { id, type, title, description, timestamp, status } = activity;
              
              return (
                <ResourceItem
                  id={id}
                  media={
                    <Avatar
                      customer={false}
                      size="medium"
                      initials={getActivityIcon(type)}
                    />
                  }
                  accessibilityLabel={`View details for ${title}`}
                >
                  <Stack distribution="fillEvenly">
                    <Stack vertical spacing="extraTight">
                      <Text variant="bodyMd" fontWeight="semibold">
                        {title}
                      </Text>
                      <Text variant="bodySm" color="subdued">
                        {description}
                      </Text>
                      <Text variant="bodySm" color="subdued">
                        {new Date(timestamp).toLocaleString()}
                      </Text>
                    </Stack>
                    {getStatusBadge(status)}
                  </Stack>
                </ResourceItem>
              );
            }}
          />
        </Stack>
      </Card.Section>
    </Card>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({
  initialMetrics,
  refreshInterval = 30000, // 30 seconds
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(initialMetrics || null);
  const [loading, setLoading] = useState(!initialMetrics);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30d');
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
        setError(data.error || 'Failed to fetch metrics');
      }
    } catch (err) {
      setError('Network error while fetching metrics');
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
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'Last 90 days', value: '90d' },
  ];

  const handleQuickAction = {
    createCampaign: () => window.location.href = '/app/campaigns/new',
    createAudience: () => window.location.href = '/app/audiences/new',
    viewInsights: () => window.location.href = '/app/insights',
    runAutopilot: async () => {
      try {
        await fetch('/api/autopilot/run', { method: 'POST' });
        // Show success notification
      } catch (err) {
        // Show error notification
      }
    },
  };

  // Mock recent activities (replace with real data)
  const recentActivities = [
    {
      id: '1',
      type: 'campaign' as const,
      title: 'Summer Sale Campaign',
      description: 'Campaign performance increased by 15%',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      status: 'success' as const,
    },
    {
      id: '2',
      type: 'audience' as const,
      title: 'High-Value Customers',
      description: 'New audience created with 2.5K users',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: '3',
      type: 'optimization' as const,
      title: 'Bid Optimization',
      description: 'Autopilot adjusted bids for better ROAS',
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      status: 'success' as const,
    },
  ];

  if (error) {
    return (
      <Page title="Dashboard">
        <Banner status="critical" title="Error loading dashboard">
          <p>{error}</p>
          <Button onClick={refreshMetrics}>Retry</Button>
        </Banner>
      </Page>
    );
  }

  return (
    <Page
      title="Dashboard"
      subtitle={`Last updated: ${lastRefresh.toLocaleTimeString()}`}
      primaryAction={{
        content: 'Refresh',
        onAction: refreshMetrics,
        loading,
      }}
      secondaryActions={[
        {
          content: 'Export Report',
          onAction: () => {
            // Implement export functionality
          },
        },
      ]}
    >
      <Layout>
        <Layout.Section>
          <Stack distribution="trailing">
            <Select
              label="Date range"
              options={dateRangeOptions}
              value={dateRange}
              onChange={(value) => setDateRange(value)}
            />
          </Stack>
        </Layout.Section>

        {/* Key Metrics */}
        <Layout.Section>
          <Layout>
            <Layout.Section oneThird>
              <MetricCard
                title="Total Visitors"
                value={metrics?.totalVisitors || 0}
                prefix=""
                suffix=""
                loading={loading}
                change={
                  metrics ? {
                    value: 12.5,
                    trend: 'up',
                    period: 'last period',
                  } : undefined
                }
              />
            </Layout.Section>
            
            <Layout.Section oneThird>
              <MetricCard
                title="Conversions"
                value={metrics?.conversions || 0}
                loading={loading}
                change={
                  metrics ? {
                    value: 8.3,
                    trend: 'up',
                    period: 'last period',
                  } : undefined
                }
              />
            </Layout.Section>
            
            <Layout.Section oneThird>
              <MetricCard
                title="Conversion Rate"
                value={metrics?.conversionRate || 0}
                suffix="%"
                loading={loading}
                change={
                  metrics ? {
                    value: 2.1,
                    trend: 'down',
                    period: 'last period',
                  } : undefined
                }
              />
            </Layout.Section>
          </Layout>
        </Layout.Section>

        <Layout.Section>
          <Layout>
            <Layout.Section oneThird>
              <MetricCard
                title="Revenue"
                value={metrics?.revenue || 0}
                prefix="$"
                loading={loading}
                change={
                  metrics ? {
                    value: 15.7,
                    trend: 'up',
                    period: 'last period',
                  } : undefined
                }
              />
            </Layout.Section>
            
            <Layout.Section oneThird>
              <MetricCard
                title="Average CPC"
                value={metrics?.performance?.avgCpc || 0}
                prefix="$"
                loading={loading}
                change={
                  metrics ? {
                    value: 5.2,
                    trend: 'down',
                    period: 'last period',
                  } : undefined
                }
              />
            </Layout.Section>
            
            <Layout.Section oneThird>
              <MetricCard
                title="Click-Through Rate"
                value={metrics?.performance?.ctr || 0}
                suffix="%"
                loading={loading}
                change={
                  metrics ? {
                    value: 3.4,
                    trend: 'up',
                    period: 'last period',
                  } : undefined
                }
              />
            </Layout.Section>
          </Layout>
        </Layout.Section>

        {/* Charts */}
        <Layout.Section>
          <Layout>
            <Layout.Section twoThirds>
              {metrics?.trends?.visitors && (
                <TrendChart
                  data={metrics.trends.visitors}
                  title="Visitor Trends"
                  color={chartColors.primary}
                  type="area"
                />
              )}
            </Layout.Section>
            
            <Layout.Section oneThird>
              <QuickActions
                onCreateCampaign={handleQuickAction.createCampaign}
                onCreateAudience={handleQuickAction.createAudience}
                onViewInsights={handleQuickAction.viewInsights}
                onRunAutopilot={handleQuickAction.runAutopilot}
              />
            </Layout.Section>
          </Layout>
        </Layout.Section>

        <Layout.Section>
          <Layout>
            <Layout.Section oneHalf>
              {metrics?.trends?.conversions && (
                <TrendChart
                  data={metrics.trends.conversions}
                  title="Conversion Trends"
                  color={chartColors.success}
                />
              )}
            </Layout.Section>
            
            <Layout.Section oneHalf>
              {metrics?.trends?.revenue && (
                <TrendChart
                  data={metrics.trends.revenue}
                  title="Revenue Trends"
                  color={chartColors.warning}
                />
              )}
            </Layout.Section>
          </Layout>
        </Layout.Section>

        {/* Campaign Performance Overview */}
        <Layout.Section>
          <Layout>
            <Layout.Section oneHalf>
              <PerformanceDonut
                title="Campaign Status Distribution"
                data={[
                  { 
                    name: 'Active', 
                    value: metrics?.campaigns?.active || 0, 
                    color: chartColors.success 
                  },
                  { 
                    name: 'Paused', 
                    value: metrics?.campaigns?.paused || 0, 
                    color: chartColors.warning 
                  },
                ]}
              />
            </Layout.Section>
            
            <Layout.Section oneHalf>
              <RecentActivity activities={recentActivities} />
            </Layout.Section>
          </Layout>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default Dashboard;