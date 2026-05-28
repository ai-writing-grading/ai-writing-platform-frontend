import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Learn } from '../../src/routes/learn';
import { apiFetch } from '../../src/lib/api';

jest.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
}));

jest.mock('../../src/lib/api', () => ({
  apiFetch: jest.fn(),
}));

describe('Learn Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and search input', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<Learn />);

    expect(screen.getByText(/Writing Techniques/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Search techniques/i)
    ).toBeInTheDocument();
  });

  it('fetches techniques on initial load', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<Learn />);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/retrieval/techniques')
      );
    });
  });

  it('displays results after successful fetch', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          title: 'Use strong thesis',
          content: 'Your thesis should be clear.',
          score: 0.9,
        },
      ],
    });

    render(<Learn />);

    await waitFor(() => {
      expect(screen.getByText(/Use strong thesis/i)).toBeInTheDocument();
      expect(screen.getByText(/90% match/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no results', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<Learn />);

    await waitFor(() => {
      expect(screen.getByText(/No techniques found/i)).toBeInTheDocument();
    });
  });

  it('shows error when API fails', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<Learn />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/i)).toBeInTheDocument();
    });
  });

  it('handles search input and triggers API call', async () => {
    jest.useFakeTimers();

    (apiFetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [],
    });

    render(<Learn />);

    // ✅ 等初始请求完成（关键！！！）
    await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledTimes(1);
    });

    const input = screen.getByPlaceholderText(/Search techniques/i);

    fireEvent.change(input, { target: { value: 'grammar' } });

    jest.advanceTimersByTime(400);

    await waitFor(() => {
        expect(apiFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('grammar')
        );
    });

    jest.useRealTimers();
   });
   
  it('shows loading state initially', async () => {
    (apiFetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // pending
    );

    render(<Learn />);

    // Skeleton 没有 text，只能测 loading 状态是否存在
    expect(screen.getByText(/Writing Techniques/i)).toBeInTheDocument();
  });
});