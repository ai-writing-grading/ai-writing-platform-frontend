import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { AdminDashboard } from '../../src/routes/admin/index';

jest.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
}));

describe('Admin Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard sections', () => {
    render(<AdminDashboard />);

    expect(screen.getByText(/System Overview/i)).toBeInTheDocument();
    expect(screen.getByText(/Engine Health Monitor/i)).toBeInTheDocument();
    expect(screen.getByText(/Platform Metrics/i)).toBeInTheDocument();
    expect(screen.getByText(/Dynamic Rubric Configuration/i)).toBeInTheDocument();
  });

  it('shows default weights and total 100%', () => {
    render(<AdminDashboard />);

    expect(screen.getByText(/Total Weight: 100%/i)).toBeInTheDocument();
  });

  it('shows validation error when weights do not sum to 100', () => {
    render(<AdminDashboard />);

    const sliders = screen.getAllByRole('slider');

    // 修改一个 slider
    fireEvent.change(sliders[0], { target: { value: '50' } });

    expect(screen.getByText(/Weights must sum to 100%/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Weight:/i)).toBeInTheDocument();
  });

  it('disables save button when total is not 100', () => {
    render(<AdminDashboard />);

    const sliders = screen.getAllByRole('slider');

    fireEvent.change(sliders[0], { target: { value: '50' } });

    const button = screen.getByRole('button', {
      name: /Save & Apply Configuration/i,
    });

    expect(button).toBeDisabled();
  });

  it('enables save button when total is 100', () => {
    render(<AdminDashboard />);

    const button = screen.getByRole('button', {
      name: /Save & Apply Configuration/i,
    });

    expect(button).not.toBeDisabled();
  });

  it('updates weight values when sliders change', () => {
    render(<AdminDashboard />);

    const sliders = screen.getAllByRole('slider');

    fireEvent.change(sliders[0], { target: { value: '40' } });

    expect(screen.getByText(/40%/i)).toBeInTheDocument();
  });

  it('shows success message after saving', async () => {
    jest.useFakeTimers();

    render(<AdminDashboard />);

    const button = screen.getByRole('button', {
      name: /Save & Apply Configuration/i,
    });

    fireEvent.click(button);

    expect(screen.getByText(/Changes Applied/i)).toBeInTheDocument();

    // 2秒后恢复
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(
        screen.getByText(/Save & Apply Configuration/i)
      ).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it('displays system metrics', () => {
    render(<AdminDashboard />);

    expect(screen.getByText(/6.2s/i)).toBeInTheDocument();
    expect(screen.getByText(/98.7%/i)).toBeInTheDocument();
    expect(screen.getByText(/1,284/i)).toBeInTheDocument();
    expect(screen.getByText(/342/i)).toBeInTheDocument();
  });
});