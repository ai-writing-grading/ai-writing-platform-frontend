// src/components/Nav.tsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { getToken, clearToken, apiFetch, getUserRole } from "../lib/api";

export function Nav() {
  const navigate = useNavigate();
  const loggedIn = !!getToken();
  const role = getUserRole(); 
  const isAdmin = role === "admin";

  const [plan, setPlan] = useState<string | null>(null);
  const [quotaBanner, setQuotaBanner] = useState(false);

  useEffect(() => {
    if (!loggedIn) return;
    
    // Admin 可能不需要校验普通用户的 Billing Plan，你可以根据需求调整
    apiFetch("/api/v1/billing/status")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPlan(data.plan ?? "free"); })
      .catch(() => {});
  }, [loggedIn]);

  useEffect(() => {
    const handle = () => setQuotaBanner(true);
    window.addEventListener("api:quota-exceeded", handle);
    return () => window.removeEventListener("api:quota-exceeded", handle);
  }, []);

  function logout() {
    clearToken();
    // TanStack Router 的跳转写法，必须传对象 { to: "/path" }
    navigate({ to: "/login" });
  }

  const planLabel = plan
    ? plan.charAt(0).toUpperCase() + plan.slice(1)
    : null;

  return (
    <>
      <nav style={{
        background: "#1e1b4b",
        padding: "0.75rem 2rem",
        display: "flex",
        gap: "1.5rem",
        alignItems: "center",
      }}>
        <span style={{ color: "#fff", fontWeight: "bold", marginRight: "1rem", fontSize: "1rem" }}>
          AI Writing Platform
        </span>
        
        {loggedIn && (
          <>
            {/* 普通用户功能链接 */}
            <Link to="/dashboard" style={{ color: "#a5b4fc", textDecoration: "none", fontSize: "0.95rem" }}>Dashboard</Link>
            <Link to="/editor" style={{ color: "#a5b4fc", textDecoration: "none", fontSize: "0.95rem" }}>Editor</Link>
            <Link to="/upload" style={{ color: "#a5b4fc", textDecoration: "none", fontSize: "0.95rem" }}>Upload</Link>
            <Link to="/batch" style={{ color: "#a5b4fc", textDecoration: "none", fontSize: "0.95rem" }}>Batch</Link>
            <Link to="/learn" style={{ color: "#a5b4fc", textDecoration: "none", fontSize: "0.95rem" }}>Learn</Link>
            <Link to="/review" style={{ color: "#a5b4fc", textDecoration: "none", fontSize: "0.95rem" }}>Review</Link>
            <Link to="/preferences" style={{ color: "#a5b4fc", textDecoration: "none", fontSize: "0.95rem" }}>Preferences</Link>
            <Link to="/subscription" style={{ color: "#a5b4fc", textDecoration: "none", fontSize: "0.95rem" }}>
              {planLabel ? `Plan (${planLabel})` : "Plan"}
            </Link>

            {/* 💡 仅限管理员显示的入口 */}
            {isAdmin && (
              <div style={{ marginLeft: "1rem", borderLeft: "1px solid #4f46e5", paddingLeft: "1.5rem" }}>
                <Link to="/admin" style={{ color: "#fbbf24", fontWeight: "bold", textDecoration: "none", fontSize: "0.95rem" }}>
                  Admin Portal ⚙️
                </Link>
              </div>
            )}
          </>
        )}
        
        <div style={{ marginLeft: "auto" }}>
          {loggedIn ? (
            <button
              onClick={logout}
              style={{
                padding: "0.35rem 1rem",
                background: "transparent",
                color: "#a5b4fc",
                border: "1px solid #a5b4fc",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              Logout
            </button>
          ) : (
            <Link to="/login" style={{ color: "#a5b4fc", textDecoration: "none", fontSize: "0.95rem" }}>Sign In</Link>
          )}
        </div>
      </nav>

      {/* 配额警告横幅保持不变 */}
      {quotaBanner && (
        <div style={{
          background: "#fef3c7",
          borderBottom: "1px solid #f59e0b",
          padding: "0.5rem 2rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.9rem",
          color: "#92400e",
        }}>
          <span>Daily limit reached —</span>
          <Link to="/subscription" style={{ color: "#4f46e5", fontWeight: 600, textDecoration: "none" }}>
            upgrade your plan
          </Link>
          <button
            onClick={() => setQuotaBanner(false)}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#92400e", fontSize: "1.1rem", lineHeight: 1 }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}