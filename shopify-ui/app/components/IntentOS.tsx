import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Page,
  Layout,
  Text,
  Badge,
  Button,
  Select,
  Spinner,
  TextField,
  Banner,
  Modal,
  Tabs,
  ResourceList,
  ResourceItem,
  Avatar,
  Tooltip,
  ChoiceList,
  ButtonGroup,
  DataTable,
  EmptyState,
  FormLayout,
  Toast,
  Frame,
  Box,
  BlockStack,
  InlineStack,
} from "@shopify/polaris";

interface IntentOSProps {
  tenantId: string;
  promoteEnabled?: boolean;
}

interface OverlayConfig {
  selector: string;
  channel: string;
  metafields: Record<string, any>;
  description?: string;
}

interface IntentBlock {
  intent_key: string;
  hero_headline: string;
  benefit_bullets: string[];
  proof_snippet: string;
  cta_text: string;
  url_target: string;
  updated_at: string;
  updated_by: string;
}

interface PromoDraft {
  id: string;
  title: string;
  handle: string;
  status: string;
  content: string;
  meta_description: string;
  created_at: string;
  created_by: string;
  tags: string[];
}

interface UTMContent {
  strategy: {
    urgency: string;
    social_proof: string;
    cta_style: string;
  };
  variations: Array<{
    hero_headline: string;
    benefit_bullets: string[];
    proof_snippet: string;
    cta_text: string;
    url_target: string;
  }>;
  generated_at: string;
}

