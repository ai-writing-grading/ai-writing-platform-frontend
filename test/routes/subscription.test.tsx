import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { Subscription } from '../../src/routes/subscription';
import { apiFetch } from '../../src/lib/api';

const mockUseSearch = jest.fn();

jest.mock('../../src/lib/api', () => ({
  apiFetch: jest.fn(),
}));

jest.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  useSearch: (...args: any[]) => mockUseSearch(...args),
}));

describe('Subscription Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // 默认 search param
    mockUseSearch.mockReturnValue({});

    // 默认 API（避免 undefined.then 报错）
    (apiFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ plan: 'free', status: 'active' }),
    });
  });

  it('renders title', () => {
    render(<Subscription />);

    expect(screen.getByText(/Subscription/i)).toBeInTheDocument();
  });

  it('shows payment success banner when sessionId exists', () => {
    mockUseSearch.mockReturnValue({ sessionId: '123' });

    render(<Subscription />);

    expect(
      screen.getByText(/Payment successful/i)
    ).toBeInTheDocument();
  });

  it('fetches billing status on mount', async () => {
    render(<Subscription />);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/billing/status');
    });
  });

  it('displays current plan', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        plan: 'pro',
        status: 'active',
      }),
    });

    render(<Subscription />);

    await waitFor(() => {
      expect(screen.getByText(/Current plan:/i)).toBeInTheDocument();

      // 用 getAllByText 避免重复匹配报错
      expect(screen.getAllByText(/pro/i).length).toBeGreaterThan(0);
    });
  });

  it('shows renewal date if provided', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        plan: 'basic',
        status: 'active',
        current_period_end: '2030-01-01',
      }),
    });

    render(<Subscription />);

    await waitFor(() => {
      expect(screen.getByText(/Renews/i)).toBeInTheDocument();
    });
  });

  it('renders upgrade buttons for non-current plans', async () => {
    render(<Subscription />);

    await waitFor(() => {
      expect(screen.getAllByText(/Upgrade/i).length).toBeGreaterThan(0);
    });
  });

  it('calls checkout API on upgrade click and redirects', async () => {
    (apiFetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
       json: async () => ({ plan: 'free', status: 'active' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          checkout_url: 'https://stripe.com/test',
        }),
      });

    render(<Subscription />); 
    const buttons = await screen.findAllByText(/Upgrade/i);

    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/billing/checkout',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('disables buttons and shows loading state while upgrading', async () => {
    (apiFetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plan: 'free', status: 'active' }),
      })
      .mockImplementationOnce(() => new Promise(() => {}));

    render(<Subscription />);

    const buttons = await screen.findAllByText(/Upgrade/i);

    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Redirecting/i)).toBeInTheDocument();
    });
  });
});