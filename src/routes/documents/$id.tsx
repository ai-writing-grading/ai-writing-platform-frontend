import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Link, createFileRoute } from "@tanstack/react-router";

interface FeedbackItem {
  category: string;
  severity: string;
  message: string;
  suggestion: string;
}

interface ScoringResult {
  score: number;
  grade: string;
  feedback: FeedbackItem[];
  summary: string;
  model_used: string;
}

interface DocumentDetail {
  document_id: string;
  filename: string;
  status: string;
  stage_reached: string;
  word_count: number;
  chunk_count: number;
  processing_time_ms: number;
  scoring?: ScoringResult;
  error?: string;
}

const GRADE_COLOR: Record<string, string> = {
  A: "#16a34a", B: "#2563eb", C: "#d97706", D: "#ea580c", F: "#dc2626",
};

const SEVERITY_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  info:    { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  warning: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
  error:   { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
};

const CATEGORY_ICON: Record<string, string> = {
  clarity:    "💡",
  grammar:    "✏️",
  structure:  "📐",
  evidence:   "🔍",
  vocabulary: "📚",
};

export const Route = createFileRoute('/documents/$id')({
  component: DocumentDetails,
});

function DocumentDetails() {
  const { id } = Route.useParams();
  const [doc, setDoc]       = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const res = await apiFetch(`/api/v1/pipelines/documents/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setDoc(await res.json() as DocumentDetail);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load document");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
        <p style={{ color: "#6b7280" }}>Loading…</p>
      </main>
    );
  }

  if (error || !doc) {
    return (
      <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
        <p style={{ color: "#dc2626" }}>Error: {error ?? "Document not found"}</p>
        <Link to="/dashboard" style={{ color: "#4f46e5" }}>← Back to Dashboard</Link>
      </main>
    );
  }

  const scoring = doc.scoring;

  return (
    <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <Link
        to="/dashboard"
        style={{ color: "#6b7280", textDecoration: "none", fontSize: "0.9rem", display: "inline-flex", alignItems: "center", gap: "0.25rem", marginBottom: "1.25rem" }}
      >
        ← Back to Dashboard
      </Link>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.5rem", background: "#fff", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.3rem", wordBreak: "break-word" }}>{doc.filename}</h1>
            <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
              {doc.word_count.toLocaleString()} words · {doc.chunk_count} chunks · {doc.processing_time_ms.toFixed(0)} ms
            </div>
            <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.2rem", fontFamily: "monospace" }}>
              {doc.document_id}
            </div>
          </div>

          {scoring ? (
            <div style={{ textAlign: "center", minWidth: "72px" }}>
              <div style={{
                fontSize: "3rem",
                fontWeight: "bold",
                color: GRADE_COLOR[scoring.grade] ?? "#374151",
                lineHeight: 1,
              }}>
                {scoring.grade}
              </div>
              <div style={{ fontSize: "1rem", color: "#6b7280", marginTop: "0.25rem" }}>{scoring.score}/100</div>
            </div>
          ) : (
            <div style={{ fontSize: "0.85rem", color: doc.status === "failed" ? "#dc2626" : "#9ca3af", fontWeight: 600 }}>
              {doc.status}
            </div>
          )}
        </div>

        {doc.status === "failed" && doc.error && (
          <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", fontSize: "0.85rem", color: "#991b1b" }}>
            <strong>Error:</strong> {doc.error}
          </div>
        )}
      </div>

      {scoring && (
        <>
          {scoring.summary && (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.25rem", background: "#fff", marginBottom: "1.5rem" }}>
              <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", color: "#374151" }}>Summary</h2>
              <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.6, fontSize: "0.95rem" }}>{scoring.summary}</p>
              <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "#9ca3af" }}>
                Model: {scoring.model_used}
              </div>
            </div>
          )}

          {scoring.feedback && scoring.feedback.length > 0 && (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.25rem", background: "#fff" }}>
              <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", color: "#374151" }}>Feedback</h2>
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {scoring.feedback.map((item, i) => {
                  const colors = SEVERITY_COLOR[item.severity] ?? SEVERITY_COLOR.info;
                  const icon = CATEGORY_ICON[item.category] ?? "📝";
                  return (
                    <div
                      key={i}
                      style={{
                        border: `1px solid ${colors.border}`,
                        borderRadius: "8px",
                        padding: "0.9rem 1rem",
                        background: colors.bg,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                        <span style={{ fontSize: "1rem" }}>{icon}</span>
                        <span style={{ fontWeight: 600, fontSize: "0.85rem", color: colors.text, textTransform: "capitalize" }}>
                          {item.category}
                        </span>
                        <span style={{
                          marginLeft: "auto",
                          fontSize: "0.75rem",
                          background: colors.border,
                          color: colors.text,
                          padding: "0.1rem 0.45rem",
                          borderRadius: "999px",
                          textTransform: "capitalize",
                        }}>
                          {item.severity}
                        </span>
                      </div>
                      <p style={{ margin: "0 0 0.4rem", fontSize: "0.9rem", color: "#374151" }}>{item.message}</p>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>
                        <strong>Suggestion:</strong> {item.suggestion}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
