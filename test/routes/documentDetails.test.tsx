import { render, screen, waitFor } from '@testing-library/react';

import { DocumentDetails } from '../../src/routes/documents/$id';
import { apiFetch } from '../../src/lib/api';

const mockUseParams = jest.fn();

jest.mock('../../src/lib/api', () => ({
  apiFetch: jest.fn(),
}));

jest.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({
    useParams: () => mockUseParams(),
  }),
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
}));

describe('Document Details Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ id: 'doc-1' });
  });

  it('shows loading state initially', () => {
    (apiFetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<DocumentDetails />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<DocumentDetails />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Back to Dashboard/i)).toBeInTheDocument();
  });

  it('renders document metadata', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        document_id: 'doc-1',
        filename: 'essay.txt',
        status: 'completed',
        stage_reached: 'done',
        word_count: 500,
        chunk_count: 2,
        processing_time_ms: 1000,
      }),
    });

    render(<DocumentDetails />);

    await waitFor(() => {
      expect(screen.getByText('essay.txt')).toBeInTheDocument();
      expect(screen.getByText(/500 words/i)).toBeInTheDocument();
      expect(screen.getByText(/2 chunks/i)).toBeInTheDocument();
    });
  });

  it('shows scoring results when available', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        document_id: 'doc-1',
        filename: 'essay.txt',
        status: 'completed',
        stage_reached: 'done',
        word_count: 500,
        chunk_count: 2,
        processing_time_ms: 1000,
        scoring: {
          score: 90,
          grade: 'A',
          summary: 'Great job!',
          model_used: 'gpt',
          feedback: [],
        },
      }),
    });

    render(<DocumentDetails />);

    await waitFor(() => {
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText(/90\/100/i)).toBeInTheDocument();
      expect(screen.getByText(/Summary/i)).toBeInTheDocument();
      expect(screen.getByText(/Great job/i)).toBeInTheDocument();
    });
  });

  it('shows failed status and error message', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        document_id: 'doc-1',
        filename: 'essay.txt',
        status: 'failed',
        stage_reached: 'error',
        word_count: 0,
        chunk_count: 0,
        processing_time_ms: 0,
        error: 'Processing failed',
      }),
    });

    render(<DocumentDetails />);

    await waitFor(() => {
      expect(
        screen.getByText((text) => text === 'failed')
      ).toBeInTheDocument();

      expect(
        screen.getByText(/Processing failed/i)
      ).toBeInTheDocument();
    });
  });

  it('renders feedback list', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        document_id: 'doc-1',
        filename: 'essay.txt',
        status: 'completed',
        stage_reached: 'done',
        word_count: 500,
        chunk_count: 2,
        processing_time_ms: 1000,
        scoring: {
          score: 85,
          grade: 'B',
          summary: '',
          model_used: 'gpt',
          feedback: [
            {
              category: 'grammar',
              severity: 'warning',
              message: 'Grammar issue',
              suggestion: 'Fix grammar',
            },
          ],
        },
      }),
    });

    render(<DocumentDetails />);

    await waitFor(() => {
      expect(screen.getByText(/Feedback/i)).toBeInTheDocument();
      expect(screen.getByText(/Grammar issue/i)).toBeInTheDocument();
      expect(screen.getByText(/Fix grammar/i)).toBeInTheDocument();
    });
  });

  it('calls API with correct document id', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        document_id: 'doc-1',
        filename: 'essay.txt',
        status: 'completed',
        stage_reached: 'done',
        word_count: 100,
        chunk_count: 1,
        processing_time_ms: 100,
      }),
    });

    render(<DocumentDetails />);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/pipelines/documents/doc-1'
      );
    });
  });
});