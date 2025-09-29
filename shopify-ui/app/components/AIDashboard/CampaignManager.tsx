import React, { useState, useEffect } from "react";
import {
  Card,
  DataTable,
  Text,
  Badge,
  Button,
  BlockStack,
  InlineStack,
  Select,
  TextField,
  Icon,
  Popover,
  ActionList,
  Box,
  Checkbox,
  Banner,
  ProgressBar,
} from "@shopify/polaris";
import { authenticatedFetch } from "../../utils/ai-client";

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'pending';
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  roas: number;
  aiOptimized: boolean;
  lastOptimized: string;
}

interface CampaignManagerProps {
  shopName: string;
  hasFeatureAccess?: boolean;
}

export function CampaignManager({ shopName, hasFeatureAccess = false }: CampaignManagerProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [sortValue, setSortValue] = useState('performance');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkActionsActive, setBulkActionsActive] = useState(false);

  // Fetch campaigns from API
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await authenticatedFetch("/ai/campaigns", "GET", undefined, shopName);
        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.campaigns) {
            setCampaigns(data.campaigns);
          } else {
            setCampaigns([]);
          }
        } else {
          setError("Failed to load campaigns");
          setCampaigns([]);
        }
      } catch (err) {
        console.error("Failed to fetch campaigns:", err);
        setError("Failed to load campaigns");
        setCampaigns([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [shopName]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getStatusBadge = (status: string) => {
    const toneMap: Record<string, any> = {
      'active': 'success',
      'paused': 'warning',
      'pending': 'info',
    };
    return (
      <Badge tone={toneMap[status] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleCampaignSelect = (campaignId: string) => {
    setSelectedCampaigns(prev =>
      prev.includes(campaignId)
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const handleBulkOptimize = () => {
    console.log('Optimizing campaigns:', selectedCampaigns);
    // Trigger AI optimization
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    if (filterStatus === 'all') return true;
    return campaign.status === filterStatus;
  });

  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    switch (sortValue) {
      case 'performance':
        return b.roas - a.roas;
      case 'spend':
        return b.spent - a.spent;
      case 'conversions':
        return b.conversions - a.conversions;
      default:
        return 0;
    }
  });

  const rows = sortedCampaigns.map(campaign => [
    <Checkbox
      label=""
      checked={selectedCampaigns.includes(campaign.id)}
      onChange={() => handleCampaignSelect(campaign.id)}
    />,
    <BlockStack gap="100">
      <Text variant="bodyMd" fontWeight="bold">{campaign.name}</Text>
      {campaign.aiOptimized && (
        <InlineStack gap="100">
          <Badge tone="success">AI Optimized</Badge>
          <Text variant="bodySm" tone="subdued">{formatTimeAgo(campaign.lastOptimized)}</Text>
        </InlineStack>
      )}
    </BlockStack>,
    getStatusBadge(campaign.status),
    <BlockStack gap="100">
      <Text variant="bodyMd">{formatCurrency(campaign.spent)}</Text>
      <Text variant="bodySm" tone="subdued">of {formatCurrency(campaign.budget)}</Text>
      <ProgressBar
        progress={(campaign.spent / campaign.budget) * 100}
        size="small"
        tone={campaign.spent / campaign.budget > 0.9 ? 'warning' : 'primary'}
      />
    </BlockStack>,
    <BlockStack gap="100">
      <Text variant="bodyMd">{formatNumber(campaign.impressions)}</Text>
      <Text variant="bodySm" tone="subdued">{formatNumber(campaign.clicks)} clicks</Text>
    </BlockStack>,
    <BlockStack gap="100">
      <Text variant="bodyMd" fontWeight="bold" tone="success">{campaign.conversions}</Text>
      <Badge tone={campaign.ctr > 4 ? 'success' : 'default'}>
        {campaign.ctr.toFixed(1)}% CTR
      </Badge>
    </BlockStack>,
    <BlockStack gap="100">
      <Text variant="headingMd" fontWeight="bold" tone={campaign.roas > 3 ? 'success' : 'default'}>
        {campaign.roas.toFixed(1)}x
      </Text>
      <Text variant="bodySm" tone="subdued">
        CPC: {formatCurrency(campaign.cpc)}
      </Text>
    </BlockStack>,
    <Button variant="plain" size="slim">
      Actions
    </Button>
  ]);

  if (loading) {
    return (
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="400">
            <Text variant="headingLg" as="h2">Campaign Manager</Text>
            <Box padding="600">
              <Text variant="bodyMd" alignment="center">Loading campaigns...</Text>
            </Box>
          </BlockStack>
        </Card>
      </BlockStack>
    );
  }

  if (error) {
    return (
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="400">
            <Text variant="headingLg" as="h2">Campaign Manager</Text>
            <Banner tone="critical" title="Error loading campaigns">
              <p>{error}. Please try again later.</p>
            </Banner>
          </BlockStack>
        </Card>
      </BlockStack>
    );
  }

  if (campaigns.length === 0) {
    return (
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text variant="headingLg" as="h2">Campaign Manager</Text>
              <InlineStack gap="200">
                <Button variant="primary">
                  Create New Campaign
                </Button>
                <Button>
                  Import from Google Ads
                </Button>
              </InlineStack>
            </InlineStack>
            <Box padding="600">
              <BlockStack gap="400" align="center">
                <Text variant="headingMd" alignment="center">No campaigns found</Text>
                <Text variant="bodyMd" alignment="center" tone="subdued">
                  Get started by creating your first AI-powered campaign or importing existing campaigns from Google Ads.
                </Text>
                <InlineStack gap="200">
                  <Button variant="primary">Create First Campaign</Button>
                  <Button>Import from Google Ads</Button>
                </InlineStack>
              </BlockStack>
            </Box>
          </BlockStack>
        </Card>
      </BlockStack>
    );
  }

  return (
    <BlockStack gap="400">
      {/* Header and Filters */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <Text variant="headingLg" as="h2">Campaign Manager</Text>
            <InlineStack gap="200">
              <Button variant="primary">
                Create New Campaign
              </Button>
              <Button>
                Import from Google Ads
              </Button>
            </InlineStack>
          </InlineStack>

          <InlineStack gap="200">
            <Select
              label=""
              options={[
                { label: 'Sort by Performance', value: 'performance' },
                { label: 'Sort by Spend', value: 'spend' },
                { label: 'Sort by Conversions', value: 'conversions' },
              ]}
              value={sortValue}
              onChange={setSortValue}
            />
            <Select
              label=""
              options={[
                { label: 'All Campaigns', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Paused', value: 'paused' },
                { label: 'Pending', value: 'pending' },
              ]}
              value={filterStatus}
              onChange={setFilterStatus}
            />
            <TextField
              label=""
              placeholder="Search campaigns..."
              value=""
              onChange={() => {}}
              autoComplete="off"
              prefix={<Icon source="SearchIcon" />}
            />
          </InlineStack>
        </BlockStack>
      </Card>

      {/* Bulk Actions */}
      {selectedCampaigns.length > 0 && (
        <Banner
          title={`${selectedCampaigns.length} campaigns selected`}
          tone="info"
          action={{ content: 'Optimize with AI', onAction: handleBulkOptimize }}
          secondaryAction={{ content: 'Clear selection', onAction: () => setSelectedCampaigns([]) }}
        >
          <p>Apply bulk actions to selected campaigns</p>
        </Banner>
      )}

      {/* Campaigns Table */}
      <Card>
        <DataTable
          columnContentTypes={[
            'text',
            'text',
            'text',
            'numeric',
            'numeric',
            'numeric',
            'numeric',
            'text',
          ]}
          headings={[
            '',
            'Campaign',
            'Status',
            'Budget/Spend',
            'Reach',
            'Conversions',
            'ROAS',
            'Actions',
          ]}
          rows={rows}
          hoverable
        />
      </Card>

      {/* Summary Stats */}
      <Card>
        <InlineStack align="space-between">
          <BlockStack gap="100">
            <Text variant="headingMd" fontWeight="bold">
              {formatCurrency(campaigns.reduce((sum, c) => sum + c.spent, 0))}
            </Text>
            <Text variant="bodySm" tone="subdued">Total Spend Today</Text>
          </BlockStack>
          <BlockStack gap="100">
            <Text variant="headingMd" fontWeight="bold" tone="success">
              {campaigns.reduce((sum, c) => sum + c.conversions, 0)}
            </Text>
            <Text variant="bodySm" tone="subdued">Total Conversions</Text>
          </BlockStack>
          <BlockStack gap="100">
            <Text variant="headingMd" fontWeight="bold">
              {(campaigns.reduce((sum, c) => sum + c.roas * c.spent, 0) /
                campaigns.reduce((sum, c) => sum + c.spent, 0) || 0).toFixed(1)}x
            </Text>
            <Text variant="bodySm" tone="subdued">Average ROAS</Text>
          </BlockStack>
          <BlockStack gap="100">
            <Text variant="headingMd" fontWeight="bold">
              {campaigns.filter(c => c.aiOptimized).length}/{campaigns.length}
            </Text>
            <Text variant="bodySm" tone="subdued">AI Optimized</Text>
          </BlockStack>
        </InlineStack>
      </Card>
    </BlockStack>
  );
}