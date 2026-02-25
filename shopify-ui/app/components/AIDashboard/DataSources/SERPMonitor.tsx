/**
 * SERP Monitor Component for AI Dashboard
 * Displays keyword position tracking, visibility scores, competitor analysis, and bid landscape
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
  Modal,
  List,
  Tooltip,
  Icon,
  Divider,
  ProgressBar,
  Link,
  Collapsible,
  RangeSlider
} from '@shopify/polaris';
import {
  SearchIcon,
  ExportIcon,
  RefreshIcon,
  ViewIcon,
  InfoIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  ExternalIcon,
  StarIcon,
  LocationIcon,
  QuestionCircleIcon
} from '@shopify/polaris-icons';
import {
  SERPMonitorData,
  KeywordData,
  VisibilityScore,
  CompetitorPosition,
  SERPFeature,
  BidLandscapeData,
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
  ScatterPlot,
  formatters,
  CHART_COLORS
} from './charts';

interface SERPMonitorProps extends DataVisualizationProps {
  data?: SERPMonitorData;
}

export function SERPMonitor({
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
}: SERPMonitorProps) {
  // State management
  const [serpData, setSerpData] = useState<SERPMonitorData | null>(data || null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKeyword, setSelectedKeyword] = useState<KeywordData | null>(null);
  const [showKeywordModal, setShowKeywordModal] = useState(false);
  const [selectedBidData, setSelectedBidData] = useState<BidLandscapeData | null>(null);
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedIntents, setSelectedIntents] = useState<string[]>(['informational', 'navigational', 'commercial', 'transactional']);
  const [positionRange, setPositionRange] = useState<[number, number]>([1, 100]);
  const [difficultyRange, setDifficultyRange] = useState<[number, number]>([0, 100]);
  const [showTopKeywords, setShowTopKeywords] = useState(20);
  const [loading, setLoading] = useState(isLoading);
  const [selectedSerpFeature, setSerpFeature] = useState<SERPFeature | null>(null);
  const [showFeatureModal, setShowFeatureModal] = useState(false);

  // Fetch data
  const fetchSerpData = async () => {
    if (data) return; // Use provided data if available

    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/serp-monitor?shop=${shopName}`);
      const result = await response.json();

      if (result.success) {
        setSerpData(result.data);
      } else {
        console.error('Failed to fetch SERP data:', result.error);
      }
    } catch (err: unknown) {
      console.error('Error fetching SERP data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSerpData();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchSerpData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [shopName, refreshInterval]);

  // Filter and search logic
  const filteredKeywords = useMemo(() => {
    if (!serpData?.keywords) return [];

    return serpData.keywords.filter(keyword => {
      // Search filter
      if (searchQuery && !keyword.keyword.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !keyword.category.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Intent filter
      if (selectedIntents.length > 0 && !selectedIntents.includes(keyword.intent)) {
        return false;
      }

      // Position range filter
      if (keyword.currentPosition < positionRange[0] || keyword.currentPosition > positionRange[1]) {
        return false;
      }

      // Difficulty range filter
      if (keyword.difficulty < difficultyRange[0] || keyword.difficulty > difficultyRange[1]) {
        return false;
      }

      return true;
    });
  }, [serpData?.keywords, searchQuery, selectedIntents, positionRange, difficultyRange]);

  // Chart data preparation
  const positionTrendsData = useMemo(() => {
    if (!serpData?.trends.positionTrends) return [];

    return serpData.trends.positionTrends.map(trend => ({
      date: trend.date,
      value: trend.value,
      avgPosition: trend.value,
      visibility: serpData.trends.visibilityTrends.find(v => v.date === trend.date)?.value || 0
    }));
  }, [serpData?.trends]);

  const visibilityTrendsData = useMemo(() => {
    if (!serpData?.trends.visibilityTrends) return [];

    return serpData.trends.visibilityTrends.map(trend => ({
      date: trend.date,
      value: trend.value,
      visibility: trend.value
    }));
  }, [serpData?.trends.visibilityTrends]);

  const intentDistribution = useMemo(() => {
    if (!serpData?.keywords) return [];

    const intents = serpData.keywords.reduce((acc, keyword) => {
      acc[keyword.intent] = (acc[keyword.intent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(intents).map(([intent, count]) => ({
      name: intent,
      value: count,
      date: intent
    }));
  }, [serpData?.keywords]);

  const serpFeatureData = useMemo(() => {
    if (!serpData?.serpFeatures) return [];

    const features = serpData.serpFeatures.reduce((acc, feature) => {
      const key = feature.feature.replace('_', ' ');
      if (!acc[key]) {
        acc[key] = { total: 0, owned: 0 };
      }
      acc[key].total++;
      if (feature.owned) acc[key].owned++;
      return acc;
    }, {} as Record<string, { total: number; owned: number }>);

    return Object.entries(features).map(([feature, data]) => ({
      name: feature,
      value: data.total - data.owned,
      total: data.total,
      owned: data.owned,
      opportunity: data.total - data.owned,
      date: feature
    }));
  }, [serpData?.serpFeatures]);

  const competitorPerformanceData = useMemo(() => {
    if (!serpData?.competitorPositions) return [];

    const competitors = serpData.competitorPositions.reduce((acc, position) => {
      if (!acc[position.competitor]) {
        acc[position.competitor] = { positions: [], visibility: 0, count: 0 };
      }
      acc[position.competitor].positions.push(position.position);
      acc[position.competitor].visibility += position.visibility;
      acc[position.competitor].count++;
      return acc;
    }, {} as Record<string, { positions: number[]; visibility: number; count: number }>);

    return Object.entries(competitors).map(([competitor, data]) => ({
      name: competitor,
      value: data.positions.reduce((sum, pos) => sum + pos, 0) / data.positions.length,
      avgPosition: data.positions.reduce((sum, pos) => sum + pos, 0) / data.positions.length,
      visibility: data.visibility / data.count,
      keywords: data.count,
      date: competitor
    }));
  }, [serpData?.competitorPositions]);

  const positionDifficultyData = useMemo(() => {
    if (!serpData?.keywords) return [];

    return serpData.keywords.map(keyword => ({
      name: keyword.keyword,
      x: keyword.difficulty,
      y: keyword.currentPosition,
      value: keyword.searchVolume,
      change: keyword.positionChange,
      date: keyword.keyword
    }));
  }, [serpData?.keywords]);

  // Export functionality
  const handleExport = (options: ExportOptions) => {
    console.log('Exporting SERP data:', options);
    // Implementation would go here
  };

  // Helper functions
  const getPositionChangeIcon = (change: number) => {
    if (change > 0) return { icon: ArrowUpIcon, tone: 'success' as const };
    if (change < 0) return { icon: ArrowDownIcon, tone: 'critical' as const };
    return { icon: MinusIcon, tone: 'subdued' as const };
  };

  const getPositionBadgeColor = (position: number) => {
    if (position <= 3) return 'success';
    if (position <= 10) return 'attention';
    return 'critical';
  };

  // Render helper functions
  const renderKeywordsTable = () => {
    const keywordTableData = filteredKeywords.slice(0, showTopKeywords).map(keyword => {
      const changeIcon = getPositionChangeIcon(keyword.positionChange);
      return [
        <InlineStack align="center" gap="200" key={keyword.id}>
          <Text as="p" variant="bodyMd" fontWeight="medium">{keyword.keyword}</Text>
          <Badge tone="info">{keyword.category}</Badge>
        </InlineStack>,
        <Badge tone={getPositionBadgeColor(keyword.currentPosition)}>{`#${keyword.currentPosition}`}</Badge>,
        <InlineStack align="center" gap="200">
          <Icon source={changeIcon.icon} tone={changeIcon.tone} />
          <Text as="span" variant="bodySm" tone={changeIcon.tone}>
            {keyword.positionChange > 0 ? '+' : ''}{keyword.positionChange}
          </Text>
        </InlineStack>,
        <Text as="span">{formatters.compact(keyword.searchVolume)}</Text>,
        <InlineStack align="center" gap="200">
          <ProgressBar progress={keyword.difficulty} size="small" />
          <Text as="span" variant="bodySm">{keyword.difficulty}%</Text>
        </InlineStack>,
        <Text as="span">{formatters.currency(keyword.cpc)}</Text>,
        <Badge tone="info">{keyword.intent}</Badge>,
        <Text as="span" variant="bodySm">{formatters.date(keyword.lastUpdated)}</Text>,
        <InlineStack gap="100">
          <Button
            variant="plain"
            icon={ViewIcon}
            onClick={() => {
              setSelectedKeyword(keyword);
              setShowKeywordModal(true);
            }}
            accessibilityLabel={`View details for ${keyword.keyword}`}
          />
          <Button
            variant="plain"
            icon={ExternalIcon}
            url={keyword.url}
            external
            accessibilityLabel={`View ranking page for ${keyword.keyword}`}
          />
        </InlineStack>
      ];
    });

    return (
      <DataTable
        columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text', 'text', 'text']}
        headings={['Keyword', 'Position', 'Change', 'Volume', 'Difficulty', 'CPC', 'Intent', 'Updated', 'Actions']}
        rows={keywordTableData}
        pagination={{
          hasNext: filteredKeywords.length > showTopKeywords,
          hasPrevious: false,
          onNext: () => setShowTopKeywords(prev => prev + 20),
          onPrevious: () => {}
        }}
      />
    );
  };

  const renderCompetitorPositions = () => {
    if (!serpData?.competitorPositions) return null;

    const competitorTableData = competitorPerformanceData.map(competitor => [
      <Text as="span" key={competitor.name} fontWeight="medium">{competitor.name}</Text>,
      <Text as="span">{competitor.avgPosition.toFixed(1)}</Text>,
      <InlineStack align="center" gap="200">
        <ProgressBar progress={competitor.visibility} size="small" />
        <Text as="span" variant="bodySm">{competitor.visibility.toFixed(1)}%</Text>
      </InlineStack>,
      <Text as="span">{competitor.keywords}</Text>
    ]);

    return (
      <Layout>
        <Layout.Section variant="oneHalf">
          <BarChartComponent
            title="Competitor Performance"
            subtitle="Average positions vs visibility"
            data={competitorPerformanceData}
            dataKey="avgPosition"
            xAxisKey="name"
            height={300}
            color={CHART_COLORS.warning[0]}
            yAxisFormatter={(value) => `#${value.toFixed(0)}`}
            tooltipFormatter={(value, name) => [`Position #${value.toFixed(1)}`, 'Avg Position']}
          />
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">Competitor Analysis</Text>
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text']}
                  headings={['Competitor', 'Avg Position', 'Visibility', 'Keywords']}
                  rows={competitorTableData}
                />
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    );
  };

  const renderSerpFeatures = () => {
    if (!serpData?.serpFeatures) return null;

    const featureTableData = serpFeatureData.map(feature => [
      <Text as="span" key={feature.name} fontWeight="medium">{feature.name}</Text>,
      <Text as="span">{feature.total}</Text>,
      <Badge tone="success">{String(feature.owned)}</Badge>,
      <Badge tone="attention">{String(feature.opportunity)}</Badge>,
      <InlineStack align="center" gap="200">
        <ProgressBar progress={(feature.owned / feature.total) * 100} size="small" />
        <Text as="span" variant="bodySm">{((feature.owned / feature.total) * 100).toFixed(1)}%</Text>
      </InlineStack>
    ]);

    return (
      <Layout>
        <Layout.Section variant="oneHalf">
          <BarChartComponent
            title="SERP Features Presence"
            subtitle="Opportunities vs current ownership"
            data={serpFeatureData}
            dataKey="opportunity"
            xAxisKey="name"
            height={300}
            color={CHART_COLORS.info[0]}
            yAxisFormatter={(value) => value.toString()}
            tooltipFormatter={(value, name) => [`${value} opportunities`, 'Available']}
          />
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">SERP Features Overview</Text>
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                  headings={['Feature', 'Total', 'Owned', 'Opportunity', 'Coverage']}
                  rows={featureTableData}
                />
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    );
  };

  const renderBidLandscape = () => {
    if (!serpData?.bidLandscape) return null;

    const bidTableData = serpData.bidLandscape.slice(0, 10).map(bid => [
      <Text as="span" key={bid.keyword} fontWeight="medium">{bid.keyword}</Text>,
      <Text as="span">#{bid.position}</Text>,
      <Text as="span">{formatters.currency(bid.estimatedBid)}</Text>,
      <Text as="span">{formatters.currency(bid.estimatedCPC)}</Text>,
      <Text as="span">{formatters.currency(bid.recommendedBid)}</Text>,
      <Badge tone={bid.budgetImpact > 0 ? 'critical' : 'success'}>{`${bid.budgetImpact > 0 ? '+' : ''}${formatters.currency(bid.budgetImpact)}`}</Badge>,
      <Button
        variant="plain"
        icon={ViewIcon}
        onClick={() => {
          setSelectedBidData(bid);
          setShowBidModal(true);
        }}
        accessibilityLabel={`View bid analysis for ${bid.keyword}`}
      />
    ]);

    return (
      <Layout>
        <Layout.Section>
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">Bid Landscape Analysis</Text>
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text']}
                  headings={['Keyword', 'Position', 'Current Bid', 'Est. CPC', 'Recommended', 'Impact', 'Actions']}
                  rows={bidTableData}
                />
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    );
  };

  const renderVisibilityAnalysis = () => {
    if (!serpData?.visibilityScore) return null;

    const visibilityMetrics = [
      { name: 'Overall', value: serpData.visibilityScore.overall, color: CHART_COLORS.primary[0] },
      { name: 'Organic', value: serpData.visibilityScore.organic, color: CHART_COLORS.success[0] },
      { name: 'Paid', value: serpData.visibilityScore.paid, color: CHART_COLORS.warning[0] },
      { name: 'Local', value: serpData.visibilityScore.local, color: CHART_COLORS.info[0] }
    ];

    return (
      <Layout>
        <Layout.Section variant="oneHalf">
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">Visibility Scores</Text>
                <BlockStack gap="200">
                  {visibilityMetrics.map(metric => (
                    <InlineStack key={metric.name} align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <div style={{ width: '12px', height: '12px', backgroundColor: metric.color, borderRadius: '2px' }} />
                        <Text as="p" variant="bodyMd" fontWeight="medium">{metric.name}</Text>
                      </InlineStack>
                      <InlineStack gap="200" blockAlign="center">
                        <ProgressBar progress={metric.value} size="small" />
                        <Text as="p" variant="bodyMd" fontWeight="medium">{metric.value.toFixed(1)}%</Text>
                      </InlineStack>
                    </InlineStack>
                  ))}
                </BlockStack>

                <Divider />

                <InlineStack align="space-between" blockAlign="center">
                  <Text as="p" variant="bodyMd" fontWeight="medium">Overall Change</Text>
                  <InlineStack gap="200" blockAlign="center">
                    <Icon
                      source={serpData.visibilityScore.change > 0 ? ArrowUpIcon : serpData.visibilityScore.change < 0 ? ArrowDownIcon : MinusIcon}
                      tone={serpData.visibilityScore.change > 0 ? 'success' : serpData.visibilityScore.change < 0 ? 'critical' : 'subdued'}
                    />
                    <Text as="p" variant="bodyMd" fontWeight="medium">
                      {serpData.visibilityScore.change > 0 ? '+' : ''}{serpData.visibilityScore.change.toFixed(1)}%
                    </Text>
                  </InlineStack>
                </InlineStack>
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <TrendLineChart
            title="Visibility Trends"
            subtitle="Visibility score over time"
            data={visibilityTrendsData}
            dataKey="visibility"
            height={250}
            color={CHART_COLORS.primary[0]}
            yAxisFormatter={(value) => `${value}%`}
            tooltipFormatter={(value, name) => [`${value.toFixed(1)}%`, 'Visibility']}
          />
        </Layout.Section>
      </Layout>
    );
  };

  // Main render
  if (loading && !serpData) {
    return (
      <Card>
        <Box padding="800">
          <InlineStack align="center" blockAlign="center">
            <Spinner size="large" />
            <Text as="p" variant="bodyLg">Loading SERP monitoring data...</Text>
          </InlineStack>
        </Box>
      </Card>
    );
  }

  if (error || !serpData) {
    return (
      <Card>
        <EmptyState
          heading="Unable to load SERP monitoring data"
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          action={{
            content: 'Retry',
            onAction: () => {
              fetchSerpData();
              onRefresh?.();
            }
          }}
        >
          <p>{error || 'No SERP monitoring data available'}</p>
        </EmptyState>
      </Card>
    );
  }

  const tabs = [
    { id: 'overview', content: 'Overview' },
    { id: 'keywords', content: `Keywords (${filteredKeywords.length})` },
    { id: 'visibility', content: 'Visibility Analysis' },
    { id: 'competitors', content: 'Competitor Positions' },
    { id: 'features', content: 'SERP Features' },
    { id: 'bidding', content: 'Bid Landscape' }
  ];

  return (
    <Page
      title="SERP Monitor"
      subtitle={`Last updated: ${formatters.dateTime(serpData.lastUpdated)} | Status: ${serpData.analysisStatus}`}
      secondaryActions={[
        {
          content: 'Refresh',
          icon: RefreshIcon,
          onAction: () => {
            fetchSerpData();
            onRefresh?.();
          }
        },
        ...(showExport ? [{
          content: 'Export',
          icon: ExportIcon,
          onAction: () => handleExport({ format: 'csv' as const, filename: 'serp-monitor' })
        }] : [])
      ]}
    >
      <Layout>
        {showFilters && (
          <Layout.Section>
            <Card>
              <Box padding="400">
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">Filters</Text>

                  <InlineStack gap="200">
                    <Box minWidth="200px">
                      <TextField
                        label="Search"
                        value={searchQuery}
                        onChange={setSearchQuery}
                        prefix={<Icon source={SearchIcon} />}
                        placeholder="Search keywords..."
                        clearButton
                        onClearButtonClick={() => setSearchQuery('')}
                        autoComplete="off"
                      />
                    </Box>

                    <Box minWidth="150px">
                      <ChoiceList
                        title="Search Intent"
                        choices={[
                          { label: 'Informational', value: 'informational' },
                          { label: 'Navigational', value: 'navigational' },
                          { label: 'Commercial', value: 'commercial' },
                          { label: 'Transactional', value: 'transactional' }
                        ]}
                        selected={selectedIntents}
                        onChange={setSelectedIntents}
                        allowMultiple
                      />
                    </Box>

                    <Box minWidth="200px">
                      <RangeSlider
                        label="Position Range"
                        value={positionRange}
                        onChange={(value) => setPositionRange(value as [number, number])}
                        min={1}
                        max={100}
                        step={1}
                        output
                      />
                    </Box>

                    <Box minWidth="200px">
                      <RangeSlider
                        label="Difficulty Range"
                        value={difficultyRange}
                        onChange={(value) => setDifficultyRange(value as [number, number])}
                        min={0}
                        max={100}
                        step={1}
                        output
                      />
                    </Box>
                  </InlineStack>
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
                    <Text as="h2" variant="headingLg">SERP Monitoring Overview</Text>

                    <Card>
                      <Box padding="400">
                        <BlockStack gap="200">
                          <Text as="h3" variant="headingMd">Summary Statistics</Text>
                          <InlineStack gap="400" align="space-between">
                            <BlockStack gap="100">
                              <Text as="h1" variant="headingXl">{serpData.summary.totalKeywords}</Text>
                              <Text as="span" variant="bodySm" tone="subdued">Total Keywords</Text>
                            </BlockStack>
                            <BlockStack gap="100">
                              <Text as="h1" variant="headingXl">{`#${serpData.summary.averagePosition.toFixed(1)}`}</Text>
                              <Text as="span" variant="bodySm" tone="subdued">Avg Position</Text>
                            </BlockStack>
                            <BlockStack gap="100">
                              <Text as="h1" variant="headingXl">{serpData.summary.topPositions}</Text>
                              <Text as="span" variant="bodySm" tone="subdued">Top 3 Positions</Text>
                            </BlockStack>
                            <BlockStack gap="100">
                              <Text as="h1" variant="headingXl">{`${serpData.visibilityScore.overall.toFixed(1)}%`}</Text>
                              <Text as="span" variant="bodySm" tone="subdued">Visibility Score</Text>
                            </BlockStack>
                          </InlineStack>

                          <Divider />

                          <Layout>
                            <Layout.Section variant="oneThird">
                              <BlockStack gap="100">
                                <Text as="p" variant="bodyMd" fontWeight="medium">Position Changes</Text>
                                <InlineStack gap="200">
                                  <InlineStack gap="100" blockAlign="center">
                                    <Icon source={ArrowUpIcon} tone="success" />
                                    <Text as="span" variant="bodySm">{serpData.summary.improvedPositions} improved</Text>
                                  </InlineStack>
                                  <InlineStack gap="100" blockAlign="center">
                                    <Icon source={ArrowDownIcon} tone="critical" />
                                    <Text as="span" variant="bodySm">{serpData.summary.declinedPositions} declined</Text>
                                  </InlineStack>
                                </InlineStack>
                              </BlockStack>
                            </Layout.Section>
                          </Layout>
                        </BlockStack>
                      </Box>
                    </Card>

                    <Layout>
                      <Layout.Section variant="oneThird">
                        <PieChartComponent
                          title="Search Intent Distribution"
                          subtitle="Keywords by search intent"
                          data={intentDistribution}
                          dataKey="value"
                          nameKey="name"
                          height={250}
                          colors={CHART_COLORS.primary}
                          tooltipFormatter={(value, name) => [`${value} keywords`, name]}
                        />
                      </Layout.Section>

                      <Layout.Section>
                        <MultiLineChart
                          title="Position & Visibility Trends"
                          subtitle="Average position and visibility over time"
                          data={positionTrendsData}
                          lines={[
                            { dataKey: 'avgPosition', name: 'Avg Position', color: CHART_COLORS.warning[0] },
                            { dataKey: 'visibility', name: 'Visibility %', color: CHART_COLORS.success[0] }
                          ]}
                          height={250}
                          showLegend={true}
                          yAxisFormatter={(value) => value.toString()}
                          tooltipFormatter={(value, name) => {
                            if (name === 'Avg Position') return [`#${value.toFixed(1)}`, name];
                            return [`${value.toFixed(1)}%`, name];
                          }}
                        />
                      </Layout.Section>
                    </Layout>
                  </BlockStack>
                )}

                {selectedTab === 1 && (
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingLg">Keyword Performance</Text>
                      <Select
                        label=""
                        options={[
                          { label: 'Top 20', value: '20' },
                          { label: 'Top 50', value: '50' },
                          { label: 'Top 100', value: '100' },
                          { label: 'Show All', value: filteredKeywords.length.toString() }
                        ]}
                        value={showTopKeywords.toString()}
                        onChange={(value) => setShowTopKeywords(parseInt(value))}
                      />
                    </InlineStack>
                    {renderKeywordsTable()}

                    <Layout>
                      <Layout.Section>
                        <ScatterPlot
                          title="Keyword Difficulty vs Position"
                          subtitle="Position performance relative to keyword difficulty"
                          data={positionDifficultyData}
                          xDataKey="x"
                          yDataKey="y"
                          height={300}
                          color={CHART_COLORS.info[0]}
                          xAxisLabel="Keyword Difficulty (%)"
                          yAxisLabel="Current Position"
                          xAxisFormatter={(value) => `${value}%`}
                          yAxisFormatter={(value) => `#${value}`}
                          tooltipFormatter={(value, name) => {
                            if (name === 'x') return [`${value}%`, 'Difficulty'];
                            if (name === 'y') return [`#${value}`, 'Position'];
                            return [value.toString(), name];
                          }}
                        />
                      </Layout.Section>
                    </Layout>
                  </BlockStack>
                )}

                {selectedTab === 2 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Visibility Analysis</Text>
                    {renderVisibilityAnalysis()}
                  </BlockStack>
                )}

                {selectedTab === 3 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Competitor Position Analysis</Text>
                    {renderCompetitorPositions()}
                  </BlockStack>
                )}

                {selectedTab === 4 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">SERP Features Analysis</Text>
                    {renderSerpFeatures()}
                  </BlockStack>
                )}

                {selectedTab === 5 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Bid Landscape Analysis</Text>
                    {renderBidLandscape()}
                  </BlockStack>
                )}
              </Box>
            </Tabs>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Keyword Detail Modal */}
      {selectedKeyword && (
        <Modal
          open={showKeywordModal}
          onClose={() => setShowKeywordModal(false)}
          title={selectedKeyword.keyword}
          size="large"
        >
          <Modal.Section>
            <BlockStack gap="400">
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">Keyword Analysis</Text>
                <p><strong>Current Position:</strong> #{selectedKeyword.currentPosition}</p>
                <p><strong>Previous Position:</strong> #{selectedKeyword.previousPosition}</p>
                <p><strong>Position Change:</strong> {selectedKeyword.positionChange > 0 ? '+' : ''}{selectedKeyword.positionChange}</p>
                <p><strong>Search Volume:</strong> {formatters.compact(selectedKeyword.searchVolume)} monthly searches</p>
                <p><strong>Keyword Difficulty:</strong> {selectedKeyword.difficulty}%</p>
                <p><strong>Cost Per Click:</strong> {formatters.currency(selectedKeyword.cpc)}</p>
                <p><strong>Search Intent:</strong> {selectedKeyword.intent}</p>
                <p><strong>Category:</strong> {selectedKeyword.category}</p>
                <p><strong>Ranking URL:</strong> <Link external url={selectedKeyword.url}>{selectedKeyword.url}</Link></p>
                <p><strong>Last Updated:</strong> {formatters.dateTime(selectedKeyword.lastUpdated)}</p>

                <Text as="h3" variant="headingMd">Optimization Recommendations</Text>
                <List type="bullet">
                  <List.Item>Monitor position changes and investigate any significant drops</List.Item>
                  <List.Item>Optimize the ranking page for better user experience and relevance</List.Item>
                  <List.Item>Consider increasing content depth and quality for this keyword</List.Item>
                  <List.Item>Analyze competitor content to identify improvement opportunities</List.Item>
                </List>
              </BlockStack>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}

      {/* Bid Landscape Detail Modal */}
      {selectedBidData && (
        <Modal
          open={showBidModal}
          onClose={() => setShowBidModal(false)}
          title={`Bid Analysis: ${selectedBidData.keyword}`}
          size="large"
        >
          <Modal.Section>
            <BlockStack gap="400">
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">Bid Landscape Analysis</Text>
                <p><strong>Current Position:</strong> #{selectedBidData.position}</p>
                <p><strong>Estimated Bid:</strong> {formatters.currency(selectedBidData.estimatedBid)}</p>
                <p><strong>Estimated CPC:</strong> {formatters.currency(selectedBidData.estimatedCPC)}</p>
                <p><strong>Recommended Bid:</strong> {formatters.currency(selectedBidData.recommendedBid)}</p>
                <p><strong>Budget Impact:</strong> {formatters.currency(selectedBidData.budgetImpact)}</p>

                <Text as="h3" variant="headingMd">Competitor Bids</Text>
                <List type="bullet">
                  {selectedBidData.competitorBids.map((bid, index) => (
                    <List.Item key={index}>
                      {bid.competitor}: {formatters.currency(bid.estimatedBid)} (Position #{bid.position})
                    </List.Item>
                  ))}
                </List>

                <Text as="h3" variant="headingMd">Bidding Strategy</Text>
                <p>Based on the current competitive landscape, consider adjusting your bid strategy to improve position while maintaining cost efficiency.</p>
              </BlockStack>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
