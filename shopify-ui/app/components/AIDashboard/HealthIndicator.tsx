import React from "react";
import {
  Box,
  Text,
  Badge,
  ProgressBar,
  InlineStack,
  BlockStack,
  Tooltip,
} from "@shopify/polaris";

// Safe icon components for status indicators
const StatusIndicator = ({ status }: { status: 'operational' | 'degraded' | 'offline' }) => {
  const getColor = () => {
    switch (status) {
      case 'operational': return '#00a047';
      case 'degraded': return '#ff8a00';
      case 'offline': return '#ff6d6d';
      default: return '#666';
    }
  };

  return (
    <span style={{
      display: 'inline-block',
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      backgroundColor: getColor(),
      border: '2px solid white',
      boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
    }} />
  );
};

interface HealthIndicatorProps {
  status: 'operational' | 'degraded' | 'offline';
  uptime: number;
  responseTime: number;
  errorRate: number;
  showDetails?: boolean;
}

export function HealthIndicator({
  status,
  uptime,
  responseTime,
  errorRate,
  showDetails = true
}: HealthIndicatorProps) {

  // Get status message
  const getStatusMessage = () => {
    switch (status) {
      case 'operational':
        return 'All systems operational';
      case 'degraded':
        return 'Some systems experiencing issues';
      case 'offline':
        return 'System offline or unreachable';
      default:
        return 'Status unknown';
    }
  };

  // Get performance rating based on response time
  const getPerformanceRating = (responseTime: number) => {
    if (responseTime < 100) return { rating: 'excellent', color: 'success' as const };
    if (responseTime < 300) return { rating: 'good', color: 'success' as const };
    if (responseTime < 500) return { rating: 'fair', color: 'warning' as const };
    return { rating: 'poor', color: 'critical' as const };
  };

  // Get uptime badge tone
  const getUptimeTone = (uptime: number): "success" | "info" => {
    if (uptime >= 99.5) return 'success';
    return 'info';
  };

  // Get error rate badge tone
  const getErrorRateTone = (errorRate: number): "success" | "info" => {
    if (errorRate <= 0.5) return 'success';
    return 'info';
  };

  const performanceRating = getPerformanceRating(responseTime);

  return (
    <BlockStack gap="300">
      {/* Main Status Indicator */}
      <Box padding="300" borderWidth="025" borderRadius="200" borderColor="border">
        <InlineStack align="space-between">
          <InlineStack gap="200">
            <StatusIndicator status={status} />
            <Text variant="bodyMd" as="span" fontWeight="semibold">
              {getStatusMessage()}
            </Text>
          </InlineStack>
          <Badge tone={status === 'operational' ? 'success' : 'info'}>
            {status.toUpperCase()}
          </Badge>
        </InlineStack>
      </Box>

      {showDetails && (
        <BlockStack gap="200">
          {/* Uptime */}
          <Box>
            <InlineStack align="space-between" blockAlign="center">
              <Text variant="bodyMd" as="span" tone="subdued">
                Uptime
              </Text>
              <InlineStack gap="200">
                <Badge tone={getUptimeTone(uptime)}>
                  {uptime.toFixed(1) + "%"}
                </Badge>
              </InlineStack>
            </InlineStack>
            <Box paddingBlockStart="100">
              <ProgressBar
                progress={uptime}
                size="small"
              />
            </Box>
          </Box>

          {/* Response Time */}
          <Box>
            <InlineStack align="space-between" blockAlign="center">
              <Text variant="bodyMd" as="span" tone="subdued">
                Response Time
              </Text>
              <InlineStack gap="200">
                <Text variant="bodyMd" as="span">
                  {responseTime}ms
                </Text>
                <Tooltip content={`Performance rating: ${performanceRating.rating}`}>
                  <Badge tone="success">
                    {performanceRating.rating.toUpperCase()}
                  </Badge>
                </Tooltip>
              </InlineStack>
            </InlineStack>

            {/* Response time visualization */}
            <Box paddingBlockStart="100">
              <ProgressBar
                progress={Math.min((1000 - responseTime) / 10, 100)}
                size="small"
              />
            </Box>
          </Box>

          {/* Error Rate */}
          <Box>
            <InlineStack align="space-between" blockAlign="center">
              <Text variant="bodyMd" as="span" tone="subdued">
                Error Rate
              </Text>
              <Badge tone={getErrorRateTone(errorRate)}>
                {errorRate.toFixed(1) + "%"}
              </Badge>
            </InlineStack>

            {/* Error rate visualization - inverted (lower is better) */}
            <Box paddingBlockStart="100">
              <ProgressBar
                progress={Math.max(5 - errorRate, 0) * 20}
                size="small"
              />
            </Box>
          </Box>

          {/* Service Health Indicators */}
          <Box paddingBlockStart="200">
            <Text variant="bodyMd" as="span" tone="subdued">
              Service Health
            </Text>
            <Box paddingBlockStart="200">
              <InlineStack gap="400">
                <Tooltip content="AI Processing Engine">
                  <InlineStack gap="100" blockAlign="center">
                    <StatusIndicator status="operational" />
                    <Text variant="bodyMd" as="span">AI Engine</Text>
                  </InlineStack>
                </Tooltip>

                <Tooltip content="Data Analytics Pipeline">
                  <InlineStack gap="100" blockAlign="center">
                    <StatusIndicator status="operational" />
                    <Text variant="bodyMd" as="span">Analytics</Text>
                  </InlineStack>
                </Tooltip>

                <Tooltip content="Campaign Optimization Service">
                  <InlineStack gap="100" blockAlign="center">
                    <StatusIndicator status={status === 'degraded' ? 'degraded' : 'operational'} />
                    <Text variant="bodyMd" as="span">Optimizer</Text>
                  </InlineStack>
                </Tooltip>

                <Tooltip content="Content Generation API">
                  <InlineStack gap="100" blockAlign="center">
                    <StatusIndicator status="operational" />
                    <Text variant="bodyMd" as="span">Content API</Text>
                  </InlineStack>
                </Tooltip>
              </InlineStack>
            </Box>
          </Box>

          {/* Additional Metrics */}
          <Box paddingBlockStart="200">
            <BlockStack gap="200">
              <Text variant="bodyMd" as="span" tone="subdued">
                Additional Metrics
              </Text>

              <InlineStack align="space-between">
                <Text variant="bodyMd" as="span">Active connections:</Text>
                <Text variant="bodyMd" as="span" fontWeight="semibold" tone="success">
                  {Math.floor(45 + Math.random() * 10)}
                </Text>
              </InlineStack>

              <InlineStack align="space-between">
                <Text variant="bodyMd" as="span">Queue size:</Text>
                <Text variant="bodyMd" as="span" fontWeight="semibold">
                  {Math.floor(2 + Math.random() * 5)}
                </Text>
              </InlineStack>

              <InlineStack align="space-between">
                <Text variant="bodyMd" as="span">CPU usage:</Text>
                <Text variant="bodyMd" as="span" fontWeight="semibold">
                  {(45 + Math.random() * 20).toFixed(1)}%
                </Text>
              </InlineStack>

              <InlineStack align="space-between">
                <Text variant="bodyMd" as="span">Memory usage:</Text>
                <Text variant="bodyMd" as="span" fontWeight="semibold">
                  {(60 + Math.random() * 15).toFixed(1)}%
                </Text>
              </InlineStack>
            </BlockStack>
          </Box>
        </BlockStack>
      )}
    </BlockStack>
  );
}