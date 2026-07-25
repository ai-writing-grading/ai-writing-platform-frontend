import { useEffect, useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";

import { apiFetch } from "../lib/api";
import { redirectToExternal } from "../lib/redirect";

interface BillingStatus {
  plan: string;
  status: string;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  can_manage_billing?: boolean;
}

interface SearchParams {
  checkout?: "success" | "canceled";
  session_id?: string;
}

const PLANS = [
  { key: "free", label: "Free", price: "$0", calls: "10 AI calls/day" },
  { key: "basic", label: "Basic", price: "$9/mo", calls: "100 AI calls/day" },
  { key: "pro", label: "Pro", price: "$29/mo", calls: "Unlimited" },
];

const PLAN_COLOR: Record<string, string> = {
  free: "#6b7280",
  basic: "#4f46e5",
  pro: "#7c3aed",
};

async function responseError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.detail || "The billing request failed. Please try again.";
  } catch {
    return "The billing request failed. Please try again.";
  }
}

export const Route = createFileRoute("/subscription")({
  component: Subscription,
});

export function Subscription() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const searchParams = useSearch({ strict: false }) as SearchParams;
  const { checkout, session_id: sessionId } = searchParams;

  useEffect(() => {
    let active = true;

    async function loadBilling() {
      setLoading(true);
      setError(null);
      try {
        if (checkout === "canceled") {
          setNotice("Checkout was canceled. You were not charged.");
        } else if (checkout === "success" && sessionId) {
          const confirmation = await apiFetch(
            `/api/v1/billing/checkout-session/${encodeURIComponent(sessionId)}`,
          );
          if (!confirmation.ok) {
            throw new Error(await responseError(confirmation));
          }
          const result = await confirmation.json();
          setNotice(
            result.complete
              ? "Payment confirmed. Your subscription is now active."
              : "Stripe is still processing your checkout. Refresh in a moment.",
          );
        }

        const response = await apiFetch("/api/v1/billing/status");
        if (!response.ok) {
          throw new Error(await responseError(response));
        }
        const data = await response.json();
        if (active) setStatus(data);
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Unable to load billing.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadBilling();
    return () => {
      active = false;
    };
  }, [checkout, sessionId]);

  async function handleUpgrade(plan: string) {
    setAction(plan);
    setError(null);
    try {
      const response = await apiFetch("/api/v1/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      if (!response.ok) {
        throw new Error(await responseError(response));
      }
      const data = await response.json();
      if (!data.checkout_url) {
        throw new Error("Stripe did not return a Checkout URL.");
      }
      redirectToExternal(data.checkout_url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start checkout.");
      setAction(null);
    }
  }

  async function handleManageBilling() {
    setAction("portal");
    setError(null);
    try {
      const response = await apiFetch("/api/v1/billing/portal", { method: "POST" });
      if (!response.ok) {
        throw new Error(await responseError(response));
      }
      const data = await response.json();
      if (!data.portal_url) {
        throw new Error("Stripe did not return a billing portal URL.");
      }
      redirectToExternal(data.portal_url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to open billing.");
      setAction(null);
    }
  }

  const currentPlan = status?.plan ?? "free";
  const isPaid = currentPlan !== "free";
  const periodDate = status?.current_period_end
    ? new Date(status.current_period_end).toLocaleDateString()
    : null;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem" }}>
      {notice && (
        <div
          role="status"
          style={{
            background: checkout === "canceled" ? "#fffbeb" : "#dcfce7",
            border: `1px solid ${checkout === "canceled" ? "#f59e0b" : "#16a34a"}`,
            borderRadius: 8,
            padding: "1rem 1.5rem",
            marginBottom: "1.5rem",
            color: checkout === "canceled" ? "#92400e" : "#15803d",
            fontWeight: 500,
          }}
        >
          {notice}
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            background: "#fef2f2",
            border: "1px solid #ef4444",
            borderRadius: 8,
            padding: "1rem 1.5rem",
            marginBottom: "1.5rem",
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
            Subscription
          </h1>
          <p style={{ color: "#6b7280", margin: 0 }}>
            Secure test payments are hosted by Stripe Checkout.
          </p>
        </div>
        {status?.can_manage_billing && (
          <button
            type="button"
            onClick={handleManageBilling}
            disabled={action !== null}
            style={{
              padding: "0.65rem 1rem",
              background: "#fff",
              color: "#4f46e5",
              border: "1px solid #4f46e5",
              borderRadius: 8,
              fontWeight: 600,
              cursor: action ? "not-allowed" : "pointer",
              opacity: action ? 0.7 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {action === "portal" ? "Opening…" : "Manage billing"}
          </button>
        )}
      </div>

      {!loading && status && (
        <div
          style={{
            marginBottom: "1.5rem",
            color: "#4b5563",
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <span>Current plan:</span>
          <span
            style={{
              display: "inline-block",
              padding: "0.2rem 0.75rem",
              background: PLAN_COLOR[currentPlan] ?? "#6b7280",
              color: "#fff",
              borderRadius: 9999,
              fontWeight: 600,
              textTransform: "capitalize",
              fontSize: "0.875rem",
            }}
          >
            {currentPlan}
          </span>
          {periodDate && (
            <span style={{ fontSize: "0.875rem" }}>
              {status.cancel_at_period_end ? `Ends ${periodDate}` : `Renews ${periodDate}`}
            </span>
          )}
          {status.status === "past_due" && (
            <span style={{ color: "#b45309", fontSize: "0.875rem", fontWeight: 600 }}>
              Payment past due — update your payment method
            </span>
          )}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#6b7280" }}>Loading subscription…</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            return (
              <section
                key={plan.key}
                style={{
                  flex: "1 1 220px",
                  border: `2px solid ${isCurrent ? PLAN_COLOR[plan.key] : "#e5e7eb"}`,
                  borderRadius: 12,
                  padding: "1.5rem",
                  background: isCurrent ? "#f5f3ff" : "#fff",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.25rem" }}>
                  {plan.label}
                </div>
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    color: PLAN_COLOR[plan.key],
                    marginBottom: "0.5rem",
                  }}
                >
                  {plan.price}
                </div>
                <div style={{ color: "#6b7280", marginBottom: "1.25rem", fontSize: "0.9rem" }}>
                  {plan.calls}
                </div>

                {isCurrent ? (
                  <div style={{ color: PLAN_COLOR[plan.key], fontWeight: 600, fontSize: "0.9rem" }}>
                    Current plan
                  </div>
                ) : plan.key !== "free" && !isPaid ? (
                  <button
                    type="button"
                    onClick={() => handleUpgrade(plan.key)}
                    disabled={action !== null}
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      background: PLAN_COLOR[plan.key],
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 600,
                      cursor: action ? "not-allowed" : "pointer",
                      opacity: action ? 0.7 : 1,
                      fontSize: "0.95rem",
                    }}
                  >
                    {action === plan.key ? "Redirecting…" : "Upgrade"}
                  </button>
                ) : plan.key !== "free" && isPaid ? (
                  <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>
                    Change plans in Manage billing
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
