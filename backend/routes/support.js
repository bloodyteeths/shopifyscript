/**
 * ProofKit Support API Routes  
 * Tier-based support ticket system with SLA enforcement
 */

import express from 'express';
import SupportSystemService from '../services/support-system.js';
import { requireActiveSubscription, requireTier } from '../middleware/subscription-check.js';

const router = express.Router();
const supportService = new SupportSystemService();

/**
 * Create new support ticket
 * Available to all paid tiers (starter+)
 */
router.post('/tickets', requireActiveSubscription(), async (req, res) => {
  try {
    const {
      tenant,
      subject,
      description, 
      category, // 'technical', 'billing', 'general', 'urgent'
      priority = 'normal', // 'low', 'normal', 'high', 'urgent'
      customer_name,
      customer_email,
      customer_phone
    } = req.body;

    // Validate required fields
    if (!tenant || !subject || !description || !category || !customer_email) {
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        message: 'Required fields: tenant, subject, description, category, customer_email'
      });
    }

    // Validate category
    const validCategories = ['technical', 'billing', 'general', 'urgent'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_category',
        message: 'Category must be one of: technical, billing, general, urgent'
      });
    }

    // Validate priority
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_priority', 
        message: 'Priority must be one of: low, normal, high, urgent'
      });
    }

    // Enterprise tier can use 'urgent' category and priority
    // Professional can use 'high' priority
    // Starter is limited to 'normal' and 'low'
    const subscription = req.subscription;
    
    if (category === 'urgent' && subscription.tier !== 'enterprise') {
      return res.status(402).json({
        ok: false,
        error: 'tier_restriction',
        message: 'Urgent category is only available for Enterprise customers',
        upgradeUrl: '/app/billing'
      });
    }

    if (priority === 'urgent' && subscription.tier !== 'enterprise') {
      return res.status(402).json({
        ok: false,
        error: 'tier_restriction',
        message: 'Urgent priority is only available for Enterprise customers',
        upgradeUrl: '/app/billing'
      });
    }

    if (priority === 'high' && !['professional', 'enterprise'].includes(subscription.tier)) {
      return res.status(402).json({
        ok: false,
        error: 'tier_restriction',
        message: 'High priority is only available for Professional and Enterprise customers',
        upgradeUrl: '/app/billing'
      });
    }

    // Create the ticket
    const ticket = await supportService.createTicket({
      tenant_id: tenant,
      subject,
      description,
      category,
      priority,
      customer_name,
      customer_email,
      customer_phone
    });

    res.json({
      ok: true,
      ticket: {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        subscription_tier: ticket.subscription_tier,
        support_tier: ticket.support_tier,
        sla_response_hours: ticket.sla_response_hours,
        sla_resolution_hours: ticket.sla_resolution_hours,
        created_at: ticket.created_at
      }
    });

  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({
      ok: false,
      error: 'create_ticket_failed',
      message: error.message || 'Failed to create support ticket'
    });
  }
});

/**
 * Get tickets for a tenant
 * Available to all paid tiers (starter+)
 */
router.get('/tickets', requireActiveSubscription(), async (req, res) => {
  try {
    const { tenant } = req.query;
    const {
      status,
      category,
      priority,
      limit = 20,
      offset = 0,
      include_messages = 'false'
    } = req.query;

    if (!tenant) {
      return res.status(400).json({
        ok: false,
        error: 'tenant_required',
        message: 'Tenant ID is required'
      });
    }

    const options = {
      status: status || undefined,
      category: category || undefined, 
      priority: priority || undefined,
      limit: Math.min(parseInt(limit), 100), // Max 100 per request
      offset: parseInt(offset),
      include_messages: include_messages === 'true'
    };

    const tickets = await supportService.getTickets(tenant, options);

    res.json({
      ok: true,
      tickets: tickets.map(ticket => ({
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        subscription_tier: ticket.subscription_tier,
        support_tier: ticket.support_tier,
        sla_response_hours: ticket.sla_response_hours,
        sla_resolution_hours: ticket.sla_resolution_hours,
        sla_response_breached: ticket.sla_response_breached,
        sla_resolution_breached: ticket.sla_resolution_breached,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        first_response_at: ticket.first_response_at,
        resolved_at: ticket.resolved_at,
        escalated: ticket.escalated,
        messages: ticket.messages || []
      })),
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: tickets.length
      }
    });

  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({
      ok: false,
      error: 'fetch_tickets_failed',
      message: error.message || 'Failed to fetch support tickets'
    });
  }
});

