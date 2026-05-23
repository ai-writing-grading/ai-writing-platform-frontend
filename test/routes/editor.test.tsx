import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// 引入你的 API 和 Route
import { apiFetch } from '../../src/lib/api'; 
import { Editor } from '../../src/routes/editor';

jest.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  useRouter: () => ({ navigate: jest.fn() }),
}));

jest.mock('../../src/lib/api', () => ({
  apiFetch: jest.fn(),
}));

describe('Editor Page Real Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render textarea and grade button initially', () => {
    render(<Editor />);
    
    // 💡 修复：换成真实的 placeholder 文本
    const textarea = screen.getByPlaceholderText(/Paste or type your essay here/i);
    // 💡 修复：换成真实的按钮文本
    const button = screen.getByRole('button', { name: /Grade My Writing/i });

    expect(textarea).toBeInTheDocument();
    expect(button).toBeInTheDocument();
  });

  it('should update textarea value when user types', () => {
    render(<Editor />);
    
    // 💡 修复：换成真实的 placeholder 文本
    const textarea = screen.getByPlaceholderText(/Paste or type your essay here/i) as HTMLTextAreaElement;
    
    // 模拟真实用户输入
    fireEvent.change(textarea, { target: { value: 'Hello AI writing platform!' } });
    
    expect(textarea.value).toBe('Hello AI writing platform!');
  });

  it('should show loading state and call API when Grade button is clicked', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        score: 85, 
        overall_feedback: 'Good job!',
        // 💡 修复：补上组件需要的 rubric 数组
        rubric: [
          { dimension: 'Clarity', score: 85, comments: 'Clear.' }
        ],
        improvement_tips: ['Keep practicing your grammar.']
      }),
    });

    render(<Editor />);
    
    const textarea = screen.getByPlaceholderText(/Paste or type your essay here/i);
    const button = screen.getByRole('button', { name: /Grade My Writing/i });

    fireEvent.change(textarea, { target: { value: 'My test essay.' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledTimes(1);
    });
  });

  it('should display grading results after successful API call', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        score: 95, 
        overall_feedback: 'Excellent writing structure.',
        // 💡 修复：补上组件需要的 rubric 数组
        rubric: [
          { dimension: 'Grammar', score: 95, comments: 'Perfect grammar.' },
          { dimension: 'Structure', score: 95, comments: 'Well organized.' }
        ],
        improvement_tips: ['Try using more advanced vocabulary.', 'Read more classic literature.']
      }),
    });

    render(<Editor />);
    
    fireEvent.change(screen.getByPlaceholderText(/Paste or type your essay here/i), { target: { value: 'Perfect essay.' } });
    fireEvent.click(screen.getByRole('button', { name: /Grade My Writing/i }));

    // 等待屏幕上出现分数 95
    await waitFor(() => {
      expect(screen.getAllByText(/95/).length).toBeGreaterThan(0);
      expect(screen.getByText(/Excellent writing structure/i)).toBeInTheDocument();
      expect(screen.getByText(/Grammar/i)).toBeInTheDocument();
      expect(screen.getByText(/Try using more advanced vocabulary/i)).toBeInTheDocument();
    });
  });
});