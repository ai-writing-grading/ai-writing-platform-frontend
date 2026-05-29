import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { Preferences } from '../../src/routes/preferences';

jest.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
}));

describe('Preferences Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders all sections', () => {
    render(<Preferences />);

    expect(screen.getByText(/Profile & Preferences/i)).toBeInTheDocument();
    expect(screen.getByText(/Learning Setup/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Engine Settings/i)).toBeInTheDocument();
  });

  it('loads default values when no localStorage', () => {
    render(<Preferences />);

    // 默认值
    expect(
      screen.getByDisplayValue('english')
    ).toBeChecked();

    expect(
      screen.getByDisplayValue('intermediate')
    ).toBeChecked();

    expect(
      screen.getByDisplayValue('standard')
    ).toBeChecked();
  });

  it('loads values from localStorage', () => {
    localStorage.setItem('pref_language', 'chinese');
    localStorage.setItem('pref_difficulty', 'advanced');

    render(<Preferences />);

    expect(
      screen.getByDisplayValue('chinese')
    ).toBeChecked();

    expect(
      screen.getByDisplayValue('advanced')
    ).toBeChecked();
  });

  it('allows changing selections', () => {
    render(<Preferences />);

    const chineseOption = screen.getByDisplayValue('chinese');

    fireEvent.click(chineseOption);

    expect(chineseOption).toBeChecked();
  });

  it('saves preferences to localStorage', async () => {
    render(<Preferences />);

    // 修改一个选项
    fireEvent.click(screen.getByDisplayValue('chinese'));

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(localStorage.getItem('pref_language')).toBe('chinese');
    });
  });

  it('shows saved success message', async () => {
    render(<Preferences />);

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Settings Saved/i)
      ).toBeInTheDocument();
    });
  });

  it('resets success message after timeout', async () => {
    jest.useFakeTimers();

    render(<Preferences />);

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    // 出现 success
    expect(screen.getByText(/Settings Saved/i)).toBeInTheDocument();

    // 2秒后恢复
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(
        screen.getByText(/Save Changes/i)
      ).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it('falls back to default if invalid localStorage value', () => {
    localStorage.setItem('pref_language', 'invalid-value');

    render(<Preferences />);

    expect(
      screen.getByDisplayValue('english')
    ).toBeChecked();
  });
});