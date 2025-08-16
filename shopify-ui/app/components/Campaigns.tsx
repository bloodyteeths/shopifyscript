import { useState, useEffect, useCallback } from 'react';
import {
  Page,
  Card,
  Layout,
  DataTable,
  Button,
  Stack,
  Text,
  Badge,
  Modal,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Banner,
  Spinner,
  EmptyState,
  Filters,
  ChoiceList,
  RangeSlider,
  Tabs,
  ProgressBar,
  TextStyle,
  ButtonGroup,
  Tooltip,
  ResourceList,
  ResourceItem,
  Avatar,
} from '@shopify/polaris';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import type { Campaign } from '../services/api.server';

interface CampaignsProps {
  initialCampaigns?: Campaign[];
}

interface CampaignFormData {
  name: string;
  type: 'search' | 'display' | 'shopping' | 'video';
  budget: number;
  status: 'active' | 'paused';
  targeting: {
    keywords: string[];
    locations: string[];
    demographics: {
      ageMin: number;
      ageMax: number;
      gender: 'all' | 'male' | 'female';
    };
    audiences: string[];
  };
}

interface FilterState {
  status: string[];
  type: string[];
  budgetRange: [number, number];
  performanceMetric: string;
}

const CampaignRow: React.FC<{
  campaign: Campaign;
  onEdit: (campaign: Campaign) => void;
  onToggleStatus: (id: string, status: 'active' | 'paused') => void;
  onDelete: (id: string) => void;
}> = ({ campaign, onEdit, onToggleStatus, onDelete }) => {
  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: { color: 'success' as const, text: 'Active' },
      paused: { color: 'warning' as const, text: 'Paused' },
      ended: { color: 'subdued' as const, text: 'Ended' },
    };
    
    const config = statusMap[status as keyof typeof statusMap] || statusMap.ended;
    return <Badge status={config.color}>{config.text}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeMap = {
      search: { color: 'info' as const, text: 'Search' },
      display: { color: 'attention' as const, text: 'Display' },
      shopping: { color: 'success' as const, text: 'Shopping' },
      video: { color: 'warning' as const, text: 'Video' },
    };
    
    const config = typeMap[type as keyof typeof typeMap];
    return config ? <Badge status={config.color}>{config.text}</Badge> : <Badge>{type}</Badge>;
  };

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  return [
    <Stack vertical spacing="extraTight">
      <Text variant="bodyMd" fontWeight="semibold">{campaign.name}</Text>
      <Stack spacing="tight">
        {getStatusBadge(campaign.status)}
        {getTypeBadge(campaign.type)}
      </Stack>
    </Stack>,
    
    <Stack vertical spacing="extraTight">
      <Text variant="bodyMd">{formatCurrency(campaign.budget)}</Text>
      <Text variant="bodySm" color="subdued">
        Spent: {formatCurrency(campaign.spent)}
      </Text>
      <ProgressBar 
        progress={(campaign.spent / campaign.budget) * 100} 
        size="small"
      />
    </Stack>,
    
    <Stack vertical spacing="extraTight">
      <Text variant="bodyMd">{campaign.impressions.toLocaleString()}</Text>
      <Text variant="bodySm" color="subdued">Impressions</Text>
    </Stack>,
    
    <Stack vertical spacing="extraTight">
      <Text variant="bodyMd">{campaign.clicks.toLocaleString()}</Text>
      <Text variant="bodySm" color="subdued">
        CTR: {formatPercent(campaign.ctr)}
      </Text>
    </Stack>,
    
    <Stack vertical spacing="extraTight">
      <Text variant="bodyMd">{campaign.conversions}</Text>
      <Text variant="bodySm" color="subdued">
        Rate: {formatPercent(campaign.conversionRate)}
      </Text>
    </Stack>,
    
    <Stack vertical spacing="extraTight">
      <Text variant="bodyMd">{formatCurrency(campaign.cpc)}</Text>
      <Text variant="bodySm" color="subdued">CPC</Text>
    </Stack>,
    
    <Stack vertical spacing="extraTight">
      <Text variant="bodyMd" color={campaign.roas >= 3 ? 'success' : 'critical'}>
        {campaign.roas.toFixed(2)}x
      </Text>
      <Text variant="bodySm" color="subdued">ROAS</Text>
    </Stack>,
    
    <ButtonGroup>
      <Button size="slim" onClick={() => onEdit(campaign)}>
        Edit
      </Button>
      <Button 
        size="slim" 
        onClick={() => onToggleStatus(campaign.id, campaign.status === 'active' ? 'paused' : 'active')}
      >
        {campaign.status === 'active' ? 'Pause' : 'Activate'}
      </Button>
      <Button size="slim" destructive onClick={() => onDelete(campaign.id)}>
        Delete
      </Button>
    </ButtonGroup>
  ];
};

