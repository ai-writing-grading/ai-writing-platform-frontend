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
    if (!loggedIn || isAdmin) return;
    
    apiFetch("/api/v1/billing/status")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPlan(data.plan ?? "free"); })
      .catch(() => {});
  }, [loggedIn, isAdmin]);

  useEffect(() => {
    const handle = () => setQuotaBanner(true);
    window.addEventListener("api:quota-exceeded", handle);
    return () => window.removeEventListener("api:quota-exceeded", handle);
  }, []);

  function logout() {
    clearToken();
    localStorage.removeItem("user_role");
    navigate({ to: "/login" });
  }

  const planLabel = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : null;

  const linkStyle = { color: "#a5b4fc", textDecoration: "none", fontSize: "0.95rem" };

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
            {/* 👨‍🎓 普通用户看到的专属菜单 */}
            {!isAdmin && (
              <>
                <Link to="/dashboard" style={linkStyle}>Dashboard</Link>
                <Link to="/editor" style={linkStyle}>Editor</Link>
                <Link to="/upload" style={linkStyle}>Upload</Link>
                <Link to="/batch" style={linkStyle}>Batch</Link>
                <Link to="/learn" style={linkStyle}>Learn</Link>
                <Link to="/preferences" style={linkStyle}>Preferences</Link>
                <Link to="/subscription" style={linkStyle}>
                  {planLabel ? `Plan (${planLabel})` : "Plan"}
                </Link>
              </>
            )}

            {/* ⚙️ 管理员看到的专属菜单 */}
            {isAdmin && (
              <div style={{ display: "flex", gap: "1.5rem", paddingLeft: "1.5rem", marginLeft: "0.5rem" }}>
                <Link to="/admin" style={{ color: "#fbbf24", fontWeight: "bold", textDecoration: "none", fontSize: "0.95rem" }}>
                  Dashboard (Admin)
                </Link>
                <Link to="/admin/review" style={{ color: "#fbbf24", fontWeight: "bold", textDecoration: "none", fontSize: "0.95rem" }}>
                  HITL Review
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
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = "rgba(165, 180, 252, 0.1)"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              Logout
            </button>
          ) : (
            <Link to="/login" style={linkStyle}>Sign In</Link>
          )}
        </div>
      </nav>

      {/* 配额警告横幅 (管理员也不会看到，因为 quotaBanner 不会被触发) */}
      {quotaBanner && !isAdmin && (
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