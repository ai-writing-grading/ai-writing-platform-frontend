import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { Route } from '../../src/routes/admin/review';
import { apiFetch, getToken } from '../../src/lib/api';
import { HitlReviewPage } from '../../src/routes/admin/review';

// mock
jest.mock('../../src/lib/api', () => ({
  apiFetch: jest.fn(),
  getToken: jest.fn(),
}));

jest.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
}));

describe('Admin HITL Review Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (getToken as jest.Mock).mockReturnValue(
      'header.' + btoa(JSON.stringify({ id: 'admin-1' })) + '.sig'
    );
  });

  const mockItem = {
    review_id: 'rev-1',
    document_id: 'doc-1',
    ai_score: 85,
    ai_confidence: 0.9,
    flag_reason: 'quality',
    status: 'pending',
    text_preview: 'Sample text',
    ai_feedback: 'AI feedback',
    reviewer_id: null,
    reviewer_score: null,
    created_at: new Date().toISOString(),
  };

  it('shows loading initially', () => {
    (apiFetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<HitlReviewPage />);

    expect(screen.getByText(/Loading queue/i)).toBeInTheDocument();
  });

  it('renders empty state', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<HitlReviewPage />);

    await waitFor(() => {
      expect(screen.getByText(/All caught up/i)).toBeInTheDocument();
    });
  });

  it('renders review table', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockItem],
    });

    render(<HitlReviewPage />);

    await waitFor(() => {
      expect(screen.getByText(/quality/i)).toBeInTheDocument();
      expect(screen.getByText(/pending/i)).toBeInTheDocument();
    });
  });

  it('expands row on click', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [mockItem],
    });

    render(<HitlReviewPage />);

    const row = await screen.findByText(/quality/i);

    fireEvent.click(row.closest('tr')!);

    await waitFor(() => {
      expect(screen.getByText(/Text Preview/i)).toBeInTheDocument();
      expect(screen.getAllByText(/AI feedback/i).length).toBeGreaterThan(0);
    });
  });

  it('calls claim API', async () => {
    (apiFetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockItem],
      })
      .mockResolvedValueOnce({ ok: true });

    render(<HitlReviewPage />);

    const claimBtn = await screen.findByText(/Claim/i);

    fireEvent.click(claimBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/assign'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('shows override validation error', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockItem],
    });

    render(<HitlReviewPage />);

    const row = await screen.findByText(/quality/i);
    fireEvent.click(row.closest('tr')!);

    const input = await screen.findByPlaceholderText(/New Score/i);

    fireEvent.change(input, { target: { value: '200' } });

    const btn = screen.getByText(/Override Score/i);

    fireEvent.click(btn);

    await waitFor(() => {
      expect(
        screen.getByText(/must be a number between 0 and 100/i)
      ).toBeInTheDocument();
    });
  });

  it('refresh button reloads data', async () => {
    (apiFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<HitlReviewPage />);
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledTimes(1);
    });

    const btn = await screen.findByRole('button', {
      name: /refresh/i,
    });

    fireEvent.click(btn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledTimes(2);
    });
  });
});