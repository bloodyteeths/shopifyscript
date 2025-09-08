/**
 * Dashboard Builder Service
 * Handles Enterprise custom dashboard creation, management, and data provisioning
 * 
 * Features:
 * - Custom dashboard CRUD operations
 * - Widget management and configuration
 * - Template-based dashboard creation
 * - Data aggregation for dashboard widgets
 * - Access control and tier enforcement
 */

import { supabase } from "./supabase-client.js";
import analyticsTiers from "./analytics-tiers.js";

class DashboardBuilderService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes cache for dashboard data
    this.supportedWidgetTypes = [
      'metric_card',
      'line_chart',
      'bar_chart', 
      'area_chart',
      'pie_chart',
      'table',
      'kpi_grid',
      'heatmap',
      'funnel',
      'custom'
    ];
    this.supportedDataSources = [
      'metrics',
      'campaigns', 
      'search_terms',
      'custom_query',
      'kpis'
    ];
  }

  /**
   * Create a new custom dashboard
   */
  async createDashboard(tenant, dashboardData) {
    try {
      // Verify Enterprise tier access
      const hasAccess = await analyticsTiers.hasFeature(tenant, 'customDashboards');
      if (!hasAccess) {
        throw new Error('Custom dashboards require Enterprise tier');
      }

      // Set tenant context for RLS
      await supabase.rpc('set_tenant_context', { tenant_id: tenant });

      const {
        dashboard_name,
        description = '',
        layout_config = this.getDefaultLayoutConfig(),
        theme_config = this.getDefaultThemeConfig(),
        is_default = false
      } = dashboardData;

      // Generate URL-friendly slug
      const dashboard_slug = this.generateSlug(dashboard_name);

      // If setting as default, unset other defaults
      if (is_default) {
        await supabase
          .from('custom_dashboards')
          .update({ is_default: false })
          .eq('tenant_id', tenant);
      }

      const { data: dashboard, error } = await supabase
        .from('custom_dashboards')
        .insert({
          tenant_id: tenant,
          dashboard_name,
          dashboard_slug,
          description,
          layout_config,
          theme_config,
          is_default
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create dashboard: ${error.message}`);
      }

      // Log access for analytics
      await this.logDashboardAccess(tenant, dashboard.id, 'create');

      return {
        success: true,
        data: dashboard
      };

    } catch (error) {
      console.error('Error creating dashboard:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create dashboard from template
   */
  async createDashboardFromTemplate(tenant, templateId, dashboardName) {
    try {
      // Verify Enterprise tier access
      const hasAccess = await analyticsTiers.hasFeature(tenant, 'customDashboards');
      if (!hasAccess) {
        throw new Error('Custom dashboards require Enterprise tier');
      }

      // Get template
      const { data: template, error: templateError } = await supabase
        .from('dashboard_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError || !template) {
        throw new Error('Template not found');
      }

      // Verify tier requirement for template
      const tierFeatures = await analyticsTiers.getTierFeatures(tenant);
      if (!this.validateTierRequirement(tierFeatures.tier, template.tier_requirement)) {
        throw new Error(`Template requires ${template.tier_requirement} tier`);
      }

      // Create dashboard from template
      const dashboardResult = await this.createDashboard(tenant, {
        dashboard_name: dashboardName,
        description: `Created from ${template.template_name} template`,
        layout_config: template.layout_config,
        theme_config: template.theme_config
      });

      if (!dashboardResult.success) {
        throw new Error(dashboardResult.error);
      }

      const dashboard = dashboardResult.data;

      // Create widgets from template
      await supabase.rpc('set_tenant_context', { tenant_id: tenant });

      const widgetPromises = template.widget_configs.map(async (widgetConfig) => {
        return supabase
          .from('dashboard_widgets')
          .insert({
            dashboard_id: dashboard.id,
            widget_type: widgetConfig.widget_type,
            widget_title: widgetConfig.widget_title,
            widget_config: widgetConfig.widget_config,
            position_config: widgetConfig.position_config,
            data_source: widgetConfig.data_source,
            filters: widgetConfig.filters || {}
          });
      });

      await Promise.all(widgetPromises);

      return {
        success: true,
        data: await this.getDashboard(tenant, dashboard.id)
      };

    } catch (error) {
      console.error('Error creating dashboard from template:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get dashboard with widgets
   */
  async getDashboard(tenant, dashboardId) {
    try {
      // Set tenant context for RLS
      await supabase.rpc('set_tenant_context', { tenant_id: tenant });

      const { data: dashboard, error: dashboardError } = await supabase
        .from('custom_dashboards')
        .select('*')
        .eq('id', dashboardId)
        .single();

      if (dashboardError || !dashboard) {
        throw new Error('Dashboard not found');
      }

      const { data: widgets, error: widgetsError } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('dashboard_id', dashboardId)
        .eq('is_visible', true)
        .order('created_at', { ascending: true });

      if (widgetsError) {
        throw new Error(`Failed to load widgets: ${widgetsError.message}`);
      }

      // Update last viewed timestamp and view count
      await supabase
        .from('custom_dashboards')
        .update({
          last_viewed_at: new Date().toISOString(),
          view_count: dashboard.view_count + 1
        })
        .eq('id', dashboardId);

      // Log access for analytics
      await this.logDashboardAccess(tenant, dashboardId, 'view');

      return {
        ...dashboard,
        widgets: widgets || []
      };

    } catch (error) {
      console.error('Error getting dashboard:', error);
      throw error;
    }
  }

  /**
   * Get all dashboards for tenant
   */
  async getDashboards(tenant, options = {}) {
    try {
      // Verify Enterprise tier access
      const hasAccess = await analyticsTiers.hasFeature(tenant, 'customDashboards');
      if (!hasAccess) {
        return {
          success: false,
          error: 'Custom dashboards require Enterprise tier',
          upgradeRequired: true
        };
      }

      // Set tenant context for RLS
      await supabase.rpc('set_tenant_context', { tenant_id: tenant });

      const { 
        includeWidgets = false,
        limit = 50,
        offset = 0
      } = options;

      let query = supabase
        .from('custom_dashboards')
        .select(`
          id,
          dashboard_name,
          dashboard_slug,
          description,
          layout_config,
          theme_config,
          is_default,
          is_shared,
          created_at,
          updated_at,
          last_viewed_at,
          view_count
          ${includeWidgets ? ',dashboard_widgets(*)' : ''}
        `)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: dashboards, error } = await query;

      if (error) {
        throw new Error(`Failed to get dashboards: ${error.message}`);
      }

      return {
        success: true,
        data: dashboards || []
      };

    } catch (error) {
      console.error('Error getting dashboards:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update dashboard
   */
  async updateDashboard(tenant, dashboardId, updates) {
    try {
      // Set tenant context for RLS
      await supabase.rpc('set_tenant_context', { tenant_id: tenant });

      // If setting as default, unset other defaults
      if (updates.is_default) {
        await supabase
          .from('custom_dashboards')
          .update({ is_default: false })
          .eq('tenant_id', tenant);
      }

      // Update slug if name changed
      if (updates.dashboard_name) {
        updates.dashboard_slug = this.generateSlug(updates.dashboard_name);
      }

      const { data: dashboard, error } = await supabase
        .from('custom_dashboards')
        .update(updates)
        .eq('id', dashboardId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update dashboard: ${error.message}`);
      }

      // Log access for analytics
      await this.logDashboardAccess(tenant, dashboardId, 'edit');

      // Clear cache
      this.clearDashboardCache(tenant, dashboardId);

      return {
        success: true,
        data: dashboard
      };

    } catch (error) {
      console.error('Error updating dashboard:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(tenant, dashboardId) {
    try {
      // Set tenant context for RLS
      await supabase.rpc('set_tenant_context', { tenant_id: tenant });

      const { error } = await supabase
        .from('custom_dashboards')
        .delete()
        .eq('id', dashboardId);

      if (error) {
        throw new Error(`Failed to delete dashboard: ${error.message}`);
      }

      // Clear cache
      this.clearDashboardCache(tenant, dashboardId);

      return {
        success: true
      };

    } catch (error) {
      console.error('Error deleting dashboard:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add widget to dashboard
   */
  async addWidget(tenant, dashboardId, widgetData) {
    try {
      // Set tenant context for RLS
      await supabase.rpc('set_tenant_context', { tenant_id: tenant });

      // Validate widget type
      if (!this.supportedWidgetTypes.includes(widgetData.widget_type)) {
        throw new Error(`Unsupported widget type: ${widgetData.widget_type}`);
      }

      // Validate data source
      if (!this.supportedDataSources.includes(widgetData.data_source)) {
        throw new Error(`Unsupported data source: ${widgetData.data_source}`);
      }

      const { data: widget, error } = await supabase
        .from('dashboard_widgets')
        .insert({
          dashboard_id: dashboardId,
          ...widgetData
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to add widget: ${error.message}`);
      }

      // Clear cache
      this.clearDashboardCache(tenant, dashboardId);

      return {
        success: true,
        data: widget
      };

    } catch (error) {
      console.error('Error adding widget:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update widget
   */
  async updateWidget(tenant, widgetId, updates) {
    try {
      // Set tenant context for RLS
      await supabase.rpc('set_tenant_context', { tenant_id: tenant });

      const { data: widget, error } = await supabase
        .from('dashboard_widgets')
        .update(updates)
        .eq('id', widgetId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update widget: ${error.message}`);
      }

      // Clear cache
      this.clearDashboardCache(tenant, widget.dashboard_id);

      return {
        success: true,
        data: widget
      };

    } catch (error) {
      console.error('Error updating widget:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete widget
   */
  async deleteWidget(tenant, widgetId) {
    try {
      // Set tenant context for RLS
      await supabase.rpc('set_tenant_context', { tenant_id: tenant });

      const { error } = await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('id', widgetId);

      if (error) {
        throw new Error(`Failed to delete widget: ${error.message}`);
      }

      return {
        success: true
      };

    } catch (error) {
      console.error('Error deleting widget:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get widget data
   */
  async getWidgetData(tenant, widgetId, dateRange = '30d') {
    try {
      const cacheKey = `widget-data:${tenant}:${widgetId}:${dateRange}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      // Set tenant context for RLS
      await supabase.rpc('set_tenant_context', { tenant_id: tenant });

      // Get widget configuration
      const { data: widget, error: widgetError } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('id', widgetId)
        .single();

      if (widgetError || !widget) {
        throw new Error('Widget not found');
      }

      // Get data based on widget data source and configuration
      const data = await this.fetchWidgetData(
        tenant,
        widget.data_source,
        widget.widget_config,
        widget.filters,
        dateRange
      );

      // Apply tier-specific transformations
      const tierData = await analyticsTiers.transformDataForTier(tenant, data);

      const result = {
        success: true,
        data: {
          widget,
          chartData: tierData,
          lastUpdated: new Date().toISOString()
        }
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('Error getting widget data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get available dashboard templates
   */
  async getTemplates(tenant) {
    try {
      const tierFeatures = await analyticsTiers.getTierFeatures(tenant);

      const { data: templates, error } = await supabase
        .from('dashboard_templates')
        .select('*')
        .order('template_category', { ascending: true });

      if (error) {
        throw new Error(`Failed to get templates: ${error.message}`);
      }

      // Filter templates based on tier
      const filteredTemplates = templates.filter(template => 
        this.validateTierRequirement(tierFeatures.tier, template.tier_requirement)
      );

      return {
        success: true,
        data: filteredTemplates
      };

    } catch (error) {
      console.error('Error getting templates:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export dashboard
   */
  async exportDashboard(tenant, dashboardId, format = 'json') {
    try {
      const dashboard = await this.getDashboard(tenant, dashboardId);
      
      // Log access for analytics
      await this.logDashboardAccess(tenant, dashboardId, 'export', { format });

      switch (format.toLowerCase()) {
        case 'json':
          return {
            success: true,
            data: dashboard,
            filename: `dashboard-${dashboard.dashboard_slug}.json`
          };

        case 'pdf':
          // This would integrate with a PDF generation service
          return {
            success: false,
            error: 'PDF export not yet implemented'
          };

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

    } catch (error) {
      console.error('Error exporting dashboard:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fetch data for widgets based on data source
   */
  async fetchWidgetData(tenant, dataSource, widgetConfig, filters, dateRange) {
    const dateFilter = this.buildDateFilter(dateRange);
    
    switch (dataSource) {
      case 'metrics':
        return this.fetchMetricsData(tenant, widgetConfig, filters, dateFilter);
      
      case 'campaigns':
        return this.fetchCampaignData(tenant, widgetConfig, filters, dateFilter);
      
      case 'search_terms':
        return this.fetchSearchTermsData(tenant, widgetConfig, filters, dateFilter);
      
      case 'kpis':
        return this.fetchCustomKPIData(tenant, widgetConfig, filters, dateFilter);
      
      default:
        throw new Error(`Unknown data source: ${dataSource}`);
    }
  }

  /**
   * Fetch metrics data
   */
  async fetchMetricsData(tenant, widgetConfig, filters, dateFilter) {
    let query = supabase
      .from('tenant_metrics')
      .select('*')
      .eq('tenant_id', tenant)
      .gte('date', dateFilter.start)
      .lte('date', dateFilter.end);

    // Apply filters
    if (filters.campaign_name) {
      query = query.eq('campaign_name', filters.campaign_name);
    }

    if (filters.entity_type) {
      query = query.eq('entity_type', filters.entity_type);
    }

    const { data, error } = await query.order('date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch metrics: ${error.message}`);
    }

    return this.transformDataForWidget(data, widgetConfig);
  }

  /**
   * Fetch campaign data
   */
  async fetchCampaignData(tenant, widgetConfig, filters, dateFilter) {
    let query = supabase
      .from('tenant_metrics')
      .select('*')
      .eq('tenant_id', tenant)
      .eq('entity_type', 'campaign')
      .gte('date', dateFilter.start)
      .lte('date', dateFilter.end);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch campaign data: ${error.message}`);
    }

    return this.transformDataForWidget(data, widgetConfig);
  }

  /**
   * Fetch search terms data
   */
  async fetchSearchTermsData(tenant, widgetConfig, filters, dateFilter) {
    let query = supabase
      .from('search_terms')
      .select('*')
      .eq('tenant_id', tenant)
      .gte('date', dateFilter.start)
      .lte('date', dateFilter.end);

    const { data, error } = await query.order('conversions', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch search terms: ${error.message}`);
    }

    return this.transformDataForWidget(data, widgetConfig);
  }

  /**
   * Fetch custom KPI data
   */
  async fetchCustomKPIData(tenant, widgetConfig, filters, dateFilter) {
    // This would implement custom KPI calculations
    // For now, return placeholder data
    return {
      kpi: {
        custom_metric_1: 150.5,
        custom_metric_2: 85.2
      },
      series: []
    };
  }

  /**
   * Transform raw data for specific widget type
   */
  transformDataForWidget(data, widgetConfig) {
    if (!data || data.length === 0) {
      return { kpi: {}, series: [], charts: [] };
    }

    // Calculate KPIs
    const kpi = this.calculateKPIs(data);

    // Prepare series data for charts
    const series = data.map(row => ({
      date: row.date,
      clicks: row.clicks || 0,
      cost: (row.cost_micros || 0) / 1000000,
      conv: row.conversions || 0,
      impr: row.impressions || 0,
      ctr: row.ctr || 0,
      cpc: row.cost_micros && row.clicks ? (row.cost_micros / 1000000) / row.clicks : 0
    }));

    return {
      kpi,
      series,
      charts: this.prepareChartData(series, widgetConfig)
    };
  }

  /**
   * Calculate KPIs from raw data
   */
  calculateKPIs(data) {
    const totals = data.reduce((acc, row) => {
      acc.clicks += row.clicks || 0;
      acc.cost += (row.cost_micros || 0) / 1000000;
      acc.conversions += row.conversions || 0;
      acc.impressions += row.impressions || 0;
      return acc;
    }, { clicks: 0, cost: 0, conversions: 0, impressions: 0 });

    return {
      clicks: totals.clicks,
      cost: totals.cost.toFixed(2),
      conversions: totals.conversions.toFixed(2),
      impressions: totals.impressions,
      ctr: totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : 0,
      cpc: totals.clicks > 0 ? (totals.cost / totals.clicks).toFixed(2) : 0,
      cpa: totals.conversions > 0 ? (totals.cost / totals.conversions).toFixed(2) : 0
    };
  }

  /**
   * Prepare chart-specific data
   */
  prepareChartData(series, widgetConfig) {
    // This would prepare data specific to chart types (bar, pie, etc.)
    return series;
  }

  /**
   * Build date filter based on range
   */
  buildDateFilter(dateRange) {
    const end = new Date();
    const start = new Date();

    switch (dateRange) {
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      default:
        start.setDate(start.getDate() - 30);
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }

  /**
   * Generate URL-friendly slug from name
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }

  /**
   * Validate tier requirement
   */
  validateTierRequirement(userTier, requiredTier) {
    const tierLevels = { starter: 1, professional: 2, enterprise: 3 };
    return tierLevels[userTier] >= tierLevels[requiredTier];
  }

  /**
   * Log dashboard access for analytics
   */
  async logDashboardAccess(tenant, dashboardId, accessType, metadata = {}) {
    try {
      await supabase
        .from('dashboard_access_logs')
        .insert({
          tenant_id: tenant,
          dashboard_id: dashboardId,
          access_type: accessType,
          ...metadata
        });
    } catch (error) {
      // Log access errors shouldn't break the main flow
      console.error('Error logging dashboard access:', error);
    }
  }

  /**
   * Clear dashboard cache
   */
  clearDashboardCache(tenant, dashboardId) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(`${tenant}:${dashboardId}`) || key.includes(`widget-data:${tenant}`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get default layout configuration
   */
  getDefaultLayoutConfig() {
    return {
      cols: 12,
      rowHeight: 60,
      margin: [10, 10],
      containerPadding: [10, 10],
      breakpoints: {
        lg: 1200,
        md: 996,
        sm: 768,
        xs: 480,
        xxs: 0
      }
    };
  }

  /**
   * Get default theme configuration
   */
  getDefaultThemeConfig() {
    return {
      primaryColor: '#5C6AC4',
      secondaryColor: '#00A047',
      backgroundColor: '#f8f9fa',
      cardStyle: 'elevated',
      fontFamily: 'Inter, sans-serif'
    };
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      status: 'healthy',
      cacheSize: this.cache.size,
      supportedWidgetTypes: this.supportedWidgetTypes,
      supportedDataSources: this.supportedDataSources,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
const dashboardBuilder = new DashboardBuilderService();
export default dashboardBuilder;
export { DashboardBuilderService };