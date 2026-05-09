import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setToken } from "../lib/api";

const API = import.meta.env.VITE_API_GATEWAY_URL ?? "http://localhost:8000";

type Tab = "login" | "register";

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = tab === "login" ? "/auth/login" : "/auth/register";
    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.detail ?? `HTTP ${res.status}`);
      }
      setToken(body.access_token);
      navigate("/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        width: "100%",
        maxWidth: "400px",
        padding: "2rem",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        background: "#fff",
        boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
      }}>
        <h2 style={{ margin: "0 0 1.5rem", textAlign: "center", color: "#1e1b4b" }}>
          AI Writing Platform
        </h2>

        <div style={{ display: "flex", borderBottom: "2px solid #e5e7eb", marginBottom: "1.5rem" }}>
          {(["login", "register"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); }}
              style={{
                flex: 1,
                padding: "0.6rem",
                border: "none",
                background: "transparent",
                borderBottom: tab === t ? "2px solid #4f46e5" : "2px solid transparent",
                marginBottom: "-2px",
                color: tab === t ? "#4f46e5" : "#6b7280",
                fontWeight: tab === t ? 600 : 400,
                cursor: "pointer",
                fontSize: "0.95rem",
                textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.9rem", color: "#374151" }}>
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.9rem", color: "#374151" }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: "0.75rem",
              background: "#fee2e2",
              borderRadius: "6px",
              color: "#991b1b",
              fontSize: "0.9rem",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "0.7rem",
              background: loading ? "#9ca3af" : "#4f46e5",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "0.25rem",
            }}
          >
            {loading ? "Please wait…" : tab === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </main>
  );
}
