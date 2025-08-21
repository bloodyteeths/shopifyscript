import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import Audiences from '../../components/Audiences';

const mockAudiences = [
  {
    id: 'aud_1',
    name: 'Tech Enthusiasts',
    description: 'Users interested in technology and gadgets',
    size: 45000,
    status: 'active',
    criteria: {
      demographics: {
        age: ['25-34', '35-44'],
        gender: 'all'
      },
      interests: ['technology', 'gadgets', 'software'],
      behaviors: ['frequent_online_purchaser']
    },
    performance: {
      impressions: 78000,
      clicks: 3200,
      conversions: 285,
      ctr: 4.1,
      conversionRate: 8.9,
      cpc: 0.65,
      cpa: 7.31
    },
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-20T14:45:00Z'
  },
  {
    id: 'aud_2',
    name: 'E-commerce Shoppers',
    description: 'Active online shoppers with high purchase intent',
    size: 32000,
    status: 'active',
    criteria: {
      demographics: {
        age: ['25-34', '35-44', '45-54'],
        gender: 'all'
      },
      interests: ['shopping', 'fashion', 'home-decor'],
      behaviors: ['recent_purchaser', 'cart_abandoner']
    },
    performance: {
      impressions: 47000,
      clicks: 2000,
      conversions: 200,
      ctr: 4.26,
      conversionRate: 10.0,
      cpc: 0.58,
      cpa: 5.80
    },
    createdAt: '2024-01-10T09:15:00Z',
    updatedAt: '2024-01-22T11:20:00Z'
  },
  {
    id: 'aud_3',
    name: 'Inactive Audience',
    description: 'Paused audience for testing',
    size: 15000,
    status: 'paused',
    criteria: {
      demographics: {
        age: ['18-24'],
        gender: 'female'
      },
      interests: ['beauty', 'wellness'],
      behaviors: ['social_media_active']
    },
    performance: {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      ctr: 0,
      conversionRate: 0,
      cpc: 0,
      cpa: 0
    },
    createdAt: '2024-01-05T16:45:00Z',
    updatedAt: '2024-01-18T13:30:00Z'
  }
];

