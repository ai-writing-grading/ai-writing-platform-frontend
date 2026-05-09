import { useState } from "react";

const MODELS = [
  { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash", note: "Default — fast and cost-efficient" },
  { id: "deepseek-v4-pro",   label: "DeepSeek V4 Pro",   note: "Most capable, higher latency" },
];

export default function Preferences() {
  const [model, setModel] = useState(
    () => localStorage.getItem("preferred_model") ?? "deepseek-v4-flash"
  );
  const [saved, setSaved] = useState(false);

  function handleSave() {
    localStorage.setItem("preferred_model", model);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "1.5rem" }}>Preferences</h1>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.05rem", marginBottom: "0.75rem", color: "#374151" }}>AI Model</h2>
        <div style={{ display: "grid", gap: "0.6rem" }}>
          {MODELS.map((m) => {
            const selected = model === m.id;
            return (
              <label
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.85rem 1rem",
                  border: `1.5px solid ${selected ? "#4f46e5" : "#e5e7eb"}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                  background: selected ? "#eef2ff" : "#fff",
                  transition: "border-color 0.15s",
                }}
              >
                <input
                  type="radio"
                  name="model"
                  value={m.id}
                  checked={selected}
                  onChange={() => setModel(m.id)}
                  style={{ marginTop: "0.2rem" }}
                />
                <div>
                  <div style={{ fontWeight: 500 }}>{m.label}</div>
                  <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>{m.note}</div>
                </div>
              </label>
            );
          })}
        </div>
        <p style={{ fontSize: "0.82rem", color: "#9ca3af", marginTop: "0.6rem" }}>
          Stored in browser localStorage and sent with each grading request from the Editor.
        </p>
      </section>

      <button
        onClick={handleSave}
        style={{
          padding: "0.6rem 1.5rem",
          background: saved ? "#16a34a" : "#4f46e5",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "1rem",
          fontWeight: 500,
          transition: "background 0.2s",
        }}
      >
        {saved ? "Saved!" : "Save Preferences"}
      </button>
    </main>
  );
}
