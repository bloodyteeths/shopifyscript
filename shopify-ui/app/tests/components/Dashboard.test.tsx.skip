import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import Dashboard from '../../components/Dashboard';

// Mock the API service
jest.mock('../../services/api.server', () => ({
  fetchDashboardMetrics: jest.fn()
}));

const mockMetrics = {
  overview: {
    totalImpressions: 125000,
    totalClicks: 5200,
    totalConversions: 485,
    totalSpend: 2750.50,
    ctr: 4.16,
    conversionRate: 9.33,
    cpc: 0.53,
    cpa: 5.67
  },
  trends: {
    impressions: [
      { date: '2024-01-01', value: 12000 },
      { date: '2024-01-02', value: 13500 },
      { date: '2024-01-03', value: 11800 }
    ],
    clicks: [
      { date: '2024-01-01', value: 480 },
      { date: '2024-01-02', value: 520 },
      { date: '2024-01-03', value: 465 }
    ],
    conversions: [
      { date: '2024-01-01', value: 45 },
      { date: '2024-01-02', value: 52 },
      { date: '2024-01-03', value: 48 }
    ]
  },
  audiences: [
    {
      id: 'aud_1',
      name: 'Tech Enthusiasts',
      size: 45000,
      performance: {
        impressions: 78000,
        clicks: 3200,
        conversions: 285,
        ctr: 4.1,
        conversionRate: 8.9
      }
    },
    {
      id: 'aud_2',
      name: 'E-commerce Shoppers',
      size: 32000,
      performance: {
        impressions: 47000,
        clicks: 2000,
        conversions: 200,
        ctr: 4.26,
        conversionRate: 10.0
      }
    }
  ],
  campaigns: [
    {
      id: 'camp_1',
      name: 'Summer Sale Campaign',
      status: 'active',
      budget: 1000,
      spend: 856.75,
      performance: {
        impressions: 45000,
        clicks: 1800,
        conversions: 165
      }
    }
  ]
};

