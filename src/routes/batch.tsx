import { useState, useEffect, useRef } from "react";
import { apiFetch } from "../lib/api";
import { createFileRoute } from "@tanstack/react-router";

interface GradingResult {
  score: number;
  grade: string;
  overall_feedback: string;
}

interface BatchItemResult {
  composition_id: string;
  document_id: string;
  status: string;
  result?: GradingResult;
  error?: string;
}

interface BatchStatus {
  job_id: string;
  status: "queued" | "running" | "completed" | "failed";
  total: number;
  completed: number;
  cached_hits: number;
  flagged_for_review: number;
  results: BatchItemResult[];
}

export const Route = createFileRoute('/batch')({
  component: Batch,
})

function Batch() {
  const [text, setText]           = useState("");
  const [jobId, setJobId]         = useState<string | null>(null);
  const [status, setStatus]       = useState<BatchStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function handleSubmit() {
    setError(null);
    setStatus(null);
    setJobId(null);

    // 对 textarea 输入进行净化，防止潜在的注入
    // eslint-disable-next-line no-control-regex
    const sanitizedText =  text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
    
    const essays = sanitizedText.split("---")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50); // 限制最大数量防止滥用

    if (essays.length === 0) {
      setError('No essays found. Separate essays with "---".');
      return;
    }

    // 验证每篇作文长度
    for (const essay of essays) {
      if (essay.length > 10000) { // 限制单篇作文最大长度
        setError('Each essay must be less than 10,000 characters.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const uniqueId = crypto.randomUUID(); 
      const jobId = `job-${uniqueId.slice(0, 8)}`;
      
      // 修复：对发送到后端的数据进行验证
      const requestBody = {
        job_id: jobId,
        compositions: essays.map((essay, i) => ({
          composition_id: `comp-${uniqueId.slice(0, 8)}-${i}`, 
          document_id: `doc-${uniqueId.slice(0, 8)}-${i}`,
          text: essay, // 已经过上面的净化
        })),
      };

      const res = await apiFetch("/api/v1/batch/submit", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as BatchStatus;
      setJobId(data.job_id);
      setStatus(data);
      startPolling(data.job_id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  function startPolling(id: string) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/v1/batch/status/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as BatchStatus;
        setStatus(data);
        if (data.status === "completed" || data.status === "failed") {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Polling failed");
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
      }
    }, 3000);
  }

  const pct = status ? Math.round((status.completed / Math.max(status.total, 1)) * 100) : 0;
  const isRunning = status?.status === "queued" || status?.status === "running";

  return (
    <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Batch Evaluation</h1>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
        Paste multiple essays separated by <code style={{ background: "#f3f4f6", padding: "0.1rem 0.3rem", borderRadius: "4px" }}>---</code> and submit them for batch grading.
      </p>

      <div style={{ marginBottom: "1rem" }}>
        <textarea
          value={text}
          onChange={(e) => {
            // 在设置值之前进行净化
            // eslint-disable-next-line no-control-regex
            const sanitizedValue = e.target.value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
            setText(sanitizedValue);
          }}
          rows={12}
          style={{
            width: "100%",
            padding: "0.75rem",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontFamily: "monospace",
            fontSize: "0.875rem",
            resize: "vertical",
            boxSizing: "border-box",
            color: "#374151",
          }}
          placeholder={"Essay one text here...\n---\nEssay two text here...\n---\nEssay three text here..."}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || isRunning}
        style={{
          padding: "0.6rem 1.4rem",
          background: "#4f46e5",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: submitting || isRunning ? "not-allowed" : "pointer",
          fontSize: "0.95rem",
          opacity: submitting || isRunning ? 0.65 : 1,
        }}
      >
        {submitting ? "Submitting…" : "Submit Batch"}
      </button>

      {error && (
        <p style={{ color: "#dc2626", marginTop: "1rem", fontSize: "0.9rem" }}>
          Error: {error}
        </p>
      )}

      {jobId && (
        <div style={{ marginTop: "1.5rem" }}>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "1rem" }}>
            Job ID: <code style={{ fontFamily: "monospace", background: "#f3f4f6", padding: "0.1rem 0.35rem", borderRadius: "4px" }}>{jobId}</code>
          </p>

          {status && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem", fontSize: "0.9rem", color: "#374151" }}>
                <span>
                  Status: <strong style={{ color: status.status === "completed" ? "#16a34a" : status.status === "failed" ? "#dc2626" : "#4f46e5" }}>{status.status}</strong>
                </span>
                <span style={{ color: "#6b7280" }}>{status.completed} / {status.total} documents</span>
              </div>

              <div style={{ background: "#e5e7eb", borderRadius: "999px", height: "8px", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: status.status === "failed" ? "#dc2626" : "#4f46e5",
                  transition: "width 0.4s ease",
                  borderRadius: "999px",
                }} />
              </div>

              {status.status === "completed" && status.results.length > 0 && (
                <div style={{ marginTop: "1.5rem", overflowX: "auto" }}>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                    Cache hits: {status.cached_hits} · Flagged for review: {status.flagged_for_review}
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                    <thead>
                      <tr style={{ background: "#f9fafb" }}>
                        <th style={{ padding: "0.6rem 1rem", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: 600 }}>#</th>
                        <th style={{ padding: "0.6rem 1rem", textAlign: "center", border: "1px solid #e5e7eb", fontWeight: 600 }}>Score</th>
                        <th style={{ padding: "0.6rem 1rem", textAlign: "center", border: "1px solid #e5e7eb", fontWeight: 600 }}>Grade</th>
                        <th style={{ padding: "0.6rem 1rem", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: 600 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {status.results.map((r, i) => (
                        <tr key={r.composition_id} style={{ background: "#fff" }}>
                          <td style={{ padding: "0.6rem 1rem", border: "1px solid #e5e7eb", color: "#9ca3af", fontSize: "0.8rem" }}>{i + 1}</td>
                          <td style={{ padding: "0.6rem 1rem", border: "1px solid #e5e7eb", textAlign: "center" }}>
                            {r.result ? `${r.result.score}/100` : "—"}
                          </td>
                          <td style={{ padding: "0.6rem 1rem", border: "1px solid #e5e7eb", textAlign: "center", fontWeight: "bold", color: "#374151" }}>
                            {r.result?.grade ?? "—"}
                          </td>
                          <td style={{ padding: "0.6rem 1rem", border: "1px solid #e5e7eb", fontSize: "0.8rem", color: r.status === "failed" ? "#dc2626" : "#16a34a" }}>
                            {r.status}{r.error ? `: ${r.error}` : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {status.status === "failed" && (
                <p style={{ color: "#dc2626", marginTop: "1rem", fontSize: "0.9rem" }}>
                  Batch job failed.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}