/**
 * Get single ticket with full details
 * Available to all paid tiers (starter+)
 */
router.get('/tickets/:ticketId', requireActiveSubscription(), async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { tenant } = req.query;

    if (!tenant) {
      return res.status(400).json({
        ok: false,
        error: 'tenant_required',
        message: 'Tenant ID is required'
      });
    }

    const ticket = await supportService.getTicket(parseInt(ticketId), tenant);

    res.json({
      ok: true,
      ticket: {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        customer_name: ticket.customer_name,
        customer_email: ticket.customer_email,
        customer_phone: ticket.customer_phone,
        subscription_tier: ticket.subscription_tier,
        support_tier: ticket.support_tier,
        sla_response_hours: ticket.sla_response_hours,
        sla_resolution_hours: ticket.sla_resolution_hours,
        sla_response_breached: ticket.sla_response_breached,
        sla_resolution_breached: ticket.sla_resolution_breached,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        first_response_at: ticket.first_response_at,
        resolved_at: ticket.resolved_at,
        closed_at: ticket.closed_at,
        escalated: ticket.escalated,
        escalated_at: ticket.escalated_at,
        assigned_agent: ticket.assigned_agent,
        messages: ticket.messages || []
      }
    });

  } catch (error) {
    console.error('Error fetching support ticket:', error);
    if (error.message === 'Ticket not found') {
      res.status(404).json({
        ok: false,
        error: 'ticket_not_found',
        message: 'Ticket not found'
      });
    } else {
      res.status(500).json({
        ok: false,
        error: 'fetch_ticket_failed',
        message: error.message || 'Failed to fetch support ticket'
      });
    }
  }
});

/**
 * Add message to existing ticket  
 * Available to all paid tiers (starter+)
 */
router.post('/tickets/:ticketId/messages', requireActiveSubscription(), async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { tenant, message, sender_name, sender_email } = req.body;

    if (!tenant || !message || !sender_email) {
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        message: 'Required fields: tenant, message, sender_email'
      });
    }

    // Verify ticket belongs to tenant (basic authorization)
    const existingTicket = await supportService.getTicket(parseInt(ticketId), tenant);
    if (!existingTicket) {
      return res.status(404).json({
        ok: false,
        error: 'ticket_not_found',
        message: 'Ticket not found'
      });
    }

    const ticketMessage = await supportService.addTicketMessage(parseInt(ticketId), {
      message_type: 'message',
      sender_type: 'customer',
      sender_name: sender_name || 'Customer',
      sender_email,
      message_content: message,
      is_public: true
    });

    res.json({
      ok: true,
      message: {
        id: ticketMessage.id,
        message_type: ticketMessage.message_type,
        sender_type: ticketMessage.sender_type,
        sender_name: ticketMessage.sender_name,
        sender_email: ticketMessage.sender_email,
        message_content: ticketMessage.message_content,
        created_at: ticketMessage.created_at
      }
    });

  } catch (error) {
    console.error('Error adding ticket message:', error);
    res.status(500).json({
      ok: false,
      error: 'add_message_failed',
      message: error.message || 'Failed to add message to ticket'
    });
  }
});

/**
 * Get available support contact methods for tenant's subscription tier
 * Available to all paid tiers (starter+)
 */
router.get('/contact-methods', requireActiveSubscription(), async (req, res) => {
  try {
    const subscription = req.subscription;
    
    const contactMethods = await supportService.getContactMethods(subscription.tier);
    
    if (!contactMethods) {
      return res.status(404).json({
        ok: false,
        error: 'contact_methods_not_found',
        message: 'Contact methods not configured for your subscription tier'
      });
    }

    res.json({
      ok: true,
      contact_methods: {
        subscription_tier: contactMethods.subscription_tier,
        email_support: contactMethods.email_support,
        phone_support: contactMethods.phone_support,
        chat_support: contactMethods.chat_support,
        priority_routing: contactMethods.priority_routing,
        dedicated_manager: contactMethods.dedicated_manager,
        support_email: contactMethods.support_email,
        support_phone: contactMethods.support_phone,
        guaranteed_response_hours: contactMethods.guaranteed_response_hours,
        guaranteed_resolution_hours: contactMethods.guaranteed_resolution_hours
      }
    });

  } catch (error) {
    console.error('Error fetching contact methods:', error);
    res.status(500).json({
      ok: false,
      error: 'fetch_contact_methods_failed',
      message: error.message || 'Failed to fetch contact methods'
    });
  }
});

