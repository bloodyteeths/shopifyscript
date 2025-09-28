/**
 * Website Insights Component for AI Dashboard
 * Displays extracted products, USPs, testimonials, offers, and content quality metrics
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Layout,
  Page,
  Text,
  Badge,
  DataTable,
  Filters,
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
  RangeSlider,
  Modal,
  TextContainer,
  List,
  Thumbnail,
  Link,
  ProgressBar,
  Collapsible,
  Icon
} from '@shopify/polaris';
import {
  SearchIcon,
  ExportIcon,
  RefreshIcon,
  ViewIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@shopify/polaris-icons';
import {
  WebsiteInsightsData,
  ExtractedProduct,
  USPData,
  TestimonialData,
  OfferData,
  ContentQualityMetrics,
  DataVisualizationProps,
  FilterState,
  ExportOptions
} from './types';
import {
  BaseChart,
  PieChartComponent,
  BarChartComponent,
  TrendLineChart,
  formatters,
  CHART_COLORS
} from './charts';

interface WebsiteInsightsProps extends DataVisualizationProps {
  data?: WebsiteInsightsData;
}

export function WebsiteInsights({
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
}: WebsiteInsightsProps) {
  // State management
  const [insightsData, setInsightsData] = useState<WebsiteInsightsData | null>(data || null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    dateRange: dateRange || { startDate: '', endDate: '' },
    categories: [],
    metrics: [],
    segments: [],
    searchQuery: ''
  });
  const [selectedProduct, setSelectedProduct] = useState<ExtractedProduct | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [qualityScoreRange, setQualityScoreRange] = useState<[number, number]>([0, 100]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(isLoading);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    products: true,
    usps: false,
    testimonials: false,
    offers: false,
    contentQuality: false
  });

  // Fetch data
  const fetchWebsiteInsights = async () => {
    if (data) return; // Use provided data if available

    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/website-insights?shop=${shopName}`);
      const result = await response.json();

      if (result.success) {
        setInsightsData(result.data);
      } else {
        console.error('Failed to fetch website insights:', result.error);
      }
    } catch (err) {
      console.error('Error fetching website insights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsiteInsights();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchWebsiteInsights, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [shopName, refreshInterval]);

  // Filter and search logic
  const filteredProducts = useMemo(() => {
    if (!insightsData?.products) return [];

    return insightsData.products.filter(product => {
      // Search filter
      if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !product.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !product.category.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Quality score filter
      if (product.qualityScore < qualityScoreRange[0] || product.qualityScore > qualityScoreRange[1]) {
        return false;
      }

      // Category filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(product.category)) {
        return false;
      }

      return true;
    });
  }, [insightsData?.products, searchQuery, qualityScoreRange, selectedCategories]);

  const filteredUSPs = useMemo(() => {
    if (!insightsData?.usps) return [];

    return insightsData.usps.filter(usp => {
      if (searchQuery && !usp.text.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !usp.category.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [insightsData?.usps, searchQuery]);

  const filteredTestimonials = useMemo(() => {
    if (!insightsData?.testimonials) return [];

    return insightsData.testimonials.filter(testimonial => {
      if (searchQuery && !testimonial.text.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !testimonial.author.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [insightsData?.testimonials, searchQuery]);

  const filteredOffers = useMemo(() => {
    if (!insightsData?.offers) return [];

    return insightsData.offers.filter(offer => {
      if (searchQuery && !offer.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !offer.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [insightsData?.offers, searchQuery]);

  // Chart data preparation
  const categoryDistribution = useMemo(() => {
    if (!insightsData?.products) return [];

    const categories = insightsData.products.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categories).map(([category, count]) => ({
      name: category,
      value: count,
      date: category
    }));
  }, [insightsData?.products]);

  const qualityScoreDistribution = useMemo(() => {
    if (!insightsData?.products) return [];

    const ranges = [
      { range: '0-20', min: 0, max: 20 },
      { range: '21-40', min: 21, max: 40 },
      { range: '41-60', min: 41, max: 60 },
      { range: '61-80', min: 61, max: 80 },
      { range: '81-100', min: 81, max: 100 }
    ];

    return ranges.map(({ range, min, max }) => ({
      name: range,
      value: insightsData.products.filter(p => p.qualityScore >= min && p.qualityScore <= max).length,
      date: range
    }));
  }, [insightsData?.products]);

  const uspCategoryData = useMemo(() => {
    if (!insightsData?.usps) return [];

    const categories = insightsData.usps.reduce((acc, usp) => {
      acc[usp.category] = (acc[usp.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categories).map(([category, count]) => ({
      name: category,
      value: count,
      date: category
    }));
  }, [insightsData?.usps]);

  const testimonialSentimentData = useMemo(() => {
    if (!insightsData?.testimonials) return [];

    const sentiments = insightsData.testimonials.reduce((acc, testimonial) => {
      acc[testimonial.sentiment] = (acc[testimonial.sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(sentiments).map(([sentiment, count]) => ({
      name: sentiment,
      value: count,
      date: sentiment
    }));
  }, [insightsData?.testimonials]);

  // Export functionality
  const handleExport = (options: ExportOptions) => {
    console.log('Exporting website insights:', options);
    // Implementation would go here
  };

  // Render helper functions
  const renderProductsTable = () => {
    const productTableData = filteredProducts.map(product => [
      <Stack alignment="center" spacing="tight" key={product.id}>
        {product.imageUrl && (
          <Thumbnail
            source={product.imageUrl}
            alt={product.name}
            size="small"
          />
        )}
        <Box>
          <Text variant="bodyMd" fontWeight="medium">{product.name}</Text>
          <Text variant="bodySm" color="subdued">{product.category}</Text>
        </Box>
      </Stack>,
      <Text>{product.description.substring(0, 100)}...</Text>,
      <Text>{formatters.currency(product.price, product.currency)}</Text>,
      <Stack alignment="center" spacing="tight">
        <ProgressBar progress={product.qualityScore} size="small" />
        <Text variant="bodySm">{product.qualityScore}%</Text>
      </Stack>,
      <Badge tone={product.qualityScore >= 80 ? 'success' : product.qualityScore >= 60 ? 'attention' : 'critical'}>
        {product.qualityScore >= 80 ? 'Excellent' : product.qualityScore >= 60 ? 'Good' : 'Needs Improvement'}
      </Badge>,
      <Button
        plain
        icon={ViewIcon}
        onClick={() => {
          setSelectedProduct(product);
          setShowProductModal(true);
        }}
        accessibilityLabel={`View details for ${product.name}`}
      />
    ]);

    return (
      <DataTable
        columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
        headings={['Product', 'Description', 'Price', 'Quality Score', 'Status', 'Actions']}
        rows={productTableData}
        pagination={{
          hasNext: true,
          hasPrevious: false,
          onNext: () => {},
          onPrevious: () => {}
        }}
      />
    );
  };

  const renderUSPsTable = () => {
    const uspTableData = filteredUSPs.map(usp => [
      <Text key={usp.id}>{usp.text}</Text>,
      <Badge tone="info">{usp.category}</Badge>,
      <Stack alignment="center" spacing="tight">
        <ProgressBar progress={usp.confidence * 100} size="small" />
        <Text variant="bodySm">{Math.round(usp.confidence * 100)}%</Text>
      </Stack>,
      <Text variant="bodySm">{usp.source}</Text>,
      <Text variant="bodySm">{formatters.date(usp.lastDetected)}</Text>
    ]);

    return (
      <DataTable
        columnContentTypes={['text', 'text', 'text', 'text', 'text']}
        headings={['USP Text', 'Category', 'Confidence', 'Source', 'Last Detected']}
        rows={uspTableData}
      />
    );
  };

  const renderTestimonialsTable = () => {
    const testimonialTableData = filteredTestimonials.map(testimonial => [
      <Text key={testimonial.id}>{testimonial.text.substring(0, 150)}...</Text>,
      <Text>{testimonial.author}</Text>,
      <Stack alignment="center" spacing="tight">
        <Text>{'⭐'.repeat(testimonial.rating)}</Text>
        <Text variant="bodySm">({testimonial.rating}/5)</Text>
      </Stack>,
      <Badge tone={testimonial.sentiment === 'positive' ? 'success' : testimonial.sentiment === 'negative' ? 'critical' : 'attention'}>
        {testimonial.sentiment}
      </Badge>,
      <Text variant="bodySm">{testimonial.source}</Text>,
      <Text variant="bodySm">{formatters.date(testimonial.extractedDate)}</Text>
    ]);

    return (
      <DataTable
        columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
        headings={['Testimonial', 'Author', 'Rating', 'Sentiment', 'Source', 'Date']}
        rows={testimonialTableData}
      />
    );
  };

  const renderOffersTable = () => {
    const offerTableData = filteredOffers.map(offer => [
      <Text key={offer.id} fontWeight="medium">{offer.title}</Text>,
      <Text>{offer.description}</Text>,
      <Badge tone="info">{offer.type}</Badge>,
      <Text fontWeight="medium">{offer.value}</Text>,
      <Badge tone={offer.urgency === 'high' ? 'critical' : offer.urgency === 'medium' ? 'attention' : 'success'}>
        {offer.urgency}
      </Badge>,
      <Text variant="bodySm">{formatters.date(offer.lastSeen)}</Text>
    ]);

    return (
      <DataTable
        columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
        headings={['Title', 'Description', 'Type', 'Value', 'Urgency', 'Last Seen']}
        rows={offerTableData}
      />
    );
  };

  const renderContentQualityMetrics = () => {
    if (!insightsData?.contentQuality) return null;

    const metrics = insightsData.contentQuality;
    const metricsData = [
      { name: 'Overall Score', value: metrics.overallScore, date: 'overall' },
      { name: 'Readability', value: metrics.readabilityScore, date: 'readability' },
      { name: 'SEO Score', value: metrics.seoScore, date: 'seo' },
      { name: 'Engagement', value: metrics.engagementScore, date: 'engagement' },
      { name: 'Trust Score', value: metrics.trustScore, date: 'trust' }
    ];

    return (
      <Layout>
        <Layout.Section oneHalf>
          <BarChartComponent
            title="Content Quality Metrics"
            subtitle="Overall performance across different quality dimensions"
            data={metricsData}
            dataKey="value"
            xAxisKey="name"
            height={300}
            color={CHART_COLORS.success[0]}
            yAxisFormatter={(value) => `${value}%`}
            tooltipFormatter={(value, name) => [`${value}%`, name]}
          />
        </Layout.Section>
        <Layout.Section oneHalf>
          <Card>
            <Box padding="4">
              <Stack vertical spacing="loose">
                <Text variant="headingMd">Quality Details</Text>
                <Stack vertical spacing="tight">
                  <Stack distribution="spaceBetween">
                    <Text>Word Count:</Text>
                    <Text fontWeight="medium">{formatters.number(metrics.wordCount)}</Text>
                  </Stack>
                  <Stack distribution="spaceBetween">
                    <Text>Heading Structure:</Text>
                    <Text fontWeight="medium">{metrics.headingStructure}%</Text>
                  </Stack>
                  <Stack distribution="spaceBetween">
                    <Text>Image Optimization:</Text>
                    <Text fontWeight="medium">{metrics.imageOptimization}%</Text>
                  </Stack>
                </Stack>
              </Stack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    );
  };

  // Main render
  if (loading && !insightsData) {
    return (
      <Card>
        <Box padding="8">
          <Stack alignment="center" distribution="center">
            <Spinner size="large" />
            <Text variant="bodyLg">Loading website insights...</Text>
          </Stack>
        </Box>
      </Card>
    );
  }

  if (error || !insightsData) {
    return (
      <Card>
        <EmptyState
          heading="Unable to load website insights"
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          action={{
            content: 'Retry',
            onAction: () => {
              fetchWebsiteInsights();
              onRefresh?.();
            }
          }}
        >
          <p>{error || 'No website insights data available'}</p>
        </EmptyState>
      </Card>
    );
  }

  const tabs = [
    { id: 'overview', content: 'Overview' },
    { id: 'products', content: `Products (${filteredProducts.length})` },
    { id: 'usps', content: `USPs (${filteredUSPs.length})` },
    { id: 'testimonials', content: `Testimonials (${filteredTestimonials.length})` },
    { id: 'offers', content: `Offers (${filteredOffers.length})` },
    { id: 'quality', content: 'Content Quality' }
  ];

  return (
    <Page
      title="Website Insights"
      subtitle={`Last analyzed: ${formatters.dateTime(insightsData.lastAnalyzed)} | Status: ${insightsData.analysisStatus}`}
      secondaryActions={[
        {
          content: 'Refresh',
          icon: RefreshIcon,
          onAction: () => {
            fetchWebsiteInsights();
            onRefresh?.();
          }
        },
        ...(showExport ? [{
          content: 'Export',
          icon: ExportIcon,
          onAction: () => handleExport({ format: 'csv', filename: 'website-insights' })
        }] : [])
      ]}
    >
      <Layout>
        {showFilters && (
          <Layout.Section>
            <Card>
              <Box padding="4">
                <Stack vertical spacing="tight">
                  <Stack distribution="spaceBetween" alignment="center">
                    <Text variant="headingMd">Filters</Text>
                  </Stack>

                  <Stack spacing="tight">
                    <Box minWidth="200px">
                      <TextField
                        label="Search"
                        value={searchQuery}
                        onChange={setSearchQuery}
                        prefix={<Icon source={SearchIcon} />}
                        placeholder="Search products, USPs, testimonials..."
                        clearButton
                        onClearButtonClick={() => setSearchQuery('')}
                      />
                    </Box>

                    <Box minWidth="200px">
                      <RangeSlider
                        label="Quality Score Range"
                        value={qualityScoreRange}
                        onChange={setQualityScoreRange}
                        min={0}
                        max={100}
                        step={1}
                        output
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
                    <Text variant="headingLg">Website Analysis Overview</Text>

                    <Layout>
                      <Layout.Section oneThird>
                        <PieChartComponent
                          title="Product Categories"
                          subtitle="Distribution of products by category"
                          data={categoryDistribution}
                          dataKey="value"
                          nameKey="name"
                          height={250}
                          colors={CHART_COLORS.primary}
                          tooltipFormatter={(value, name) => [`${value} products`, name]}
                        />
                      </Layout.Section>

                      <Layout.Section oneThird>
                        <BarChartComponent
                          title="Quality Score Distribution"
                          subtitle="Products by quality score ranges"
                          data={qualityScoreDistribution}
                          dataKey="value"
                          xAxisKey="name"
                          height={250}
                          color={CHART_COLORS.success[0]}
                          yAxisFormatter={(value) => value.toString()}
                          tooltipFormatter={(value, name) => [`${value} products`, name]}
                        />
                      </Layout.Section>

                      <Layout.Section oneThird>
                        <PieChartComponent
                          title="USP Categories"
                          subtitle="Types of unique selling propositions found"
                          data={uspCategoryData}
                          dataKey="value"
                          nameKey="name"
                          height={250}
                          colors={CHART_COLORS.info}
                          tooltipFormatter={(value, name) => [`${value} USPs`, name]}
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
                                <Text variant="headingXl">{insightsData.products.length}</Text>
                                <Text variant="bodySm" color="subdued">Products Analyzed</Text>
                              </Stack>
                            </Layout.Section>
                            <Layout.Section oneQuarter>
                              <Stack vertical spacing="extraTight">
                                <Text variant="headingXl">{insightsData.usps.length}</Text>
                                <Text variant="bodySm" color="subdued">USPs Found</Text>
                              </Stack>
                            </Layout.Section>
                            <Layout.Section oneQuarter>
                              <Stack vertical spacing="extraTight">
                                <Text variant="headingXl">{insightsData.testimonials.length}</Text>
                                <Text variant="bodySm" color="subdued">Testimonials</Text>
                              </Stack>
                            </Layout.Section>
                            <Layout.Section oneQuarter>
                              <Stack vertical spacing="extraTight">
                                <Text variant="headingXl">{insightsData.offers.length}</Text>
                                <Text variant="bodySm" color="subdued">Offers Detected</Text>
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
                    <Text variant="headingLg">Extracted Products</Text>
                    {renderProductsTable()}
                  </Stack>
                )}

                {selectedTab === 2 && (
                  <Stack vertical spacing="loose">
                    <Text variant="headingLg">Unique Selling Propositions</Text>
                    {renderUSPsTable()}
                  </Stack>
                )}

                {selectedTab === 3 && (
                  <Stack vertical spacing="loose">
                    <Text variant="headingLg">Customer Testimonials</Text>
                    {renderTestimonialsTable()}
                  </Stack>
                )}

                {selectedTab === 4 && (
                  <Stack vertical spacing="loose">
                    <Text variant="headingLg">Detected Offers</Text>
                    {renderOffersTable()}
                  </Stack>
                )}

                {selectedTab === 5 && (
                  <Stack vertical spacing="loose">
                    <Text variant="headingLg">Content Quality Analysis</Text>
                    {renderContentQualityMetrics()}
                  </Stack>
                )}
              </Box>
            </Tabs>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <Modal
          open={showProductModal}
          onClose={() => setShowProductModal(false)}
          title={selectedProduct.name}
          large
        >
          <Modal.Section>
            <Stack vertical spacing="loose">
              {selectedProduct.imageUrl && (
                <Thumbnail
                  source={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  size="large"
                />
              )}

              <TextContainer>
                <Text variant="headingMd">Product Details</Text>
                <p><strong>Category:</strong> {selectedProduct.category}</p>
                <p><strong>Price:</strong> {formatters.currency(selectedProduct.price, selectedProduct.currency)}</p>
                <p><strong>Quality Score:</strong> {selectedProduct.qualityScore}%</p>
                <p><strong>Last Updated:</strong> {formatters.dateTime(selectedProduct.lastUpdated)}</p>

                <Text variant="headingMd">Description</Text>
                <p>{selectedProduct.description}</p>
              </TextContainer>
            </Stack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}