/**
 * ActivityFeed Component for Real-time Dashboard Updates
 *
 * Features:
 * - Real-time activity feed display
 * - Live optimization updates
 * - System notifications
 * - Event filtering and search
 * - Notification badges
 * - Auto-scroll and pause on user interaction
 * - Export and sharing capabilities
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Card,
  Text,
  Badge,
  InlineStack,
  BlockStack,
  Button,
  TextField,
  Select,
  Icon,
  Tooltip,
  Banner,
  EmptyState,
  Spinner,
  ButtonGroup,
  ActionList,
  Popover,
  Scrollable,
  Box,
  Grid,
  Divider
} from '@shopify/polaris';
import {
  SearchIcon,
  FilterIcon,
  RefreshIcon,
  ExportIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  NotificationIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  PlusCircleIcon,
  ClockIcon,
  ViewIcon
} from '@shopify/polaris-icons';
import { useWebSocket, WS_EVENTS, type WSEvent, type OptimizationEvent, type MetricsEvent, type SystemHealthEvent, type CompetitorEvent, type TrafficSpikeEvent, type ScriptExecutedEvent, type ErrorEvent, ConnectionState } from '../../hooks/useWebSocket';

// Activity types
export interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  priority: 'critical' | 'high' | 'normal' | 'low';
  status: 'success' | 'error' | 'warning' | 'info' | 'pending';
  category: string;
  data?: any;
  read?: boolean;
}

// Filter options
interface FilterOptions {
  category: string;
  priority: string;
  status: string;
  timeRange: string;
  search: string;
}

// Component props
interface ActivityFeedProps {
  maxItems?: number;
  autoRefresh?: boolean;
  showNotificationBadge?: boolean;
  enableFiltering?: boolean;
  enableSearch?: boolean;
  enableExport?: boolean;
  compact?: boolean;
  className?: string;
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'optimization', label: 'Optimizations' },
  { value: 'metrics', label: 'Metrics' },
  { value: 'system', label: 'System' },
  { value: 'competitor', label: 'Competitors' },
  { value: 'traffic', label: 'Traffic' },
  { value: 'script', label: 'Scripts' },
  { value: 'error', label: 'Errors' }
];

const PRIORITIES = [
  { value: 'all', label: 'All Priorities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' }
];

const STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'success', label: 'Success' },
  { value: 'error', label: 'Error' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
  { value: 'pending', label: 'Pending' }
];

const TIME_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: '1h', label: 'Last Hour' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' }
];

export default function ActivityFeed({
  maxItems = 100,
  autoRefresh = true,
  showNotificationBadge = true,
  enableFiltering = true,
  enableSearch = true,
  enableExport = true,
  compact = false,
  className = ''
}: ActivityFeedProps) {
  // WebSocket connection
  const { state: wsState, subscribe, on, isConnected } = useWebSocket({
    autoConnect: true,
    debug: process.env.NODE_ENV === 'development'
  });

  // State
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    category: 'all',
    priority: 'all',
    status: 'all',
    timeRange: '24h',
    search: ''
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  // Refs
  const feedRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);

  // Subscribe to WebSocket events
  useEffect(() => {
    if (isConnected) {
      // Subscribe to all activity-generating events
      subscribe([
        WS_EVENTS.OPTIMIZATION_CREATED,
        WS_EVENTS.OPTIMIZATION_APPLIED,
        WS_EVENTS.OPTIMIZATION_FAILED,
        WS_EVENTS.METRICS_UPDATED,
        WS_EVENTS.SYSTEM_HEALTH,
        WS_EVENTS.COMPETITOR_CHANGE,
        WS_EVENTS.TRAFFIC_SPIKE,
        WS_EVENTS.SCRIPT_EXECUTED,
        WS_EVENTS.ERROR_CRITICAL
      ]);
    }
  }, [isConnected, subscribe]);

  // Convert WebSocket events to activities
  const convertEventToActivity = useCallback((event: WSEvent): Activity | null => {
    const baseActivity = {
      id: `${event.type}-${event.timestamp}-${Math.random()}`,
      timestamp: new Date(event.timestamp),
      read: false,
      data: event
    };

    switch (event.type) {
      case WS_EVENTS.OPTIMIZATION_CREATED:
        const createEvent = event as OptimizationEvent;
        return {
          ...baseActivity,
          type: 'optimization_created',
          title: 'New Optimization Created',
          description: `Optimization created for ${createEvent.campaign || 'campaign'}`,
          priority: 'normal' as const,
          status: 'info' as const,
          category: 'optimization'
        };

      case WS_EVENTS.OPTIMIZATION_APPLIED:
        const applyEvent = event as OptimizationEvent;
        return {
          ...baseActivity,
          type: 'optimization_applied',
          title: 'Optimization Applied',
          description: `Optimization successfully applied to ${applyEvent.campaign || 'campaign'}`,
          priority: 'normal' as const,
          status: 'success' as const,
          category: 'optimization'
        };

      case WS_EVENTS.OPTIMIZATION_FAILED:
        const failEvent = event as OptimizationEvent;
        return {
          ...baseActivity,
          type: 'optimization_failed',
          title: 'Optimization Failed',
          description: `Optimization failed for ${failEvent.campaign || 'campaign'}`,
          priority: 'high' as const,
          status: 'error' as const,
          category: 'optimization'
        };

      case WS_EVENTS.METRICS_UPDATED:
        const metricsEvent = event as MetricsEvent;
        return {
          ...baseActivity,
          type: 'metrics_updated',
          title: 'Metrics Updated',
          description: 'Performance metrics have been updated',
          priority: 'low' as const,
          status: 'info' as const,
          category: 'metrics'
        };

      case WS_EVENTS.SYSTEM_HEALTH:
        const healthEvent = event as SystemHealthEvent;
        return {
          ...baseActivity,
          type: 'system_health',
          title: 'System Health Update',
          description: `System status: ${healthEvent.status}`,
          priority: healthEvent.status === 'unhealthy' ? 'critical' : 'low',
          status: healthEvent.status === 'healthy' ? 'success' : healthEvent.status === 'degraded' ? 'warning' : 'error',
          category: 'system'
        };

      case WS_EVENTS.COMPETITOR_CHANGE:
        const compEvent = event as CompetitorEvent;
        return {
          ...baseActivity,
          type: 'competitor_change',
          title: 'Competitor Change Detected',
          description: `Changes detected for competitor: ${compEvent.competitor}`,
          priority: 'normal' as const,
          status: 'info' as const,
          category: 'competitor'
        };

      case WS_EVENTS.TRAFFIC_SPIKE:
        const trafficEvent = event as TrafficSpikeEvent;
        return {
          ...baseActivity,
          type: 'traffic_spike',
          title: 'Traffic Spike Detected',
          description: `Traffic increased to ${trafficEvent.current} (threshold: ${trafficEvent.threshold})`,
          priority: 'high' as const,
          status: 'warning' as const,
          category: 'traffic'
        };

      case WS_EVENTS.SCRIPT_EXECUTED:
        const scriptEvent = event as ScriptExecutedEvent;
        return {
          ...baseActivity,
          type: 'script_executed',
          title: 'Script Executed',
          description: `Script ${scriptEvent.scriptId} executed with status: ${scriptEvent.status}`,
          priority: 'normal' as const,
          status: scriptEvent.status === 'success' ? 'success' : 'error',
          category: 'script'
        };

      case WS_EVENTS.ERROR_CRITICAL:
        const errorEvent = event as ErrorEvent;
        return {
          ...baseActivity,
          type: 'error_critical',
          title: 'Critical Error',
          description: `Critical error in ${errorEvent.service || 'system'}: ${errorEvent.error}`,
          priority: 'critical' as const,
          status: 'error' as const,
          category: 'error'
        };

      default:
        return null;
    }
  }, []);

  // Handle WebSocket events
  useEffect(() => {
    const unsubscribers = [
      on(WS_EVENTS.OPTIMIZATION_CREATED, (event) => {
        const activity = convertEventToActivity(event);
        if (activity) addActivity(activity);
      }),
      on(WS_EVENTS.OPTIMIZATION_APPLIED, (event) => {
        const activity = convertEventToActivity(event);
        if (activity) addActivity(activity);
      }),
      on(WS_EVENTS.OPTIMIZATION_FAILED, (event) => {
        const activity = convertEventToActivity(event);
        if (activity) addActivity(activity);
      }),
      on(WS_EVENTS.METRICS_UPDATED, (event) => {
        const activity = convertEventToActivity(event);
        if (activity) addActivity(activity);
      }),
      on(WS_EVENTS.SYSTEM_HEALTH, (event) => {
        const activity = convertEventToActivity(event);
        if (activity) addActivity(activity);
      }),
      on(WS_EVENTS.COMPETITOR_CHANGE, (event) => {
        const activity = convertEventToActivity(event);
        if (activity) addActivity(activity);
      }),
      on(WS_EVENTS.TRAFFIC_SPIKE, (event) => {
        const activity = convertEventToActivity(event);
        if (activity) addActivity(activity);
      }),
      on(WS_EVENTS.SCRIPT_EXECUTED, (event) => {
        const activity = convertEventToActivity(event);
        if (activity) addActivity(activity);
      }),
      on(WS_EVENTS.ERROR_CRITICAL, (event) => {
        const activity = convertEventToActivity(event);
        if (activity) addActivity(activity);
      })
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [on, convertEventToActivity]);

  // Add new activity
  const addActivity = useCallback((activity: Activity) => {
    setActivities(prev => {
      const newActivities = [activity, ...prev].slice(0, maxItems);
      return newActivities;
    });

    if (!activity.read) {
      setUnreadCount(prev => prev + 1);
    }

    // Auto-scroll to top if enabled
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [maxItems, autoScroll]);

  // Filter activities
  useEffect(() => {
    let filtered = [...activities];

    // Apply filters
    if (filters.category !== 'all') {
      filtered = filtered.filter(activity => activity.category === filters.category);
    }

    if (filters.priority !== 'all') {
      filtered = filtered.filter(activity => activity.priority === filters.priority);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(activity => activity.status === filters.status);
    }

    if (filters.timeRange !== 'all') {
      const now = new Date();
      const timeRangeMs = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      }[filters.timeRange] || 0;

      if (timeRangeMs > 0) {
        const cutoff = new Date(now.getTime() - timeRangeMs);
        filtered = filtered.filter(activity => activity.timestamp >= cutoff);
      }
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(activity =>
        activity.title.toLowerCase().includes(searchLower) ||
        activity.description.toLowerCase().includes(searchLower)
      );
    }

    setFilteredActivities(filtered);
  }, [activities, filters]);

  // Handle scroll for auto-scroll detection
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const scrollTop = element.scrollTop;

    // If user scrolls away from top, disable auto-scroll
    if (scrollTop > 50 && autoScroll) {
      setAutoScroll(false);
    }

    // If user scrolls back to top, enable auto-scroll
    if (scrollTop < 10 && !autoScroll) {
      setAutoScroll(true);
    }

    lastScrollTop.current = scrollTop;
  }, [autoScroll]);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setActivities(prev => prev.map(activity => ({ ...activity, read: true })));
    setUnreadCount(0);
  }, []);

  // Clear all activities
  const clearAll = useCallback(() => {
    setActivities([]);
    setUnreadCount(0);
  }, []);

  // Export activities
  const exportActivities = useCallback(() => {
    const exportData = filteredActivities.map(activity => ({
      timestamp: activity.timestamp.toISOString(),
      type: activity.type,
      title: activity.title,
      description: activity.description,
      priority: activity.priority,
      status: activity.status,
      category: activity.category
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-feed-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredActivities]);

  // Get activity icon
  const getActivityIcon = (activity: Activity) => {
    switch (activity.status) {
      case 'success':
        return CheckCircleIcon;
      case 'error':
        return XCircleIcon;
      case 'warning':
        return AlertCircleIcon;
      case 'pending':
        return ClockIcon;
      default:
        return PlusCircleIcon;
    }
  };

  // Get activity badge tone
  const getActivityBadgeTone = (activity: Activity): 'success' | 'critical' | 'attention' | 'info' | 'new' => {
    switch (activity.status) {
      case 'success':
        return 'success';
      case 'error':
        return 'critical';
      case 'warning':
        return 'attention';
      case 'pending':
        return 'new';
      default:
        return 'info';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();

    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  };

  // Connection status banner
  const connectionBanner = !isConnected && (
    <Banner
      tone="warning"
      title="Real-time updates disconnected"
      action={{
        content: 'Reconnect',
        onAction: () => window.location.reload()
      }}
    >
      <p>WebSocket connection lost. Some features may not work properly.</p>
    </Banner>
  );

  // Filter popover
  const filterPopover = (
    <Popover
      active={showFilterPopover}
      activator={
        <Button
          disclosure
          icon={FilterIcon}
          onClick={() => setShowFilterPopover(!showFilterPopover)}
        >
          Filters
        </Button>
      }
      onClose={() => setShowFilterPopover(false)}
    >
      <div style={{ padding: '16px', width: '300px' }}>
        <BlockStack gap="200">
          <Select
            label="Category"
            options={CATEGORIES}
            value={filters.category}
            onChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
          />
          <Select
            label="Priority"
            options={PRIORITIES}
            value={filters.priority}
            onChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
          />
          <Select
            label="Status"
            options={STATUSES}
            value={filters.status}
            onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
          />
          <Select
            label="Time Range"
            options={TIME_RANGES}
            value={filters.timeRange}
            onChange={(value) => setFilters(prev => ({ ...prev, timeRange: value }))}
          />
        </BlockStack>
      </div>
    </Popover>
  );

  return (
    <Card>
      {connectionBanner}

      <BlockStack gap="0">
        {/* Header */}
        <Box padding="400">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack blockAlign="center" gap="200">
              <Icon source={NotificationIcon} />
              <Text variant="headingMd" as="h3">
                Activity Feed
              </Text>
              {showNotificationBadge && unreadCount > 0 && (
                <Badge tone="attention">{String(unreadCount)}</Badge>
              )}
              <Badge tone={isConnected ? 'success' : 'critical'}>
                {isConnected ? 'Live' : 'Offline'}
              </Badge>
            </InlineStack>

            <InlineStack gap="200">
              {!compact && (
                <Button
                  size="slim"
                  icon={isExpanded ? ChevronUpIcon : ChevronDownIcon}
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? 'Collapse' : 'Expand'}
                </Button>
              )}

              <ButtonGroup>
                {enableFiltering && filterPopover}

                <Button
                  size="slim"
                  icon={RefreshIcon}
                  loading={isLoading}
                  onClick={() => window.location.reload()}
                  accessibilityLabel="Refresh feed"
                />

                {enableExport && (
                  <Button
                    size="slim"
                    icon={ExportIcon}
                    onClick={exportActivities}
                    disabled={filteredActivities.length === 0}
                    accessibilityLabel="Export activities"
                  />
                )}
              </ButtonGroup>
            </InlineStack>
          </InlineStack>
        </Box>

        {/* Search */}
        {isExpanded && enableSearch && (
          <Box padding="400" paddingBlockStart="0">
            <TextField
              label="Search activities"
              labelHidden
              placeholder="Search activities..."
              value={filters.search}
              onChange={(value) => setFilters(prev => ({ ...prev, search: value }))}
              prefix={<Icon source={SearchIcon} />}
              clearButton
              onClearButtonClick={() => setFilters(prev => ({ ...prev, search: '' }))}
              autoComplete="off"
            />
          </Box>
        )}

        {/* Actions */}
        {isExpanded && activities.length > 0 && (
          <Box padding="400" paddingBlockStart="0">
            <InlineStack gap="200" blockAlign="center">
              <Button
                size="slim"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                Mark all as read
              </Button>
              <Button
                size="slim"
                tone="critical"
                onClick={clearAll}
              >
                Clear all
              </Button>
              <Text variant="bodySm" as="span" tone="subdued">
                Showing {filteredActivities.length} of {activities.length} activities
              </Text>
            </InlineStack>
          </Box>
        )}

        <Divider />

        {/* Activity List */}
        {isExpanded && (
          <div
            ref={feedRef}
            style={{
              maxHeight: compact ? '300px' : '600px',
              overflowY: 'auto'
            }}
            onScroll={handleScroll}
          >
            {filteredActivities.length === 0 ? (
              <Box padding="400">
                <EmptyState
                  heading="No activities yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Activity updates will appear here when events occur.</p>
                </EmptyState>
              </Box>
            ) : (
              <BlockStack gap="0">
                {filteredActivities.map((activity, index) => (
                  <div key={activity.id}>
                    <Box padding="400">
                      <InlineStack blockAlign="start" gap="200">
                        <div style={{ flexShrink: 0 }}>
                          <Icon
                            source={getActivityIcon(activity)}
                            tone={activity.status === 'success' ? 'success' :
                                  activity.status === 'error' ? 'critical' :
                                  activity.status === 'warning' ? 'caution' : 'base'}
                          />
                        </div>

                        <BlockStack gap="100">
                          <InlineStack align="space-between" blockAlign="center">
                            <Text variant="bodyMd" as="p" fontWeight="semibold">
                              {activity.title}
                            </Text>
                            <InlineStack gap="100">
                              <Badge tone={getActivityBadgeTone(activity)}>
                                {activity.priority}
                              </Badge>
                              <Text variant="bodySm" as="span" tone="subdued">
                                {formatTimestamp(activity.timestamp)}
                              </Text>
                            </InlineStack>
                          </InlineStack>

                          <Text variant="bodySm" as="span" tone="subdued">
                            {activity.description}
                          </Text>

                          {activity.data && (
                            <Button
                              size="slim"
                              variant="plain"
                              icon={ViewIcon}
                              onClick={() => console.log('Activity data:', activity.data)}
                            >
                              View details
                            </Button>
                          )}
                        </BlockStack>
                      </InlineStack>
                    </Box>

                    {index < filteredActivities.length - 1 && <Divider />}
                  </div>
                ))}
              </BlockStack>
            )}
          </div>
        )}

        {/* Auto-scroll indicator */}
        {isExpanded && !autoScroll && activities.length > 0 && (
          <Box padding="200">
            <Banner
              tone="info"
              action={{
                content: 'Resume auto-scroll',
                onAction: () => {
                  setAutoScroll(true);
                  if (feedRef.current) {
                    feedRef.current.scrollTop = 0;
                  }
                }
              }}
            >
              Auto-scroll paused. New activities will appear at the top.
            </Banner>
          </Box>
        )}
      </BlockStack>
    </Card>
  );
}
