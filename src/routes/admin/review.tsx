import { useEffect, useState } from "react";
// 引入 apiFetch 和 getToken
import { apiFetch, getToken } from "../../lib/api";
import { createFileRoute } from "@tanstack/react-router";

// --- JWT 解析获取 Reviewer ID ---
function getReviewerIdFromJWT(): string {
  const token = getToken();
  if (!token) return "unknown-admin";
  try {
    const payloadBase64 = token.split('.')[1];
    const decodedJson = atob(payloadBase64);
    const payload = JSON.parse(decodedJson);
    // 可能要改
    return payload.id || payload.user_id || payload.sub || payload.email || "admin-user";
  } catch (e) {
    console.error("解析 Token 失败", e);
    return "unknown-admin";
  }
}

// --- 类型定义 ---
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

const STATUS_COLOR: Record<string, string> = {
  pending: "#d97706",
  in_review: "#2563eb",
  approved: "#16a34a",
  overridden: "#7c3aed",
  escalated: "#dc2626",
};

// --- 工具函数 ---
function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// --- TanStack 路由定义 ---
export const Route = createFileRoute('/admin/review')({
  component: HitlReviewPage,
});

// --- 主组件 ---
function HitlReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  // 默认开启 loading
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [overrideInputs, setOverrideInputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 🌟 从 JWT 动态获取当前操作人的 ID
  const reviewerId = getReviewerIdFromJWT();

  useEffect(() => {
    const timer = setTimeout(() => {
      apiFetch("/api/v1/hitl/queue")
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          setItems(data as ReviewItem[]);
        })
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : "Failed to load queue");
        })
        .finally(() => {
          setLoading(false);
        });
    }, 0);

    // 清理函数，防止组件卸载时内存泄漏
    return () => clearTimeout(timer);
  }, []);

  // 手动刷新函数
  const handleManualRefresh = async () => {
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      const res = await apiFetch("/api/v1/hitl/queue");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data as ReviewItem[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  };

  // --- 操作逻辑 ---
  async function claim(review_id: string) {
    setBusy(review_id);
    setActionError(null);
    try {
      const res = await apiFetch(
        `/api/v1/hitl/${review_id}/assign?reviewer_id=${encodeURIComponent(reviewerId)}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      setExpandedId(review_id);
      await handleManualRefresh(); // 重新拉取数据
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
      const body: Record<string, unknown> = { review_id, approved, reviewer_id: reviewerId };
      if (!approved && overrideScore !== undefined) body.reviewer_score = overrideScore;
      
      const res = await apiFetch("/api/v1/hitl/decide", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      setExpandedId(null);
      await handleManualRefresh(); // 重新拉取数据
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
    <main style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.8rem", color: "#111827" }}>HITL Review Queue</h1>
        <button
          onClick={handleManualRefresh}
          disabled={loading}
          style={{ 
            padding: "0.5rem 1.2rem", background: "#4f46e5", color: "#fff", 
            border: "none", borderRadius: "6px", cursor: loading ? "not-allowed" : "pointer", 
            fontSize: "0.95rem", fontWeight: 500, opacity: loading ? 0.7 : 1 
          }}
        >
          {loading ? "Refreshing..." : "Refresh Queue"}
        </button>
      </div>

      {loading && items.length === 0 && <p style={{ color: "#6b7280" }}>Loading queue records…</p>}
      {error && <p style={{ color: "#dc2626", background: "#fef2f2", padding: "1rem", borderRadius: "8px" }}>Error: {error}</p>}
      {actionError && <p style={{ color: "#dc2626", fontSize: "0.95rem", marginBottom: "1rem" }}>⚠️ {actionError}</p>}

      {!loading && !error && items.length === 0 && (
        <div style={{ color: "#6b7280", textAlign: "center", padding: "4rem 0", background: "#f9fafb", borderRadius: "8px", border: "1px dashed #d1d5db" }}>
          <p style={{ fontSize: "1.1rem", fontWeight: 500 }}>All caught up!</p>
          <p style={{ fontSize: "0.9rem" }}>No items currently require manual review.</p>
        </div>
      )}

      {items.length > 0 && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
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
                <div key={item.review_id} style={{ display: "contents" }}>
                  <tr
                    style={{ background: expandedId === item.review_id ? "#f8fafc" : "#fff", cursor: "pointer", transition: "background 0.2s" }}
                    onClick={() => setExpandedId(expandedId === item.review_id ? null : item.review_id)}
                  >
                    <td style={tdStyle}>
                      <span style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#4b5563" }}>
                        {truncate(item.review_id, 16)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ background: "#ede9fe", color: "#4f46e5", padding: "0.25rem 0.6rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 500 }}>
                        {item.flag_reason}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: STATUS_COLOR[item.status] ?? "#374151", fontWeight: 600, textTransform: "capitalize" }}>
                        {item.status.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: "#6b7280", fontSize: "0.85rem" }}>
                      {formatDate(item.created_at)}
                    </td>
                    <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                      {item.status === "pending" && (
                        <button
                          onClick={() => claim(item.review_id)}
                          disabled={busy === item.review_id}
                          style={btnStyle("#2563eb", busy === item.review_id)}
                        >
                          {busy === item.review_id ? "Claiming..." : "Claim"}
                        </button>
                      )}
                    </td>
                  </tr>

                  {expandedId === item.review_id && (
                    <tr key={`${item.review_id}-expand`}>
                      <td colSpan={5} style={{ padding: "1.5rem", background: "#f8fafc", borderTop: "1px solid #e5e7eb", borderBottom: "2px solid #e5e7eb" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9rem", color: "#374151" }}>📄 Text Preview</div>
                            <div style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#4b5563", whiteSpace: "pre-wrap", background: "#fff", border: "1px solid #d1d5db", borderRadius: "8px", padding: "1rem", maxHeight: "200px", overflowY: "auto" }}>
                              {item.text_preview}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9rem", color: "#374151" }}>🤖 AI Feedback</div>
                            <div style={{ fontSize: "0.9rem", color: "#4b5563", background: "#fff", border: "1px solid #d1d5db", borderRadius: "8px", padding: "1rem", maxHeight: "150px", overflowY: "auto" }}>
                              {item.ai_feedback}
                            </div>
                            <div style={{ marginTop: "0.75rem", fontSize: "0.9rem", display: "flex", gap: "1rem", background: "#e0e7ff", padding: "0.5rem 1rem", borderRadius: "6px", color: "#3730a3" }}>
                              <span>Score: <strong>{item.ai_score}/100</strong></span>
                              <span>Confidence: <strong>{(item.ai_confidence * 100).toFixed(0)}%</strong></span>
                            </div>
                          </div>
                        </div>

                        {(item.status === "in_review" || item.status === "pending") && (
                          <div style={{ display: "flex", gap: "1rem", alignItems: "center", background: "#fff", padding: "1rem", borderRadius: "8px", border: "1px solid #d1d5db" }}>
                            <span style={{ fontWeight: 600, color: "#374151", fontSize: "0.9rem" }}>Reviewer Actions:</span>
                            
                            <button
                              onClick={() => decide(item.review_id, true)}
                              disabled={busy === item.review_id}
                              style={btnStyle("#16a34a", busy === item.review_id)}
                            >
                              ✓ Approve AI Score
                            </button>

                            <div style={{ width: "1px", height: "24px", background: "#d1d5db", margin: "0 0.5rem" }}></div>

                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                              <input
                                type="number"
                                min={0} max={100}
                                value={overrideInputs[item.review_id] ?? ""}
                                onChange={(e) => handleOverrideChange(item.review_id, e.target.value)}
                                placeholder="New Score"
                                style={{ width: "100px", padding: "0.45rem 0.6rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", outline: "none" }}
                              />
                              <button
                                onClick={() => handleOverrideSubmit(item.review_id)}
                                disabled={busy === item.review_id || !overrideInputs[item.review_id]}
                                style={btnStyle("#7c3aed", busy === item.review_id || !overrideInputs[item.review_id])}
                              >
                                ✍️ Override Score
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </div>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

// --- 独立抽出的样式 ---
const thStyle: import("react").CSSProperties = {
  padding: "1rem 1.2rem",
  textAlign: "left",
  fontWeight: 600,
  color: "#4b5563",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "0.9rem",
};

const tdStyle: import("react").CSSProperties = {
  padding: "1rem 1.2rem",
  borderBottom: "1px solid #f3f4f6",
  verticalAlign: "middle",
};

function btnStyle(bg: string, disabled: boolean = false): import("react").CSSProperties {
  return {
    padding: "0.4rem 1rem",
    background: disabled ? "#9ca3af" : bg,
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "0.9rem",
    fontWeight: 500,
    transition: "background 0.2s"
  };
}