const CampaignForm: React.FC<{
  campaign?: Campaign;
  onSubmit: (data: CampaignFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}> = ({ campaign, onSubmit, onCancel, loading = false }) => {
  const [formData, setFormData] = useState<CampaignFormData>({
    name: campaign?.name || '',
    type: campaign?.type || 'search',
    budget: campaign?.budget || 1000,
    status: campaign?.status === 'ended' ? 'paused' : (campaign?.status || 'active'),
    targeting: {
      keywords: campaign?.targeting?.keywords || [],
      locations: campaign?.targeting?.locations || [],
      demographics: {
        ageMin: campaign?.targeting?.demographics?.ageMin || 18,
        ageMax: campaign?.targeting?.demographics?.ageMax || 65,
        gender: campaign?.targeting?.demographics?.gender || 'all',
      },
      audiences: campaign?.targeting?.audiences || [],
    },
  });

  const [keywordInput, setKeywordInput] = useState('');
  const [locationInput, setLocationInput] = useState('');

  const handleSubmit = async () => {
    await onSubmit(formData);
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.targeting.keywords.includes(keywordInput.trim())) {
      setFormData(prev => ({
        ...prev,
        targeting: {
          ...prev.targeting,
          keywords: [...prev.targeting.keywords, keywordInput.trim()],
        },
      }));
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      targeting: {
        ...prev.targeting,
        keywords: prev.targeting.keywords.filter(k => k !== keyword),
      },
    }));
  };

  const addLocation = () => {
    if (locationInput.trim() && !formData.targeting.locations.includes(locationInput.trim())) {
      setFormData(prev => ({
        ...prev,
        targeting: {
          ...prev.targeting,
          locations: [...prev.targeting.locations, locationInput.trim()],
        },
      }));
      setLocationInput('');
    }
  };

  const removeLocation = (location: string) => {
    setFormData(prev => ({
      ...prev,
      targeting: {
        ...prev.targeting,
        locations: prev.targeting.locations.filter(l => l !== location),
      },
    }));
  };

  const campaignTypeOptions = [
    { label: 'Search', value: 'search' },
    { label: 'Display', value: 'display' },
    { label: 'Shopping', value: 'shopping' },
    { label: 'Video', value: 'video' },
  ];

  const statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Paused', value: 'paused' },
  ];

  const genderOptions = [
    { label: 'All', value: 'all' },
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
  ];

  return (
    <FormLayout>
      <TextField
        label="Campaign Name"
        value={formData.name}
        onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
        placeholder="Enter campaign name"
        autoComplete="off"
      />

      <Select
        label="Campaign Type"
        options={campaignTypeOptions}
        value={formData.type}
        onChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}
      />

      <TextField
        label="Budget"
        type="number"
        value={formData.budget.toString()}
        onChange={(value) => setFormData(prev => ({ ...prev, budget: parseFloat(value) || 0 }))}
        prefix="$"
        placeholder="1000"
      />

      <Select
        label="Status"
        options={statusOptions}
        value={formData.status}
        onChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
      />

      <Card title="Targeting">
        <Card.Section>
          <Stack vertical>
            <Text variant="headingMd">Keywords</Text>
            <Stack>
              <TextField
                value={keywordInput}
                onChange={setKeywordInput}
                placeholder="Add keyword"
                connectedRight={
                  <Button onClick={addKeyword} disabled={!keywordInput.trim()}>
                    Add
                  </Button>
                }
                onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
              />
            </Stack>
            
            {formData.targeting.keywords.length > 0 && (
              <Stack spacing="tight">
                {formData.targeting.keywords.map((keyword) => (
                  <Badge key={keyword} status="info">
                    {keyword}
                    <Button 
                      plain 
                      size="slim" 
                      onClick={() => removeKeyword(keyword)}
                      accessibilityLabel={`Remove ${keyword}`}
                    >
                      ×
                    </Button>
                  </Badge>
                ))}
              </Stack>
            )}
          </Stack>
        </Card.Section>

        <Card.Section>
          <Stack vertical>
            <Text variant="headingMd">Locations</Text>
            <Stack>
              <TextField
                value={locationInput}
                onChange={setLocationInput}
                placeholder="Add location"
                connectedRight={
                  <Button onClick={addLocation} disabled={!locationInput.trim()}>
                    Add
                  </Button>
                }
                onKeyPress={(e) => e.key === 'Enter' && addLocation()}
              />
            </Stack>
            
            {formData.targeting.locations.length > 0 && (
              <Stack spacing="tight">
                {formData.targeting.locations.map((location) => (
                  <Badge key={location} status="success">
                    {location}
                    <Button 
                      plain 
                      size="slim" 
                      onClick={() => removeLocation(location)}
                      accessibilityLabel={`Remove ${location}`}
                    >
                      ×
                    </Button>
                  </Badge>
                ))}
              </Stack>
            )}
          </Stack>
        </Card.Section>

        <Card.Section>
          <Stack vertical>
            <Text variant="headingMd">Demographics</Text>
            
            <RangeSlider
              label="Age Range"
              value={[formData.targeting.demographics.ageMin, formData.targeting.demographics.ageMax]}
              min={18}
              max={65}
              step={1}
              onChange={([min, max]) => 
                setFormData(prev => ({
                  ...prev,
                  targeting: {
                    ...prev.targeting,
                    demographics: {
                      ...prev.targeting.demographics,
                      ageMin: min,
                      ageMax: max,
                    },
                  },
                }))
              }
              output
            />

            <Select
              label="Gender"
              options={genderOptions}
              value={formData.targeting.demographics.gender}
              onChange={(value) => 
                setFormData(prev => ({
                  ...prev,
                  targeting: {
                    ...prev.targeting,
                    demographics: {
                      ...prev.targeting.demographics,
                      gender: value as any,
                    },
                  },
                }))
              }
            />
          </Stack>
        </Card.Section>
      </Card>

      <Stack distribution="trailing">
        <ButtonGroup>
          <Button onClick={onCancel}>Cancel</Button>
          <Button primary onClick={handleSubmit} loading={loading}>
            {campaign ? 'Update Campaign' : 'Create Campaign'}
          </Button>
        </ButtonGroup>
      </Stack>
    </FormLayout>
  );
};

