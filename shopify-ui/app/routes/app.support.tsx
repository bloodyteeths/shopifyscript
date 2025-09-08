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
  const mockTier = "professional"; // Could be "starter", "professional", "enterprise"
  const mockContactMethods = {
    subscription_tier: mockTier,
    email_support: true,
    phone_support: mockTier === "enterprise",
    priority_routing: ["professional", "enterprise"].includes(mockTier),
    dedicated_manager: mockTier === "enterprise",
    support_email: "support@proofkit.com",
    support_phone: mockTier === "enterprise" ? "+1-800-PROOFKIT" : null,
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

  const getTierBadgeStatus = (tier: string) => {
    return tier === "enterprise" ? "warning" : tier === "professional" ? "info" : "default";
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      open: { status: "default" as const, label: "Open" },
      in_progress: { status: "info" as const, label: "In Progress" },
      pending_customer: { status: "attention" as const, label: "Pending Customer" },
      resolved: { status: "success" as const, label: "Resolved" },
      closed: { status: "default" as const, label: "Closed" }
    };
    return statusMap[status as keyof typeof statusMap] || { status: "default" as const, label: status };
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap = {
      low: { status: "default" as const, label: "Low" },
      normal: { status: "info" as const, label: "Normal" },
      high: { status: "attention" as const, label: "High" },
      urgent: { status: "critical" as const, label: "Urgent" }
    };
    return priorityMap[priority as keyof typeof priorityMap] || { status: "default" as const, label: priority };
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
  const ticketRows = tickets.map((ticket: any) => [
    ticket.ticket_number,
    ticket.subject,
    <Badge key={ticket.id} {...getStatusBadge(ticket.status)}>{getStatusBadge(ticket.status).label}</Badge>,
    <Badge key={`priority-${ticket.id}`} {...getPriorityBadge(ticket.priority)}>{getPriorityBadge(ticket.priority).label}</Badge>,
    ticket.category,
    formatDate(ticket.created_at),
    <Button
      key={`view-${ticket.id}`}
      size="slim"
      onClick={() => setSelectedTicket(ticket.id)}
    >
      View
    </Button>
  ]);

  return (
    <Page
      title="Support Center"
      subtitle={`${getTierDisplayName(tier)} - Get help when you need it`}
    >
      {actionData?.success && (
        <Banner
          title="Success"
          status="success"
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
          status="critical"
          onDismiss={() => {}}
        >
          <p>{actionData.message}</p>
        </Banner>
      )}

      <Layout>
        {/* Support Level Overview */}
        <Layout.Section>
          <Card>
            <div style={{ padding: "1.5rem" }}>
              <Stack vertical spacing="loose">
                <Stack alignment="center">
                  <Stack.Item fill>
                    <Text variant="headingLg" as="h2">
                      Your Support Level
                    </Text>
                  </Stack.Item>
                  <Badge {...{ status: getTierBadgeStatus(tier) }}>
                    {getTierDisplayName(tier)}
                  </Badge>
                </Stack>

                <Stack distribution="fillEvenly" spacing="loose">
                  {contactMethods.email_support && (
                    <Stack vertical spacing="tight">
                      <EmailMajor />
                      <Text variant="bodyMd" fontWeight="semibold">Email Support</Text>
                      <Text variant="bodySm" color="subdued">
                        Response within {contactMethods.guaranteed_response_hours}h
                      </Text>
                    </Stack>
                  )}

                  {contactMethods.phone_support && (
                    <Stack vertical spacing="tight">
                      <PhoneMajor />
                      <Text variant="bodyMd" fontWeight="semibold">Phone Support</Text>
                      <Text variant="bodySm" color="subdued">
                        {contactMethods.support_phone}
                      </Text>
                    </Stack>
                  )}

                  {contactMethods.priority_routing && (
                    <Stack vertical spacing="tight">
                      <AlertMajor />
                      <Text variant="bodyMd" fontWeight="semibold">Priority Routing</Text>
                      <Text variant="bodySm" color="subdued">
                        Fast-tracked support
                      </Text>
                    </Stack>
                  )}

                  {contactMethods.dedicated_manager && (
                    <Stack vertical spacing="tight">
                      <CustomersMajor />
                      <Text variant="bodyMd" fontWeight="semibold">Account Manager</Text>
                      <Text variant="bodySm" color="subdued">
                        Dedicated support contact
                      </Text>
                    </Stack>
                  )}
                </Stack>

                <ButtonGroup>
                  <Button
                    primary
                    icon={TicketMajor}
                    onClick={() => setShowCreateForm(true)}
                  >
                    Create Support Ticket
                  </Button>
                  <Button
                    url={`mailto:${contactMethods.support_email}`}
                    external
                    icon={EmailMajor}
                  >
                    Email Support
                  </Button>
                  {contactMethods.phone_support && (
                    <Button
                      url={`tel:${contactMethods.support_phone}`}
                      external
                      icon={PhoneMajor}
                    >
                      Call Support
                    </Button>
                  )}
                </ButtonGroup>
              </Stack>
            </div>
          </Card>
        </Layout.Section>

        {/* Support Tickets */}
        <Layout.Section>
          <Card>
            <div style={{ padding: "1.5rem" }}>
              <Stack vertical spacing="loose">
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
                      primary
                      onClick={() => setShowCreateForm(true)}
                    >
                      Create Your First Ticket
                    </Button>
                  </EmptyState>
                )}
              </Stack>
            </div>
          </Card>
        </Layout.Section>

        {/* SLA Information */}
        <Layout.Section secondary>
          <Card>
            <div style={{ padding: "1.5rem" }}>
              <Stack vertical spacing="loose">
                <Text variant="headingMd" as="h3">Service Level Agreement</Text>
                
                <Stack vertical spacing="tight">
                  <Stack alignment="center">
                    <ClockMajor />
                    <Text variant="bodyMd">
                      <strong>Response Time:</strong> {contactMethods.guaranteed_response_hours} hours
                    </Text>
                  </Stack>
                  
                  {contactMethods.guaranteed_resolution_hours && (
                    <Stack alignment="center">
                      <ClockMajor />
                      <Text variant="bodyMd">
                        <strong>Resolution Time:</strong> {contactMethods.guaranteed_resolution_hours} hours
                      </Text>
                    </Stack>
                  )}
                </Stack>

                <Text variant="bodySm" color="subdued">
                  All times are calculated during business hours (Monday-Friday, 9 AM - 6 PM EST).
                  {tier !== "starter" && " Priority routing ensures your tickets are handled by senior support staff."}
                </Text>

                {tier === "starter" && (
                  <Banner status="info">
                    <p>Upgrade to Professional or Enterprise for faster response times and additional support channels.</p>
                  </Banner>
                )}
              </Stack>
            </div>
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
        large
      >
        <Modal.Section>
          <Form method="post" id="support-ticket-form">
            <input type="hidden" name="intent" value="create_ticket" />
            <input type="hidden" name="tenant" value={tenant} />
            
            <Stack vertical spacing="loose">
              <TextField
                label="Your Name"
                value={formData.customer_name}
                onChange={(value) => setFormData(prev => ({ ...prev, customer_name: value }))}
                name="customer_name"
                autoComplete="name"
                required
              />

              <TextField
                label="Email Address"
                type="email"
                value={formData.customer_email}
                onChange={(value) => setFormData(prev => ({ ...prev, customer_email: value }))}
                name="customer_email"
                autoComplete="email"
                required
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

              <Stack distribution="fillEvenly">
                <Stack.Item fill>
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
                </Stack.Item>

                <Stack.Item fill>
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
                </Stack.Item>
              </Stack>

              <TextField
                label="Subject"
                value={formData.subject}
                onChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
                name="subject"
                placeholder="Brief description of your issue"
                required
              />

              <TextField
                label="Description"
                value={formData.description}
                onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                name="description"
                multiline={6}
                placeholder="Please provide detailed information about your issue, including any error messages, steps to reproduce, and what you expected to happen..."
                helpText="The more details you provide, the faster we can help resolve your issue."
                required
              />

              {tier === "starter" && (formData.priority === "high" || formData.priority === "urgent") && (
                <Banner status="info">
                  <p>High and Urgent priorities are available for Professional and Enterprise customers. Your ticket will be processed as Normal priority.</p>
                </Banner>
              )}

              {tier !== "enterprise" && formData.category === "urgent" && (
                <Banner status="info">
                  <p>Urgent category is available for Enterprise customers only. Your ticket will be processed as Technical category.</p>
                </Banner>
              )}
            </Stack>
          </Form>
        </Modal.Section>
      </Modal>
    </Page>
  );
}