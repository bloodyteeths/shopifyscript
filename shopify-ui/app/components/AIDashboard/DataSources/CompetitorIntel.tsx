/**
 * Competitor Intelligence Component for AI Dashboard
 * Displays threat matrix, market positioning, ad copy analysis, and competitive insights
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
  Modal,
  TextContainer,
  List,
  Avatar,
  Link,
  Tooltip,
  Icon,
  Collapsible,
  Divider,
  ProgressBar,
  ChoiceList
} from '@shopify/polaris';
import {
  SearchIcon,
  ExportIcon,
  RefreshIcon,
  ViewIcon,
  InfoIcon,
  AlertTriangleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ExternalIcon
} from '@shopify/polaris-icons';
import {
  CompetitorIntelData,
  CompetitorProfile,
  AdCopyData,
  CompetitiveAdvantage,
  CompetitiveGap,
  CompetitorChange,
  DataVisualizationProps,
  FilterState,
  ExportOptions
} from './types';
import {
  BaseChart,
  ScatterPlot,
  BarChartComponent,
  TrendLineChart,
  PieChartComponent,
  formatters,
  CHART_COLORS
} from './charts';

interface CompetitorIntelProps extends DataVisualizationProps {
  data?: CompetitorIntelData;
}

export function CompetitorIntel({
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
}: CompetitorIntelProps) {
  // State management
  const [intelData, setIntelData] = useState<CompetitorIntelData | null>(data || null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorProfile | null>(null);
  const [showCompetitorModal, setShowCompetitorModal] = useState(false);
  const [selectedAdCopy, setSelectedAdCopy] = useState<AdCopyData | null>(null);
  const [showAdCopyModal, setShowAdCopyModal] = useState(false);
  const [threatLevelFilter, setThreatLevelFilter] = useState<string[]>([]);
  const [platformFilter, setPlatformFilter] = useState<string[]>([]);
  const [loading, setLoading] = useState(isLoading);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    threatMatrix: true,
    positioning: false,
    advantages: false,
    gaps: false,
    changes: false
  });

  // Fetch data
  const fetchCompetitorIntel = async () => {
    if (data) return; // Use provided data if available

    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/competitor-intel?shop=${shopName}`);
      const result = await response.json();

      if (result.success) {
        setIntelData(result.data);
      } else {
        console.error('Failed to fetch competitor intelligence:', result.error);
      }
    } catch (error: unknown) {
      console.error('Error fetching competitor intelligence:', error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitorIntel();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchCompetitorIntel, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [shopName, refreshInterval]);

  // Filter and search logic
  const filteredCompetitors = useMemo(() => {
    if (!intelData?.competitors) return [];

    return intelData.competitors.filter(competitor => {
      // Search filter
      if (searchQuery && !competitor.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !competitor.domain.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Threat level filter
      if (threatLevelFilter.length > 0 && !threatLevelFilter.includes(competitor.threatLevel)) {
        return false;
      }

      return true;
    });
  }, [intelData?.competitors, searchQuery, threatLevelFilter]);

  const filteredAdCopies = useMemo(() => {
    if (!intelData?.adCopies) return [];

    return intelData.adCopies.filter(adCopy => {
      // Search filter
      if (searchQuery && !adCopy.headline.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !adCopy.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Platform filter
      if (platformFilter.length > 0 && !platformFilter.includes(adCopy.platform)) {
        return false;
      }

      return true;
    });
  }, [intelData?.adCopies, searchQuery, platformFilter]);

  // Chart data preparation
  const marketPositionData = useMemo(() => {
    if (!intelData?.competitors) return [];

    return intelData.competitors.map(competitor => ({
      name: competitor.name,
      x: competitor.marketPosition.x, // Market share
      y: competitor.marketPosition.y, // Growth rate
      value: competitor.estimatedRevenue,
      threatLevel: competitor.threatLevel,
      date: competitor.name
    }));
  }, [intelData?.competitors]);

  const threatMatrixData = useMemo(() => {
    if (!intelData?.threatMatrix) return [];

    return [
      { name: 'High Threat', value: intelData.threatMatrix.high.length, date: 'high' },
      { name: 'Medium Threat', value: intelData.threatMatrix.medium.length, date: 'medium' },
      { name: 'Low Threat', value: intelData.threatMatrix.low.length, date: 'low' }
    ];
  }, [intelData?.threatMatrix]);

  const platformDistribution = useMemo(() => {
    if (!intelData?.adCopies) return [];

    const platforms = intelData.adCopies.reduce((acc, adCopy) => {
      acc[adCopy.platform] = (acc[adCopy.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(platforms).map(([platform, count]) => ({
      name: platform,
      value: count,
      date: platform
    }));
  }, [intelData?.adCopies]);

  const adCopyPerformanceData = useMemo(() => {
    if (!intelData?.adCopies) return [];

    return intelData.adCopies
      .filter(adCopy => adCopy.status === 'active')
      .slice(0, 10) // Top 10 by CTR
      .sort((a, b) => b.performance.estimatedCTR - a.performance.estimatedCTR)
      .map(adCopy => ({
        name: adCopy.headline.substring(0, 30) + '...',
        value: adCopy.performance.estimatedCTR * 100,
        impressions: adCopy.performance.estimatedImpressions,
        clicks: adCopy.performance.estimatedClicks,
        date: adCopy.headline
      }));
  }, [intelData?.adCopies]);

  // Export functionality
  const handleExport = (options: ExportOptions) => {
    console.log('Exporting competitor intelligence:', options);
    // Implementation would go here
  };

  // Render helper functions
  const renderThreatMatrix = () => {
    if (!intelData?.threatMatrix) return null;

    const threatLevels = [
      { level: 'high', data: intelData.threatMatrix.high, color: CHART_COLORS.danger[0], title: 'High Threat' },
      { level: 'medium', data: intelData.threatMatrix.medium, color: CHART_COLORS.warning[0], title: 'Medium Threat' },
      { level: 'low', data: intelData.threatMatrix.low, color: CHART_COLORS.success[0], title: 'Low Threat' }
    ];

    return (
      <Layout>
        <Layout.Section variant="oneHalf">
          <PieChartComponent
            title="Threat Level Distribution"
            subtitle="Competitors categorized by threat level"
            data={threatMatrixData}
            dataKey="value"
            nameKey="name"
            height={300}
            colors={[CHART_COLORS.danger[0], CHART_COLORS.warning[0], CHART_COLORS.success[0]]}
            tooltipFormatter={(value, name) => [`${value} competitors`, name]}
          />
        </Layout.Section>
        <Layout.Section variant="oneHalf">
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">Threat Matrix Details</Text>
                {threatLevels.map(({ level, data, color, title }) => (
                  <Collapsible
                    key={level}
                    open={expandedSections[level]}
                    id={level}
                    transition={{duration: '150ms', timingFunction: 'ease'}}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      style={{ cursor: 'pointer', width: '100%' }}
                      onClick={() => setExpandedSections(prev => ({ ...prev, [level]: !prev[level] }))}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpandedSections(prev => ({ ...prev, [level]: !prev[level] })); }}
                    >
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="200" blockAlign="center">
                          <div style={{ width: '12px', height: '12px', backgroundColor: color, borderRadius: '4px' }} />
                          <Text as="p" variant="bodyMd" fontWeight="medium">{title}</Text>
                          <Badge tone={level === 'high' ? 'critical' : level === 'medium' ? 'attention' : 'success'}>
                            {String(data.length)}
                          </Badge>
                        </InlineStack>
                        <Icon source={expandedSections[level] ? ChevronUpIcon : ChevronDownIcon} />
                      </InlineStack>
                    </div>
                    <Box paddingBlockStart="200">
                      <BlockStack gap="200">
                        {data.slice(0, 5).map(competitor => (
                          <InlineStack key={competitor.id} align="space-between" blockAlign="center">
                            <InlineStack gap="200" blockAlign="center">
                              <Avatar size="sm" name={competitor.name} />
                              <BlockStack gap="100">
                                <Text as="span" variant="bodySm" fontWeight="medium">{competitor.name}</Text>
                                <Text as="span" variant="bodySm" tone="subdued">{competitor.domain}</Text>
                              </BlockStack>
                            </InlineStack>
                            <Text as="span" variant="bodySm">{formatters.compact(competitor.estimatedRevenue)}</Text>
                          </InlineStack>
                        ))}
                        {data.length > 5 && (
                          <Text as="span" variant="bodySm" tone="subdued">+{data.length - 5} more...</Text>
                        )}
                      </BlockStack>
                    </Box>
                  </Collapsible>
                ))}
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    );
  };

  const renderCompetitorsTable = () => {
    const competitorTableData = filteredCompetitors.map(competitor => [
      <InlineStack blockAlign="center" gap="200" key={competitor.id}>
        <Avatar size="sm" name={competitor.name} />
        <Box>
          <Text as="p" variant="bodyMd" fontWeight="medium">{competitor.name}</Text>
          <Text as="span" variant="bodySm" tone="subdued">{competitor.domain}</Text>
        </Box>
      </InlineStack>,
      <Badge tone={competitor.threatLevel === 'high' ? 'critical' : competitor.threatLevel === 'medium' ? 'attention' : 'success'}>
        {competitor.threatLevel}
      </Badge>,
      <Text as="span">{formatters.currency(competitor.estimatedRevenue)}</Text>,
      <Text as="span">{formatters.compact(competitor.employeeCount)} employees</Text>,
      <InlineStack gap="200">
        <Text as="span" variant="bodySm">Share: {competitor.marketPosition.x}%</Text>
        <Text as="span" variant="bodySm">Growth: {competitor.marketPosition.y}%</Text>
      </InlineStack>,
      <Text as="span" variant="bodySm">{formatters.date(competitor.lastUpdated)}</Text>,
      <Button
        variant="plain"
        icon={ViewIcon}
        onClick={() => {
          setSelectedCompetitor(competitor);
          setShowCompetitorModal(true);
        }}
        accessibilityLabel={`View details for ${competitor.name}`}
      />
    ]);

    return (
      <DataTable
        columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text']}
        headings={['Competitor', 'Threat Level', 'Est. Revenue', 'Size', 'Market Position', 'Last Updated', 'Actions']}
        rows={competitorTableData}
        pagination={{
          hasNext: true,
          hasPrevious: false,
          onNext: () => {},
          onPrevious: () => {}
        }}
      />
    );
  };

  const renderAdCopiesTable = () => {
    const adCopyTableData = filteredAdCopies.map(adCopy => {
      const competitor = intelData?.competitors.find(c => c.id === adCopy.competitorId);
      return [
        <BlockStack gap="100" key={adCopy.id}>
          <Text as="p" variant="bodyMd" fontWeight="medium">{adCopy.headline}</Text>
          <Text as="span" variant="bodySm" tone="subdued">{competitor?.name || 'Unknown'}</Text>
        </BlockStack>,
        <Text as="span">{adCopy.description.substring(0, 100)}...</Text>,
        <Badge tone="info">{adCopy.platform}</Badge>,
        <BlockStack gap="100">
          <Text as="span" variant="bodySm">CTR: {(adCopy.performance.estimatedCTR * 100).toFixed(2)}%</Text>
          <Text as="span" variant="bodySm" tone="subdued">
            {formatters.compact(adCopy.performance.estimatedImpressions)} impressions
          </Text>
        </BlockStack>,
        <Badge tone={adCopy.status === 'active' ? 'success' : adCopy.status === 'paused' ? 'attention' : 'critical'}>
          {adCopy.status}
        </Badge>,
        <Text as="span" variant="bodySm">{formatters.date(adCopy.firstSeen)}</Text>,
        <Button
          variant="plain"
          icon={ViewIcon}
          onClick={() => {
            setSelectedAdCopy(adCopy);
            setShowAdCopyModal(true);
          }}
          accessibilityLabel={`View ad copy details`}
        />
      ];
    });

    return (
      <DataTable
        columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text']}
        headings={['Headline', 'Description', 'Platform', 'Performance', 'Status', 'First Seen', 'Actions']}
        rows={adCopyTableData}
      />
    );
  };

  const renderAdvantagesAndGaps = () => {
    if (!intelData?.advantages || !intelData?.gaps) return null;

    return (
      <Layout>
        <Layout.Section variant="oneHalf">
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">Competitive Advantages</Text>
                <BlockStack gap="200">
                  {intelData.advantages.slice(0, 5).map(advantage => (
                    <Card key={advantage.id}>
                      <Box padding="300">
                        <BlockStack gap="200">
                          <InlineStack align="space-between" blockAlign="center">
                            <Text as="p" variant="bodyMd" fontWeight="medium">{advantage.advantage}</Text>
                            <Badge tone="success">{advantage.importance}</Badge>
                          </InlineStack>
                          <Text as="p" variant="bodySm" tone="subdued">{advantage.description}</Text>
                          {advantage.actionable && (
                            <Box paddingBlockStart="200">
                              <Text as="p" variant="bodySm" fontWeight="medium">{advantage.recommendation}</Text>
                            </Box>
                          )}
                        </BlockStack>
                      </Box>
                    </Card>
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
                <Text as="h3" variant="headingMd">Competitive Gaps</Text>
                <BlockStack gap="200">
                  {intelData.gaps.slice(0, 5).map(gap => (
                    <Card key={gap.id}>
                      <Box padding="300">
                        <BlockStack gap="200">
                          <InlineStack align="space-between" blockAlign="center">
                            <Text as="p" variant="bodyMd" fontWeight="medium">{gap.gap}</Text>
                            <InlineStack gap="100">
                              <Badge tone="attention">{gap.impact}</Badge>
                              <Badge tone="info">{gap.difficulty}</Badge>
                            </InlineStack>
                          </InlineStack>
                          <Text as="p" variant="bodySm" tone="subdued">{gap.description}</Text>
                          <Box paddingBlockStart="200">
                            <Text as="p" variant="bodySm" fontWeight="medium">{gap.recommendation}</Text>
                          </Box>
                        </BlockStack>
                      </Box>
                    </Card>
                  ))}
                </BlockStack>
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    );
  };

  const renderRecentChanges = () => {
    if (!intelData?.recentChanges) return null;

    return (
      <Card>
        <Box padding="400">
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">Recent Competitor Changes</Text>
            <BlockStack gap="200">
              {intelData.recentChanges.slice(0, 10).map(change => {
                const competitor = intelData.competitors.find(c => c.id === change.competitorId);
                return (
                  <Card key={change.id}>
                    <Box padding="300">
                      <BlockStack gap="200">
                        <InlineStack align="space-between" blockAlign="center">
                          <InlineStack gap="200" blockAlign="center">
                            <Avatar size="sm" name={competitor?.name || 'Unknown'} />
                            <BlockStack gap="100">
                              <Text as="p" variant="bodyMd" fontWeight="medium">{competitor?.name || 'Unknown Competitor'}</Text>
                              <Text as="span" variant="bodySm" tone="subdued">{change.changeType}</Text>
                            </BlockStack>
                          </InlineStack>
                          <InlineStack gap="200" blockAlign="center">
                            <Badge tone={change.impact === 'positive' ? 'success' : change.impact === 'negative' ? 'critical' : 'attention'}>
                              {change.impact}
                            </Badge>
                            <Text as="span" variant="bodySm" tone="subdued">{formatters.date(change.detectedDate)}</Text>
                          </InlineStack>
                        </InlineStack>
                        <Text as="p" variant="bodySm">{change.description}</Text>
                        <Collapsible
                          open={expandedSections[`change-${change.id}`]}
                          id={`change-${change.id}`}
                          transition={{duration: '150ms', timingFunction: 'ease'}}
                        >
                          <Box paddingBlockStart="200">
                            <Text as="p" variant="bodySm" tone="subdued">{change.details}</Text>
                          </Box>
                        </Collapsible>
                        <Button
                          variant="plain"
                          size="slim"
                          onClick={() => setExpandedSections(prev => ({
                            ...prev,
                            [`change-${change.id}`]: !prev[`change-${change.id}`]
                          }))}
                        >
                          {expandedSections[`change-${change.id}`] ? 'Show less' : 'Show details'}
                        </Button>
                      </BlockStack>
                    </Box>
                  </Card>
                );
              })}
            </BlockStack>
          </BlockStack>
        </Box>
      </Card>
    );
  };

  // Main render
  if (loading && !intelData) {
    return (
      <Card>
        <Box padding="800">
          <InlineStack align="center" blockAlign="center">
            <Spinner size="large" />
            <Text as="p" variant="bodyLg">Loading competitor intelligence...</Text>
          </InlineStack>
        </Box>
      </Card>
    );
  }

  if (error || !intelData) {
    return (
      <Card>
        <EmptyState
          heading="Unable to load competitor intelligence"
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          action={{
            content: 'Retry',
            onAction: () => {
              fetchCompetitorIntel();
              onRefresh?.();
            }
          }}
        >
          <p>{error || 'No competitor intelligence data available'}</p>
        </EmptyState>
      </Card>
    );
  }

  const tabs = [
    { id: 'overview', content: 'Overview' },
    { id: 'matrix', content: 'Threat Matrix' },
    { id: 'positioning', content: 'Market Positioning' },
    { id: 'competitors', content: `Competitors (${filteredCompetitors.length})` },
    { id: 'adcopies', content: `Ad Copies (${filteredAdCopies.length})` },
    { id: 'insights', content: 'Advantages & Gaps' },
    { id: 'changes', content: 'Recent Changes' }
  ];

  return (
    <Page
      title="Competitor Intelligence"
      subtitle={`Last analyzed: ${formatters.dateTime(intelData.lastAnalyzed)} | Status: ${intelData.analysisStatus}`}
      secondaryActions={[
        {
          content: 'Refresh',
          icon: RefreshIcon,
          onAction: () => {
            fetchCompetitorIntel();
            onRefresh?.();
          }
        },
        ...(showExport ? [{
          content: 'Export',
          icon: ExportIcon,
          onAction: () => handleExport({ format: 'csv', filename: 'competitor-intelligence' })
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
                        placeholder="Search competitors, ad copies..."
                        clearButton
                        onClearButtonClick={() => setSearchQuery('')}
                        autoComplete="off"
                      />
                    </Box>

                    <Box minWidth="150px">
                      <ChoiceList
                        title="Threat Level"
                        choices={[
                          { label: 'High', value: 'high' },
                          { label: 'Medium', value: 'medium' },
                          { label: 'Low', value: 'low' }
                        ]}
                        selected={threatLevelFilter}
                        onChange={setThreatLevelFilter}
                        allowMultiple
                      />
                    </Box>

                    <Box minWidth="150px">
                      <ChoiceList
                        title="Platform"
                        choices={[
                          { label: 'Google', value: 'google' },
                          { label: 'Facebook', value: 'facebook' },
                          { label: 'Instagram', value: 'instagram' },
                          { label: 'LinkedIn', value: 'linkedin' }
                        ]}
                        selected={platformFilter}
                        onChange={setPlatformFilter}
                        allowMultiple
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
                    <Text as="h2" variant="headingLg">Competitor Intelligence Overview</Text>

                    <Layout>
                      <Layout.Section variant="oneThird">
                        <PieChartComponent
                          title="Platform Distribution"
                          subtitle="Ad copies by platform"
                          data={platformDistribution}
                          dataKey="value"
                          nameKey="name"
                          height={250}
                          colors={CHART_COLORS.primary}
                          tooltipFormatter={(value, name) => [`${value} ads`, name]}
                        />
                      </Layout.Section>

                      <Layout.Section>
                        <BarChartComponent
                          title="Top Performing Ad Copies"
                          subtitle="Estimated CTR for active ad copies"
                          data={adCopyPerformanceData}
                          dataKey="value"
                          xAxisKey="name"
                          height={250}
                          color={CHART_COLORS.info[0]}
                          yAxisFormatter={(value) => `${value}%`}
                          tooltipFormatter={(value, name) => [`${value.toFixed(2)}%`, 'CTR']}
                        />
                      </Layout.Section>
                    </Layout>

                    <Card>
                      <Box padding="400">
                        <BlockStack gap="200">
                          <Text as="h3" variant="headingMd">Quick Stats</Text>
                          <Layout>
                            <Layout.Section variant="oneThird">
                              <BlockStack gap="100">
                                <Text as="h1" variant="headingXl">{intelData.competitors.length}</Text>
                                <Text as="span" variant="bodySm" tone="subdued">Competitors Tracked</Text>
                              </BlockStack>
                            </Layout.Section>
                            <Layout.Section variant="oneThird">
                              <BlockStack gap="100">
                                <Text as="h1" variant="headingXl">{intelData.adCopies.filter(ad => ad.status === 'active').length}</Text>
                                <Text as="span" variant="bodySm" tone="subdued">Active Ad Copies</Text>
                              </BlockStack>
                            </Layout.Section>
                            <Layout.Section variant="oneThird">
                              <BlockStack gap="100">
                                <Text as="h1" variant="headingXl">{intelData.advantages.length}</Text>
                                <Text as="span" variant="bodySm" tone="subdued">Advantages Identified</Text>
                              </BlockStack>
                            </Layout.Section>
                          </Layout>
                          <Box paddingBlockStart="200">
                            <BlockStack gap="100">
                              <Text as="h1" variant="headingXl">{intelData.gaps.length}</Text>
                              <Text as="span" variant="bodySm" tone="subdued">Gaps to Address</Text>
                            </BlockStack>
                          </Box>
                        </BlockStack>
                      </Box>
                    </Card>
                  </BlockStack>
                )}

                {selectedTab === 1 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Competitor Threat Matrix</Text>
                    {renderThreatMatrix()}
                  </BlockStack>
                )}

                {selectedTab === 2 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Market Positioning Map</Text>
                    <ScatterPlot
                      title="Market Position Analysis"
                      subtitle="Market share vs. growth rate"
                      data={marketPositionData}
                      xDataKey="x"
                      yDataKey="y"
                      height={400}
                      color={CHART_COLORS.primary[0]}
                      xAxisLabel="Market Share (%)"
                      yAxisLabel="Growth Rate (%)"
                      xAxisFormatter={(value) => `${value}%`}
                      yAxisFormatter={(value) => `${value}%`}
                      tooltipFormatter={(value, name) => [
                        name === 'x' ? `${value}% market share` : `${value}% growth`,
                        name === 'x' ? 'Market Share' : 'Growth Rate'
                      ]}
                    />
                  </BlockStack>
                )}

                {selectedTab === 3 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Competitor Profiles</Text>
                    {renderCompetitorsTable()}
                  </BlockStack>
                )}

                {selectedTab === 4 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Ad Copy Analysis</Text>
                    {renderAdCopiesTable()}
                  </BlockStack>
                )}

                {selectedTab === 5 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Competitive Analysis</Text>
                    {renderAdvantagesAndGaps()}
                  </BlockStack>
                )}

                {selectedTab === 6 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Recent Competitor Activity</Text>
                    {renderRecentChanges()}
                  </BlockStack>
                )}
              </Box>
            </Tabs>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Competitor Detail Modal */}
      {selectedCompetitor && (
        <Modal
          open={showCompetitorModal}
          onClose={() => setShowCompetitorModal(false)}
          title={selectedCompetitor.name}
          size="large"
        >
          <Modal.Section>
            <BlockStack gap="400">
              <TextContainer>
                <Text as="h3" variant="headingMd">Competitor Profile</Text>
                <p><strong>Domain:</strong> <Link external url={`https://${selectedCompetitor.domain}`}>{selectedCompetitor.domain}</Link></p>
                <p><strong>Threat Level:</strong> {selectedCompetitor.threatLevel}</p>
                <p><strong>Estimated Revenue:</strong> {formatters.currency(selectedCompetitor.estimatedRevenue)}</p>
                <p><strong>Employee Count:</strong> {formatters.compact(selectedCompetitor.employeeCount)}</p>
                <p><strong>Market Share:</strong> {selectedCompetitor.marketPosition.x}%</p>
                <p><strong>Growth Rate:</strong> {selectedCompetitor.marketPosition.y}%</p>
                <p><strong>Last Updated:</strong> {formatters.dateTime(selectedCompetitor.lastUpdated)}</p>
              </TextContainer>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}

      {/* Ad Copy Detail Modal */}
      {selectedAdCopy && (
        <Modal
          open={showAdCopyModal}
          onClose={() => setShowAdCopyModal(false)}
          title="Ad Copy Details"
          size="large"
        >
          <Modal.Section>
            <BlockStack gap="400">
              <TextContainer>
                <Text as="h3" variant="headingMd">Ad Copy Analysis</Text>
                <p><strong>Headline:</strong> {selectedAdCopy.headline}</p>
                <p><strong>Description:</strong> {selectedAdCopy.description}</p>
                <p><strong>CTA:</strong> {selectedAdCopy.cta}</p>
                <p><strong>Platform:</strong> {selectedAdCopy.platform}</p>
                <p><strong>Status:</strong> {selectedAdCopy.status}</p>

                <Text as="h3" variant="headingMd">Performance Metrics</Text>
                <p><strong>Estimated Impressions:</strong> {formatters.compact(selectedAdCopy.performance.estimatedImpressions)}</p>
                <p><strong>Estimated Clicks:</strong> {formatters.compact(selectedAdCopy.performance.estimatedClicks)}</p>
                <p><strong>Estimated CTR:</strong> {(selectedAdCopy.performance.estimatedCTR * 100).toFixed(2)}%</p>

                <Text as="h3" variant="headingMd">Timeline</Text>
                <p><strong>First Seen:</strong> {formatters.dateTime(selectedAdCopy.firstSeen)}</p>
                <p><strong>Last Seen:</strong> {formatters.dateTime(selectedAdCopy.lastSeen)}</p>
              </TextContainer>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