const CampaignPerformanceChart: React.FC<{
  campaigns: Campaign[];
  metric: 'impressions' | 'clicks' | 'conversions' | 'spend';
}> = ({ campaigns, metric }) => {
  const data = campaigns.map(campaign => ({
    name: campaign.name.length > 15 ? `${campaign.name.slice(0, 15)}...` : campaign.name,
    value: campaign[metric === 'spend' ? 'spent' : metric],
  }));

  const getMetricLabel = () => {
    switch (metric) {
      case 'impressions': return 'Impressions';
      case 'clicks': return 'Clicks';
      case 'conversions': return 'Conversions';
      case 'spend': return 'Spend ($)';
      default: return 'Value';
    }
  };

  return (
    <Card>
      <Card.Section>
        <Stack vertical>
          <Text variant="headingMd">Campaign Performance - {getMetricLabel()}</Text>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip 
                  formatter={(value: any) => [
                    metric === 'spend' ? `$${value.toLocaleString()}` : value.toLocaleString(), 
                    getMetricLabel()
                  ]}
                />
                <Bar dataKey="value" fill="#5C6AC4" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Stack>
      </Card.Section>
    </Card>
  );
};

export const Campaigns: React.FC<CampaignsProps> = ({ initialCampaigns = [] }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [loading, setLoading] = useState(!initialCampaigns.length);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    type: [],
    budgetRange: [0, 10000],
    performanceMetric: 'roas',
  });
  const [queryValue, setQueryValue] = useState('');

  // Chart metric selection
  const [chartMetric, setChartMetric] = useState<'impressions' | 'clicks' | 'conversions' | 'spend'>('impressions');

  // Load campaigns
  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/campaigns');
      const data = await response.json();
      
      if (data.success) {
        setCampaigns(data.data);
      } else {
        setError(data.error || 'Failed to load campaigns');
      }
    } catch (err) {
      setError('Network error while loading campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!initialCampaigns.length) {
      loadCampaigns();
    }
  }, []);

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(campaign => {
    // Text search
    if (queryValue && !campaign.name.toLowerCase().includes(queryValue.toLowerCase())) {
      return false;
    }
    
    // Status filter
    if (filters.status.length > 0 && !filters.status.includes(campaign.status)) {
      return false;
    }
    
    // Type filter
    if (filters.type.length > 0 && !filters.type.includes(campaign.type)) {
      return false;
    }
    
    // Budget range filter
    if (campaign.budget < filters.budgetRange[0] || campaign.budget > filters.budgetRange[1]) {
      return false;
    }
    
    return true;
  });

  // Handle campaign actions
  const handleCreateCampaign = async (data: CampaignFormData) => {
    try {
      setFormLoading(true);
      
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCampaigns(prev => [...prev, result.data]);
        setShowCreateModal(false);
      } else {
        setError(result.error || 'Failed to create campaign');
      }
    } catch (err) {
      setError('Network error while creating campaign');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateCampaign = async (data: CampaignFormData) => {
    if (!editingCampaign) return;
    
    try {
      setFormLoading(true);
      
      const response = await fetch(`/api/campaigns/${editingCampaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCampaigns(prev => 
          prev.map(c => c.id === editingCampaign.id ? result.data : c)
        );
        setEditingCampaign(null);
      } else {
        setError(result.error || 'Failed to update campaign');
      }
    } catch (err) {
      setError('Network error while updating campaign');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, status: 'active' | 'paused') => {
    try {
      const response = await fetch(`/api/campaigns/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCampaigns(prev => 
          prev.map(c => c.id === id ? { ...c, status } : c)
        );
      } else {
        setError(result.error || 'Failed to update campaign status');
      }
    } catch (err) {
      setError('Network error while updating campaign status');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    
    try {
      const response = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      const result = await response.json();
      
      if (result.success) {
        setCampaigns(prev => prev.filter(c => c.id !== id));
      } else {
        setError(result.error || 'Failed to delete campaign');
      }
    } catch (err) {
      setError('Network error while deleting campaign');
    }
  };

  // Table headers
  const tableHeaders = [
    'Campaign',
    'Budget & Spend',
    'Impressions',
    'Clicks',
    'Conversions',
    'CPC',
    'ROAS',
    'Actions',
  ];

  // Filter options
  const statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Paused', value: 'paused' },
    { label: 'Ended', value: 'ended' },
  ];

  const typeOptions = [
    { label: 'Search', value: 'search' },
    { label: 'Display', value: 'display' },
    { label: 'Shopping', value: 'shopping' },
    { label: 'Video', value: 'video' },
  ];

  const chartMetricOptions = [
    { label: 'Impressions', value: 'impressions' },
    { label: 'Clicks', value: 'clicks' },
    { label: 'Conversions', value: 'conversions' },
    { label: 'Spend', value: 'spend' },
  ];

  // Filter appliedFilters for display
  const appliedFilters: any[] = [];
  if (filters.status.length > 0) {
    appliedFilters.push({
      key: 'status',
      label: `Status: ${filters.status.join(', ')}`,
      onRemove: () => setFilters(prev => ({ ...prev, status: [] })),
    });
  }
  if (filters.type.length > 0) {
    appliedFilters.push({
      key: 'type',
      label: `Type: ${filters.type.join(', ')}`,
      onRemove: () => setFilters(prev => ({ ...prev, type: [] })),
    });
  }

  const tabs = [
    { id: 'campaigns', content: 'All Campaigns', accessibilityLabel: 'All campaigns' },
    { id: 'performance', content: 'Performance', accessibilityLabel: 'Campaign performance' },
  ];

  if (error) {
    return (
      <Page title="Campaigns">
        <Banner status="critical" title="Error loading campaigns">
          <p>{error}</p>
          <Button onClick={loadCampaigns}>Retry</Button>
        </Banner>
      </Page>
    );
  }

  return (
    <Page
      title="Campaigns"
      primaryAction={{
        content: 'Create Campaign',
        onAction: () => setShowCreateModal(true),
      }}
      secondaryActions={[
        {
          content: 'Refresh',
          onAction: loadCampaigns,
        },
      ]}
    >
      <Layout>
        <Layout.Section>
          <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
            {selectedTab === 0 && (
              <Card>
                <div style={{ padding: '16px' }}>
                  <Filters
                    queryValue={queryValue}
                    queryPlaceholder="Search campaigns..."
                    onQueryChange={setQueryValue}
                    onQueryClear={() => setQueryValue('')}
                    filters={[
                      {
                        key: 'status',
                        label: 'Status',
                        filter: (
                          <ChoiceList
                            title="Status"
                            titleHidden
                            choices={statusOptions}
                            selected={filters.status}
                            onChange={(selected) => 
                              setFilters(prev => ({ ...prev, status: selected }))
                            }
                            allowMultiple
                          />
                        ),
                        shortcut: true,
                      },
                      {
                        key: 'type',
                        label: 'Type',
                        filter: (
                          <ChoiceList
                            title="Type"
                            titleHidden
                            choices={typeOptions}
                            selected={filters.type}
                            onChange={(selected) => 
                              setFilters(prev => ({ ...prev, type: selected }))
                            }
                            allowMultiple
                          />
                        ),
                        shortcut: true,
                      },
                    ]}
                    appliedFilters={appliedFilters}
                    onClearAll={() => 
                      setFilters({
                        status: [],
                        type: [],
                        budgetRange: [0, 10000],
                        performanceMetric: 'roas',
                      })
                    }
                  />
                </div>

                {loading ? (
                  <Card.Section>
                    <Stack alignment="center">
                      <Spinner size="large" />
                      <Text>Loading campaigns...</Text>
                    </Stack>
                  </Card.Section>
                ) : filteredCampaigns.length === 0 ? (
                  <Card.Section>
                    <EmptyState
                      heading="No campaigns found"
                      description="Create your first campaign to get started with advertising"
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                      primaryAction={{
                        content: 'Create Campaign',
                        onAction: () => setShowCreateModal(true),
                      }}
                    />
                  </Card.Section>
                ) : (
                  <DataTable
                    columnContentTypes={[
                      'text',
                      'text',
                      'numeric',
                      'numeric',
                      'numeric',
                      'numeric',
                      'numeric',
                      'text',
                    ]}
                    headings={tableHeaders}
                    rows={filteredCampaigns.map(campaign => 
                      CampaignRow({
                        campaign,
                        onEdit: setEditingCampaign,
                        onToggleStatus: handleToggleStatus,
                        onDelete: handleDeleteCampaign,
                      })
                    )}
                    sortable={[false, true, true, true, true, true, true, false]}
                  />
                )}
              </Card>
            )}

            {selectedTab === 1 && (
              <Layout>
                <Layout.Section>
                  <Card>
                    <Card.Section>
                      <Stack distribution="trailing">
                        <Select
                          label="Chart Metric"
                          options={chartMetricOptions}
                          value={chartMetric}
                          onChange={(value) => setChartMetric(value as any)}
                        />
                      </Stack>
                    </Card.Section>
                  </Card>
                </Layout.Section>
                
                <Layout.Section>
                  <CampaignPerformanceChart
                    campaigns={filteredCampaigns}
                    metric={chartMetric}
                  />
                </Layout.Section>
              </Layout>
            )}
          </Tabs>
        </Layout.Section>
      </Layout>

      {/* Create Campaign Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Campaign"
        large
      >
        <Modal.Section>
          <CampaignForm
            onSubmit={handleCreateCampaign}
            onCancel={() => setShowCreateModal(false)}
            loading={formLoading}
          />
        </Modal.Section>
      </Modal>

      {/* Edit Campaign Modal */}
      <Modal
        open={!!editingCampaign}
        onClose={() => setEditingCampaign(null)}
        title="Edit Campaign"
        large
      >
        <Modal.Section>
          {editingCampaign && (
            <CampaignForm
              campaign={editingCampaign}
              onSubmit={handleUpdateCampaign}
              onCancel={() => setEditingCampaign(null)}
              loading={formLoading}
            />
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
};

export default Campaigns;