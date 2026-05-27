import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Login } from '../../src/routes/login';
import * as api from '../../src/lib/api';

const mockNavigate = jest.fn();

jest.mock('../../src/lib/api', () => ({
  setToken: jest.fn(),
  getUserRole: jest.fn(),
}));

jest.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  useNavigate: () => mockNavigate,
}));

describe('Login Page Real Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    (api.getUserRole as jest.Mock).mockReturnValue('user');

    global.fetch = jest.fn();
  });

  function getInputs() {
    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    return { emailInput, passwordInput };
  }

  async function fillForm() {
    const { emailInput, passwordInput } = getInputs();
    await userEvent.type(emailInput, 'test@test.com');
    await userEvent.type(passwordInput, '123456');
  }

  function submitForm() {
    const form = document.querySelector('form')!;
    fireEvent.submit(form);
  }

  it('renders email and password inputs', () => {
    render(<Login />);

    const { emailInput, passwordInput } = getInputs();

    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
  });

  it('allows user to type in inputs', async () => {
    render(<Login />);

    const { emailInput, passwordInput } = getInputs();

    await userEvent.type(emailInput, 'test@test.com');
    await userEvent.type(passwordInput, '123456');

    expect(emailInput.value).toBe('test@test.com');
    expect(passwordInput.value).toBe('123456');
  });

  it('submits login and navigates to dashboard on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'abc-token' }),
    });

    render(<Login />);

    await fillForm();
    submitForm();

    await waitFor(() => {
      expect(api.setToken).toHaveBeenCalledWith('abc-token');
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard' });
    });
  });

  it('navigates to admin when role is admin', async () => {
    (api.getUserRole as jest.Mock).mockReturnValue('admin');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'admin-token' }),
    });

    render(<Login />);

    await fillForm();
    submitForm();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/admin' });
    });
  });

  it('shows error message when login fails (HTTP error)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Invalid credentials' }),
    });

    render(<Login />);

    await fillForm();
    submitForm();

    await waitFor(() => {
      expect(
        screen.getByText((text) => text.includes('Invalid credentials'))
      ).toBeInTheDocument();
    });
  });

  it('shows fallback error when fetch throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<Login />);

    await fillForm();
    submitForm();

    await waitFor(() => {
      expect(
        screen.getByText((text) => text.includes('Network error'))
      ).toBeInTheDocument();
    });
  });

  it('switches to register tab and changes button text', () => {
    render(<Login />);

    fireEvent.click(screen.getByText(/register/i));

    expect(
      screen.getByRole('button', { name: /Create Account/i })
    ).toBeInTheDocument();
  });

  it('clears error when switching tabs', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'Some error' }),
    });

    render(<Login />);

    await fillForm();
    submitForm();

    await waitFor(() => {
      expect(
        screen.getByText((text) => text.includes('Some error'))
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/register/i));

    expect(
      screen.queryByText((text) => text.includes('Some error'))
    ).not.toBeInTheDocument();
  });

  it('disables button while loading', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

    render(<Login />);

    await fillForm();
    submitForm();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /please wait/i })
      ).toBeDisabled();
    });
  });
});