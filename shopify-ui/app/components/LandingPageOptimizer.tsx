import { useState, useEffect, useCallback } from "react";
import {
  Page,
  Card,
  Layout,
  FormLayout,
  TextField,
  Button,
  Stack,
  Text,
  Banner,
  Spinner,
  Badge,
  Tabs,
  Divider,
  ButtonGroup,
  Modal,
  TextContainer,
  List,
  Toast,
  Frame,
  DescriptionList,
  Link,
  CalloutCard,
  ProgressBar,
  Icon,
  Box,
  InlineStack,
  BlockStack,
  Collapsible,
} from "@shopify/polaris";
import { ViewIcon, AnalyticsIcon, EditIcon, CheckIcon } from "@shopify/polaris-icons";

interface LandingPageOptimizerProps {
  tenant?: string;
  shopifySession?: any;
}

interface PageAnalysis {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  conversionIssues: string[];
  mobileReadiness: number;
  loadSpeedConcerns: string[];
  trustSignals: string[];
  competitiveAdvantage: string;
}

interface OptimizationSuggestion {
  suggestion: string;
  reason: string;
}

interface SuggestionGroup {
  titleSuggestions: OptimizationSuggestion[];
  ctaSuggestions: OptimizationSuggestion[];
  aboveTheFoldSuggestions: OptimizationSuggestion[];
  urgencySuggestions: OptimizationSuggestion[];
  trustSuggestions: OptimizationSuggestion[];
  priorityChanges: Array<{
    change: string;
    priority: string;
    expectedLift: string;
  }>;
}

interface AnalysisResult {
  url: string;
  analysis: PageAnalysis;
  suggestions: SuggestionGroup;
  timestamp: string;
  status: string;
}

