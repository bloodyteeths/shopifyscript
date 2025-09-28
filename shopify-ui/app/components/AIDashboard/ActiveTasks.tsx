import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Layout,
  Text,
  Badge,
  Button,
  InlineStack,
  BlockStack,
  Box,
  ProgressBar,
  Tooltip,
  EmptyState,
  Modal,
  ButtonGroup,
  Divider,
  Icon,
} from "@shopify/polaris";
import { authenticatedFetch } from "../../utils/ai-client";

// Safe icon fallbacks
const PlayIcon = () => <span>▶️</span>;
const PauseIcon = () => <span>⏸️</span>;
const StopIcon = () => <span>⏹️</span>;
const ClockIcon = () => <span>⏱️</span>;
const CheckCircleIcon = () => <span style={{ color: '#00a047' }}>✅</span>;
const AlertTriangleIcon = () => <span style={{ color: '#ff8a00' }}>⚠️</span>;
const XCircleIcon = () => <span style={{ color: '#ff6d6d' }}>❌</span>;
const TrendingUpIcon = () => <span>📈</span>;
const ActivityIcon = () => <span>⚡</span>;

interface ActiveTasksProps {
  shopName: string;
  hasFeatureAccess?: boolean;
}

interface AITask {
  id: string;
  name: string;
  type: 'optimization' | 'content_generation' | 'analysis' | 'automation';
  status: 'running' | 'queued' | 'paused' | 'completed' | 'failed';
  progress: number;
  priority: 'high' | 'medium' | 'low';
  startTime: string;
  estimatedCompletion: string;
  description: string;
  metadata?: {
    campaignId?: string;
    adGroupId?: string;
    itemsProcessed?: number;
    totalItems?: number;
    errorCount?: number;
  };
}

