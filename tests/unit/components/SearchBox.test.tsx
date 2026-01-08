import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBox } from '@/components/SearchBox';

// Mock fetch globally
global.fetch = vi.fn();

describe('SearchBox Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render search input and button', () => {
      render(<SearchBox />);

      expect(screen.getByLabelText(/search by city, state, or zip code/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'search' })).toBeInTheDocument();
    });

    it('should have accessible form elements', () => {
      render(<SearchBox />);

      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-autocomplete', 'list');
      expect(input).toHaveAttribute('aria-controls', 'search-results-list');
    });
  });

  describe('User Input', () => {
    it('should update query state on input change', async () => {
      const user = userEvent.setup();
      render(<SearchBox />);

      const input = screen.getByRole('combobox');
      await user.type(input, 'Portland');

      expect(input).toHaveValue('Portland');
    });

    it('should trigger search on button click', async () => {
      const user = userEvent.setup();
      render(<SearchBox />);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: 'Portland',
          results: [],
          count: 0,
        }),
      });

      const input = screen.getByRole('combobox');
      const searchButton = screen.getByRole('button', { name: 'search' });

      await user.type(input, 'Portland');
      await user.click(searchButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/search?q=Portland');
      });
    });

    it('should trigger search on Enter key', async () => {
      const user = userEvent.setup();
      render(<SearchBox />);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: 'Portland',
          results: [],
          count: 0,
        }),
      });

      const input = screen.getByRole('combobox');

      await user.type(input, 'Portland{Enter}');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/search?q=Portland');
      });
    });
  });

  describe('Autocomplete Behavior', () => {
    it('should show results after typing 2+ characters', async () => {
      const user = userEvent.setup();
      render(<SearchBox />);

      const mockResults = [
        {
          geoType: 'CITY',
          geoId: '12345',
          label: 'Portland, ME',
          state: 'ME',
          canonicalUrl: '/maine/portland/',
          ratio: 4.5,
          homeValue: 350000,
          income: 78000,
          asOfDate: '2024-01-01',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: 'Po',
          results: mockResults,
          count: 1,
        }),
      });

      const input = screen.getByRole('combobox');
      await user.type(input, 'Po');

      await waitFor(() => {
        expect(screen.getByText('Portland, ME')).toBeInTheDocument();
      });
    });

    it('should not search for queries < 2 characters', async () => {
      const user = userEvent.setup();
      render(<SearchBox />);

      const input = screen.getByRole('combobox');
      await user.type(input, 'P');

      await waitFor(() => {
        expect(global.fetch).not.toHaveBeenCalled();
      });
    });

    it('should debounce search requests', async () => {
      const user = userEvent.setup();
      render(<SearchBox />);

      const input = screen.getByRole('combobox');

      // Type multiple characters quickly
      await user.type(input, 'Portland');

      // Should only call fetch once due to debounce
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      }, { timeout: 500 });
    });
  });

  describe('ZIP Code Direct Navigation', () => {
    it('should navigate directly to ZIP page for 5-digit ZIP', async () => {
      const mockPush = vi.fn();
      vi.mocked(require('next/navigation').useRouter).mockReturnValue({
        push: mockPush,
        replace: vi.fn(),
        prefetch: vi.fn(),
        back: vi.fn(),
        pathname: '/',
        query: {},
        asPath: '/',
      });

      const user = userEvent.setup();
      render(<SearchBox />);

      const input = screen.getByRole('combobox');
      await user.type(input, '04161{Enter}');

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/zip/04161/');
      });
    });

    it('should not search API for 5-digit ZIP', async () => {
      const user = userEvent.setup();
      render(<SearchBox />);

      const input = screen.getByRole('combobox');
      await user.type(input, '04161{Enter}');

      await waitFor(() => {
        expect(global.fetch).not.toHaveBeenCalled();
      });
    });
  });

  describe('Results Display', () => {
    it('should display search results', async () => {
      const user = userEvent.setup();
      render(<SearchBox />);

      const mockResults = [
        {
          geoType: 'CITY',
          geoId: '12345',
          label: 'Portland, ME',
          state: 'ME',
          canonicalUrl: '/maine/portland/',
          ratio: 4.5,
          homeValue: 350000,
          income: 78000,
          asOfDate: '2024-01-01',
        },
        {
          geoType: 'CITY',
          geoId: '67890',
          label: 'Portland, OR',
          state: 'OR',
          canonicalUrl: '/oregon/portland/',
          ratio: 6.2,
          homeValue: 520000,
          income: 85000,
          asOfDate: '2024-01-01',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: 'Portland',
          results: mockResults,
          count: 2,
        }),
      });

      const input = screen.getByRole('combobox');
      await user.type(input, 'Portland');

      await waitFor(() => {
        expect(screen.getByText('Portland, ME')).toBeInTheDocument();
        expect(screen.getByText('Portland, OR')).toBeInTheDocument();
      });
    });

    it('should show no results message when empty', async () => {
      const user = userEvent.setup();
      render(<SearchBox />);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: 'Nonexistent',
          results: [],
          count: 0,
        }),
      });

      const input = screen.getByRole('combobox');
      await user.type(input, 'Nonexistent');

      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate results with arrow keys', async () => {
      const user = userEvent.setup();
      render(<SearchBox />);

      const mockResults = [
        {
          geoType: 'CITY',
          geoId: '12345',
          label: 'Portland, ME',
          state: 'ME',
          canonicalUrl: '/maine/portland/',
          ratio: 4.5,
          homeValue: 350000,
          income: 78000,
          asOfDate: '2024-01-01',
        },
        {
          geoType: 'CITY',
          geoId: '67890',
          label: 'Portland, OR',
          state: 'OR',
          canonicalUrl: '/oregon/portland/',
          ratio: 6.2,
          homeValue: 520000,
          income: 85000,
          asOfDate: '2024-01-01',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: 'Portland',
          results: mockResults,
          count: 2,
        }),
      });

      const input = screen.getByRole('combobox');
      await user.type(input, 'Portland');

      await waitFor(() => {
        expect(screen.getByText('Portland, ME')).toBeInTheDocument();
      });

      // Arrow down to select first result
      await user.keyboard('{ArrowDown}');

      const firstResult = screen.getByText('Portland, ME').closest('button');
      expect(firstResult).toHaveClass('bg-blue-50');
    });

    it('should close dropdown on Escape', async () => {
      const user = userEvent.setup();
      render(<SearchBox />);

      const mockResults = [
        {
          geoType: 'CITY',
          geoId: '12345',
          label: 'Portland, ME',
          state: 'ME',
          canonicalUrl: '/maine/portland/',
          ratio: 4.5,
          homeValue: 350000,
          income: 78000,
          asOfDate: '2024-01-01',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: 'Portland',
          results: mockResults,
          count: 1,
        }),
      });

      const input = screen.getByRole('combobox');
      await user.type(input, 'Portland');

      await waitFor(() => {
        expect(screen.getByText('Portland, ME')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByText('Portland, ME')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      render(<SearchBox />);

      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const input = screen.getByRole('combobox');
      await user.type(input, 'Portland');

      await waitFor(() => {
        expect(screen.queryByText('Portland, ME')).not.toBeInTheDocument();
      });
    });
  });

  describe('Click Outside', () => {
    it('should close dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      render(<SearchBox />);

      const mockResults = [
        {
          geoType: 'CITY',
          geoId: '12345',
          label: 'Portland, ME',
          state: 'ME',
          canonicalUrl: '/maine/portland/',
          ratio: 4.5,
          homeValue: 350000,
          income: 78000,
          asOfDate: '2024-01-01',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: 'Portland',
          results: mockResults,
          count: 1,
        }),
      });

      const input = screen.getByRole('combobox');
      await user.type(input, 'Portland');

      await waitFor(() => {
        expect(screen.getByText('Portland, ME')).toBeInTheDocument();
      });

      // Click outside
      await user.click(document.body);

      await waitFor(() => {
        expect(screen.queryByText('Portland, ME')).not.toBeInTheDocument();
      });
    });
  });
});
