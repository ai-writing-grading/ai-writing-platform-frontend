import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { Upload } from '../../src/routes/upload';
import { apiFetch } from '../../src/lib/api';

jest.mock('../../src/lib/api', () => ({
  apiFetch: jest.fn(),
}));

jest.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
}));

describe('Upload Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createMockFile(name = 'test.txt', size = 1024) {
    return new File(['hello world'], name, { type: 'text/plain' });
  }

  it('renders upload UI', () => {
    render(<Upload />);

    expect(screen.getByText(/Upload Document/i)).toBeInTheDocument();
    expect(screen.getByText(/Drag & drop a file/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Upload & Process/i })
    ).toBeInTheDocument();
  });

  it('selects file via input change', () => {
    render(<Upload />);

    const file = createMockFile('essay.txt');

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [file] },
    });

    expect(screen.getByText('essay.txt')).toBeInTheDocument();
  });

  it('handles file drop', () => {
    render(<Upload />);

    const file = createMockFile('dropped.txt');

    const dropZone = screen.getByText(/Drag & drop/i).closest('div')!;

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(screen.getByText('dropped.txt')).toBeInTheDocument();
  });

  it('disables upload button when no file', () => {
    render(<Upload />);

    expect(
      screen.getByRole('button', { name: /Upload & Process/i })
    ).toBeDisabled();
  });

  it('enables upload button when file is selected', () => {
    render(<Upload />);

    const file = createMockFile();
    const input = document.querySelector('input[type="file"]')!;

    fireEvent.change(input, {
      target: { files: [file] },
    });

    expect(
      screen.getByRole('button', { name: /Upload & Process/i })
    ).not.toBeDisabled();
  });

  it('calls API on upload and shows result', async () => {
    const mockResult = {
      document_id: 'doc-1',
      filename: 'test.txt',
      status: 'completed',
      word_count: 100,
      chunk_count: 2,
      processing_time_ms: 500,
      scoring: {
        score: 90,
        grade: 'A',
      },
    };

    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResult,
    });

    render(<Upload />);

    const file = createMockFile();
    const input = document.querySelector('input[type="file"]')!;

    fireEvent.change(input, {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole('button', { name: /Upload & Process/i }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/pipelines/documents/process',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Processing Complete/i)).toBeInTheDocument();
      expect(screen.getByText(/doc-1/i)).toBeInTheDocument();
      expect(screen.getByText(/90 \/ 100/i)).toBeInTheDocument();
    });
  });

  it('shows error when API fails', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Upload failed' }),
    });

    render(<Upload />);

    const file = createMockFile();
    const input = document.querySelector('input[type="file"]')!;

    fireEvent.change(input, {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole('button', { name: /Upload & Process/i }));

    await waitFor(() => {
      expect(
        screen.getByText((text) => text.includes('Upload failed'))
      ).toBeInTheDocument();
    });
  });

  it('shows loading state while uploading', async () => {
    (apiFetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // pending
    );

    render(<Upload />);

    const file = createMockFile();
    const input = document.querySelector('input[type="file"]')!;

    fireEvent.change(input, {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole('button', { name: /Upload & Process/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Uploading/i })
      ).toBeDisabled();
    });
  });
});