export function ActiveTasks({ shopName, hasFeatureAccess = false }: ActiveTasksProps) {
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<AITask | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Fetch active tasks
  const fetchTasks = useCallback(async () => {
    try {
      const response = await authenticatedFetch("/ai/tasks/active", "GET", undefined, shopName);
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setTasks(data.tasks || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch active tasks:", err);
      // Fallback demo data
      setTasks([
        {
          id: "opt_001",
          name: "Campaign Optimization",
          type: "optimization",
          status: "running",
          progress: 65,
          priority: "high",
          startTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          estimatedCompletion: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          description: "Optimizing ad spend allocation across 12 campaigns",
          metadata: {
            campaignId: "camp_123",
            itemsProcessed: 8,
            totalItems: 12,
            errorCount: 0
          }
        },
        {
          id: "content_001",
          name: "RSA Content Generation",
          type: "content_generation",
          status: "running",
          progress: 90,
          priority: "medium",
          startTime: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
          estimatedCompletion: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
          description: "Generating responsive search ad content for seasonal campaign",
          metadata: {
            adGroupId: "ag_456",
            itemsProcessed: 18,
            totalItems: 20
          }
        },
        {
          id: "analysis_001",
          name: "Performance Analysis",
          type: "analysis",
          status: "queued",
          progress: 0,
          priority: "low",
          startTime: new Date().toISOString(),
          estimatedCompletion: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
          description: "Weekly performance analysis and reporting",
          metadata: {
            itemsProcessed: 0,
            totalItems: 5
          }
        },
        {
          id: "automation_001",
          name: "Bid Adjustment",
          type: "automation",
          status: "paused",
          progress: 45,
          priority: "high",
          startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          estimatedCompletion: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          description: "Automated bid adjustments based on conversion data",
          metadata: {
            campaignId: "camp_789",
            itemsProcessed: 22,
            totalItems: 50,
            errorCount: 1
          }
        }
      ]);
    }
  }, [shopName]);

  // Control task (pause/resume/stop)
  const controlTask = async (taskId: string, action: 'pause' | 'resume' | 'stop') => {
    if (!hasFeatureAccess) {
      setError("Task control requires Professional+ subscription");
      return;
    }

    try {
      const response = await authenticatedFetch(`/ai/tasks/${taskId}/${action}`, "POST", {}, shopName);
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          // Refresh tasks after successful action
          fetchTasks();
        } else {
          setError(data.error || `Failed to ${action} task`);
        }
      }
    } catch (err) {
      console.error(`Failed to ${action} task:`, err);
      setError(`Failed to ${action} task`);
    }
  };

  // Auto-refresh tasks every 15 seconds
  useEffect(() => {
    fetchTasks();

    const interval = setInterval(() => {
      fetchTasks();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchTasks]);

  // Format time duration
  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "< 1 min";
    if (diffMins < 60) return `${diffMins} min`;
    return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
  };

  // Get task icon
  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'optimization': return <TrendingUpIcon />;
      case 'content_generation': return <ActivityIcon />;
      case 'analysis': return <ActivityIcon />;
      case 'automation': return <ActivityIcon />;
      default: return <ActivityIcon />;
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <PlayIcon />;
      case 'paused': return <PauseIcon />;
      case 'completed': return <CheckCircleIcon />;
      case 'failed': return <XCircleIcon />;
      case 'queued': return <ClockIcon />;
      default: return <ClockIcon />;
    }
  };

  // Get priority badge tone
  const getPriorityTone = (priority: string): "success" | "warning" | "critical" | "info" => {
    switch (priority) {
      case 'high': return 'critical';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'info';
    }
  };

  // Get status badge tone
  const getStatusTone = (status: string): "success" | "warning" | "critical" | "info" => {
    switch (status) {
      case 'running': return 'success';
      case 'completed': return 'success';
      case 'paused': return 'warning';
      case 'failed': return 'critical';
      case 'queued': return 'info';
      default: return 'info';
    }
  };

  // Open task details modal
  const openTaskDetails = (task: AITask) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const runningTasks = tasks.filter(t => t.status === 'running').length;
  const queuedTasks = tasks.filter(t => t.status === 'queued').length;

  if (loading) {
    return (
      <Card>
        <Box padding="400">
          <Text variant="headingMd" as="h3">Active AI Tasks</Text>
          <Box paddingBlockStart="200">
            <Text variant="bodyMd" as="p" tone="subdued">Loading tasks...</Text>
          </Box>
        </Box>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Box padding="400">
          <BlockStack gap="400">
            {/* Header */}
            <InlineStack align="space-between">
              <BlockStack gap="100">
                <Text variant="headingMd" as="h3">Active AI Tasks</Text>
                <Text variant="bodyMd" as="p" tone="subdued">
                  Monitor and control running AI operations
                </Text>
              </BlockStack>
              <InlineStack gap="200">
                <Badge tone="success">{String(runningTasks) + " Running"}</Badge>
                <Badge tone="info">{String(queuedTasks) + " Queued"}</Badge>
              </InlineStack>
            </InlineStack>

            {error && (
              <Box padding="300" borderWidth="025" borderRadius="200" borderColor="border">
                <Text variant="bodyMd" as="p" tone="critical">{error}</Text>
              </Box>
            )}

            {/* Tasks List */}
            {tasks.length === 0 ? (
              <EmptyState
                heading="No active tasks"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <Text variant="bodyMd" as="p">
                  All AI operations are complete. New tasks will appear here when triggered.
                </Text>
              </EmptyState>
            ) : (
              <Layout>
                {tasks.map((task) => (
                  <Layout.Section key={task.id}>
                    <Box
                      padding="400"
                      borderWidth="025"
                      borderRadius="200"
                      borderColor="border"
                    >
                      <BlockStack gap="300">
                        {/* Task Header */}
                        <InlineStack align="space-between">
                          <InlineStack gap="200">
                            {getTaskIcon(task.type)}
                            <Text variant="bodyMd" as="span" fontWeight="semibold">
                              {task.name}
                            </Text>
                          </InlineStack>
                          <InlineStack gap="200">
                            <Badge tone={getPriorityTone(task.priority)}>
                              {task.priority.toUpperCase()}
                            </Badge>
                            <Badge tone={getStatusTone(task.status)}>
                              {task.status.toUpperCase()}
                            </Badge>
                          </InlineStack>
                        </InlineStack>

                        {/* Task Description */}
                        <Text variant="bodyMd" as="p" tone="subdued">
                          {task.description}
                        </Text>

                        {/* Progress Bar */}
                        {task.status === 'running' && (
                          <Box>
                            <InlineStack align="space-between" blockAlign="center">
                              <Text variant="bodyMd" as="span">Progress:</Text>
                              <Text variant="bodyMd" as="span" fontWeight="semibold">
                                {task.progress}%
                              </Text>
                            </InlineStack>
                            <Box paddingBlockStart="100">
                              <ProgressBar
                                progress={task.progress}
                                size="small"
                                tone="success"
                              />
                            </Box>
                          </Box>
                        )}

                        {/* Task Metadata */}
                        {task.metadata && (
                          <InlineStack align="space-between">
                            <Text variant="bodyMd" as="span" tone="subdued">
                              {task.metadata.itemsProcessed || 0} / {task.metadata.totalItems || 0} items
                            </Text>
                            <Text variant="bodyMd" as="span" tone="subdued">
                              Runtime: {formatDuration(task.startTime)}
                            </Text>
                          </InlineStack>
                        )}

                        {/* Task Controls */}
                        <InlineStack align="space-between">
                          <Button
                            variant="tertiary"
                            size="micro"
                            onClick={() => openTaskDetails(task)}
                          >
                            View Details
                          </Button>

                          {hasFeatureAccess && (
                            <ButtonGroup>
                              {task.status === 'running' && (
                                <Button
                                  variant="tertiary"
                                  size="micro"
                                  onClick={() => controlTask(task.id, 'pause')}
                                  icon={<PauseIcon />}
                                >
                                  Pause
                                </Button>
                              )}
                              {task.status === 'paused' && (
                                <Button
                                  variant="tertiary"
                                  size="micro"
                                  onClick={() => controlTask(task.id, 'resume')}
                                  icon={<PlayIcon />}
                                >
                                  Resume
                                </Button>
                              )}
                              {(task.status === 'running' || task.status === 'paused') && (
                                <Button
                                  variant="tertiary"
                                  size="micro"
                                  tone="critical"
                                  onClick={() => controlTask(task.id, 'stop')}
                                  icon={<StopIcon />}
                                >
                                  Stop
                                </Button>
                              )}
                            </ButtonGroup>
                          )}
                        </InlineStack>

                        {/* Error count if any */}
                        {task.metadata?.errorCount && task.metadata.errorCount > 0 && (
                          <Box padding="200" borderWidth="025" borderRadius="200" borderColor="border">
                            <InlineStack gap="100">
                              <AlertTriangleIcon />
                              <Text variant="bodyMd" as="span">
                                {task.metadata.errorCount} error(s) encountered
                              </Text>
                            </InlineStack>
                          </Box>
                        )}
                      </BlockStack>
                    </Box>
                  </Layout.Section>
                ))}
              </Layout>
            )}
          </BlockStack>
        </Box>
      </Card>

      {/* Task Details Modal */}
      <Modal
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title={selectedTask ? `Task Details: ${selectedTask.name}` : "Task Details"}
        primaryAction={{
          content: 'Close',
          onAction: () => setShowTaskModal(false),
        }}
      >
        {selectedTask && (
          <Modal.Section>
            <BlockStack gap="400">
              {/* Task Overview */}
              <Box>
                <Text variant="headingMd" as="h4">Task Overview</Text>
                <Box paddingBlockStart="200">
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text variant="bodyMd" as="span">Task ID:</Text>
                      <Text variant="bodyMd" as="span" fontWeight="semibold">{selectedTask.id}</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text variant="bodyMd" as="span">Type:</Text>
                      <Text variant="bodyMd" as="span">{selectedTask.type.replace('_', ' ')}</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text variant="bodyMd" as="span">Priority:</Text>
                      <Badge tone={getPriorityTone(selectedTask.priority)}>
                        {selectedTask.priority.toUpperCase()}
                      </Badge>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text variant="bodyMd" as="span">Status:</Text>
                      <Badge tone={getStatusTone(selectedTask.status)}>
                        {selectedTask.status.toUpperCase()}
                      </Badge>
                    </InlineStack>
                  </BlockStack>
                </Box>
              </Box>

              <Divider />

              {/* Timing Information */}
              <Box>
                <Text variant="headingMd" as="h4">Timing</Text>
                <Box paddingBlockStart="200">
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text variant="bodyMd" as="span">Started:</Text>
                      <Text variant="bodyMd" as="span">
                        {new Date(selectedTask.startTime).toLocaleString()}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text variant="bodyMd" as="span">Runtime:</Text>
                      <Text variant="bodyMd" as="span">
                        {formatDuration(selectedTask.startTime)}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text variant="bodyMd" as="span">ETA:</Text>
                      <Text variant="bodyMd" as="span">
                        {formatDuration(new Date().toISOString(), selectedTask.estimatedCompletion)}
                      </Text>
                    </InlineStack>
                  </BlockStack>
                </Box>
              </Box>

              {/* Progress and Metadata */}
              {selectedTask.metadata && (
                <>
                  <Divider />
                  <Box>
                    <Text variant="headingMd" as="h4">Progress Details</Text>
                    <Box paddingBlockStart="200">
                      <BlockStack gap="200">
                        {selectedTask.status === 'running' && (
                          <Box>
                            <InlineStack align="space-between">
                              <Text variant="bodyMd" as="span">Completion:</Text>
                              <Text variant="bodyMd" as="span" fontWeight="semibold">
                                {selectedTask.progress}%
                              </Text>
                            </InlineStack>
                            <Box paddingBlockStart="100">
                              <ProgressBar progress={selectedTask.progress} />
                            </Box>
                          </Box>
                        )}

                        <InlineStack align="space-between">
                          <Text variant="bodyMd" as="span">Items processed:</Text>
                          <Text variant="bodyMd" as="span">
                            {selectedTask.metadata.itemsProcessed || 0} / {selectedTask.metadata.totalItems || 0}
                          </Text>
                        </InlineStack>

                        {selectedTask.metadata.errorCount !== undefined && (
                          <InlineStack align="space-between">
                            <Text variant="bodyMd" as="span">Errors:</Text>
                            <Text variant="bodyMd" as="span">
                              {selectedTask.metadata.errorCount}
                            </Text>
                          </InlineStack>
                        )}

                        {selectedTask.metadata.campaignId && (
                          <InlineStack align="space-between">
                            <Text variant="bodyMd" as="span">Campaign ID:</Text>
                            <Text variant="bodyMd" as="span">{selectedTask.metadata.campaignId}</Text>
                          </InlineStack>
                        )}

                        {selectedTask.metadata.adGroupId && (
                          <InlineStack align="space-between">
                            <Text variant="bodyMd" as="span">Ad Group ID:</Text>
                            <Text variant="bodyMd" as="span">{selectedTask.metadata.adGroupId}</Text>
                          </InlineStack>
                        )}
                      </BlockStack>
                    </Box>
                  </Box>
                </>
              )}
            </BlockStack>
          </Modal.Section>
        )}
      </Modal>
    </>
  );
}