/**
 * Get SLA information for tenant's subscription tier
 * Available to all paid tiers (starter+)
 */
router.get('/sla-info', requireActiveSubscription(), async (req, res) => {
  try {
    const subscription = req.subscription;
    const { category = 'general', priority = 'normal' } = req.query;

    const slaConfig = await supportService.getSLAConfig(subscription.tier, category, priority);
    
    if (!slaConfig) {
      return res.status(404).json({
        ok: false,
        error: 'sla_config_not_found',
        message: 'SLA configuration not found for your subscription tier'
      });
    }

    res.json({
      ok: true,
      sla_info: {
        subscription_tier: slaConfig.subscription_tier,
        ticket_category: slaConfig.ticket_category,
        ticket_priority: slaConfig.ticket_priority,
        response_time_hours: slaConfig.response_time_hours,
        resolution_time_hours: slaConfig.resolution_time_hours,
        support_channels: slaConfig.support_channels,
        business_hours_only: slaConfig.business_hours_only
      }
    });

  } catch (error) {
    console.error('Error fetching SLA info:', error);
    res.status(500).json({
      ok: false,
      error: 'fetch_sla_info_failed',
      message: error.message || 'Failed to fetch SLA information'
    });
  }
});

/**
 * Escalate ticket (Professional+ tiers)
 * Limited escalations for Professional, unlimited for Enterprise
 */
router.post('/tickets/:ticketId/escalate', requireTier('professional'), async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { tenant, reason, escalated_by } = req.body;

    if (!tenant || !reason) {
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        message: 'Required fields: tenant, reason'
      });
    }

    // Verify ticket belongs to tenant
    const existingTicket = await supportService.getTicket(parseInt(ticketId), tenant);
    if (!existingTicket) {
      return res.status(404).json({
        ok: false,
        error: 'ticket_not_found',
        message: 'Ticket not found'
      });
    }

    // Check if ticket is already escalated
    if (existingTicket.escalated) {
      return res.status(400).json({
        ok: false,
        error: 'already_escalated',
        message: 'Ticket is already escalated'
      });
    }

    // TODO: For Professional tier, check escalation limits (e.g., 2 per month)
    // For now, allow all escalations

    const escalatedTicket = await supportService.escalateTicket(
      parseInt(ticketId),
      reason,
      escalated_by || 'Customer'
    );

    res.json({
      ok: true,
      ticket: {
        id: escalatedTicket.id,
        ticket_number: escalatedTicket.ticket_number,
        status: escalatedTicket.status,
        priority: escalatedTicket.priority,
        escalated: escalatedTicket.escalated,
        escalated_at: escalatedTicket.escalated_at,
        updated_at: escalatedTicket.updated_at
      }
    });

  } catch (error) {
    console.error('Error escalating ticket:', error);
    res.status(500).json({
      ok: false,
      error: 'escalate_ticket_failed',
      message: error.message || 'Failed to escalate ticket'
    });
  }
});

/**
 * Get support analytics (Enterprise only)
 * Provides detailed support metrics and SLA compliance data
 */
router.get('/analytics', requireTier('enterprise'), async (req, res) => {
  try {
    const subscription = req.subscription;
    const { start_date, end_date, period = '30d' } = req.query;

    let dateRange = {};
    if (start_date && end_date) {
      dateRange = { start_date, end_date };
    } else {
      // Default to last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      
      dateRange = {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      };
    }

    const analytics = await supportService.getSupportAnalytics(subscription.tier, dateRange);

    res.json({
      ok: true,
      analytics: {
        subscription_tier: subscription.tier,
        period: dateRange,
        data: analytics
      }
    });

  } catch (error) {
    console.error('Error fetching support analytics:', error);
    res.status(500).json({
      ok: false,
      error: 'fetch_analytics_failed',
      message: error.message || 'Failed to fetch support analytics'
    });
  }
});

/**
 * Health check endpoint for support system
 */
router.get('/health', async (req, res) => {
  try {
    // Check SLA breaches as a health indicator
    const result = await supportService.checkSLABreaches();
    
    res.json({
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      sla_checks: {
        tickets_updated: result.tickets_updated
      }
    });

  } catch (error) {
    console.error('Support system health check failed:', error);
    res.status(500).json({
      ok: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

export default router;