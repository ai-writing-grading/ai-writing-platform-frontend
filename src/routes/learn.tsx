import { useState, useEffect, useRef } from "react";
import { apiFetch } from "../lib/api";
import { createFileRoute } from "@tanstack/react-router";

interface Technique {
  title: string;
  content: string;
  score: number;
}

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <span style={{
      display: "inline-block",
      padding: "0.15rem 0.5rem",
      borderRadius: "999px",
      fontSize: "0.75rem",
      fontWeight: 600,
      background: "#ede9fe",
      color: "#4f46e5",
    }}>
      {pct}% match
    </span>
  );
}

function Skeleton() {
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1.25rem", background: "#fff" }}>
          <div style={{ height: "1rem", width: "40%", background: "#e5e7eb", borderRadius: "4px", marginBottom: "0.75rem", animation: "pulse 1.5s ease-in-out infinite" }} />
          <div style={{ height: "0.8rem", width: "100%", background: "#f3f4f6", borderRadius: "4px", marginBottom: "0.4rem", animation: "pulse 1.5s ease-in-out infinite" }} />
          <div style={{ height: "0.8rem", width: "85%", background: "#f3f4f6", borderRadius: "4px", animation: "pulse 1.5s ease-in-out infinite" }} />
        </div>
      ))}
    </div>
  );
}

export const Route = createFileRoute('/learn')({
  component: Learn,
});

function Learn() {
  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState<Technique[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function fetchTechniques(q: string) {
    setLoading(true);
    setError(null);
    const effectiveQuery = q.trim() || "writing";
    apiFetch(`/api/v1/retrieval/techniques?query=${encodeURIComponent(effectiveQuery)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Technique[]>;
      })
      .then((data) => setResults(data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load techniques"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchTechniques("");
  }, []);

  function handleSearch(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchTechniques(value), 400);
  }

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ marginBottom: "0.5rem" }}>Writing Techniques</h1>
        <p style={{ color: "#6b7280", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
          Search our knowledge base for writing tips and techniques.
        </p>

        <input
          type="search"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search techniques (e.g. transitions, thesis, evidence…)"
          style={{
            width: "100%",
            padding: "0.7rem 1rem",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: "1rem",
            color: "#374151",
            marginBottom: "1.5rem",
            boxSizing: "border-box",
            outline: "none",
          }}
        />

        {error && <p style={{ color: "#dc2626", fontSize: "0.9rem" }}>Error: {error}</p>}

        {loading ? (
          <Skeleton />
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {results.length === 0 ? (
              <p style={{ color: "#6b7280", textAlign: "center", padding: "2rem 0" }}>
                No techniques found for "{query}".
              </p>
            ) : (
              results.map((t, i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "1.25rem",
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem" }}>
                    <span style={{ fontWeight: 700, color: "#374151", fontSize: "1rem" }}>{t.title}</span>
                    <ScoreBadge score={t.score} />
                  </div>
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.6 }}>{t.content}</p>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </>
  );
}
