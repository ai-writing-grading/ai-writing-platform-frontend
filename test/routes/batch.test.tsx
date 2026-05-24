import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// 引入真实的组件和需要 Mock 的依赖
import { Batch } from '../../src/routes/batch'; 
import { apiFetch } from '../../src/lib/api'; 

// 1. Mock TanStack Router
jest.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  useRouter: () => ({ navigate: jest.fn() }),
}));

// 2. Mock 我们的 API 请求函数
jest.mock('../../src/lib/api', () => ({
  apiFetch: jest.fn(),
}));

// 3. Mock 净化函数
jest.mock('../../src/utils/sanitize', () => ({
  sanitizeTextInput: (text: string) => text,
}));

describe('Batch Page Real Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render textarea and submit button initially', () => {
    render(<Batch />);
    
    const textarea = screen.getByPlaceholderText(/Essay one text here/i); 
    const button = screen.getByRole('button', { name: /Submit Batch/i });

    expect(textarea).toBeInTheDocument();
    expect(button).toBeInTheDocument();
  });

  it('should display error when submitting empty essays', async () => {
    render(<Batch />);
    
    const button = screen.getByRole('button', { name: /Submit Batch/i });
    fireEvent.click(button);

    // 💡 修复：使用 findByText 等待 React 异步渲染错误信息
    expect(await screen.findByText(/No essays found/i)).toBeInTheDocument();
  });

  it('should display error when an essay exceeds 10,000 characters', async () => {
    render(<Batch />);
    
    const textarea = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: /Submit Batch/i });

    fireEvent.change(textarea, { target: { value: 'A'.repeat(10001) } });
    fireEvent.click(button);

    // 💡 修复：使用 findByText 等待报错出现
    expect(await screen.findByText(/Each essay must be less than 10,000 characters/i)).toBeInTheDocument();
  });

  it('should call submit API and start polling on valid input', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ job_id: 'job-1234', status: 'queued', completed: 0, total: 2, results: [] }),
    });

    render(<Batch />);
    
    const textarea = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: /Submit Batch/i });

    fireEvent.change(textarea, { target: { value: 'Test essay 1\n---\nTest essay 2' } });
    fireEvent.click(button);

    // 💡 修复：findByText 会自动等待异步更新，不再报找不到元素的错
    expect(await screen.findByText(/job-1234/i)).toBeInTheDocument();
    expect(screen.getByText(/queued/i)).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('should render results table when polling is completed', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        job_id: 'job-5678', 
        status: 'completed', 
        completed: 1, 
        total: 1, 
        cached_hits: 1,
        flagged_for_review: 0,
        results: [{
          composition_id: 'comp-1',
          status: 'completed',
          result: { score: 92, grade: 'A' }
        }] 
      }),
    });

    render(<Batch />);
    
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Great essay!' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit Batch/i }));

    // 💡 修复点：因为有多个 completed，改用 findAllByText
    const completedElements = await screen.findAllByText(/completed/i);
    expect(completedElements.length).toBeGreaterThan(0);

    // 此时 UI 已经更新完毕，可以直接用 getByText 断言表格内容
    expect(screen.getByText(/Cache hits: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/92\/100/i)).toBeInTheDocument();
    expect(screen.getByText(/A/)).toBeInTheDocument();
  });

  it('should handle API submission errors gracefully', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<Batch />);
    
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Will fail' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit Batch/i }));

    // 💡 修复：使用 findByText 等待 catch 里的 setError 渲染完毕
    expect(await screen.findByText(/HTTP 500/i)).toBeInTheDocument();
  });
});