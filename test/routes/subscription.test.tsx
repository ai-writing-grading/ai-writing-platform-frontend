import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { apiFetch } from "../../src/lib/api";
import { redirectToExternal } from "../../src/lib/redirect";
import { Subscription } from "../../src/routes/subscription";

const mockUseSearch = jest.fn();

jest.mock("../../src/lib/api", () => ({
  apiFetch: jest.fn(),
}));

jest.mock("../../src/lib/redirect", () => ({
  redirectToExternal: jest.fn(),
}));

jest.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
  useSearch: (...args: unknown[]) => mockUseSearch(...args),
}));

const billingResponse = (overrides = {}) => ({
  ok: true,
  json: async () => ({
    plan: "free",
    status: "none",
    can_manage_billing: false,
    ...overrides,
  }),
});

describe("Subscription Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearch.mockReturnValue({});
    (apiFetch as jest.Mock).mockResolvedValue(billingResponse());
  });

  it("renders title and fetches billing status", async () => {
    render(<Subscription />);

    expect(screen.getByText("Subscription")).toBeInTheDocument();
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/v1/billing/status");
    });
  });

  it("verifies a returned Checkout Session before showing success", async () => {
    mockUseSearch.mockReturnValue({
      checkout: "success",
      session_id: "cs_test_123",
    });
    (apiFetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ complete: true, status: "complete" }),
      })
      .mockResolvedValueOnce(billingResponse({ plan: "basic", status: "active" }));

    render(<Subscription />);

    expect(
      await screen.findByText(/Payment confirmed/i),
    ).toBeInTheDocument();
    expect(apiFetch).toHaveBeenNthCalledWith(
      1,
      "/api/v1/billing/checkout-session/cs_test_123",
    );
  });

  it("shows a cancellation notice", async () => {
    mockUseSearch.mockReturnValue({ checkout: "canceled" });
    render(<Subscription />);

    expect(await screen.findByText(/was canceled/i)).toBeInTheDocument();
  });

  it("shows renewal or scheduled end date", async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce(
      billingResponse({
        plan: "basic",
        status: "active",
        current_period_end: "2030-01-01",
        cancel_at_period_end: true,
        can_manage_billing: true,
      }),
    );

    render(<Subscription />);

    expect(await screen.findByText(/Ends/i)).toBeInTheDocument();
  });

  it("starts Checkout for a free user", async () => {
    (apiFetch as jest.Mock)
      .mockResolvedValueOnce(billingResponse())
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ checkout_url: "https://checkout.stripe.com/test" }),
      });

    render(<Subscription />);
    const buttons = await screen.findAllByText("Upgrade");
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/v1/billing/checkout",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ plan: "basic" }),
        }),
      );
      expect(redirectToExternal).toHaveBeenCalledWith(
        "https://checkout.stripe.com/test",
      );
    });
  });

  it("opens the billing portal for an existing Stripe customer", async () => {
    (apiFetch as jest.Mock)
      .mockResolvedValueOnce(
        billingResponse({
          plan: "pro",
          status: "active",
          can_manage_billing: true,
        }),
      )
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ portal_url: "https://billing.stripe.com/test" }),
      });

    render(<Subscription />);
    fireEvent.click(await screen.findByRole("button", { name: /Manage billing/i }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/v1/billing/portal", {
        method: "POST",
      });
      expect(redirectToExternal).toHaveBeenCalledWith(
        "https://billing.stripe.com/test",
      );
    });
  });

  it("shows the API error when Checkout cannot start", async () => {
    (apiFetch as jest.Mock)
      .mockResolvedValueOnce(billingResponse())
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: "Stripe is not configured." }),
      });

    render(<Subscription />);
    fireEvent.click((await screen.findAllByText("Upgrade"))[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Stripe is not configured.",
    );
  });
});
