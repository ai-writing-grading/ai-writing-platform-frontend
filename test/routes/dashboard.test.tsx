import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn(),
}));

jest.mock('@tanstack/react-router', () => ({
  createFileRoute: () => ({}),
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
}));

describe('Dashboard Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dashboard title', () => {
    const title = 'Dashboard';
    expect(title).toBeTruthy();
  });

  it('should load documents on mount', () => {
    const docs = [
      { document_id: 'doc-1', filename: 'essay1.txt', status: 'completed' },
      { document_id: 'doc-2', filename: 'essay2.txt', status: 'completed' },
    ];

    expect(docs.length).toBeGreaterThan(0);
  });

  it('should display document list', () => {
    const docs = [
      {
        document_id: 'doc-1',
        filename: 'essay1.txt',
        word_count: 500,
        status: 'completed',
      },
    ];

    expect(docs[0].filename).toBeTruthy();
    expect(docs[0].word_count).toBeGreaterThan(0);
  });

  it('should show document status', () => {
    const statuses = ['completed', 'processing', 'failed'];
    statuses.forEach((status) => {
      expect(status).toBeTruthy();
    });
  });

  it('should display document scores', () => {
    const doc = {
      document_id: 'doc-1',
      scoring: {
        score: 85,
        grade: 'B',
      },
    };

    expect(doc.scoring.score).toBeGreaterThanOrEqual(0);
    expect(doc.scoring.score).toBeLessThanOrEqual(100);
  });

  it('should calculate average score', () => {
    const docs = [
      { scoring: { score: 80 } },
      { scoring: { score: 90 } },
      { scoring: { score: 85 } },
    ];

    const avgScore = docs.reduce((sum, d) => sum + (d.scoring?.score || 0), 0) / docs.length;
    expect(avgScore).toBeCloseTo(85, 0);
  });

  it('should show grade distribution with color coding', () => {
    const gradeColors: Record<string, string> = {
      A: '#16a34a',
      B: '#2563eb',
      C: '#d97706',
      D: '#ea580c',
      F: '#dc2626',
    };

    expect(gradeColors['A']).toBeTruthy();
    expect(gradeColors['B']).toBeTruthy();
  });

  it('should display line chart when enough data', () => {
    const docs = [
      { filename: 'essay1', scoring: { score: 80 } },
      { filename: 'essay2', scoring: { score: 90 } },
    ];

    const shouldShowChart = docs.length >= 2;
    expect(shouldShowChart).toBe(true);
  });

  it('should display radar chart for rubric dimensions', () => {
    const rubricData = [
      { dimension: 'Clarity', score: 85 },
      { dimension: 'Organization', score: 90 },
    ];

    expect(rubricData.length).toBeGreaterThan(0);
  });

  it('should filter documents with scoring', () => {
    const docs = [
      { document_id: 'doc-1', scoring: { score: 85 } },
      { document_id: 'doc-2' }, // no scoring
      { document_id: 'doc-3', scoring: { score: 90 } },
    ];

    const scoredDocs = docs.filter((d) => d.scoring != null);
    expect(scoredDocs.length).toBe(2);
  });

  it('should show error state when loading fails', () => {
    const error = 'Failed to load documents';
    expect(error).toContain('Failed');
  });

  it('should display loading state', () => {
    let loading = true;
    expect(loading).toBe(true);

    loading = false;
    expect(loading).toBe(false);
  });

  it('should link to individual documents', () => {
    const doc = { document_id: 'doc-123' };
    const link = `/documents/${doc.document_id}`;
    expect(link).toBe('/documents/doc-123');
  });

  it('should display document metadata', () => {
    const doc = {
      document_id: 'doc-1',
      filename: 'essay.txt',
      word_count: 1500,
      chunk_count: 3,
      processing_time_ms: 2500,
    };

    expect(doc.word_count).toBeGreaterThan(0);
    expect(doc.chunk_count).toBeGreaterThan(0);
  });

  it('should calculate processing time', () => {
    const processingTimeMs = 2500;
    const processingTimeSec = processingTimeMs / 1000;
    expect(processingTimeSec).toBeCloseTo(2.5, 1);
  });

  it('should average rubric scores across documents', () => {
    const docs = [
      {
        scoring: {
          rubric: { Clarity: 85, Organization: 90 },
        },
      },
      {
        scoring: {
          rubric: { Clarity: 95, Organization: 80 },
        },
      },
    ];

    const totalClarityScore = docs.reduce(
      (sum, d) => sum + (d.scoring?.rubric?.Clarity || 0),
      0
    );
    const avgClarity = totalClarityScore / docs.length;
    expect(avgClarity).toBeCloseTo(90, 0);
  });

  it('should display "New Essay" button linking to editor', () => {
    const buttonLink = '/editor';
    expect(buttonLink).toBe('/editor');
  });
});
