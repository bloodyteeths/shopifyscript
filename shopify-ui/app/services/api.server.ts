import { backendFetch, backendFetchRaw, backendFetchText } from '../server/hmac.server';
import type { User } from './auth.server';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DashboardMetrics {
  totalVisitors: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  campaigns: {
    active: number;
    paused: number;
    total: number;
  };
  audiences: {
    total: number;
    activeSegments: number;
  };
  performance: {
    impressions: number;
    clicks: number;
    ctr: number;
    avgCpc: number;
  };
  trends: {
    visitors: Array<{ date: string; value: number }>;
    conversions: Array<{ date: string; value: number }>;
    revenue: Array<{ date: string; value: number }>;
  };
}

export interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'ended';
  type: 'search' | 'display' | 'shopping' | 'video';
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
  roas: number;
  createdAt: string;
  updatedAt: string;
  targeting: {
    keywords?: string[];
    demographics?: Record<string, any>;
    locations?: string[];
    audiences?: string[];
  };
}

export interface Audience {
  id: string;
  name: string;
  description?: string;
  type: 'custom' | 'lookalike' | 'interest' | 'behavioral';
  size: number;
  status: 'active' | 'inactive';
  rules: {
    conditions: Array<{
      field: string;
      operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
      value: any;
    }>;
    logic: 'and' | 'or';
  };
  performance?: {
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    conversionRate: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AppConfig {
  shopify: {
    shop: string;
    accessToken?: string;
    webhooksEnabled: boolean;
    installedAt: string;
  };
  googleAds: {
    accountId?: string;
    connected: boolean;
    refreshToken?: string;
    lastSync?: string;
  };
  tracking: {
    pixelId?: string;
    conversionTracking: boolean;
    enhancedConversions: boolean;
    consentMode: 'basic' | 'advanced' | 'disabled';
  };
  automation: {
    autopilotEnabled: boolean;
    bidOptimization: boolean;
    budgetOptimization: boolean;
    keywordExpansion: boolean;
  };
  notifications: {
    email: boolean;
    webhook?: string;
    slackWebhook?: string;
  };
}

// API Service Class
export class ApiService {
  constructor(private user?: User) {}

  // Dashboard & Analytics
  async getDashboardMetrics(dateRange: '7d' | '30d' | '90d' = '30d'): Promise<ApiResponse<DashboardMetrics>> {
    try {
      const { status, json } = await backendFetch(`/dashboard/metrics?range=${dateRange}`, 'GET');
      
      if (status === 200 && json.success) {
        return { success: true, data: json.data };
      }
      
      return { success: false, error: json.error || 'Failed to fetch dashboard metrics' };
    } catch (error) {
      return { success: false, error: 'Network error while fetching dashboard metrics' };
    }
  }

  async getSummary(): Promise<ApiResponse<any>> {
    try {
      const { status, json } = await backendFetch('/summary', 'GET');
      
      if (status === 200) {
        return { success: true, data: json };
      }
      
      return { success: false, error: json.error || 'Failed to fetch summary' };
    } catch (error) {
      return { success: false, error: 'Network error while fetching summary' };
    }
  }

  async getInsights(limit: number = 50): Promise<ApiResponse<any[]>> {
    try {
      const { status, json } = await backendFetch(`/insights?limit=${limit}`, 'GET');
      
      if (status === 200 && json.success) {
        return { success: true, data: json.data };
      }
      
      return { success: false, error: json.error || 'Failed to fetch insights' };
    } catch (error) {
      return { success: false, error: 'Network error while fetching insights' };
    }
  }

  // Campaign Management
  async getCampaigns(): Promise<ApiResponse<Campaign[]>> {
    try {
      const { status, json } = await backendFetch('/campaigns', 'GET');
      
      if (status === 200 && json.success) {
        return { success: true, data: json.data };
      }
      
      return { success: false, error: json.error || 'Failed to fetch campaigns' };
    } catch (error) {
      return { success: false, error: 'Network error while fetching campaigns' };
    }
  }

  async createCampaign(campaign: Partial<Campaign>): Promise<ApiResponse<Campaign>> {
    try {
      const { status, json } = await backendFetch('/campaigns', 'POST', campaign);
      
      if (status === 201 && json.success) {
        return { success: true, data: json.data };
      }
      
      return { success: false, error: json.error || 'Failed to create campaign' };
    } catch (error) {
      return { success: false, error: 'Network error while creating campaign' };
    }
  }

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<ApiResponse<Campaign>> {
    try {
      const { status, json } = await backendFetch(`/campaigns/${id}`, 'POST', updates);
      
      if (status === 200 && json.success) {
        return { success: true, data: json.data };
      }
      
      return { success: false, error: json.error || 'Failed to update campaign' };
    } catch (error) {
      return { success: false, error: 'Network error while updating campaign' };
    }
  }

  async pauseCampaign(id: string): Promise<ApiResponse<void>> {
    try {
      const { status, json } = await backendFetch(`/campaigns/${id}/pause`, 'POST');
      
      if (status === 200 && json.success) {
        return { success: true };
      }
      
      return { success: false, error: json.error || 'Failed to pause campaign' };
    } catch (error) {
      return { success: false, error: 'Network error while pausing campaign' };
    }
  }

  // Audience Management
  async getAudiences(): Promise<ApiResponse<Audience[]>> {
    try {
      const { status, json } = await backendFetch('/audiences', 'GET');
      
      if (status === 200 && json.success) {
        return { success: true, data: json.data };
      }
      
      return { success: false, error: json.error || 'Failed to fetch audiences' };
    } catch (error) {
      return { success: false, error: 'Network error while fetching audiences' };
    }
  }

  async createAudience(audience: Partial<Audience>): Promise<ApiResponse<Audience>> {
    try {
      const { status, json } = await backendFetch('/audiences', 'POST', audience);
      
      if (status === 201 && json.success) {
        return { success: true, data: json.data };
      }
      
      return { success: false, error: json.error || 'Failed to create audience' };
    } catch (error) {
      return { success: false, error: 'Network error while creating audience' };
    }
  }

  async updateAudience(id: string, updates: Partial<Audience>): Promise<ApiResponse<Audience>> {
    try {
      const { status, json } = await backendFetch(`/audiences/${id}`, 'POST', updates);
      
      if (status === 200 && json.success) {
        return { success: true, data: json.data };
      }
      
      return { success: false, error: json.error || 'Failed to update audience' };
    } catch (error) {
      return { success: false, error: 'Network error while updating audience' };
    }
  }

  async deleteAudience(id: string): Promise<ApiResponse<void>> {
    try {
      const { status, json } = await backendFetch(`/audiences/${id}`, 'POST', { _method: 'DELETE' });
      
      if (status === 200 && json.success) {
        return { success: true };
      }
      
      return { success: false, error: json.error || 'Failed to delete audience' };
    } catch (error) {
      return { success: false, error: 'Network error while deleting audience' };
    }
  }

  // Configuration Management
  async getConfig(): Promise<ApiResponse<AppConfig>> {
    try {
      const { status, json } = await backendFetch('/config', 'GET');
      
      if (status === 200) {
        return { success: true, data: json };
      }
      
      return { success: false, error: json.error || 'Failed to fetch configuration' };
    } catch (error) {
      return { success: false, error: 'Network error while fetching configuration' };
    }
  }

  async updateConfig(config: Partial<AppConfig>): Promise<ApiResponse<AppConfig>> {
    try {
      const { status, json } = await backendFetch('/upsertConfig', 'POST', config);
      
      if (status === 200 && json.success) {
        return { success: true, data: json.data };
      }
      
      return { success: false, error: json.error || 'Failed to update configuration' };
    } catch (error) {
      return { success: false, error: 'Network error while updating configuration' };
    }
  }

  // Autopilot & Automation
  async getAutopilotStatus(): Promise<ApiResponse<any>> {
    try {
      const { status, json } = await backendFetch('/autopilot/status', 'GET');
      
      if (status === 200) {
        return { success: true, data: json };
      }
      
      return { success: false, error: json.error || 'Failed to fetch autopilot status' };
    } catch (error) {
      return { success: false, error: 'Network error while fetching autopilot status' };
    }
  }

  async triggerAutopilot(): Promise<ApiResponse<void>> {
    try {
      const { status, json } = await backendFetch('/jobs/autopilot_tick', 'POST');
      
      if (status === 200 && json.success) {
        return { success: true };
      }
      
      return { success: false, error: json.error || 'Failed to trigger autopilot' };
    } catch (error) {
      return { success: false, error: 'Network error while triggering autopilot' };
    }
  }

  // Diagnostics & Health
  async getDiagnostics(): Promise<ApiResponse<any>> {
    try {
      const { status, json } = await backendFetch('/diagnostics', 'GET');
      
      if (status === 200) {
        return { success: true, data: json };
      }
      
      return { success: false, error: json.error || 'Failed to fetch diagnostics' };
    } catch (error) {
      return { success: false, error: 'Network error while fetching diagnostics' };
    }
  }

  async getRunLogs(limit: number = 100): Promise<ApiResponse<any[]>> {
    try {
      const { status, json } = await backendFetch(`/run-logs?limit=${limit}`, 'GET');
      
      if (status === 200 && json.success) {
        return { success: true, data: json.data };
      }
      
      return { success: false, error: json.error || 'Failed to fetch run logs' };
    } catch (error) {
      return { success: false, error: 'Network error while fetching run logs' };
    }
  }

  // Google Sheets Integration
  async testSheetsConnection(): Promise<ApiResponse<void>> {
    try {
      const { status, json } = await backendFetch('/connect/sheets/test', 'POST');
      
      if (status === 200 && json.success) {
        return { success: true };
      }
      
      return { success: false, error: json.error || 'Sheets connection test failed' };
    } catch (error) {
      return { success: false, error: 'Network error while testing sheets connection' };
    }
  }

  async saveSheetsConfig(config: any): Promise<ApiResponse<void>> {
    try {
      const { status, json } = await backendFetch('/connect/sheets/save', 'POST', config);
      
      if (status === 200 && json.success) {
        return { success: true };
      }
      
      return { success: false, error: json.error || 'Failed to save sheets configuration' };
    } catch (error) {
      return { success: false, error: 'Network error while saving sheets configuration' };
    }
  }

  // Export utilities
  async exportInsightsCsv(): Promise<Response | null> {
    try {
      return await backendFetchRaw('/insights/export/csv', 'GET');
    } catch (error) {
      console.error('Error exporting insights CSV:', error);
      return null;
    }
  }

  async getAdsScript(): Promise<string | null> {
    try {
      return await backendFetchText('/ads-script/raw');
    } catch (error) {
      console.error('Error fetching ads script:', error);
      return null;
    }
  }
}

// Factory function to create API service with user context
export function createApiService(user?: User): ApiService {
  return new ApiService(user);
}

// Utility function for handling API responses in loaders/actions
export function handleApiResponse<T>(response: ApiResponse<T>) {
  if (!response.success) {
    throw new Response(response.error || 'API request failed', {
      status: 400,
      statusText: 'Bad Request'
    });
  }
  return response.data;
}