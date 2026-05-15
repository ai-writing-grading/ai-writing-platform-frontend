import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../lib/api";

interface ReviewItem {
  review_id: string;
  document_id: string;
  ai_score: number;
  ai_confidence: number;
  flag_reason: string;
  status: string;
  text_preview: string;
  ai_feedback: string;
  reviewer_id: string | null;
  reviewer_score: number | null;
  created_at: string;
}

const REVIEWER_ID = "reviewer-ui";

const STATUS_COLOR: Record<string, string> = {
  pending: "#d97706",
  in_review: "#2563eb",
  approved: "#16a34a",
  overridden: "#7c3aed",
  escalated: "#dc2626",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export default function Review() {
  const [items, setItems]       = useState<ReviewItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [overrideInputs, setOverrideInputs] = useState<Record<string, string>>({});
  const [busy, setBusy]         = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/v1/hitl/queue");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems(await res.json() as ReviewItem[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function claim(review_id: string) {
    setBusy(review_id);
    setActionError(null);
    try {
      const res = await apiFetch(
        `/api/v1/hitl/${review_id}/assign?reviewer_id=${encodeURIComponent(REVIEWER_ID)}`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setExpandedId(review_id);
      await load();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Claim failed");
    } finally {
      setBusy(null);
    }
  }

  async function decide(review_id: string, approved: boolean, overrideScore?: number) {
    setBusy(review_id);
    setActionError(null);
    try {
      const body: Record<string, unknown> = { review_id, approved, reviewer_id: REVIEWER_ID };
      if (!approved && overrideScore !== undefined) body.reviewer_score = overrideScore;
      const res = await apiFetch("/api/v1/hitl/decide", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setExpandedId(null);
      await load();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Decision failed");
    } finally {
      setBusy(null);
    }
  }

  function handleOverrideChange(review_id: string, val: string) {
    setOverrideInputs((prev) => ({ ...prev, [review_id]: val }));
  }

  function handleOverrideSubmit(review_id: string) {
    const raw = overrideInputs[review_id] ?? "";
    const score = parseFloat(raw);
    if (isNaN(score) || score < 0 || score > 100) {
      setActionError("Override score must be a number between 0 and 100.");
      return;
    }
    decide(review_id, false, score);
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "960px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>HITL Review Queue</h1>
        <button
          onClick={load}
          style={{ padding: "0.4rem 1rem", background: "#4f46e5", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.9rem" }}
        >
          Refresh
        </button>
      </div>

      {loading && <p style={{ color: "#6b7280" }}>Loading queue…</p>}
      {error && <p style={{ color: "#dc2626" }}>Error: {error}</p>}
      {actionError && <p style={{ color: "#dc2626", fontSize: "0.9rem" }}>{actionError}</p>}

      {!loading && !error && items.length === 0 && (
        <p style={{ color: "#6b7280", textAlign: "center", padding: "3rem 0" }}>
          No items in the review queue.
        </p>
      )}

      {items.length > 0 && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={thStyle}>Review ID</th>
                <th style={thStyle}>Flag Reason</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Created At</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <>
                  <tr
                    key={item.review_id}
                    style={{ background: expandedId === item.review_id ? "#f5f3ff" : "#fff", cursor: "pointer" }}
                    onClick={() => setExpandedId(expandedId === item.review_id ? null : item.review_id)}
                  >
                    <td style={tdStyle}>
                      <span style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                        {truncate(item.review_id, 16)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ background: "#ede9fe", color: "#4f46e5", padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.8rem" }}>
                        {item.flag_reason}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: STATUS_COLOR[item.status] ?? "#374151", fontWeight: 600 }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: "#6b7280", fontSize: "0.8rem" }}>
                      {formatDate(item.created_at)}
                    </td>
                    <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                      {item.status === "pending" && (
                        <button
                          onClick={() => claim(item.review_id)}
                          disabled={busy === item.review_id}
                          style={btnStyle("#2563eb")}
                        >
                          {busy === item.review_id ? "…" : "Claim"}
                        </button>
                      )}
                    </td>
                  </tr>

                  {expandedId === item.review_id && (
                    <tr key={`${item.review_id}-expand`}>
                      <td colSpan={5} style={{ padding: "1rem 1.25rem", background: "#f5f3ff", borderTop: "1px solid #e5e7eb" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.85rem", color: "#374151" }}>Text Preview</div>
                            <div style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#6b7280", whiteSpace: "pre-wrap", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.6rem" }}>
                              {item.text_preview}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.85rem", color: "#374151" }}>AI Feedback</div>
                            <div style={{ fontSize: "0.85rem", color: "#6b7280", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.6rem" }}>
                              {item.ai_feedback}
                            </div>
                            <div style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
                              AI Score: <strong>{item.ai_score}/100</strong>
                              &nbsp;· Confidence: <strong>{(item.ai_confidence * 100).toFixed(0)}%</strong>
                            </div>
                          </div>
                        </div>

                        {(item.status === "in_review" || item.status === "pending") && (
                          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                            <button
                              onClick={() => decide(item.review_id, true)}
                              disabled={busy === item.review_id}
                              style={btnStyle("#16a34a")}
                            >
                              Approve
                            </button>

                            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={overrideInputs[item.review_id] ?? ""}
                                onChange={(e) => handleOverrideChange(item.review_id, e.target.value)}
                                placeholder="0–100"
                                style={{ width: "70px", padding: "0.35rem 0.5rem", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "0.9rem" }}
                              />
                              <button
                                onClick={() => handleOverrideSubmit(item.review_id)}
                                disabled={busy === item.review_id}
                                style={btnStyle("#7c3aed")}
                              >
                                Override
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

const thStyle: React.CSSProperties = {
  padding: "0.7rem 1rem",
  textAlign: "left",
  fontWeight: 600,
  color: "#374151",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "0.85rem",
};

const tdStyle: React.CSSProperties = {
  padding: "0.7rem 1rem",
  borderBottom: "1px solid #f3f4f6",
  verticalAlign: "middle",
};

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: "0.3rem 0.85rem",
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.85rem",
  };
}
