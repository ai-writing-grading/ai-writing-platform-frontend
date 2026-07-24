import { useEffect, useState } from "react";
import { apiUrl, setToken, getUserRole } from "../lib/api";
import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";

type Tab = "login" | "register";

export const Route = createFileRoute('/login')({
  component: Login,
});

export function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function parseBody(res: Response): Promise<{ detail?: string; access_token?: string }> {
    try {
      return await res.json();
    } catch {
      return {};
    }
  }

  async function handleSendCode() {
    setError(null);
    setNotice(null);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setSendingCode(true);
    try {
      const res = await fetch(apiUrl("/auth/email-code/send"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = await parseBody(res);
      if (!res.ok) throw new Error(body.detail ?? `HTTP ${res.status}`);
      setCooldown(60);
      setNotice("Verification code sent. Check your inbox.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to send verification code.");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tab === "register" && !/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit verification code.");
      return;
    }
    setLoading(true);
    setError(null);

    const endpoint = tab === "login" ? "/auth/login" : "/auth/register";
    try {
      const payload = tab === "register" ? { email, password, code } : { email, password };
      const res = await fetch(apiUrl(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await parseBody(res);
      if (!res.ok) {
        throw new Error(body.detail ?? `HTTP ${res.status}`);
      }
      if (!body.access_token) throw new Error("Authentication response is missing a token.");
      setToken(body.access_token);
      const role = getUserRole();
      if (role === "admin") {
        navigate({ to: "/admin" });
      } else {
        navigate({ to: "/dashboard" });
      }
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
              onClick={() => { setTab(t); setError(null); setNotice(null); }}
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
            <label htmlFor="auth-email" style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.9rem", color: "#374151" }}>
              Email
            </label>
            <input
              id="auth-email"
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

          {tab === "register" && (
            <div>
              <label htmlFor="auth-code" style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.9rem", color: "#374151" }}>
                Verification code
              </label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "stretch" }}>
                <input
                  id="auth-code"
                  type="text"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: "0.6rem 0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode || cooldown > 0 || !email.trim()}
                  style={{
                    width: "122px",
                    padding: "0.6rem 0.75rem",
                    border: "1px solid #4f46e5",
                    borderRadius: "6px",
                    background: sendingCode || cooldown > 0 || !email.trim() ? "#f3f4f6" : "#fff",
                    color: sendingCode || cooldown > 0 || !email.trim() ? "#6b7280" : "#4f46e5",
                    fontWeight: 600,
                    cursor: sendingCode || cooldown > 0 || !email.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {sendingCode ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Send code"}
                </button>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="auth-password" style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.9rem", color: "#374151" }}>
              Password
            </label>
            <input
              id="auth-password"
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

          {notice && (
            <div style={{
              padding: "0.75rem",
              background: "#ecfdf5",
              borderRadius: "6px",
              color: "#166534",
              fontSize: "0.9rem",
            }}>
              {notice}
            </div>
          )}

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
