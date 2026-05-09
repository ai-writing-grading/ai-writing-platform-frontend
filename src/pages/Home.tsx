import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>AI Writing Platform</h1>
      <nav style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/editor">Editor</Link>
        <Link to="/preferences">Preferences</Link>
      </nav>
    </main>
  );
}
