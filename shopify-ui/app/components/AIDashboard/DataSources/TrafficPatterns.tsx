/**
 * Traffic Patterns Component for AI Dashboard
 * Displays hourly heatmaps, daily/weekly patterns, peak times, and device/location breakdowns
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Layout,
  Page,
  Text,
  Badge,
  DataTable,
  Button,
  ButtonGroup,
  BlockStack,
  InlineStack,
  Box,
  Spinner,
  EmptyState,
  Tabs,
  TextField,
  Select,
  ChoiceList,
  RangeSlider,
  Modal,
  Tooltip,
  Icon,
  Divider,
  ProgressBar,
  List
} from '@shopify/polaris';
import {
  SearchIcon,
  ExportIcon,
  RefreshIcon,
  ViewIcon,
  InfoIcon,
  CalendarIcon,
  LocationIcon,
  DesktopIcon,
  MobileIcon,
  TabletIcon
} from '@shopify/polaris-icons';
import {
  TrafficPatternsData,
  HourlyTrafficData,
  TrafficTrend,
  PeakTime,
  DeviceBreakdown,
  LocationBreakdown,
  SeasonalTrend,
  DataVisualizationProps,
  FilterState,
  ExportOptions
} from './types';
import {
  BaseChart,
  TrendLineChart,
  MultiLineChart,
  BarChartComponent,
  PieChartComponent,
  HeatmapChart,
  AreaChartComponent,
  formatters,
  CHART_COLORS
} from './charts';

interface TrafficPatternsProps extends DataVisualizationProps {
  data?: TrafficPatternsData;
}

export function TrafficPatterns({
  shopName,
  dateRange,
  refreshInterval = 300000, // 5 minutes
  onRefresh,
  isLoading = false,
  error = null,
  height = 400,
  showExport = true,
  showFilters = true,
  className,
  data
}: TrafficPatternsProps) {
  // State management
  const [patternsData, setPatternsData] = useState<TrafficPatternsData | null>(data || null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('sessions');
  const [selectedDevices, setSelectedDevices] = useState<string[]>(['desktop', 'mobile', 'tablet']);
  const [showTopCountries, setShowTopCountries] = useState(10);
  const [loading, setLoading] = useState(isLoading);
  const [selectedPeakTime, setSelectedPeakTime] = useState<PeakTime | null>(null);
  const [showPeakTimeModal, setShowPeakTimeModal] = useState(false);

  // Fetch data
  const fetchTrafficPatterns = async () => {
    if (data) return; // Use provided data if available

    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/traffic-patterns?shop=${shopName}&timeRange=${selectedTimeRange}`);
      const result = await response.json();

      if (result.success) {
        setPatternsData(result.data);
      } else {
        console.error('Failed to fetch traffic patterns:', result.error);
      }
    } catch (err: unknown) {
      console.error('Error fetching traffic patterns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrafficPatterns();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchTrafficPatterns, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [shopName, selectedTimeRange, refreshInterval]);

  // Chart data preparation
  const heatmapData = useMemo(() => {
    if (!patternsData?.hourlyHeatmap) return [];

    return patternsData.hourlyHeatmap.map(item => ({
      x: item.hour,
      y: item.day,
      value: selectedMetric === 'sessions' ? item.sessions :
             selectedMetric === 'conversions' ? item.conversions :
             selectedMetric === 'revenue' ? item.revenue : item.sessions
    }));
  }, [patternsData?.hourlyHeatmap, selectedMetric]);

  const dailyTrendsData = useMemo(() => {
    if (!patternsData?.dailyTrends) return [];

    return patternsData.dailyTrends.map(trend => ({
      date: trend.date,
      value: trend.sessions,
      sessions: trend.sessions,
      conversions: trend.conversions,
      revenue: trend.revenue,
      conversionRate: (trend.conversions / trend.sessions) * 100,
      bounceRate: trend.bounceRate
    }));
  }, [patternsData?.dailyTrends]);

  const weeklyTrendsData = useMemo(() => {
    if (!patternsData?.weeklyTrends) return [];

    return patternsData.weeklyTrends.map(trend => ({
      date: trend.date,
      value: trend.sessions,
      sessions: trend.sessions,
      conversions: trend.conversions,
      revenue: trend.revenue,
      conversionRate: (trend.conversions / trend.sessions) * 100
    }));
  }, [patternsData?.weeklyTrends]);

  const deviceData = useMemo(() => {
    if (!patternsData?.deviceBreakdown) return [];

    return patternsData.deviceBreakdown
      .filter(device => selectedDevices.includes(device.device))
      .map(device => ({
        name: device.device,
        value: device.sessions,
        percentage: device.percentage,
        conversions: device.conversions,
        revenue: device.revenue,
        date: device.device
      }));
  }, [patternsData?.deviceBreakdown, selectedDevices]);

  const locationData = useMemo(() => {
    if (!patternsData?.locationBreakdown) return [];

    return patternsData.locationBreakdown
      .slice(0, showTopCountries)
      .map(location => ({
        name: location.country,
        value: location.sessions,
        percentage: location.percentage,
        conversions: location.conversions,
        revenue: location.revenue,
        date: location.country
      }));
  }, [patternsData?.locationBreakdown, showTopCountries]);

  const seasonalData = useMemo(() => {
    if (!patternsData?.seasonalTrends) return [];

    return patternsData.seasonalTrends.map(trend => ({
      date: `${trend.month} ${trend.year}`,
      value: trend.sessions,
      sessions: trend.sessions,
      conversions: trend.conversions,
      revenue: trend.revenue,
      change: trend.changeFromPrevious
    }));
  }, [patternsData?.seasonalTrends]);

  const peakTimesData = useMemo(() => {
    if (!patternsData?.peakTimes) return [];

    return patternsData.peakTimes.map(peak => ({
      name: peak.period,
      value: peak.sessions,
      sessions: peak.sessions,
      conversions: peak.conversions,
      conversionRate: peak.conversionRate,
      type: peak.type,
      date: peak.period
    }));
  }, [patternsData?.peakTimes]);

  // Export functionality
  const handleExport = (options: ExportOptions) => {
    console.log('Exporting traffic patterns:', options);
    // Implementation would go here
  };

  // Render helper functions
  const renderHourlyHeatmap = () => {
    if (!patternsData?.hourlyHeatmap) return null;

    return (
      <Layout>
        <Layout.Section>
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingMd" as="h3">Traffic Heatmap by Hour and Day</Text>
                  <Select
                    label=""
                    options={[
                      { label: 'Sessions', value: 'sessions' },
                      { label: 'Conversions', value: 'conversions' },
                      { label: 'Revenue', value: 'revenue' }
                    ]}
                    value={selectedMetric}
                    onChange={setSelectedMetric}
                  />
                </InlineStack>

                <HeatmapChart
                  title=""
                  data={heatmapData}
                  height={400}
                  xAxisLabel="Hour of Day"
                  yAxisLabel="Day of Week"
                />

                <Box paddingBlockStart="400">
                  <Text variant="bodySm" as="span" tone="subdued">
                    Darker colors indicate higher {selectedMetric}. Hover over cells to see exact values.
                  </Text>
                </Box>
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    );
  };

  const renderTrendAnalysis = () => {
    if (!patternsData?.dailyTrends) return null;

    const multiLineData = [
      { dataKey: 'sessions', name: 'Sessions', color: CHART_COLORS.primary[0] },
      { dataKey: 'conversions', name: 'Conversions', color: CHART_COLORS.success[0] },
      { dataKey: 'conversionRate', name: 'Conversion Rate (%)', color: CHART_COLORS.warning[0] }
    ];

    return (
      <Layout>
        <Layout.Section>
          <MultiLineChart
            title="Daily Traffic Trends"
            subtitle={`Traffic patterns over the last ${selectedTimeRange}`}
            data={dailyTrendsData}
            lines={multiLineData}
            height={350}
            showLegend={true}
            yAxisFormatter={(value) => formatters.compact(value)}
            tooltipFormatter={(value, name) => {
              if (name.includes('Rate')) {
                return [`${value.toFixed(2)}%`, name];
              }
              return [formatters.compact(value), name];
            }}
          />
        </Layout.Section>

        <Layout.Section>
          <AreaChartComponent
            title="Revenue Trends"
            subtitle="Daily revenue patterns"
            data={dailyTrendsData}
            dataKey="revenue"
            height={350}
            color={CHART_COLORS.info[0]}
            yAxisFormatter={(value) => formatters.currency(value)}
            tooltipFormatter={(value, name) => [formatters.currency(value), 'Revenue']}
          />
        </Layout.Section>
      </Layout>
    );
  };

  const renderPeakTimes = () => {
    if (!patternsData?.peakTimes) return null;

    const peakTimesTableData = patternsData.peakTimes.map(peak => [
      <Text key={peak.period} as="span" fontWeight="medium">{peak.period}</Text>,
      <Badge tone="info">{peak.type}</Badge>,
      <Text as="span">{formatters.compact(peak.sessions)}</Text>,
      <Text as="span">{formatters.compact(peak.conversions)}</Text>,
      <InlineStack blockAlign="center" gap="200">
        <ProgressBar progress={peak.conversionRate} size="small" />
        <Text variant="bodySm" as="span">{(peak.conversionRate * 100).toFixed(2)}%</Text>
      </InlineStack>,
      <Button
        variant="plain"
        icon={ViewIcon}
        onClick={() => {
          setSelectedPeakTime(peak);
          setShowPeakTimeModal(true);
        }}
        accessibilityLabel={`View details for ${peak.period}`}
      />
    ]);

    return (
      <Layout>
        <Layout.Section variant="oneHalf">
          <BarChartComponent
            title="Peak Performance Periods"
            subtitle="Sessions during peak times"
            data={peakTimesData}
            dataKey="sessions"
            xAxisKey="name"
            height={300}
            color={CHART_COLORS.primary[0]}
            yAxisFormatter={(value) => formatters.compact(value)}
            tooltipFormatter={(value, name) => [formatters.compact(value), 'Sessions']}
          />
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">Peak Times Analysis</Text>
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                  headings={['Period', 'Type', 'Sessions', 'Conversions', 'Conv. Rate', 'Actions']}
                  rows={peakTimesTableData}
                />
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    );
  };

  const renderDeviceLocationBreakdown = () => {
    if (!patternsData?.deviceBreakdown || !patternsData?.locationBreakdown) return null;

    return (
      <Layout>
        <Layout.Section variant="oneHalf">
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingMd" as="h3">Device Breakdown</Text>
                  <ChoiceList
                    title=""
                    choices={[
                      { label: 'Desktop', value: 'desktop' },
                      { label: 'Mobile', value: 'mobile' },
                      { label: 'Tablet', value: 'tablet' }
                    ]}
                    selected={selectedDevices}
                    onChange={setSelectedDevices}
                    allowMultiple
                  />
                </InlineStack>

                <PieChartComponent
                  title=""
                  data={deviceData}
                  dataKey="value"
                  nameKey="name"
                  height={250}
                  colors={CHART_COLORS.primary}
                  tooltipFormatter={(value, name) => [formatters.compact(value), 'Sessions']}
                />

                <BlockStack gap="200">
                  {patternsData.deviceBreakdown
                    .filter(device => selectedDevices.includes(device.device))
                    .map(device => (
                      <InlineStack key={device.device} align="space-between" blockAlign="center">
                        <InlineStack gap="200" blockAlign="center">
                          <Icon source={
                            device.device === 'desktop' ? DesktopIcon :
                            device.device === 'mobile' ? MobileIcon :
                            TabletIcon
                          } />
                          <Text variant="bodyMd" as="p" fontWeight="medium">{device.device}</Text>
                        </InlineStack>
                        <InlineStack gap="200">
                          <Text variant="bodySm" as="span">{device.percentage.toFixed(1)}%</Text>
                          <Text variant="bodySm" as="span" tone="subdued">
                            {(device.conversionRate * 100).toFixed(2)}% CVR
                          </Text>
                        </InlineStack>
                      </InlineStack>
                    ))}
                </BlockStack>
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingMd" as="h3">Top Locations</Text>
                  <Select
                    label=""
                    options={[
                      { label: 'Top 5', value: '5' },
                      { label: 'Top 10', value: '10' },
                      { label: 'Top 15', value: '15' },
                      { label: 'Top 20', value: '20' }
                    ]}
                    value={showTopCountries.toString()}
                    onChange={(value) => setShowTopCountries(parseInt(value))}
                  />
                </InlineStack>

                <BarChartComponent
                  title=""
                  data={locationData}
                  dataKey="value"
                  xAxisKey="name"
                  height={250}
                  color={CHART_COLORS.success[0]}
                  horizontal={true}
                  yAxisFormatter={(value) => formatters.compact(value)}
                  tooltipFormatter={(value, name) => [formatters.compact(value), 'Sessions']}
                />

                <BlockStack gap="200">
                  {patternsData.locationBreakdown
                    .slice(0, 5)
                    .map((location, index) => (
                      <InlineStack key={location.country} align="space-between" blockAlign="center">
                        <InlineStack gap="200" blockAlign="center">
                          <Badge tone="info">{`#${index + 1}`}</Badge>
                          <Text variant="bodyMd" as="p" fontWeight="medium">{location.country}</Text>
                        </InlineStack>
                        <InlineStack gap="200">
                          <Text variant="bodySm" as="span">{location.percentage.toFixed(1)}%</Text>
                          <Text variant="bodySm" as="span" tone="subdued">
                            {formatters.currency(location.revenue / location.sessions)} avg
                          </Text>
                        </InlineStack>
                      </InlineStack>
                    ))}
                </BlockStack>
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    );
  };

  const renderSeasonalTrends = () => {
    if (!patternsData?.seasonalTrends) return null;

    return (
      <Layout>
        <Layout.Section>
          <MultiLineChart
            title="Seasonal Traffic Trends"
            subtitle="Monthly patterns and year-over-year comparison"
            data={seasonalData}
            lines={[
              { dataKey: 'sessions', name: 'Sessions', color: CHART_COLORS.primary[0] },
              { dataKey: 'conversions', name: 'Conversions', color: CHART_COLORS.success[0] },
              { dataKey: 'revenue', name: 'Revenue', color: CHART_COLORS.info[0] }
            ]}
            height={350}
            showLegend={true}
            yAxisFormatter={(value) => formatters.compact(value)}
            tooltipFormatter={(value, name) => {
              if (name === 'Revenue') {
                return [formatters.currency(value), name];
              }
              return [formatters.compact(value), name];
            }}
          />
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">Seasonal Insights</Text>
                <BlockStack gap="200">
                  {patternsData.seasonalTrends
                    .sort((a, b) => b.changeFromPrevious - a.changeFromPrevious)
                    .slice(0, 6)
                    .map(trend => (
                      <InlineStack key={`${trend.month}-${trend.year}`} align="space-between" blockAlign="center">
                        <InlineStack gap="200" blockAlign="center">
                          <Text variant="bodyMd" as="p" fontWeight="medium">{trend.month} {trend.year}</Text>
                          <Badge tone={trend.changeFromPrevious > 0 ? 'success' : 'critical'}>
                            {`${trend.changeFromPrevious > 0 ? '+' : ''}${trend.changeFromPrevious.toFixed(1)}%`}
                          </Badge>
                        </InlineStack>
                        <InlineStack gap="200">
                          <Text variant="bodySm" as="span">{formatters.compact(trend.sessions)} sessions</Text>
                          <Text variant="bodySm" as="span" tone="subdued">
                            {formatters.currency(trend.revenue)}
                          </Text>
                        </InlineStack>
                      </InlineStack>
                    ))}
                </BlockStack>
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    );
  };

  // Main render
  if (loading && !patternsData) {
    return (
      <Card>
        <Box padding="800">
          <InlineStack align="center" blockAlign="center">
            <Spinner size="large" />
            <Text variant="bodyLg" as="p">Loading traffic patterns...</Text>
          </InlineStack>
        </Box>
      </Card>
    );
  }

  if (error || !patternsData) {
    return (
      <Card>
        <EmptyState
          heading="Unable to load traffic patterns"
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          action={{
            content: 'Retry',
            onAction: () => {
              fetchTrafficPatterns();
              onRefresh?.();
            }
          }}
        >
          <p>{error || 'No traffic patterns data available'}</p>
        </EmptyState>
      </Card>
    );
  }

  const tabs = [
    { id: 'overview', content: 'Overview' },
    { id: 'heatmap', content: 'Hourly Heatmap' },
    { id: 'trends', content: 'Daily Trends' },
    { id: 'peaks', content: 'Peak Times' },
    { id: 'devices', content: 'Device & Location' },
    { id: 'seasonal', content: 'Seasonal Patterns' }
  ];

  return (
    <Page
      title="Traffic Patterns"
      subtitle={`Last updated: ${formatters.dateTime(patternsData.lastUpdated)} | Status: ${patternsData.analysisStatus}`}
      secondaryActions={[
        {
          content: 'Refresh',
          icon: RefreshIcon,
          onAction: () => {
            fetchTrafficPatterns();
            onRefresh?.();
          }
        },
        ...(showExport ? [{
          content: 'Export',
          icon: ExportIcon,
          onAction: () => handleExport({ format: 'csv' as const, filename: 'traffic-patterns' })
        }] : [])
      ]}
    >
      <Layout>
        {showFilters && (
          <Layout.Section>
            <Card>
              <Box padding="400">
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h3">Time Range</Text>
                  <ButtonGroup variant="segmented">
                    {['7d', '30d', '90d'].map(range => (
                      <Button
                        key={range}
                        pressed={selectedTimeRange === range}
                        onClick={() => setSelectedTimeRange(range)}
                      >
                        {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                      </Button>
                    ))}
                  </ButtonGroup>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              <Box padding="400">
                {selectedTab === 0 && (
                  <BlockStack gap="400">
                    <Text variant="headingLg" as="h2">Traffic Patterns Overview</Text>

                    <Card>
                      <Box padding="400">
                        <BlockStack gap="200">
                          <Text variant="headingMd" as="h3">Summary Statistics</Text>
                          <Layout>
                            <Layout.Section variant="oneThird">
                              <BlockStack gap="100">
                                <Text variant="headingXl" as="h1">{formatters.compact(patternsData.summary.totalSessions)}</Text>
                                <Text variant="bodySm" as="span" tone="subdued">Total Sessions</Text>
                              </BlockStack>
                            </Layout.Section>
                            <Layout.Section variant="oneThird">
                              <BlockStack gap="100">
                                <Text variant="headingXl" as="h1">{formatters.compact(patternsData.summary.totalConversions)}</Text>
                                <Text variant="bodySm" as="span" tone="subdued">Total Conversions</Text>
                              </BlockStack>
                            </Layout.Section>
                            <Layout.Section variant="oneThird">
                              <BlockStack gap="100">
                                <Text variant="headingXl" as="h1">{formatters.currency(patternsData.summary.totalRevenue)}</Text>
                                <Text variant="bodySm" as="span" tone="subdued">Total Revenue</Text>
                              </BlockStack>
                            </Layout.Section>
                          </Layout>

                          <Layout>
                            <Layout.Section variant="oneThird">
                              <BlockStack gap="100">
                                <Text variant="headingXl" as="h1">{(patternsData.summary.avgConversionRate * 100).toFixed(2)}%</Text>
                                <Text variant="bodySm" as="span" tone="subdued">Avg Conversion Rate</Text>
                              </BlockStack>
                            </Layout.Section>
                          </Layout>

                          <Divider />

                          <Layout>
                            <Layout.Section variant="oneHalf">
                              <BlockStack gap="100">
                                <Text variant="bodyMd" as="p" fontWeight="medium">Peak Hour</Text>
                                <Text variant="headingMd" as="h3">{patternsData.summary.peakHour}:00</Text>
                                <Text variant="bodySm" as="span" tone="subdued">Highest traffic volume</Text>
                              </BlockStack>
                            </Layout.Section>
                            <Layout.Section variant="oneHalf">
                              <BlockStack gap="100">
                                <Text variant="bodyMd" as="p" fontWeight="medium">Peak Day</Text>
                                <Text variant="headingMd" as="h3">{patternsData.summary.peakDay}</Text>
                                <Text variant="bodySm" as="span" tone="subdued">Highest conversion day</Text>
                              </BlockStack>
                            </Layout.Section>
                          </Layout>
                        </BlockStack>
                      </Box>
                    </Card>

                    <Layout>
                      <Layout.Section variant="oneHalf">
                        <TrendLineChart
                          title="Traffic Trend"
                          subtitle="Sessions over time"
                          data={dailyTrendsData}
                          dataKey="sessions"
                          height={250}
                          color={CHART_COLORS.primary[0]}
                          yAxisFormatter={(value) => formatters.compact(value)}
                          tooltipFormatter={(value, name) => [formatters.compact(value), 'Sessions']}
                        />
                      </Layout.Section>

                      <Layout.Section variant="oneHalf">
                        <TrendLineChart
                          title="Revenue Trend"
                          subtitle="Revenue over time"
                          data={dailyTrendsData}
                          dataKey="revenue"
                          height={250}
                          color={CHART_COLORS.success[0]}
                          yAxisFormatter={(value) => formatters.currency(value)}
                          tooltipFormatter={(value, name) => [formatters.currency(value), 'Revenue']}
                        />
                      </Layout.Section>
                    </Layout>
                  </BlockStack>
                )}

                {selectedTab === 1 && (
                  <BlockStack gap="400">
                    <Text variant="headingLg" as="h2">Hourly Traffic Heatmap</Text>
                    {renderHourlyHeatmap()}
                  </BlockStack>
                )}

                {selectedTab === 2 && (
                  <BlockStack gap="400">
                    <Text variant="headingLg" as="h2">Daily Traffic Trends</Text>
                    {renderTrendAnalysis()}
                  </BlockStack>
                )}

                {selectedTab === 3 && (
                  <BlockStack gap="400">
                    <Text variant="headingLg" as="h2">Peak Traffic Times</Text>
                    {renderPeakTimes()}
                  </BlockStack>
                )}

                {selectedTab === 4 && (
                  <BlockStack gap="400">
                    <Text variant="headingLg" as="h2">Device & Location Breakdown</Text>
                    {renderDeviceLocationBreakdown()}
                  </BlockStack>
                )}

                {selectedTab === 5 && (
                  <BlockStack gap="400">
                    <Text variant="headingLg" as="h2">Seasonal Traffic Patterns</Text>
                    {renderSeasonalTrends()}
                  </BlockStack>
                )}
              </Box>
            </Tabs>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Peak Time Detail Modal */}
      {selectedPeakTime && (
        <Modal
          open={showPeakTimeModal}
          onClose={() => setShowPeakTimeModal(false)}
          title={`Peak Time: ${selectedPeakTime.period}`}
          size="large"
        >
          <Box padding="400">
            <BlockStack gap="400">
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Peak Time Analysis</Text>
                <p><strong>Period:</strong> {selectedPeakTime.period}</p>
                <p><strong>Type:</strong> {selectedPeakTime.type}</p>
                <p><strong>Sessions:</strong> {formatters.compact(selectedPeakTime.sessions)}</p>
                <p><strong>Conversions:</strong> {formatters.compact(selectedPeakTime.conversions)}</p>
                <p><strong>Conversion Rate:</strong> {(selectedPeakTime.conversionRate * 100).toFixed(2)}%</p>

                <Text variant="headingMd" as="h3">Recommendations</Text>
                <p>This is a high-performance period. Consider:</p>
                <List type="bullet">
                  <List.Item>Increasing ad spend during this time</List.Item>
                  <List.Item>Scheduling promotional campaigns</List.Item>
                  <List.Item>Ensuring adequate inventory and support coverage</List.Item>
                  <List.Item>Testing new products or offers</List.Item>
                </List>
              </BlockStack>
            </BlockStack>
          </Box>
        </Modal>
      )}
    </Page>
  );
}
