/**
 * Customer Segments Component for AI Dashboard
 * Displays demographic charts, segment analysis, behavior patterns, and lifetime value projections
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
  Stack,
  Box,
  Spinner,
  EmptyState,
  Tabs,
  Tab,
  TextField,
  Select,
  ChoiceList,
  Modal,
  TextContainer,
  List,
  Tooltip,
  Icon,
  Divider,
  ProgressBar,
  Avatar,
  CalloutCard
} from '@shopify/polaris';
import {
  SearchIcon,
  ExportIcon,
  RefreshIcon,
  ViewIcon,
  InfoIcon,
  PersonIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MoneyIcon,
  AnalyticsIcon
} from '@shopify/polaris-icons';
import {
  CustomerSegmentsData,
  CustomerSegment,
  BehaviorPattern,
  LifetimeValueProjection,
  SegmentGrowthTrend,
  DemographicData,
  DataVisualizationProps,
  FilterState,
  ExportOptions
} from './types';
import {
  BaseChart,
  PieChartComponent,
  BarChartComponent,
  TrendLineChart,
  MultiLineChart,
  ScatterPlot,
  formatters,
  CHART_COLORS
} from './charts';

interface CustomerSegmentsProps extends DataVisualizationProps {
  data?: CustomerSegmentsData;
}

export function CustomerSegments({
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
}: CustomerSegmentsProps) {
  // State management
  const [segmentsData, setSegmentsData] = useState<CustomerSegmentsData | null>(data || null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment | null>(null);
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [selectedProfitability, setSelectedProfitability] = useState<string[]>(['high', 'medium', 'low']);
  const [selectedGrowth, setSelectedGrowth] = useState<string[]>(['growing', 'stable', 'declining']);
  const [sortBy, setSortBy] = useState('size');
  const [loading, setLoading] = useState(isLoading);
  const [selectedBehaviorPattern, setSelectedBehaviorPattern] = useState<BehaviorPattern | null>(null);
  const [showBehaviorModal, setShowBehaviorModal] = useState(false);

  // Fetch data
  const fetchCustomerSegments = async () => {
    if (data) return; // Use provided data if available

    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/customer-segments?shop=${shopName}`);
      const result = await response.json();

      if (result.success) {
        setSegmentsData(result.data);
      } else {
        console.error('Failed to fetch customer segments:', result.error);
      }
    } catch (err) {
      console.error('Error fetching customer segments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerSegments();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchCustomerSegments, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [shopName, refreshInterval]);

  // Filter and search logic
  const filteredSegments = useMemo(() => {
    if (!segmentsData?.segments) return [];

    let filtered = segmentsData.segments.filter(segment => {
      // Search filter
      if (searchQuery && !segment.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !segment.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Profitability filter
      if (selectedProfitability.length > 0 && !selectedProfitability.includes(segment.profitability)) {
        return false;
      }

      // Growth filter
      if (selectedGrowth.length > 0 && !selectedGrowth.includes(segment.growth)) {
        return false;
      }

      return true;
    });

    // Sort segments
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'size':
          return b.size - a.size;
        case 'ltv':
          return b.avgLifetimeValue - a.avgLifetimeValue;
        case 'aov':
          return b.avgOrderValue - a.avgOrderValue;
        case 'frequency':
          return b.purchaseFrequency - a.purchaseFrequency;
        case 'conversion':
          return b.conversionRate - a.conversionRate;
        default:
          return b.size - a.size;
      }
    });

    return filtered;
  }, [segmentsData?.segments, searchQuery, selectedProfitability, selectedGrowth, sortBy]);

  // Chart data preparation
  const segmentSizeData = useMemo(() => {
    if (!segmentsData?.segments) return [];

    return segmentsData.segments.map(segment => ({
      name: segment.name,
      value: segment.size,
      percentage: segment.percentage,
      ltv: segment.avgLifetimeValue,
      date: segment.name
    }));
  }, [segmentsData?.segments]);

  const profitabilityData = useMemo(() => {
    if (!segmentsData?.segments) return [];

    const profitability = segmentsData.segments.reduce((acc, segment) => {
      acc[segment.profitability] = (acc[segment.profitability] || 0) + segment.size;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(profitability).map(([level, count]) => ({
      name: level,
      value: count,
      date: level
    }));
  }, [segmentsData?.segments]);

  const ltvVsSizeData = useMemo(() => {
    if (!segmentsData?.segments) return [];

    return segmentsData.segments.map(segment => ({
      name: segment.name,
      x: segment.size,
      y: segment.avgLifetimeValue,
      value: segment.avgOrderValue,
      profitability: segment.profitability,
      date: segment.name
    }));
  }, [segmentsData?.segments]);

  const growthTrendsData = useMemo(() => {
    if (!segmentsData?.growthTrends) return [];

    // Combine all growth trends into a single dataset for multi-line chart
    const dates = Array.from(new Set(
      segmentsData.growthTrends.flatMap(trend => [
        ...trend.historical.map(h => h.date),
        ...trend.projected.map(p => p.date)
      ])
    )).sort();

    return dates.map(date => {
      const dataPoint: any = { date };
      segmentsData.growthTrends.forEach(trend => {
        const segment = segmentsData.segments.find(s => s.id === trend.segmentId);
        if (segment) {
          const historical = trend.historical.find(h => h.date === date);
          const projected = trend.projected.find(p => p.date === date);
          dataPoint[segment.name] = historical?.value || projected?.value || 0;
        }
      });
      return dataPoint;
    });
  }, [segmentsData?.growthTrends, segmentsData?.segments]);

  const demographicChartData = useMemo(() => {
    if (!segmentsData?.demographics) return {};

    return {
      age: segmentsData.demographics.ageDistribution.map(item => ({
        name: item.date,
        value: item.value,
        date: item.date
      })),
      gender: segmentsData.demographics.genderDistribution.map(item => ({
        name: item.date,
        value: item.value,
        date: item.date
      })),
      income: segmentsData.demographics.incomeDistribution.map(item => ({
        name: item.date,
        value: item.value,
        date: item.date
      })),
      location: segmentsData.demographics.locationDistribution.map(item => ({
        name: item.date,
        value: item.value,
        date: item.date
      }))
    };
  }, [segmentsData?.demographics]);

  // Export functionality
  const handleExport = (options: ExportOptions) => {
    console.log('Exporting customer segments:', options);
    // Implementation would go here
  };

  // Render helper functions
  const renderSegmentsTable = () => {
    const segmentTableData = filteredSegments.map(segment => [
      <Stack alignment="center" spacing="tight" key={segment.id}>
        <Avatar size="small" name={segment.name} />
        <Box>
          <Text variant="bodyMd" fontWeight="medium">{segment.name}</Text>
          <Text variant="bodySm" color="subdued">{segment.description}</Text>
        </Box>
      </Stack>,
      <Stack vertical spacing="extraTight">
        <Text variant="bodyMd" fontWeight="medium">{formatters.compact(segment.size)}</Text>
        <Text variant="caption" color="subdued">{segment.percentage.toFixed(1)}%</Text>
      </Stack>,
      <Text>{formatters.currency(segment.avgLifetimeValue)}</Text>,
      <Text>{formatters.currency(segment.avgOrderValue)}</Text>,
      <Text>{segment.purchaseFrequency.toFixed(1)}x</Text>,
      <Stack alignment="center" spacing="tight">
        <ProgressBar progress={segment.conversionRate * 100} size="small" />
        <Text variant="bodySm">{(segment.conversionRate * 100).toFixed(1)}%</Text>
      </Stack>,
      <Badge tone={segment.profitability === 'high' ? 'success' : segment.profitability === 'medium' ? 'attention' : 'critical'}>
        {segment.profitability}
      </Badge>,
      <Badge tone={segment.growth === 'growing' ? 'success' : segment.growth === 'stable' ? 'attention' : 'critical'}>
        {segment.growth}
      </Badge>,
      <Button
        plain
        icon={ViewIcon}
        onClick={() => {
          setSelectedSegment(segment);
          setShowSegmentModal(true);
        }}
        accessibilityLabel={`View details for ${segment.name}`}
      />
    ]);

    return (
      <DataTable
        columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text', 'text', 'text']}
        headings={['Segment', 'Size', 'Lifetime Value', 'Avg Order Value', 'Frequency', 'Conv. Rate', 'Profitability', 'Growth', 'Actions']}
        rows={segmentTableData}
        pagination={{
          hasNext: true,
          hasPrevious: false,
          onNext: () => {},
          onPrevious: () => {}
        }}
      />
    );
  };

  const renderBehaviorPatterns = () => {
    if (!segmentsData?.behaviorPatterns) return null;

    return (
      <Layout>
        <Layout.Section>
          <Card>
            <Box padding="4">
              <Stack vertical spacing="loose">
                <Text variant="headingMd">Behavior Patterns Analysis</Text>
                <Stack vertical spacing="tight">
                  {segmentsData.behaviorPatterns
                    .sort((a, b) => b.frequency - a.frequency)
                    .slice(0, 8)
                    .map(pattern => (
                      <Card key={pattern.id} background="surface-subdued">
                        <Box padding="3">
                          <Stack vertical spacing="tight">
                            <Stack distribution="spaceBetween" alignment="center">
                              <Text variant="bodyMd" fontWeight="medium">{pattern.pattern}</Text>
                              <Stack spacing="tight">
                                <Badge tone={pattern.impact === 'high' ? 'critical' : pattern.impact === 'medium' ? 'attention' : 'info'}>
                                  {pattern.impact} impact
                                </Badge>
                                <Text variant="caption" color="subdued">{pattern.frequency}% frequency</Text>
                              </Stack>
                            </Stack>
                            <Text variant="bodySm" color="subdued">{pattern.description}</Text>
                            <Stack spacing="tight">
                              <Text variant="caption" fontWeight="medium">Segments:</Text>
                              {pattern.segments.slice(0, 3).map(segmentId => {
                                const segment = segmentsData.segments.find(s => s.id === segmentId);
                                return segment ? (
                                  <Badge key={segmentId} tone="info">{segment.name}</Badge>
                                ) : null;
                              })}
                              {pattern.segments.length > 3 && (
                                <Text variant="caption" color="subdued">+{pattern.segments.length - 3} more</Text>
                              )}
                            </Stack>
                            {pattern.actionable && (
                              <Box paddingBlockStart="2">
                                <Text variant="bodySm" fontWeight="medium">💡 {pattern.recommendation}</Text>
                              </Box>
                            )}
                            <Button
                              plain
                              size="slim"
                              onClick={() => {
                                setSelectedBehaviorPattern(pattern);
                                setShowBehaviorModal(true);
                              }}
                            >
                              View details
                            </Button>
                          </Stack>
                        </Box>
                      </Card>
                    ))}
                </Stack>
              </Stack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    );
  };

  const renderLifetimeValueProjections = () => {
    if (!segmentsData?.lifetimeValueProjections) return null;

    const projectionTableData = segmentsData.lifetimeValueProjections.map(projection => {
      const segment = segmentsData.segments.find(s => s.id === projection.segmentId);
      return [
        <Text key={projection.segmentId} fontWeight="medium">{segment?.name || 'Unknown'}</Text>,
        <Text>{formatters.currency(projection.currentLTV)}</Text>,
        <Text>{formatters.currency(projection.projectedLTV)}</Text>,
        <Stack alignment="center" spacing="tight">
          <Text variant="bodyMd" fontWeight="medium" color={projection.projectedLTV > projection.currentLTV ? 'success' : 'critical'}>
            {projection.projectedLTV > projection.currentLTV ? '+' : ''}
            {formatters.currency(projection.projectedLTV - projection.currentLTV)}
          </Text>
          <Badge tone={projection.projectedLTV > projection.currentLTV ? 'success' : 'critical'}>
            {((projection.projectedLTV - projection.currentLTV) / projection.currentLTV * 100).toFixed(1)}%
          </Badge>
        </Stack>,
        <Text>{projection.timeframe}</Text>,
        <Stack alignment="center" spacing="tight">
          <ProgressBar progress={projection.confidence * 100} size="small" />
          <Text variant="bodySm">{Math.round(projection.confidence * 100)}%</Text>
        </Stack>,
        <Box>
          <Text variant="caption" color="subdued">
            {projection.factors.slice(0, 2).join(', ')}
            {projection.factors.length > 2 && '...'}
          </Text>
        </Box>
      ];
    });

    return (
      <Layout>
        <Layout.Section>
          <Card>
            <Box padding="4">
              <Stack vertical spacing="loose">
                <Text variant="headingMd">Lifetime Value Projections</Text>
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text']}
                  headings={['Segment', 'Current LTV', 'Projected LTV', 'Change', 'Timeframe', 'Confidence', 'Key Factors']}
                  rows={projectionTableData}
                />
              </Stack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    );
  };

  const renderDemographics = () => {
    return (
      <Layout>
        <Layout.Section oneHalf>
          <PieChartComponent
            title="Age Distribution"
            subtitle="Customer age groups"
            data={demographicChartData.age}
            dataKey="value"
            nameKey="name"
            height={250}
            colors={CHART_COLORS.primary}
            tooltipFormatter={(value, name) => [`${value}%`, name]}
          />
        </Layout.Section>

        <Layout.Section oneHalf>
          <PieChartComponent
            title="Gender Distribution"
            subtitle="Customer gender breakdown"
            data={demographicChartData.gender}
            dataKey="value"
            nameKey="name"
            height={250}
            colors={CHART_COLORS.success}
            tooltipFormatter={(value, name) => [`${value}%`, name]}
          />
        </Layout.Section>

        <Layout.Section oneHalf>
          <BarChartComponent
            title="Income Distribution"
            subtitle="Customer income levels"
            data={demographicChartData.income}
            dataKey="value"
            xAxisKey="name"
            height={250}
            color={CHART_COLORS.warning[0]}
            yAxisFormatter={(value) => `${value}%`}
            tooltipFormatter={(value, name) => [`${value}%`, 'Customers']}
          />
        </Layout.Section>

        <Layout.Section oneHalf>
          <BarChartComponent
            title="Geographic Distribution"
            subtitle="Top customer locations"
            data={demographicChartData.location}
            dataKey="value"
            xAxisKey="name"
            height={250}
            color={CHART_COLORS.info[0]}
            horizontal={true}
            yAxisFormatter={(value) => `${value}%`}
            tooltipFormatter={(value, name) => [`${value}%`, 'Customers']}
          />
        </Layout.Section>
      </Layout>
    );
  };

  const renderGrowthTrends = () => {
    if (!segmentsData?.growthTrends || !segmentsData?.segments) return null;

    const lines = segmentsData.segments.slice(0, 5).map((segment, index) => ({
      dataKey: segment.name,
      name: segment.name,
      color: CHART_COLORS.primary[index % CHART_COLORS.primary.length]
    }));

    return (
      <Layout>
        <Layout.Section>
          <MultiLineChart
            title="Segment Growth Trends"
            subtitle="Historical and projected growth for top segments"
            data={growthTrendsData}
            lines={lines}
            height={350}
            showLegend={true}
            yAxisFormatter={(value) => formatters.compact(value)}
            tooltipFormatter={(value, name) => [formatters.compact(value), name]}
          />
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Box padding="4">
              <Stack vertical spacing="loose">
                <Text variant="headingMd">Growth Summary</Text>
                <Stack vertical spacing="tight">
                  {segmentsData.growthTrends
                    .sort((a, b) => b.growthRate - a.growthRate)
                    .map(trend => {
                      const segment = segmentsData.segments.find(s => s.id === trend.segmentId);
                      return segment ? (
                        <Stack key={trend.segmentId} distribution="spaceBetween" alignment="center">
                          <Stack spacing="tight" alignment="center">
                            <Avatar size="small" name={segment.name} />
                            <Text variant="bodyMd" fontWeight="medium">{segment.name}</Text>
                          </Stack>
                          <Stack spacing="tight" alignment="center">
                            <Badge tone={trend.trendDirection === 'up' ? 'success' : trend.trendDirection === 'down' ? 'critical' : 'attention'}>
                              {trend.trendDirection === 'up' ? '↗' : trend.trendDirection === 'down' ? '↘' : '→'}
                            </Badge>
                            <Text variant="bodyMd" fontWeight="medium">
                              {trend.growthRate > 0 ? '+' : ''}{trend.growthRate.toFixed(1)}%
                            </Text>
                          </Stack>
                        </Stack>
                      ) : null;
                    })}
                </Stack>
              </Stack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    );
  };

  // Main render
  if (loading && !segmentsData) {
    return (
      <Card>
        <Box padding="8">
          <Stack alignment="center" distribution="center">
            <Spinner size="large" />
            <Text variant="bodyLg">Loading customer segments...</Text>
          </Stack>
        </Box>
      </Card>
    );
  }

  if (error || !segmentsData) {
    return (
      <Card>
        <EmptyState
          heading="Unable to load customer segments"
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          action={{
            content: 'Retry',
            onAction: () => {
              fetchCustomerSegments();
              onRefresh?.();
            }
          }}
        >
          <p>{error || 'No customer segments data available'}</p>
        </EmptyState>
      </Card>
    );
  }

  const tabs = [
    { id: 'overview', content: 'Overview' },
    { id: 'segments', content: `Segments (${filteredSegments.length})` },
    { id: 'demographics', content: 'Demographics' },
    { id: 'behavior', content: 'Behavior Patterns' },
    { id: 'ltv', content: 'Lifetime Value' },
    { id: 'growth', content: 'Growth Trends' }
  ];

  return (
    <Page
      title="Customer Segments"
      subtitle={`Last updated: ${formatters.dateTime(segmentsData.lastUpdated)} | Status: ${segmentsData.analysisStatus}`}
      secondaryActions={[
        {
          content: 'Refresh',
          icon: RefreshIcon,
          onAction: () => {
            fetchCustomerSegments();
            onRefresh?.();
          }
        },
        ...(showExport ? [{
          content: 'Export',
          icon: ExportIcon,
          onAction: () => handleExport({ format: 'csv', filename: 'customer-segments' })
        }] : [])
      ]}
    >
      <Layout>
        {showFilters && (
          <Layout.Section>
            <Card>
              <Box padding="4">
                <Stack vertical spacing="tight">
                  <Text variant="headingMd">Filters</Text>

                  <Stack spacing="tight">
                    <Box minWidth="200px">
                      <TextField
                        label="Search"
                        value={searchQuery}
                        onChange={setSearchQuery}
                        prefix={<Icon source={SearchIcon} />}
                        placeholder="Search segments..."
                        clearButton
                        onClearButtonClick={() => setSearchQuery('')}
                      />
                    </Box>

                    <Box minWidth="150px">
                      <Select
                        label="Sort by"
                        options={[
                          { label: 'Segment Size', value: 'size' },
                          { label: 'Lifetime Value', value: 'ltv' },
                          { label: 'Order Value', value: 'aov' },
                          { label: 'Purchase Frequency', value: 'frequency' },
                          { label: 'Conversion Rate', value: 'conversion' }
                        ]}
                        value={sortBy}
                        onChange={setSortBy}
                      />
                    </Box>

                    <Box minWidth="150px">
                      <ChoiceList
                        title="Profitability"
                        choices={[
                          { label: 'High', value: 'high' },
                          { label: 'Medium', value: 'medium' },
                          { label: 'Low', value: 'low' }
                        ]}
                        selected={selectedProfitability}
                        onChange={setSelectedProfitability}
                        allowMultiple
                      />
                    </Box>

                    <Box minWidth="150px">
                      <ChoiceList
                        title="Growth"
                        choices={[
                          { label: 'Growing', value: 'growing' },
                          { label: 'Stable', value: 'stable' },
                          { label: 'Declining', value: 'declining' }
                        ]}
                        selected={selectedGrowth}
                        onChange={setSelectedGrowth}
                        allowMultiple
                      />
                    </Box>
                  </Stack>
                </Stack>
              </Box>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              <Box padding="4">
                {selectedTab === 0 && (
                  <Stack vertical spacing="loose">
                    <Text variant="headingLg">Customer Segments Overview</Text>

                    <Card>
                      <Box padding="4">
                        <Stack vertical spacing="tight">
                          <Text variant="headingMd">Summary Statistics</Text>
                          <Layout>
                            <Layout.Section oneQuarter>
                              <Stack vertical spacing="extraTight">
                                <Text variant="headingXl">{formatters.compact(segmentsData.summary.totalCustomers)}</Text>
                                <Text variant="bodySm" color="subdued">Total Customers</Text>
                              </Stack>
                            </Layout.Section>
                            <Layout.Section oneQuarter>
                              <Stack vertical spacing="extraTight">
                                <Text variant="headingXl">{segmentsData.summary.totalSegments}</Text>
                                <Text variant="bodySm" color="subdued">Active Segments</Text>
                              </Stack>
                            </Layout.Section>
                            <Layout.Section oneQuarter>
                              <Stack vertical spacing="extraTight">
                                <Text variant="headingXl">{formatters.currency(segmentsData.summary.avgLifetimeValue)}</Text>
                                <Text variant="bodySm" color="subdued">Avg Lifetime Value</Text>
                              </Stack>
                            </Layout.Section>
                            <Layout.Section oneQuarter>
                              <Stack vertical spacing="extraTight">
                                <Text variant="headingXl">{segmentsData.summary.highValueSegments}</Text>
                                <Text variant="bodySm" color="subdued">High-Value Segments</Text>
                              </Stack>
                            </Layout.Section>
                          </Layout>
                        </Stack>
                      </Box>
                    </Card>

                    <Layout>
                      <Layout.Section oneThird>
                        <PieChartComponent
                          title="Segment Size Distribution"
                          subtitle="Customer distribution across segments"
                          data={segmentSizeData}
                          dataKey="value"
                          nameKey="name"
                          height={250}
                          colors={CHART_COLORS.primary}
                          tooltipFormatter={(value, name) => [formatters.compact(value), 'Customers']}
                        />
                      </Layout.Section>

                      <Layout.Section oneThird>
                        <PieChartComponent
                          title="Profitability Distribution"
                          subtitle="Segments by profitability level"
                          data={profitabilityData}
                          dataKey="value"
                          nameKey="name"
                          height={250}
                          colors={[CHART_COLORS.success[0], CHART_COLORS.warning[0], CHART_COLORS.danger[0]]}
                          tooltipFormatter={(value, name) => [formatters.compact(value), 'Customers']}
                        />
                      </Layout.Section>

                      <Layout.Section oneThird>
                        <ScatterPlot
                          title="Size vs Lifetime Value"
                          subtitle="Segment positioning"
                          data={ltvVsSizeData}
                          xDataKey="x"
                          yDataKey="y"
                          height={250}
                          color={CHART_COLORS.info[0]}
                          xAxisLabel="Segment Size"
                          yAxisLabel="Lifetime Value"
                          xAxisFormatter={(value) => formatters.compact(value)}
                          yAxisFormatter={(value) => formatters.currency(value)}
                          tooltipFormatter={(value, name) => {
                            if (name === 'x') return [formatters.compact(value), 'Customers'];
                            if (name === 'y') return [formatters.currency(value), 'LTV'];
                            return [value.toString(), name];
                          }}
                        />
                      </Layout.Section>
                    </Layout>
                  </Stack>
                )}

                {selectedTab === 1 && (
                  <Stack vertical spacing="loose">
                    <Text variant="headingLg">Customer Segment Details</Text>
                    {renderSegmentsTable()}
                  </Stack>
                )}

                {selectedTab === 2 && (
                  <Stack vertical spacing="loose">
                    <Text variant="headingLg">Customer Demographics</Text>
                    {renderDemographics()}
                  </Stack>
                )}

                {selectedTab === 3 && (
                  <Stack vertical spacing="loose">
                    <Text variant="headingLg">Customer Behavior Patterns</Text>
                    {renderBehaviorPatterns()}
                  </Stack>
                )}

                {selectedTab === 4 && (
                  <Stack vertical spacing="loose">
                    <Text variant="headingLg">Lifetime Value Analysis</Text>
                    {renderLifetimeValueProjections()}
                  </Stack>
                )}

                {selectedTab === 5 && (
                  <Stack vertical spacing="loose">
                    <Text variant="headingLg">Segment Growth Analysis</Text>
                    {renderGrowthTrends()}
                  </Stack>
                )}
              </Box>
            </Tabs>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Segment Detail Modal */}
      {selectedSegment && (
        <Modal
          open={showSegmentModal}
          onClose={() => setShowSegmentModal(false)}
          title={selectedSegment.name}
          large
        >
          <Modal.Section>
            <Stack vertical spacing="loose">
              <TextContainer>
                <Text variant="headingMd">Segment Profile</Text>
                <p><strong>Description:</strong> {selectedSegment.description}</p>
                <p><strong>Size:</strong> {formatters.compact(selectedSegment.size)} customers ({selectedSegment.percentage.toFixed(1)}%)</p>
                <p><strong>Lifetime Value:</strong> {formatters.currency(selectedSegment.avgLifetimeValue)}</p>
                <p><strong>Average Order Value:</strong> {formatters.currency(selectedSegment.avgOrderValue)}</p>
                <p><strong>Purchase Frequency:</strong> {selectedSegment.purchaseFrequency.toFixed(1)} orders per period</p>
                <p><strong>Conversion Rate:</strong> {(selectedSegment.conversionRate * 100).toFixed(2)}%</p>
                <p><strong>Profitability:</strong> {selectedSegment.profitability}</p>
                <p><strong>Growth Trend:</strong> {selectedSegment.growth}</p>

                <Text variant="headingMd">Behavior Insights</Text>
                <p><strong>Top Channels:</strong> {selectedSegment.behavior.topChannels.join(', ')}</p>
                <p><strong>Preferred Devices:</strong> {selectedSegment.behavior.preferredDevices.join(', ')}</p>
                <p><strong>Avg Session Duration:</strong> {selectedSegment.behavior.averageSessionDuration} minutes</p>
                <p><strong>Pages per Session:</strong> {selectedSegment.behavior.pagesPerSession.toFixed(1)}</p>

                <Text variant="headingMd">Demographics</Text>
                <List type="bullet">
                  {selectedSegment.demographics.slice(0, 5).map((demo, index) => (
                    <List.Item key={index}>
                      {demo.ageGroup && `Age: ${demo.ageGroup}`}
                      {demo.gender && `, Gender: ${demo.gender}`}
                      {demo.income && `, Income: ${demo.income}`}
                      {demo.location && `, Location: ${demo.location}`}
                      {` (${demo.percentage.toFixed(1)}%)`}
                    </List.Item>
                  ))}
                </List>
              </TextContainer>
            </Stack>
          </Modal.Section>
        </Modal>
      )}

      {/* Behavior Pattern Detail Modal */}
      {selectedBehaviorPattern && (
        <Modal
          open={showBehaviorModal}
          onClose={() => setShowBehaviorModal(false)}
          title={selectedBehaviorPattern.pattern}
          large
        >
          <Modal.Section>
            <Stack vertical spacing="loose">
              <TextContainer>
                <Text variant="headingMd">Behavior Pattern Analysis</Text>
                <p><strong>Description:</strong> {selectedBehaviorPattern.description}</p>
                <p><strong>Frequency:</strong> {selectedBehaviorPattern.frequency}% of customers exhibit this pattern</p>
                <p><strong>Impact Level:</strong> {selectedBehaviorPattern.impact}</p>
                <p><strong>Actionable:</strong> {selectedBehaviorPattern.actionable ? 'Yes' : 'No'}</p>

                <Text variant="headingMd">Affected Segments</Text>
                <List type="bullet">
                  {selectedBehaviorPattern.segments.map(segmentId => {
                    const segment = segmentsData?.segments.find(s => s.id === segmentId);
                    return segment ? (
                      <List.Item key={segmentId}>{segment.name} - {segment.description}</List.Item>
                    ) : null;
                  })}
                </List>

                {selectedBehaviorPattern.actionable && (
                  <>
                    <Text variant="headingMd">Recommended Actions</Text>
                    <p>{selectedBehaviorPattern.recommendation}</p>
                  </>
                )}
              </TextContainer>
            </Stack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}