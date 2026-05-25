// dashboard.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import { apiFetch } from '../../src/lib/api';
import { Dashboard } from '../../src/routes/dashboard';

jest.mock('../../src/lib/api', () => ({
  apiFetch: jest.fn(),
}));

jest.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  Link: ({ to, params, children, ...props }: any) => {
    const href =
      params?.id && to === '/documents/$id'
        ? `/documents/${params.id}`
        : to;

    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  RadarChart: ({ children }: any) => <div data-testid="radar-chart">{children}</div>,
  Radar: () => <div />,
  PolarGrid: () => <div />,
  PolarAngleAxis: () => <div />,
  PolarRadiusAxis: () => <div />,
}));

describe('Dashboard Page Real Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dashboard title and New Essay button', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ document_ids: [] }),
    });

    render(<Dashboard />);

    expect(screen.getByRole('heading', { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /\+ New Essay/i })).toHaveAttribute('href', '/editor');

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/pipelines/documents/');
    });
  });

  it('should display loading state initially', () => {
    (apiFetch as jest.Mock).mockImplementationOnce(
      () => new Promise(() => {})
    );

    render(<Dashboard />);

    expect(screen.getByText(/Loading documents/i)).toBeInTheDocument();
  });

  it('should load documents on mount and display document list', async () => {
    (apiFetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document_ids: ['doc-1', 'doc-2'] }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          document_id: 'doc-1',
          filename: 'essay1.txt',
          status: 'completed',
          word_count: 500,
          chunk_count: 2,
          processing_time_ms: 2500,
          scoring: {
            score: 85,
            grade: 'B',
          },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          document_id: 'doc-2',
          filename: 'essay2.txt',
          status: 'completed',
          word_count: 800,
          chunk_count: 3,
          processing_time_ms: 3000,
          scoring: {
            score: 95,
            grade: 'A',
          },
        }),
      });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('essay1.txt')).toBeInTheDocument();
      expect(screen.getByText('essay2.txt')).toBeInTheDocument();
    });

    expect(screen.getByText(/500 words · 2 chunks · 2500 ms/i)).toBeInTheDocument();
    expect(screen.getByText(/800 words · 3 chunks · 3000 ms/i)).toBeInTheDocument();

    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('85/100')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('95/100')).toBeInTheDocument();

    expect(apiFetch).toHaveBeenCalledTimes(3);
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/pipelines/documents/');
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/pipelines/documents/doc-1');
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/pipelines/documents/doc-2');
  });

  it('should show charts when at least two scored documents exist', async () => {
    (apiFetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document_ids: ['doc-1', 'doc-2'] }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          document_id: 'doc-1',
          filename: 'essay1.txt',
          status: 'completed',
          word_count: 500,
          chunk_count: 2,
          processing_time_ms: 2000,
          scoring: {
            score: 80,
            grade: 'B',
            rubric: {
              Clarity: 85,
              Organization: 90,
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          document_id: 'doc-2',
          filename: 'essay2.txt',
          status: 'completed',
          word_count: 700,
          chunk_count: 3,
          processing_time_ms: 3000,
          scoring: {
            score: 90,
            grade: 'A',
            rubric: {
              Clarity: 95,
              Organization: 80,
            },
          },
        }),
      });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Score Over Time/i)).toBeInTheDocument();
      expect(screen.getByText(/Avg Rubric Scores/i)).toBeInTheDocument();
    });

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
  });

  it('should show chart hint when fewer than two scored documents exist', async () => {
    (apiFetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document_ids: ['doc-1'] }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          document_id: 'doc-1',
          filename: 'essay1.txt',
          status: 'completed',
          word_count: 500,
          chunk_count: 2,
          processing_time_ms: 2500,
          scoring: {
            score: 85,
            grade: 'B',
          },
        }),
      });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Score at least 2 documents to see charts/i)).toBeInTheDocument();
    });
  });

  it('should display no rubric message when scored docs have no rubric', async () => {
    (apiFetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document_ids: ['doc-1', 'doc-2'] }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          document_id: 'doc-1',
          filename: 'essay1.txt',
          status: 'completed',
          word_count: 500,
          chunk_count: 2,
          processing_time_ms: 2500,
          scoring: {
            score: 85,
            grade: 'B',
          },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          document_id: 'doc-2',
          filename: 'essay2.txt',
          status: 'completed',
          word_count: 700,
          chunk_count: 3,
          processing_time_ms: 3000,
          scoring: {
            score: 90,
            grade: 'A',
          },
        }),
      });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/No rubric breakdown available/i)).toBeInTheDocument();
    });
  });

  it('should show document status when document has no scoring', async () => {
    (apiFetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document_ids: ['doc-1'] }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          document_id: 'doc-1',
          filename: 'failed-essay.txt',
          status: 'failed',
          word_count: 0,
          chunk_count: 0,
          processing_time_ms: 0,
        }),
      });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('failed-essay.txt')).toBeInTheDocument();
      expect(screen.getByText('failed')).toBeInTheDocument();
    });
  });

  it('should link to individual document page', async () => {
    (apiFetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ document_ids: ['doc-123'] }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          document_id: 'doc-123',
          filename: 'essay.txt',
          status: 'completed',
          word_count: 1500,
          chunk_count: 3,
          processing_time_ms: 2500,
          scoring: {
            score: 88,
            grade: 'B',
          },
        }),
      });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('essay.txt')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /essay.txt/i })).toHaveAttribute(
      'href',
      '/documents/doc-123'
    );
  });

  it('should show empty state when no documents exist', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ document_ids: [] }),
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/No documents processed yet/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Grade your first essay/i })).toHaveAttribute(
        'href',
        '/editor'
      );
    });
  });

  it('should show error state when document list API fails', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Error: HTTP 500/i)).toBeInTheDocument();
    });
  });

  it('should show fallback error state when loading throws non Error value', async () => {
    (apiFetch as jest.Mock).mockRejectedValueOnce('network failed');

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to load documents/i)).toBeInTheDocument();
    });
  });
});