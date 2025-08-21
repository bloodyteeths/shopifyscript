/**
 * Alerts Service for ProofKit SaaS
 * Handles delivery of alerts via multiple channels (Slack, Email, Webhooks)
 * with intelligent throttling, retry logic, and template management
 */

import logger from "./logger.js";
import { getDoc, ensureSheet } from "../sheets.js";

/**
 * Alert delivery service
 */
export class AlertsService {
  constructor() {
    this.channels = new Map();
    this.templates = new Map();
    this.deliveryHistory = new Map();
    this.throttling = new Map();
    this.retryQueues = new Map();

    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default alert templates
   */
  initializeDefaultTemplates() {
    // Slack templates
    this.templates.set("slack_cost_spike", {
      type: "slack",
      template: {
        text: "🚨 *Cost Spike Alert*",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "🚨 *Cost Spike Detected* 🚨\n\n*Tenant:* {{tenant}}\n*Current Cost:* {{currentCost}}\n*Expected Cost:* {{expectedCost}}\n*Increase:* {{percentIncrease}}%\n\n*Time:* {{timestamp}}",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Details:*\n{{details}}",
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "View Dashboard",
                },
                url: "{{dashboardUrl}}",
                style: "primary",
              },
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Suppress Alert",
                },
                url: "{{suppressUrl}}",
                style: "danger",
              },
            ],
          },
        ],
      },
    });

    this.templates.set("slack_cpa_spike", {
      type: "slack",
      template: {
        text: "📈 *CPA Spike Alert*",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "📈 *Cost Per Acquisition Spike* 📈\n\n*Tenant:* {{tenant}}\n*Current CPA:* {{currentCpa}}\n*Expected CPA:* {{expectedCpa}}\n*Increase:* {{percentIncrease}}%\n\n*Campaign:* {{campaign}}\n*Time:* {{timestamp}}",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Recommendation:*\n{{recommendation}}",
            },
          },
        ],
      },
    });

    this.templates.set("slack_zero_conversions", {
      type: "slack",
      template: {
        text: "⚠️ *Zero Conversions Alert*",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "⚠️ *No Conversions Detected* ⚠️\n\n*Tenant:* {{tenant}}\n*Hours Without Conversions:* {{hours}}\n*Money Spent:* {{moneySpent}}\n\n*Time:* {{timestamp}}",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Action Required:*\n• Check campaign settings\n• Review landing pages\n• Verify tracking\n• Consider pausing campaigns",
            },
          },
        ],
      },
    });

    // Email templates
    this.templates.set("email_cost_spike", {
      type: "email",
      template: {
        subject: "🚨 ProofKit Alert: Cost Spike Detected for {{tenant}}",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h1 style="color: #dc3545; margin: 0;">🚨 Cost Spike Alert</h1>
              <p style="margin: 10px 0 0 0; color: #6c757d;">ProofKit Monitoring System</p>
            </div>
            
            <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
              <h2 style="color: #495057;">Alert Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold;">Tenant:</td><td>{{tenant}}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Current Cost:</td><td style="color: #dc3545; font-weight: bold;">{{currentCost}}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Expected Cost:</td><td>{{expectedCost}}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Increase:</td><td style="color: #dc3545; font-weight: bold;">{{percentIncrease}}%</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Time:</td><td>{{timestamp}}</td></tr>
              </table>
              
              <h3 style="color: #495057; margin-top: 20px;">Details</h3>
              <p>{{details}}</p>
              
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                <a href="{{dashboardUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px;">View Dashboard</a>
                <a href="{{suppressUrl}}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Suppress Alert</a>
              </div>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 12px; color: #6c757d;">
              This alert was generated by ProofKit's automated monitoring system. 
              <a href="{{unsubscribeUrl}}">Unsubscribe</a> | <a href="{{settingsUrl}}">Alert Settings</a>
            </div>
          </div>
        `,
      },
    });

    this.templates.set("email_weekly_summary", {
      type: "email",
      template: {
        subject: "📊 ProofKit Weekly Summary - {{tenant}}",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #28a745; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">📊 Weekly Performance Summary</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">{{dateRange}}</p>
            </div>
            
            <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-top: none;">
              <h2 style="color: #495057;">Key Metrics</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 4px;">
                  <h4 style="margin: 0; color: #6c757d;">Clicks</h4>
                  <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: {{clicksTrendColor}};">{{clicks}}</p>
                  <p style="margin: 0; font-size: 12px; color: #6c757d;">{{clicksTrend}}</p>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 4px;">
                  <h4 style="margin: 0; color: #6c757d;">Conversions</h4>
                  <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: {{conversionsTrendColor}};">{{conversions}}</p>
                  <p style="margin: 0; font-size: 12px; color: #6c757d;">{{conversionsTrend}}</p>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 4px;">
                  <h4 style="margin: 0; color: #6c757d;">Cost</h4>
                  <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: {{costTrendColor}};">{{cost}}</p>
                  <p style="margin: 0; font-size: 12px; color: #6c757d;">{{costTrend}}</p>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 4px;">
                  <h4 style="margin: 0; color: #6c757d;">CPA</h4>
                  <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: {{cpaTrendColor}};">{{cpa}}</p>
                  <p style="margin: 0; font-size: 12px; color: #6c757d;">{{cpaTrend}}</p>
                </div>
              </div>
              
              <h3 style="color: #495057;">AI Insights</h3>
              <div style="background: #e3f2fd; padding: 15px; border-radius: 4px; border-left: 4px solid #2196f3;">
                {{aiInsights}}
              </div>
              
              <h3 style="color: #495057;">Top Performing Search Terms</h3>
              <ul style="padding-left: 20px;">
                {{topSearchTerms}}
              </ul>
              
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                <a href="{{dashboardUrl}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Full Dashboard</a>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; color: #6c757d; text-align: center;">
              ProofKit Weekly Summary | <a href="{{unsubscribeUrl}}">Unsubscribe</a> | <a href="{{settingsUrl}}">Settings</a>
            </div>
          </div>
        `,
      },
    });
  }

  /**
   * Register an alert channel
   */
  registerChannel(tenant, channelId, config) {
    if (!this.channels.has(tenant)) {
      this.channels.set(tenant, new Map());
    }

    const tenantChannels = this.channels.get(tenant);
    tenantChannels.set(channelId, {
      ...config,
      id: channelId,
      tenant,
      enabled: config.enabled !== false,
      createdAt: new Date().toISOString(),
    });

    logger.info("Alert channel registered", {
      tenant,
      channelId,
      type: config.type,
    });
  }

  /**
   * Send alert to all configured channels
   */
  async sendAlert(tenant, alertData, options = {}) {
    const startTime = Date.now();
    logger.info("Sending alert", {
      tenant,
      alertType: alertData.type,
      severity: alertData.severity,
    });

    try {
      const tenantChannels = this.channels.get(tenant);
      if (!tenantChannels || tenantChannels.size === 0) {
        logger.warn("No alert channels configured for tenant", { tenant });
        return { success: false, error: "No channels configured" };
      }

      // Check throttling
      if (this.isThrottled(tenant, alertData.type, alertData.severity)) {
        logger.info("Alert throttled", {
          tenant,
          alertType: alertData.type,
          severity: alertData.severity,
        });
        return { success: false, error: "Alert throttled" };
      }

      const results = [];
      const promises = [];

      // Send to all enabled channels
      for (const [channelId, channel] of tenantChannels) {
        if (
          channel.enabled &&
          this.shouldSendToChannel(channel, alertData, options)
        ) {
          promises.push(
            this.sendToChannel(channel, alertData, options)
              .then((result) => ({ channelId, success: true, result }))
              .catch((error) => ({
                channelId,
                success: false,
                error: error.message,
              })),
          );
        }
      }

      const channelResults = await Promise.allSettled(promises);
      results.push(...channelResults.map((r) => r.value || r.reason));

      // Update throttling
      this.updateThrottling(tenant, alertData.type, alertData.severity);

      // Log delivery history
      this.logDeliveryHistory(tenant, alertData, results);

      const duration = Date.now() - startTime;
      const successCount = results.filter((r) => r.success).length;

      logger.info("Alert delivery completed", {
        tenant,
        alertType: alertData.type,
        duration,
        channelsAttempted: results.length,
        channelsSuccessful: successCount,
      });

      return {
        success: successCount > 0,
        results,
        duration,
      };
    } catch (error) {
      logger.error("Alert sending failed", {
        error: error.message,
        tenant,
        alertType: alertData.type,
        stack: error.stack,
      });

      throw error;
    }
  }

  /**
   * Send alert to a specific channel
   */
  async sendToChannel(channel, alertData, options) {
    switch (channel.type) {
      case "slack":
        return await this.sendSlackAlert(channel, alertData, options);
      case "email":
        return await this.sendEmailAlert(channel, alertData, options);
      case "webhook":
        return await this.sendWebhookAlert(channel, alertData, options);
      default:
        throw new Error(`Unsupported channel type: ${channel.type}`);
    }
  }

  /**
   * Send Slack alert
   */
  async sendSlackAlert(channel, alertData, options) {
    const templateKey = `slack_${alertData.type}`;
    const template = this.templates.get(templateKey);

    if (!template) {
      throw new Error(
        `No Slack template found for alert type: ${alertData.type}`,
      );
    }

    const message = this.renderTemplate(template.template, alertData, options);

    const response = await fetch(channel.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(
        `Slack API error: ${response.status} ${response.statusText}`,
      );
    }

    return {
      platform: "slack",
      messageId: response.headers.get("x-slack-req-id"),
    };
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(channel, alertData, options) {
    const templateKey = `email_${alertData.type}`;
    const template = this.templates.get(templateKey);

    if (!template) {
      throw new Error(
        `No email template found for alert type: ${alertData.type}`,
      );
    }

    const message = this.renderTemplate(template.template, alertData, options);

    // Use configured email service (could be SendGrid, SES, etc.)
    const emailPayload = {
      to: channel.recipients,
      from: channel.fromEmail || "alerts@proofkit.com",
      subject: message.subject,
      html: message.html,
    };

    // For now, we'll use a webhook approach for email sending
    // In production, you'd integrate with your preferred email service
    if (channel.emailWebhookUrl) {
      const response = await fetch(channel.emailWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${channel.apiKey || ""}`,
        },
        body: JSON.stringify(emailPayload),
      });

      if (!response.ok) {
        throw new Error(
          `Email service error: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();
      return { platform: "email", messageId: result.messageId };
    }

    // Fallback: log email content (for development)
    logger.info("Email alert (no service configured)", {
      to: emailPayload.to,
      subject: emailPayload.subject,
      preview: emailPayload.html.substring(0, 200),
    });

    return { platform: "email", messageId: "logged_only" };
  }

  /**
   * Send webhook alert
   */
  async sendWebhookAlert(channel, alertData, options) {
    const payload = {
      timestamp: new Date().toISOString(),
      tenant: alertData.tenant,
      alert: alertData,
      metadata: options.metadata || {},
    };

    const response = await fetch(channel.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "ProofKit-Alerts/1.0",
        ...(channel.headers || {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Webhook error: ${response.status} ${response.statusText}`,
      );
    }

    return { platform: "webhook", status: response.status };
  }

  /**
   * Render template with data
   */
  renderTemplate(template, alertData, options) {
    const data = {
      ...alertData,
      timestamp: new Date(alertData.timestamp).toLocaleString(),
      dashboardUrl:
        options.dashboardUrl ||
        `https://app.proofkit.com/dashboard/${alertData.tenant}`,
      suppressUrl:
        options.suppressUrl ||
        `https://app.proofkit.com/alerts/suppress/${alertData.tenant}/${alertData.type}`,
      settingsUrl:
        options.settingsUrl ||
        `https://app.proofkit.com/settings/${alertData.tenant}`,
      unsubscribeUrl:
        options.unsubscribeUrl ||
        `https://app.proofkit.com/unsubscribe/${alertData.tenant}`,
      ...options.templateData,
    };

    // Deep clone template to avoid modifying original
    const rendered = JSON.parse(JSON.stringify(template));

    // Recursive template rendering
    const render = (obj) => {
      if (typeof obj === "string") {
        return obj.replace(/{{(\w+)}}/g, (match, key) => {
          return data[key] !== undefined ? String(data[key]) : match;
        });
      } else if (Array.isArray(obj)) {
        return obj.map(render);
      } else if (typeof obj === "object" && obj !== null) {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = render(value);
        }
        return result;
      }
      return obj;
    };

    return render(rendered);
  }

  /**
   * Check if alert should be throttled
   */
  isThrottled(tenant, alertType, severity) {
    const key = `${tenant}_${alertType}_${severity}`;
    const throttleInfo = this.throttling.get(key);

    if (!throttleInfo) return false;

    const now = Date.now();
    const timeSinceLastAlert = now - throttleInfo.lastSent;

    // Throttling periods based on severity
    const throttlePeriods = {
      high: 15 * 60 * 1000, // 15 minutes
      medium: 60 * 60 * 1000, // 1 hour
      low: 4 * 60 * 60 * 1000, // 4 hours
    };

    const throttlePeriod = throttlePeriods[severity] || throttlePeriods.medium;

    return timeSinceLastAlert < throttlePeriod;
  }

  /**
   * Update throttling information
   */
  updateThrottling(tenant, alertType, severity) {
    const key = `${tenant}_${alertType}_${severity}`;
    this.throttling.set(key, {
      lastSent: Date.now(),
      count: (this.throttling.get(key)?.count || 0) + 1,
    });
  }

  /**
   * Check if alert should be sent to specific channel
   */
  shouldSendToChannel(channel, alertData, options) {
    // Check severity filters
    if (channel.minSeverity) {
      const severityLevels = { low: 1, medium: 2, high: 3 };
      const alertLevel = severityLevels[alertData.severity] || 1;
      const minLevel = severityLevels[channel.minSeverity] || 1;

      if (alertLevel < minLevel) {
        return false;
      }
    }

    // Check alert type filters
    if (channel.alertTypes && !channel.alertTypes.includes(alertData.type)) {
      return false;
    }

    // Check time-based filters (business hours, etc.)
    if (channel.businessHoursOnly) {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();

      // Skip weekends and non-business hours
      if (day === 0 || day === 6 || hour < 9 || hour > 17) {
        return false;
      }
    }

    return true;
  }

  /**
   * Log delivery history for analytics
   */
  logDeliveryHistory(tenant, alertData, results) {
    if (!this.deliveryHistory.has(tenant)) {
      this.deliveryHistory.set(tenant, []);
    }

    const history = this.deliveryHistory.get(tenant);
    history.push({
      timestamp: new Date().toISOString(),
      alertType: alertData.type,
      severity: alertData.severity,
      channelsAttempted: results.length,
      channelsSuccessful: results.filter((r) => r.success).length,
      results,
    });

    // Keep only last 1000 entries
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
  }

  /**
   * Send weekly summary
   */
  async sendWeeklySummary(tenant, summaryData, options = {}) {
    // Prepare template data for weekly summary
    const templateData = {
      tenant,
      dateRange: `${new Date(summaryData.period.start).toLocaleDateString()} - ${new Date(summaryData.period.end).toLocaleDateString()}`,
      clicks: summaryData.metrics.clicks.toLocaleString(),
      conversions: summaryData.metrics.conversions,
      cost: summaryData.metrics.cost.toFixed(2),
      cpa: summaryData.metrics.cpa ? summaryData.metrics.cpa.toFixed(2) : "N/A",
      clicksTrend: this.formatTrend(summaryData.trends.clicks),
      conversionsTrend: this.formatTrend(summaryData.trends.conversions),
      costTrend: this.formatTrend(summaryData.trends.cost),
      cpaTrend: summaryData.trends.cpa
        ? this.formatTrend(summaryData.trends.cpa)
        : "N/A",
      clicksTrendColor: this.getTrendColor(summaryData.trends.clicks),
      conversionsTrendColor: this.getTrendColor(summaryData.trends.conversions),
      costTrendColor: this.getTrendColor(summaryData.trends.cost, true), // Reverse for cost
      cpaTrendColor: summaryData.trends.cpa
        ? this.getTrendColor(summaryData.trends.cpa, true)
        : "#6c757d",
      aiInsights: summaryData.aiInsights?.summary || "No AI insights available",
      topSearchTerms: summaryData.searchTerms
        .slice(0, 5)
        .map(
          (term) => `<li>"${term.term}" - ${term.conversions} conversions</li>`,
        )
        .join(""),
    };

    const alertData = {
      type: "weekly_summary",
      severity: "info",
      tenant,
      timestamp: new Date().toISOString(),
      ...templateData,
    };

    return await this.sendAlert(tenant, alertData, {
      ...options,
      templateData,
    });
  }

  /**
   * Format trend percentage for display
   */
  formatTrend(percentage) {
    if (percentage === null || percentage === undefined) return "N/A";
    const sign = percentage >= 0 ? "+" : "";
    return `${sign}${percentage.toFixed(1)}%`;
  }

  /**
   * Get color for trend indicator
   */
  getTrendColor(percentage, reverse = false) {
    if (percentage === null || percentage === undefined) return "#6c757d";

    const isPositive = percentage >= 0;
    const isGood = reverse ? !isPositive : isPositive;

    if (Math.abs(percentage) < 5) return "#6c757d"; // Neutral for small changes
    return isGood ? "#28a745" : "#dc3545";
  }

  /**
   * Get channel configuration for tenant
   */
  getChannels(tenant) {
    const tenantChannels = this.channels.get(tenant) || new Map();
    return Array.from(tenantChannels.values());
  }

  /**
   * Update channel configuration
   */
  updateChannel(tenant, channelId, updates) {
    const tenantChannels = this.channels.get(tenant);
    if (!tenantChannels || !tenantChannels.has(channelId)) {
      throw new Error(`Channel ${channelId} not found for tenant ${tenant}`);
    }

    const channel = tenantChannels.get(channelId);
    Object.assign(channel, updates, { updatedAt: new Date().toISOString() });

    logger.info("Alert channel updated", { tenant, channelId, updates });
  }

  /**
   * Remove channel
   */
  removeChannel(tenant, channelId) {
    const tenantChannels = this.channels.get(tenant);
    if (tenantChannels && tenantChannels.has(channelId)) {
      tenantChannels.delete(channelId);
      logger.info("Alert channel removed", { tenant, channelId });
      return true;
    }
    return false;
  }

  /**
   * Get delivery statistics
   */
  getDeliveryStats(tenant) {
    const history = this.deliveryHistory.get(tenant) || [];
    const recent = history.slice(-100); // Last 100 deliveries

    if (recent.length === 0) {
      return { totalDeliveries: 0, successRate: 0, lastDelivery: null };
    }

    const totalSuccessful = recent.reduce(
      (sum, delivery) => sum + delivery.channelsSuccessful,
      0,
    );
    const totalAttempted = recent.reduce(
      (sum, delivery) => sum + delivery.channelsAttempted,
      0,
    );

    return {
      totalDeliveries: recent.length,
      successRate:
        totalAttempted > 0 ? (totalSuccessful / totalAttempted) * 100 : 0,
      lastDelivery: recent[recent.length - 1],
      recentFailures: recent.filter((d) => d.channelsSuccessful === 0).length,
    };
  }

  /**
   * Test channel configuration
   */
  async testChannel(tenant, channelId) {
    const tenantChannels = this.channels.get(tenant);
    if (!tenantChannels || !tenantChannels.has(channelId)) {
      throw new Error(`Channel ${channelId} not found for tenant ${tenant}`);
    }

    const channel = tenantChannels.get(channelId);

    const testAlert = {
      type: "test",
      severity: "low",
      tenant,
      timestamp: new Date().toISOString(),
      message: "This is a test alert to verify channel configuration",
      testMode: true,
    };

    try {
      const result = await this.sendToChannel(channel, testAlert, {
        templateData: {
          message: "Test Alert - Channel Configuration Verification",
        },
      });

      logger.info("Channel test successful", { tenant, channelId, result });
      return { success: true, result };
    } catch (error) {
      logger.error("Channel test failed", {
        tenant,
        channelId,
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }
}

/**
 * Singleton instance
 */
export const alertsService = new AlertsService();

/**
 * Default export
 */
export default alertsService;
