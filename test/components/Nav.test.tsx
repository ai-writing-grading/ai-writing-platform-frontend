import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Nav } from '../../src/components/Nav';
import * as api from '../../src/lib/api';

const mockNavigate = jest.fn();

jest.mock('@/lib/api', () => ({
  getToken: jest.fn(),
  getUserRole: jest.fn(),
  apiFetch: jest.fn(),
  clearToken: jest.fn(),
}));

jest.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, style }: any) => (
    <a href={to} style={style}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
  useRouterState: jest.fn(),
}));

describe('Nav.tsx Real Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    (api.getToken as jest.Mock).mockReturnValue(null);
    (api.getUserRole as jest.Mock).mockReturnValue(null);
    (api.apiFetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
  });

  describe('Unauthenticated state', () => {
    it('renders platform title and Sign In link when not logged in', () => {
      render(<Nav />);

      expect(screen.getByText('AI Writing Platform')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Sign In/i })).toHaveAttribute(
        'href',
        '/login'
      );
    });

    it('does not render user or admin navigation links when not logged in', () => {
      render(<Nav />);

      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Editor')).not.toBeInTheDocument();
      expect(screen.queryByText('Dashboard (Admin)')).not.toBeInTheDocument();
      expect(screen.queryByText('HITL Review')).not.toBeInTheDocument();
      expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    });

    it('does not fetch billing status when not logged in', () => {
      render(<Nav />);
      expect(api.apiFetch).not.toHaveBeenCalledWith('/api/v1/billing/status');
    });
  });

  describe('Authenticated user state', () => {
    beforeEach(() => {
      (api.getToken as jest.Mock).mockReturnValue('valid-token');
      (api.getUserRole as jest.Mock).mockReturnValue('user');
      (api.apiFetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });
    });

    it('renders regular user navigation links', () => {
      render(<Nav />);

      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
        'href',
        '/dashboard'
      );
      expect(screen.getByRole('link', { name: 'Editor' })).toHaveAttribute(
        'href',
        '/editor'
      );
      expect(screen.getByRole('link', { name: 'Upload' })).toHaveAttribute(
        'href',
        '/upload'
      );
      expect(screen.getByRole('link', { name: 'Batch' })).toHaveAttribute(
        'href',
        '/batch'
      );
      expect(screen.getByRole('link', { name: 'Learn' })).toHaveAttribute(
        'href',
        '/learn'
      );
      expect(screen.getByRole('link', { name: 'Preferences' })).toHaveAttribute(
        'href',
        '/preferences'
      );
      expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute(
        'href',
        '/subscription'
      );
    });

    it('renders Logout button instead of Sign In', () => {
      render(<Nav />);

      expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
      expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
    });

    it('fetches billing status on mount and displays plan label', async () => {
      (api.apiFetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plan: 'premium' }),
      });

      render(<Nav />);

      await waitFor(() => {
        expect(api.apiFetch).toHaveBeenCalledWith('/api/v1/billing/status');
        expect(screen.getByText('Plan (Premium)')).toBeInTheDocument();
      });
    });

    it('displays Plan when billing status returns null plan', async () => {
      (api.apiFetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plan: null }),
      });

      render(<Nav />);

      await waitFor(() => {
        expect(screen.getByText('Plan (Free)')).toBeInTheDocument();
      });
    });

    it('keeps Plan label when billing API response is not ok', async () => {
      (api.apiFetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      render(<Nav />);

      await waitFor(() => {
        expect(api.apiFetch).toHaveBeenCalledWith('/api/v1/billing/status');
      });

      expect(screen.getByText('Plan')).toBeInTheDocument();
    });

    it('handles billing fetch error gracefully', async () => {
      (api.apiFetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<Nav />);

      await waitFor(() => {
        expect(api.apiFetch).toHaveBeenCalledWith('/api/v1/billing/status');
      });

      expect(screen.getByText('Plan')).toBeInTheDocument();
    });

    it('does not render admin links for regular users', () => {
      render(<Nav />);

      expect(screen.queryByText('Dashboard (Admin)')).not.toBeInTheDocument();
      expect(screen.queryByText('HITL Review')).not.toBeInTheDocument();
    });
  });

  describe('Admin user state', () => {
    beforeEach(() => {
      (api.getToken as jest.Mock).mockReturnValue('admin-token');
      (api.getUserRole as jest.Mock).mockReturnValue('admin');
    });

    it('renders admin-specific navigation links', () => {
      render(<Nav />);

      expect(screen.getByRole('link', { name: /Dashboard \(Admin\)/i })).toHaveAttribute(
        'href',
        '/admin'
      );
      expect(screen.getByRole('link', { name: /HITL Review/i })).toHaveAttribute(
        'href',
        '/admin/review'
      );
    });

    it('does not render regular user links for admin', () => {
      render(<Nav />);

      expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
      expect(screen.queryByText('Editor')).not.toBeInTheDocument();
      expect(screen.queryByText('Plan')).not.toBeInTheDocument();
    });

    it('does not fetch billing status for admin users', () => {
      render(<Nav />);
      expect(api.apiFetch).not.toHaveBeenCalledWith('/api/v1/billing/status');
    });

    it('renders Logout button for admin', () => {
      render(<Nav />);
      expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
    });
  });

  describe('Logout functionality', () => {
    beforeEach(() => {
      (api.getToken as jest.Mock).mockReturnValue('token');
      (api.getUserRole as jest.Mock).mockReturnValue('user');
      (api.apiFetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });
    });

    it('clears token, removes user_role, and navigates to login on logout', () => {
      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');

      render(<Nav />);

      fireEvent.click(screen.getByRole('button', { name: /Logout/i }));

      expect(api.clearToken).toHaveBeenCalledTimes(1);
      expect(removeItemSpy).toHaveBeenCalledWith('user_role');
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' });

      removeItemSpy.mockRestore();
    });
  });

  describe('Quota banner functionality', () => {
    beforeEach(() => {
      (api.getToken as jest.Mock).mockReturnValue('token');
      (api.getUserRole as jest.Mock).mockReturnValue('user');
      (api.apiFetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });
    });

    it('does not show quota banner initially', () => {
      render(<Nav />);
      expect(screen.queryByText(/Daily limit reached/i)).not.toBeInTheDocument();
    });

    it('shows quota banner when api:quota-exceeded event is dispatched', async () => {
      let quotaHandler: EventListener | undefined;

      const addEventListenerSpy = jest
        .spyOn(window, 'addEventListener')
        .mockImplementation((type: string, listener: EventListenerOrEventListenerObject) => {
          if (type === 'api:quota-exceeded') {
            quotaHandler = listener as EventListener;
          }
        });

      render(<Nav />);

      await waitFor(() => {
        expect(quotaHandler).toBeDefined();
      });

      act(() => {
        quotaHandler?.(new Event('api:quota-exceeded'));
      });

      expect(
        await screen.findByRole('button', { name: /Dismiss/i })
      ).toBeInTheDocument();

      expect(
        screen.getByRole('link', { name: /upgrade your plan/i })
      ).toHaveAttribute('href', '/subscription');

      addEventListenerSpy.mockRestore();
    });

    it('allows dismissing quota banner', async () => {
      let quotaHandler: EventListener | undefined;

      const addEventListenerSpy = jest
        .spyOn(window, 'addEventListener')
        .mockImplementation((type: string, listener: EventListenerOrEventListenerObject) => {
          if (type === 'api:quota-exceeded') {
            quotaHandler = listener as EventListener;
          }
        });

      render(<Nav />);

      await waitFor(() => {
        expect(quotaHandler).toBeDefined();
      });

      act(() => {
        quotaHandler?.(new Event('api:quota-exceeded'));
      });

      const dismissBtn = await screen.findByRole('button', { name: /Dismiss/i });
      fireEvent.click(dismissBtn);

      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: /Dismiss/i })
        ).not.toBeInTheDocument();
      });

      addEventListenerSpy.mockRestore();
    });

    it('does not show quota banner for admin users', () => {
      (api.getUserRole as jest.Mock).mockReturnValue('admin');

      render(<Nav />);

      window.dispatchEvent(new CustomEvent('api:quota-exceeded'));

      expect(screen.queryByText(/Daily limit reached/i)).not.toBeInTheDocument();
    });

    it('cleans up event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = render(<Nav />);
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'api:quota-exceeded',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Styling and UI', () => {
    beforeEach(() => {
      (api.getToken as jest.Mock).mockReturnValue('token');
      (api.getUserRole as jest.Mock).mockReturnValue('user');
      (api.apiFetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });
    });

    it('renders nav element', () => {
      const { container } = render(<Nav />);
      expect(container.querySelector('nav')).toBeInTheDocument();
    });

    it('logout button hover handlers do not crash', () => {
      render(<Nav />);

      const logoutBtn = screen.getByRole('button', { name: /Logout/i });

      fireEvent.mouseOver(logoutBtn);
      fireEvent.mouseOut(logoutBtn);

      expect(logoutBtn).toBeInTheDocument();
    });
  });
});