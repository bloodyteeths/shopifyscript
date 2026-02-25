/**
 * Enterprise Custom Dashboards Interface
 * Main dashboard management and viewing interface for Enterprise tier users
 */

import React, { useState, useEffect, useCallback } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigate, useSubmit, useFetcher } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  Badge,
  Modal,
  TextField,
  Select,
  Banner,
  Spinner,
  EmptyState,
  ResourceList,
  ResourceItem,
  Avatar,
  ButtonGroup,
  Popover,
  ActionList,
  Tooltip,
  ProgressBar,
  BlockStack,
  InlineStack,
  Box
} from "@shopify/polaris";
import {
  PlusIcon,
  EditIcon,
  DeleteIcon,
  ExportIcon,
  ShareIcon,
  ThemeTemplateIcon,
  ViewIcon,
  SettingsIcon
} from "@shopify/polaris-icons";

// Types
interface Dashboard {
  id: number;
  dashboard_name: string;
  dashboard_slug: string;
  description?: string;
  is_default: boolean;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  last_viewed_at?: string;
  view_count: number;
  widgets?: Widget[];
}

interface Widget {
  id: number;
  widget_type: string;
  widget_title: string;
  data_source: string;
  is_visible: boolean;
  created_at: string;
}

interface Template {
  id: number;
  template_name: string;
  template_description?: string;
  template_category: string;
  tier_requirement: string;
  preview_image_url?: string;
}

interface LoaderData {
  dashboards: Dashboard[];
  templates: Template[];
  hasEnterpriseAccess: boolean;
  currentTier: string;
  shopName: string;
  error?: string;
}

// Loader function
export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const shopName = session?.shop?.replace(".myshopify.com", "");

    if (!shopName) {
      throw new Error("Unable to determine shop name");
    }

    // Check if user has Enterprise access
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
    const headers = {
      'Content-Type': 'application/json',
      'x-tenant-id': shopName
    };

    try {
      // Check tier features
      const tierResponse = await fetch(`${backendUrl}/api/analytics/tier-features`, {
        headers
      });

      const tierData = await tierResponse.json();
      const hasEnterpriseAccess = tierData.customDashboards === true;
      const currentTier = tierData.tier || 'starter';

      if (!hasEnterpriseAccess) {
        return json<LoaderData>({
          dashboards: [],
          templates: [],
          hasEnterpriseAccess: false,
          currentTier,
          shopName,
          error: "Custom dashboards are available only with Enterprise plan"
        });
      }

      // Fetch dashboards and templates in parallel
      const [dashboardsResponse, templatesResponse] = await Promise.all([
        fetch(`${backendUrl}/api/dashboards?include_widgets=false`, { headers }),
        fetch(`${backendUrl}/api/dashboards/templates`, { headers })
      ]);

      const dashboards = dashboardsResponse.ok ?
        (await dashboardsResponse.json()).data || [] : [];

      const templates = templatesResponse.ok ?
        (await templatesResponse.json()).data || [] : [];

      return json<LoaderData>({
        dashboards,
        templates,
        hasEnterpriseAccess: true,
        currentTier,
        shopName
      });

    } catch (backendError: unknown) {
      console.error("Backend API error:", backendError);
      return json<LoaderData>({
        dashboards: [],
        templates: [],
        hasEnterpriseAccess: false,
        currentTier: 'starter',
        shopName,
        error: "Unable to connect to dashboard service"
      });
    }

  } catch (error: unknown) {
    console.error("Dashboard loader error:", error);
    throw redirect("/app");
  }
};

