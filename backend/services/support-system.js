/**
 * ProofKit Support System Service
 * Handles tier-based support ticket management with SLA tracking
 */

import { supabase } from './supabase-client.js';
import { getCurrentSubscription } from '../middleware/subscription-check.js';

export class SupportSystemService {
  constructor() {
    this.supabase = supabase;
    if (!this.supabase) {
      console.warn('⚠️ Support system requires Supabase configuration');
    }
  }

  /**
   * Create a new support ticket with tier-based SLA assignment
   */
  async createTicket(ticketData) {
    try {
      const { tenant_id, subject, description, category, priority = 'normal', customer_name, customer_email, customer_phone } = ticketData;

      if (!tenant_id || !subject || !description || !category || !customer_email) {
        throw new Error('Required fields missing: tenant_id, subject, description, category, customer_email');
      }

      // Get current subscription to determine tier
      const subscription = await getCurrentSubscription(tenant_id);
      if (!subscription || !subscription.tier) {
        throw new Error('Unable to determine subscription tier for support request');
      }

      // Get SLA configuration for this tier and category
      const slaConfig = await this.getSLAConfig(subscription.tier, category, priority);
      if (!slaConfig) {
        throw new Error(`No SLA configuration found for tier: ${subscription.tier}, category: ${category}, priority: ${priority}`);
      }

      // Generate unique ticket number
      const ticketNumber = await this.generateTicketNumber();

      // Map subscription tier to support tier
      const supportTierMap = {
        'starter': 'email',
        'professional': 'priority_email', 
        'enterprise': 'priority_phone_email'
      };

      const supportTier = supportTierMap[subscription.tier] || 'email';

      // Create ticket record
      const { data: ticket, error } = await this.supabase
        .from('support_tickets')
        .insert({
          ticket_number: ticketNumber,
          tenant_id,
          subject,
          description,
          category,
          priority,
          customer_name,
          customer_email,
          customer_phone,
          subscription_tier: subscription.tier,
          support_tier: supportTier,
          sla_response_hours: slaConfig.response_time_hours,
          sla_resolution_hours: slaConfig.resolution_time_hours,
          status: 'open'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating support ticket:', error);
        throw new Error('Failed to create support ticket');
      }

      // Create initial message with ticket description
      await this.addTicketMessage(ticket.id, {
        message_type: 'message',
        sender_type: 'customer', 
        sender_name: customer_name || 'Customer',
        sender_email: customer_email,
        message_content: description,
        is_public: true
      });

      // Send notification emails based on tier
      await this.sendTicketNotifications(ticket, 'created');

      return ticket;

    } catch (error) {
      console.error('Error in createTicket:', error);
      throw error;
    }
  }

  /**
   * Add a message to an existing ticket
   */
  async addTicketMessage(ticketId, messageData) {
    try {
      const { message_type = 'message', sender_type, sender_name, sender_email, message_content, is_public = true, attachments } = messageData;

      const { data: message, error } = await this.supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: ticketId,
          message_type,
          sender_type,
          sender_name,
          sender_email,
          message_content,
          is_public,
          attachments
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding ticket message:', error);
        throw new Error('Failed to add ticket message');
      }

      // Update ticket timestamp and first response if this is from agent
      if (sender_type === 'agent') {
        const updateData = { updated_at: new Date().toISOString() };
        
        // Check if this is the first response
        const { data: ticket } = await this.supabase
          .from('support_tickets')
          .select('first_response_at')
          .eq('id', ticketId)
          .single();

        if (ticket && !ticket.first_response_at) {
          updateData.first_response_at = new Date().toISOString();
        }

        await this.supabase
          .from('support_tickets')
          .update(updateData)
          .eq('id', ticketId);
      }

      return message;

    } catch (error) {
      console.error('Error in addTicketMessage:', error);
      throw error;
    }
  }

