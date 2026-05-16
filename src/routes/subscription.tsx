import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";
import { createFileRoute, useSearch } from "@tanstack/react-router";

interface BillingStatus {
  plan: string;
  status: string;
  current_period_end?: string | null;
}

const PLANS = [
  { key: "free",  label: "Free",  price: "$0",     calls: "10 AI calls/day" },
  { key: "basic", label: "Basic", price: "$9/mo",  calls: "100 AI calls/day" },
  { key: "pro",   label: "Pro",   price: "$29/mo", calls: "Unlimited" },
];

const PLAN_COLOR: Record<string, string> = {
  free:  "#6b7280",
  basic: "#4f46e5",
  pro:   "#7c3aed",
};

export const Route = createFileRoute('/subscription')({
  component: Subscription,
})
function Subscription() {
  const [status, setStatus]     = useState<BillingStatus | null>(null);
  const [loading, setLoading]   = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const searchParams = useSearch({ strict: false }) as { sessionId?: string };
  const { sessionId } = searchParams;


  useEffect(() => {
    apiFetch("/api/v1/billing/status")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStatus(data); })
      .finally(() => setLoading(false));
  }, []);

  async function handleUpgrade(plan: string) {
    setUpgrading(plan);
    try {
      const res = await apiFetch("/api/v1/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.checkout_url) window.location.href = data.checkout_url;
      }
    } finally {
      setUpgrading(null);
    }
  }

  const currentPlan = status?.plan ?? "free";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem" }}>
      {sessionId && (
        <div style={{
          background: "#dcfce7",
          border: "1px solid #16a34a",
          borderRadius: 8,
          padding: "1rem 1.5rem",
          marginBottom: "1.5rem",
          color: "#15803d",
          fontWeight: 500,
        }}>
          Payment successful! Your plan is now active.
        </div>
      )}

      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        Subscription
      </h1>

      {!loading && status && (
        <div style={{ marginBottom: "1.5rem", color: "#4b5563", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span>Current plan:</span>
          <span style={{
            display: "inline-block",
            padding: "0.2rem 0.75rem",
            background: PLAN_COLOR[currentPlan] ?? "#6b7280",
            color: "#fff",
            borderRadius: 9999,
            fontWeight: 600,
            textTransform: "capitalize",
            fontSize: "0.875rem",
          }}>
            {currentPlan}
          </span>
          {status.current_period_end && (
            <span style={{ fontSize: "0.875rem" }}>
              Renews {new Date(status.current_period_end).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "1.5rem" }}>
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.key;
          return (
            <div key={plan.key} style={{
              flex: 1,
              border: `2px solid ${isCurrent ? PLAN_COLOR[plan.key] : "#e5e7eb"}`,
              borderRadius: 12,
              padding: "1.5rem",
              background: isCurrent ? "#f5f3ff" : "#fff",
            }}>
              <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.25rem" }}>
                {plan.label}
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: PLAN_COLOR[plan.key], marginBottom: "0.5rem" }}>
                {plan.price}
              </div>
              <div style={{ color: "#6b7280", marginBottom: "1.25rem", fontSize: "0.9rem" }}>
                {plan.calls}
              </div>

              {isCurrent ? (
                <div style={{ color: PLAN_COLOR[plan.key], fontWeight: 600, fontSize: "0.9rem" }}>
                  Current plan
                </div>
              ) : plan.key !== "free" && (
                <button
                  onClick={() => handleUpgrade(plan.key)}
                  disabled={upgrading !== null}
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    background: PLAN_COLOR[plan.key],
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: upgrading !== null ? "not-allowed" : "pointer",
                    opacity: upgrading !== null ? 0.7 : 1,
                    fontSize: "0.95rem",
                  }}
                >
                  {upgrading === plan.key ? "Redirecting…" : "Upgrade"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