describe('Audiences Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    global.fetch.mockClear();
    global.mockNavigate.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render audiences list', () => {
      render(<Audiences initialAudiences={mockAudiences} />);

      expect(screen.getByText('Audiences')).toBeInTheDocument();
      expect(screen.getByText('Tech Enthusiasts')).toBeInTheDocument();
      expect(screen.getByText('E-commerce Shoppers')).toBeInTheDocument();
      expect(screen.getByText('Inactive Audience')).toBeInTheDocument();
    });

    it('should display audience status badges', () => {
      render(<Audiences initialAudiences={mockAudiences} />);

      expect(screen.getAllByText('Active')).toHaveLength(2);
      expect(screen.getByText('Paused')).toBeInTheDocument();
    });

    it('should show audience sizes', () => {
      render(<Audiences initialAudiences={mockAudiences} />);

      expect(screen.getByText('45,000')).toBeInTheDocument();
      expect(screen.getByText('32,000')).toBeInTheDocument();
      expect(screen.getByText('15,000')).toBeInTheDocument();
    });

    it('should render loading state when no initial data', () => {
      render(<Audiences />);

      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    it('should render empty state when no audiences', () => {
      render(<Audiences initialAudiences={[]} />);

      expect(screen.getByText(/no audiences found/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create audience/i })).toBeInTheDocument();
    });
  });

  describe('Audience Actions', () => {
    it('should navigate to audience detail when clicked', async () => {
      render(<Audiences initialAudiences={mockAudiences} />);

      const audienceRow = screen.getByText('Tech Enthusiasts');
      await user.click(audienceRow);

      expect(global.mockNavigate).toHaveBeenCalledWith('/app/audiences/aud_1');
    });

    it('should open edit modal when edit button clicked', async () => {
      render(<Audiences initialAudiences={mockAudiences} />);

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      expect(screen.getByText('Edit Audience')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Tech Enthusiasts')).toBeInTheDocument();
    });

    it('should open create modal when create button clicked', async () => {
      render(<Audiences initialAudiences={mockAudiences} />);

      const createButton = screen.getByRole('button', { name: /create audience/i });
      await user.click(createButton);

      expect(screen.getByText('Create New Audience')).toBeInTheDocument();
      expect(screen.getByLabelText(/audience name/i)).toBeInTheDocument();
    });

    it('should handle audience deletion', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      render(<Audiences initialAudiences={mockAudiences} />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
      await user.click(confirmButton);

      expect(global.fetch).toHaveBeenCalledWith('/api/audiences/aud_1', {
        method: 'DELETE'
      });
    });

    it('should toggle audience status', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      render(<Audiences initialAudiences={mockAudiences} />);

      const pauseButtons = screen.getAllByRole('button', { name: /pause/i });
      await user.click(pauseButtons[0]);

      expect(global.fetch).toHaveBeenCalledWith('/api/audiences/aud_1/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' })
      });
    });
  });

  describe('Audience Creation', () => {
    it('should create new audience with valid data', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'aud_new',
          name: 'New Audience',
          success: true
        })
      });

      render(<Audiences initialAudiences={mockAudiences} />);

      // Open create modal
      const createButton = screen.getByRole('button', { name: /create audience/i });
      await user.click(createButton);

      // Fill form
      await user.type(screen.getByLabelText(/audience name/i), 'New Test Audience');
      await user.type(screen.getByLabelText(/description/i), 'Test description');

      // Select age groups
      const ageSelect = screen.getByLabelText(/age groups/i);
      await user.selectOptions(ageSelect, ['25-34', '35-44']);

      // Select interests
      const interestsInput = screen.getByLabelText(/interests/i);
      await user.type(interestsInput, 'technology,gaming');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      expect(global.fetch).toHaveBeenCalledWith('/api/audiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Test Audience',
          description: 'Test description',
          criteria: {
            demographics: {
              age: ['25-34', '35-44'],
              gender: 'all'
            },
            interests: ['technology', 'gaming'],
            behaviors: []
          }
        })
      });
    });

    it('should validate required fields', async () => {
      render(<Audiences initialAudiences={mockAudiences} />);

      // Open create modal
      const createButton = screen.getByRole('button', { name: /create audience/i });
      await user.click(createButton);

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      expect(screen.getByText(/audience name is required/i)).toBeInTheDocument();
    });

    it('should handle creation errors', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      render(<Audiences initialAudiences={mockAudiences} />);

      // Open create modal and fill form
      const createButton = screen.getByRole('button', { name: /create audience/i });
      await user.click(createButton);

      await user.type(screen.getByLabelText(/audience name/i), 'Test Audience');
      
      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/error creating audience/i)).toBeInTheDocument();
      });
    });
  });

  describe('Audience Editing', () => {
    it('should update audience with modified data', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      render(<Audiences initialAudiences={mockAudiences} />);

      // Open edit modal
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      // Modify name
      const nameInput = screen.getByDisplayValue('Tech Enthusiasts');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Tech Enthusiasts');

      // Submit changes
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(global.fetch).toHaveBeenCalledWith('/api/audiences/aud_1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Tech Enthusiasts',
          description: 'Users interested in technology and gadgets',
          criteria: mockAudiences[0].criteria
        })
      });
    });

    it('should cancel editing without saving changes', async () => {
      render(<Audiences initialAudiences={mockAudiences} />);

      // Open edit modal
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      // Modify name
      const nameInput = screen.getByDisplayValue('Tech Enthusiasts');
      await user.clear(nameInput);
      await user.type(nameInput, 'Modified Name');

      // Cancel without saving
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Modal should close without API call
      expect(screen.queryByText('Edit Audience')).not.toBeInTheDocument();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Performance Metrics Display', () => {
    it('should show performance metrics for each audience', () => {
      render(<Audiences initialAudiences={mockAudiences} />);

      // Check CTR values
      expect(screen.getByText('4.1%')).toBeInTheDocument();
      expect(screen.getByText('4.26%')).toBeInTheDocument();

      // Check conversion rates
      expect(screen.getByText('8.9%')).toBeInTheDocument();
      expect(screen.getByText('10.0%')).toBeInTheDocument();
    });

    it('should handle zero performance metrics gracefully', () => {
      render(<Audiences initialAudiences={mockAudiences} />);

      // Inactive audience should show 0% metrics
      const inactiveRow = screen.getByText('Inactive Audience').closest('tr');
      expect(inactiveRow).toHaveTextContent('0%');
      expect(inactiveRow).toHaveTextContent('$0.00');
    });

    it('should sort audiences by performance metrics', async () => {
      render(<Audiences initialAudiences={mockAudiences} />);

      // Click CTR column header to sort
      const ctrHeader = screen.getByText('CTR');
      await user.click(ctrHeader);

      // Should sort by CTR descending
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('E-commerce Shoppers'); // Higher CTR first
      expect(rows[2]).toHaveTextContent('Tech Enthusiasts');
    });
  });

  describe('Filtering and Search', () => {
    it('should filter audiences by status', async () => {
      render(<Audiences initialAudiences={mockAudiences} />);

      const statusFilter = screen.getByLabelText(/filter by status/i);
      await user.selectOptions(statusFilter, 'active');

      expect(screen.getByText('Tech Enthusiasts')).toBeInTheDocument();
      expect(screen.getByText('E-commerce Shoppers')).toBeInTheDocument();
      expect(screen.queryByText('Inactive Audience')).not.toBeInTheDocument();
    });

    it('should search audiences by name', async () => {
      render(<Audiences initialAudiences={mockAudiences} />);

      const searchInput = screen.getByPlaceholderText(/search audiences/i);
      await user.type(searchInput, 'tech');

      expect(screen.getByText('Tech Enthusiasts')).toBeInTheDocument();
      expect(screen.queryByText('E-commerce Shoppers')).not.toBeInTheDocument();
      expect(screen.queryByText('Inactive Audience')).not.toBeInTheDocument();
    });

    it('should clear search when input is empty', async () => {
      render(<Audiences initialAudiences={mockAudiences} />);

      const searchInput = screen.getByPlaceholderText(/search audiences/i);
      await user.type(searchInput, 'tech');
      await user.clear(searchInput);

      // All audiences should be visible again
      expect(screen.getByText('Tech Enthusiasts')).toBeInTheDocument();
      expect(screen.getByText('E-commerce Shoppers')).toBeInTheDocument();
      expect(screen.getByText('Inactive Audience')).toBeInTheDocument();
    });
  });

  describe('Bulk Operations', () => {
    it('should select multiple audiences for bulk actions', async () => {
      render(<Audiences initialAudiences={mockAudiences} />);

      // Select checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Tech Enthusiasts
      await user.click(checkboxes[1]); // E-commerce Shoppers

      expect(screen.getByText('2 selected')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /bulk actions/i })).toBeInTheDocument();
    });

    it('should perform bulk status update', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      render(<Audiences initialAudiences={mockAudiences} />);

      // Select audiences
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);

      // Open bulk actions menu
      const bulkActionsButton = screen.getByRole('button', { name: /bulk actions/i });
      await user.click(bulkActionsButton);

      // Select pause action
      const pauseAction = screen.getByRole('menuitem', { name: /pause selected/i });
      await user.click(pauseAction);

      expect(global.fetch).toHaveBeenCalledWith('/api/audiences/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audienceIds: ['aud_1', 'aud_2'],
          status: 'paused'
        })
      });
    });

    it('should select all audiences with master checkbox', async () => {
      render(<Audiences initialAudiences={mockAudiences} />);

      const masterCheckbox = screen.getByRole('checkbox', { name: /select all/i });
      await user.click(masterCheckbox);

      expect(screen.getByText('3 selected')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      global.fetch.mockRejectedValue(new Error('API Error'));

      render(<Audiences />);

      await waitFor(() => {
        expect(screen.getByText(/error loading audiences/i)).toBeInTheDocument();
      });
    });

    it('should show retry option on error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('API Error'))
                 .mockResolvedValueOnce({
                   ok: true,
                   json: () => Promise.resolve(mockAudiences)
                 });

      render(<Audiences />);

      await waitFor(() => {
        expect(screen.getByText(/error loading audiences/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Tech Enthusiasts')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<Audiences initialAudiences={mockAudiences} />);

      expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Audiences list');
      expect(screen.getByRole('searchbox')).toHaveAttribute('aria-label', 'Search audiences');
    });

    it('should support keyboard navigation', async () => {
      render(<Audiences initialAudiences={mockAudiences} />);

      const firstRow = screen.getByText('Tech Enthusiasts').closest('tr');
      firstRow.focus();
      
      fireEvent.keyDown(firstRow, { key: 'Enter', code: 'Enter' });
      expect(global.mockNavigate).toHaveBeenCalledWith('/app/audiences/aud_1');
    });

    it('should announce status changes to screen readers', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      render(<Audiences initialAudiences={mockAudiences} />);

      const pauseButton = screen.getAllByRole('button', { name: /pause/i })[0];
      await user.click(pauseButton);

      await waitFor(() => {
        expect(screen.getByText(/audience status updated/i)).toBeInTheDocument();
      });
    });
  });
});