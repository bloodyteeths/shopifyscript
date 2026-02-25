import type { MetaFunction, LoaderFunction, ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import { useState, useEffect } from "react";
import {
  Card,
  Page,
  Layout,
  Badge,
  Button,
  TextField,
  Select,
  Text,
  Banner,
  Modal,
  ButtonGroup,
  DataTable,
  EmptyState,
  Spinner,
  BlockStack,
  InlineStack,
  Box,
} from "@shopify/polaris";

export const meta: MetaFunction = () => {
  return [
    { title: "Support - Ads Autopilot AI" },
    { name: "description", content: "In-app support center with tier-based assistance" },
  ];
};

// Loader to get user's subscription tier and support data
export const loader: LoaderFunction = async ({ request }) => {
  // In production, this would:
  // 1. Check user session/authentication
  // 2. Get tenant ID from session
  // 3. Fetch subscription tier from database
  // 4. Fetch existing support tickets
  // 5. Get contact methods for tier

  // Mock data for demonstration
  const mockTier: string = "professional"; // Could be "starter", "professional", "enterprise"
  const mockContactMethods = {
    subscription_tier: mockTier,
    email_support: true,
    phone_support: mockTier === "enterprise",
    priority_routing: ["professional", "enterprise"].includes(mockTier),
    dedicated_manager: mockTier === "enterprise",
    support_email: "support@adsautopilot.com",
    support_phone: mockTier === "enterprise" ? "+1-800-ADS_AUTOPILOT_AI" : null,
    guaranteed_response_hours: mockTier === "enterprise" ? 6 : mockTier === "professional" ? 12 : 24,
    guaranteed_resolution_hours: mockTier === "enterprise" ? 24 : mockTier === "professional" ? 48 : null
  };

  const mockTickets = [
    {
      id: 1,
      ticket_number: "SUP-20241201-0001",
      subject: "Campaign optimization not working",
      status: "in_progress",
      priority: "high",
      category: "technical",
      created_at: "2024-12-01T10:00:00Z",
      first_response_at: "2024-12-01T11:30:00Z",
      sla_response_breached: false,
      sla_resolution_breached: false
    },
    {
      id: 2,
      ticket_number: "SUP-20241130-0003",
      subject: "Billing question about upgrade",
      status: "resolved",
      priority: "normal",
      category: "billing",
      created_at: "2024-11-30T14:00:00Z",
      resolved_at: "2024-11-30T16:45:00Z",
      sla_response_breached: false,
      sla_resolution_breached: false
    }
  ];

  return json({
    tier: mockTier,
    contactMethods: mockContactMethods,
    tickets: mockTickets,
    tenant: "demo-tenant-123" // In production, get from session
  });
};

// Action to handle form submissions (create ticket, add message, etc.)
export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create_ticket") {
    // In production, this would call your support API
    const ticketData = {
      subject: formData.get("subject"),
      description: formData.get("description"),
      category: formData.get("category"),
      priority: formData.get("priority"),
      customer_name: formData.get("customer_name"),
      customer_email: formData.get("customer_email"),
      customer_phone: formData.get("customer_phone"),
    };

    console.log("Creating ticket:", ticketData);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return json({
      success: true,
      message: "Support ticket created successfully!",
      ticket_number: "SUP-20241201-0005"
    });
  }

  return json({ success: false, message: "Unknown action" });
};

interface TicketFormData {
  subject: string;
  description: string;
  category: string;
  priority: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
}