// Action function for dashboard operations
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const shopName = session?.shop?.replace(".myshopify.com", "");
    const formData = await request.formData();
    const action = formData.get("action");

    if (!shopName) {
      throw new Error("Unable to determine shop name");
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
    const headers = {
      'Content-Type': 'application/json',
      'x-tenant-id': shopName
    };

    switch (action) {
      case "create_dashboard": {
        const name = formData.get("dashboard_name");
        const description = formData.get("description");

        const response = await fetch(`${backendUrl}/api/dashboards`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            dashboard_name: name,
            description
          })
        });

        return json(await response.json());
      }

      case "create_from_template": {
        const templateId = formData.get("template_id");
        const name = formData.get("dashboard_name");

        const response = await fetch(`${backendUrl}/api/dashboards/from-template`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            template_id: parseInt(templateId as string),
            dashboard_name: name
          })
        });

        return json(await response.json());
      }

      case "delete_dashboard": {
        const dashboardId = formData.get("dashboard_id");

        const response = await fetch(`${backendUrl}/api/dashboards/${dashboardId}`, {
          method: 'DELETE',
          headers
        });

        return json(await response.json());
      }

      case "export_dashboard": {
        const dashboardId = formData.get("dashboard_id");
        const format = formData.get("format") || "json";

        const response = await fetch(`${backendUrl}/api/dashboards/${dashboardId}/export`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ format })
        });

        return json(await response.json());
      }

      default:
        return json({ success: false, error: "Unknown action" });
    }

  } catch (error: unknown) {
    console.error("Dashboard action error:", error);
    return json({ success: false, error: (error as Error).message });
  }
};

