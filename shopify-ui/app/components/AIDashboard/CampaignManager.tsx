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
  const [loading, setLoading] = useState(false);
  const [bulkActionsActive, setBulkActionsActive] = useState(false);

  // Mock data for campaigns
  useEffect(() => {
    const mockCampaigns: Campaign[] = [
      {
        id: '1',
        name: 'Summer Sale 2025',
        status: 'active',
        budget: 500,
        spent: 325.50,
        impressions: 45230,
        clicks: 1856,
        conversions: 92,
        ctr: 4.1,
        cpc: 0.18,
        roas: 5.2,
        aiOptimized: true,
        lastOptimized: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        name: 'Brand Awareness',
        status: 'active',
        budget: 1000,
        spent: 752.00,
        impressions: 125600,
        clicks: 3890,
        conversions: 45,
        ctr: 3.1,
        cpc: 0.19,
        roas: 2.8,
        aiOptimized: true,
        lastOptimized: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '3',
        name: 'Product Launch - Pro Series',
        status: 'paused',
        budget: 750,
        spent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        roas: 0,
        aiOptimized: false,
        lastOptimized: '',
      },
      {
        id: '4',
        name: 'Retargeting - Cart Abandoners',
        status: 'active',
        budget: 300,
        spent: 189.75,
        impressions: 28900,
        clicks: 1450,
        conversions: 78,
        ctr: 5.0,
        cpc: 0.13,
        roas: 8.5,
        aiOptimized: true,
        lastOptimized: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '5',
        name: 'Holiday Special Offers',
        status: 'pending',
        budget: 2000,
        spent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        roas: 0,
        aiOptimized: false,
        lastOptimized: '',
      },
    ];
    setCampaigns(mockCampaigns);
  }, []);

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