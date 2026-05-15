import { useState, useRef, DragEvent } from "react";
import { apiFetch } from "../lib/api";
import { createFileRoute } from "@tanstack/react-router";

interface UploadResult {
  document_id: string;
  filename: string;
  status: string;
  word_count: number;
  chunk_count: number;
  processing_time_ms: number;
  scoring: { score: number; grade: string };
}

export const Route = createFileRoute('/upload')({
  component: Upload,
})
function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function selectFile(f: File) {
    setError(null);
    setResult(null);
    setFile(f);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) selectFile(dropped);
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await apiFetch("/api/v1/pipelines/documents/process", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`);
      }
      setResult(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "720px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "1.5rem" }}>Upload Document</h1>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#4f46e5" : "#d1d5db"}`,
          borderRadius: "8px",
          padding: "2.5rem",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? "#eef2ff" : "#f9fafb",
          transition: "border-color 0.2s, background 0.2s",
          marginBottom: "1.25rem",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.pdf,.docx"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) selectFile(f); }}
        />
        <p style={{ margin: 0, color: "#6b7280", fontSize: "1rem" }}>
          Drag &amp; drop a file here, or{" "}
          <span style={{ color: "#4f46e5", fontWeight: 500 }}>browse</span>
        </p>
        <p style={{ margin: "0.5rem 0 0", color: "#9ca3af", fontSize: "0.85rem" }}>
          .txt, .pdf, .docx — max 20 MB
        </p>
      </div>

      {file && (
        <div style={{
          padding: "0.75rem 1rem",
          background: "#f3f4f6",
          borderRadius: "6px",
          marginBottom: "1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ color: "#374151", fontSize: "0.95rem" }}>{file.name}</span>
          <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>{formatBytes(file.size)}</span>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        style={{
          padding: "0.6rem 1.5rem",
          background: !file || loading ? "#9ca3af" : "#4f46e5",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: !file || loading ? "not-allowed" : "pointer",
          fontSize: "1rem",
          fontWeight: 500,
        }}
      >
        {loading ? "Uploading…" : "Upload & Process"}
      </button>

      {error && (
        <div style={{
          marginTop: "1rem",
          padding: "1rem",
          background: "#fee2e2",
          borderRadius: "6px",
          color: "#991b1b",
        }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{
          marginTop: "1.75rem",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "1.5rem",
        }}>
          <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>Processing Complete</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {(
              [
                ["Document ID", result.document_id],
                ["Score", `${result.scoring.score} / 100`],
                ["Grade", result.scoring.grade],
                ["Words", result.word_count.toLocaleString()],
                ["Chunks", String(result.chunk_count)],
                ["Processing time", `${result.processing_time_ms} ms`],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} style={{ background: "#f9fafb", padding: "0.75rem", borderRadius: "6px" }}>
                <div style={{ fontSize: "0.78rem", color: "#6b7280", marginBottom: "0.2rem" }}>{label}</div>
                <div style={{ fontWeight: 600, color: "#374151", wordBreak: "break-all" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