// Main component
export default function CustomDashboards() {
  const {
    dashboards,
    templates,
    hasEnterpriseAccess,
    currentTier,
    shopName,
    error: loaderError
  } = useLoaderData<typeof loader>();

  const navigate = useNavigate();
  const submit = useSubmit();
  const fetcher = useFetcher();

  // State management
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [newDashboardName, setNewDashboardName] = useState("");
  const [newDashboardDescription, setNewDashboardDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(loaderError || "");

  // Popover states for each dashboard
  const [popoverActive, setPopoverActive] = useState<{[key: number]: boolean}>({});

  // Handle create dashboard
  const handleCreateDashboard = useCallback(async () => {
    if (!newDashboardName.trim()) {
      setError("Dashboard name is required");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("action", "create_dashboard");
    formData.append("dashboard_name", newDashboardName);
    formData.append("description", newDashboardDescription);

    submit(formData, { method: "post" });

    setShowCreateModal(false);
    setNewDashboardName("");
    setNewDashboardDescription("");
    setLoading(false);
  }, [newDashboardName, newDashboardDescription, submit]);

  // Handle create from template
  const handleCreateFromTemplate = useCallback(async () => {
    if (!selectedTemplate || !newDashboardName.trim()) {
      setError("Template and dashboard name are required");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("action", "create_from_template");
    formData.append("template_id", selectedTemplate.id.toString());
    formData.append("dashboard_name", newDashboardName);

    submit(formData, { method: "post" });

    setShowTemplateModal(false);
    setSelectedTemplate(null);
    setNewDashboardName("");
    setLoading(false);
  }, [selectedTemplate, newDashboardName, submit]);

  // Handle delete dashboard
  const handleDeleteDashboard = useCallback((dashboardId: number) => {
    if (confirm("Are you sure you want to delete this dashboard? This action cannot be undone.")) {
      const formData = new FormData();
      formData.append("action", "delete_dashboard");
      formData.append("dashboard_id", dashboardId.toString());

      submit(formData, { method: "post" });
    }
  }, [submit]);

  // Handle export dashboard
  const handleExportDashboard = useCallback((dashboardId: number, format: string = "json") => {
    const formData = new FormData();
    formData.append("action", "export_dashboard");
    formData.append("dashboard_id", dashboardId.toString());
    formData.append("format", format);

    submit(formData, { method: "post" });
  }, [submit]);

  // Toggle popover
  const togglePopover = useCallback((dashboardId: number) => {
    setPopoverActive(prev => ({
      ...prev,
      [dashboardId]: !prev[dashboardId]
    }));
  }, []);

  // Clear error
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // If no Enterprise access, show upgrade prompt
  if (!hasEnterpriseAccess) {
    return (
      <Page title="Custom Dashboards">
        <Layout>
          <Layout.Section>
            <Card>
              <EmptyState
                heading="Enterprise Feature"
                action={{
                  content: "Upgrade to Enterprise",
                  url: "/app/billing"
                }}
                image="https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"
              >
                <p>
                  Custom dashboards are available exclusively with the Enterprise plan ($199/month).
                  Create personalized analytics views, drag-and-drop widgets, and build the perfect
                  dashboard for your business needs.
                </p>
                <div style={{ marginTop: "1rem" }}>
                  <Text variant="bodyMd" as="p" fontWeight="semibold">
                    Enterprise Features Include:
                  </Text>
                  <ul style={{ marginTop: "0.5rem", paddingLeft: "1rem" }}>
                    <li>Unlimited custom dashboards</li>
                    <li>Drag-and-drop dashboard builder</li>
                    <li>Custom KPI definitions</li>
                    <li>Advanced visualization options</li>
                    <li>Dashboard sharing and export</li>
                    <li>Real-time data updates</li>
                  </ul>
                </div>
                <div style={{ marginTop: "1rem" }}>
                  <Badge tone="warning">{`Current Plan: ${currentTier.toUpperCase()}`}</Badge>
                </div>
              </EmptyState>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  // Main dashboard interface
  return (
    <Page
      title="Custom Dashboards"
      subtitle={`Enterprise feature \u2022 ${dashboards.length} dashboard${dashboards.length !== 1 ? 's' : ''}`}
      primaryAction={{
        content: "Create Dashboard",
        onAction: () => setShowCreateModal(true)
      }}
      secondaryActions={[
        {
          content: "Browse Templates",
          onAction: () => setShowTemplateModal(true)
        }
      ]}
    >
      <Layout>
        {/* Error Banner */}
        {error && (
          <Layout.Section>
            <Banner
              title="Error"
              tone="critical"
              onDismiss={() => setError("")}
            >
              <p>{error}</p>
            </Banner>
          </Layout.Section>
        )}

        {/* Loading State */}
        {loading && (
          <Layout.Section>
            <Card>
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <Spinner size="large" />
                <div style={{ marginTop: "1rem" }}>
                  <Text variant="bodyMd" as="p">Processing dashboard operation...</Text>
                </div>
              </div>
            </Card>
          </Layout.Section>
        )}

        {/* Dashboard List */}
        <Layout.Section>
          {dashboards.length === 0 ? (
            <Card>
              <EmptyState
                heading="No custom dashboards yet"
                action={{
                  content: "Create your first dashboard",
                  onAction: () => setShowCreateModal(true)
                }}
                secondaryAction={{
                  content: "Browse templates",
                  onAction: () => setShowTemplateModal(true)
                }}
                image="https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"
              >
                <p>
                  Build custom analytics dashboards tailored to your business needs.
                  Start from scratch or choose from our pre-built templates.
                </p>
              </EmptyState>
            </Card>
          ) : (
            <Card>
              <ResourceList
                resourceName={{ singular: 'dashboard', plural: 'dashboards' }}
                items={dashboards}
                renderItem={(dashboard) => {
                  const {
                    id,
                    dashboard_name,
                    description,
                    is_default,
                    view_count,
                    updated_at,
                    widgets
                  } = dashboard;

                  const shortcutActions = [
                    {
                      content: "View Dashboard",
                      onAction: () => navigate(`/app/dashboards/${id}`)
                    },
                    {
                      content: "Edit Dashboard",
                      onAction: () => navigate(`/app/dashboards/${id}/edit`)
                    },
                    {
                      content: "Export as JSON",
                      onAction: () => handleExportDashboard(id, "json")
                    },
                    {
                      content: "Delete Dashboard",
                      destructive: true,
                      onAction: () => handleDeleteDashboard(id)
                    }
                  ];

                  return (
                    <ResourceItem
                      id={id.toString()}
                      url={`/app/dashboards/${id}`}
                      accessibilityLabel={`View dashboard ${dashboard_name}`}
                      media={
                        <Avatar
                          size="md"
                          name={dashboard_name}
                        />
                      }
                      shortcutActions={shortcutActions}
                    >
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="200">
                          <InlineStack gap="200">
                            <Text variant="bodyMd" as="p" fontWeight="semibold">
                              {dashboard_name}
                            </Text>
                            {is_default && (
                              <Badge tone="info">Default</Badge>
                            )}
                          </InlineStack>
                          {description && (
                            <Text variant="bodySm" as="span" tone="subdued">
                              {description}
                            </Text>
                          )}
                          <InlineStack gap="200">
                            <Text variant="bodySm" as="span" tone="subdued">
                              {widgets?.length || 0} widgets \u2022 {view_count} views
                            </Text>
                            <Text variant="bodySm" as="span" tone="subdued">
                              Updated {new Date(updated_at).toLocaleDateString()}
                            </Text>
                          </InlineStack>
                        </BlockStack>

                        <Popover
                          active={popoverActive[id] || false}
                          activator={
                            <Button
                              disclosure
                              size="slim"
                              onClick={() => togglePopover(id)}
                            >
                              Actions
                            </Button>
                          }
                          onClose={() => togglePopover(id)}
                        >
                          <ActionList
                            items={[
                              {
                                content: "View Dashboard",
                                icon: ViewIcon,
                                onAction: () => {
                                  navigate(`/app/dashboards/${id}`);
                                  togglePopover(id);
                                }
                              },
                              {
                                content: "Edit Dashboard",
                                icon: EditIcon,
                                onAction: () => {
                                  navigate(`/app/dashboards/${id}/edit`);
                                  togglePopover(id);
                                }
                              },
                              {
                                content: "Export Dashboard",
                                icon: ExportIcon,
                                onAction: () => {
                                  handleExportDashboard(id);
                                  togglePopover(id);
                                }
                              },
                              {
                                content: "Delete Dashboard",
                                icon: DeleteIcon,
                                destructive: true,
                                onAction: () => {
                                  handleDeleteDashboard(id);
                                  togglePopover(id);
                                }
                              }
                            ]}
                          />
                        </Popover>
                      </InlineStack>
                    </ResourceItem>
                  );
                }}
              />
            </Card>
          )}
        </Layout.Section>

        {/* Create Dashboard Modal */}
        <Modal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Dashboard"
          primaryAction={{
            content: "Create Dashboard",
            onAction: handleCreateDashboard,
            loading: fetcher.state === "submitting"
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setShowCreateModal(false)
            }
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <TextField
                label="Dashboard Name"
                value={newDashboardName}
                onChange={setNewDashboardName}
                placeholder="e.g., Q4 Performance Overview"
                autoComplete="off"
              />
              <TextField
                label="Description (optional)"
                value={newDashboardDescription}
                onChange={setNewDashboardDescription}
                placeholder="Brief description of what this dashboard shows"
                multiline={3}
                autoComplete="off"
              />
            </BlockStack>
          </Modal.Section>
        </Modal>

        {/* Template Selection Modal */}
        <Modal
          open={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          title="Choose Dashboard Template"
          primaryAction={{
            content: "Create from Template",
            onAction: handleCreateFromTemplate,
            disabled: !selectedTemplate || !newDashboardName,
            loading: fetcher.state === "submitting"
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setShowTemplateModal(false)
            }
          ]}
          size="large"
        >
          <Modal.Section>
            <BlockStack gap="400">
              <TextField
                label="Dashboard Name"
                value={newDashboardName}
                onChange={setNewDashboardName}
                placeholder="e.g., My Performance Dashboard"
                autoComplete="off"
              />

              <Text variant="headingMd" as="h3">Available Templates</Text>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "1rem"
              }}>
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    background={selectedTemplate?.id !== template.id ? "bg-surface-secondary" : undefined}
                  >
                    <div
                      style={{
                        padding: "1rem",
                        cursor: "pointer",
                        border: selectedTemplate?.id === template.id
                          ? "2px solid #5C6AC4"
                          : "2px solid transparent"
                      }}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <BlockStack gap="200">
                        <InlineStack align="space-between">
                          <Text variant="bodyMd" as="p" fontWeight="semibold">
                            {template.template_name}
                          </Text>
                          <Badge>{template.template_category}</Badge>
                        </InlineStack>
                        <Text variant="bodySm" as="span" tone="subdued">
                          {template.template_description}
                        </Text>
                        <Badge tone="info">
                          {`${template.tier_requirement.toUpperCase()} tier`}
                        </Badge>
                      </BlockStack>
                    </div>
                  </Card>
                ))}
              </div>
            </BlockStack>
          </Modal.Section>
        </Modal>
      </Layout>
    </Page>
  );
}
