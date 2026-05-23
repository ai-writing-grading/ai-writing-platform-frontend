import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Nav } from '@/components/Nav';
import * as api from '@/lib/api';

jest.mock('@/lib/api');
jest.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, style }: any) => (
    <a href={to} style={style}>
      {children}
    </a>
  ),
  useNavigate: () => jest.fn(),
  useRouterState: () => jest.fn(() => ({ location: { pathname: '/' } })),
}));

describe('Nav.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (api.getToken as jest.Mock).mockReturnValue(null);
    (api.getUserRole as jest.Mock).mockReturnValue(null);
    (api.apiFetch as jest.Mock).mockClear();
    (api.clearToken as jest.Mock).mockClear();
  });

  describe('Unauthenticated state', () => {
    it('renders Sign In link when not logged in', () => {
      (api.getToken as jest.Mock).mockReturnValue(null);
      render(<Nav />);
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('does not render user navigation links when not logged in', () => {
      (api.getToken as jest.Mock).mockReturnValue(null);
      render(<Nav />);
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Editor')).not.toBeInTheDocument();
      expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    });

    it('renders platform title', () => {
      render(<Nav />);
      expect(screen.getByText('AI Writing Platform')).toBeInTheDocument();
    });
  });

  describe('Authenticated user state', () => {
    beforeEach(() => {
      (api.getToken as jest.Mock).mockReturnValue('valid-token');
      (api.getUserRole as jest.Mock).mockReturnValue('user');
    });

    it('renders all user navigation links', () => {
      render(<Nav />);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Editor')).toBeInTheDocument();
      expect(screen.getByText('Upload')).toBeInTheDocument();
      expect(screen.getByText('Batch')).toBeInTheDocument();
      expect(screen.getByText('Learn')).toBeInTheDocument();
      expect(screen.getByText('Preferences')).toBeInTheDocument();
    });

    it('renders Logout button instead of Sign In', () => {
      render(<Nav />);
      expect(screen.getByText('Logout')).toBeInTheDocument();
      expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
    });

    it('renders subscription link with plan label', () => {
      (api.apiFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ plan: 'premium' }),
      });

      render(<Nav />);

      waitFor(() => {
        expect(screen.getByText('Plan (Premium)')).toBeInTheDocument();
      });
    });

    it('handles billing status fetch error gracefully', () => {
      (api.apiFetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<Nav />);

      waitFor(() => {
        expect(screen.getByText('Plan')).toBeInTheDocument();
      });
    });

    it('does not render admin links for regular users', () => {
      (api.getUserRole as jest.Mock).mockReturnValue('user');
      render(<Nav />);
      expect(screen.queryByText('Dashboard (Admin)')).not.toBeInTheDocument();
      expect(screen.queryByText('HITL Review')).not.toBeInTheDocument();
    });

    it('calls apiFetch for billing status on mount', async () => {
      (api.apiFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ plan: 'free' }),
      });

      render(<Nav />);

      await waitFor(() => {
        expect(api.apiFetch).toHaveBeenCalledWith('/api/v1/billing/status');
      });
    });

    it('handles billing status with null plan', async () => {
      (api.apiFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ plan: null }),
      });

      render(<Nav />);

      await waitFor(() => {
        expect(screen.getByText('Plan')).toBeInTheDocument();
      });
    });

    it('handles non-ok response from billing API', async () => {
      (api.apiFetch as jest.Mock).mockResolvedValue({ ok: false });

      render(<Nav />);

      await waitFor(() => {
        expect(screen.getByText('Plan')).toBeInTheDocument();
      });
    });
  });

  describe('Admin user state', () => {
    beforeEach(() => {
      (api.getToken as jest.Mock).mockReturnValue('admin-token');
      (api.getUserRole as jest.Mock).mockReturnValue('admin');
    });

    it('renders admin-specific navigation links', () => {
      render(<Nav />);
      expect(screen.getByText('Dashboard (Admin)')).toBeInTheDocument();
      expect(screen.getByText('HITL Review')).toBeInTheDocument();
    });

    it('does not render regular user links for admin', () => {
      render(<Nav />);
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Editor')).not.toBeInTheDocument();
    });

    it('does not fetch billing status for admin users', () => {
      (api.apiFetch as jest.Mock).mockClear();
      render(<Nav />);
      expect(api.apiFetch).not.toHaveBeenCalledWith('/api/v1/billing/status');
    });

    it('renders Logout button for admin', () => {
      render(<Nav />);
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
  });

  describe('Logout functionality', () => {
    beforeEach(() => {
      (api.getToken as jest.Mock).mockReturnValue('token');
      (api.getUserRole as jest.Mock).mockReturnValue('user');
    });

    it('clears token on logout', () => {
      render(<Nav />);
      const logoutBtn = screen.getByText('Logout');
      fireEvent.click(logoutBtn);
      expect(api.clearToken).toHaveBeenCalled();
    });

    it('removes user_role from localStorage on logout', () => {
      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');
      render(<Nav />);
      const logoutBtn = screen.getByText('Logout');
      fireEvent.click(logoutBtn);
      expect(removeItemSpy).toHaveBeenCalledWith('user_role');
      removeItemSpy.mockRestore();
    });
  });

  describe('Quota banner functionality', () => {
    beforeEach(() => {
      (api.getToken as jest.Mock).mockReturnValue('token');
      (api.getUserRole as jest.Mock).mockReturnValue('user');
    });

    it('does not show quota banner initially', () => {
      render(<Nav />);
      expect(
        screen.queryByText(/Daily limit reached/)
      ).not.toBeInTheDocument();
    });

    it('shows quota banner when api:quota-exceeded event is dispatched', () => {
      render(<Nav />);

      const event = new CustomEvent('api:quota-exceeded');
      window.dispatchEvent(event);

      waitFor(() => {
        expect(screen.getByText(/Daily limit reached/)).toBeInTheDocument();
      });
    });

    it('does not show quota banner for admin users', () => {
      (api.getUserRole as jest.Mock).mockReturnValue('admin');
      render(<Nav />);

      const event = new CustomEvent('api:quota-exceeded');
      window.dispatchEvent(event);

      expect(
        screen.queryByText(/Daily limit reached/)
      ).not.toBeInTheDocument();
    });

    it('allows dismissing quota banner', () => {
      render(<Nav />);

      const event = new CustomEvent('api:quota-exceeded');
      window.dispatchEvent(event);

      waitFor(() => {
        const dismissBtn = screen.getByLabelText('Dismiss');
        fireEvent.click(dismissBtn);
        expect(
          screen.queryByText(/Daily limit reached/)
        ).not.toBeInTheDocument();
      });
    });

    it('cleans up event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(
        window,
        'removeEventListener'
      );
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
    });

    it('renders navigation with correct structure', () => {
      const { container } = render(<Nav />);
      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });

    it('navigation links have correct href attributes', () => {
      render(<Nav />);
      expect(screen.getByText('Dashboard').closest('a')?.getAttribute('href')).toBe('/dashboard');
      expect(screen.getByText('Editor').closest('a')?.getAttribute('href')).toBe('/editor');
    });
  });
});
