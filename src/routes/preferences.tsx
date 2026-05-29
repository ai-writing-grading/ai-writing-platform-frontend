import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

// --- 1. 常量定义 ---
const MODELS = [
  { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash", note: "Default — fast and cost-efficient" },
  { id: "deepseek-v4-pro",   label: "DeepSeek V4 Pro",   note: "Most capable, higher latency" },
] as const;

const LANGUAGES = [
  { id: "english", label: "English Composition", note: "Learn English essay writing" },
  { id: "chinese", label: "Chinese Composition", note: "学习中文作文写作 (起承转合)" },
] as const;

const DIFFICULTIES = [
  { id: "beginner", label: "Beginner", note: "Primary school level" },
  { id: "intermediate", label: "Intermediate", note: "Secondary school level" },
  { id: "advanced", label: "Advanced", note: "High school / Professional level" },
] as const;

const MODES = [
  { id: "standard", label: "Standard AI Grading", note: "General feedback and scoring" },
  { id: "technique", label: "Technique Focus", note: "Focus on 'Show-Don't-Tell' and specific techniques" },
] as const;

// 从常量中提取白名单（类型安全）
const VALID_MODELS = MODELS.map(m => m.id) as readonly string[];
const VALID_LANGUAGES = LANGUAGES.map(l => l.id) as readonly string[];
const VALID_DIFFICULTIES = DIFFICULTIES.map(d => d.id) as readonly string[];
const VALID_MODES = MODES.map(m => m.id) as readonly string[];

// --- 2. TypeScript 类型定义 ---
interface OptionType {
  id: string;
  label: string;
  note: string;
}

interface SelectionGridProps {
  options: readonly OptionType[];
  currentValue: string;
  onChange: (value: string) => void;
  name: string;
}

// 工具函数：安全读取 localStorage
function getSafeStorageValue(key: string, validValues: readonly string[], defaultValue: string): string {
  try {
    const stored = localStorage.getItem(key);
    if (stored && validValues.includes(stored)) {
      return stored;
    }
  } catch (e) {
    console.warn(`Failed to read ${key} from localStorage:`, e);
  }
  return defaultValue;
}

const SelectionGrid = ({ options, currentValue, onChange, name }: SelectionGridProps) => (
  <div style={{ display: "grid", gap: "0.6rem" }}>
    {options.map((opt) => {
      const selected = currentValue === opt.id;
      return (
        <label
          key={opt.id}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            padding: "0.85rem 1rem",
            border: `1.5px solid ${selected ? "#4f46e5" : "#e5e7eb"}`,
            borderRadius: "8px",
            cursor: "pointer",
            background: selected ? "#eef2ff" : "#fff",
            transition: "border-color 0.15s, background-color 0.15s",
          }}
        >
          <input
            type="radio"
            name={name}
            value={opt.id}
            checked={selected}
            onChange={() => onChange(opt.id)}
            style={{ marginTop: "0.2rem", accentColor: "#4f46e5" }}
          />
          <div>
            <div style={{ fontWeight: 500, color: "#111827" }}>{opt.label}</div>
            <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "0.1rem" }}>{opt.note}</div>
          </div>
        </label>
      );
    })}
  </div>
);

export const Route = createFileRoute('/preferences')({
  component: Preferences,
});

export function Preferences() {
  // 初始化状态时使用安全读取函数
  const [model, setModel] = useState(() => 
    getSafeStorageValue("preferred_model", VALID_MODELS, "deepseek-v4-flash")
  );
  
  const [language, setLanguage] = useState(() => 
    getSafeStorageValue("pref_language", VALID_LANGUAGES, "english")
  );
  
  const [difficulty, setDifficulty] = useState(() => 
    getSafeStorageValue("pref_difficulty", VALID_DIFFICULTIES, "intermediate")
  );
  
  const [mode, setMode] = useState(() => 
    getSafeStorageValue("pref_mode", VALID_MODES, "standard")
  );

  const [saved, setSaved] = useState(false);

  function handleSave() {
    // 白名单验证（编译时保证类型安全）
    const safeModel = VALID_MODELS.includes(model) ? model : "deepseek-v4-flash";
    const safeLanguage = VALID_LANGUAGES.includes(language) ? language : "english";
    const safeDifficulty = VALID_DIFFICULTIES.includes(difficulty) ? difficulty : "intermediate";
    const safeMode = VALID_MODES.includes(mode) ? mode : "standard";

    try {
      localStorage.setItem("preferred_model", safeModel);
      localStorage.setItem("pref_language", safeLanguage);
      localStorage.setItem("pref_difficulty", safeDifficulty);
      localStorage.setItem("pref_mode", safeMode);
      
      // 如果验证失败导致回退，同步更新 UI
      setModel(safeModel);
      setLanguage(safeLanguage);
      setDifficulty(safeDifficulty);
      setMode(safeMode);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save preferences:", error);
    }
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: "2rem", color: "#111827", fontSize: "1.8rem" }}>Profile & Preferences</h1>

      <section style={{ marginBottom: "2.5rem", background: "#f9fafb", padding: "1.5rem", borderRadius: "12px", border: "1px solid #f3f4f6" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1.5rem", color: "#374151", borderBottom: "1px solid #e5e7eb", paddingBottom: "0.5rem" }}>
          Learning Setup
        </h2>
        
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "0.95rem", marginBottom: "0.75rem", color: "#4b5563", fontWeight: 600 }}>Target Language</h3>
          <SelectionGrid options={LANGUAGES} currentValue={language} onChange={setLanguage} name="language" />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "0.95rem", marginBottom: "0.75rem", color: "#4b5563", fontWeight: 600 }}>Writing Difficulty Level</h3>
          <SelectionGrid options={DIFFICULTIES} currentValue={difficulty} onChange={setDifficulty} name="difficulty" />
        </div>

        <div>
          <h3 style={{ fontSize: "0.95rem", marginBottom: "0.75rem", color: "#4b5563", fontWeight: 600 }}>Learning Mode</h3>
          <SelectionGrid options={MODES} currentValue={mode} onChange={setMode} name="mode" />
        </div>
      </section>

      <section style={{ marginBottom: "2rem", background: "#f9fafb", padding: "1.5rem", borderRadius: "12px", border: "1px solid #f3f4f6" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1.5rem", color: "#374151", borderBottom: "1px solid #e5e7eb", paddingBottom: "0.5rem" }}>
          AI Engine Settings
        </h2>
        <SelectionGrid options={MODELS} currentValue={model} onChange={setModel} name="model" />
        <p style={{ fontSize: "0.82rem", color: "#9ca3af", marginTop: "0.8rem" }}>
          This engine will be used to generate feedback and refine your essays.
        </p>
      </section>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
        <button
          onClick={handleSave}
          style={{
            padding: "0.75rem 2rem",
            background: saved ? "#16a34a" : "#4f46e5",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: 600,
            transition: "background 0.2s, transform 0.1s",
            boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.2)",
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
          onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
          {saved ? "✓ Settings Saved" : "Save Changes"}
        </button>
      </div>
    </main>
  );
}