export default function AppSupport() {
  const { tier, contactMethods, tickets, tenant } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);
  const [formData, setFormData] = useState<TicketFormData>({
    subject: "",
    description: "",
    category: "general",
    priority: "normal",
    customer_name: "",
    customer_email: "",
    customer_phone: ""
  });

  const isSubmitting = navigation.state === "submitting";

  // Reset form and close modal on successful submission
  useEffect(() => {
    if (actionData?.success) {
      setShowCreateForm(false);
      setFormData({
        subject: "",
        description: "",
        category: "general",
        priority: "normal",
        customer_name: "",
        customer_email: "",
        customer_phone: ""
      });
    }
  }, [actionData]);

  const getTierDisplayName = (tier: string) => {
    const tierNames = {
      starter: "Starter Plan",
      professional: "Professional Plan",
      enterprise: "Enterprise Plan"
    };
    return tierNames[tier as keyof typeof tierNames] || "Unknown Plan";
  };

  const getTierBadgeTone = (tier: string): "warning" | "info" | undefined => {
    return tier === "enterprise" ? "warning" : tier === "professional" ? "info" : undefined;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { tone: "info" | "success" | "warning" | "critical" | "attention" | undefined; label: string }> = {
      open: { tone: undefined, label: "Open" },
      in_progress: { tone: "info", label: "In Progress" },
      pending_customer: { tone: "attention", label: "Pending Customer" },
      resolved: { tone: "success", label: "Resolved" },
      closed: { tone: undefined, label: "Closed" }
    };
    return statusMap[status] || { tone: undefined, label: status };
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { tone: "info" | "success" | "warning" | "critical" | "attention" | undefined; label: string }> = {
      low: { tone: undefined, label: "Low" },
      normal: { tone: "info", label: "Normal" },
      high: { tone: "attention", label: "High" },
      urgent: { tone: "critical", label: "Urgent" }
    };
    return priorityMap[priority] || { tone: undefined, label: priority };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Prepare tickets data for DataTable
  const ticketRows = tickets.map((ticket: any) => {
    const statusBadge = getStatusBadge(ticket.status);
    const priorityBadge = getPriorityBadge(ticket.priority);
    return [
      ticket.ticket_number,
      ticket.subject,
      <Badge key={ticket.id} tone={statusBadge.tone}>{statusBadge.label}</Badge>,
      <Badge key={`priority-${ticket.id}`} tone={priorityBadge.tone}>{priorityBadge.label}</Badge>,
      ticket.category,
      formatDate(ticket.created_at),
      <Button
        key={`view-${ticket.id}`}
        size="slim"
        onClick={() => setSelectedTicket(ticket.id)}
      >
        View
      </Button>
    ];
  });

  return (
    <Page
      title="Support Center"
      subtitle={`${getTierDisplayName(tier)} - Get help when you need it`}
    >
      {actionData?.success && (
        <Banner
          title="Success"
          tone="success"
          onDismiss={() => {}}
        >
          <p>{actionData.message}</p>
          {actionData.ticket_number && (
            <p>Ticket number: <strong>{actionData.ticket_number}</strong></p>
          )}
        </Banner>
      )}

      {actionData?.success === false && (
        <Banner
          title="Error"
          tone="critical"
          onDismiss={() => {}}
        >
          <p>{actionData.message}</p>
        </Banner>
      )}

      <Layout>
        {/* Support Level Overview */}
        <Layout.Section>
          <Card>
            <Box padding="500">
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingLg" as="h2">
                    Your Support Level
                  </Text>
                  <Badge tone={getTierBadgeTone(tier)}>
                    {getTierDisplayName(tier)}
                  </Badge>
                </InlineStack>

                <InlineStack gap="400" align="space-evenly">
                  {contactMethods.email_support && (
                    <BlockStack gap="200">
                      <Text variant="bodyMd" as="p" fontWeight="semibold">Email Support</Text>
                      <Text variant="bodySm" as="span" tone="subdued">
                        Response within {contactMethods.guaranteed_response_hours}h
                      </Text>
                    </BlockStack>
                  )}

                  {contactMethods.phone_support && (
                    <BlockStack gap="200">
                      <Text variant="bodyMd" as="p" fontWeight="semibold">Phone Support</Text>
                      <Text variant="bodySm" as="span" tone="subdued">
                        {contactMethods.support_phone}
                      </Text>
                    </BlockStack>
                  )}

                  {contactMethods.priority_routing && (
                    <BlockStack gap="200">
                      <Text variant="bodyMd" as="p" fontWeight="semibold">Priority Routing</Text>
                      <Text variant="bodySm" as="span" tone="subdued">
                        Fast-tracked support
                      </Text>
                    </BlockStack>
                  )}

                  {contactMethods.dedicated_manager && (
                    <BlockStack gap="200">
                      <Text variant="bodyMd" as="p" fontWeight="semibold">Account Manager</Text>
                      <Text variant="bodySm" as="span" tone="subdued">
                        Dedicated support contact
                      </Text>
                    </BlockStack>
                  )}
                </InlineStack>

                <ButtonGroup>
                  <Button
                    variant="primary"
                    onClick={() => setShowCreateForm(true)}
                  >
                    Create Support Ticket
                  </Button>
                  <Button
                    url={`mailto:${contactMethods.support_email}`}
                    external
                  >
                    Email Support
                  </Button>
                  {contactMethods.phone_support && (
                    <Button
                      url={`tel:${contactMethods.support_phone}`}
                      external
                    >
                      Call Support
                    </Button>
                  )}
                </ButtonGroup>
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>

        {/* Support Tickets */}
        <Layout.Section>
          <Card>
            <Box padding="500">
              <BlockStack gap="400">
                <Text variant="headingLg" as="h2">Your Support Tickets</Text>

                {tickets.length > 0 ? (
                  <DataTable
                    columnContentTypes={[
                      'text',
                      'text',
                      'text',
                      'text',
                      'text',
                      'text',
                      'text'
                    ]}
                    headings={[
                      'Ticket #',
                      'Subject',
                      'Status',
                      'Priority',
                      'Category',
                      'Created',
                      'Action'
                    ]}
                    rows={ticketRows}
                    footerContent={`Showing ${tickets.length} of ${tickets.length} tickets`}
                  />
                ) : (
                  <EmptyState
                    heading="No support tickets yet"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>When you create support tickets, they'll appear here.</p>
                    <Button
                      variant="primary"
                      onClick={() => setShowCreateForm(true)}
                    >
                      Create Your First Ticket
                    </Button>
                  </EmptyState>
                )}
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>

        {/* SLA Information */}
        <Layout.Section variant="oneThird">
          <Card>
            <Box padding="500">
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">Service Level Agreement</Text>

                <BlockStack gap="200">
                  <InlineStack blockAlign="center" gap="200">
                    <Text variant="bodyMd" as="p">
                      <strong>Response Time:</strong> {contactMethods.guaranteed_response_hours} hours
                    </Text>
                  </InlineStack>

                  {contactMethods.guaranteed_resolution_hours && (
                    <InlineStack blockAlign="center" gap="200">
                      <Text variant="bodyMd" as="p">
                        <strong>Resolution Time:</strong> {contactMethods.guaranteed_resolution_hours} hours
                      </Text>
                    </InlineStack>
                  )}
                </BlockStack>

                <Text variant="bodySm" as="span" tone="subdued">
                  All times are calculated during business hours (Monday-Friday, 9 AM - 6 PM EST).
                  {tier !== "starter" && " Priority routing ensures your tickets are handled by senior support staff."}
                </Text>

                {tier === "starter" && (
                  <Banner tone="info">
                    <p>Upgrade to Professional or Enterprise for faster response times and additional support channels.</p>
                  </Banner>
                )}
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Create Ticket Modal */}
      <Modal
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="Create Support Ticket"
        primaryAction={{
          content: isSubmitting ? "Creating..." : "Create Ticket",
          loading: isSubmitting,
          onAction: () => {
            const form = document.getElementById("support-ticket-form") as HTMLFormElement;
            if (form) {
              form.requestSubmit();
            }
          }
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setShowCreateForm(false)
          }
        ]}
        size="large"
      >
        <Modal.Section>
          <Form method="post" id="support-ticket-form">
            <input type="hidden" name="intent" value="create_ticket" />
            <input type="hidden" name="tenant" value={tenant} />

            <BlockStack gap="400">
              <TextField
                label="Your Name"
                value={formData.customer_name}
                onChange={(value) => setFormData(prev => ({ ...prev, customer_name: value }))}
                name="customer_name"
                autoComplete="name"
                requiredIndicator
              />

              <TextField
                label="Email Address"
                type="email"
                value={formData.customer_email}
                onChange={(value) => setFormData(prev => ({ ...prev, customer_email: value }))}
                name="customer_email"
                autoComplete="email"
                requiredIndicator
              />

              {tier === "enterprise" && (
                <TextField
                  label="Phone Number (for phone support callback)"
                  type="tel"
                  value={formData.customer_phone}
                  onChange={(value) => setFormData(prev => ({ ...prev, customer_phone: value }))}
                  name="customer_phone"
                  autoComplete="tel"
                  helpText="Enterprise customers can request a phone callback for urgent issues"
                />
              )}

              <InlineStack gap="400">
                <div style={{ flex: 1 }}>
                  <Select
                    label="Category"
                    options={[
                      { label: "General", value: "general" },
                      { label: "Technical", value: "technical" },
                      { label: "Billing", value: "billing" },
                      ...(tier === "enterprise" ? [{ label: "Urgent", value: "urgent" }] : [])
                    ]}
                    value={formData.category}
                    onChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    name="category"
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <Select
                    label="Priority"
                    options={[
                      { label: "Low", value: "low" },
                      { label: "Normal", value: "normal" },
                      ...(["professional", "enterprise"].includes(tier) ? [{ label: "High", value: "high" }] : []),
                      ...(tier === "enterprise" ? [{ label: "Urgent", value: "urgent" }] : [])
                    ]}
                    value={formData.priority}
                    onChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                    name="priority"
                  />
                </div>
              </InlineStack>

              <TextField
                label="Subject"
                value={formData.subject}
                onChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
                name="subject"
                placeholder="Brief description of your issue"
                autoComplete="off"
                requiredIndicator
              />

              <TextField
                label="Description"
                value={formData.description}
                onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                name="description"
                multiline={6}
                placeholder="Please provide detailed information about your issue, including any error messages, steps to reproduce, and what you expected to happen..."
                helpText="The more details you provide, the faster we can help resolve your issue."
                autoComplete="off"
                requiredIndicator
              />

              {tier === "starter" && (formData.priority === "high" || formData.priority === "urgent") && (
                <Banner tone="info">
                  <p>High and Urgent priorities are available for Professional and Enterprise customers. Your ticket will be processed as Normal priority.</p>
                </Banner>
              )}

              {tier !== "enterprise" && formData.category === "urgent" && (
                <Banner tone="info">
                  <p>Urgent category is available for Enterprise customers only. Your ticket will be processed as Technical category.</p>
                </Banner>
              )}
            </BlockStack>
          </Form>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