  /**
   * Update ticket status with SLA tracking
   */
  async updateTicketStatus(ticketId, status, agentName = null) {
    try {
      const updateData = { 
        status, 
        updated_at: new Date().toISOString()
      };

      // Set resolution timestamp if resolving
      if (status === 'resolved' && agentName) {
        updateData.resolved_at = new Date().toISOString();
        updateData.assigned_agent = agentName;
      }

      // Set closed timestamp if closing
      if (status === 'closed') {
        updateData.closed_at = new Date().toISOString();
      }

      const { data: ticket, error } = await this.supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId)
        .select()
        .single();

      if (error) {
        console.error('Error updating ticket status:', error);
        throw new Error('Failed to update ticket status');
      }

      // Add system message for status change
      await this.addTicketMessage(ticketId, {
        message_type: 'status_change',
        sender_type: 'system',
        sender_name: 'System',
        message_content: `Ticket status changed to: ${status}${agentName ? ` by ${agentName}` : ''}`,
        is_public: true
      });

      // Send notification if resolved
      if (status === 'resolved') {
        await this.sendTicketNotifications(ticket, 'resolved');
      }

      return ticket;

    } catch (error) {
      console.error('Error in updateTicketStatus:', error);
      throw error;
    }
  }

  /**
   * Get tickets for a tenant with filtering options
   */
  async getTickets(tenantId, options = {}) {
    try {
      const { status, category, priority, limit = 50, offset = 0, include_messages = false } = options;

      let query = this.supabase
        .from('support_tickets')
        .select('*')
        .eq('tenant_id', tenantId);

      if (status) query = query.eq('status', status);
      if (category) query = query.eq('category', category); 
      if (priority) query = query.eq('priority', priority);

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: tickets, error } = await query;

      if (error) {
        console.error('Error fetching tickets:', error);
        throw new Error('Failed to fetch tickets');
      }

      // Include messages if requested
      if (include_messages && tickets.length > 0) {
        const ticketIds = tickets.map(t => t.id);
        
        const { data: messages } = await this.supabase
          .from('support_ticket_messages')
          .select('*')
          .in('ticket_id', ticketIds)
          .eq('is_public', true)
          .order('created_at', { ascending: true });

        // Group messages by ticket
        const messagesByTicket = {};
        messages?.forEach(msg => {
          if (!messagesByTicket[msg.ticket_id]) {
            messagesByTicket[msg.ticket_id] = [];
          }
          messagesByTicket[msg.ticket_id].push(msg);
        });

        // Add messages to tickets
        tickets.forEach(ticket => {
          ticket.messages = messagesByTicket[ticket.id] || [];
        });
      }

      return tickets;

    } catch (error) {
      console.error('Error in getTickets:', error);
      throw error;
    }
  }

  /**
   * Get single ticket with full details
   */
  async getTicket(ticketId, tenantId) {
    try {
      const { data: ticket, error } = await this.supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        console.error('Error fetching ticket:', error);
        throw new Error('Ticket not found');
      }

      // Get all messages for the ticket
      const { data: messages } = await this.supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .eq('is_public', true)
        .order('created_at', { ascending: true });

      ticket.messages = messages || [];

      return ticket;

    } catch (error) {
      console.error('Error in getTicket:', error);
      throw error;
    }
  }

  /**
   * Get SLA configuration for tier, category, and priority
   */
  async getSLAConfig(tier, category, priority) {
    try {
      const { data: config, error } = await this.supabase
        .from('support_sla_config')
        .select('*')
        .eq('subscription_tier', tier)
        .eq('ticket_category', category)
        .eq('ticket_priority', priority)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching SLA config:', error);
      }

      return config;

    } catch (error) {
      console.error('Error in getSLAConfig:', error);
      return null;
    }
  }

  /**
   * Get contact methods available for a subscription tier
   */
  async getContactMethods(tier) {
    try {
      const { data: methods, error } = await this.supabase
        .from('support_contact_methods')
        .select('*')
        .eq('subscription_tier', tier)
        .single();

      if (error) {
        console.error('Error fetching contact methods:', error);
        return null;
      }

      return methods;

    } catch (error) {
      console.error('Error in getContactMethods:', error);
      return null;
    }
  }

  /**
   * Check and update SLA breaches for all open tickets
   */
  async checkSLABreaches() {
    try {
      const { data, error } = await this.supabase.rpc('check_sla_breaches');
      
      if (error) {
        console.error('Error checking SLA breaches:', error);
        throw new Error('Failed to check SLA breaches');
      }

      return { tickets_updated: data || 0 };

    } catch (error) {
      console.error('Error in checkSLABreaches:', error);
      throw error;
    }
  }

  /**
   * Generate unique ticket number
   */
  async generateTicketNumber() {
    try {
      const { data, error } = await this.supabase.rpc('generate_ticket_number');
      
      if (error) {
        console.error('Error generating ticket number:', error);
        throw new Error('Failed to generate ticket number');
      }

      return data;

    } catch (error) {
      console.error('Error in generateTicketNumber:', error);
      // Fallback to timestamp-based number
      const timestamp = Date.now();
      return `SUP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${timestamp.toString().slice(-4)}`;
    }
  }

  /**
   * Escalate ticket to higher priority/agent
   */
  async escalateTicket(ticketId, reason, escalatedBy) {
    try {
      const { data: ticket, error } = await this.supabase
        .from('support_tickets')
        .update({
          escalated: true,
          escalated_at: new Date().toISOString(),
          priority: 'urgent', // Auto-escalate to urgent priority
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) {
        console.error('Error escalating ticket:', error);
        throw new Error('Failed to escalate ticket');
      }

      // Add escalation message
      await this.addTicketMessage(ticketId, {
        message_type: 'status_change',
        sender_type: 'agent',
        sender_name: escalatedBy,
        message_content: `Ticket escalated to urgent priority. Reason: ${reason}`,
        is_public: false // Internal note
      });

      // Send escalation notifications
      await this.sendTicketNotifications(ticket, 'escalated');

      return ticket;

    } catch (error) {
      console.error('Error in escalateTicket:', error);
      throw error;
    }
  }

  /**
   * Get support analytics/metrics
   */
  async getSupportAnalytics(tier, dateRange = {}) {
    try {
      const { start_date, end_date } = dateRange;
      
      let query = this.supabase
        .from('support_analytics')
        .select('*')
        .eq('subscription_tier', tier);

      if (start_date) query = query.gte('date', start_date);
      if (end_date) query = query.lte('date', end_date);

      query = query.order('date', { ascending: false });

      const { data: analytics, error } = await query;

      if (error) {
        console.error('Error fetching support analytics:', error);
        throw new Error('Failed to fetch support analytics');
      }

      return analytics;

    } catch (error) {
      console.error('Error in getSupportAnalytics:', error);
      throw error;
    }
  }

  /**
   * Send notifications based on ticket events and tier
   */
  async sendTicketNotifications(ticket, event) {
    try {
      // Get contact methods for the subscription tier
      const contactMethods = await this.getContactMethods(ticket.subscription_tier);
      if (!contactMethods) return;

      const notificationData = {
        ticket,
        event,
        contactMethods
      };

      // Send email notification
      if (contactMethods.email_support) {
        await this.sendEmailNotification(notificationData);
      }

      // For enterprise tier with phone support, also log for phone follow-up
      if (contactMethods.phone_support && (event === 'created' && ticket.priority === 'urgent')) {
        await this.logPhoneFollowUpNeeded(ticket);
      }

    } catch (error) {
      console.error('Error sending ticket notifications:', error);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Send email notification (placeholder - integrate with your email service)
   */
  async sendEmailNotification(notificationData) {
    const { ticket, event, contactMethods } = notificationData;
    
    console.log(`Email notification would be sent to ${contactMethods.support_email}:`, {
      ticket_number: ticket.ticket_number,
      event,
      tier: ticket.subscription_tier,
      priority: ticket.priority,
      customer_email: ticket.customer_email
    });

    // TODO: Integrate with your email service (SendGrid, AWS SES, etc.)
    // This would send different email templates based on event:
    // - created: Acknowledgment email to customer
    // - resolved: Resolution notification to customer  
    // - escalated: Internal notification to management
  }

  /**
   * Log phone follow-up needed for enterprise urgent tickets
   */
  async logPhoneFollowUpNeeded(ticket) {
    console.log(`Phone follow-up needed for enterprise urgent ticket:`, {
      ticket_number: ticket.ticket_number,
      customer_name: ticket.customer_name,
      customer_phone: ticket.customer_phone,
      subject: ticket.subject
    });

    // TODO: Integrate with your phone support system/CRM
    // This could create tasks in your support agent dashboard
    // or integrate with phone support queue systems
  }

  /**
   * Update daily support analytics
   */
  async updateDailyAnalytics(date = null) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      // Get metrics for each tier
      const tiers = ['starter', 'professional', 'enterprise'];
      
      for (const tier of tiers) {
        // Calculate metrics for the day
        const metrics = await this.calculateDailyMetrics(tier, targetDate);
        
        // Upsert analytics record
        const { error } = await this.supabase
          .from('support_analytics')
          .upsert({
            date: targetDate,
            subscription_tier: tier,
            ...metrics
          });

        if (error) {
          console.error(`Error updating analytics for ${tier}:`, error);
        }
      }

    } catch (error) {
      console.error('Error in updateDailyAnalytics:', error);
      throw error;
    }
  }

  /**
   * Calculate daily metrics for a tier
   */
  async calculateDailyMetrics(tier, date) {
    try {
      const startOfDay = `${date}T00:00:00Z`;
      const endOfDay = `${date}T23:59:59Z`;

      // Get tickets created on this date
      const { data: createdTickets, error: createdError } = await this.supabase
        .from('support_tickets')
        .select('*')
        .eq('subscription_tier', tier)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (createdError) throw createdError;

      // Get tickets resolved on this date  
      const { data: resolvedTickets, error: resolvedError } = await this.supabase
        .from('support_tickets')
        .select('*')
        .eq('subscription_tier', tier)
        .gte('resolved_at', startOfDay)
        .lte('resolved_at', endOfDay);

      if (resolvedError) throw resolvedError;

      // Calculate response time metrics
      let totalFirstResponseMinutes = 0;
      let responseTimeCount = 0;
      
      resolvedTickets?.forEach(ticket => {
        if (ticket.first_response_at && ticket.created_at) {
          const responseTime = new Date(ticket.first_response_at) - new Date(ticket.created_at);
          totalFirstResponseMinutes += Math.floor(responseTime / (1000 * 60));
          responseTimeCount++;
        }
      });

      // Calculate resolution time metrics
      let totalResolutionHours = 0;
      let resolutionCount = 0;

      resolvedTickets?.forEach(ticket => {
        if (ticket.resolved_at && ticket.created_at) {
          const resolutionTime = new Date(ticket.resolved_at) - new Date(ticket.created_at);
          totalResolutionHours += Math.floor(resolutionTime / (1000 * 60 * 60));
          resolutionCount++;
        }
      });

      // Calculate SLA compliance
      const responseCompliantTickets = resolvedTickets?.filter(t => !t.sla_response_breached) || [];
      const resolutionCompliantTickets = resolvedTickets?.filter(t => !t.sla_resolution_breached) || [];

      return {
        tickets_created: createdTickets?.length || 0,
        tickets_resolved: resolvedTickets?.length || 0,
        tickets_escalated: createdTickets?.filter(t => t.escalated)?.length || 0,
        avg_first_response_minutes: responseTimeCount > 0 ? Math.round(totalFirstResponseMinutes / responseTimeCount) : null,
        avg_resolution_hours: resolutionCount > 0 ? Math.round(totalResolutionHours / resolutionCount) : null,
        sla_response_compliance_rate: resolvedTickets?.length > 0 ? 
          Math.round((responseCompliantTickets.length / resolvedTickets.length) * 100) : null,
        sla_resolution_compliance_rate: resolvedTickets?.length > 0 ? 
          Math.round((resolutionCompliantTickets.length / resolvedTickets.length) * 100) : null
      };

    } catch (error) {
      console.error('Error calculating daily metrics:', error);
      return {
        tickets_created: 0,
        tickets_resolved: 0,
        tickets_escalated: 0,
        avg_first_response_minutes: null,
        avg_resolution_hours: null,
        sla_response_compliance_rate: null,
        sla_resolution_compliance_rate: null
      };
    }
  }
}

export default SupportSystemService;