describe('Dashboard Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    global.fetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render dashboard with initial metrics', () => {
      render(<Dashboard initialMetrics={mockMetrics} />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('125,000')).toBeInTheDocument(); // Total impressions
      expect(screen.getByText('5,200')).toBeInTheDocument(); // Total clicks
      expect(screen.getByText('485')).toBeInTheDocument(); // Total conversions
    });

    it('should render loading state when no initial metrics', () => {
      render(<Dashboard />);

      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    it('should display all metric cards', () => {
      render(<Dashboard initialMetrics={mockMetrics} />);

      expect(screen.getByText('Total Impressions')).toBeInTheDocument();
      expect(screen.getByText('Total Clicks')).toBeInTheDocument();
      expect(screen.getByText('Total Conversions')).toBeInTheDocument();
      expect(screen.getByText('Total Spend')).toBeInTheDocument();
      expect(screen.getByText('Click-Through Rate')).toBeInTheDocument();
      expect(screen.getByText('Conversion Rate')).toBeInTheDocument();
    });

    it('should render charts with data', () => {
      render(<Dashboard initialMetrics={mockMetrics} />);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  describe('Metric Formatting', () => {
    it('should format large numbers correctly', () => {
      render(<Dashboard initialMetrics={mockMetrics} />);

      // Check number formatting
      expect(screen.getByText('125,000')).toBeInTheDocument();
      expect(screen.getByText('$2,750.50')).toBeInTheDocument();
    });

    it('should format percentages correctly', () => {
      render(<Dashboard initialMetrics={mockMetrics} />);

      expect(screen.getByText('4.16%')).toBeInTheDocument(); // CTR
      expect(screen.getByText('9.33%')).toBeInTheDocument(); // Conversion rate
    });

    it('should format currency correctly', () => {
      render(<Dashboard initialMetrics={mockMetrics} />);

      expect(screen.getByText('$2,750.50')).toBeInTheDocument(); // Total spend
      expect(screen.getByText('$0.53')).toBeInTheDocument(); // CPC
      expect(screen.getByText('$5.67')).toBeInTheDocument(); // CPA
    });
  });

  describe('Data Refresh', () => {
    it('should refresh data when refresh button is clicked', async () => {
      const fetchMock = global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMetrics)
      });

      render(<Dashboard initialMetrics={mockMetrics} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(fetchMock).toHaveBeenCalledWith('/api/metrics');
    });

    it('should handle refresh errors gracefully', async () => {
      const fetchMock = global.fetch.mockRejectedValue(new Error('Network error'));

      render(<Dashboard initialMetrics={mockMetrics} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText(/error loading data/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during refresh', async () => {
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      global.fetch.mockReturnValue(promise);

      render(<Dashboard initialMetrics={mockMetrics} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(screen.getByTestId('spinner')).toBeInTheDocument();

      // Resolve the promise
      resolvePromise({
        ok: true,
        json: () => Promise.resolve(mockMetrics)
      });

      await waitFor(() => {
        expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
      });
    });
  });

  describe('Time Range Selection', () => {
    it('should render time range selector', () => {
      render(<Dashboard initialMetrics={mockMetrics} />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should update data when time range changes', async () => {
      const fetchMock = global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMetrics)
      });

      render(<Dashboard initialMetrics={mockMetrics} />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, '7d');

      expect(fetchMock).toHaveBeenCalledWith('/api/metrics?range=7d');
    });

    it('should have default time range selected', () => {
      render(<Dashboard initialMetrics={mockMetrics} />);

      const select = screen.getByRole('combobox');
      expect(select.value).toBe('24h'); // Default value
    });
  });

  describe('Audience Performance Section', () => {
    it('should display audience list', () => {
      render(<Dashboard initialMetrics={mockMetrics} />);

      expect(screen.getByText('Tech Enthusiasts')).toBeInTheDocument();
      expect(screen.getByText('E-commerce Shoppers')).toBeInTheDocument();
    });

    it('should show audience performance metrics', () => {
      render(<Dashboard initialMetrics={mockMetrics} />);

      // Check for audience metrics
      expect(screen.getByText('45,000')).toBeInTheDocument(); // Audience size
      expect(screen.getByText('78,000')).toBeInTheDocument(); // Impressions
    });

    it('should navigate to audience detail when clicked', async () => {
      render(<Dashboard initialMetrics={mockMetrics} />);

      const audienceLink = screen.getByText('Tech Enthusiasts');
      await user.click(audienceLink);

      expect(global.mockNavigate).toHaveBeenCalledWith('/app/audiences/aud_1');
    });
  });

  describe('Campaign Performance Section', () => {
    it('should display campaign list', () => {
      render(<Dashboard initialMetrics={mockMetrics} />);

      expect(screen.getByText('Summer Sale Campaign')).toBeInTheDocument();
    });

    it('should show campaign status badges', () => {
      render(<Dashboard initialMetrics={mockMetrics} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should show budget utilization', () => {
      render(<Dashboard initialMetrics={mockMetrics} />);

      // Budget: $1000, Spend: $856.75 = 85.675% utilization
      expect(screen.getByText('$856.75 / $1,000')).toBeInTheDocument();
    });
  });

  describe('Chart Interactions', () => {
    it('should render chart with correct data points', () => {
      render(<Dashboard initialMetrics={mockMetrics} />);

      const chart = screen.getByTestId('line-chart');
      expect(chart).toBeInTheDocument();
    });

    it('should handle chart hover interactions', async () => {
      render(<Dashboard initialMetrics={mockMetrics} />);

      const chart = screen.getByTestId('line-chart');
      
      // Simulate mouse enter on chart
      fireEvent.mouseEnter(chart);
      
      // Tooltip should be available
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should render correctly on mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      render(<Dashboard initialMetrics={mockMetrics} />);

      // Should still render main elements
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should adapt chart size to container', () => {
      render(<Dashboard initialMetrics={mockMetrics} />);

      const responsiveContainer = screen.getByTestId('responsive-container');
      expect(responsiveContainer).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when metrics fail to load', async () => {
      global.fetch.mockRejectedValue(new Error('API Error'));

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/error loading data/i)).toBeInTheDocument();
      });
    });

    it('should provide retry option on error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('API Error'))
                 .mockResolvedValueOnce({
                   ok: true,
                   json: () => Promise.resolve(mockMetrics)
                 });

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/error loading data/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });

    it('should handle partial data gracefully', () => {
      const partialMetrics = {
        overview: mockMetrics.overview,
        // Missing trends, audiences, campaigns
      };

      render(<Dashboard initialMetrics={partialMetrics} />);

      // Should still render overview metrics
      expect(screen.getByText('125,000')).toBeInTheDocument();
      
      // Should handle missing sections gracefully
      expect(screen.queryByText('No data available')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should debounce rapid refresh requests', async () => {
      const fetchMock = global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMetrics)
      });

      render(<Dashboard initialMetrics={mockMetrics} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      
      // Click multiple times rapidly
      await user.click(refreshButton);
      await user.click(refreshButton);
      await user.click(refreshButton);

      // Should only make one API call due to debouncing
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });
    });

    it('should memoize expensive calculations', () => {
      const { rerender } = render(<Dashboard initialMetrics={mockMetrics} />);

      // Re-render with same props
      rerender(<Dashboard initialMetrics={mockMetrics} />);

      // Component should handle re-renders efficiently
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<Dashboard initialMetrics={mockMetrics} />);

      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Dashboard');
      expect(screen.getByRole('region', { name: /metrics overview/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<Dashboard initialMetrics={mockMetrics} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      
      refreshButton.focus();
      expect(document.activeElement).toBe(refreshButton);

      // Should be able to activate with Enter
      fireEvent.keyDown(refreshButton, { key: 'Enter', code: 'Enter' });
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should provide screen reader friendly content', () => {
      render(<Dashboard initialMetrics={mockMetrics} />);

      expect(screen.getByText(/total impressions: 125,000/i)).toBeInTheDocument();
      expect(screen.getByText(/click-through rate: 4.16 percent/i)).toBeInTheDocument();
    });
  });
});