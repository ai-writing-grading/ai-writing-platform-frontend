import React from 'react';
import { render, screen } from '@testing-library/react';

import { Home } from '../../src/routes/index';
import * as api from '../../src/lib/api';

// mock getToken
jest.mock('../../src/lib/api', () => ({
  getToken: jest.fn(),
}));

// mock Link
jest.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
}));

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders hero title and description', () => {
    (api.getToken as jest.Mock).mockReturnValue(null);

    render(<Home />);

    expect(screen.getByText(/Elevate Your Writing/i)).toBeInTheDocument();
    expect(screen.getByText(/Powered by AI/i)).toBeInTheDocument();
    expect(
      screen.getByText(/The intelligent writing platform built for learners/i)
    ).toBeInTheDocument();
  });

  it('shows login buttons when user is not logged in', () => {
    (api.getToken as jest.Mock).mockReturnValue(null);

    render(<Home />);

    expect(
      screen.getByRole('link', { name: /Start for Free/i })
    ).toHaveAttribute('href', '/login');

    expect(
      screen.getByRole('link', { name: /Sign In/i })
    ).toHaveAttribute('href', '/login');
  });

  it('shows dashboard button when user is logged in', () => {
    (api.getToken as jest.Mock).mockReturnValue('token');

    render(<Home />);

    expect(
      screen.getByRole('link', { name: /Go to Dashboard/i })
    ).toHaveAttribute('href', '/dashboard');

    // 登录后不应该再看到 login 按钮
    expect(screen.queryByText(/Start for Free/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sign In/i)).not.toBeInTheDocument();
  });

  it('does not render dashboard button when not logged in', () => {
    (api.getToken as jest.Mock).mockReturnValue(null);

    render(<Home />);

    expect(
      screen.queryByText(/Go to Dashboard/i)
    ).not.toBeInTheDocument();
  });
});