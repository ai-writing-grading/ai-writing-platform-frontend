import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Editor from "./pages/Editor";
import Upload from "./pages/Upload";
import Preferences from "./pages/Preferences";
import Batch from "./pages/Batch";
import Learn from "./pages/Learn";
import Review from "./pages/Review";
import Login from "./pages/Login";
import Subscription from "./pages/Subscription";
import DocumentDetail from "./pages/DocumentDetail";
import { getToken, clearToken, apiFetch } from "./lib/api";

function RequireAuth({ children }: { children: React.ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />;
}

function Nav() {
  const navigate = useNavigate();
  const loggedIn = !!getToken();
  const [plan, setPlan] = useState<string | null>(null);
  const [quotaBanner, setQuotaBanner] = useState(false);

  useEffect(() => {
    if (!loggedIn) return;
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
    navigate("/login");
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
            <Link to="/dashboard"    style={{ color: "#a5b4fc", textDecoration: "none", fontSize: "0.95rem" }}>Dashboard</Link>
            <Link to="/editor"       style={{ color: "#a5b4fc", textDecoration: "none", fontSize: "0.95rem" }}>Editor</Link>
            <Link to="/upload"       style={{ color: "#a5b4fc", textDecoration: "none", fontSize: "0.95rem" }}>Upload</Link>
            <Link to="/batch"        style={{ color: "#a5b4fc", textDecoration: "none", fontSize: "0.95rem" }}>Batch</Link>
            <Link to="/learn"        style={{ color: "#a5b4fc", textDecoration: "none", fontSize: "0.95rem" }}>Learn</Link>
            <Link to="/review"       style={{ color: "#a5b4fc", textDecoration: "none", fontSize: "0.95rem" }}>Review</Link>
            <Link to="/preferences"  style={{ color: "#a5b4fc", textDecoration: "none", fontSize: "0.95rem" }}>Preferences</Link>
            <Link to="/subscription" style={{ color: "#a5b4fc", textDecoration: "none", fontSize: "0.95rem" }}>
              {planLabel ? `Plan (${planLabel})` : "Plan"}
            </Link>
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
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#92400e",
              fontSize: "1.1rem",
              lineHeight: 1,
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/login"        element={<Login />} />
        <Route path="/"             element={<Home />} />
        <Route path="/dashboard"    element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/editor"       element={<RequireAuth><Editor /></RequireAuth>} />
        <Route path="/upload"       element={<RequireAuth><Upload /></RequireAuth>} />
        <Route path="/batch"        element={<RequireAuth><Batch /></RequireAuth>} />
        <Route path="/learn"        element={<RequireAuth><Learn /></RequireAuth>} />
        <Route path="/review"       element={<RequireAuth><Review /></RequireAuth>} />
        <Route path="/preferences"  element={<RequireAuth><Preferences /></RequireAuth>} />
        <Route path="/subscription" element={<RequireAuth><Subscription /></RequireAuth>} />
        <Route path="/documents/:id" element={<RequireAuth><DocumentDetail /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  );
}
