import { useState } from "react";
import { apiFetch } from "../lib/api";
import { createFileRoute } from "@tanstack/react-router";

interface RubricScore {
  dimension: string;
  score: number;
  feedback: string;
}

interface GradingResult {
  inference_id: string;
  document_id: string;
  score: number;
  grade: string;
  confidence: number;
  rubric: RubricScore[];
  overall_feedback: string;
  improvement_tips: string[];
  model_used: string;
  tokens_used: number;
  flagged_for_review: boolean;
  cached: boolean;
  review_id?: string;
}

const GRADE_COLOR: Record<string, string> = {
  A: "#16a34a", B: "#2563eb", C: "#d97706", D: "#ea580c", F: "#dc2626",
};

export const Route = createFileRoute('/editor')({
  component: Editor,
});

function Editor() {
  const [text, setText]     = useState("");
  const [result, setResult] = useState<GradingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const [refining, setRefining]       = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [refinedText, setRefinedText] = useState<string | null>(null);
  const [copied, setCopied]           = useState(false);

  async function handleRefine() {
    if (!result) return;
    setRefining(true);
    setRefineError(null);
    setRefinedText(null);
    setCopied(false);

    try {
      const res = await apiFetch("/api/v1/inference/refine", {
        method: "POST",
        body: JSON.stringify({
          document_id: result.document_id,
          original_text: text,
          feedback: result.overall_feedback,
          improvement_tips: result.improvement_tips,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as { refined_text: string };
      setRefinedText(data.refined_text);
    } catch (e: unknown) {
      setRefineError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setRefining(false);
    }
  }

  async function handleGrade() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const preferredModel = localStorage.getItem("preferred_model") ?? undefined;

    try {
      const res = await apiFetch("/api/v1/inference/generate", {
        method: "POST",
        body: JSON.stringify({
          document_id: `doc-${Date.now()}`,
          text,
          model: preferredModel,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as GradingResult;
      setResult(data);
      // Save to pipeline history so Dashboard can show it (fire-and-forget)
      apiFetch("/api/v1/pipelines/documents/record", {
        method: "POST",
        body: JSON.stringify({
          document_id: data.document_id,
          text,
          score: data.score,
          grade: data.grade,
          rubric: data.rubric,
          overall_feedback: data.overall_feedback,
          improvement_tips: data.improvement_tips,
          model_used: data.model_used,
        }),
      }).catch(() => {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "1rem" }}>Writing Editor</h1>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste or type your essay here…"
        style={{
          width: "100%",
          minHeight: "280px",
          padding: "1rem",
          fontSize: "1rem",
          border: "1px solid #d1d5db",
          borderRadius: "6px",
          boxSizing: "border-box",
          resize: "vertical",
          fontFamily: "inherit",
          lineHeight: 1.6,
        }}
      />

      <div style={{ marginTop: "0.75rem", display: "flex", gap: "1rem", alignItems: "center" }}>
        <button
          onClick={handleGrade}
          disabled={loading || !text.trim()}
          style={{
            padding: "0.6rem 1.5rem",
            background: loading || !text.trim() ? "#9ca3af" : "#4f46e5",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: loading || !text.trim() ? "not-allowed" : "pointer",
            fontSize: "1rem",
            fontWeight: 500,
          }}
        >
          {loading ? "Grading…" : "Grade My Writing"}
        </button>
        {result?.cached && (
          <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Cached result</span>
        )}
      </div>

      {error && (
        <div style={{ marginTop: "1rem", padding: "1rem", background: "#fee2e2", borderRadius: "6px", color: "#991b1b" }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: "2rem" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "2rem",
            padding: "1.25rem", background: "#f9fafb", borderRadius: "8px",
            marginBottom: "1.5rem",
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3.5rem", fontWeight: "bold", color: GRADE_COLOR[result.grade] ?? "#374151", lineHeight: 1 }}>
                {result.grade}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" }}>Grade</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", fontWeight: "bold", lineHeight: 1 }}>{result.score}</div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" }}>/ 100</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.75rem", fontWeight: "bold", color: result.confidence >= 0.75 ? "#16a34a" : "#d97706", lineHeight: 1 }}>
                {Math.round(result.confidence * 100)}%
              </div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" }}>Confidence</div>
            </div>
            {result.flagged_for_review && (
              <div style={{ padding: "0.4rem 0.8rem", background: "#fef3c7", borderRadius: "6px", color: "#92400e", fontSize: "0.85rem" }}>
                Flagged for human review
                {result.review_id && <span style={{ fontFamily: "monospace", marginLeft: "0.4rem" }}>#{result.review_id.slice(0, 8)}</span>}
              </div>
            )}
          </div>

          <h3 style={{ marginBottom: "0.75rem" }}>Rubric Breakdown</h3>
          <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1.75rem" }}>
            {result.rubric.map((r) => (
              <div key={r.dimension} style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                  <strong style={{ textTransform: "capitalize" }}>{r.dimension}</strong>
                  <span style={{ color: "#374151" }}>{r.score} / 25</span>
                </div>
                <div style={{ width: "100%", background: "#e5e7eb", borderRadius: "9999px", height: "6px", marginBottom: "0.5rem" }}>
                  <div style={{
                    width: `${(r.score / 25) * 100}%`,
                    background: "#4f46e5",
                    height: "6px",
                    borderRadius: "9999px",
                    transition: "width 0.4s ease",
                  }} />
                </div>
                <p style={{ margin: 0, color: "#4b5563", fontSize: "0.9rem" }}>{r.feedback}</p>
              </div>
            ))}
          </div>

          <h3 style={{ marginBottom: "0.5rem" }}>Overall Feedback</h3>
          <p style={{ color: "#374151", lineHeight: 1.7, marginBottom: "1.5rem" }}>{result.overall_feedback}</p>

          <h3 style={{ marginBottom: "0.5rem" }}>Improvement Tips</h3>
          <ul style={{ paddingLeft: "1.25rem", color: "#374151", lineHeight: 1.9 }}>
            {result.improvement_tips.map((tip, i) => <li key={i}>{tip}</li>)}
          </ul>

          <div style={{ marginTop: "1.5rem" }}>
            <button
              onClick={handleRefine}
              disabled={refining}
              style={{
                padding: "0.6rem 1.5rem",
                background: refining ? "#9ca3af" : "#4f46e5",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: refining ? "not-allowed" : "pointer",
                fontSize: "1rem",
                fontWeight: 500,
              }}
            >
              {refining ? "Refining…" : "Refine My Writing"}
            </button>

            {refineError && (
              <div style={{ marginTop: "0.75rem", padding: "0.75rem 1rem", background: "#fee2e2", borderRadius: "6px", color: "#991b1b" }}>
                {refineError}
              </div>
            )}

            {refinedText && (
              <div style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <h3 style={{ margin: 0 }}>Refined Version</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(refinedText).then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      });
                    }}
                    style={{
                      padding: "0.35rem 0.9rem",
                      background: copied ? "#16a34a" : "transparent",
                      color: copied ? "#fff" : "#4f46e5",
                      border: `1px solid ${copied ? "#16a34a" : "#4f46e5"}`,
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      transition: "all 0.2s",
                    }}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={refinedText}
                  style={{
                    width: "100%",
                    minHeight: "240px",
                    padding: "1rem",
                    fontSize: "1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                    resize: "vertical",
                    fontFamily: "inherit",
                    lineHeight: 1.6,
                    background: "#f9fafb",
                    color: "#374151",
                  }}
                />
              </div>
            )}
          </div>

          <p style={{ marginTop: "1.5rem", fontSize: "0.78rem", color: "#9ca3af" }}>
            Model: {result.model_used} · Tokens: {result.tokens_used} · ID: {result.inference_id}
          </p>
        </div>
      )}
    </main>
  );
}
