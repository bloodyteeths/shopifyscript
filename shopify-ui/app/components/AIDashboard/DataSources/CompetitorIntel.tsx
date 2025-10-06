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
  Stack,
  Box,
  Spinner,
  EmptyState,
  Tabs,
  Tab,
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
  Choice,
  ChoiceList
} from '@shopify/polaris';
import {
  SearchIcon,
  ExportIcon,
  RefreshIcon,
  ViewIcon,
  InfoIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
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
    } catch (err) {
      console.error('Error fetching competitor intelligence:', err);
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
        <Layout.Section oneHalf>
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
        <Layout.Section oneHalf>
          <Card>
            <Box padding="4">
              <Stack vertical spacing="loose">
                <Text variant="headingMd">Threat Matrix Details</Text>
                {threatLevels.map(({ level, data, color, title }) => (
                  <Collapsible
                    key={level}
                    open={expandedSections[level]}
                    id={level}
                    transition={{duration: '150ms', timingFunction: 'ease'}}
                  >
                    <Button
                      plain
                      fullWidth
                      textAlign="left"
                      onClick={() => setExpandedSections(prev => ({ ...prev, [level]: !prev[level] }))}
                    >
                      <Stack distribution="spaceBetween" alignment="center">
                        <Stack spacing="tight" alignment="center">
                          <Box width="12px" height="12px" background={color} borderRadius="1" />
                          <Text variant="bodyMd" fontWeight="medium">{title}</Text>
                          <Badge tone={level === 'high' ? 'critical' : level === 'medium' ? 'attention' : 'success'}>
                            {data.length}
                          </Badge>
                        </Stack>
                        <Icon source={expandedSections[level] ? TrendingUpIcon : TrendingDownIcon} />
                      </Stack>
                    </Button>
                    <Box paddingBlockStart="2">
                      <Stack vertical spacing="tight">
                        {data.slice(0, 5).map(competitor => (
                          <Stack key={competitor.id} distribution="spaceBetween" alignment="center">
                            <Stack spacing="tight" alignment="center">
                              <Avatar size="small" name={competitor.name} />
                              <Stack vertical spacing="extraTight">
                                <Text variant="bodySm" fontWeight="medium">{competitor.name}</Text>
                                <Text variant="caption" color="subdued">{competitor.domain}</Text>
                              </Stack>
                            </Stack>
                            <Text variant="bodySm">{formatters.compact(competitor.estimatedRevenue)}</Text>
                          </Stack>
                        ))}
                        {data.length > 5 && (
                          <Text variant="caption" color="subdued">+{data.length - 5} more...</Text>
                        )}
                      </Stack>
                    </Box>
                  </Collapsible>
                ))}
              </Stack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    );
  };

  const renderCompetitorsTable = () => {
    const competitorTableData = filteredCompetitors.map(competitor => [
      <Stack alignment="center" spacing="tight" key={competitor.id}>
        <Avatar size="small" name={competitor.name} />
        <Box>
          <Text variant="bodyMd" fontWeight="medium">{competitor.name}</Text>
          <Text variant="bodySm" color="subdued">{competitor.domain}</Text>
        </Box>
      </Stack>,
      <Badge tone={competitor.threatLevel === 'high' ? 'critical' : competitor.threatLevel === 'medium' ? 'attention' : 'success'}>
        {competitor.threatLevel}
      </Badge>,
      <Text>{formatters.currency(competitor.estimatedRevenue)}</Text>,
      <Text>{formatters.compact(competitor.employeeCount)} employees</Text>,
      <Stack spacing="tight">
        <Text variant="bodySm">Share: {competitor.marketPosition.x}%</Text>
        <Text variant="bodySm">Growth: {competitor.marketPosition.y}%</Text>
      </Stack>,
      <Text variant="bodySm">{formatters.date(competitor.lastUpdated)}</Text>,
      <Button
        plain
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
        <Stack vertical spacing="extraTight" key={adCopy.id}>
          <Text variant="bodyMd" fontWeight="medium">{adCopy.headline}</Text>
          <Text variant="bodySm" color="subdued">{competitor?.name || 'Unknown'}</Text>
        </Stack>,
        <Text>{adCopy.description.substring(0, 100)}...</Text>,
        <Badge tone="info">{adCopy.platform}</Badge>,
        <Stack vertical spacing="extraTight">
          <Text variant="bodySm">CTR: {(adCopy.performance.estimatedCTR * 100).toFixed(2)}%</Text>
          <Text variant="caption" color="subdued">
            {formatters.compact(adCopy.performance.estimatedImpressions)} impressions
          </Text>
        </Stack>,
        <Badge tone={adCopy.status === 'active' ? 'success' : adCopy.status === 'paused' ? 'attention' : 'critical'}>
          {adCopy.status}
        </Badge>,
        <Text variant="bodySm">{formatters.date(adCopy.firstSeen)}</Text>,
        <Button
          plain
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
        <Layout.Section oneHalf>
          <Card>
            <Box padding="4">
              <Stack vertical spacing="loose">
                <Text variant="headingMd">Competitive Advantages</Text>
                <Stack vertical spacing="tight">
                  {intelData.advantages.slice(0, 5).map(advantage => (
                    <Card key={advantage.id} background="surface-success-subdued">
                      <Box padding="3">
                        <Stack vertical spacing="tight">
                          <Stack distribution="spaceBetween" alignment="center">
                            <Text variant="bodyMd" fontWeight="medium">{advantage.advantage}</Text>
                            <Badge tone="success">{advantage.importance}</Badge>
                          </Stack>
                          <Text variant="bodySm" color="subdued">{advantage.description}</Text>
                          {advantage.actionable && (
                            <Box paddingBlockStart="2">
                              <Text variant="bodySm" fontWeight="medium">{advantage.recommendation}</Text>
                            </Box>
                          )}
                        </Stack>
                      </Box>
                    </Card>
                  ))}
                </Stack>
              </Stack>
            </Box>
          </Card>
        </Layout.Section>

        <Layout.Section oneHalf>
          <Card>
            <Box padding="4">
              <Stack vertical spacing="loose">
                <Text variant="headingMd">Competitive Gaps</Text>
                <Stack vertical spacing="tight">
                  {intelData.gaps.slice(0, 5).map(gap => (
                    <Card key={gap.id} background="surface-warning-subdued">
                      <Box padding="3">
                        <Stack vertical spacing="tight">
                          <Stack distribution="spaceBetween" alignment="center">
                            <Text variant="bodyMd" fontWeight="medium">{gap.gap}</Text>
                            <Stack spacing="extraTight">
                              <Badge tone="attention">{gap.impact}</Badge>
                              <Badge tone="info">{gap.difficulty}</Badge>
                            </Stack>
                          </Stack>
                          <Text variant="bodySm" color="subdued">{gap.description}</Text>
                          <Box paddingBlockStart="2">
                            <Text variant="bodySm" fontWeight="medium">{gap.recommendation}</Text>
                          </Box>
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

  const renderRecentChanges = () => {
    if (!intelData?.recentChanges) return null;

    return (
      <Card>
        <Box padding="4">
          <Stack vertical spacing="loose">
            <Text variant="headingMd">Recent Competitor Changes</Text>
            <Stack vertical spacing="tight">
              {intelData.recentChanges.slice(0, 10).map(change => {
                const competitor = intelData.competitors.find(c => c.id === change.competitorId);
                return (
                  <Card key={change.id}>
                    <Box padding="3">
                      <Stack vertical spacing="tight">
                        <Stack distribution="spaceBetween" alignment="center">
                          <Stack spacing="tight" alignment="center">
                            <Avatar size="small" name={competitor?.name || 'Unknown'} />
                            <Stack vertical spacing="extraTight">
                              <Text variant="bodyMd" fontWeight="medium">{competitor?.name || 'Unknown Competitor'}</Text>
                              <Text variant="bodySm" color="subdued">{change.changeType}</Text>
                            </Stack>
                          </Stack>
                          <Stack spacing="tight" alignment="center">
                            <Badge tone={change.impact === 'positive' ? 'success' : change.impact === 'negative' ? 'critical' : 'attention'}>
                              {change.impact}
                            </Badge>
                            <Text variant="caption" color="subdued">{formatters.date(change.detectedDate)}</Text>
                          </Stack>
                        </Stack>
                        <Text variant="bodySm">{change.description}</Text>
                        <Collapsible
                          open={expandedSections[`change-${change.id}`]}
                          id={`change-${change.id}`}
                          transition={{duration: '150ms', timingFunction: 'ease'}}
                        >
                          <Box paddingBlockStart="2">
                            <Text variant="bodySm" color="subdued">{change.details}</Text>
                          </Box>
                        </Collapsible>
                        <Button
                          plain
                          size="slim"
                          onClick={() => setExpandedSections(prev => ({
                            ...prev,
                            [`change-${change.id}`]: !prev[`change-${change.id}`]
                          }))}
                        >
                          {expandedSections[`change-${change.id}`] ? 'Show less' : 'Show details'}
                        </Button>
                      </Stack>
                    </Box>
                  </Card>
                );
              })}
            </Stack>
          </Stack>
        </Box>
      </Card>
    );
  };

  // Main render
  if (loading && !intelData) {
    return (
      <Card>
        <Box padding="8">
          <Stack alignment="center" distribution="center">
            <Spinner size="large" />
            <Text variant="bodyLg">Loading competitor intelligence...</Text>
          </Stack>
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
                        placeholder="Search competitors, ad copies..."
                        clearButton
                        onClearButtonClick={() => setSearchQuery('')}
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
                    <Text variant="headingLg">Competitor Intelligence Overview</Text>

                    <Layout>
                      <Layout.Section oneThird>
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

                      <Layout.Section twoThirds>
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
                      <Box padding="4">
                        <Stack vertical spacing="tight">
                          <Text variant="headingMd">Quick Stats</Text>
                          <Layout>
                            <Layout.Section oneQuarter>
                              <Stack vertical spacing="extraTight">
                                <Text variant="headingXl">{intelData.competitors.length}</Text>
                                <Text variant="bodySm" color="subdued">Competitors Tracked</Text>
                              </Stack>
                            </Layout.Section>
                            <Layout.Section oneQuarter>
                              <Stack vertical spacing="extraTight">
                                <Text variant="headingXl">{intelData.adCopies.filter(ad => ad.status === 'active').length}</Text>
                                <Text variant="bodySm" color="subdued">Active Ad Copies</Text>
                              </Stack>
                            </Layout.Section>
                            <Layout.Section oneQuarter>
                              <Stack vertical spacing="extraTight">
                                <Text variant="headingXl">{intelData.advantages.length}</Text>
                                <Text variant="bodySm" color="subdued">Advantages Identified</Text>
                              </Stack>
                            </Layout.Section>
                            <Layout.Section oneQuarter>
                              <Stack vertical spacing="extraTight">
                                <Text variant="headingXl">{intelData.gaps.length}</Text>
                                <Text variant="bodySm" color="subdued">Gaps to Address</Text>
                              </Stack>
                            </Layout.Section>
                          </Layout>
                        </Stack>
                      </Box>
                    </Card>
                  </Stack>
                )}

                {selectedTab === 1 && (
                  <Stack vertical spacing="loose">
                    <Text variant="headingLg">Competitor Threat Matrix</Text>
                    {renderThreatMatrix()}
                  </Stack>
                )}

                {selectedTab === 2 && (
                  <Stack vertical spacing="loose">
                    <Text variant="headingLg">Market Positioning Map</Text>
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
                  </Stack>
                )}

                {selectedTab === 3 && (
                  <Stack vertical spacing="loose">
                    <Text variant="headingLg">Competitor Profiles</Text>
                    {renderCompetitorsTable()}
                  </Stack>
                )}

                {selectedTab === 4 && (
                  <Stack vertical spacing="loose">
                    <Text variant="headingLg">Ad Copy Analysis</Text>
                    {renderAdCopiesTable()}
                  </Stack>
                )}

                {selectedTab === 5 && (
                  <Stack vertical spacing="loose">
                    <Text variant="headingLg">Competitive Analysis</Text>
                    {renderAdvantagesAndGaps()}
                  </Stack>
                )}

                {selectedTab === 6 && (
                  <Stack vertical spacing="loose">
                    <Text variant="headingLg">Recent Competitor Activity</Text>
                    {renderRecentChanges()}
                  </Stack>
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
          large
        >
          <Modal.Section>
            <Stack vertical spacing="loose">
              <TextContainer>
                <Text variant="headingMd">Competitor Profile</Text>
                <p><strong>Domain:</strong> <Link external url={`https://${selectedCompetitor.domain}`}>{selectedCompetitor.domain}</Link></p>
                <p><strong>Threat Level:</strong> {selectedCompetitor.threatLevel}</p>
                <p><strong>Estimated Revenue:</strong> {formatters.currency(selectedCompetitor.estimatedRevenue)}</p>
                <p><strong>Employee Count:</strong> {formatters.compact(selectedCompetitor.employeeCount)}</p>
                <p><strong>Market Share:</strong> {selectedCompetitor.marketPosition.x}%</p>
                <p><strong>Growth Rate:</strong> {selectedCompetitor.marketPosition.y}%</p>
                <p><strong>Last Updated:</strong> {formatters.dateTime(selectedCompetitor.lastUpdated)}</p>
              </TextContainer>
            </Stack>
          </Modal.Section>
        </Modal>
      )}

      {/* Ad Copy Detail Modal */}
      {selectedAdCopy && (
        <Modal
          open={showAdCopyModal}
          onClose={() => setShowAdCopyModal(false)}
          title="Ad Copy Details"
          large
        >
          <Modal.Section>
            <Stack vertical spacing="loose">
              <TextContainer>
                <Text variant="headingMd">Ad Copy Analysis</Text>
                <p><strong>Headline:</strong> {selectedAdCopy.headline}</p>
                <p><strong>Description:</strong> {selectedAdCopy.description}</p>
                <p><strong>CTA:</strong> {selectedAdCopy.cta}</p>
                <p><strong>Platform:</strong> {selectedAdCopy.platform}</p>
                <p><strong>Status:</strong> {selectedAdCopy.status}</p>

                <Text variant="headingMd">Performance Metrics</Text>
                <p><strong>Estimated Impressions:</strong> {formatters.compact(selectedAdCopy.performance.estimatedImpressions)}</p>
                <p><strong>Estimated Clicks:</strong> {formatters.compact(selectedAdCopy.performance.estimatedClicks)}</p>
                <p><strong>Estimated CTR:</strong> {(selectedAdCopy.performance.estimatedCTR * 100).toFixed(2)}%</p>

                <Text variant="headingMd">Timeline</Text>
                <p><strong>First Seen:</strong> {formatters.dateTime(selectedAdCopy.firstSeen)}</p>
                <p><strong>Last Seen:</strong> {formatters.dateTime(selectedAdCopy.lastSeen)}</p>
              </TextContainer>
            </Stack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