export default function LandingPageOptimizer({ tenant, shopifySession }: LandingPageOptimizerProps) {
  const [pageUrl, setPageUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ content: string; error?: boolean } | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    analysis: true,
    suggestions: true,
    priorities: true
  });

  useEffect(() => {
    // Load existing suggestions on component mount
    loadExistingSuggestions();
  }, [tenant]);

  const loadExistingSuggestions = useCallback(async () => {
    if (!tenant) return;

    try {
      const response = await fetch(`/api/ai/landing-suggestions?tenant=${tenant}`);
      const data = await response.json();

      if (data.ok && data.suggestions && data.suggestions.length > 0) {
        // Load the most recent analysis
        setAnalysisResult(data.suggestions[0]);
      }
    } catch (error) {
      console.warn("Failed to load existing suggestions:", error);
    }
  }, [tenant]);

  const analyzePage = useCallback(async () => {
    if (!pageUrl.trim()) {
      setError("Please enter a valid URL");
      return;
    }

    if (!tenant) {
      setError("Tenant information required");
      return;
    }

    setAnalyzing(true);
    setError("");

    try {
      const response = await fetch("/api/ai/analyze-landing-page", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: pageUrl.trim(),
          tenant,
          shopifySession,
          nonce: Date.now()
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setAnalysisResult({
          url: data.url,
          analysis: data.analysis,
          suggestions: data.suggestions,
          timestamp: data.timestamp,
          status: "completed"
        });
        setToast({ content: "Page analysis completed successfully!" });
        setSelectedTab(1); // Switch to results tab
      } else {
        setError(data.error || "Analysis failed");
        setToast({ content: data.error || "Analysis failed", error: true });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Analysis failed";
      setError(errorMessage);
      setToast({ content: errorMessage, error: true });
    } finally {
      setAnalyzing(false);
    }
  }, [pageUrl, tenant, shopifySession]);

  const createDraft = useCallback(async () => {
    if (!analysisResult || !tenant) {
      setError("Analysis required before creating draft");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const response = await fetch("/api/ai/create-landing-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pageId: analysisResult.url,
          suggestions: analysisResult.suggestions,
          tenant,
          shopifySession,
          nonce: Date.now()
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setToast({
          content: `Draft created successfully! ${data.message || 'Ready for review.'}`,
        });
      } else {
        setError(data.error || "Draft creation failed");
        setToast({ content: data.error || "Draft creation failed", error: true });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Draft creation failed";
      setError(errorMessage);
      setToast({ content: errorMessage, error: true });
    } finally {
      setCreating(false);
    }
  }, [analysisResult, tenant, shopifySession]);

  const getScoreColor = (score: number) => {
    if (score >= 8) return "success";
    if (score >= 6) return "warning";
    return "critical";
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const tabs = [
    {
      id: "analyzer",
      content: "Page Analyzer",
      accessibilityLabel: "Analyze landing page",
    },
    {
      id: "results",
      content: "Results & Suggestions",
      accessibilityLabel: "Analysis results and optimization suggestions",
    },
  ];

  const analyzerContent = (
    <Layout>
      <Layout.Section>
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">
              Landing Page AI Analyzer
            </Text>
            <Text color="subdued">
              Enter a URL to analyze your landing page and receive AI-powered optimization suggestions.
              This PRO tier feature analyzes conversion potential and suggests improvements.
            </Text>

            <Divider />

            <FormLayout>
              <TextField
                label="Landing Page URL"
                value={pageUrl}
                onChange={setPageUrl}
                placeholder="https://your-store.myshopify.com/pages/landing-page"
                helpText="Enter the full URL of the page you want to analyze"
                error={error}
                disabled={analyzing}
              />

              <Button
                primary
                loading={analyzing}
                onClick={analyzePage}
                disabled={!pageUrl.trim() || analyzing}
                icon={AnalyticsIcon}
              >
                {analyzing ? "Analyzing Page..." : "Analyze Page"}
              </Button>
            </FormLayout>

            {analyzing && (
              <Card>
                <BlockStack gap="200" align="center">
                  <Spinner size="large" />
                  <Text>Analyzing page content and generating optimization suggestions...</Text>
                  <ProgressBar progress={75} />
                </BlockStack>
              </Card>
            )}
          </BlockStack>
        </Card>

        {analysisResult && (
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h3">
                Recent Analysis
              </Text>
              <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                <InlineStack align="space-between">
                  <Text variant="bodyMd">
                    <strong>URL:</strong> {analysisResult.url}
                  </Text>
                  <Badge tone="info">
                    {new Date(analysisResult.timestamp).toLocaleDateString()}
                  </Badge>
                </InlineStack>
              </Box>
              <Button onClick={() => setSelectedTab(1)}>
                View Results & Suggestions
              </Button>
            </BlockStack>
          </Card>
        )}
      </Layout.Section>
    </Layout>
  );

  const resultsContent = analysisResult ? (
    <Layout>
      <Layout.Section>
        {/* Analysis Overview */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text variant="headingMd" as="h2">
                Page Analysis Results
              </Text>
              <Badge tone={getScoreColor(analysisResult.analysis.overallScore)}>
                Score: {analysisResult.analysis.overallScore}/10
              </Badge>
            </InlineStack>

            <Text color="subdued">
              URL: {analysisResult.url}
            </Text>

            <Button
              variant="plain"
              onClick={() => toggleSection('analysis')}
              textAlign="left"
            >
              <InlineStack gap="200">
                <Icon source={ViewIcon} />
                <Text variant="bodyMd">Analysis Details</Text>
              </InlineStack>
            </Button>

            <Collapsible open={expandedSections.analysis}>
              <BlockStack gap="300">
                <InlineStack gap="500" wrap={false}>
                  <Card>
                    <BlockStack gap="200">
                      <Text variant="headingSm" color="success">
                        Strengths
                      </Text>
                      <List type="bullet">
                        {analysisResult.analysis.strengths.map((strength, index) => (
                          <List.Item key={index}>{strength}</List.Item>
                        ))}
                      </List>
                    </BlockStack>
                  </Card>

                  <Card>
                    <BlockStack gap="200">
                      <Text variant="headingSm" color="critical">
                        Areas for Improvement
                      </Text>
                      <List type="bullet">
                        {analysisResult.analysis.weaknesses.map((weakness, index) => (
                          <List.Item key={index}>{weakness}</List.Item>
                        ))}
                      </List>
                    </BlockStack>
                  </Card>
                </InlineStack>

                <DescriptionList
                  items={[
                    {
                      term: "Mobile Readiness",
                      description: `${analysisResult.analysis.mobileReadiness}/10`
                    },
                    {
                      term: "Conversion Issues",
                      description: analysisResult.analysis.conversionIssues.join(", ")
                    },
                    {
                      term: "Trust Signals",
                      description: analysisResult.analysis.trustSignals.length > 0
                        ? analysisResult.analysis.trustSignals.join(", ")
                        : "None detected"
                    },
                    {
                      term: "Competitive Advantage",
                      description: analysisResult.analysis.competitiveAdvantage
                    }
                  ]}
                />
              </BlockStack>
            </Collapsible>
          </BlockStack>
        </Card>

        {/* Optimization Suggestions */}
        <Card>
          <BlockStack gap="400">
            <Button
              variant="plain"
              onClick={() => toggleSection('suggestions')}
              textAlign="left"
            >
              <InlineStack gap="200">
                <Icon source={EditIcon} />
                <Text variant="headingMd">AI Optimization Suggestions</Text>
              </InlineStack>
            </Button>

            <Collapsible open={expandedSections.suggestions}>
              <BlockStack gap="400">
                {/* Title Suggestions */}
                {analysisResult.suggestions.titleSuggestions?.length > 0 && (
                  <Card>
                    <BlockStack gap="200">
                      <Text variant="headingSm">Title Optimizations</Text>
                      {analysisResult.suggestions.titleSuggestions.map((suggestion, index) => (
                        <Box key={index} padding="300" background="bg-surface-secondary" borderRadius="200">
                          <BlockStack gap="100">
                            <Text variant="bodyMd"><strong>{suggestion.suggestion}</strong></Text>
                            <Text color="subdued">{suggestion.reason}</Text>
                          </BlockStack>
                        </Box>
                      ))}
                    </BlockStack>
                  </Card>
                )}

                {/* CTA Suggestions */}
                {analysisResult.suggestions.ctaSuggestions?.length > 0 && (
                  <Card>
                    <BlockStack gap="200">
                      <Text variant="headingSm">Call-to-Action Improvements</Text>
                      {analysisResult.suggestions.ctaSuggestions.map((suggestion, index) => (
                        <Box key={index} padding="300" background="bg-surface-secondary" borderRadius="200">
                          <BlockStack gap="100">
                            <Text variant="bodyMd"><strong>{suggestion.suggestion}</strong></Text>
                            <Text color="subdued">{suggestion.reason}</Text>
                          </BlockStack>
                        </Box>
                      ))}
                    </BlockStack>
                  </Card>
                )}

                {/* Above-the-fold Suggestions */}
                {analysisResult.suggestions.aboveTheFoldSuggestions?.length > 0 && (
                  <Card>
                    <BlockStack gap="200">
                      <Text variant="headingSm">Above-the-Fold Content</Text>
                      {analysisResult.suggestions.aboveTheFoldSuggestions.map((suggestion, index) => (
                        <Box key={index} padding="300" background="bg-surface-secondary" borderRadius="200">
                          <BlockStack gap="100">
                            <Text variant="bodyMd"><strong>{suggestion.suggestion}</strong></Text>
                            <Text color="subdued">{suggestion.reason}</Text>
                          </BlockStack>
                        </Box>
                      ))}
                    </BlockStack>
                  </Card>
                )}

                {/* Trust & Urgency */}
                <InlineStack gap="400" wrap={false}>
                  {analysisResult.suggestions.trustSuggestions?.length > 0 && (
                    <Card>
                      <BlockStack gap="200">
                        <Text variant="headingSm">Trust Building</Text>
                        {analysisResult.suggestions.trustSuggestions.slice(0, 2).map((suggestion, index) => (
                          <Box key={index} padding="200" background="bg-surface-secondary" borderRadius="200">
                            <BlockStack gap="100">
                              <Text variant="bodyMd">{suggestion.suggestion}</Text>
                              <Text color="subdued" variant="bodySm">{suggestion.reason}</Text>
                            </BlockStack>
                          </Box>
                        ))}
                      </BlockStack>
                    </Card>
                  )}

                  {analysisResult.suggestions.urgencySuggestions?.length > 0 && (
                    <Card>
                      <BlockStack gap="200">
                        <Text variant="headingSm">Urgency Elements</Text>
                        {analysisResult.suggestions.urgencySuggestions.slice(0, 2).map((suggestion, index) => (
                          <Box key={index} padding="200" background="bg-surface-secondary" borderRadius="200">
                            <BlockStack gap="100">
                              <Text variant="bodyMd">{suggestion.suggestion}</Text>
                              <Text color="subdued" variant="bodySm">{suggestion.reason}</Text>
                            </BlockStack>
                          </Box>
                        ))}
                      </BlockStack>
                    </Card>
                  )}
                </InlineStack>
              </BlockStack>
            </Collapsible>
          </BlockStack>
        </Card>

        {/* Priority Actions */}
        <Card>
          <BlockStack gap="400">
            <Button
              variant="plain"
              onClick={() => toggleSection('priorities')}
              textAlign="left"
            >
              <InlineStack gap="200">
                <Icon source={CheckIcon} />
                <Text variant="headingMd">Priority Actions</Text>
              </InlineStack>
            </Button>

            <Collapsible open={expandedSections.priorities}>
              <BlockStack gap="300">
                {analysisResult.suggestions.priorityChanges?.map((change, index) => (
                  <CalloutCard
                    key={index}
                    title={change.change}
                    illustration="/priority-icon.svg"
                    primaryAction={{
                      content: "Create Draft",
                      onAction: createDraft,
                      loading: creating
                    }}
                  >
                    <Text>
                      <strong>Priority:</strong> {change.priority} | <strong>Expected Lift:</strong> {change.expectedLift}
                    </Text>
                  </CalloutCard>
                ))}

                <Banner tone="info">
                  <Text>
                    <strong>Important:</strong> Drafts are created for review only and never auto-published.
                    You maintain full control over what changes go live.
                  </Text>
                </Banner>
              </BlockStack>
            </Collapsible>
          </BlockStack>
        </Card>
      </Layout.Section>
    </Layout>
  ) : (
    <Layout>
      <Layout.Section>
        <Card>
          <BlockStack gap="300" align="center">
            <Text variant="headingMd">No Analysis Results</Text>
            <Text color="subdued">
              Analyze a landing page first to see AI-powered optimization suggestions.
            </Text>
            <Button onClick={() => setSelectedTab(0)}>
              Start Analysis
            </Button>
          </BlockStack>
        </Card>
      </Layout.Section>
    </Layout>
  );

  return (
    <Frame>
      <Page
        title="Landing Page AI Optimizer"
        subtitle="AI-powered landing page analysis and optimization suggestions (PRO Feature)"
        primaryAction={{
          content: analysisResult ? "Create Draft Changes" : "Analyze New Page",
          onAction: analysisResult ? createDraft : () => setSelectedTab(0),
          loading: creating,
          disabled: creating || analyzing
        }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                {selectedTab === 0 && analyzerContent}
                {selectedTab === 1 && resultsContent}
              </Tabs>
            </Card>
          </Layout.Section>
        </Layout>

        {toast && (
          <Toast
            content={toast.content}
            error={toast.error}
            onDismiss={() => setToast(null)}
          />
        )}
      </Page>
    </Frame>
  );
}