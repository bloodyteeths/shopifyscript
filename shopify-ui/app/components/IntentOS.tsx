import { useState, useEffect, useCallback } from 'react';
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
  TextContainer,
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
} from '@shopify/polaris';
// Note: Some Polaris icons may not be available, using safe fallbacks
const CheckCircleIcon = () => <span>✅</span>;
const AlertCircleIcon = () => <span>⚠️</span>;
const InfoIcon = () => <span>ℹ️</span>;
const EditIcon = () => <span>✏️</span>;
const DeleteIcon = () => <span>🗑️</span>;

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
  promoteEnabled = false 
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastError, setToastError] = useState(false);

  // Metafield Overlay State
  const [overlayConfig, setOverlayConfig] = useState<OverlayConfig>({
    selector: '',
    channel: 'web',
    metafields: {},
    description: ''
  });
  const [overlayHistory, setOverlayHistory] = useState<any[]>([]);
  const [activeOverlay, setActiveOverlay] = useState<any>(null);
  const [overlayModalActive, setOverlayModalActive] = useState(false);

  // Intent Blocks State
  const [intentBlocks, setIntentBlocks] = useState<Record<string, IntentBlock>>({});
  const [intentModalActive, setIntentModalActive] = useState(false);
  const [editingIntent, setEditingIntent] = useState<IntentBlock | null>(null);

  // UTM Content State
  const [utmContent, setUtmContent] = useState<UTMContent | null>(null);
  const [utmTerm, setUtmTerm] = useState('high-intent');
  const [productContext, setProductContext] = useState<Record<string, any>>({});

  // Promo Drafts State
  const [promoDrafts, setPromoDrafts] = useState<PromoDraft[]>([]);
  const [promoModalActive, setPromoModalActive] = useState(false);
  const [promoConfig, setPromoConfig] = useState({
    campaign_name: '',
    offer_details: '',
    target_audience: '',
    industry: 'ecommerce',
    campaign_type: 'sale'
  });

  const showToast = useCallback((message: string, isError = false) => {
    setToastMessage(message);
    setToastError(isError);
    setToastActive(true);
  }, []);

  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(`/api/intent-os/${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'API call failed');
      }
      
      return data.data;
    } catch (error) {
      console.error(`API call failed: ${endpoint}`, error);
      throw error;
    }
  }, []);

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
    } catch (error) {
      console.error('Failed to load intent blocks:', error);
    }
  };

  const loadOverlayHistory = async () => {
    try {
      const history = await apiCall(`overlay-history?tenantId=${tenantId}`);
      setOverlayHistory(history || []);
      
      const active = await apiCall(`overlay-active?tenantId=${tenantId}`);
      setActiveOverlay(active);
    } catch (error) {
      console.error('Failed to load overlay history:', error);
    }
  };

  const loadPromoDrafts = async () => {
    try {
      const drafts = await apiCall(`promo-drafts?tenantId=${tenantId}`);
      setPromoDrafts(drafts || []);
    } catch (error) {
      console.error('Failed to load promo drafts:', error);
    }
  };

  const applyOverlay = async () => {
    if (!promoteEnabled) {
      showToast('PROMOTE flag must be enabled to apply overlays', true);
      return;
    }

    setLoading(true);
    try {
      await apiCall('apply-overlay', {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          overlayConfig,
          promote: true
        })
      });
      
      showToast('Metafield overlay applied successfully');
      setOverlayModalActive(false);
      loadOverlayHistory();
    } catch (error) {
      showToast(`Failed to apply overlay: ${error.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  const revertOverlay = async (targetVersion?: string) => {
    if (!promoteEnabled) {
      showToast('PROMOTE flag must be enabled to revert overlays', true);
      return;
    }

    setLoading(true);
    try {
      await apiCall('revert-overlay', {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          targetVersion,
          promote: true
        })
      });
      
      showToast('Metafield overlay reverted successfully');
      loadOverlayHistory();
    } catch (error) {
      showToast(`Failed to revert overlay: ${error.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  const generateUTMContent = async () => {
    setLoading(true);
    try {
      const content = await apiCall('utm-content', {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          utmTerm,
          productContext
        })
      });
      
      setUtmContent(content);
      showToast('UTM content generated successfully');
    } catch (error) {
      showToast(`Failed to generate UTM content: ${error.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  const saveIntentBlock = async () => {
    if (!editingIntent || !promoteEnabled) {
      showToast('PROMOTE flag must be enabled to save intent blocks', true);
      return;
    }

    setLoading(true);
    try {
      await apiCall('intent-blocks', {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          intentKey: editingIntent.intent_key,
          blockData: editingIntent,
          promote: true
        })
      });
      
      showToast('Intent block saved successfully');
      setIntentModalActive(false);
      setEditingIntent(null);
      loadIntentBlocks();
    } catch (error) {
      showToast(`Failed to save intent block: ${error.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  const createPromoDraft = async () => {
    if (!promoteEnabled) {
      showToast('PROMOTE flag must be enabled to create promo drafts', true);
      return;
    }

    setLoading(true);
    try {
      const draft = await apiCall('promo-draft', {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          promoConfig,
          promote: true
        })
      });
      
      showToast(`Promo draft created: ${draft.draft.title}`);
      setPromoModalActive(false);
      loadPromoDrafts();
    } catch (error) {
      showToast(`Failed to create promo draft: ${error.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    {
      id: 'overlays',
      content: 'Catalog Overlays',
      accessibilityLabel: 'Metafield overlay management',
      panelID: 'overlays-panel',
    },
    {
      id: 'intent-blocks',
      content: 'Intent Blocks',
      accessibilityLabel: 'Intent block management',
      panelID: 'intent-blocks-panel',
    },
    {
      id: 'utm-content',
      content: 'UTM Content',
      accessibilityLabel: 'UTM-driven content generation',
      panelID: 'utm-content-panel',
    },
    {
      id: 'promo-drafts',
      content: 'Promo Drafts',
      accessibilityLabel: 'AI-generated promo page drafts',
      panelID: 'promo-drafts-panel',
    },
  ];

  const renderOverlaysTab = () => (
    <Layout>
      <Layout.Section>
        {!promoteEnabled && (
          <Banner status="warning" title="PROMOTE flag disabled">
            <p>Overlay mutations are disabled. Enable PROMOTE flag to apply changes.</p>
          </Banner>
        )}
        
        <Card>
          <Card.Section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="headingMd">Metafield Overlays</Text>
              <Button 
                primary 
                onClick={() => setOverlayModalActive(true)}
                disabled={!promoteEnabled}
              >
                Apply New Overlay
              </Button>
            </div>
          </Card.Section>
          
          {activeOverlay && (
            <Card.Section>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Text variant="headingSm">Active Overlay</Text>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <TextContainer>
                    <Text>Version: {activeOverlay.version}</Text>
                    <Text color="subdued">Applied: {new Date(activeOverlay.appliedAt).toLocaleString()}</Text>
                  </TextContainer>
                  <Button 
                    destructive 
                    onClick={() => revertOverlay()}
                    disabled={!promoteEnabled}
                    loading={loading}
                  >
                    Revert to Previous
                  </Button>
                </div>
              </div>
            </Card.Section>
          )}
          
          <Card.Section>
            <DataTable
              columnContentTypes={['text', 'text', 'text', 'text', 'text']}
              headings={['Timestamp', 'Action', 'Selector', 'Channel', 'Actions']}
              rows={overlayHistory.map(entry => [
                new Date(entry.timestamp).toLocaleString(),
                <Badge status={entry.action === 'APPLY' ? 'success' : 'info'}>
                  {entry.action}
                </Badge>,
                entry.selector || '-',
                entry.channel || 'web',
                <ButtonGroup>
                  <Button 
                    size="slim" 
                    onClick={() => revertOverlay(entry.timestamp)}
                    disabled={!promoteEnabled}
                  >
                    Revert to This
                  </Button>
                </ButtonGroup>
              ])}
            />
          </Card.Section>
        </Card>
      </Layout.Section>
    </Layout>
  );

  const renderIntentBlocksTab = () => (
    <Layout>
      <Layout.Section>
        <Card>
          <Card.Section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="headingMd">Intent Blocks</Text>
              <Button 
                primary 
                onClick={() => {
                  setEditingIntent({
                    intent_key: '',
                    hero_headline: '',
                    benefit_bullets: [],
                    proof_snippet: '',
                    cta_text: '',
                    url_target: '',
                    updated_at: '',
                    updated_by: ''
                  });
                  setIntentModalActive(true);
                }}
                disabled={!promoteEnabled}
              >
                Create Intent Block
              </Button>
            </div>
          </Card.Section>
          
          <Card.Section>
            {Object.keys(intentBlocks).length === 0 ? (
              <EmptyState
                heading="No intent blocks yet"
                action={{
                  content: 'Create your first intent block',
                  onAction: () => {
                    setEditingIntent({
                      intent_key: '',
                      hero_headline: '',
                      benefit_bullets: [],
                      proof_snippet: '',
                      cta_text: '',
                      url_target: '',
                      updated_at: '',
                      updated_by: ''
                    });
                    setIntentModalActive(true);
                  }
                }}
                image="https://cdn.shopify.com/s/files/1/0005/4175/0643/files/empty-state.svg"
              >
                <p>Intent blocks help you create targeted content for different user intents and UTM campaigns.</p>
              </EmptyState>
            ) : (
              <ResourceList
                resourceName={{ singular: 'intent block', plural: 'intent blocks' }}
                items={Object.entries(intentBlocks).map(([key, block]) => ({ id: key, ...block }))}
                renderItem={(item) => {
                  const { id, hero_headline, proof_snippet, updated_at } = item;
                  return (
                    <ResourceItem
                      id={id}
                      media={<Avatar customer={false} size="medium" initials={id.substring(0, 2).toUpperCase()} />}
                      accessibilityLabel={`View details for ${id}`}
                    >
                      <div distribution="fillEvenly">
                        <div vertical spacing="extraTight">
                          <Text variant="bodyMd" fontWeight="semibold">{id}</Text>
                          <Text variant="bodySm">{hero_headline}</Text>
                          <Text variant="bodySm" color="subdued">{proof_snippet}</Text>
                          <Text variant="bodySm" color="subdued">
                            Updated: {updated_at ? new Date(updated_at).toLocaleString() : 'Never'}
                          </Text>
                        </div>
                        <ButtonGroup>
                          <Button
                            icon={EditIcon}
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
                      </div>
                    </ResourceItem>
                  );
                }}
              />
            )}
          </Card.Section>
        </Card>
      </Layout.Section>
    </Layout>
  );

  const renderUTMContentTab = () => (
    <Layout>
      <Layout.Section>
        <Card>
          <Card.Section>
            <Text variant="headingMd">UTM-Driven Content Generator</Text>
            <TextContainer>
              <p>Generate dynamic content variations based on UTM parameters for improved conversion rates.</p>
            </TextContainer>
          </Card.Section>
          
          <Card.Section>
            <FormLayout>
              <Select
                label="UTM Term"
                options={[
                  { label: 'High Intent', value: 'high-intent' },
                  { label: 'Research Phase', value: 'research' },
                  { label: 'Comparison Shopping', value: 'comparison' },
                ]}
                value={utmTerm}
                onChange={(value) => setUtmTerm(value)}
              />
              
              <TextField
                label="Product Category"
                value={productContext.category || ''}
                onChange={(value) => setProductContext({ ...productContext, category: value })}
                placeholder="e.g., shoes, electronics, furniture"
              />
              
              <TextField
                label="Discount Percentage"
                value={productContext.discount || ''}
                onChange={(value) => setProductContext({ ...productContext, discount: value })}
                placeholder="e.g., 20"
                suffix="%"
              />
              
              <Button primary onClick={generateUTMContent} loading={loading}>
                Generate Content Variations
              </Button>
            </FormLayout>
          </Card.Section>
          
          {utmContent && (
            <Card.Section>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Text variant="headingSm">Generated Content</Text>
                <Text color="subdued">Strategy: {utmContent.strategy.urgency} urgency, {utmContent.strategy.social_proof} social proof</Text>
                
                {utmContent.variations.map((variation, index) => (
                  <Card key={index} sectioned>
                    <div vertical spacing="tight">
                      <Text variant="headingSm">Variation {index + 1}</Text>
                      <Text><strong>Headline:</strong> {variation.hero_headline}</Text>
                      <Text><strong>Benefits:</strong> {variation.benefit_bullets.join(' • ')}</Text>
                      <Text><strong>Social Proof:</strong> {variation.proof_snippet}</Text>
                      <Text><strong>CTA:</strong> {variation.cta_text}</Text>
                      <Text><strong>URL:</strong> {variation.url_target}</Text>
                    </div>
                  </Card>
                ))}
              </div>
            </Card.Section>
          )}
        </Card>
      </Layout.Section>
    </Layout>
  );

  const renderPromoDraftsTab = () => (
    <Layout>
      <Layout.Section>
        <Card>
          <Card.Section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="headingMd">AI Promo Page Drafts</Text>
              <Button 
                primary 
                onClick={() => setPromoModalActive(true)}
                disabled={!promoteEnabled}
              >
                Create Promo Draft
              </Button>
            </div>
            <TextContainer>
              <p>AI-generated promotional page drafts. All pages remain as drafts and require manual review before publishing.</p>
            </TextContainer>
          </Card.Section>
          
          <Card.Section>
            {promoDrafts.length === 0 ? (
              <EmptyState
                heading="No promo drafts yet"
                action={{
                  content: 'Create your first promo draft',
                  onAction: () => setPromoModalActive(true)
                }}
                image="https://cdn.shopify.com/s/files/1/0005/4175/0643/files/empty-state.svg"
              >
                <p>Generate AI-powered promotional page drafts for your campaigns and offers.</p>
              </EmptyState>
            ) : (
              <ResourceList
                resourceName={{ singular: 'promo draft', plural: 'promo drafts' }}
                items={promoDrafts}
                renderItem={(draft) => (
                  <ResourceItem
                    id={draft.id}
                    media={<Avatar customer={false} size="medium" initials="PD" />}
                    accessibilityLabel={`View details for ${draft.title}`}
                  >
                    <div distribution="fillEvenly">
                      <div vertical spacing="extraTight">
                        <Text variant="bodyMd" fontWeight="semibold">{draft.title}</Text>
                        <Text variant="bodySm">{draft.meta_description}</Text>
                        <Text variant="bodySm" color="subdued">Handle: /{draft.handle}</Text>
                        <Text variant="bodySm" color="subdued">
                          Created: {new Date(draft.created_at).toLocaleString()}
                        </Text>
                        <div spacing="extraTight">
                          <Badge status="info">DRAFT</Badge>
                          {draft.tags.map(tag => (
                            <Badge key={tag}>{tag}</Badge>
                          ))}
                        </div>
                      </div>
                      <ButtonGroup>
                        <Button size="slim">Preview</Button>
                        <Button size="slim" primary>Review & Publish</Button>
                      </ButtonGroup>
                    </div>
                  </ResourceItem>
                )}
              />
            )}
          </Card.Section>
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
              <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                <Card.Section>
                  {selectedTab === 0 && renderOverlaysTab()}
                  {selectedTab === 1 && renderIntentBlocksTab()}
                  {selectedTab === 2 && renderUTMContentTab()}
                  {selectedTab === 3 && renderPromoDraftsTab()}
                </Card.Section>
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
            content: 'Apply Overlay',
            onAction: applyOverlay,
            loading,
            disabled: !promoteEnabled
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setOverlayModalActive(false),
            },
          ]}
        >
          <Modal.Section>
            <FormLayout>
              <TextField
                label="CSS Selector"
                value={overlayConfig.selector}
                onChange={(value) => setOverlayConfig({ ...overlayConfig, selector: value })}
                placeholder="e.g., .product-title, #price-display"
                helpText="Target element for the overlay"
              />
              
              <Select
                label="Channel"
                options={[
                  { label: 'Web', value: 'web' },
                  { label: 'Mobile App', value: 'mobile' },
                  { label: 'Email', value: 'email' },
                ]}
                value={overlayConfig.channel}
                onChange={(value) => setOverlayConfig({ ...overlayConfig, channel: value })}
              />
              
              <TextField
                label="Description"
                value={overlayConfig.description || ''}
                onChange={(value) => setOverlayConfig({ ...overlayConfig, description: value })}
                placeholder="Brief description of this overlay"
                multiline={2}
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
          title={editingIntent?.intent_key ? 'Edit Intent Block' : 'Create Intent Block'}
          primaryAction={{
            content: 'Save Intent Block',
            onAction: saveIntentBlock,
            loading,
            disabled: !promoteEnabled
          }}
          secondaryActions={[
            {
              content: 'Cancel',
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
                  onChange={(value) => setEditingIntent({ ...editingIntent, intent_key: value })}
                  placeholder="e.g., high-intent-sale, brand-awareness"
                />
                
                <TextField
                  label="Hero Headline"
                  value={editingIntent.hero_headline}
                  onChange={(value) => setEditingIntent({ ...editingIntent, hero_headline: value })}
                  placeholder="Compelling headline for this intent"
                />
                
                <TextField
                  label="Benefit Bullets (one per line)"
                  value={editingIntent.benefit_bullets.join('\n')}
                  onChange={(value) => setEditingIntent({ 
                    ...editingIntent, 
                    benefit_bullets: value.split('\n').filter(Boolean) 
                  })}
                  multiline={4}
                  placeholder="Fast Shipping&#10;Money-Back Guarantee&#10;Expert Support"
                />
                
                <TextField
                  label="Social Proof Snippet"
                  value={editingIntent.proof_snippet}
                  onChange={(value) => setEditingIntent({ ...editingIntent, proof_snippet: value })}
                  placeholder="Join 10,000+ satisfied customers"
                />
                
                <TextField
                  label="CTA Text"
                  value={editingIntent.cta_text}
                  onChange={(value) => setEditingIntent({ ...editingIntent, cta_text: value })}
                  placeholder="Shop Now & Save"
                />
                
                <TextField
                  label="Target URL"
                  value={editingIntent.url_target}
                  onChange={(value) => setEditingIntent({ ...editingIntent, url_target: value })}
                  placeholder="/collections/sale"
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
            content: 'Generate Draft',
            onAction: createPromoDraft,
            loading,
            disabled: !promoteEnabled
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setPromoModalActive(false),
            },
          ]}
        >
          <Modal.Section>
            <FormLayout>
              <TextField
                label="Campaign Name"
                value={promoConfig.campaign_name}
                onChange={(value) => setPromoConfig({ ...promoConfig, campaign_name: value })}
                placeholder="Summer Sale 2024"
              />
              
              <TextField
                label="Offer Details"
                value={promoConfig.offer_details}
                onChange={(value) => setPromoConfig({ ...promoConfig, offer_details: value })}
                placeholder="25% off all summer items + free shipping"
                multiline={2}
              />
              
              <TextField
                label="Target Audience"
                value={promoConfig.target_audience}
                onChange={(value) => setPromoConfig({ ...promoConfig, target_audience: value })}
                placeholder="Fashion-conscious millennials"
              />
              
              <Select
                label="Industry"
                options={[
                  { label: 'E-commerce', value: 'ecommerce' },
                  { label: 'SaaS', value: 'saas' },
                  { label: 'Services', value: 'services' },
                ]}
                value={promoConfig.industry}
                onChange={(value) => setPromoConfig({ ...promoConfig, industry: value })}
              />
              
              <Select
                label="Campaign Type"
                options={[
                  { label: 'Sale/Discount', value: 'sale' },
                  { label: 'Product Launch', value: 'launch' },
                  { label: 'Seasonal', value: 'seasonal' },
                  { label: 'Flash Sale', value: 'flash' },
                ]}
                value={promoConfig.campaign_type}
                onChange={(value) => setPromoConfig({ ...promoConfig, campaign_type: value })}
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