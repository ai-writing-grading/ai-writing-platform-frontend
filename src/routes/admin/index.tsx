import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [weights, setWeights] = useState({
    structure: 25,
    vocabulary: 25,
    grammar: 25,
    creativity: 25,
  });

  const [saved, setSaved] = useState(false);

  const handleWeightChange = (key: keyof typeof weights, value: number) => {
    setWeights(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    // TODO: Connect to backend API: POST /api/v1/admin/rubric
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const isValid = totalWeight === 100;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '2rem', color: '#111827', marginBottom: '2rem', fontWeight: 800 }}>System Overview</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
        {/* System Health Monitor */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.15rem', color: '#374151', marginBottom: '1.5rem', fontWeight: 600 }}>Engine Health Monitor</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.8rem' }}>
            <span style={{ color: '#6b7280' }}>Avg. LLM Latency (Target &lt; 8s)</span>
            <span style={{ fontWeight: 'bold', color: '#16a34a' }}>6.2s</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>Grading Success Rate (24H)</span>
            <span style={{ fontWeight: 'bold', color: '#16a34a' }}>98.7%</span>
          </div>
        </div>

        {/* Platform Metrics */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.15rem', color: '#374151', marginBottom: '1.5rem', fontWeight: 600 }}>Platform Metrics</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.8rem' }}>
            <span style={{ color: '#6b7280' }}>Essays Processed (Today)</span>
            <span style={{ fontWeight: 'bold', color: '#4f46e5', fontSize: '1.1rem' }}>1,284</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>Active Learners</span>
            <span style={{ fontWeight: 'bold', color: '#4f46e5', fontSize: '1.1rem' }}>342</span>
          </div>
        </div>
      </div>

      {/* Rubric Management */}
      <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '1.4rem', color: '#111827', marginBottom: '0.5rem', fontWeight: 700 }}>Dynamic Rubric Configuration</h2>
        <p style={{ color: '#6b7280', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
          Adjust the scoring weights for the AI inference engine. The total sum must strictly equal 100% to apply changes.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {Object.entries(weights).map(([key, value]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <label style={{ width: '140px', fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>
                {key === 'structure' ? '📐 Structure' : key === 'vocabulary' ? '📖 Vocabulary' : key === 'grammar' ? '🔍 Grammar' : '✨ Creativity'}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={(e) => handleWeightChange(key as keyof typeof weights, parseInt(e.target.value))}
                style={{ flex: 1, accentColor: '#4f46e5', cursor: 'pointer' }}
              />
              <span style={{ width: '60px', textAlign: 'right', fontWeight: 'bold', color: '#4f46e5', fontSize: '1.1rem' }}>
                {value}%
              </span>
            </div>
          ))}
        </div>

        {/* Action Bar */}
        <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: '1.1rem', color: isValid ? '#16a34a' : '#dc2626' }}>
              Total Weight: {totalWeight}%
            </span>
            {!isValid && (
              <span style={{ color: '#dc2626', marginLeft: '1rem', fontSize: '0.9rem', fontWeight: 500 }}>
                ⚠️ Weights must sum to 100%
              </span>
            )}
          </div>
          
          <button
            disabled={!isValid}
            onClick={handleSave}
            style={{
              padding: '0.75rem 2rem',
              background: isValid ? (saved ? '#16a34a' : '#4f46e5') : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isValid ? 'pointer' : 'not-allowed',
              fontWeight: 600,
              fontSize: '1rem',
              transition: 'all 0.2s',
              boxShadow: isValid ? '0 4px 6px -1px rgba(79, 70, 229, 0.2)' : 'none'
            }}
          >
            {saved ? '✓ Changes Applied' : 'Save & Apply Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}