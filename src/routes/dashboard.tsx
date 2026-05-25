import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "../lib/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

interface RubricBreakdown {
  [dimension: string]: number;
}

interface Scoring {
  score: number;
  grade: string;
  rubric?: RubricBreakdown;
}

interface Document {
  document_id: string;
  filename: string;
  status: string;
  word_count: number;
  chunk_count: number;
  processing_time_ms: number;
  scoring?: Scoring;
}

const GRADE_COLOR: Record<string, string> = {
  A: "#16a34a", B: "#2563eb", C: "#d97706", D: "#ea580c", F: "#dc2626",
};
export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
})

export function Dashboard() {
  const [docs, setDocs]       = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const listRes = await apiFetch("/api/v1/pipelines/documents/");
        if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`);
        const { document_ids } = await listRes.json() as { document_ids: string[] };

        const results = await Promise.all(
          document_ids.map((id) =>
            apiFetch(`/api/v1/pipelines/documents/${id}`).then((r) => r.json() as Promise<Document>)
          )
        );
        setDocs(results);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load documents");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const scoredDocs = docs.filter((d) => d.scoring != null);

  const lineData = scoredDocs.map((doc, i) => ({
    index: i + 1,
    score: doc.scoring!.score,
    name: doc.filename,
  }));

  const docsWithRubric = scoredDocs.filter((d) => d.scoring?.rubric);
  let radarData: { dimension: string; score: number }[] = [];
  if (docsWithRubric.length > 0) {
    const totals: Record<string, number> = {};
    const counts: Record<string, number> = {};
    for (const doc of docsWithRubric) {
      for (const [dim, val] of Object.entries(doc.scoring!.rubric!)) {
        totals[dim] = (totals[dim] ?? 0) + val;
        counts[dim] = (counts[dim] ?? 0) + 1;
      }
    }
    radarData = Object.entries(totals).map(([dim, total]) => ({
      dimension: dim,
      score: Math.round(total / counts[dim]),
    }));
  }

  const showCharts = scoredDocs.length >= 2;

  return (
    <main style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <Link
          to="/editor"
          style={{
            padding: "0.5rem 1.1rem",
            background: "#4f46e5",
            color: "#fff",
            borderRadius: "6px",
            textDecoration: "none",
            fontSize: "0.95rem",
          }}
        >
          + New Essay
        </Link>
      </div>

      {loading && <p style={{ color: "#6b7280" }}>Loading documents…</p>}
      {error   && <p style={{ color: "#991b1b" }}>Error: {error}</p>}

      {!loading && !error && docs.length > 0 && (
        showCharts ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1rem", background: "#fff" }}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", color: "#374151" }}>Score Over Time</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="index" label={{ value: "Document", position: "insideBottom", offset: -2 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(val) => [`${val}/100`, "Score"]} />
                  <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1rem", background: "#fff" }}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", color: "#374151" }}>Avg Rubric Scores</h3>
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} />
                    <Radar dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "0.9rem" }}>
                  No rubric breakdown available
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: "1.25rem", border: "1px solid #e5e7eb", borderRadius: "8px", marginBottom: "2rem", color: "#6b7280", textAlign: "center", background: "#fff", fontSize: "0.9rem" }}>
            Score at least 2 documents to see charts.
          </div>
        )
      )}

      {!loading && !error && docs.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
          <p style={{ marginBottom: "1rem" }}>No documents processed yet.</p>
          <Link to="/editor" style={{ color: "#4f46e5", textDecoration: "none" }}>
            Grade your first essay →
          </Link>
        </div>
      )}

      {docs.length > 0 && (
        <div style={{ display: "grid", gap: "0.85rem" }}>
          {docs.map((doc) => (
            <Link
              key={doc.document_id}
              to="/documents/$id" 
              params={{ id: doc.document_id }}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "1rem 1.25rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#fff",
                textDecoration: "none",
                color: "inherit",
                cursor: "pointer",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "#a5b4fc";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 1px 6px rgba(79,70,229,0.12)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "#e5e7eb";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
              }}
            >
              <div>
                <div style={{ fontWeight: 600, marginBottom: "0.2rem" }}>{doc.filename}</div>
                <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                  {doc.word_count.toLocaleString()} words · {doc.chunk_count} chunks · {doc.processing_time_ms.toFixed(0)} ms
                </div>
                <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.15rem", fontFamily: "monospace" }}>
                  {doc.document_id}
                </div>
              </div>
              {doc.scoring ? (
                <div style={{ textAlign: "center", minWidth: "56px" }}>
                  <div style={{
                    fontSize: "2rem",
                    fontWeight: "bold",
                    color: GRADE_COLOR[doc.scoring.grade] ?? "#374151",
                    lineHeight: 1,
                  }}>
                    {doc.scoring.grade}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>{doc.scoring.score}/100</div>
                </div>
              ) : (
                <div style={{ fontSize: "0.8rem", color: doc.status === "failed" ? "#dc2626" : "#9ca3af" }}>
                  {doc.status}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
