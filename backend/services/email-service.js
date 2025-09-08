/**
 * Email Service
 * Handles SMTP configuration and email delivery for automated reports
 * Supports multiple email providers and templates
 */

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.emailConfig = this.loadEmailConfig();
    this.templates = new Map();
    
    // Email delivery metrics
    this.metrics = {
      emailsSent: 0,
      emailsFailed: 0,
      avgDeliveryTime: 0,
      bounces: 0,
      opens: 0
    };

    this.initializeTransporter();
  }

  /**
   * Load email configuration from environment
   */
  loadEmailConfig() {
    return {
      // Primary SMTP configuration
      smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      
      // Fallback configuration
      fallback: {
        host: process.env.SMTP_FALLBACK_HOST,
        port: parseInt(process.env.SMTP_FALLBACK_PORT) || 587,
        secure: process.env.SMTP_FALLBACK_SECURE === 'true',
        auth: {
          user: process.env.SMTP_FALLBACK_USER,
          pass: process.env.SMTP_FALLBACK_PASS
        }
      },
      
      // Default sender information
      from: {
        name: process.env.EMAIL_FROM_NAME || 'ProofKit Analytics',
        address: process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER
      },
      
      // Email settings
      settings: {
        maxRetries: 3,
        retryDelay: 5000, // 5 seconds
        timeout: 30000, // 30 seconds
        rateLimitPerMinute: 60,
        batchSize: 10
      }
    };
  }

  /**
   * Initialize SMTP transporter
   */
  async initializeTransporter() {
    try {
      if (!this.emailConfig.smtp.auth.user || !this.emailConfig.smtp.auth.pass) {
        console.warn('Email service: SMTP credentials not configured');
        return;
      }

      // Create primary transporter
      this.transporter = nodemailer.createTransporter({
        host: this.emailConfig.smtp.host,
        port: this.emailConfig.smtp.port,
        secure: this.emailConfig.smtp.secure,
        auth: this.emailConfig.smtp.auth,
        connectionTimeout: this.emailConfig.settings.timeout,
        greetingTimeout: this.emailConfig.settings.timeout,
        socketTimeout: this.emailConfig.settings.timeout
      });

      // Verify connection
      await this.transporter.verify();
      this.isConfigured = true;
      
      console.log('Email service initialized successfully');
      
      // Create fallback transporter if configured
      if (this.emailConfig.fallback.host && this.emailConfig.fallback.auth.user) {
        this.fallbackTransporter = nodemailer.createTransporter({
          host: this.emailConfig.fallback.host,
          port: this.emailConfig.fallback.port,
          secure: this.emailConfig.fallback.secure,
          auth: this.emailConfig.fallback.auth
        });
        
        console.log('Email fallback transporter configured');
      }
      
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Send email with retry logic
   */
  async sendEmail(emailOptions, retries = 0) {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    const startTime = Date.now();
    
    try {
      const mailOptions = {
        from: `"${this.emailConfig.from.name}" <${this.emailConfig.from.address}>`,
        to: emailOptions.to,
        subject: emailOptions.subject,
        html: emailOptions.html,
        text: emailOptions.text,
        attachments: emailOptions.attachments || [],
        headers: {
          'X-ProofKit-Type': emailOptions.type || 'notification',
          'X-ProofKit-Tenant': emailOptions.tenantId || 'unknown',
          'List-Unsubscribe': emailOptions.unsubscribeUrl || ''
        }
      };

      // Add custom headers for tracking
      if (emailOptions.trackingId) {
        mailOptions.headers['X-ProofKit-Tracking-ID'] = emailOptions.trackingId;
      }

      const result = await this.transporter.sendMail(mailOptions);
      
      // Update metrics
      const deliveryTime = Date.now() - startTime;
      this.updateMetrics('success', deliveryTime);
      
      console.log(`Email sent successfully: ${result.messageId} (${deliveryTime}ms)`);
      
      return {
        success: true,
        messageId: result.messageId,
        deliveryTime
      };
      
    } catch (error) {
      console.error('Email send failed:', error);
      
      // Retry logic
      if (retries < this.emailConfig.settings.maxRetries) {
        console.log(`Retrying email send (attempt ${retries + 1}/${this.emailConfig.settings.maxRetries})`);
        await this.delay(this.emailConfig.settings.retryDelay);
        return this.sendEmail(emailOptions, retries + 1);
      }

      // Try fallback if available
      if (this.fallbackTransporter && retries === 0) {
        console.log('Attempting fallback email delivery');
        try {
          const originalTransporter = this.transporter;
          this.transporter = this.fallbackTransporter;
          const result = await this.sendEmail(emailOptions, retries + 1);
          this.transporter = originalTransporter;
          return result;
        } catch (fallbackError) {
          this.transporter = originalTransporter;
          console.error('Fallback email also failed:', fallbackError);
        }
      }
      
      this.updateMetrics('failure');
      
      throw new Error(`Email delivery failed after ${retries + 1} attempts: ${error.message}`);
    }
  }

  /**
   * Send batch of emails with rate limiting
   */
  async sendBatchEmails(emailBatch) {
    if (!Array.isArray(emailBatch) || emailBatch.length === 0) {
      return { success: 0, failed: 0, errors: [] };
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    const batchSize = this.emailConfig.settings.batchSize;
    const rateLimitDelay = 60000 / this.emailConfig.settings.rateLimitPerMinute; // ms per email

    for (let i = 0; i < emailBatch.length; i += batchSize) {
      const batch = emailBatch.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (emailOptions) => {
        try {
          await this.sendEmail(emailOptions);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            email: emailOptions.to,
            error: error.message
          });
        }
      });

      await Promise.all(batchPromises);
      
      // Rate limiting delay between batches
      if (i + batchSize < emailBatch.length) {
        await this.delay(rateLimitDelay * batchSize);
      }
    }

    console.log(`Batch email completed: ${results.success} sent, ${results.failed} failed`);
    return results;
  }

  /**
   * Send report email with proper formatting
   */
  async sendReportEmail(tenantId, userEmail, reportData, reportType = 'insights') {
    try {
      const template = await this.getReportTemplate(reportType, reportData.tier);
      const trackingId = this.generateTrackingId(tenantId, reportType);
      
      const emailHtml = await this.renderTemplate(template, {
        ...reportData,
        tenantId,
        trackingId,
        unsubscribeUrl: `${process.env.APP_URL}/unsubscribe?tenant=${tenantId}&type=${reportType}`,
        viewOnlineUrl: `${process.env.APP_URL}/reports/${trackingId}`
      });

      const subject = this.generateReportSubject(reportData, reportType);

      const emailOptions = {
        to: userEmail,
        subject,
        html: emailHtml,
        type: 'report',
        tenantId,
        trackingId,
        unsubscribeUrl: `${process.env.APP_URL}/unsubscribe?tenant=${tenantId}&type=${reportType}`
      };

      // Add attachments if available
      if (reportData.attachments) {
        emailOptions.attachments = reportData.attachments;
      }

      return await this.sendEmail(emailOptions);
      
    } catch (error) {
      console.error('Failed to send report email:', error);
      throw error;
    }
  }

  /**
   * Generate report subject line based on tier and type
   */
  generateReportSubject(reportData, reportType) {
    const { tier, timeframe, totalRevenue, totalCustomers } = reportData;
    
    const frequency = {
      'monthly': 'Monthly',
      'weekly': 'Weekly', 
      'daily': 'Daily'
    }[timeframe] || 'Insights';

    const tierLabel = {
      'starter': 'Starter',
      'professional': 'Professional',
      'enterprise': 'Enterprise'
    }[tier] || 'Analytics';

    if (reportType === 'insights') {
      return `${frequency} ${tierLabel} Insights Report - ${this.formatCurrency(totalRevenue)} Revenue`;
    }

    if (reportType === 'custom') {
      return `Custom Analytics Report - ${reportData.reportName}`;
    }

    return `ProofKit ${frequency} Report`;
  }

  /**
   * Get report template based on type and tier
   */
  async getReportTemplate(reportType, tier) {
    const templateKey = `${reportType}_${tier}`;
    
    if (this.templates.has(templateKey)) {
      return this.templates.get(templateKey);
    }

    // Load template from file or generate dynamically
    const template = this.createReportTemplate(reportType, tier);
    this.templates.set(templateKey, template);
    
    return template;
  }

  /**
   * Create report template based on tier requirements
   */
  createReportTemplate(reportType, tier) {
    const baseStyles = `
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .metric-card { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 15px 0; border-left: 4px solid #667eea; }
        .metric-value { font-size: 32px; font-weight: bold; color: #1a202c; margin-bottom: 5px; }
        .metric-label { color: #718096; font-size: 14px; }
        .chart-placeholder { background: #e2e8f0; height: 200px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #718096; margin: 20px 0; }
        .insights { background: #e6fffa; border-left: 4px solid #38b2ac; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; color: #718096; font-size: 12px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .unsubscribe { color: #a0aec0; font-size: 11px; text-align: center; margin-top: 20px; }
        .tier-badge { background: #fed7d7; color: #c53030; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .enterprise .tier-badge { background: #faf089; color: #d69e2e; }
        .professional .tier-badge { background: #bee3f8; color: #3182ce; }
      </style>
    `;

    if (tier === 'starter') {
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h1>{{frequency}} Insights Report</h1>
            <div class="tier-badge">Starter Plan</div>
            <p>{{timeframeSummary}}</p>
          </div>
          <div class="content">
            <h2>Key Performance Metrics</h2>
            
            <div class="metric-card">
              <div class="metric-value">{{totalRevenue}}</div>
              <div class="metric-label">Total Revenue</div>
            </div>
            
            <div class="metric-card">
              <div class="metric-value">{{totalCustomers}}</div>
              <div class="metric-label">Total Customers</div>
            </div>
            
            <div class="metric-card">
              <div class="metric-value">{{averageOrderValue}}</div>
              <div class="metric-label">Average Order Value</div>
            </div>
            
            <div class="chart-placeholder">
              <div>📈 Revenue Trend Chart<br><small>Upgrade to Professional for interactive charts</small></div>
            </div>
            
            {{#if insights}}
            <div class="insights">
              <h3>💡 Key Insights</h3>
              {{#each insights}}
              <p><strong>{{type}}:</strong> {{message}}</p>
              {{/each}}
            </div>
            {{/if}}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{viewOnlineUrl}}" class="button">View Full Report Online</a>
            </div>
            
            <div style="background: #e2e8f0; padding: 20px; border-radius: 8px; text-align: center;">
              <h3>Upgrade to Professional</h3>
              <p>Get weekly reports, real-time analytics, and advanced ROAS tracking</p>
              <a href="{{upgradeUrl}}" class="button">Upgrade Now</a>
            </div>
          </div>
          <div class="footer">
            <p>ProofKit Analytics • <a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
          </div>
        </div>
      `;
    }

    if (tier === 'professional') {
      return `
        ${baseStyles}
        <div class="container professional">
          <div class="header">
            <h1>{{frequency}} Performance Report</h1>
            <div class="tier-badge">Professional Plan</div>
            <p>{{timeframeSummary}}</p>
          </div>
          <div class="content">
            <h2>Performance Dashboard</h2>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div class="metric-card">
                <div class="metric-value">{{totalRevenue}}</div>
                <div class="metric-label">Total Revenue</div>
              </div>
              
              <div class="metric-card">
                <div class="metric-value">{{roas}}</div>
                <div class="metric-label">ROAS</div>
              </div>
              
              <div class="metric-card">
                <div class="metric-value">{{totalCustomers}}</div>
                <div class="metric-label">Total Customers</div>
              </div>
              
              <div class="metric-card">
                <div class="metric-value">{{conversionRate}}%</div>
                <div class="metric-label">Conversion Rate</div>
              </div>
            </div>
            
            <div class="chart-placeholder">
              <div>📊 Interactive Performance Charts<br><small>Revenue, ROAS, and Customer Trends</small></div>
            </div>
            
            <h2>Advanced ROAS Analytics</h2>
            <div class="metric-card">
              <h3>Segment Performance</h3>
              {{#each segmentPerformance}}
              <p><strong>{{segment}}:</strong> {{roas}} ROAS ({{customers}} customers)</p>
              {{/each}}
            </div>
            
            {{#if insights}}
            <div class="insights">
              <h3>🎯 Strategic Insights</h3>
              {{#each insights}}
              <p><strong>{{type}}:</strong> {{message}}</p>
              {{/each}}
            </div>
            {{/if}}
            
            {{#if recommendations}}
            <div class="insights" style="background: #fff5f5; border-color: #e53e3e;">
              <h3>📋 Recommendations</h3>
              {{#each recommendations}}
              <p><strong>{{title}}:</strong> {{description}}</p>
              {{/each}}
            </div>
            {{/if}}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{viewOnlineUrl}}" class="button">View Interactive Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <p>ProofKit Professional Analytics • <a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
          </div>
        </div>
      `;
    }

    if (tier === 'enterprise') {
      return `
        ${baseStyles}
        <div class="container enterprise">
          <div class="header">
            <h1>{{frequency}} Executive Report</h1>
            <div class="tier-badge">Enterprise Plan</div>
            <p>{{timeframeSummary}}</p>
          </div>
          <div class="content">
            <h2>Executive Summary</h2>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
              <div class="metric-card">
                <div class="metric-value">{{totalRevenue}}</div>
                <div class="metric-label">Total Revenue</div>
                <div style="font-size: 12px; color: #38a169;">{{revenueGrowth}}% vs last period</div>
              </div>
              
              <div class="metric-card">
                <div class="metric-value">{{customRoas}}</div>
                <div class="metric-label">Custom ROAS Model</div>
                <div style="font-size: 12px; color: #38a169;">{{roasGrowth}}% improvement</div>
              </div>
              
              <div class="metric-card">
                <div class="metric-value">{{performanceScore}}</div>
                <div class="metric-label">Performance Score</div>
                <div style="font-size: 12px; color: #38a169;">Industry benchmark: 75</div>
              </div>
            </div>
            
            <h2>Custom Performance Dashboards</h2>
            <div class="chart-placeholder">
              <div>📈 Custom KPI Dashboard<br><small>{{customKpis}} custom metrics tracked</small></div>
            </div>
            
            <h2>Advanced Analytics</h2>
            <div class="metric-card">
              <h3>Customer Lifetime Value Analysis</h3>
              <p>Average CLV: <strong>{{averageClv}}</strong> ({{clvGrowth}}% growth)</p>
              <p>Top Segment: <strong>{{topSegment}}</strong> ({{topSegmentClv}} CLV)</p>
            </div>
            
            <div class="metric-card">
              <h3>Forecasting & Predictions</h3>
              {{#each forecasts}}
              <p><strong>{{metric}}:</strong> {{predicted}} ({{confidence}}% confidence)</p>
              {{/each}}
            </div>
            
            {{#if insights}}
            <div class="insights">
              <h3>🎯 Executive Insights</h3>
              {{#each insights}}
              <p><strong>{{level}} - {{type}}:</strong> {{message}}</p>
              {{/each}}
            </div>
            {{/if}}
            
            {{#if customReports}}
            <div class="insights" style="background: #f0fff4; border-color: #68d391;">
              <h3>📊 Custom Reports Available</h3>
              {{#each customReports}}
              <p><a href="{{url}}" style="color: #38a169;">{{name}}</a> - {{description}}</p>
              {{/each}}
            </div>
            {{/if}}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{viewOnlineUrl}}" class="button">View Custom Dashboard</a>
              <a href="{{customReportUrl}}" class="button" style="background: #38a169;">Generate Custom Report</a>
            </div>
          </div>
          <div class="footer">
            <p>ProofKit Enterprise Analytics • <a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
          </div>
        </div>
      `;
    }

    // Default template
    return baseStyles + '<div class="container"><div class="content"><h1>ProofKit Report</h1><p>{{content}}</p></div></div>';
  }

  /**
   * Simple template rendering (Handlebars-like)
   */
  async renderTemplate(template, data) {
    let rendered = template;
    
    // Handle simple {{variable}} replacements
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, data[key] || '');
    });
    
    // Handle conditional blocks {{#if condition}}
    rendered = rendered.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
      return data[condition] ? content : '';
    });
    
    // Handle each loops {{#each array}}
    rendered = rendered.replace(/{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g, (match, arrayName, template) => {
      const array = data[arrayName];
      if (!Array.isArray(array)) return '';
      
      return array.map(item => {
        let itemRendered = template;
        Object.keys(item).forEach(key => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          itemRendered = itemRendered.replace(regex, item[key] || '');
        });
        return itemRendered;
      }).join('');
    });
    
    return rendered;
  }

  /**
   * Generate unique tracking ID for emails
   */
  generateTrackingId(tenantId, type) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `${tenantId}_${type}_${timestamp}_${random}`;
  }

  /**
   * Format currency values
   */
  formatCurrency(amount) {
    if (!amount || amount === 0) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  /**
   * Update email metrics
   */
  updateMetrics(result, deliveryTime = 0) {
    if (result === 'success') {
      this.metrics.emailsSent++;
      if (deliveryTime > 0) {
        this.metrics.avgDeliveryTime = (this.metrics.avgDeliveryTime + deliveryTime) / this.metrics.emailsSent;
      }
    } else if (result === 'failure') {
      this.metrics.emailsFailed++;
    }
  }

  /**
   * Get email service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      isConfigured: this.isConfigured,
      deliveryRate: this.metrics.emailsSent > 0 
        ? ((this.metrics.emailsSent / (this.metrics.emailsSent + this.metrics.emailsFailed)) * 100).toFixed(2)
        : 0
    };
  }

  /**
   * Test email configuration
   */
  async testConfiguration() {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    try {
      const testEmail = {
        to: this.emailConfig.from.address,
        subject: 'ProofKit Email Service Test',
        html: '<h2>Email Service Test</h2><p>This is a test email from ProofKit automated reporting system.</p>',
        type: 'test'
      };

      const result = await this.sendEmail(testEmail);
      return {
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Test email failed',
        error: error.message
      };
    }
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for email service
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      configured: this.isConfigured,
      metrics: this.getMetrics(),
      timestamp: new Date().toISOString()
    };

    if (!this.isConfigured) {
      health.status = 'unhealthy';
      health.message = 'SMTP not configured';
    }

    return health;
  }
}

// Singleton instance
const emailService = new EmailService();

export default emailService;
export { EmailService };