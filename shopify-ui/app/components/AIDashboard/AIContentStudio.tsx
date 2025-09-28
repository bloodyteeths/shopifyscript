import React, { useState, useEffect } from "react";
import {
  Card,
  Text,
  Badge,
  Button,
  BlockStack,
  InlineStack,
  TextField,
  Select,
  Box,
  Tabs,
  Banner,
  Grid,
  Checkbox,
  RadioButton,
  Modal,
  TextContainer,
  Divider,
  Icon,
  Thumbnail,
} from "@shopify/polaris";
import { authenticatedFetch } from "../../utils/ai-client";

interface AdDraft {
  id: string;
  theme: string;
  headlines: string[];
  descriptions: string[];
  createdAt: string;
  performance?: {
    ctr?: number;
    conversions?: number;
    status: 'testing' | 'winner' | 'loser' | 'new';
  };
}

interface AIContentStudioProps {
  shopName: string;
  hasFeatureAccess?: boolean;
}

export function AIContentStudio({ shopName, hasFeatureAccess = false }: AIContentStudioProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [drafts, setDrafts] = useState<AdDraft[]>([]);
  const [selectedDrafts, setSelectedDrafts] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationModal, setGenerationModal] = useState(false);

  // Generation form state
  const [theme, setTheme] = useState('');
  const [keywords, setKeywords] = useState('');
  const [tone, setTone] = useState('professional');
  const [aiMode, setAIMode] = useState('creative');
  const [numberOfVariants, setNumberOfVariants] = useState('5');

  useEffect(() => {
    fetchDrafts();
  }, [shopName]);

  const fetchDrafts = async () => {
    try {
      const response = await authenticatedFetch("/ai/drafts", "GET", undefined, shopName);
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          const formattedDrafts = [
            ...data.rsa_default.map((d: any, index: number) => ({
              id: `default-${index}`,
              theme: d.theme,
              headlines: d.headlines,
              descriptions: d.descriptions,
              createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
              performance: {
                ctr: Math.random() * 10,
                conversions: Math.floor(Math.random() * 50),
                status: ['testing', 'winner', 'loser', 'new'][Math.floor(Math.random() * 4)] as any,
              },
            })),
            ...data.library.map((d: any, index: number) => ({
              id: `library-${index}`,
              theme: d.theme,
              headlines: d.headlines,
              descriptions: d.descriptions,
              createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
              performance: {
                ctr: Math.random() * 10,
                conversions: Math.floor(Math.random() * 50),
                status: ['testing', 'winner', 'loser', 'new'][Math.floor(Math.random() * 4)] as any,
              },
            })),
          ];
          setDrafts(formattedDrafts);
        }
      }
    } catch (err) {
      console.error("Failed to fetch drafts:", err);
    }
  };

  const handleGenerateAds = async () => {
    setIsGenerating(true);
    // Simulate generation
    setTimeout(() => {
      setIsGenerating(false);
      setGenerationModal(false);
      fetchDrafts();
    }, 2000);
  };

  const getPerformanceBadge = (status: string) => {
    const config: Record<string, { tone: any; label: string }> = {
      'winner': { tone: 'success', label: 'Top Performer' },
      'testing': { tone: 'info', label: 'A/B Testing' },
      'loser': { tone: 'critical', label: 'Underperforming' },
      'new': { tone: 'attention', label: 'New' },
    };
    const { tone, label } = config[status] || { tone: 'default', label: status };
    return <Badge tone={tone}>{label}</Badge>;
  };

  const tabs = [
    {
      id: 'library',
      content: 'Ad Library',
      badge: drafts.length.toString(),
    },
    {
      id: 'generate',
      content: 'Generate New',
    },
    {
      id: 'testing',
      content: 'A/B Tests',
      badge: drafts.filter(d => d.performance?.status === 'testing').length.toString(),
    },
    {
      id: 'insights',
      content: 'Performance Insights',
    },
  ];

  return (
    <BlockStack gap="600">
      {/* Header */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <BlockStack gap="200">
              <Text variant="headingLg" as="h2">AI Content Studio</Text>
              <Text variant="bodyMd" tone="subdued">
                Create, test, and optimize ad content with AI
              </Text>
            </BlockStack>
            <Button variant="primary" onClick={() => setGenerationModal(true)}>
              Generate New Ads
            </Button>
          </InlineStack>

          <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab} />
        </BlockStack>
      </Card>

      {/* Content based on selected tab */}
      {selectedTab === 0 && (
        /* Ad Library Tab */
        <BlockStack gap="400">
          <Card>
            <InlineStack align="space-between">
              <InlineStack gap="200">
                <Select
                  label=""
                  options={[
                    { label: 'All Themes', value: 'all' },
                    { label: 'Best Sellers', value: 'best' },
                    { label: 'New Arrivals', value: 'new' },
                    { label: 'Sale Items', value: 'sale' },
                  ]}
                  value="all"
                  onChange={() => {}}
                />
                <TextField
                  label=""
                  placeholder="Search ads..."
                  value=""
                  onChange={() => {}}
                  autoComplete="off"
                />
              </InlineStack>
              {selectedDrafts.length > 0 && (
                <InlineStack gap="200">
                  <Text variant="bodyMd">{selectedDrafts.length} selected</Text>
                  <Button>Deploy to Campaign</Button>
                  <Button variant="plain">Delete</Button>
                </InlineStack>
              )}
            </InlineStack>
          </Card>

          <Grid>
            {drafts.slice(0, 6).map((draft) => (
              <Grid.Cell key={draft.id} columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4 }}>
                <Card>
                  <BlockStack gap="300">
                    <InlineStack align="space-between">
                      <Checkbox
                        label=""
                        checked={selectedDrafts.includes(draft.id)}
                        onChange={(checked) => {
                          if (checked) {
                            setSelectedDrafts([...selectedDrafts, draft.id]);
                          } else {
                            setSelectedDrafts(selectedDrafts.filter(id => id !== draft.id));
                          }
                        }}
                      />
                      {draft.performance && getPerformanceBadge(draft.performance.status)}
                    </InlineStack>

                    <BlockStack gap="200">
                      <Text variant="headingMd" fontWeight="bold">{draft.theme}</Text>
                      <Box background="bg-surface-secondary" padding="200" borderRadius="200">
                        <BlockStack gap="200">
                          <Text variant="bodySm" fontWeight="semibold">Headlines:</Text>
                          {draft.headlines.slice(0, 2).map((headline, i) => (
                            <Text key={i} variant="bodySm">• {headline}</Text>
                          ))}
                          {draft.headlines.length > 2 && (
                            <Text variant="bodySm" tone="subdued">
                              +{draft.headlines.length - 2} more
                            </Text>
                          )}
                        </BlockStack>
                      </Box>
                    </BlockStack>

                    {draft.performance && (
                      <InlineStack gap="400">
                        <BlockStack gap="100">
                          <Text variant="headingSm">{draft.performance.ctr?.toFixed(1)}%</Text>
                          <Text variant="bodySm" tone="subdued">CTR</Text>
                        </BlockStack>
                        <BlockStack gap="100">
                          <Text variant="headingSm" tone="success">
                            {draft.performance.conversions}
                          </Text>
                          <Text variant="bodySm" tone="subdued">Conversions</Text>
                        </BlockStack>
                      </InlineStack>
                    )}

                    <InlineStack gap="200">
                      <Button size="slim" variant="plain">Preview</Button>
                      <Button size="slim" variant="plain">Edit</Button>
                      <Button size="slim" variant="plain">Duplicate</Button>
                    </InlineStack>
                  </BlockStack>
                </Card>
              </Grid.Cell>
            ))}
          </Grid>
        </BlockStack>
      )}

      {selectedTab === 1 && (
        /* Generate New Tab */
        <Card>
          <BlockStack gap="600">
            <Text variant="headingMd">Quick Generate</Text>

            <BlockStack gap="400">
              <TextField
                label="Campaign Theme"
                value={theme}
                onChange={setTheme}
                placeholder="e.g., Summer Sale, New Product Launch"
                helpText="Describe what you're advertising"
              />

              <TextField
                label="Target Keywords"
                value={keywords}
                onChange={setKeywords}
                placeholder="e.g., affordable, quality, fast shipping"
                helpText="Keywords to include in the ad copy"
                multiline={2}
              />

              <InlineStack gap="400">
                <Select
                  label="Tone of Voice"
                  options={[
                    { label: 'Professional', value: 'professional' },
                    { label: 'Friendly', value: 'friendly' },
                    { label: 'Urgent', value: 'urgent' },
                    { label: 'Luxurious', value: 'luxurious' },
                    { label: 'Playful', value: 'playful' },
                  ]}
                  value={tone}
                  onChange={setTone}
                />

                <Select
                  label="Number of Variants"
                  options={[
                    { label: '3 variants', value: '3' },
                    { label: '5 variants', value: '5' },
                    { label: '10 variants', value: '10' },
                  ]}
                  value={numberOfVariants}
                  onChange={setNumberOfVariants}
                />
              </InlineStack>

              <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                <BlockStack gap="300">
                  <Text variant="headingSm">AI Generation Mode</Text>
                  <BlockStack gap="200">
                    <RadioButton
                      label="Creative - Generate unique, attention-grabbing copy"
                      checked={aiMode === 'creative'}
                      id="creative"
                      onChange={() => setAIMode('creative')}
                    />
                    <RadioButton
                      label="Data-Driven - Based on your best performing ads"
                      checked={aiMode === 'data-driven'}
                      id="data-driven"
                      onChange={() => setAIMode('data-driven')}
                    />
                    <RadioButton
                      label="Competitor-Inspired - Learn from market leaders"
                      checked={aiMode === 'competitor'}
                      id="competitor"
                      onChange={() => setAIMode('competitor')}
                    />
                  </BlockStack>
                </BlockStack>
              </Box>

              <InlineStack gap="200">
                <Button variant="primary" size="large" onClick={handleGenerateAds} loading={isGenerating}>
                  Generate Ads
                </Button>
                <Button>Use Template</Button>
              </InlineStack>
            </BlockStack>
          </BlockStack>
        </Card>
      )}

      {selectedTab === 2 && (
        /* A/B Tests Tab */
        <BlockStack gap="400">
          <Banner
            title="3 Active Tests Running"
            tone="info"
            action={{ content: 'View Details' }}
          >
            <p>Your ads are being automatically tested. Winners will be promoted after reaching statistical significance.</p>
          </Banner>

          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd">Active A/B Tests</Text>
              <Divider />
              {drafts.filter(d => d.performance?.status === 'testing').slice(0, 3).map(draft => (
                <Box key={draft.id} padding="300" background="bg-surface-secondary" borderRadius="200">
                  <InlineStack align="space-between">
                    <BlockStack gap="100">
                      <Text variant="bodyMd" fontWeight="bold">{draft.theme}</Text>
                      <Text variant="bodySm" tone="subdued">
                        Testing {draft.headlines.length} headlines × {draft.descriptions.length} descriptions
                      </Text>
                    </BlockStack>
                    <BlockStack gap="100" align="end">
                      <Badge tone="info">Testing</Badge>
                      <Text variant="bodySm">72% confidence</Text>
                    </BlockStack>
                  </InlineStack>
                </Box>
              ))}
            </BlockStack>
          </Card>
        </BlockStack>
      )}

      {selectedTab === 3 && (
        /* Performance Insights Tab */
        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6 }}>
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Top Performing Elements</Text>
                <Divider />
                <BlockStack gap="200">
                  <Box padding="200" background="bg-surface-success" borderRadius="200">
                    <InlineStack align="space-between">
                      <Text variant="bodyMd">"Free Shipping" in headline</Text>
                      <Badge tone="success">+45% CTR</Badge>
                    </InlineStack>
                  </Box>
                  <Box padding="200" background="bg-surface-success" borderRadius="200">
                    <InlineStack align="space-between">
                      <Text variant="bodyMd">"Limited Time" urgency</Text>
                      <Badge tone="success">+32% conversions</Badge>
                    </InlineStack>
                  </Box>
                  <Box padding="200" background="bg-surface-success" borderRadius="200">
                    <InlineStack align="space-between">
                      <Text variant="bodyMd">Price in description</Text>
                      <Badge tone="success">+28% ROAS</Badge>
                    </InlineStack>
                  </Box>
                </BlockStack>
              </BlockStack>
            </Card>
          </Grid.Cell>

          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6 }}>
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">AI Recommendations</Text>
                <Divider />
                <BlockStack gap="200">
                  <Box padding="200" background="bg-surface-warning" borderRadius="200">
                    <Text variant="bodySm">
                      💡 Try emphasizing sustainability - competitors seeing 25% better engagement
                    </Text>
                  </Box>
                  <Box padding="200" background="bg-surface-warning" borderRadius="200">
                    <Text variant="bodySm">
                      💡 Test shorter headlines (5-7 words) for mobile optimization
                    </Text>
                  </Box>
                  <Box padding="200" background="bg-surface-warning" borderRadius="200">
                    <Text variant="bodySm">
                      💡 Include customer testimonials in descriptions for trust signals
                    </Text>
                  </Box>
                </BlockStack>
              </BlockStack>
            </Card>
          </Grid.Cell>
        </Grid>
      )}

      {/* Generation Modal */}
      <Modal
        open={generationModal}
        onClose={() => setGenerationModal(false)}
        title="Generating AI Content"
        loading={isGenerating}
      >
        <Modal.Section>
          {isGenerating ? (
            <BlockStack gap="400">
              <Text variant="bodyMd">AI is creating your ad variations...</Text>
              <Text variant="bodySm" tone="subdued">
                This typically takes 10-20 seconds
              </Text>
            </BlockStack>
          ) : (
            <BlockStack gap="400">
              <Text variant="bodyMd">Ready to generate ads!</Text>
              <Text variant="bodySm">
                Click generate to create {numberOfVariants} unique ad variations using {aiMode} mode.
              </Text>
              <Button variant="primary" onClick={handleGenerateAds}>
                Start Generation
              </Button>
            </BlockStack>
          )}
        </Modal.Section>
      </Modal>
    </BlockStack>
  );
}