export const IntentOS: React.FC<IntentOSProps> = ({
  tenantId,
  promoteEnabled = false,
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastError, setToastError] = useState(false);

  // Metafield Overlay State
  const [overlayConfig, setOverlayConfig] = useState<OverlayConfig>({
    selector: "",
    channel: "web",
    metafields: {},
    description: "",
  });
  const [overlayHistory, setOverlayHistory] = useState<any[]>([]);
  const [activeOverlay, setActiveOverlay] = useState<any>(null);
  const [overlayModalActive, setOverlayModalActive] = useState(false);

  // Intent Blocks State
  const [intentBlocks, setIntentBlocks] = useState<Record<string, IntentBlock>>(
    {},
  );
  const [intentModalActive, setIntentModalActive] = useState(false);
  const [editingIntent, setEditingIntent] = useState<IntentBlock | null>(null);

  // UTM Content State
  const [utmContent, setUtmContent] = useState<UTMContent | null>(null);
  const [utmTerm, setUtmTerm] = useState("high-intent");
  const [productContext, setProductContext] = useState<Record<string, any>>({});

  // Promo Drafts State
  const [promoDrafts, setPromoDrafts] = useState<PromoDraft[]>([]);
  const [promoModalActive, setPromoModalActive] = useState(false);
  const [promoConfig, setPromoConfig] = useState({
    campaign_name: "",
    offer_details: "",
    target_audience: "",
    industry: "ecommerce",
    campaign_type: "sale",
  });

  const showToast = useCallback((message: string, isError = false) => {
    setToastMessage(message);
    setToastError(isError);
    setToastActive(true);
  }, []);

  const apiCall = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      try {
        const response = await fetch(`/api/intent-os/${endpoint}`, {
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
          ...options,
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "API call failed");
        }

        return data.data;
      } catch (error: unknown) {
        console.error(`API call failed: ${endpoint}`, error);
        throw error;
      }
    },
    [],
  );

  // Load initial data
  useEffect(() => {
    loadIntentBlocks();
    loadOverlayHistory();
    loadPromoDrafts();
  }, [tenantId]);

  const loadIntentBlocks = async () => {
    try {
      const blocks = await apiCall(`intent-blocks?tenantId=${tenantId}`);
      setIntentBlocks(blocks || {});
    } catch (error: unknown) {
      console.error("Failed to load intent blocks:", error);
    }
  };

  const loadOverlayHistory = async () => {
    try {
      const history = await apiCall(`overlay-history?tenantId=${tenantId}`);
      setOverlayHistory(history || []);

      const active = await apiCall(`overlay-active?tenantId=${tenantId}`);
      setActiveOverlay(active);
    } catch (error: unknown) {
      console.error("Failed to load overlay history:", error);
    }
  };

  const loadPromoDrafts = async () => {
    try {
      const drafts = await apiCall(`promo-drafts?tenantId=${tenantId}`);
      setPromoDrafts(drafts || []);
    } catch (error: unknown) {
      console.error("Failed to load promo drafts:", error);
    }
  };

  const applyOverlay = async () => {
    if (!promoteEnabled) {
      showToast("PROMOTE flag must be enabled to apply overlays", true);
      return;
    }

    setLoading(true);
    try {
      await apiCall("apply-overlay", {
        method: "POST",
        body: JSON.stringify({
          tenantId,
          overlayConfig,
          promote: true,
        }),
      });

      showToast("Metafield overlay applied successfully");
      setOverlayModalActive(false);
      loadOverlayHistory();
    } catch (error: unknown) {
      showToast(
        `Failed to apply overlay: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    } finally {
      setLoading(false);
    }
  };

  const revertOverlay = async (targetVersion?: string) => {
    if (!promoteEnabled) {
      showToast("PROMOTE flag must be enabled to revert overlays", true);
      return;
    }

    setLoading(true);
    try {
      await apiCall("revert-overlay", {
        method: "POST",
        body: JSON.stringify({
          tenantId,
          targetVersion,
          promote: true,
        }),
      });

      showToast("Metafield overlay reverted successfully");
      loadOverlayHistory();
    } catch (error: unknown) {
      showToast(
        `Failed to revert overlay: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    } finally {
      setLoading(false);
    }
  };

  const generateUTMContent = async () => {
    setLoading(true);
    try {
      const content = await apiCall("utm-content", {
        method: "POST",
        body: JSON.stringify({
          tenantId,
          utmTerm,
          productContext,
        }),
      });

      setUtmContent(content);
      showToast("UTM content generated successfully");
    } catch (error: unknown) {
      showToast(
        `Failed to generate UTM content: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    } finally {
      setLoading(false);
    }
  };

  const saveIntentBlock = async () => {
    if (!editingIntent || !promoteEnabled) {
      showToast("PROMOTE flag must be enabled to save intent blocks", true);
      return;
    }

    setLoading(true);
    try {
      await apiCall("intent-blocks", {
        method: "POST",
        body: JSON.stringify({
          tenantId,
          intentKey: editingIntent.intent_key,
          blockData: editingIntent,
          promote: true,
        }),
      });

      showToast("Intent block saved successfully");
      setIntentModalActive(false);
      setEditingIntent(null);
      loadIntentBlocks();
    } catch (error: unknown) {
      showToast(
        `Failed to save intent block: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    } finally {
      setLoading(false);
    }
  };

  const createPromoDraft = async () => {
    if (!promoteEnabled) {
      showToast("PROMOTE flag must be enabled to create promo drafts", true);
      return;
    }

    setLoading(true);
    try {
      const draft = await apiCall("promo-draft", {
        method: "POST",
        body: JSON.stringify({
          tenantId,
          promoConfig,
          promote: true,
        }),
      });

      showToast(`Promo draft created: ${draft.draft.title}`);
      setPromoModalActive(false);
      loadPromoDrafts();
    } catch (error: unknown) {
      showToast(
        `Failed to create promo draft: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    {
      id: "overlays",
      content: "Catalog Overlays",
      accessibilityLabel: "Metafield overlay management",
      panelID: "overlays-panel",
    },
    {
      id: "intent-blocks",
      content: "Intent Blocks",
      accessibilityLabel: "Intent block management",
      panelID: "intent-blocks-panel",
    },
    {
      id: "utm-content",
      content: "UTM Content",
      accessibilityLabel: "UTM-driven content generation",
      panelID: "utm-content-panel",
    },
    {
      id: "promo-drafts",
      content: "Promo Drafts",
      accessibilityLabel: "AI-generated promo page drafts",
      panelID: "promo-drafts-panel",
    },
  ];

  const renderOverlaysTab = () => (
    <Layout>
      <Layout.Section>
        {!promoteEnabled && (
          <Banner tone="warning" title="PROMOTE flag disabled">
            <p>
              Overlay mutations are disabled. Enable PROMOTE flag to apply
              changes.
            </p>
          </Banner>
        )}

        <Card>
          <Box padding="400">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text variant="headingMd" as="h3">Metafield Overlays</Text>
              <Button
                variant="primary"
                onClick={() => setOverlayModalActive(true)}
                disabled={!promoteEnabled}
              >
                Apply New Overlay
              </Button>
            </div>
          </Box>

          {activeOverlay && (
            <Box padding="400">
              <BlockStack gap="400">
                <Text variant="headingSm" as="h4">Active Overlay</Text>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <BlockStack gap="200">
                    <Text as="span">Version: {activeOverlay.version}</Text>
                    <Text as="span" tone="subdued">
                      Applied:{" "}
                      {new Date(activeOverlay.appliedAt).toLocaleString()}
                    </Text>
                  </BlockStack>
                  <Button
                    tone="critical"
                    onClick={() => revertOverlay()}
                    disabled={!promoteEnabled}
                    loading={loading}
                  >
                    Revert to Previous
                  </Button>
                </div>
              </BlockStack>
            </Box>
          )}

          <Box padding="400">
            <DataTable
              columnContentTypes={["text", "text", "text", "text", "text"]}
              headings={[
                "Timestamp",
                "Action",
                "Selector",
                "Channel",
                "Actions",
              ]}
              rows={overlayHistory.map((entry) => [
                new Date(entry.timestamp).toLocaleString(),
                <Badge key={`badge-${entry.timestamp}`} tone={entry.action === "APPLY" ? "success" : "info"}>
                  {entry.action}
                </Badge>,
                entry.selector || "-",
                entry.channel || "web",
                <ButtonGroup key={`actions-${entry.timestamp}`}>
                  <Button
                    size="slim"
                    onClick={() => revertOverlay(entry.timestamp)}
                    disabled={!promoteEnabled}
                  >
                    Revert to This
                  </Button>
                </ButtonGroup>,
              ])}
            />
          </Box>
        </Card>
      </Layout.Section>
    </Layout>
  );

  const renderIntentBlocksTab = () => (
    <Layout>
      <Layout.Section>
        <Card>
          <Box padding="400">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text variant="headingMd" as="h3">Intent Blocks</Text>
              <Button
                variant="primary"
                onClick={() => {
                  setEditingIntent({
                    intent_key: "",
                    hero_headline: "",
                    benefit_bullets: [],
                    proof_snippet: "",
                    cta_text: "",
                    url_target: "",
                    updated_at: "",
                    updated_by: "",
                  });
                  setIntentModalActive(true);
                }}
                disabled={!promoteEnabled}
              >
                Create Intent Block
              </Button>
            </div>
          </Box>

          <Box padding="400">
            {Object.keys(intentBlocks).length === 0 ? (
              <EmptyState
                heading="No intent blocks yet"
                action={{
                  content: "Create your first intent block",
                  onAction: () => {
                    setEditingIntent({
                      intent_key: "",
                      hero_headline: "",
                      benefit_bullets: [],
                      proof_snippet: "",
                      cta_text: "",
                      url_target: "",
                      updated_at: "",
                      updated_by: "",
                    });
                    setIntentModalActive(true);
                  },
                }}
                image="https://cdn.shopify.com/s/files/1/0005/4175/0643/files/empty-state.svg"
              >
                <p>
                  Intent blocks help you create targeted content for different
                  user intents and UTM campaigns.
                </p>
              </EmptyState>
            ) : (
              <ResourceList
                resourceName={{
                  singular: "intent block",
                  plural: "intent blocks",
                }}
                items={Object.entries(intentBlocks).map(([key, block]) => ({
                  id: key,
                  ...block,
                }))}
                renderItem={(item) => {
                  const { id, hero_headline, proof_snippet, updated_at } = item;
                  return (
                    <ResourceItem
                      id={id}
                      onClick={() => {
                        setEditingIntent(intentBlocks[id]);
                        setIntentModalActive(true);
                      }}
                      media={
                        <Avatar
                          customer={false}
                          size="md"
                          initials={id.substring(0, 2).toUpperCase()}
                        />
                      }
                      accessibilityLabel={`View details for ${id}`}
                    >
                      <InlineStack align="space-between">
                        <BlockStack gap="200">
                          <Text variant="bodyMd" as="p" fontWeight="semibold">
                            {id}
                          </Text>
                          <Text variant="bodySm" as="span">{hero_headline}</Text>
                          <Text variant="bodySm" as="span" tone="subdued">
                            {proof_snippet}
                          </Text>
                          <Text variant="bodySm" as="span" tone="subdued">
                            Updated:{" "}
                            {updated_at
                              ? new Date(updated_at).toLocaleString()
                              : "Never"}
                          </Text>
                        </BlockStack>
                        <ButtonGroup>
                          <Button
                            size="slim"
                            onClick={() => {
                              setEditingIntent(intentBlocks[id]);
                              setIntentModalActive(true);
                            }}
                            disabled={!promoteEnabled}
                          >
                            Edit
                          </Button>
                        </ButtonGroup>
                      </InlineStack>
                    </ResourceItem>
                  );
                }}
              />
            )}
          </Box>
        </Card>
      </Layout.Section>
    </Layout>
  );

  const renderUTMContentTab = () => (
    <Layout>
      <Layout.Section>
        <Card>
          <Box padding="400">
            <BlockStack gap="200">
              <Text variant="headingMd" as="h3">UTM-Driven Content Generator</Text>
              <Text as="p">
                Generate dynamic content variations based on UTM parameters for
                improved conversion rates.
              </Text>
            </BlockStack>
          </Box>

          <Box padding="400">
            <FormLayout>
              <Select
                label="UTM Term"
                options={[
                  { label: "High Intent", value: "high-intent" },
                  { label: "Research Phase", value: "research" },
                  { label: "Comparison Shopping", value: "comparison" },
                ]}
                value={utmTerm}
                onChange={(value) => setUtmTerm(value)}
              />

              <TextField
                label="Product Category"
                value={productContext.category || ""}
                onChange={(value) =>
                  setProductContext({ ...productContext, category: value })
                }
                placeholder="e.g., shoes, electronics, furniture"
                autoComplete="off"
              />

              <TextField
                label="Discount Percentage"
                value={productContext.discount || ""}
                onChange={(value) =>
                  setProductContext({ ...productContext, discount: value })
                }
                placeholder="e.g., 20"
                suffix="%"
                autoComplete="off"
              />

              <Button variant="primary" onClick={generateUTMContent} loading={loading}>
                Generate Content Variations
              </Button>
            </FormLayout>
          </Box>

          {utmContent && (
            <Box padding="400">
              <BlockStack gap="400">
                <Text variant="headingSm" as="h4">Generated Content</Text>
                <Text as="span" tone="subdued">
                  Strategy: {utmContent.strategy.urgency} urgency,{" "}
                  {utmContent.strategy.social_proof} social proof
                </Text>

                {utmContent.variations.map((variation, index) => (
                  <Card key={index} padding="400">
                    <BlockStack gap="200">
                      <Text variant="headingSm" as="h4">Variation {index + 1}</Text>
                      <Text as="p">
                        <strong>Headline:</strong> {variation.hero_headline}
                      </Text>
                      <Text as="p">
                        <strong>Benefits:</strong>{" "}
                        {variation.benefit_bullets.join(" - ")}
                      </Text>
                      <Text as="p">
                        <strong>Social Proof:</strong> {variation.proof_snippet}
                      </Text>
                      <Text as="p">
                        <strong>CTA:</strong> {variation.cta_text}
                      </Text>
                      <Text as="p">
                        <strong>URL:</strong> {variation.url_target}
                      </Text>
                    </BlockStack>
                  </Card>
                ))}
              </BlockStack>
            </Box>
          )}
        </Card>
      </Layout.Section>
    </Layout>
  );

  const renderPromoDraftsTab = () => (
    <Layout>
      <Layout.Section>
        <Card>
          <Box padding="400">
            <BlockStack gap="200">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text variant="headingMd" as="h3">AI Promo Page Drafts</Text>
                <Button
                  variant="primary"
                  onClick={() => setPromoModalActive(true)}
                  disabled={!promoteEnabled}
                >
                  Create Promo Draft
                </Button>
              </div>
              <Text as="p">
                AI-generated promotional page drafts. All pages remain as drafts
                and require manual review before publishing.
              </Text>
            </BlockStack>
          </Box>

          <Box padding="400">
            {promoDrafts.length === 0 ? (
              <EmptyState
                heading="No promo drafts yet"
                action={{
                  content: "Create your first promo draft",
                  onAction: () => setPromoModalActive(true),
                }}
                image="https://cdn.shopify.com/s/files/1/0005/4175/0643/files/empty-state.svg"
              >
                <p>
                  Generate AI-powered promotional page drafts for your campaigns
                  and offers.
                </p>
              </EmptyState>
            ) : (
              <ResourceList
                resourceName={{
                  singular: "promo draft",
                  plural: "promo drafts",
                }}
                items={promoDrafts}
                renderItem={(draft) => (
                  <ResourceItem
                    id={draft.id}
                    onClick={() => {}}
                    media={
                      <Avatar customer={false} size="md" initials="PD" />
                    }
                    accessibilityLabel={`View details for ${draft.title}`}
                  >
                    <InlineStack align="space-between">
                      <BlockStack gap="200">
                        <Text variant="bodyMd" as="p" fontWeight="semibold">
                          {draft.title}
                        </Text>
                        <Text variant="bodySm" as="span">{draft.meta_description}</Text>
                        <Text variant="bodySm" as="span" tone="subdued">
                          Handle: /{draft.handle}
                        </Text>
                        <Text variant="bodySm" as="span" tone="subdued">
                          Created: {new Date(draft.created_at).toLocaleString()}
                        </Text>
                        <InlineStack gap="200">
                          <Badge tone="info">DRAFT</Badge>
                          {draft.tags.map((tag) => (
                            <Badge key={tag}>{tag}</Badge>
                          ))}
                        </InlineStack>
                      </BlockStack>
                      <ButtonGroup>
                        <Button size="slim">Preview</Button>
                        <Button size="slim" variant="primary">
                          Review &amp; Publish
                        </Button>
                      </ButtonGroup>
                    </InlineStack>
                  </ResourceItem>
                )}
              />
            )}
          </Box>
        </Card>
      </Layout.Section>
    </Layout>
  );

  const toastMarkup = toastActive ? (
    <Toast
      content={toastMessage}
      error={toastError}
      onDismiss={() => setToastActive(false)}
    />
  ) : null;

  return (
    <Frame>
      <Page title="Intent OS - Conversion Rate Optimization">
        <Layout>
          <Layout.Section>
            <Card>
              <Tabs
                tabs={tabs}
                selected={selectedTab}
                onSelect={setSelectedTab}
              >
                <Box padding="400">
                  {selectedTab === 0 && renderOverlaysTab()}
                  {selectedTab === 1 && renderIntentBlocksTab()}
                  {selectedTab === 2 && renderUTMContentTab()}
                  {selectedTab === 3 && renderPromoDraftsTab()}
                </Box>
              </Tabs>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Overlay Modal */}
        <Modal
          open={overlayModalActive}
          onClose={() => setOverlayModalActive(false)}
          title="Apply Metafield Overlay"
          primaryAction={{
            content: "Apply Overlay",
            onAction: applyOverlay,
            loading,
            disabled: !promoteEnabled,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setOverlayModalActive(false),
            },
          ]}
        >
          <Modal.Section>
            <FormLayout>
              <TextField
                label="CSS Selector"
                value={overlayConfig.selector}
                onChange={(value) =>
                  setOverlayConfig({ ...overlayConfig, selector: value })
                }
                placeholder="e.g., .product-title, #price-display"
                helpText="Target element for the overlay"
                autoComplete="off"
              />

              <Select
                label="Channel"
                options={[
                  { label: "Web", value: "web" },
                  { label: "Mobile App", value: "mobile" },
                  { label: "Email", value: "email" },
                ]}
                value={overlayConfig.channel}
                onChange={(value) =>
                  setOverlayConfig({ ...overlayConfig, channel: value })
                }
              />

              <TextField
                label="Description"
                value={overlayConfig.description || ""}
                onChange={(value) =>
                  setOverlayConfig({ ...overlayConfig, description: value })
                }
                placeholder="Brief description of this overlay"
                multiline={2}
                autoComplete="off"
              />
            </FormLayout>
          </Modal.Section>
        </Modal>

        {/* Intent Block Modal */}
        <Modal
          open={intentModalActive}
          onClose={() => {
            setIntentModalActive(false);
            setEditingIntent(null);
          }}
          title={
            editingIntent?.intent_key
              ? "Edit Intent Block"
              : "Create Intent Block"
          }
          primaryAction={{
            content: "Save Intent Block",
            onAction: saveIntentBlock,
            loading,
            disabled: !promoteEnabled,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => {
                setIntentModalActive(false);
                setEditingIntent(null);
              },
            },
          ]}
        >
          {editingIntent && (
            <Modal.Section>
              <FormLayout>
                <TextField
                  label="Intent Key"
                  value={editingIntent.intent_key}
                  onChange={(value) =>
                    setEditingIntent({ ...editingIntent, intent_key: value })
                  }
                  placeholder="e.g., high-intent-sale, brand-awareness"
                  autoComplete="off"
                />

                <TextField
                  label="Hero Headline"
                  value={editingIntent.hero_headline}
                  onChange={(value) =>
                    setEditingIntent({ ...editingIntent, hero_headline: value })
                  }
                  placeholder="Compelling headline for this intent"
                  autoComplete="off"
                />

                <TextField
                  label="Benefit Bullets (one per line)"
                  value={editingIntent.benefit_bullets.join("\n")}
                  onChange={(value) =>
                    setEditingIntent({
                      ...editingIntent,
                      benefit_bullets: value.split("\n").filter(Boolean),
                    })
                  }
                  multiline={4}
                  placeholder="Fast Shipping&#10;Money-Back Guarantee&#10;Expert Support"
                  autoComplete="off"
                />

                <TextField
                  label="Social Proof Snippet"
                  value={editingIntent.proof_snippet}
                  onChange={(value) =>
                    setEditingIntent({ ...editingIntent, proof_snippet: value })
                  }
                  placeholder="Join 10,000+ satisfied customers"
                  autoComplete="off"
                />

                <TextField
                  label="CTA Text"
                  value={editingIntent.cta_text}
                  onChange={(value) =>
                    setEditingIntent({ ...editingIntent, cta_text: value })
                  }
                  placeholder="Shop Now & Save"
                  autoComplete="off"
                />

                <TextField
                  label="Target URL"
                  value={editingIntent.url_target}
                  onChange={(value) =>
                    setEditingIntent({ ...editingIntent, url_target: value })
                  }
                  placeholder="/collections/sale"
                  autoComplete="off"
                />
              </FormLayout>
            </Modal.Section>
          )}
        </Modal>

        {/* Promo Draft Modal */}
        <Modal
          open={promoModalActive}
          onClose={() => setPromoModalActive(false)}
          title="Create AI Promo Draft"
          primaryAction={{
            content: "Generate Draft",
            onAction: createPromoDraft,
            loading,
            disabled: !promoteEnabled,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setPromoModalActive(false),
            },
          ]}
        >
          <Modal.Section>
            <FormLayout>
              <TextField
                label="Campaign Name"
                value={promoConfig.campaign_name}
                onChange={(value) =>
                  setPromoConfig({ ...promoConfig, campaign_name: value })
                }
                placeholder="Summer Sale 2024"
                autoComplete="off"
              />

              <TextField
                label="Offer Details"
                value={promoConfig.offer_details}
                onChange={(value) =>
                  setPromoConfig({ ...promoConfig, offer_details: value })
                }
                placeholder="25% off all summer items + free shipping"
                multiline={2}
                autoComplete="off"
              />

              <TextField
                label="Target Audience"
                value={promoConfig.target_audience}
                onChange={(value) =>
                  setPromoConfig({ ...promoConfig, target_audience: value })
                }
                placeholder="Fashion-conscious millennials"
                autoComplete="off"
              />

              <Select
                label="Industry"
                options={[
                  { label: "E-commerce", value: "ecommerce" },
                  { label: "SaaS", value: "saas" },
                  { label: "Services", value: "services" },
                ]}
                value={promoConfig.industry}
                onChange={(value) =>
                  setPromoConfig({ ...promoConfig, industry: value })
                }
              />

              <Select
                label="Campaign Type"
                options={[
                  { label: "Sale/Discount", value: "sale" },
                  { label: "Product Launch", value: "launch" },
                  { label: "Seasonal", value: "seasonal" },
                  { label: "Flash Sale", value: "flash" },
                ]}
                value={promoConfig.campaign_type}
                onChange={(value) =>
                  setPromoConfig({ ...promoConfig, campaign_type: value })
                }
              />
            </FormLayout>
          </Modal.Section>
        </Modal>
      </Page>
      {toastMarkup}
    </Frame>
  );
};

export default IntentOS;
