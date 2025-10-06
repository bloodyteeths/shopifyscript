import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  Spinner,
  SkeletonBodyText,
  SkeletonDisplayText,
} from "@shopify/polaris";
import { RefreshIcon } from "@shopify/polaris-icons";
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
  const [activeJob, setActiveJob] = useState<{ id: string; state: string; result?: any } | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [statusBanner, setStatusBanner] = useState<{ tone: "info" | "critical" | "success"; message: string } | null>(null);
  const [generationModal, setGenerationModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filterTheme, setFilterTheme] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Generation form state
  const [theme, setTheme] = useState('');
  const [keywords, setKeywords] = useState('');
  const [tone, setTone] = useState('professional');
  const [aiMode, setAIMode] = useState('creative');
  const [numberOfVariants, setNumberOfVariants] = useState('5');

  const fetchDrafts = useCallback(async () => {
    try {
      setError(null);
      const response = await authenticatedFetch("/ai/drafts", "GET", undefined, shopName);
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          const formattedDrafts = [
            ...(data.rsa_default || []).map((d: any, index: number) => ({
              id: `default-${index}`,
              theme: d.theme,
              headlines: d.headlines,
              descriptions: d.descriptions,
              createdAt: d.createdAt || new Date().toISOString(),
              // Only include performance data if it exists in API response
              performance: d.performance || undefined,
            })),
            ...(data.library || []).map((d: any, index: number) => ({
              id: `library-${index}`,
              theme: d.theme,
              headlines: d.headlines,
              descriptions: d.descriptions,
              createdAt: d.createdAt || new Date().toISOString(),
              // Only include performance data if it exists in API response
              performance: d.performance || undefined,
            })),
          ];
          setDrafts(formattedDrafts);
          setLastUpdated(new Date());
        } else {
          setDrafts([]);
        }
      } else {
        throw new Error(`Failed to load ad drafts: ${response.status}`);
      }
    } catch (err) {
      console.error("Failed to fetch drafts:", err);
      setError(err instanceof Error ? err.message : "Failed to load ad drafts");
      setDrafts([]);
    }
  }, [shopName]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchDrafts();
      setLoading(false);
    };
    loadData();
  }, [fetchDrafts]);

  // Poll job status when a job is active
  useEffect(() => {
    if (!activeJob?.id) return;

    // Clear any existing interval
    if (pollingRef.current) {
      clearInterval(pollingRef.current as any);
      pollingRef.current = null;
    }

    const poll = async () => {
      try {
        const resp = await authenticatedFetch(`/jobs/status?jobId=${encodeURIComponent(activeJob.id)}`, 'GET', undefined, shopName);
        if (!resp.ok) return;
        const data = await resp.json();
        if (data?.ok && data.job) {
          const { state, result, error } = data.job;
          if (state === 'completed') {
            if (pollingRef.current) {
              clearInterval(pollingRef.current as any);
              pollingRef.current = null;
            }
            setActiveJob(null);
            setStatusBanner({ tone: 'success', message: 'AI copy ready. Library refreshed.' });
            // Refresh drafts to show new content
            fetchDrafts();
          } else if (state === 'failed' || state === 'dead') {
            if (pollingRef.current) {
              clearInterval(pollingRef.current as any);
              pollingRef.current = null;
            }
            setActiveJob(null);
            setStatusBanner({ tone: 'critical', message: `AI generation failed${error ? `: ${String(error)}` : ''}` });
          }
        }
      } catch (e) {
        // Non-fatal; continue polling
      }
    };

    // Initial poll and interval
    poll();
    pollingRef.current = setInterval(poll, 3000) as any;

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current as any);
        pollingRef.current = null;
      }
    };
  }, [activeJob, shopName, fetchDrafts]);

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDrafts();
    setRefreshing(false);
  }, [fetchDrafts]);

  // Compute filtered + sorted drafts for library view
  const visibleDrafts = useMemo(() => {
    const lower = searchQuery.trim().toLowerCase();
    const list = drafts.filter(d => {
      const themeOk = filterTheme === 'all' || d.theme === filterTheme;
      if (!themeOk) return false;
      if (!lower) return true;
      const text = `${d.theme} ${d.headlines.join(' ')} ${d.descriptions.join(' ')}`.toLowerCase();
      return text.includes(lower);
    });
    // Sort by createdAt desc for history
    return list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [drafts, filterTheme, searchQuery]);

  // Copy helpers
  const copyToClipboard = async (text: string, successMsg = 'Copied to clipboard') => {
    try {
      await navigator.clipboard.writeText(text);
      setStatusBanner({ tone: 'success', message: successMsg });
      setTimeout(() => setStatusBanner(null), 1500);
    } catch (e) {
      setStatusBanner({ tone: 'critical', message: 'Failed to copy' });
    }
  };
  const copyFullAd = (d: AdDraft) => copyToClipboard(`Theme: ${d.theme}\n\nHeadlines:\n- ${d.headlines.join('\n- ')}\n\nDescriptions:\n- ${d.descriptions.join('\n- ')}`, 'Ad copied');

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const handleGenerateAds = async () => {
    if (!hasFeatureAccess) {
      setError("AI Content Generation requires Professional+ subscription");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      setStatusBanner(null);
      // Call the actual AI writer endpoint
      const response = await authenticatedFetch("/jobs/ai_writer", "POST", {
        dryRun: false,
        limit: parseInt(numberOfVariants) || 5,
        theme: theme || undefined,
        tone: tone || 'professional',
        mode: aiMode || 'creative'
      }, shopName);

      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          if (data.queued || data.processing || data.status === 'queued') {
            setGenerationModal(false);
            setIsGenerating(false);
            if (data.jobId) {
              setActiveJob({ id: data.jobId, state: data.status || 'queued' });
              setStatusBanner({
                tone: 'info',
                message: data.message || 'AI writer job queued. We will notify you when ads are ready.'
              });
            } else {
              setStatusBanner({ tone: 'info', message: data.message || 'AI generation in progress.' });
            }
          } else if (data.status === 'processing') {
            setGenerationModal(false);
            setIsGenerating(false);
            setStatusBanner({ tone: 'info', message: data.message || 'AI generation in progress. Refresh shortly.' });
          } else {
            setGenerationModal(false);
            setIsGenerating(false);
            setStatusBanner({ tone: 'success', message: data.message || 'AI ads generated successfully.' });
            setTimeout(() => {
              fetchDrafts();
            }, 1500);
          }
        } else {
          setError(data.error || "Failed to generate ads");
          setIsGenerating(false);
        }
      } else {
      setStatusBanner({ tone: 'critical', message: 'Failed to submit AI generation request. Please try again.' });
      setIsGenerating(false);
    }
  } catch (err) {
    console.error("Error generating ads:", err);
    setStatusBanner({ tone: 'critical', message: `AI generation failed: ${err instanceof Error ? err.message : String(err)}` });
    setIsGenerating(false);
  }
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

  // Loading skeleton
  const LoadingSkeleton = () => (
    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4 }}>
      <Card>
        <BlockStack gap="300">
          <SkeletonDisplayText size="small" />
          <SkeletonBodyText lines={4} />
          <SkeletonBodyText lines={2} />
        </BlockStack>
      </Card>
    </Grid.Cell>
  );

  if (loading) {
    return (
      <BlockStack gap="600">
        <Card>
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="200">
              <Text variant="headingLg" as="h2">AI Content Studio</Text>
              <Text variant="bodyMd" tone="subdued">Loading ad drafts...</Text>
            </BlockStack>
            <Spinner size="small" />
          </InlineStack>
        </Card>
        <Grid>
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
        </Grid>
      </BlockStack>
    );
  }

  return (
    <BlockStack gap="600">
      {/* Error Banner */}
      {error && (
        <Banner tone="critical" title="Error loading ad drafts">
          <p>{error}</p>
          <Box paddingBlockStart="200">
            <Button onClick={handleRefresh}>Retry</Button>
          </Box>
        </Banner>
      )}

      {/* Status Banner */}
      {statusBanner && (
        <Banner tone={statusBanner.tone} onDismiss={() => setStatusBanner(null)}>
          <p>{statusBanner.message}</p>
        </Banner>
      )}

      {/* Header */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <BlockStack gap="200">
              <Text variant="headingLg" as="h2">AI Content Studio</Text>
              <InlineStack gap="200" blockAlign="center">
                <Text variant="bodyMd" tone="subdued">
                  Create, test, and optimize ad content with AI
                </Text>
                {lastUpdated && (
                  <>
                    <Text variant="bodyMd" tone="subdued">•</Text>
                    <Text variant="bodySm" tone="subdued">
                      Updated {formatTimeAgo(lastUpdated)}
                    </Text>
                  </>
                )}
              </InlineStack>
            </BlockStack>
            <InlineStack gap="200">
              <Button
                icon={RefreshIcon}
                onClick={handleRefresh}
                loading={refreshing}
                accessibilityLabel="Refresh ad drafts"
              >
                Refresh
              </Button>
              <Button variant="primary" onClick={() => setGenerationModal(true)}>
                Generate New Ads
              </Button>
            </InlineStack>
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
                  value={filterTheme}
                  onChange={setFilterTheme}
                />
                <TextField
                  label=""
                  placeholder="Search ads..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  autoComplete="off"
                />
              </InlineStack>
              {selectedDrafts.length > 0 && (
                <InlineStack gap="200">
                  <Text variant="bodyMd">{selectedDrafts.length} selected</Text>
                  <Button onClick={() => alert(`Deploy ${selectedDrafts.length} ads to campaign - feature coming soon`)}>
                    Deploy to Campaign
                  </Button>
                  <Button
                    variant="plain"
                    onClick={() => {
                      if (confirm(`Delete ${selectedDrafts.length} selected ads?`)) {
                        setSelectedDrafts([]);
                        alert('Delete functionality coming soon');
                      }
                    }}
                  >
                    Delete
                  </Button>
                </InlineStack>
              )}
            </InlineStack>
          </Card>

{refreshing ? (
            <Grid>
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
            </Grid>
          ) : visibleDrafts.length > 0 ? (
            <Grid>
              {visibleDrafts.map((draft) => (
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

                      {draft.performance ? (
                        <InlineStack gap="400">
                          <BlockStack gap="100">
                            <Text variant="headingSm">{draft.performance.ctr?.toFixed(1) || '0.0'}%</Text>
                            <Text variant="bodySm" tone="subdued">CTR</Text>
                          </BlockStack>
                          <BlockStack gap="100">
                            <Text variant="headingSm" tone="success">
                              {draft.performance.conversions || 0}
                            </Text>
                            <Text variant="bodySm" tone="subdued">Conversions</Text>
                          </BlockStack>
                        </InlineStack>
                      ) : (
                        <Text variant="bodySm" tone="subdued">
                          Performance data will appear once ads are deployed and active.
                        </Text>
                      )}

                      <InlineStack gap="200">
                        <Button
                          size="slim"
                          variant="plain"
                          onClick={(e) => {
                            e.stopPropagation();
                            alert(`Preview ad: ${draft.theme}\n\nHeadlines:\n${draft.headlines.join('\n')}\n\nDescriptions:\n${draft.descriptions.join('\n')}`);
                          }}
                        >
                          Preview
                        </Button>
                        <Button
                          size="slim"
                          variant="plain"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyFullAd(draft);
                          }}
                        >
                          Copy
                        </Button>
                        <Button
                          size="slim"
                          variant="plain"
                          onClick={(e) => {
                            e.stopPropagation();
                            alert('Edit functionality coming soon');
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="slim"
                          variant="plain"
                          onClick={(e) => {
                            e.stopPropagation();
                            alert('Duplicate functionality coming soon');
                          }}
                        >
                          Duplicate
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  </Card>
                </Grid.Cell>
              ))}
            </Grid>
          ) : (
            <Card>
              <Box padding="600">
                <BlockStack gap="400" align="center">
                  <Text variant="headingMd" alignment="center">No ad drafts found</Text>
                  <Text variant="bodyMd" alignment="center" tone="subdued">
                    Create your first AI-generated ad variations to get started.
                  </Text>
                  <Text variant="bodySm" alignment="center" tone="subdued">
                    AI will analyze your business and create compelling ad copy in under 60 seconds.
                  </Text>
                  <InlineStack gap="200">
                    <Button variant="primary" onClick={() => setGenerationModal(true)}>
                      Generate First Ads
                    </Button>
                    {hasFeatureAccess === false && (
                      <Badge tone="attention">Requires Professional+ Plan</Badge>
                    )}
                  </InlineStack>
                </BlockStack>
              </Box>
            </Card>
          )}
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
                <Button
                  variant="primary"
                  size="large"
                  onClick={handleGenerateAds}
                  loading={isGenerating}
                  disabled={!hasFeatureAccess}
                >
                  {hasFeatureAccess ? 'Generate Ads' : 'Upgrade to Generate'}
                </Button>
                <Button onClick={() => alert('Template selection coming soon')}>
                  Use Template
                </Button>
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
            action={{
              content: 'View Details',
              onAction: () => alert('A/B test details coming soon')
            }}
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
                      Try emphasizing sustainability - competitors seeing 25% better engagement
                    </Text>
                  </Box>
                  <Box padding="200" background="bg-surface-warning" borderRadius="200">
                    <Text variant="bodySm">
                      Test shorter headlines (5-7 words) for mobile optimization
                    </Text>
                  </Box>
                  <Box padding="200" background="bg-surface-warning" borderRadius="200">
                    <Text variant="bodySm">
                      Include customer testimonials in descriptions for trust signals
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
              <Text variant="bodyMd" fontWeight="semibold">🔍 AI is analyzing your business...</Text>
              <BlockStack gap="200">
                <Text variant="bodySm">✓ Scraping your website for products and offers</Text>
                <Text variant="bodySm">✓ Analyzing competitor strategies</Text>
                <Text variant="bodySm">✓ Reviewing your Google Ads performance</Text>
                <Text variant="bodySm">✓ Generating data-driven ad copy</Text>
              </BlockStack>
              <Text variant="bodySm" tone="subdued">
                This comprehensive analysis takes 30-60 seconds but creates much better ads!
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
