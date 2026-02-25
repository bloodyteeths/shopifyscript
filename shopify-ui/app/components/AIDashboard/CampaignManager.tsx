import React, { useState, useEffect, useCallback } from "react";
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
import { TimeRangeSelector, TimePeriod, getPeriodLabel } from "../TimeRangeSelector";

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
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('LAST_7_DAYS');

  // Fetch campaigns from API - defined as a separate function for reusability
  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authenticatedFetch(
        `/ai/campaigns?period=${selectedPeriod}`,
        "GET",
        undefined,
        shopName
      );
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
    } catch (err: unknown) {
      console.error("Failed to fetch campaigns:", err);
      setError("Failed to load campaigns");
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [shopName, selectedPeriod]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Handle period change
  const handlePeriodChange = useCallback((period: TimePeriod) => {
    setSelectedPeriod(period);
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
    const toneMap: Record<string, "success" | "warning" | "info"> = {
      'active': 'success',
      'paused': 'warning',
      'pending': 'info',
    };
    return (
      <Badge tone={toneMap[status]}>
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

  const handleBulkOptimize = async () => {
    if (selectedCampaigns.length === 0) {
      alert('Please select campaigns to optimize');
      return;
    }

    setLoading(true);
    try {
      // Call AI optimization endpoint
      const response = await authenticatedFetch(
        '/ai/campaigns/optimize',
        'POST',
        { campaignIds: selectedCampaigns },
        shopName
      );

      if (response.ok) {
        const data = await response.json();
        alert(`Successfully queued ${selectedCampaigns.length} campaigns for AI optimization`);
        // Refresh campaigns to show updated status
        await fetchCampaigns();
        setSelectedCampaigns([]);
      } else {
        alert('Failed to optimize campaigns. Please try again.');
      }
    } catch (error: unknown) {
      console.error('Optimization error:', error);
      alert('Error optimizing campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = () => {
    // Navigate to campaign creation or show modal
    window.location.href = '/app/campaigns?action=create';
  };

  const handleImportCampaigns = () => {
    // Navigate to import flow
    window.location.href = '/app/setup?tab=google-ads';
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
      <Text variant="bodyMd" as="span" fontWeight="bold">{campaign.name}</Text>
      {campaign.aiOptimized && (
        <InlineStack gap="100">
          <Badge tone="success">AI Optimized</Badge>
          <Text variant="bodySm" as="span" tone="subdued">{formatTimeAgo(campaign.lastOptimized)}</Text>
        </InlineStack>
      )}
    </BlockStack>,
    getStatusBadge(campaign.status),
    <BlockStack gap="100">
      <Text variant="bodyMd" as="span">{formatCurrency(campaign.spent)}</Text>
      <Text variant="bodySm" as="span" tone="subdued">of {formatCurrency(campaign.budget)}</Text>
      <ProgressBar
        progress={(campaign.spent / campaign.budget) * 100}
        size="small"
        tone={campaign.spent / campaign.budget > 0.9 ? 'critical' : 'primary'}
      />
    </BlockStack>,
    <BlockStack gap="100">
      <Text variant="bodyMd" as="span">{formatNumber(campaign.impressions)}</Text>
      <Text variant="bodySm" as="span" tone="subdued">{formatNumber(campaign.clicks)} clicks</Text>
    </BlockStack>,
    <BlockStack gap="100">
      <Text variant="bodyMd" as="span" fontWeight="bold" tone="success">{campaign.conversions}</Text>
      <Badge tone={campaign.ctr > 4 ? 'success' : undefined}>
        {`${campaign.ctr.toFixed(1)}% CTR`}
      </Badge>
    </BlockStack>,
    <BlockStack gap="100">
      <Text variant="headingMd" as="span" fontWeight="bold" tone={campaign.roas > 3 ? 'success' : undefined}>
        {campaign.roas.toFixed(1)}x
      </Text>
      <Text variant="bodySm" as="span" tone="subdued">
        CPC: {formatCurrency(campaign.cpc)}
      </Text>
    </BlockStack>,
    <Button
      variant="plain"
      size="slim"
      onClick={() => {
        // Show campaign-specific actions menu
        alert(`Actions for ${campaign.name}:\n- View Details\n- Edit Settings\n- Pause Campaign\n- View Reports\n- AI Recommendations`);
      }}
    >
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
              <Text variant="bodyMd" as="p" alignment="center">Loading campaigns...</Text>
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
                <Button variant="primary" onClick={handleCreateCampaign}>
                  Create New Campaign
                </Button>
                <Button onClick={handleImportCampaigns}>
                  Import from Google Ads
                </Button>
              </InlineStack>
            </InlineStack>
            <Box padding="600">
              <BlockStack gap="400" align="center">
                <Text variant="headingMd" as="h3" alignment="center">No campaigns found</Text>
                <Text variant="bodyMd" as="p" alignment="center" tone="subdued">
                  Get started by creating your first AI-powered campaign or importing existing campaigns from Google Ads.
                </Text>
                <InlineStack gap="200">
                  <Button variant="primary" onClick={handleCreateCampaign}>Create First Campaign</Button>
                  <Button onClick={handleImportCampaigns}>Import from Google Ads</Button>
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
            <BlockStack gap="200">
              <Text variant="headingLg" as="h2">Campaign Manager</Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                Showing data for: {getPeriodLabel(selectedPeriod)}
              </Text>
            </BlockStack>
            <InlineStack gap="200">
              <Box minWidth="180px">
                <TimeRangeSelector
                  value={selectedPeriod}
                  onChange={handlePeriodChange}
                  label=""
                />
              </Box>
              <Button variant="primary" onClick={handleCreateCampaign}>
                Create New Campaign
              </Button>
              <Button onClick={handleImportCampaigns}>
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
            <Text variant="headingMd" as="h3" fontWeight="bold">
              {formatCurrency(campaigns.reduce((sum, c) => sum + c.spent, 0))}
            </Text>
            <Text variant="bodySm" as="span" tone="subdued">Total Spend Today</Text>
          </BlockStack>
          <BlockStack gap="100">
            <Text variant="headingMd" as="h3" fontWeight="bold" tone="success">
              {campaigns.reduce((sum, c) => sum + c.conversions, 0)}
            </Text>
            <Text variant="bodySm" as="span" tone="subdued">Total Conversions</Text>
          </BlockStack>
          <BlockStack gap="100">
            <Text variant="headingMd" as="h3" fontWeight="bold">
              {(campaigns.reduce((sum, c) => sum + c.roas * c.spent, 0) /
                campaigns.reduce((sum, c) => sum + c.spent, 0) || 0).toFixed(1)}x
            </Text>
            <Text variant="bodySm" as="span" tone="subdued">Average ROAS</Text>
          </BlockStack>
          <BlockStack gap="100">
            <Text variant="headingMd" as="h3" fontWeight="bold">
              {campaigns.filter(c => c.aiOptimized).length}/{campaigns.length}
            </Text>
            <Text variant="bodySm" as="span" tone="subdued">AI Optimized</Text>
          </BlockStack>
        </InlineStack>
      </Card>
    </BlockStack>
  );
}
